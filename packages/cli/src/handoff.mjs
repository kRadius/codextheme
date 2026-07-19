import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_CACHE_KEY = /^[a-f0-9]{64}$/;
const MAX_PENDING_AGE_MS = 5 * 60 * 1000;

function handoffError(code, message) {
  return Object.assign(new Error(message), { code });
}

function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function cleanAction(value) {
  if (
    exactKeys(value, ["schemaVersion", "source", "themeSlug"])
    && value.schemaVersion === 2
    && value.source === "catalog"
    && typeof value.themeSlug === "string"
    && SAFE_SLUG.test(value.themeSlug)
  ) {
    return { source: "catalog", themeSlug: value.themeSlug };
  }
  if (
    exactKeys(value, ["schemaVersion", "source", "cacheKey"])
    && value.schemaVersion === 2
    && value.source === "private"
    && typeof value.cacheKey === "string"
    && SAFE_CACHE_KEY.test(value.cacheKey)
  ) {
    return { source: "private", cacheKey: value.cacheKey };
  }
  throw handoffError("E_HANDOFF_FAILED", "无法创建安全的 Codex 重启任务。");
}

function cleanStoredAction(value) {
  if (value?.source === "catalog" && exactKeys(value, ["source", "themeSlug"])) {
    return cleanAction({ schemaVersion: 2, ...value });
  }
  if (value?.source === "private" && exactKeys(value, ["source", "cacheKey"])) {
    return cleanAction({ schemaVersion: 2, ...value });
  }
  throw handoffError("E_HANDOFF_FAILED", "本地 Codex 重启任务无效。");
}

function cleanJob(value) {
  if (
    !exactKeys(value, ["schemaVersion", "createdAt", "parentPid", "action"])
    || value.schemaVersion !== 1
    || typeof value.createdAt !== "string"
    || !Number.isFinite(Date.parse(value.createdAt))
    || !Number.isSafeInteger(value.parentPid)
    || value.parentPid <= 0
  ) {
    throw handoffError("E_HANDOFF_FAILED", "本地 Codex 重启任务无效。");
  }
  const action = cleanStoredAction(value.action);
  return {
    schemaVersion: 1,
    createdAt: value.createdAt,
    parentPid: value.parentPid,
    action,
  };
}

function cleanResult(value) {
  if (
    value?.schemaVersion !== 1
    || !["success", "failure"].includes(value.status)
    || typeof value.completedAt !== "string"
    || !Number.isFinite(Date.parse(value.completedAt))
    || typeof value.message !== "string"
    || !value.message
  ) {
    throw handoffError("E_HANDOFF_FAILED", "Codex 重启任务结果无效。");
  }
  if (value.status === "success" && exactKeys(value, ["schemaVersion", "status", "completedAt", "message"])) {
    return { schemaVersion: 1, status: "success", completedAt: value.completedAt, message: value.message };
  }
  if (
    value.status === "failure"
    && exactKeys(value, ["schemaVersion", "status", "completedAt", "code", "message", "recovered"])
    && typeof value.code === "string"
    && /^E_[A-Z0-9_]+$/.test(value.code)
    && typeof value.recovered === "boolean"
  ) {
    return {
      schemaVersion: 1,
      status: "failure",
      completedAt: value.completedAt,
      code: value.code,
      message: value.message,
      recovered: value.recovered,
    };
  }
  throw handoffError("E_HANDOFF_FAILED", "Codex 重启任务结果无效。");
}

async function ensureDirectory(directory, fsApi) {
  await fsApi.mkdir(directory, { recursive: true, mode: 0o700 });
  await fsApi.chmod(directory, 0o700);
}

async function createExclusive(filename, serialized, fsApi) {
  const temporary = `${filename}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fsApi.writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await fsApi.link(temporary, filename);
    await fsApi.chmod(filename, 0o600);
  } finally {
    await fsApi.rm(temporary, { force: true }).catch(() => {});
  }
}

async function replaceFile(filename, serialized, fsApi) {
  const temporary = `${filename}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fsApi.writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600 });
    await fsApi.rename(temporary, filename);
    await fsApi.chmod(filename, 0o600);
  } finally {
    await fsApi.rm(temporary, { force: true }).catch(() => {});
  }
}

export function createHandoffStore({ home = os.homedir(), fsApi = fs, now = () => new Date() } = {}) {
  const directory = path.join(home, "Library", "Application Support", "codextheme", "handoff");
  const pendingPath = path.join(directory, "pending.json");
  const resultPath = path.join(directory, "last-result.json");

  return {
    directory,
    pendingPath,
    resultPath,

    async createPending(action, parentPid) {
      const createdAt = now().toISOString();
      const job = cleanJob({ schemaVersion: 1, createdAt, parentPid, action: cleanAction(action) });
      await ensureDirectory(directory, fsApi);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await createExclusive(pendingPath, `${JSON.stringify(job, null, 2)}\n`, fsApi);
          return job;
        } catch (error) {
          if (error?.code !== "EEXIST") {
            if (String(error?.code ?? "").startsWith("E_HANDOFF_")) throw error;
            throw handoffError("E_HANDOFF_FAILED", "无法写入本地 Codex 重启任务。");
          }
          let existing;
          try {
            existing = await this.readPending();
          } catch {
            throw handoffError("E_HANDOFF_BUSY", "已有一个 Codex 重启任务正在处理。");
          }
          if (now().getTime() - Date.parse(existing.createdAt) <= MAX_PENDING_AGE_MS) {
            throw handoffError("E_HANDOFF_BUSY", "已有一个 Codex 重启任务正在处理。");
          }
          await fsApi.rm(pendingPath, { force: true });
        }
      }
      throw handoffError("E_HANDOFF_BUSY", "已有一个 Codex 重启任务正在处理。");
    },

    async readPending() {
      try {
        return cleanJob(JSON.parse(await fsApi.readFile(pendingPath, "utf8")));
      } catch (error) {
        if (String(error?.code ?? "").startsWith("E_HANDOFF_")) throw error;
        throw handoffError("E_HANDOFF_FAILED", "无法安全读取本地 Codex 重启任务。");
      }
    },

    async writeResult(value) {
      const result = cleanResult(value);
      await ensureDirectory(directory, fsApi);
      await replaceFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, fsApi);
      return result;
    },

    async removePending() {
      await fsApi.rm(pendingPath, { force: true });
    },
  };
}

export function createRestartHandoff({
  home = os.homedir(),
  fsApi = fs,
  now = () => new Date(),
  spawnProcess = spawn,
  execPath = process.execPath,
  workerPath = fileURLToPath(new URL("./handoff-worker.mjs", import.meta.url)),
  parentPid = process.pid,
} = {}) {
  const store = createHandoffStore({ home, fsApi, now });
  return {
    store,
    async schedule(action) {
      await store.createPending(action, parentPid);
      try {
        const child = spawnProcess(
          execPath,
          [workerPath, store.pendingPath, String(parentPid)],
          { detached: true, stdio: "ignore" },
        );
        if (!child || typeof child.unref !== "function") throw new Error("invalid child");
        child.unref();
      } catch {
        await store.removePending().catch(() => {});
        throw handoffError("E_HANDOFF_FAILED", "无法启动独立的 Codex 重启任务。");
      }
      return { queued: true, resultPath: store.resultPath };
    },
  };
}
