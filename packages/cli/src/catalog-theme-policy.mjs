const sidebarPrefix = 'aside.app-shell-left-panel [role="navigation"] .vertical-scroll-fade-mask > div:first-child > div > div > div';
const newChatSelector = 'aside.app-shell-left-panel [role="navigation"] > div.relative.z-10 > div.flex.flex-col.gap-1 > div.flex.flex-col.gap-px > div:first-child > button:first-child svg';

export const CATHEDRAL_ICON_ANCHORS = Object.freeze([
  { id: "icon-new-chat", contexts: ["home", "session"], selector: newChatSelector, expected: 1 },
  { id: "icon-pull-requests", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(1) svg`, expected: 1 },
  { id: "icon-scheduled", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(3) svg`, expected: 1 },
  { id: "icon-plugins", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(4) svg`, expected: 1 },
  {
    id: "icon-project-folder",
    contexts: ["home", "session"],
    selector: "aside.app-shell-left-panel .group\\/folder-row > div:first-child > span:first-child > svg",
    min: 1,
    max: 20,
  },
  { id: "icon-explore", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(1) svg", expected: 1 },
  { id: "icon-build", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(2) svg", expected: 1 },
  { id: "icon-review", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(3) svg", expected: 1 },
  { id: "icon-fix", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(4) svg", expected: 1 },
  { id: "icon-add", contexts: ["home", "session"], selector: ".composer-surface-chrome .col-start-1 button.aspect-square > svg", expected: 1 },
  { id: "icon-send", contexts: ["home", "session"], selector: ".composer-surface-chrome button.size-token-button-composer > svg", expected: 1 },
].map((anchor) => Object.freeze({ ...anchor, contexts: Object.freeze([...anchor.contexts]) })));

const CATHEDRAL_ROOT = 'html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]';
const APPROVED_CODES = new Set(["long-selector", "positional-selector", "deep-child-chain"]);
const CATALOG_THEME_VERSIONS = new Map([
  ["aurora-glass", "1.0.0"],
  ["cathedral-nocturne", "1.1.0"],
  ["crimson-eclipse", "1.0.0"],
  ["crimson-procession", "1.0.0"],
  ["midnight-circuit", "1.0.0"],
  ["silver-reliquary", "1.0.0"],
]);

function normalizeSelector(selector) {
  return String(selector).trim().replaceAll("'", '"').replace(/\s+/g, " ");
}

const approvedVerificationSelectors = new Set(CATHEDRAL_ICON_ANCHORS.map(({ selector }) => (
  normalizeSelector(selector)
)));
const approvedSharedCssSelectors = new Set(CATHEDRAL_ICON_ANCHORS.flatMap(({ selector }) => [
  `${CATHEDRAL_ROOT} ${selector}`,
  `${CATHEDRAL_ROOT} ${selector} > *`,
]).map(normalizeSelector));

export function unapprovedCatalogThemeLintWarnings(bundle, warnings) {
  const id = bundle?.theme?.id;
  const version = bundle?.theme?.version;
  if (CATALOG_THEME_VERSIONS.get(id) !== version) return [...warnings];

  return warnings.filter((warning) => {
    if (warning.appId !== "codex" || !APPROVED_CODES.has(warning.code)) return true;
    const selector = normalizeSelector(warning.selector);
    if (warning.location === "targets.codex.css") {
      return !approvedSharedCssSelectors.has(selector);
    }
    if (id !== "cathedral-nocturne" || !String(warning.location).startsWith("targets.codex.verification.")) {
      return true;
    }
    return !approvedVerificationSelectors.has(selector);
  });
}
