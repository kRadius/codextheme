import { execFile } from "node:child_process";
import { applyPrivateTheme, applyTheme } from "./lifecycle.mjs";

const PUBLIC_FAILURES = new Map([
  ["E_CODEX_NOT_FOUND", "没有找到已安装的 Codex Desktop。"],
  ["E_DOM_INCOMPATIBLE", "当前 Codex 界面结构与该主题暂不兼容。"],
  ["E_CORE_VERIFY", "主题应用后的完整性验证失败。"],
  ["E_PRIVATE_CACHE", "无法安全读取本地私有主题缓存。"],
  ["E_RESTORE_FAILED", "主题应用失败，且未能完整恢复 Codex 官方外观。"],
  ["E_HANDOFF_BUSY", "已有一个 Codex 重启任务正在处理。"],
  ["E_HANDOFF_FAILED", "CodexTheme 未能完成后台主题应用。"],
]);

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export async function waitForProcessExit(
  pid,
  { isAlive = processIsAlive, wait = delay, timeoutMs = 10000, pollMs = 100 } = {},
) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw Object.assign(new Error("Invalid handoff parent process."), { code: "E_HANDOFF_FAILED" });
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return;
    await wait(pollMs);
  }
  throw Object.assign(new Error("Foreground CLI did not exit before handoff."), { code: "E_HANDOFF_FAILED" });
}

export async function notifyHandoff(status, { execFileApi = execFile } = {}) {
  const message = status === "success"
    ? "Theme applied. Codex has reopened."
    : "Theme apply failed. Open CodexTheme Help for recovery steps.";
  const script = `display notification ${JSON.stringify(message)} with title "CodexTheme"`;
  await new Promise((resolve) => {
    execFileApi("/usr/bin/osascript", ["-e", script], () => resolve());
  });
}

function publicFailure(error) {
  const code = PUBLIC_FAILURES.has(error?.code) ? error.code : "E_HANDOFF_FAILED";
  return { code, message: PUBLIC_FAILURES.get(code) };
}

export function validateWorkerInvocation(argv, pendingPath) {
  if (!Array.isArray(argv) || argv.length !== 2 || argv[0] !== pendingPath || !/^[1-9][0-9]*$/.test(argv[1])) {
    throw Object.assign(new Error("Invalid handoff worker invocation."), { code: "E_HANDOFF_FAILED" });
  }
  const parentPid = Number(argv[1]);
  if (!Number.isSafeInteger(parentPid)) {
    throw Object.assign(new Error("Invalid handoff worker invocation."), { code: "E_HANDOFF_FAILED" });
  }
  return parentPid;
}

async function applyJob({ job, lifecycle, cache, runtime, stateStore, now }) {
  const shared = {
    runtime,
    stateStore,
    promptRestart: async () => true,
    now,
  };
  if (job.action.source === "catalog") {
    return lifecycle.applyTheme({ ...shared, slug: job.action.themeSlug });
  }
  const bundle = JSON.parse(await cache.read(job.action.cacheKey));
  return lifecycle.applyPrivateTheme({
    ...shared,
    bundle,
    cacheKey: job.action.cacheKey,
  });
}

export async function runHandoffJob({
  store,
  runtime,
  stateStore,
  cache,
  lifecycle = { applyTheme, applyPrivateTheme },
  waitForParentExit = waitForProcessExit,
  notify = notifyHandoff,
  now = () => new Date(),
}) {
  let exitCode = 1;
  try {
    const job = await store.readPending();
    await waitForParentExit(job.parentPid);
    await applyJob({ job, lifecycle, cache, runtime, stateStore, now });
    await store.writeResult({
      schemaVersion: 1,
      status: "success",
      completedAt: now().toISOString(),
      message: "主题已应用并通过验证。",
    });
    await notify("success").catch(() => {});
    exitCode = 0;
  } catch (error) {
    let recovered = false;
    try {
      const recovery = await runtime.recover();
      recovered = recovery?.recovered === true;
    } catch { /* The sanitized result below records failed recovery. */ }
    const failure = publicFailure(error);
    try {
      await store.writeResult({
        schemaVersion: 1,
        status: "failure",
        completedAt: now().toISOString(),
        code: failure.code,
        message: failure.message,
        recovered,
      });
    } catch { /* Notification still gives the user a recovery signal. */ }
    await notify("failure").catch(() => {});
  } finally {
    await store.removePending().catch(() => {});
  }
  return exitCode;
}
