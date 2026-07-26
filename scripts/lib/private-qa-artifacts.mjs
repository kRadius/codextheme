import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

function defaultGetUid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function validatePrivateDirectory(metadata, getUid) {
  if (!metadata.isDirectory()) {
    throw new Error("The private artifact path is not a directory.");
  }
  const currentUid = getUid();
  if (currentUid !== null && currentUid !== undefined && metadata.uid !== currentUid) {
    throw new Error("The private artifact directory is not owned by the current user.");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("The private artifact directory grants access to other users.");
  }
}

export function createPrivateQaArtifactStore({
  fsApi = fs,
  tempRoot = os.tmpdir(),
  getUid = defaultGetUid,
  stderr = process.stderr,
} = {}) {
  async function ensureArtifactDirectory(directory) {
    let createdPath;
    try {
      createdPath = await fsApi.mkdir(directory, {
        recursive: true,
        mode: PRIVATE_DIRECTORY_MODE,
      });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const created = createdPath !== undefined;
    if (created) await fsApi.chmod(directory, PRIVATE_DIRECTORY_MODE);
    validatePrivateDirectory(await fsApi.lstat(directory), getUid);
    return { created };
  }

  async function writeArtifact(filename, data, { prepareDirectory = true } = {}) {
    if (prepareDirectory) await ensureArtifactDirectory(path.dirname(filename));
    await fsApi.writeFile(filename, data, { mode: PRIVATE_FILE_MODE });
    await fsApi.chmod(filename, PRIVATE_FILE_MODE);
  }

  async function createDraftRecovery(serialized) {
    const directory = await fsApi.mkdtemp(
      path.join(tempRoot, "private-skin-app-chrome-draft-"),
    );
    const file = path.join(directory, "draft-recovery.json");
    let fileCreated = false;
    try {
      await fsApi.chmod(directory, PRIVATE_DIRECTORY_MODE);
      validatePrivateDirectory(await fsApi.lstat(directory), getUid);
      await fsApi.writeFile(file, serialized, {
        flag: "wx",
        mode: PRIVATE_FILE_MODE,
      });
      fileCreated = true;
      await fsApi.chmod(file, PRIVATE_FILE_MODE);
      return { directory, file };
    } catch (error) {
      if (fileCreated) await fsApi.unlink(file).catch(() => {});
      await fsApi.rmdir(directory).catch(() => {});
      throw error;
    }
  }

  async function cleanupDraftRecovery(
    recovery,
    { mutationStarted, independentRestoreVerified },
  ) {
    if (mutationStarted && !independentRestoreVerified) {
      return { removed: false, retained: true };
    }
    try {
      await fsApi.unlink(recovery.file);
    } catch (cause) {
      const error = new Error("Draft recovery file cleanup failed.", { cause });
      error.code = cause.code;
      error.recoveryMayBeRetained = true;
      throw error;
    }
    try {
      await fsApi.rmdir(recovery.directory);
    } catch (cause) {
      const error = new Error("Draft recovery directory cleanup failed.", { cause });
      error.code = cause.code;
      throw error;
    }
    return { removed: true, retained: false };
  }

  function warnRetainedRecovery(recovery) {
    const filename = path.resolve(recovery.file);
    stderr.write(
      `[private-skin-qa] Draft recovery retained at ${filename} `
      + "(owner-only mode 0600). Manually restore the draft from this file, "
      + "then delete it securely.\n",
    );
  }

  async function isPrivateRetainedRecovery(recovery) {
    try {
      const metadata = await fsApi.lstat(recovery.file);
      const currentUid = getUid();
      return metadata.isFile()
        && (currentUid === null || currentUid === undefined || metadata.uid === currentUid)
        && (metadata.mode & 0o777) === PRIVATE_FILE_MODE;
    } catch {
      return false;
    }
  }

  async function finalizeDraftRecovery(recovery, restoration) {
    try {
      const result = await cleanupDraftRecovery(recovery, restoration);
      if (result.retained && await isPrivateRetainedRecovery(recovery)) {
        warnRetainedRecovery(recovery);
      }
      return result;
    } catch (error) {
      if (error.recoveryMayBeRetained === true
        && await isPrivateRetainedRecovery(recovery)) {
        warnRetainedRecovery(recovery);
      }
      throw error;
    }
  }

  return {
    ensureArtifactDirectory,
    writeArtifact,
    createDraftRecovery,
    cleanupDraftRecovery,
    finalizeDraftRecovery,
  };
}
