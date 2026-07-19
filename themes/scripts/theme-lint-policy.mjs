import { CATHEDRAL_ICON_ANCHORS } from "./cathedral-icon-contract.mjs";

const CATHEDRAL_ROOT = 'html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]';
const APPROVED_CODES = new Set(["long-selector", "positional-selector", "deep-child-chain"]);

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

export function unapprovedThemeLintWarnings(slug, warnings) {
  return warnings.filter((warning) => {
    if (warning.appId !== "codex" || !APPROVED_CODES.has(warning.code)) return true;
    const selector = normalizeSelector(warning.selector);
    if (warning.location === "targets.codex.css") {
      return !approvedSharedCssSelectors.has(selector);
    }
    if (slug !== "cathedral-nocturne" || !String(warning.location).startsWith("targets.codex.verification.")) {
      return true;
    }
    return !approvedVerificationSelectors.has(selector);
  });
}
