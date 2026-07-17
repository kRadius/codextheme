import test from "node:test";
import assert from "node:assert/strict";
import { applyTheme, reapplyTheme, restoreTheme } from "../src/lifecycle.mjs";

const timestamp = "2026-07-18T12:00:00.000Z";

function harness({ detect, apply, restore, state } = {}) {
  const calls = [];
  let currentState = state ?? null;
  const runtime = {
    async loadTheme(slug) {
      calls.push(["loadTheme", slug]);
      return { theme: { id: slug, displayName: slug } };
    },
    async detect() {
      calls.push(["detect"]);
      return detect ?? { installed: true, running: false, ready: false };
    },
    async apply(options) {
      calls.push(["apply", options.restartExisting]);
      if (apply) return apply(options, calls);
      return { targets: [{ result: { pass: true } }] };
    },
    async restore() {
      calls.push(["restore"]);
      return restore ?? { renderer: { restored: true }, host: { restored: true } };
    },
  };
  const stateStore = {
    async read() { return currentState; },
    async write(value) { calls.push(["state.write", value]); currentState = value; },
    async remove() { calls.push(["state.remove"]); currentState = null; },
  };
  return { calls, runtime, stateStore, getState: () => currentState };
}

const applyOptions = (app, promptRestart = async () => false) => ({
  slug: "midnight-circuit",
  runtime: app.runtime,
  stateStore: app.stateStore,
  promptRestart,
  now: () => new Date(timestamp),
});

test("closed and CDP-ready Codex apply without an eager restart", async () => {
  for (const detect of [
    { installed: true, running: false, ready: false },
    { installed: true, running: true, ready: true },
  ]) {
    const app = harness({ detect });
    await applyTheme(applyOptions(app));
    assert.deepEqual(app.calls.find(([name]) => name === "apply"), ["apply", false]);
    assert.deepEqual(app.getState(), {
      schemaVersion: 1,
      themeSlug: "midnight-circuit",
      appliedAt: timestamp,
    });
  }
});

test("running Codex without CDP cancels unless restart receives explicit consent", async () => {
  const detect = { installed: true, running: true, ready: false };
  const cancelled = harness({ detect });
  await assert.rejects(() => applyTheme(applyOptions(cancelled)), { code: "E_RESTART_REQUIRED" });
  assert.equal(cancelled.calls.some(([name]) => name === "apply"), false);
  assert.equal(cancelled.getState(), null);

  const approved = harness({ detect });
  await applyTheme(applyOptions(approved, async () => true));
  assert.deepEqual(approved.calls.find(([name]) => name === "apply"), ["apply", true]);
});

test("runtime restart-required result prompts once and retries with restart", async () => {
  let attempts = 0;
  const app = harness({
    apply: async () => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error("restart"), { code: "CODEDROBE_RESTART_REQUIRED" });
      return { targets: [{ result: { pass: true } }] };
    },
  });
  let prompts = 0;
  await applyTheme(applyOptions(app, async () => { prompts += 1; return true; }));
  assert.equal(prompts, 1);
  assert.deepEqual(app.calls.filter(([name]) => name === "apply"), [["apply", false], ["apply", true]]);
});

test("verification failure never writes state", async () => {
  const app = harness({ apply: async () => ({ targets: [{ result: { pass: false } }] }) });
  await assert.rejects(() => applyTheme(applyOptions(app)), { code: "E_CORE_VERIFY" });
  assert.equal(app.calls.some(([name]) => name === "state.write"), false);
});

test("reapply uses only the locally stored bundled slug", async () => {
  const app = harness({
    state: { schemaVersion: 1, themeSlug: "aurora-glass", appliedAt: "2026-07-18T09:00:00.000Z" },
  });
  await reapplyTheme({
    runtime: app.runtime,
    stateStore: app.stateStore,
    promptRestart: async () => false,
    now: () => new Date(timestamp),
  });
  assert.deepEqual(app.calls[0], ["loadTheme", "aurora-glass"]);
  assert.equal(app.calls.some(([name]) => name === "fetch"), false);
});

test("complete and already-absent restore remove state", async () => {
  for (const restore of [
    { renderer: { restored: true }, host: { restored: true } },
    { renderer: { restored: false, code: "CODEDROBE_TARGET_TIMEOUT" }, host: { restored: false, reason: "missing-backup" } },
  ]) {
    const app = harness({
      state: { schemaVersion: 1, themeSlug: "crimson-eclipse", appliedAt: timestamp },
      restore,
    });
    await restoreTheme({ runtime: app.runtime, stateStore: app.stateStore });
    assert.equal(app.getState(), null);
  }
});

test("partial restore retains state and returns a stable public error", async () => {
  const original = { schemaVersion: 1, themeSlug: "crimson-eclipse", appliedAt: timestamp };
  const app = harness({
    state: original,
    restore: { renderer: { restored: false, code: "EACCES" }, host: { restored: true } },
  });
  await assert.rejects(() => restoreTheme({ runtime: app.runtime, stateStore: app.stateStore }), {
    code: "E_RESTORE_FAILED",
  });
  assert.deepEqual(app.getState(), original);
});
