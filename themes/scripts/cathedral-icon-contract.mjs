const sidebarPrefix = 'aside.app-shell-left-panel [role="navigation"] .vertical-scroll-fade-mask > div:first-child > div > div > div';

export const CATHEDRAL_ICON_ANCHORS = Object.freeze([
  { id: "icon-new-chat", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(1) svg`, expected: 1 },
  { id: "icon-pull-requests", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(2) svg`, expected: 1 },
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

export function classifyCathedralIconCounts(context, observed) {
  if (!new Set(["home", "session"]).has(context)) throw new Error("Icon probe context must be home or session.");

  return CATHEDRAL_ICON_ANCHORS
    .filter((anchor) => anchor.contexts.includes(context))
    .map((anchor) => {
      const count = observed[anchor.id] ?? 0;
      const min = anchor.min ?? anchor.expected;
      const max = anchor.max ?? anchor.expected;
      return {
        id: anchor.id,
        min,
        max,
        count,
        status: count > max ? "error" : count < min ? "warning" : "pass",
      };
    });
}

export function buildCathedralIconCountExpression(context) {
  if (!new Set(["home", "session"]).has(context)) throw new Error("Icon probe context must be home or session.");
  const selectors = CATHEDRAL_ICON_ANCHORS
    .filter((anchor) => anchor.contexts.includes(context))
    .map(({ id, selector }) => [id, selector]);

  return `(() => {
    const selectors = ${JSON.stringify(selectors)};
    return Object.fromEntries(selectors.map(([id, selector]) => [id, document.querySelectorAll(selector).length]));
  })()`;
}

export function mergeCathedralIconCounts(observedByTarget) {
  if (!Array.isArray(observedByTarget)) throw new TypeError("Renderer observations must be an array.");

  const merged = {};
  for (const observed of observedByTarget) {
    if (!observed || typeof observed !== "object" || Array.isArray(observed)) continue;
    for (const [id, count] of Object.entries(observed)) {
      const safeCount = Number.isInteger(count) && count >= 0 ? count : 0;
      merged[id] = Math.max(merged[id] ?? 0, safeCount);
    }
  }
  return merged;
}
