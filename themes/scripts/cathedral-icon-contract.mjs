import { CATHEDRAL_ICON_ANCHORS } from "../../packages/cli/src/catalog-theme-policy.mjs";

export { CATHEDRAL_ICON_ANCHORS };

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
