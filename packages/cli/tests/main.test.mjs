import test from "node:test";
import assert from "node:assert/strict";
import { run } from "../src/main.mjs";

function sink() {
  let value = "";
  return { write(chunk) { value += chunk; }, text() { return value; } };
}

function harness({ state = null } = {}) {
  const calls = [];
  const stdout = sink();
  const stderr = sink();
  const stateStore = {
    async read() { return state; },
    async write(value) { state = value; calls.push(["state.write", value]); },
    async remove() { state = null; calls.push(["state.remove"]); },
  };
  const runtime = {
    async loadTheme(slug) {
      calls.push(["loadTheme", slug]);
      return { theme: { id: slug, displayName: "Midnight Circuit / 午夜回路" } };
    },
    async detect() {
      calls.push(["detect"]);
      return { installed: true, running: false, ready: false };
    },
    async apply({ restartExisting }) {
      calls.push(["apply", restartExisting]);
      return { targets: [{ result: { pass: true } }] };
    },
    async restore() {
      calls.push(["restore"]);
      return {
        renderer: { restored: true, targets: [] },
        host: { restored: true },
      };
    },
  };
  return {
    calls,
    stdout,
    stderr,
    deps: {
      platform: "darwin",
      stdout,
      stderr,
      runtime,
      stateStore,
      promptRestart: async () => false,
      now: () => new Date("2026-07-18T12:00:00.000Z"),
    },
  };
}

test("apply, reapply, and restore accept only their exact argv shapes", async () => {
  const apply = harness();
  assert.equal(await run(["apply", "midnight-circuit"], apply.deps), 0);
  assert.deepEqual(apply.calls[0], ["loadTheme", "midnight-circuit"]);

  const reapply = harness({
    state: { schemaVersion: 1, themeSlug: "midnight-circuit", appliedAt: "2026-07-18T10:00:00.000Z" },
  });
  assert.equal(await run(["reapply"], reapply.deps), 0);
  assert.equal(reapply.calls.some(([name]) => name === "fetch"), false);
  assert.deepEqual(reapply.calls[0], ["loadTheme", "midnight-circuit"]);

  const restore = harness();
  assert.equal(await run(["restore"], restore.deps), 0);
  assert.deepEqual(restore.calls[0], ["restore"]);
});

test("successful apply prints pinned reapply and restore commands", async () => {
  const app = harness();
  assert.equal(await run(["apply", "midnight-circuit"], app.deps), 0);
  assert.match(app.stdout.text(), /主题已应用并通过验证/);
  assert.match(app.stdout.text(), /npx --yes @codextheme\/cli@0\.1\.0 reapply/);
  assert.match(app.stdout.text(), /npx --yes @codextheme\/cli@0\.1\.0 restore/);
});

test("unknown slugs and malformed argv return E_USAGE without runtime calls", async () => {
  for (const argv of [["apply", "unknown"], ["apply"], ["reapply", "extra"], ["unknown"]]) {
    const app = harness();
    assert.equal(await run(argv, app.deps), 2);
    assert.match(app.stderr.text(), /E_USAGE/);
    assert.equal(app.calls.length, 0);
  }
});

test("unsupported platforms fail before a theme is loaded", async () => {
  const app = harness();
  assert.equal(await run(["apply", "midnight-circuit"], { ...app.deps, platform: "linux" }), 1);
  assert.match(app.stderr.text(), /E_PLATFORM/);
  assert.equal(app.calls.length, 0);
});

test("version is available without constructing runtime state", async () => {
  const app = harness();
  assert.equal(await run(["--version"], app.deps), 0);
  assert.equal(app.stdout.text(), "0.1.0\n");
  assert.equal(app.calls.length, 0);
});
