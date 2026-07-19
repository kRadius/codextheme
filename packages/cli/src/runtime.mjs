import * as runtimeCore from "@codextheme/runtime";
import { themeFilename } from "./catalog.mjs";

const RENDERER_ABSENT_CODES = new Set(["CODEDROBE_TARGET_TIMEOUT", "ECONNREFUSED"]);

function restoreComplete(result) {
  const rendererComplete = result?.renderer?.restored === true
    || RENDERER_ABSENT_CODES.has(result?.renderer?.code);
  const hostComplete = result?.host?.restored === true
    || result?.host?.reason === "missing-backup";
  return rendererComplete && hostComplete;
}

export function createRuntime({ core = runtimeCore, platform = process.platform } = {}) {
  const adapter = core.getAdapter("codex");

  function resolveSafeTheme(bundle) {
    try {
      core.validateThemePackage(bundle);
      if (core.lintThemePackage(bundle).length) throw new Error("lint");
      return core.resolveThemeTarget(bundle, adapter.id);
    } catch {
      throw Object.assign(new Error("Theme failed safety validation."), { code: "E_DOM_INCOMPATIBLE" });
    }
  }

  async function detectCodex() {
    const discovered = await core.discoverApp(adapter, platform);
    if (!discovered) return { installed: false, running: false, ready: false };
    let ready = false;
    try {
      ready = (await core.findTargets(adapter, adapter.defaultPort)).length > 0;
    } catch { /* An absent loopback endpoint is an expected detection result. */ }
    let running = ready;
    if (!running) {
      try {
        running = (await core.findRunningPids(adapter, platform, discovered.executable)).length > 0;
      } catch { /* applySkin still performs the authoritative launch check. */ }
    }
    return { installed: true, running, ready };
  }

  return {
    async loadTheme(slug) {
      const filename = themeFilename(slug);
      if (!filename) throw Object.assign(new Error("Unknown theme."), { code: "E_USAGE" });
      const bundle = await core.readThemePackage(filename);
      return resolveSafeTheme(bundle);
    },

    async loadThemeBundle(bundle) {
      return resolveSafeTheme(bundle);
    },

    detect: detectCodex,

    async apply({ theme, restartExisting }) {
      return core.applySkin({
        adapter,
        targetTheme: theme,
        launch: true,
        restartExisting,
      });
    },

    async restore() {
      return core.restoreSkin({ adapter });
    },

    async recover() {
      let restored = null;
      try {
        restored = await core.restoreSkin({ adapter });
      } catch { /* Relaunch still runs even when restore itself fails. */ }

      let detection;
      try {
        detection = await detectCodex();
      } catch {
        detection = { installed: false, running: false, ready: false };
      }

      let launch = null;
      if (detection.installed && !detection.running) {
        try {
          launch = await core.launchApp({ adapter });
        } catch { /* The returned recovery result remains false. */ }
      }

      const running = detection.running || Boolean(launch?.targets);
      return {
        recovered: restoreComplete(restored) && running,
        restore: restored,
        launch,
      };
    },
  };
}

export const runtime = createRuntime();
