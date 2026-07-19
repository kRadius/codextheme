import assert from "node:assert/strict";
import test from "node:test";
import { runHandoffJob, validateWorkerInvocation } from "../src/handoff-runner.mjs";

const completedAt = "2026-07-19T08:10:00.000Z";

function harness(job) {
  const calls = [];
  const results = [];
  return {
    calls,
    results,
    store: {
      async readPending() { calls.push(["store.readPending"]); return job; },
      async writeResult(value) { calls.push(["store.writeResult"]); results.push(value); return value; },
      async removePending() { calls.push(["store.removePending"]); },
    },
    waitForParentExit: async (pid) => { calls.push(["waitForParentExit", pid]); },
    settleAfterParentExit: async () => { calls.push(["settleAfterParentExit"]); },
    notify: async (status) => { calls.push(["notify", status]); },
    now: () => new Date(completedAt),
    stateStore: { marker: "state" },
  };
}

test("handoff runner waits for the foreground process and applies a catalog theme", async () => {
  const app = harness({
    schemaVersion: 1,
    createdAt: "2026-07-19T08:00:00.000Z",
    parentPid: 4321,
    action: { source: "catalog", themeSlug: "cathedral-nocturne" },
  });
  const runtime = { recover: async () => ({ recovered: true }) };
  const lifecycle = {
    async applyTheme(options) {
      app.calls.push(["applyTheme", options.slug, options.runtime, options.stateStore]);
      assert.equal(await options.promptRestart(), true);
      assert.equal(options.restartHandoff, undefined);
      return { appliedAt: completedAt };
    },
  };

  const exitCode = await runHandoffJob({ ...app, runtime, lifecycle, cache: {} });

  assert.equal(exitCode, 0);
  assert.deepEqual(app.calls.slice(0, 4), [
    ["store.readPending"],
    ["waitForParentExit", 4321],
    ["settleAfterParentExit"],
    ["applyTheme", "cathedral-nocturne", runtime, app.stateStore],
  ]);
  assert.deepEqual(app.results, [{
    schemaVersion: 1,
    status: "success",
    completedAt,
    message: "主题已应用并通过验证。",
  }]);
  assert.deepEqual(app.calls.slice(-2), [["notify", "success"], ["store.removePending"]]);
});

test("handoff runner reads private themes only from the content-addressed cache", async () => {
  const cacheKey = "b".repeat(64);
  const app = harness({
    schemaVersion: 1,
    createdAt: "2026-07-19T08:00:00.000Z",
    parentPid: 8765,
    action: { source: "private", cacheKey },
  });
  const bundle = { theme: { id: "private-local" } };
  const cache = {
    async read(key) {
      app.calls.push(["cache.read", key]);
      return JSON.stringify(bundle);
    },
  };
  const lifecycle = {
    async applyPrivateTheme(options) {
      app.calls.push(["applyPrivateTheme", options.bundle, options.cacheKey]);
      assert.equal(await options.promptRestart(), true);
      return { appliedAt: completedAt };
    },
  };

  assert.equal(await runHandoffJob({
    ...app,
    cache,
    lifecycle,
    runtime: { recover: async () => ({ recovered: true }) },
  }), 0);
  assert.deepEqual(app.calls.filter(([name]) => ["cache.read", "applyPrivateTheme"].includes(name)), [
    ["cache.read", cacheKey],
    ["applyPrivateTheme", bundle, cacheKey],
  ]);
});

test("handoff runner recovers from failure and records only a stable public result", async () => {
  const app = harness({
    schemaVersion: 1,
    createdAt: "2026-07-19T08:00:00.000Z",
    parentPid: 4321,
    action: { source: "catalog", themeSlug: "cathedral-nocturne" },
  });
  const runtime = {
    async recover() {
      app.calls.push(["runtime.recover"]);
      return { recovered: true };
    },
  };
  const lifecycle = {
    async applyTheme() {
      throw new Error("internal failure private-id.must-never-appear");
    },
  };

  assert.equal(await runHandoffJob({ ...app, runtime, lifecycle, cache: {} }), 1);
  assert.deepEqual(app.results, [{
    schemaVersion: 1,
    status: "failure",
    completedAt,
    code: "E_HANDOFF_FAILED",
    message: "CodexTheme 未能完成后台主题应用。",
    recovered: true,
  }]);
  assert.doesNotMatch(JSON.stringify(app.results), /private-id|internal failure/);
  assert.deepEqual(app.calls.slice(-3), [
    ["store.writeResult"],
    ["notify", "failure"],
    ["store.removePending"],
  ]);
});

test("handoff runner reports failed recovery without retaining the pending job", async () => {
  const app = harness({
    schemaVersion: 1,
    createdAt: "2026-07-19T08:00:00.000Z",
    parentPid: 4321,
    action: { source: "catalog", themeSlug: "cathedral-nocturne" },
  });
  const runtime = {
    async recover() { throw new Error("recovery detail"); },
  };
  const lifecycle = {
    async applyTheme() { throw Object.assign(new Error("verify detail"), { code: "E_CORE_VERIFY" }); },
  };

  assert.equal(await runHandoffJob({ ...app, runtime, lifecycle, cache: {} }), 1);
  assert.equal(app.results[0].code, "E_CORE_VERIFY");
  assert.equal(app.results[0].recovered, false);
  assert.deepEqual(app.calls.at(-1), ["store.removePending"]);
});

test("worker invocation accepts only the exact pending path and parent pid", () => {
  assert.equal(validateWorkerInvocation(
    ["/safe/handoff/pending.json", "4321"],
    "/safe/handoff/pending.json",
  ), 4321);
  for (const argv of [
    ["/tmp/other.json", "4321"],
    ["/safe/handoff/pending.json", "0"],
    ["/safe/handoff/pending.json", "4321.5"],
    ["/safe/handoff/pending.json"],
  ]) {
    assert.throws(
      () => validateWorkerInvocation(argv, "/safe/handoff/pending.json"),
      { code: "E_HANDOFF_FAILED" },
    );
  }
});

test("handoff runner does not recover when foreground coordination fails before apply", async () => {
  const app = harness({
    schemaVersion: 1,
    createdAt: "2026-07-19T08:00:00.000Z",
    parentPid: 4321,
    action: { source: "catalog", themeSlug: "cathedral-nocturne" },
  });
  app.waitForParentExit = async () => {
    throw Object.assign(new Error("still running"), { code: "E_HANDOFF_FAILED" });
  };
  const runtime = {
    async recover() { app.calls.push(["runtime.recover"]); return { recovered: true }; },
  };

  assert.equal(await runHandoffJob({
    ...app,
    runtime,
    lifecycle: { async applyTheme() { throw new Error("must not apply"); } },
    cache: {},
  }), 1);
  assert.equal(app.calls.some(([name]) => name === "runtime.recover"), false);
  assert.equal(app.results[0].recovered, true);
});
