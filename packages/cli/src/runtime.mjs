import {
  applySkin,
  discoverApp,
  findRunningPids,
  findTargets,
  getAdapter,
  lintThemePackage,
  readThemePackage,
  resolveThemeTarget,
  restoreSkin,
} from "@codextheme/runtime";
import { themeFilename } from "./catalog.mjs";

const adapter = getAdapter("codex");

export const runtime = {
  async loadTheme(slug) {
    const filename = themeFilename(slug);
    if (!filename) throw Object.assign(new Error("Unknown theme."), { code: "E_USAGE" });
    const bundle = await readThemePackage(filename);
    const warnings = lintThemePackage(bundle);
    if (warnings.length) {
      throw Object.assign(new Error("Bundled theme failed safety lint."), { code: "E_DOM_INCOMPATIBLE" });
    }
    return resolveThemeTarget(bundle, adapter.id);
  },

  async detect() {
    const discovered = await discoverApp(adapter);
    if (!discovered) return { installed: false, running: false, ready: false };
    let ready = false;
    try {
      ready = (await findTargets(adapter, adapter.defaultPort)).length > 0;
    } catch { /* An absent loopback endpoint is an expected detection result. */ }
    let running = ready;
    if (!running) {
      try {
        running = (await findRunningPids(adapter, process.platform, discovered.executable)).length > 0;
      } catch { /* applySkin still performs the authoritative launch check. */ }
    }
    return { installed: true, running, ready };
  },

  async apply({ theme, restartExisting }) {
    return applySkin({
      adapter,
      targetTheme: theme,
      launch: true,
      restartExisting,
    });
  },

  async restore() {
    return restoreSkin({ adapter });
  },
};
