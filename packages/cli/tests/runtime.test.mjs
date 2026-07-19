import assert from "node:assert/strict";
import test from "node:test";
import { createRuntime } from "../src/runtime.mjs";

function coreHarness({ running = false, restore } = {}) {
  const calls = [];
  const core = {
    getAdapter(id) { calls.push(["getAdapter", id]); return { id: "codex", defaultPort: 9222 }; },
    async discoverApp() { calls.push(["discoverApp"]); return { executable: "/Applications/Codex" }; },
    async findTargets() { calls.push(["findTargets"]); return []; },
    async findRunningPids() { calls.push(["findRunningPids"]); return running ? [123] : []; },
    async restoreSkin() {
      calls.push(["restoreSkin"]);
      return restore ?? {
        renderer: { restored: false, code: "CODEDROBE_TARGET_TIMEOUT" },
        host: { restored: false, reason: "missing-backup" },
      };
    },
    async launchApp() { calls.push(["launchApp"]); return { targets: 1, pid: 456 }; },
    async applySkin() { throw new Error("not used"); },
    async readThemePackage() { throw new Error("not used"); },
    resolveThemeTarget() { throw new Error("not used"); },
    validateThemePackage() {},
    lintThemePackage() { return []; },
  };
  return { calls, runtime: createRuntime({ core, platform: "darwin" }) };
}

test("runtime recovery restores host state and relaunches Codex when it is absent", async () => {
  const app = coreHarness();
  const result = await app.runtime.recover();

  assert.equal(result.recovered, true);
  assert.deepEqual(app.calls.filter(([name]) => ["restoreSkin", "launchApp"].includes(name)), [
    ["restoreSkin"],
    ["launchApp"],
  ]);
});

test("runtime recovery does not launch a second Codex process when one is still running", async () => {
  const app = coreHarness({ running: true });
  const result = await app.runtime.recover();

  assert.equal(result.recovered, true);
  assert.equal(app.calls.some(([name]) => name === "launchApp"), false);
});

test("runtime recovery reports a partial restore without claiming success", async () => {
  const app = coreHarness({
    running: true,
    restore: {
      renderer: { restored: true },
      host: { restored: false, reason: "permission-denied" },
    },
  });
  const result = await app.runtime.recover();

  assert.equal(result.recovered, false);
});
