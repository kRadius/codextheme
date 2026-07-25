import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createPrivateQaArtifactStore } from "../lib/private-qa-artifacts.mjs";

const permissions = async (target) => (await fs.lstat(target)).mode & 0o777;

async function testRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "private-qa-artifacts-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function withFs(overrides) {
  return new Proxy(fs, {
    get(target, property) {
      return overrides[property] ?? target[property];
    },
  });
}

test("creates owner-only artifact and draft recovery storage", async (t) => {
  const root = await testRoot(t);
  const store = createPrivateQaArtifactStore({ tempRoot: root });
  const artifactDirectory = path.join(root, "artifacts");

  const directoryResult = await store.ensureArtifactDirectory(artifactDirectory);
  assert.deepEqual(directoryResult, { created: true });
  assert.equal(await permissions(artifactDirectory), 0o700);
  const artifactFile = path.join(artifactDirectory, "report.json");
  await store.writeArtifact(artifactFile, "report");
  assert.equal(await permissions(artifactFile), 0o600);

  const recovery = await store.createDraftRecovery("private draft");
  assert.equal(await permissions(recovery.directory), 0o700);
  assert.equal(await permissions(recovery.file), 0o600);
  assert.equal(await fs.readFile(recovery.file, "utf8"), "private draft");

  const cleanup = await store.cleanupDraftRecovery(recovery, {
    mutationStarted: true,
    independentRestoreVerified: true,
  });
  assert.deepEqual(cleanup, { removed: true, retained: false });
  await assert.rejects(fs.lstat(recovery.file), { code: "ENOENT" });
  await assert.rejects(fs.lstat(recovery.directory), { code: "ENOENT" });
});

test("accepts an existing private directory without changing its permissions", async (t) => {
  const root = await testRoot(t);
  const directory = path.join(root, "existing");
  await fs.mkdir(directory, { mode: 0o500 });
  const store = createPrivateQaArtifactStore();

  const result = await store.ensureArtifactDirectory(directory);

  assert.deepEqual(result, { created: false });
  assert.equal(await permissions(directory), 0o500);
});

test("rejects insecure, linked, non-directory, and foreign-owned artifact paths", async (t) => {
  const root = await testRoot(t);
  const store = createPrivateQaArtifactStore();

  const insecure = path.join(root, "insecure");
  await fs.mkdir(insecure, { mode: 0o755 });
  await assert.rejects(
    store.ensureArtifactDirectory(insecure),
    /grants access to other users/u,
  );
  assert.equal(await permissions(insecure), 0o755);

  const target = path.join(root, "target");
  const linked = path.join(root, "linked");
  await fs.mkdir(target, { mode: 0o700 });
  await fs.symlink(target, linked, "dir");
  await assert.rejects(
    store.ensureArtifactDirectory(linked),
    /not a directory/u,
  );
  assert.equal(await permissions(target), 0o700);

  const regularFile = path.join(root, "regular-file");
  await fs.writeFile(regularFile, "unchanged", { mode: 0o600 });
  await assert.rejects(
    store.ensureArtifactDirectory(regularFile),
    /not a directory/u,
  );
  assert.equal(await fs.readFile(regularFile, "utf8"), "unchanged");

  const foreign = path.join(root, "foreign");
  await fs.mkdir(foreign, { mode: 0o700 });
  const actualUid = (await fs.lstat(foreign)).uid;
  const foreignStore = createPrivateQaArtifactStore({ getUid: () => actualUid + 1 });
  await assert.rejects(
    foreignStore.ensureArtifactDirectory(foreign),
    /not owned by the current user/u,
  );
  assert.equal(await permissions(foreign), 0o700);
});

test("exclusive recovery creation never overwrites a conflicting file", async (t) => {
  const root = await testRoot(t);
  const collisionDirectory = path.join(root, "collision");
  const collisionFile = path.join(collisionDirectory, "draft-recovery.json");
  await fs.mkdir(collisionDirectory, { mode: 0o700 });
  await fs.writeFile(collisionFile, "original", { mode: 0o600 });
  const store = createPrivateQaArtifactStore({
    tempRoot: root,
    fsApi: withFs({ mkdtemp: async () => collisionDirectory }),
  });

  await assert.rejects(store.createDraftRecovery("replacement"), { code: "EEXIST" });

  assert.equal(await fs.readFile(collisionFile, "utf8"), "original");
  assert.equal(await permissions(collisionFile), 0o600);
});

test("retains recovery after mutation until independent restoration is verified", async (t) => {
  const root = await testRoot(t);
  const store = createPrivateQaArtifactStore({ tempRoot: root });
  const recovery = await store.createDraftRecovery("private draft");

  const retained = await store.cleanupDraftRecovery(recovery, {
    mutationStarted: true,
    independentRestoreVerified: false,
  });
  assert.deepEqual(retained, { removed: false, retained: true });
  assert.equal(await fs.readFile(recovery.file, "utf8"), "private draft");

  const removed = await store.cleanupDraftRecovery(recovery, {
    mutationStarted: true,
    independentRestoreVerified: true,
  });
  assert.deepEqual(removed, { removed: true, retained: false });
  await assert.rejects(fs.lstat(recovery.directory), { code: "ENOENT" });
});

test("cleanup surfaces unlink and directory removal failures", async (t) => {
  const root = await testRoot(t);
  const baseStore = createPrivateQaArtifactStore({ tempRoot: root });
  const unlinkRecovery = await baseStore.createDraftRecovery("unlink failure");
  const unlinkStore = createPrivateQaArtifactStore({
    fsApi: withFs({
      unlink: async () => {
        throw Object.assign(new Error("unlink blocked"), { code: "EACCES" });
      },
    }),
  });

  await assert.rejects(
    unlinkStore.cleanupDraftRecovery(unlinkRecovery, {
      mutationStarted: false,
      independentRestoreVerified: false,
    }),
    /unlink blocked/u,
  );
  assert.equal(await fs.readFile(unlinkRecovery.file, "utf8"), "unlink failure");
  await baseStore.cleanupDraftRecovery(unlinkRecovery, {
    mutationStarted: false,
    independentRestoreVerified: false,
  });

  const rmdirRecovery = await baseStore.createDraftRecovery("rmdir failure");
  const rmdirStore = createPrivateQaArtifactStore({
    fsApi: withFs({
      rmdir: async () => {
        throw Object.assign(new Error("rmdir blocked"), { code: "EACCES" });
      },
    }),
  });
  await assert.rejects(
    rmdirStore.cleanupDraftRecovery(rmdirRecovery, {
      mutationStarted: false,
      independentRestoreVerified: false,
    }),
    /rmdir blocked/u,
  );
  await assert.rejects(fs.lstat(rmdirRecovery.file), { code: "ENOENT" });
  assert.equal((await fs.lstat(rmdirRecovery.directory)).isDirectory(), true);
  await fs.rmdir(rmdirRecovery.directory);
});
