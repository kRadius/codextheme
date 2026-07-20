function historicalHostClass(appId) {
  return `codedrobe-host-${String(appId).replace(/[^a-z0-9_-]/gi, "-")}`;
}

export function buildHistoricalRendererCleanupSource(adapter) {
  const appId = JSON.stringify(adapter.id);
  const hostClass = JSON.stringify(historicalHostClass(adapter.id));
  return `
    const historicalState = window.__CODEDROBE__?.hosts?.[${appId}];
    try { historicalState?.cleanup?.(); } catch {}
    document.getElementById('codedrobe-theme-style-' + ${appId})?.remove();
    const historicalRoot = document.documentElement;
    historicalRoot?.classList.remove(${hostClass});
    historicalRoot?.style.removeProperty('--codedrobe-art');
    if (historicalRoot?.style) {
      for (let index = historicalRoot.style.length - 1; index >= 0; index -= 1) {
        const name = historicalRoot.style.item(index);
        if (name.startsWith('--codedrobe-image-')) historicalRoot.style.removeProperty(name);
      }
    }
    if (historicalRoot?.dataset.codedrobeHost === ${appId}) {
      delete historicalRoot.dataset.codedrobeHost;
      delete historicalRoot.dataset.codedrobeTheme;
      delete historicalRoot.dataset.codedrobeThemeVersion;
    }
    if (window.__CODEDROBE__?.hosts) delete window.__CODEDROBE__.hosts[${appId}];
    if (historicalRoot && ![...historicalRoot.classList].some((name) => name.startsWith('codedrobe-host-'))) {
      historicalRoot.classList.remove('codedrobe-theme');
    }`;
}

export function cleanupHistoricalCodexProfile() {
  window.__CODEDROBE_CODEX_SKIN_DISABLED__ = true;
  const historicalState = window.__CODEDROBE_CODEX_SKIN_STATE__;
  try { historicalState?.cleanup?.(); } catch { /* Fall through to static cleanup. */ }
  historicalState?.observer?.disconnect?.();
  if (historicalState?.timer) clearInterval(historicalState.timer);
  if (historicalState?.scheduler?.timeout) clearTimeout(historicalState.scheduler.timeout);
  if (historicalState?.artUrl) globalThis.URL?.revokeObjectURL?.(historicalState.artUrl);
  delete window.__CODEDROBE_CODEX_SKIN_STATE__;
  const root = document.documentElement;
  root?.classList.remove("codedrobe-codex-skin");
  if (root) delete root.dataset.codexSkinTheme;
  root?.style.removeProperty("--dream-art");
  root?.style.removeProperty("--dream-tagline");
  root?.style.removeProperty("--dream-project-prefix");
  root?.style.removeProperty("--dream-project-label");
  document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
  document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
  document.getElementById("codedrobe-codex-skin-style")?.remove();
  document.getElementById("codedrobe-codex-skin-chrome")?.remove();
}
