import * as runtimeCore from "@codextheme/runtime";
import { themeFilename } from "./catalog.mjs";

const RENDERER_ABSENT_CODES = new Set(["CODEDROBE_TARGET_TIMEOUT", "ECONNREFUSED"]);
const PRIVATE_THEME_ID = /^private-[a-z0-9]{20}$/;
const LEGACY_PRIVATE_HOME_RULE = /html\.codedrobe-codex-skin \.dream-home \{\n  position: relative;\n  isolation: isolate;\n  background-image: (linear-gradient\(rgba\(5, 6, 10, (?:0|1)\.\d{2}\), rgba\(5, 6, 10, (?:0|1)\.\d{2}\)\), var\(--codedrobe-image-hero\)) !important;\n  background-position: \d{1,3}% \d{1,3}% !important;\n  background-size: cover !important;\n\}/;
const PRIVATE_WINDOW_RULE = /html\.codedrobe-codex-skin body::before \{[\s\S]*?\n\}/;

function migratePrivateBackgroundAnchor(bundle) {
  const target = bundle?.targets?.codex;
  if (
    !PRIVATE_THEME_ID.test(bundle?.theme?.id ?? "")
    || bundle?.theme?.displayName !== "Private Custom Skin"
    || typeof target?.css !== "string"
    || target.css.includes("body:has(.dream-home)::before")
  ) return bundle;

  const legacyHome = target.css.match(LEGACY_PRIVATE_HOME_RULE);
  const windowRule = target.css.match(PRIVATE_WINDOW_RULE);
  if (!legacyHome || !windowRule) return bundle;

  const homeWindow = `${windowRule[0]}\n\nhtml.codedrobe-codex-skin body:has(.dream-home)::before {\n  background-image: ${legacyHome[1]};\n}`;
  const homeSurface = "html.codedrobe-codex-skin .dream-home {\n  position: relative;\n  isolation: isolate;\n  background: transparent !important;\n}";
  const css = target.css
    .replace(PRIVATE_WINDOW_RULE, homeWindow)
    .replace(LEGACY_PRIVATE_HOME_RULE, homeSurface);

  return {
    ...bundle,
    targets: {
      ...bundle.targets,
      codex: { ...target, css },
    },
  };
}

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
      const migrated = migratePrivateBackgroundAnchor(bundle);
      if (migrated !== bundle) {
        core.validateThemePackage(migrated);
        if (core.lintThemePackage(migrated).length) throw new Error("lint");
      }
      return core.resolveThemeTarget(migrated, adapter.id);
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
