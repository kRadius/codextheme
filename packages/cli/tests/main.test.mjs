import test from "node:test";
import assert from "node:assert/strict";
import { run } from "../src/main.mjs";

function sink() {
  let value = "";
  return { write(chunk) { value += chunk; }, text() { return value; } };
}

function harness({ state = null, detection, restartHandoff } = {}) {
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
    async loadThemeBundle(bundle) {
      calls.push(["loadThemeBundle", bundle.theme.id]);
      return { theme: bundle.theme };
    },
    async detect() {
      calls.push(["detect"]);
      return detection ?? { installed: true, running: false, ready: false };
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
      privateSource: {
        async download(id) {
          calls.push(["private.download", id]);
          return {
            serialized: JSON.stringify({ theme: { id: "private-test", displayName: "Private Custom Skin" } }),
            bundle: { theme: { id: "private-test", displayName: "Private Custom Skin" } },
          };
        },
      },
      privateCache: {
        async write() { calls.push(["privateCache.write"]); return "d".repeat(64); },
        async read(key) {
          calls.push(["privateCache.read", key]);
          return JSON.stringify({ theme: { id: "private-test", displayName: "Private Custom Skin" } });
        },
      },
      restartHandoff,
    },
  };
}

test("apply, reapply, and restore accept only their exact argv shapes", async () => {
  for (const slug of [
    "cathedral-nocturne",
    "crimson-procession",
    "silver-reliquary",
    "midnight-circuit",
  ]) {
    const apply = harness();
    assert.equal(await run(["apply", slug], apply.deps), 0);
    assert.deepEqual(apply.calls[0], ["loadTheme", slug]);
  }

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
  assert.equal(await run(["apply", "cathedral-nocturne"], app.deps), 0);
  assert.match(app.stdout.text(), /主题已应用并通过验证/);
  assert.match(app.stdout.text(), /npx --yes @codextheme\/cli@0\.2\.1 reapply/);
  assert.match(app.stdout.text(), /npx --yes @codextheme\/cli@0\.2\.1 restore/);
});

test("restart-required apply reports a detached handoff instead of completed application", async () => {
  const queued = [];
  const app = harness({
    detection: { installed: true, running: true, ready: false },
    restartHandoff: {
      async schedule(action) {
        queued.push(action);
        return { queued: true, resultPath: "/tmp/last-result.json" };
      },
    },
  });
  app.deps.promptRestart = async () => true;

  assert.equal(await run(["apply", "cathedral-nocturne"], app.deps), 0);
  assert.equal(queued.length, 1);
  assert.match(app.stdout.text(), /独立任务/);
  assert.match(app.stdout.text(), /Codex 将自动关闭并重新打开一次/);
  assert.match(app.stdout.text(), /当前 Codex task 可能结束/);
  assert.doesNotMatch(app.stdout.text(), /主题已应用并通过验证/);
  assert.equal(app.calls.some(([name, restart]) => name === "apply" && restart === true), false);
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
  assert.equal(app.stdout.text(), "0.2.1\n");
  assert.equal(app.calls.length, 0);
});

test("apply-private downloads and caches before touching Codex", async () => {
  const app = harness();
  const privateId = "n0z6o000.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  assert.equal(await run(["apply-private", privateId], app.deps), 0);
  assert.deepEqual(app.calls.slice(0, 4), [
    ["private.download", privateId],
    ["privateCache.write"],
    ["loadThemeBundle", "private-test"],
    ["detect"],
  ]);
  assert.match(app.stdout.text(), /Private Custom Skin/);
  assert.doesNotMatch(app.stdout.text(), new RegExp(privateId));
});

test("help labels the complete backward-compatible catalog accurately", async () => {
  const app = harness();
  assert.equal(await run(["--help"], app.deps), 0);
  assert.match(app.stdout.text(), /可用主题：/);
  assert.doesNotMatch(app.stdout.text(), /首发主题：/);
});
