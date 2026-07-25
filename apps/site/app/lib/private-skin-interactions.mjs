const ENABLED = ':not(:disabled, [aria-disabled="true"])';
const SAFE_ACTION = ':not([data-variant="destructive"]):not([class*="text-token-danger"]):not([class*="text-token-error"]):not(:has([class*="text-token-danger"], [class*="text-token-error"]))';
const TRANSIENT_STATE = ':is(:hover, :focus-visible, [data-state="open"])';
const NOT_SELECTED = ':not(:is([aria-current="page"], [aria-selected="true"], [data-state="active"]))';
const NOT_UNSAFE_DESCENDANT_ACTION = ':not(:has(button:is(:disabled, [aria-disabled="true"], [data-variant="destructive"])))';
const NOT_SELECTED_DESCENDANT_ACTION = ':not(:has(button:is([aria-current="page"], [aria-selected="true"], [data-state="active"])))';

function interactionTarget(selector, {
  preservesSelected = false,
  safetyScope = "self",
  selectedScope = "self",
} = {}) {
  return Object.freeze({ selector, preservesSelected, safetyScope, selectedScope });
}

function interactionFamily(id, paintTarget, targets) {
  const frozenTargets = Object.freeze(targets);
  return Object.freeze({
    id,
    paintTarget,
    roots: Object.freeze(frozenTargets.map(({ selector }) => selector)),
    targets: frozenTargets,
  });
}

export const PRIVATE_SKIN_INTERACTION_FAMILIES = Object.freeze([
  interactionFamily("sidebar-chrome", "self", [
    interactionTarget("aside.app-shell-left-panel button:not(:where(.group > button))", {
      preservesSelected: true,
    }),
    interactionTarget("aside.app-shell-left-panel [class~=\"group/section-toggle\"]", {
      preservesSelected: true,
    }),
    interactionTarget("aside.app-shell-left-panel .group:has(> button > .text-token-foreground)", {
      preservesSelected: true,
      safetyScope: "descendant-actions",
      selectedScope: "descendant-actions",
    }),
    interactionTarget("aside.app-shell-left-panel [role=\"listitem\"] [role=\"button\"].group", {
      preservesSelected: true,
      safetyScope: "descendant-actions",
      selectedScope: "descendant-actions",
    }),
  ]),
  interactionFamily("header-chrome", "self", [
    interactionTarget("main.main-surface header.app-header-tint button"),
  ]),
  interactionFamily("summary-chrome", "before", [
    interactionTarget("button[class~=\"group/summary-panel-item\"]"),
  ]),
  interactionFamily("menu-chrome", "self", [
    interactionTarget("[role=\"menu\"] [role=\"menuitem\"]"),
    interactionTarget("[role=\"listbox\"] [role=\"option\"]"),
  ]),
  interactionFamily("home-chrome", "self", [
    interactionTarget(".dream-home section[class~=\"group/home-suggestions\"] button"),
  ]),
  interactionFamily("composer-secondary", "self", [
    interactionTarget(".composer-surface-chrome button.border-token-border"),
  ]),
]);

function owned(selector) {
  return `html.codextheme-codex-skin ${selector}`;
}

function eligible(target) {
  const descendantGuard = target.safetyScope === "descendant-actions"
    ? NOT_UNSAFE_DESCENDANT_ACTION
    : "";
  return `${target.selector}${ENABLED}${SAFE_ACTION}${descendantGuard}`;
}

function stateful(target) {
  const selectedGuard = target.preservesSelected ? NOT_SELECTED : "";
  const descendantSelectedGuard = target.selectedScope === "descendant-actions"
    ? NOT_SELECTED_DESCENDANT_ACTION
    : "";
  return `${eligible(target)}${selectedGuard}${descendantSelectedGuard}${TRANSIENT_STATE}`;
}

function selectorList(family, transform = ({ selector }) => selector) {
  return family.targets.map((target) => owned(transform(target))).join(",\n");
}

function glyphSelector(selector) {
  return `${selector} :is(.text-token-foreground, svg)`;
}

function familyCss(family) {
  const base = selectorList(family, eligible);
  const state = selectorList(family, stateful);
  const glyphs = selectorList(family, (target) => glyphSelector(eligible(target)));
  const stateGlyphs = selectorList(family, (target) => glyphSelector(stateful(target)));
  const paint = selectorList(
    family,
    (target) => `${stateful(target)}${family.paintTarget === "before" ? "::before" : ""}`,
  );
  const pseudoReset = family.paintTarget === "before"
    ? `${selectorList(family, (target) => `${eligible(target)}::before`)} {
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
  -webkit-text-fill-color: var(--codextheme-accent) !important;
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
