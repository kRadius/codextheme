const ENABLED = ':not(:disabled, [aria-disabled="true"])';
const SAFE_ACTION = ':not([data-variant="destructive"]):not([class*="text-token-danger"]):not([class*="text-token-error"]):not(:has([class*="text-token-danger"], [class*="text-token-error"]))';
const TRANSIENT_STATE = ':is(:hover, :focus-visible, [data-state="open"])';

export const PRIVATE_SKIN_INTERACTION_FAMILIES = Object.freeze([
  Object.freeze({
    id: "sidebar-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      "aside.app-shell-left-panel button:not(:where(.group > button))",
      "aside.app-shell-left-panel [class~=\"group/section-toggle\"]",
      "aside.app-shell-left-panel .group:has(> button > .text-token-foreground)",
      "aside.app-shell-left-panel [role=\"listitem\"] [role=\"button\"].group",
    ]),
  }),
  Object.freeze({
    id: "header-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      "main.main-surface header.app-header-tint button",
    ]),
  }),
  Object.freeze({
    id: "summary-chrome",
    paintTarget: "before",
    roots: Object.freeze([
      "button[class~=\"group/summary-panel-item\"]",
    ]),
  }),
  Object.freeze({
    id: "menu-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      "[role=\"menu\"] [role=\"menuitem\"]",
      "[role=\"listbox\"] [role=\"option\"]",
    ]),
  }),
  Object.freeze({
    id: "home-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      ".dream-home button:not(header *, .composer-surface-chrome *)",
    ]),
  }),
  Object.freeze({
    id: "composer-secondary",
    paintTarget: "self",
    roots: Object.freeze([
      ".composer-surface-chrome button.border-token-border",
    ]),
  }),
]);

function owned(selector) {
  return `html.codextheme-codex-skin ${selector}`;
}

function eligible(selector) {
  return `${selector}${ENABLED}${SAFE_ACTION}`;
}

function stateful(selector) {
  return `${eligible(selector)}${TRANSIENT_STATE}`;
}

function selectorList(family, transform = (selector) => selector) {
  return family.roots.map((selector) => owned(transform(selector))).join(",\n");
}

function glyphSelector(selector) {
  return `${selector} :is(.text-token-foreground, svg)`;
}

function familyCss(family) {
  const base = selectorList(family, eligible);
  const state = selectorList(family, stateful);
  const glyphs = selectorList(family, (selector) => glyphSelector(eligible(selector)));
  const stateGlyphs = selectorList(family, (selector) => glyphSelector(stateful(selector)));
  const paint = selectorList(
    family,
    (selector) => `${stateful(selector)}${family.paintTarget === "before" ? "::before" : ""}`,
  );
  const pseudoReset = family.paintTarget === "before"
    ? `${selectorList(family, (selector) => `${eligible(selector)}::before`)} {
  background-color: transparent !important;
  box-shadow: none !important;
}

`
    : "";
  const border = family.paintTarget === "before"
    ? ""
    : "  border-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-border-alpha), transparent) !important;\n";
  return `/* codextheme-interaction:${family.id} */
${base} {
  transition: color .16s ease, background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
}

${glyphs} {
  transition: color .16s ease, filter .16s ease;
}

${state} {
  color: var(--codextheme-accent) !important;
}

${pseudoReset}${paint} {
  background-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-surface-alpha), transparent) !important;
${border}  border-radius: var(--codextheme-radius) !important;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-glow-alpha), transparent) !important;
}

${stateGlyphs} {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-glow-alpha), transparent));
}`;
}

export function buildPrivateSkinInteractionCss() {
  return PRIVATE_SKIN_INTERACTION_FAMILIES.map(familyCss).join("\n\n");
}
