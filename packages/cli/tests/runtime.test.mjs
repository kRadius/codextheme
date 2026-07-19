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

test("catalog runtime accepts only the closed Cathedral selector warning set", async () => {
  const selector = 'html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"] .dream-home .group\\/home-suggestions button:nth-child(1) svg';
  const approved = {
    code: "positional-selector",
    appId: "codex",
    location: "targets.codex.css",
    selector,
  };
  const bundle = {
    theme: { id: "cathedral-nocturne", version: "1.1.0" },
    targets: { codex: { css: "" } },
  };

  function runtimeWith(warnings) {
    const core = {
      getAdapter() { return { id: "codex" }; },
      validateThemePackage() {},
      lintThemePackage() { return warnings; },
      resolveThemeTarget(value) { return value.targets.codex; },
    };
    return createRuntime({ core, platform: "darwin" });
  }

  await assert.doesNotReject(runtimeWith([approved]).loadThemeBundle(bundle));
  await assert.rejects(
    runtimeWith([{ ...approved, selector: `${selector} path` }]).loadThemeBundle(bundle),
    /Theme failed safety validation/,
  );
  await assert.rejects(
    runtimeWith([approved]).loadThemeBundle({
      ...bundle,
      theme: { id: "private-aaaaaaaaaaaaaaaaaaaa", version: "1.1.0" },
    }),
    /Theme failed safety validation/,
  );
});

test("runtime anchors legacy cached private artwork without mutating the cache bundle", async () => {
  const legacyCss = `html.codedrobe-codex-skin body::before {
  content: "";
  position: fixed;
  inset: -5%;
  background-image: linear-gradient(rgba(5, 6, 10, 0.42), rgba(5, 6, 10, 0.42)), var(--codedrobe-image-session-bg);
  background-position: 40% 65%;
  background-size: cover;
}

html.codedrobe-codex-skin .dream-home {
  position: relative;
  isolation: isolate;
  background-image: linear-gradient(rgba(5, 6, 10, 0.42), rgba(5, 6, 10, 0.42)), var(--codedrobe-image-hero) !important;
  background-position: 40% 65% !important;
  background-size: cover !important;
}`;
  const bundle = {
    theme: { id: "private-aaaaaaaaaaaaaaaaaaaa", displayName: "Private Custom Skin" },
    targets: { codex: { css: legacyCss } },
  };
  const core = {
    getAdapter() { return { id: "codex" }; },
    validateThemePackage() {},
    lintThemePackage() { return []; },
    resolveThemeTarget(value) { return value.targets.codex; },
  };
  const runtime = createRuntime({ core, platform: "darwin" });

  const resolved = await runtime.loadThemeBundle(bundle);

  assert.match(resolved.css, /body:has\(\.dream-home\)::before\s*\{[^}]*var\(--codedrobe-image-hero\)/s);
  const homeSurface = resolved.css.match(/\.dream-home\s*\{([^}]*)\}/s);
  assert.ok(homeSurface);
  assert.doesNotMatch(homeSurface[1], /var\(--codedrobe-image-hero\)/);
  assert.equal(bundle.targets.codex.css, legacyCss);
});
