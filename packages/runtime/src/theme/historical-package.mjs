export const HISTORICAL_THEME_FORMAT = "codedrobe-theme";

export function isHistoricalThemePackage(bundle) {
  return bundle?.format === HISTORICAL_THEME_FORMAT;
}

export function normalizeHistoricalThemePackage(bundle, canonicalFormat) {
  const migrateCss = (css) => css
    .replaceAll("codedrobe-codex-skin", "codextheme-codex-skin")
    .replaceAll("codedrobe-host-", "codextheme-host-")
    .replaceAll("codedrobe-theme", "codextheme-theme")
    .replaceAll("--codedrobe-image-", "--codextheme-image-")
    .replaceAll("--codedrobe-art", "--codextheme-art");
  return {
    ...bundle,
    format: canonicalFormat,
    targets: Object.fromEntries(Object.entries(bundle.targets ?? {}).map(([appId, target]) => [
      appId,
      { ...target, ...(typeof target?.css === "string" ? { css: migrateCss(target.css) } : {}) },
    ])),
  };
}
