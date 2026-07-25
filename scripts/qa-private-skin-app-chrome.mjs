import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { buildPrivateSkinPackage } from "../apps/site/app/lib/private-skin-package.mjs";
import { PRIVATE_SKIN_INTERACTION_FAMILIES } from "../apps/site/app/lib/private-skin-interactions.mjs";
import {
  CdpSession,
  applyTheme,
  getAdapter,
  listCdpTargets,
  resolveThemeTarget,
} from "@codextheme/runtime";

const PORT = 9335;
const HOVER_SETTLE_MS = 220;
const NAVIGATION_TIMEOUT_MS = 12_000;
const NARROW_VIEWPORT = Object.freeze({ width: 1100, height: 800 });
const QA_ATTRIBUTE = "data-codextheme-qa-id";
const FAMILY_SAMPLE_LIMITS = Object.freeze({
  "sidebar-chrome": 2,
  "header-chrome": 4,
  "summary-chrome": 6,
  "menu-chrome": 4,
  "home-chrome": 4,
  "composer-secondary": 4,
});
const FAMILY_MIN_STABLE_SAMPLES = Object.freeze({
  "sidebar-chrome": 2,
  "header-chrome": 2,
  "summary-chrome": 4,
  "menu-chrome": 2,
  "home-chrome": 4,
  "composer-secondary": 2,
});
const PRIVATE_ID = "mqa20260725.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXPORTED_AT = "2026-07-25T00:00:00.000Z";
const PROFILE = Object.freeze({
  primary: "#3e372f",
  secondary: "#8d6a45",
  highlight: "#948475",
  luminance: 38,
  saturation: 12,
  contrast: 24,
  complexity: 18,
});
const SETTINGS = Object.freeze({
  recipe: "cinematic",
  visibility: 92,
  overlay: 28,
  blur: 0,
  zoom: 108,
  positionX: 50,
  positionY: 50,
});
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const APPLICABLE_FAMILIES = Object.freeze({
  home: Object.freeze([
    "sidebar-chrome",
    "header-chrome",
    "home-chrome",
    "menu-chrome",
    "composer-secondary",
  ]),
  session: Object.freeze([
    "sidebar-chrome",
    "header-chrome",
    "summary-chrome",
    "menu-chrome",
    "composer-secondary",
  ]),
});
const EXCLUSION_CLASSES = Object.freeze([
  {
    id: "send-primary",
    selectors: [".composer-surface-chrome button.size-token-button-composer"],
    requireStable: true,
  },
  {
    id: "disabled",
    selectors: ["button:disabled", "[aria-disabled=\"true\"]"],
  },
  {
    id: "danger",
    selectors: [
      "[data-variant=\"destructive\"]",
      "[class*=\"text-token-danger\"]",
      "[class*=\"text-token-error\"]",
    ],
  },
  {
    id: "status",
    selectors: ["[role=\"status\"]"],
  },
  {
    id: "content",
    selectors: [
      "main.main-surface article a[href]",
      "main.main-surface [data-message-author-role] a[href]",
      "main.main-surface article button",
      "main.main-surface [data-message-author-role] button",
    ],
  },
  {
    id: "code",
    selectors: ["main.main-surface pre button", "main.main-surface [data-testid*=\"code\"] button"],
  },
  {
    id: "diff",
    selectors: ["main.main-surface [class*=\"diff\"] button", "main.main-surface [data-testid*=\"diff\"] button"],
  },
  {
    id: "file",
    selectors: [
      "main.main-surface article [data-testid*=\"file\"] button",
      "main.main-surface [data-message-author-role] [data-testid*=\"file\"] button",
    ],
  },
]);

const adapter = getAdapter("codex");
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const cssString = (value) => JSON.stringify(value);
const screenshotArgument = process.argv.find((argument) => argument.startsWith("--screenshot-dir="));
const screenshotDir = screenshotArgument
  ? path.resolve(screenshotArgument.slice("--screenshot-dir=".length))
  : null;
const reportArgument = process.argv.find((argument) => argument.startsWith("--report="));
const reportFile = reportArgument
  ? path.resolve(reportArgument.slice("--report=".length))
  : null;
const homeOnly = process.argv.includes("--home-only");
const sessionOnly = process.argv.includes("--session-only");
const temporarilyClearHomeDraft = process.argv.includes("--temporarily-clear-home-draft");
if (homeOnly && sessionOnly) {
  throw new Error("--home-only and --session-only are mutually exclusive.");
}
if (temporarilyClearHomeDraft && !homeOnly) {
  throw new Error("--temporarily-clear-home-draft requires --home-only.");
}
let qaSequence = 0;

function progress(stage, detail = "") {
  const suffix = detail ? ` ${detail}` : "";
  process.stderr.write(`[private-skin-qa] ${stage}${suffix}\n`);
}

function hsl(hex) {
  const [red, green, blue] = hex.slice(1).match(/../gu)
    .map((value) => Number.parseInt(value, 16) / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const range = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (range === 0) return { hue: 0, saturation: 0, lightness: lightness * 100 };
  const saturation = range / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (maximum === red) hue = ((green - blue) / range) % 6;
  else if (maximum === green) hue = (blue - red) / range + 2;
  else hue = (red - green) / range + 4;
  return {
    hue: (hue * 60 + 360) % 360,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/../gu).map((value) => {
    const channel = Number.parseInt(value, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function sha256(value) {
  return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
}

function targetIsEligibleSource() {
  return String.raw`
    const isUnsafe = (element) => element.matches(
      '[data-variant="destructive"], [class*="text-token-danger"], [class*="text-token-error"]'
    ) || Boolean(element.querySelector('[class*="text-token-danger"], [class*="text-token-error"]'));
    const isSelected = (element) => element.matches(
      '[aria-current="page"], [aria-selected="true"], [data-state="active"]'
    );
    const eligible = (element, target) => {
      if (element.matches(':disabled, [aria-disabled="true"]') || isUnsafe(element)) return false;
      if (target.safetyScope === "descendant-actions"
        && element.querySelector('button:is(:disabled, [aria-disabled="true"], [data-variant="destructive"])')) {
        return false;
      }
      if (target.preservesSelected && isSelected(element)) return false;
      if (target.selectedScope === "descendant-actions"
        && element.querySelector('button:is([aria-current="page"], [aria-selected="true"], [data-state="active"])')) {
        return false;
      }
      return true;
    };
  `;
}

function visibleSource() {
  return String.raw`
    const visible = (element, requireFull = true) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width < 12 || rect.height < 12 || style.display === "none"
        || style.visibility === "hidden" || style.pointerEvents === "none") return false;
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (ancestorStyle.display === "none" || ancestorStyle.visibility === "hidden"
          || Number.parseFloat(ancestorStyle.opacity) <= 0.01) {
          return false;
        }
      }
      const intersectionWidth = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
      const intersectionHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
      const ratio = (intersectionWidth * intersectionHeight) / Math.max(1, rect.width * rect.height);
      return ratio >= (requireFull ? 0.92 : 0.25);
    };
    const centerHit = (element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
        Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
      );
      return Boolean(hit && (hit === element || element.contains(hit)));
    };
  `;
}

function styleSource() {
  return String.raw`
    const colorPixels = (value) => {
      if (!value || value === "none") return null;
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.clearRect(0, 0, 1, 1);
      try {
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        return { red, green, blue, alpha: alpha / 255 };
      } catch {
        return null;
      }
    };
    const sameRgb = (first, second, tolerance = 2) => Boolean(first && second)
      && Math.abs(first.red - second.red) <= tolerance
      && Math.abs(first.green - second.green) <= tolerance
      && Math.abs(first.blue - second.blue) <= tolerance;
    const sameColor = (first, second, tolerance = 2) => sameRgb(first, second, tolerance)
      && Math.abs(first.alpha - second.alpha) <= 0.02;
    const accentPixels = colorPixels(getComputedStyle(document.documentElement)
      .getPropertyValue("--codextheme-accent").trim());
    const isAccentColor = (value) => sameRgb(colorPixels(value), accentPixels)
      && (colorPixels(value)?.alpha ?? 0) >= 0.98;
    const isAccentSurface = (value) => {
      const pixels = colorPixels(value);
      return sameRgb(pixels, accentPixels) && (pixels?.alpha ?? 0) >= 0.26 && (pixels?.alpha ?? 0) <= 0.34;
    };
    const effectiveTextColor = (style) => {
      const textFill = style.webkitTextFillColor;
      return textFill && textFill !== style.color ? textFill : style.color;
    };
    const readStyle = (element) => {
      const root = getComputedStyle(element);
      const before = getComputedStyle(element, "::before");
      const glyph = element.querySelector(":is(.text-token-foreground, svg)");
      const glyphStyle = glyph ? getComputedStyle(glyph) : null;
      const rect = element.getBoundingClientRect();
      return {
        root: {
          color: root.color,
          textFillColor: root.webkitTextFillColor,
          effectiveTextColor: effectiveTextColor(root),
          background: root.backgroundColor,
          borderColor: root.borderColor,
          shadow: root.boxShadow,
        },
        before: {
          background: before.backgroundColor,
          backgroundPixels: colorPixels(before.backgroundColor),
          shadow: before.boxShadow,
        },
        glyph: glyphStyle ? {
          color: glyphStyle.color,
          textFillColor: glyphStyle.webkitTextFillColor,
          effectiveTextColor: effectiveTextColor(glyphStyle),
          filter: glyphStyle.filter,
        } : null,
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
      };
    };
  `;
}

function materialSource() {
  return String.raw`
    const materialOwners = (element) => {
      const candidates = [element, ...element.querySelectorAll("button, [role=button]")];
      const owners = [];
      for (const candidate of candidates) {
        const root = getComputedStyle(candidate);
        const before = getComputedStyle(candidate, "::before");
        if (isAccentSurface(root.backgroundColor)) owners.push({ kind: "self", root: candidate });
        if (isAccentSurface(before.backgroundColor)) owners.push({ kind: "before", root: candidate });
      }
      return owners;
    };
    const actionOverlap = (element) => {
      const actions = [...element.querySelectorAll("button")].filter((button) => visible(button, false));
      const outside = actions.some((button) => {
        const action = button.getBoundingClientRect();
        const root = element.getBoundingClientRect();
        return action.left < root.left - 1 || action.right > root.right + 1
          || action.top < root.top - 1 || action.bottom > root.bottom + 1;
      });
      let overlaps = false;
      for (let first = 0; first < actions.length; first += 1) {
        const a = actions[first].getBoundingClientRect();
        for (let second = first + 1; second < actions.length; second += 1) {
          const b = actions[second].getBoundingClientRect();
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
            overlaps = true;
          }
        }
      }
      return { actionCount: actions.length, outside, overlaps };
    };
  `;
}

function editorSelectionSource() {
  return String.raw`
    const nodePathFrom = (root, node) => {
      if (!node || (node !== root && !root.contains(node))) return null;
      const path = [];
      for (let current = node; current && current !== root; current = current.parentNode) {
        const parent = current.parentNode;
        if (!parent) return null;
        path.unshift([...parent.childNodes].indexOf(current));
      }
      return path;
    };
    const nodeFromPath = (root, path) => {
      if (!Array.isArray(path)) return null;
      let current = root;
      for (const index of path) {
        current = current?.childNodes?.[index] ?? null;
        if (!current) return null;
      }
      return current;
    };
    const selectionSnapshot = (editor) => {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) return { valid: false };
      const anchorPath = nodePathFrom(editor, selection.anchorNode);
      const focusPath = nodePathFrom(editor, selection.focusNode);
      if (!anchorPath || !focusPath) return { valid: false };
      let direction = selection.isCollapsed ? "none" : null;
      if (!direction) {
        const anchorRange = document.createRange();
        anchorRange.setStart(editor, 0);
        anchorRange.setEnd(selection.anchorNode, selection.anchorOffset);
        const focusRange = document.createRange();
        focusRange.setStart(editor, 0);
        focusRange.setEnd(selection.focusNode, selection.focusOffset);
        direction = anchorRange.compareBoundaryPoints(Range.END_TO_END, focusRange) <= 0
          ? "forward"
          : "backward";
      }
      return {
        valid: true,
        anchorPath,
        anchorOffset: selection.anchorOffset,
        focusPath,
        focusOffset: selection.focusOffset,
        direction,
      };
    };
  `;
}

function selectionSnapshotsEqual(first, second) {
  if (!first?.valid) return true;
  return Boolean(second?.valid)
    && JSON.stringify(first.anchorPath) === JSON.stringify(second.anchorPath)
    && first.anchorOffset === second.anchorOffset
    && JSON.stringify(first.focusPath) === JSON.stringify(second.focusPath)
    && first.focusOffset === second.focusOffset
    && first.direction === second.direction;
}

async function evaluate(session, expression) {
  return session.evaluate(expression);
}

async function movePointer(session, x = 2, y = 2) {
  await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
}

async function clickAt(session, x, y) {
  await movePointer(session, x, y);
  await session.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
}

async function pressEscape(session) {
  await session.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 53,
  });
  await session.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 53,
  });
}

async function waitFor(session, condition, description, timeoutMs = NAVIGATION_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(session, `Boolean(${condition})`)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function tagFirst(session, selectorExpression) {
  const id = `qa-${++qaSequence}`;
  const result = await evaluate(session, `(() => {
    ${visibleSource()}
    const candidates = ${selectorExpression};
    const element = candidates.find((candidate) => visible(candidate, false) && centerHit(candidate));
    if (!element) return null;
    element.setAttribute(${cssString(QA_ATTRIBUTE)}, ${cssString(id)});
    const rect = element.getBoundingClientRect();
    return {
      id: ${cssString(id)},
      x: Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
      y: Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
    };
  })()`);
  return result;
}

async function navigateHome(session) {
  const control = await tagFirst(
    session,
    `[...document.querySelectorAll(
      "aside.app-shell-left-panel button.flex.min-w-0.flex-1.cursor-interaction.items-center.text-left"
    )]`,
  );
  if (!control) throw new Error("Could not identify the safe New Task navigation control.");
  await clickAt(session, control.x, control.y);
  await waitFor(session, `document.querySelector(".dream-home")`, "Codex Home");
}

async function restoreThread(session, threadId) {
  if (!threadId) return;
  const control = await tagFirst(
    session,
    `[...document.querySelectorAll("[data-app-action-sidebar-thread-row]")]
      .filter((element) => element.getAttribute("data-app-action-sidebar-thread-id") === ${cssString(threadId)})`,
  );
  if (!control) throw new Error("The original selected task row is no longer available for restoration.");
  await clickAt(session, control.x, control.y);
  await waitFor(
    session,
    `document.querySelector("[data-app-action-sidebar-thread-row][aria-current=\\"page\\"]")
      ?.getAttribute("data-app-action-sidebar-thread-id") === ${cssString(threadId)}
      && !document.querySelector(".dream-home")`,
    "the original Codex task",
  );
}

async function openSafeMenu(session) {
  const control = await tagFirst(
    session,
    `[...document.querySelectorAll(
      "aside.app-shell-left-panel button[aria-haspopup=\\"menu\\"][data-state=\\"closed\\"]"
    )]`,
  );
  if (!control) throw new Error("No safe, closed sidebar menu trigger is visible.");
  await clickAt(session, control.x, control.y);
  await waitFor(
    session,
    `document.querySelector("[role=\\"menu\\"] [role=\\"menuitem\\"], [role=\\"listbox\\"] [role=\\"option\\"]")`,
    "a non-destructive menu",
  );
  return control;
}

async function closeMenu(session) {
  const open = await evaluate(
    session,
    `Boolean(document.querySelector("[role=\\"menu\\"], [role=\\"listbox\\"]"))`,
  );
  if (!open) return;
  await pressEscape(session);
  await waitFor(
    session,
    `!document.querySelector("[role=\\"menu\\"], [role=\\"listbox\\"]")`,
    "the menu to close",
    4_000,
  );
}

const BROWSER_PANEL_VISIBLE_EXPRESSION = `([...document.querySelectorAll("webview")].some((element) => {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const hit = document.elementFromPoint(
    Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
    Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
  );
  return rect.width > 100 && rect.height > 100
    && style.display !== "none" && style.visibility !== "hidden"
    && hit === element;
}))`;

async function browserPanelVisible(session) {
  return evaluate(session, BROWSER_PANEL_VISIBLE_EXPRESSION);
}

async function tagBrowserPanelToggle(session) {
  const id = `qa-panel-${++qaSequence}`;
  return evaluate(session, `(() => {
    const buttons = [...document.querySelectorAll(
      "main.main-surface header.app-header-tint button"
    )].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const intersectionHeight = Math.max(
        0,
        Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0),
      );
      return rect.width >= 12 && rect.height >= 12
        && intersectionHeight >= rect.height * 0.25
        && style.display !== "none" && style.visibility !== "hidden";
    });
    const element = buttons.at(-1);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const points = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + rect.width / 2, rect.bottom - 4],
      [rect.left + 4, rect.bottom - 4],
      [rect.right - 4, rect.bottom - 4],
    ].map(([x, y]) => [
      Math.max(2, Math.min(innerWidth - 2, x)),
      Math.max(2, Math.min(innerHeight - 2, y)),
    ]);
    const point = points.find(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit && (hit === element || element.contains(hit));
    });
    if (!point) return null;
    element.setAttribute(${cssString(QA_ATTRIBUTE)}, ${cssString(id)});
    return {
      id: ${cssString(id)},
      x: point[0],
      y: point[1],
    };
  })()`);
}

async function setBrowserPanel(session, open) {
  const current = await browserPanelVisible(session);
  if (current === open) return false;
  const control = await tagBrowserPanelToggle(session);
  if (!control) throw new Error("Could not identify the visible Browser panel toggle.");
  await clickAt(session, control.x, control.y);
  await waitFor(
    session,
    open ? BROWSER_PANEL_VISIBLE_EXPRESSION : `!${BROWSER_PANEL_VISIBLE_EXPRESSION}`,
    open ? "the Browser panel to reopen" : "the Browser panel to close",
  );
  return true;
}

async function readRootState(session) {
  return evaluate(session, `(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    return {
      active: root.classList.contains("codextheme-codex-skin"),
      namespace: [...root.classList].filter((name) => name.startsWith("codextheme-")),
      accent: style.getPropertyValue("--codextheme-accent").trim(),
      surface: style.getPropertyValue("--codextheme-surface").trim(),
      view: document.querySelector(".dream-home") ? "home" : "session",
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio,
      selectedThreadId: document
        .querySelector("[data-app-action-sidebar-thread-row][aria-current=\\"page\\"]")
        ?.getAttribute("data-app-action-sidebar-thread-id") ?? null,
      browserPanelVisible: ${BROWSER_PANEL_VISIBLE_EXPRESSION},
      menuCount: document.querySelectorAll("[role=\\"menu\\"], [role=\\"listbox\\"]").length,
      qaMarkerCount: document.querySelectorAll("[${QA_ATTRIBUTE}]").length,
      composerBottom: document.querySelector(".composer-surface-chrome")
        ?.getBoundingClientRect().bottom ?? null,
    };
  })()`);
}

async function readHomeProjectContext(session) {
  return evaluate(session, `(() => {
    const button = document.querySelector(
      '.dream-home [class~="group/project-selector"] button.border-token-border'
    );
    return (button?.innerText || button?.textContent || "").replace(/\\s+/g, " ").trim();
  })()`);
}

async function readHomeDraft(session) {
  return evaluate(session, `(() => {
    ${editorSelectionSource()}
    const textarea = document.querySelector(".composer-surface-chrome textarea");
    if (textarea) {
      return {
        kind: "textarea",
        value: textarea.value,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
        selectionDirection: textarea.selectionDirection,
        scrollTop: textarea.scrollTop,
        scrollLeft: textarea.scrollLeft,
        active: document.activeElement === textarea,
      };
    }
    const editable = document.querySelector(
      '.composer-surface-chrome [contenteditable="true"]'
    );
    if (!editable) return null;
    return {
      kind: "contenteditable",
      value: editable.innerText ?? "",
      selectionStart: null,
      selectionEnd: null,
      selectionDirection: null,
      scrollTop: editable.scrollTop,
      scrollLeft: editable.scrollLeft,
      active: document.activeElement === editable,
      selection: selectionSnapshot(editable),
    };
  })()`);
}

async function setHomeDraft(session, state, value) {
  const focused = await evaluate(session, `(() => {
    const kind = ${cssString(state.kind)};
    const element = kind === "textarea"
      ? document.querySelector(".composer-surface-chrome textarea")
      : document.querySelector('.composer-surface-chrome [contenteditable="true"]');
    if (!element) return null;
    element.focus({ preventScroll: true });
    return {
      active: document.activeElement === element,
      role: element.getAttribute("role"),
      verifiedComposer: kind === "textarea"
        ? element.matches(".composer-surface-chrome textarea")
        : element.matches(
          'div.ProseMirror[contenteditable="true"][data-codex-composer="true"]'
        ) && element.isContentEditable === true,
      value: kind === "textarea" ? element.value : (element.innerText ?? ""),
    };
  })()`);
  if (!focused?.active || !focused.verifiedComposer) {
    throw new Error(`Could not focus the verified Home ${state.kind} draft editor.`);
  }
  if (focused.value !== value && focused.value !== "") {
    await session.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
      modifiers: 4,
    });
    await session.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
      modifiers: 4,
    });
    await session.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "Backspace",
      code: "Backspace",
      windowsVirtualKeyCode: 8,
    });
    await session.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Backspace",
      code: "Backspace",
      windowsVirtualKeyCode: 8,
    });
    await waitFor(
      session,
      `(() => {
        const textarea = document.querySelector(".composer-surface-chrome textarea");
        const editable = document.querySelector(
          '.composer-surface-chrome [contenteditable="true"]'
        );
        return (textarea?.value ?? editable?.innerText ?? null)?.trim() === "";
      })()`,
      "the Home draft editor to become empty through keyboard input",
    );
  }
  if (value && focused.value !== value) {
    await session.send("Input.insertText", { text: value });
  }
}

async function restoreHomeEditorState(session, state) {
  return evaluate(session, `(() => {
    ${editorSelectionSource()}
    const state = ${JSON.stringify({
    kind: state.kind,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
    selectionDirection: state.selectionDirection,
    scrollTop: state.scrollTop,
    scrollLeft: state.scrollLeft,
    active: state.active,
    selection: state.selection ?? { valid: false },
  })};
    const element = state.kind === "textarea"
      ? document.querySelector(".composer-surface-chrome textarea")
      : document.querySelector('.composer-surface-chrome [contenteditable="true"]');
    if (!element) return { restored: false, selection: { valid: false } };
    if (state.kind === "textarea"
      && Number.isInteger(state.selectionStart)
      && Number.isInteger(state.selectionEnd)) {
      element.setSelectionRange(
        state.selectionStart,
        state.selectionEnd,
        state.selectionDirection || "none",
      );
    }
    element.scrollTop = state.scrollTop;
    element.scrollLeft = state.scrollLeft;
    if (state.kind === "contenteditable" && state.selection?.valid) {
      const anchorNode = nodeFromPath(element, state.selection.anchorPath);
      const focusNode = nodeFromPath(element, state.selection.focusPath);
      if (!anchorNode || !focusNode) {
        return { restored: false, selection: { valid: false } };
      }
      element.focus({ preventScroll: true });
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.setBaseAndExtent(
        anchorNode,
        state.selection.anchorOffset,
        focusNode,
        state.selection.focusOffset,
      );
    }
    if (state.active) element.focus({ preventScroll: true });
    else if (document.activeElement === element) element.blur();
    return {
      restored: true,
      active: document.activeElement === element,
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
      selection: state.kind === "contenteditable"
        ? selectionSnapshot(element)
        : { valid: false },
    };
  })()`);
}

async function waitForStableLayout(session) {
  await evaluate(session, `new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`);
  await sleep(250);
  let previous = null;
  let stableReads = 0;
  const deadline = Date.now() + NAVIGATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const current = await evaluate(session, `(() => {
      const measure = (element) => element ? {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      } : null;
      return {
        root: measure(document.documentElement),
        body: measure(document.body),
        main: measure(document.querySelector("main.main-surface")),
      };
    })()`);
    const serialized = JSON.stringify(current);
    if (serialized === previous) stableReads += 1;
    else stableReads = 0;
    if (stableReads >= 2) return current;
    previous = serialized;
    await sleep(100);
  }
  throw new Error("Timed out waiting for stable responsive layout metrics.");
}

async function setViewport(session, viewport, original) {
  if (viewport.id === "desktop") {
    await session.send("Emulation.clearDeviceMetricsOverride");
    await waitFor(
      session,
      `innerWidth === ${original.width} && innerHeight === ${original.height}`,
      "the physical desktop viewport",
    );
    await waitForStableLayout(session);
    return;
  }
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: original.devicePixelRatio,
    mobile: false,
    screenWidth: original.width,
    screenHeight: original.height,
  });
  await waitFor(
    session,
    `innerWidth === ${viewport.width} && innerHeight === ${viewport.height}`,
    `${viewport.width}x${viewport.height} emulated viewport`,
  );
  await waitForStableLayout(session);
}

async function collectControls(session, family) {
  const controls = [];
  const roots = [];
  const limit = FAMILY_SAMPLE_LIMITS[family.id] ?? 4;
  for (let targetIndex = 0; targetIndex < family.targets.length; targetIndex += 1) {
    const target = family.targets[targetIndex];
    const tagPrefix = `qa-family-${family.id}-${targetIndex}-${++qaSequence}`;
    const collected = await evaluate(session, `(() => {
      ${visibleSource()}
      ${targetIsEligibleSource()}
      const signatureOf = (element) => ({
        text: (element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim(),
        ariaLabel: element.getAttribute("aria-label"),
        title: element.getAttribute("title"),
        testId: element.getAttribute("data-testid"),
        threadId: element.getAttribute("data-app-action-sidebar-thread-id"),
      });
      const candidates = [...document.querySelectorAll(${cssString(target.selector)})]
        .filter((element) => visible(element, ${family.id === "header-chrome" ? "false" : "true"}))
        .filter((element) => centerHit(element))
        .filter((element) => eligible(element, ${JSON.stringify(target)}));
      const prioritized = ${cssString(family.id)} === "sidebar-chrome" && ${targetIndex} === 0
        ? [
          ...candidates.filter((element) =>
            element.classList.contains("!text-token-input-placeholder-foreground")),
          ...candidates.filter((element) =>
            !element.classList.contains("!text-token-input-placeholder-foreground")),
        ]
        : candidates;
      const sampleIndices = prioritized.length <= ${limit}
        ? prioritized.map((_, index) => index)
        : [...new Set(Array.from({ length: ${limit} }, (_, index) =>
          Math.floor(index * prioritized.length / ${limit})))];
      const tagged = sampleIndices.map((index) => prioritized[index])
        .map((element, controlIndex) => {
          const id = ${cssString(tagPrefix)} + "-" + controlIndex;
          element.setAttribute(${cssString(QA_ATTRIBUTE)}, id);
          const rect = element.getBoundingClientRect();
          const identity = signatureOf(element);
          identity.signatureOccurrence = prioritized
            .slice(0, prioritized.indexOf(element))
            .filter((candidate) =>
              JSON.stringify(signatureOf(candidate)) === JSON.stringify(identity)).length;
          return {
            id,
            controlIndex,
            identity,
            candidateOrdinal: prioritized.indexOf(element),
            x: Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
            y: Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
          };
        });
      return { total: candidates.length, tagged };
    })()`);
    roots.push({
      selector: target.selector,
      targetIndex,
      visibleEligibleControls: collected.total,
      sampledControls: collected.tagged.length,
    });
    controls.push(...collected.tagged.map((control) => ({
      ...control,
      target,
      targetIndex,
      selector: target.selector,
    })));
  }
  return { controls, roots };
}

async function retagControl(session, family, control, retryIndex) {
  const id = `qa-family-${family.id}-${control.targetIndex}-${control.controlIndex}-retry-${retryIndex}-${++qaSequence}`;
  const replacement = await evaluate(session, `(() => {
    ${visibleSource()}
    ${targetIsEligibleSource()}
    const target = ${JSON.stringify(control.target)};
    const expected = ${JSON.stringify(control.identity)};
    const signatureOf = (element) => ({
      text: (element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim(),
      ariaLabel: element.getAttribute("aria-label"),
      title: element.getAttribute("title"),
      testId: element.getAttribute("data-testid"),
      threadId: element.getAttribute("data-app-action-sidebar-thread-id"),
    });
    const matchesSignature = (element) => {
      const actual = signatureOf(element);
      return actual.text === expected.text
        && actual.ariaLabel === expected.ariaLabel
        && actual.title === expected.title
        && actual.testId === expected.testId
        && actual.threadId === expected.threadId;
    };
    const candidates = [...document.querySelectorAll(${cssString(control.selector)})]
      .filter((element) => visible(element, ${family.id === "header-chrome" ? "false" : "true"}))
      .filter((element) => centerHit(element))
      .filter((element) => eligible(element, target));
    const prioritized = ${cssString(family.id)} === "sidebar-chrome"
      && ${control.targetIndex} === 0
      ? [
        ...candidates.filter((element) =>
          element.classList.contains("!text-token-input-placeholder-foreground")),
        ...candidates.filter((element) =>
          !element.classList.contains("!text-token-input-placeholder-foreground")),
      ]
      : candidates;
    const signatureMatches = prioritized.filter(matchesSignature);
    const element = signatureMatches[expected.signatureOccurrence]
      ?? prioritized[${control.candidateOrdinal}]
      ?? null;
    if (!element) return null;
    element.setAttribute(${cssString(QA_ATTRIBUTE)}, ${cssString(id)});
    const rect = element.getBoundingClientRect();
    return {
      id: ${cssString(id)},
      x: Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
      y: Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
    };
  })()`);
  return replacement ? { ...control, ...replacement } : null;
}

async function readTaggedStyle(session, id) {
  return evaluate(session, `(() => {
    ${visibleSource()}
    ${styleSource()}
    ${materialSource()}
    const element = document.querySelector(
      "[${QA_ATTRIBUTE}=" + CSS.escape(${cssString(id)}) + "]"
    );
    if (!element) return null;
    const style = readStyle(element);
    return {
      ...style,
      hit: (() => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
          Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
        );
        return Boolean(hit && (hit === element || element.contains(hit)));
      })(),
      rootColorAccent: isAccentColor(style.root.effectiveTextColor),
      rootComputedColorAccent: isAccentColor(style.root.color),
      rootTextFillAccent: isAccentColor(style.root.textFillColor),
      rootSurfaceAccent: isAccentSurface(style.root.background),
      beforeSurfaceAccent: isAccentSurface(style.before.background),
      glyphColorAccent: style.glyph ? isAccentColor(style.glyph.effectiveTextColor) : null,
      glyphComputedColorAccent: style.glyph ? isAccentColor(style.glyph.color) : null,
      glyphTextFillAccent: style.glyph ? isAccentColor(style.glyph.textFillColor) : null,
      glyphFilterAccent: style.glyph
        ? style.glyph.filter !== "none" && style.glyph.filter.includes("drop-shadow")
        : null,
      materialOwners: materialOwners(element).map((owner) => owner.kind),
      actionOverlap: actionOverlap(element),
    };
  })()`);
}

async function auditFamily(session, family) {
  const { controls, roots } = await collectControls(session, family);
  const rows = [];
  const discardedSamples = [];
  for (const control of controls) {
    let activeControl = control;
    let idle = null;
    let hover = null;
    let stableAttempt = null;
    for (let attempt = 0; attempt < 2 && activeControl; attempt += 1) {
      await movePointer(session);
      await sleep(40);
      idle = await readTaggedStyle(session, activeControl.id);
      await movePointer(session, activeControl.x, activeControl.y);
      await sleep(HOVER_SETTLE_MS);
      hover = await readTaggedStyle(session, activeControl.id);
      if (idle && hover) {
        stableAttempt = attempt;
        break;
      }
      discardedSamples.push({
        targetIndex: control.targetIndex,
        controlIndex: control.controlIndex,
        attempt,
        reason: !idle ? "tagged control detached before idle read" : "tagged control detached before hover read",
        reselectStrategy: "same selector and normalized text/attributes, then original candidate ordinal",
      });
      activeControl = attempt === 0
        ? await retagControl(session, family, control, attempt + 1)
        : null;
    }
    if (stableAttempt === null) continue;
    const ownerMaterial = family.paintTarget === "before"
      ? hover?.beforeSurfaceAccent
      : hover?.rootSurfaceAccent;
    const geometryStable = Boolean(idle && hover)
      && Math.abs(idle.rect.left - hover.rect.left) <= 0.5
      && Math.abs(idle.rect.top - hover.rect.top) <= 0.5
      && Math.abs(idle.rect.width - hover.rect.width) <= 0.5
      && Math.abs(idle.rect.height - hover.rect.height) <= 0.5;
    const glyphMaterial = hover?.glyph === null
      || Boolean(hover?.glyphColorAccent && hover?.glyphFilterAccent);
    const singleOwner = hover?.materialOwners.length === 1
      && hover.materialOwners[0] === family.paintTarget;
    const result = Boolean(
      idle
      && hover
      && hover.hit
      && ownerMaterial
      && hover.rootColorAccent
      && glyphMaterial
      && singleOwner
      && geometryStable
      && !hover.actionOverlap.outside
      && !hover.actionOverlap.overlaps,
    );
    rows.push({
      family: family.id,
      paintTarget: family.paintTarget,
      selector: control.selector,
      targetIndex: control.targetIndex,
      controlIndex: control.controlIndex,
      stableAttempt,
      result,
      checks: {
        pointerHit: hover?.hit ?? false,
        ownerMaterial: Boolean(ownerMaterial),
        rootColorAccent: hover?.rootColorAccent ?? false,
        glyphMaterial,
        singleOwner,
        geometryStable,
        rowActionsContained: !hover?.actionOverlap.outside,
        rowActionsDoNotOverlap: !hover?.actionOverlap.overlaps,
      },
      idle,
      hover,
    });
  }
  await movePointer(session);
  const minimumStableSamples = FAMILY_MIN_STABLE_SAMPLES[family.id] ?? 1;
  return {
    family: family.id,
    roots,
    attemptedControls: controls.length,
    sampledControls: rows.length,
    minimumStableSamples,
    coverageMet: rows.length >= minimumStableSamples,
    discardedSamples,
    rows,
  };
}

function elementEligibleForFamilySource() {
  return String.raw`
    const eligibleFamilies = (element) => {
      ${targetIsEligibleSource()}
      const families = ${JSON.stringify(PRIVATE_SKIN_INTERACTION_FAMILIES)};
      return families.flatMap((family) => family.targets
        .filter((target) => element.matches(target.selector) && eligible(element, target))
        .map(() => family.id));
    };
  `;
}

async function probeExclusion(session, exclusion) {
  const id = `qa-exclusion-${exclusion.id}-${++qaSequence}`;
  const probe = await evaluate(session, `(() => {
    ${visibleSource()}
    const selectors = ${JSON.stringify(exclusion.selectors)};
    let element = null;
    let matchedSelector = null;
    for (const selector of selectors) {
      element = [...document.querySelectorAll(selector)]
        .find((candidate) => visible(candidate, false) && centerHit(candidate));
      if (element) {
        matchedSelector = selector;
        break;
      }
    }
    if (!element) return null;
    element.setAttribute(${cssString(QA_ATTRIBUTE)}, ${cssString(id)});
    const rect = element.getBoundingClientRect();
    return {
      id: ${cssString(id)},
      matchedSelector,
      x: Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
      y: Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
    };
  })()`);
  if (!probe) return { class: exclusion.id, status: "Not observed" };
  await movePointer(session);
  await sleep(40);
  const idle = await readTaggedStyle(session, probe.id);
  await movePointer(session, probe.x, probe.y);
  await sleep(HOVER_SETTLE_MS);
  const hover = await readTaggedStyle(session, probe.id);
  const eligibleFamilies = await evaluate(session, `(() => {
    ${elementEligibleForFamilySource()}
    const element = document.querySelector(
      "[${QA_ATTRIBUTE}=" + CSS.escape(${cssString(probe.id)}) + "]"
    );
    return element ? eligibleFamilies(element) : [];
  })()`);
  const privateMaterialAbsent = Boolean(
    hover
    && !hover.rootSurfaceAccent
    && !hover.beforeSurfaceAccent
    && hover.materialOwners.length === 0,
  );
  const stable = Boolean(idle && hover)
    && idle.root.color === hover.root.color
    && idle.root.textFillColor === hover.root.textFillColor
    && idle.root.effectiveTextColor === hover.root.effectiveTextColor
    && idle.root.background === hover.root.background
    && idle.root.shadow === hover.root.shadow;
  const result = eligibleFamilies.length === 0
    && privateMaterialAbsent
    && (!exclusion.requireStable || stable);
  return {
    class: exclusion.id,
    status: result ? "Pass" : "Fail",
    matchedSelector: probe.matchedSelector,
    eligibleFamilies,
    privateMaterialAbsent,
    stable,
    idle,
    hover,
  };
}

async function probeSelectedPersistence(session, originalThreadId) {
  if (!originalThreadId) return { class: "selected-session", status: "Not observed" };
  const id = `qa-selected-${++qaSequence}`;
  const element = await evaluate(session, `(() => {
    ${visibleSource()}
    const selected = [...document.querySelectorAll("[data-app-action-sidebar-thread-row]")]
      .find((candidate) => candidate.getAttribute("data-app-action-sidebar-thread-id") === ${cssString(originalThreadId)}
        && candidate.getAttribute("aria-current") === "page"
        && visible(candidate, false)
        && centerHit(candidate));
    if (!selected) return null;
    selected.setAttribute(${cssString(QA_ATTRIBUTE)}, ${cssString(id)});
    const rect = selected.getBoundingClientRect();
    return {
      x: Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
      y: Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
    };
  })()`);
  if (!element) return { class: "selected-session", status: "Not observed" };
  await movePointer(session);
  await sleep(40);
  const idle = await readTaggedStyle(session, id);
  await movePointer(session, element.x, element.y);
  await sleep(HOVER_SETTLE_MS);
  const hover = await readTaggedStyle(session, id);
  const stable = Boolean(idle && hover)
    && idle.root.color === hover.root.color
    && idle.root.textFillColor === hover.root.textFillColor
    && idle.root.effectiveTextColor === hover.root.effectiveTextColor
    && idle.root.background === hover.root.background
    && idle.root.borderColor === hover.root.borderColor
    && idle.root.shadow === hover.root.shadow;
  const persistentMaterial = Boolean(
    idle
    && (idle.rootSurfaceAccent || idle.beforeSurfaceAccent || idle.root.shadow !== "none"),
  );
  return {
    class: "selected-session",
    status: stable && persistentMaterial ? "Pass" : "Fail",
    stable,
    persistentMaterial,
    idle,
    hover,
  };
}

async function probeGroupedOwner(session) {
  const id = `qa-grouped-${++qaSequence}`;
  const control = await evaluate(session, `(() => {
    ${visibleSource()}
    const selectors = [
      'aside.app-shell-left-panel .group:has(> button > .text-token-foreground)',
      'aside.app-shell-left-panel [role="listitem"] [role="button"].group'
    ];
    let element = null;
    for (const selector of selectors) {
      element = [...document.querySelectorAll(selector)]
        .find((candidate) => visible(candidate, false)
          && centerHit(candidate) && candidate.querySelector("button"));
      if (element) break;
    }
    if (!element) return null;
    element.setAttribute(${cssString(QA_ATTRIBUTE)}, ${cssString(id)});
    const rect = element.getBoundingClientRect();
    return {
      x: Math.max(2, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
      y: Math.max(2, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
    };
  })()`);
  if (!control) return { class: "grouped-row-owner", status: "Not observed" };
  await movePointer(session, control.x, control.y);
  await sleep(HOVER_SETTLE_MS);
  const hover = await readTaggedStyle(session, id);
  const result = Boolean(
    hover
    && hover.materialOwners.length === 1
    && hover.materialOwners[0] === "self"
    && !hover.actionOverlap.outside
    && !hover.actionOverlap.overlaps,
  );
  return {
    class: "grouped-row-owner",
    status: result ? "Pass" : "Fail",
    owners: hover?.materialOwners ?? [],
    actionOverlap: hover?.actionOverlap ?? null,
    hover,
  };
}

async function layoutState(session) {
  return evaluate(session, `(() => {
    const root = document.documentElement;
    const body = document.body;
    const main = document.querySelector("main.main-surface");
    const overflow = (element) => element
      ? {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
      }
      : null;
    const viewportControls = [...document.querySelectorAll("button, [role=button]")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width >= 12 && rect.height >= 12
          && style.display !== "none" && style.visibility !== "hidden"
          && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
      });
    return {
      width: innerWidth,
      height: innerHeight,
      root: overflow(root),
      body: overflow(body),
      main: overflow(main),
      clippedControls: viewportControls.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > innerWidth + 1;
      }).length,
    };
  })()`);
}

async function captureScreenshot(session, filename) {
  if (!screenshotDir) return null;
  await fs.mkdir(screenshotDir, { recursive: true });
  const result = await session.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const output = path.join(screenshotDir, filename);
  await fs.writeFile(output, Buffer.from(result.data, "base64"));
  return output;
}

async function probeSummaryStructure(session) {
  const summaryFamily = PRIVATE_SKIN_INTERACTION_FAMILIES
    .find(({ id }) => id === "summary-chrome");
  const target = summaryFamily.targets[0];
  return evaluate(session, `(() => {
    ${visibleSource()}
    ${targetIsEligibleSource()}
    const target = ${JSON.stringify(target)};
    const exactRoots = [...document.querySelectorAll(${cssString(target.selector)})];
    const landmarkSelectors = [
      '[class*="summary-panel"]',
      '[data-testid*="summary" i]',
      '[aria-label*="summary" i]',
      '[class*="right-rail"]',
      '[data-testid*="right-rail" i]',
      'main.main-surface > aside'
    ];
    const landmarkSelectorState = landmarkSelectors.map((selector) => {
      const roots = [...document.querySelectorAll(selector)];
      return {
        selector,
        total: roots.length,
        visible: roots.filter((element) => visible(element, false)).length,
      };
    });
    const summaryHeadingPattern = /^(summary|摘要|概览|环境信息|environment information)$/iu;
    const headings = [...document.querySelectorAll(
      'main.main-surface :is(h1,h2,h3,h4,h5,h6,[role="heading"])'
    )].filter((element) =>
      summaryHeadingPattern.test((element.innerText || element.textContent || "").trim()));
    const landmarkTotal = landmarkSelectorState
      .reduce((total, state) => total + state.total, 0);
    const exactRootLayout = exactRoots.map((element, index) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const ancestorChain = [...function* ancestors() {
        for (let current = element.parentElement; current; current = current.parentElement) {
          yield current;
        }
      }()];
      const noninteractiveAncestor = ancestorChain.find((ancestor) => {
        const ancestorStyle = getComputedStyle(ancestor);
        return ancestorStyle.pointerEvents === "none"
          || Number.parseFloat(ancestorStyle.opacity) <= 0.01;
      });
      const effectiveOpacity = [element, ...ancestorChain]
        .reduce((opacity, current) => {
          const value = Number.parseFloat(getComputedStyle(current).opacity);
          return opacity * (Number.isFinite(value) ? value : 1);
        }, 1);
      const clippingAncestor = [...function* ancestors() {
        for (let current = element.parentElement; current; current = current.parentElement) {
          yield current;
        }
      }()].find((ancestor) => {
        const ancestorStyle = getComputedStyle(ancestor);
        return ["hidden", "clip", "auto", "scroll"].includes(ancestorStyle.overflowX)
          || ["hidden", "clip", "auto", "scroll"].includes(ancestorStyle.overflowY);
      });
      const hiddenAncestor = [...function* ancestors() {
        for (let current = element.parentElement; current; current = current.parentElement) {
          yield current;
        }
      }()].find((ancestor) => {
        const ancestorStyle = getComputedStyle(ancestor);
        return ancestorStyle.display === "none"
          || ancestorStyle.visibility === "hidden"
          || Number.parseFloat(ancestorStyle.opacity) <= 0.01;
      });
      const hiddenReasons = [];
      if (rect.width === 0 || rect.height === 0) hiddenReasons.push("zero-rect");
      if (style.display === "none") hiddenReasons.push("display-none");
      if (style.visibility === "hidden") hiddenReasons.push("visibility-hidden");
      if (hiddenAncestor) hiddenReasons.push("hidden-ancestor");
      const clippingRect = clippingAncestor?.getBoundingClientRect() ?? null;
      const clippingIntersection = clippingRect ? {
        width: Math.max(0, Math.min(rect.right, clippingRect.right)
          - Math.max(rect.left, clippingRect.left)),
        height: Math.max(0, Math.min(rect.bottom, clippingRect.bottom)
          - Math.max(rect.top, clippingRect.top)),
      } : null;
      const viewportIntersection = {
        width: Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0)),
        height: Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)),
      };
      const viewportIntersectionRatio = (
        viewportIntersection.width * viewportIntersection.height
      ) / Math.max(1, rect.width * rect.height);
      return {
        index,
        rect: {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        fullyOutsideViewport: rect.right <= 0
          || rect.left >= innerWidth
          || rect.bottom <= 0
          || rect.top >= innerHeight,
        viewportIntersection,
        viewportIntersectionRatio,
        centerHit: centerHit(element),
        display: style.display,
        visibility: style.visibility,
        pointerEvents: style.pointerEvents,
        opacity: style.opacity,
        effectiveOpacity,
        noninteractiveAncestor: noninteractiveAncestor ? {
          tagName: noninteractiveAncestor.tagName,
          className: typeof noninteractiveAncestor.className === "string"
            ? noninteractiveAncestor.className
            : "",
          pointerEvents: getComputedStyle(noninteractiveAncestor).pointerEvents,
          opacity: getComputedStyle(noninteractiveAncestor).opacity,
        } : null,
        hiddenAncestor: hiddenAncestor ? {
          tagName: hiddenAncestor.tagName,
          className: typeof hiddenAncestor.className === "string"
            ? hiddenAncestor.className
            : "",
          display: getComputedStyle(hiddenAncestor).display,
          visibility: getComputedStyle(hiddenAncestor).visibility,
          opacity: getComputedStyle(hiddenAncestor).opacity,
        } : null,
        nearestClippingAncestor: clippingAncestor ? {
          tagName: clippingAncestor.tagName,
          className: typeof clippingAncestor.className === "string"
            ? clippingAncestor.className
            : "",
          overflowX: getComputedStyle(clippingAncestor).overflowX,
          overflowY: getComputedStyle(clippingAncestor).overflowY,
          rect: {
            left: clippingRect.left,
            right: clippingRect.right,
            top: clippingRect.top,
            bottom: clippingRect.bottom,
            width: clippingRect.width,
            height: clippingRect.height,
          },
          intersection: clippingIntersection,
          fullyClipped: clippingIntersection.width === 0
            || clippingIntersection.height === 0,
        } : null,
        hiddenReasons,
        layoutHiddenConfirmed: hiddenReasons.length > 0,
      };
    });
    const overflowState = (element) => element ? {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
    } : null;
    return {
      exactSelector: ${cssString(target.selector)},
      totalDomRoots: exactRoots.length,
      eligibleRoots: exactRoots.filter((element) => eligible(element, target)).length,
      visibleRoots: exactRoots.filter((element) => visible(element, false)).length,
      hittableRoots: exactRoots
        .filter((element) => visible(element, false) && centerHit(element)).length,
      exactRootLayout,
      landmarkSelectorState,
      panelLandmarkState: {
        total: landmarkTotal,
        visible: landmarkSelectorState.reduce(
          (total, state) => total + state.visible,
          0,
        ),
        headingTotal: headings.length,
        headingVisible: headings.filter((element) => visible(element, false)).length,
      },
      documentLayout: {
        root: overflowState(document.documentElement),
        body: overflowState(document.body),
        main: overflowState(document.querySelector("main.main-surface")),
      },
      allExactRootsLayoutHidden: exactRoots.length > 0
        && exactRootLayout.every((root) => root.layoutHiddenConfirmed),
      allExactRootsOffscreenOrClipped: exactRoots.length > 0
        && exactRootLayout.every((root) =>
          root.fullyOutsideViewport || root.nearestClippingAncestor?.fullyClipped),
      allExactRootsResponsiveNoninteractive: exactRoots.length > 0
        && exactRootLayout.every((root) =>
          root.pointerEvents === "none"
          || root.effectiveOpacity <= 0.01
          || root.layoutHiddenConfirmed
          || root.fullyOutsideViewport
          || root.nearestClippingAncestor?.fullyClipped),
    };
  })()`);
}

async function auditCell(session, view, viewport, originalThreadId, runContext = {}) {
  progress("cell:start", `${view}/${viewport.id}`);
  let expectedFamilies = [...APPLICABLE_FAMILIES[view]];
  const families = [];
  const failures = [];
  await closeMenu(session);
  const summaryStructure = view === "session"
    ? await probeSummaryStructure(session)
    : null;
  const settledLayout = await layoutState(session);
  for (const family of PRIVATE_SKIN_INTERACTION_FAMILIES) {
    if (!expectedFamilies.includes(family.id) || family.id === "menu-chrome") continue;
    const result = await auditFamily(session, family);
    families.push(result);
  }
  await openSafeMenu(session);
  const menuFamily = PRIVATE_SKIN_INTERACTION_FAMILIES.find(({ id }) => id === "menu-chrome");
  families.push(await auditFamily(session, menuFamily));
  const summaryRows = families.find(({ family }) => family === "summary-chrome")?.rows ?? [];
  const summaryFamilyResult = families.find(({ family }) => family === "summary-chrome");
  const notApplicableFamilies = [];
  const noStructuralHorizontalOverflow = summaryStructure
    && [summaryStructure.documentLayout?.root,
      summaryStructure.documentLayout?.body,
      summaryStructure.documentLayout?.main]
      .every((state) => state && !state.horizontalOverflow);
  const responsiveHiddenSummary = view === "session"
    && viewport.id === "narrow"
    && runContext.desktopSummaryCounterpart?.passed === true
    && (summaryStructure?.totalDomRoots ?? 0) > 0
    && (summaryStructure?.eligibleRoots ?? 0) > 0
    && summaryStructure?.visibleRoots === 0
    && summaryStructure?.hittableRoots === 0
    && summaryStructure?.allExactRootsResponsiveNoninteractive === true
    && noStructuralHorizontalOverflow
    && !settledLayout.root.horizontalOverflow
    && !settledLayout.body.horizontalOverflow
    && !settledLayout.main?.horizontalOverflow
    && settledLayout.clippedControls === 0;
  if (responsiveHiddenSummary) {
    expectedFamilies = expectedFamilies.filter((family) => family !== "summary-chrome");
    if (summaryFamilyResult) summaryFamilyResult.applicability = "N/A";
    notApplicableFamilies.push({
      family: "summary-chrome",
      result: "N/A",
      reason: "responsive-noninteractive-confirmed-by-desktop-counterpart",
      desktopCounterpart: runContext.desktopSummaryCounterpart,
      structuralProof: summaryStructure,
    });
  }
  const exclusions = [];
  for (const exclusion of EXCLUSION_CLASSES) {
    exclusions.push(await probeExclusion(session, exclusion));
  }
  await closeMenu(session);
  const persistence = view === "session"
    ? await probeSelectedPersistence(session, originalThreadId)
    : { class: "selected-session", status: "Not observed" };
  const grouped = await probeGroupedOwner(session);
  const summaryReplacement = (() => {
    if (view !== "session") return { class: "summary-native-before", status: "Not observed" };
    if (summaryRows.length === 0 && responsiveHiddenSummary) {
      return {
        class: "summary-native-before",
        status: "N/A",
        reason: "responsive-noninteractive-confirmed-by-desktop-counterpart",
      };
    }
    if (summaryRows.length === 0) return { class: "summary-native-before", status: "Fail" };
    const result = summaryRows.every((row) => {
      const idleAlpha = (row.idle?.before?.backgroundPixels?.alpha ?? 1) <= 0.01;
      return idleAlpha && row.hover?.beforeSurfaceAccent;
    });
    return {
      class: "summary-native-before",
      status: result ? "Pass" : "Fail",
      sampledControls: summaryRows.length,
      idleTransparent: result,
      hoverAccentOwner: summaryRows.every((row) => row.hover?.beforeSurfaceAccent),
    };
  })();
  const homeScope = view === "home"
    ? await evaluate(session, `(() => {
      const selector = '.dream-home section[class~="group/home-suggestions"] button';
      return {
        suggestionCards: document.querySelectorAll(selector).length,
        utilityPillsMatched: [...document.querySelectorAll(
          '[data-composer-utility-bar-scroll-area] button'
        )].filter((element) => element.matches(selector)).length,
      };
    })()`)
    : null;
  const layout = await layoutState(session);
  const screenshot = await captureScreenshot(
    session,
    `private-skin-app-chrome-${view}-${viewport.id}-${layout.width}x${layout.height}.png`,
  );
  for (const expectedFamily of expectedFamilies) {
    const result = families.find(({ family }) => family === expectedFamily);
    if (!result) {
      failures.push(`${expectedFamily}: expected applicable family was not audited`);
    } else if (!result.coverageMet) {
      failures.push(
        `${expectedFamily}: ${result.sampledControls}/${result.minimumStableSamples}`
        + ` required stable samples; discarded=${result.discardedSamples.length}`,
      );
    }
  }
  for (const family of families) {
    for (const row of family.rows) {
      if (!row.result) failures.push(`${family.family}: sampled control ${row.targetIndex}/${row.controlIndex} failed material`);
    }
  }
  for (const exclusion of exclusions) {
    if (exclusion.status === "Fail") failures.push(`${exclusion.class}: exclusion probe failed`);
  }
  for (const direct of [persistence, grouped, summaryReplacement]) {
    if (direct.status === "Fail") failures.push(`${direct.class}: direct probe failed`);
  }
  if (homeScope && homeScope.suggestionCards !== 4) {
    failures.push(`home scope: expected 4 suggestion cards, observed ${homeScope.suggestionCards}`);
  }
  if (homeScope && homeScope.utilityPillsMatched !== 0) {
    failures.push(`home scope: ${homeScope.utilityPillsMatched} utility pills matched`);
  }
  if (layout.root.horizontalOverflow || layout.body.horizontalOverflow || layout.main?.horizontalOverflow) {
    failures.push("layout: horizontal overflow");
  }
  if (layout.clippedControls > 0) failures.push(`layout: ${layout.clippedControls} controls cross viewport edges`);
  if (view === "session" && viewport.id === "desktop") {
    runContext.desktopSummaryCounterpart = {
      passed: Boolean(
        summaryFamilyResult?.coverageMet
        && summaryRows.length > 0
        && summaryRows.every((row) => row.result)
        && summaryReplacement.status === "Pass"
        && (summaryStructure?.visibleRoots ?? 0) > 0
        && (summaryStructure?.hittableRoots ?? 0) > 0
      ),
      exactSelector: summaryStructure?.exactSelector ?? null,
      totalDomRoots: summaryStructure?.totalDomRoots ?? 0,
      eligibleRoots: summaryStructure?.eligibleRoots ?? 0,
      visibleRoots: summaryStructure?.visibleRoots ?? 0,
      hittableRoots: summaryStructure?.hittableRoots ?? 0,
      stablePassingSamples: summaryRows.filter((row) => row.result).length,
    };
  }
  await movePointer(session);
  const cell = {
    view,
    viewport: { id: viewport.id, width: layout.width, height: layout.height },
    expectedFamilies,
    notApplicableFamilies,
    structuralApplicability: { summary: summaryStructure, settledLayout },
    families,
    exclusions,
    directProbes: [persistence, grouped, summaryReplacement],
    homeScope,
    layout,
    screenshot,
    result: failures.length === 0 ? "Pass" : "Fail",
    failures,
  };
  progress(
    "cell:end",
    `${view}/${viewport.id} ${cell.result} samples=${families
      .map((family) => `${family.family}:${family.sampledControls}`).join(",")}`,
  );
  return cell;
}

const bundle = JSON.parse(buildPrivateSkinPackage({
  id: PRIVATE_ID,
  exportedAt: EXPORTED_AT,
  image: PNG,
  settings: SETTINGS,
  profile: PROFILE,
}));
const targetTheme = resolveThemeTarget(bundle, adapter.id);
const correctedAccent = targetTheme.options.baseTheme.accent;
const surface = targetTheme.options.baseTheme.surface;
const accentMetrics = {
  hue: hsl(correctedAccent).hue,
  saturation: hsl(correctedAccent).saturation,
  contrastAgainstSurface: contrastRatio(correctedAccent, surface),
};
const report = {
  schema: "codextheme-private-skin-app-chrome-qa-v1",
  generatedAt: new Date().toISOString(),
  source: "repository-local buildPrivateSkinPackage + @codextheme/runtime",
  mode: homeOnly ? "home-only" : (sessionOnly ? "session-only" : "full"),
  port: PORT,
  fixture: {
    id: PRIVATE_ID,
    exportedAt: EXPORTED_AT,
    themeId: bundle.theme.id,
    profile: PROFILE,
    settings: SETTINGS,
    correctedAccent,
    surface,
    accentMetrics,
  },
  applied: null,
  renderer: null,
  originalState: null,
  browserPanel: {
    originalOpen: null,
    changedForAudit: false,
    closedDuringSessionMatrix: null,
  },
  draft: {
    authorizedTemporaryClear: temporarilyClearHomeDraft,
    backupFile: null,
    backupRemoved: null,
    kind: null,
    stringLength: null,
    byteLength: null,
    sha256Before: null,
    sha256After: null,
    preflightClear: null,
    preflightSuggestions: null,
    preflightRestoreHashEqual: null,
    selectionCaptured: null,
    selectionRestored: null,
  },
  cells: [],
  restoration: {
    route: "Pending",
    viewport: "Pending",
    menu: "Pending",
    browserPanel: "Pending",
    bottomPanel: "Pending",
    draft: temporarilyClearHomeDraft ? "Pending" : "Pass",
    draftIndependent: temporarilyClearHomeDraft ? "Pending" : "Pass",
    projectContext: sessionOnly ? "Pass" : "Pending",
    temporaryAttributes: "Pending",
    pointer: "Pending",
  },
  fatalError: null,
  result: "Fail",
};

let session;
let original;
let homeDraftBackup;
let homeDraftBackupFile;
let originalHomeProjectContext;
let homeDraftRestoredInPlace = false;
try {
  progress("apply:start", `port=${PORT}`);
  const applied = await applyTheme({ adapter, targetTheme, port: PORT, timeoutMs: 12_000 });
  report.applied = applied.map(({ targetId, title, result }) => ({
    targetId,
    title,
    pass: result?.pass === true,
  }));
  if (!applied.length || !applied.every((entry) => entry.result?.pass === true)) {
    throw new Error("The deterministic private package did not pass runtime verification.");
  }
  progress("apply:end", `targets=${applied.length}`);
  const [target] = (await listCdpTargets(PORT, 2_500)).filter((entry) => adapter.matchTarget(entry));
  if (!target) throw new Error("No Codex renderer target is available.");
  report.renderer = { targetId: target.id, title: target.title, url: target.url };
  session = await new CdpSession(target, 12_000).open();
  original = await readRootState(session);
  report.originalState = original;
  report.browserPanel.originalOpen = original.browserPanelVisible;
  if (original.view !== "session" || !original.selectedThreadId) {
    throw new Error("The audit requires the current populated Session so it can restore the selected task deterministically.");
  }
  const rootChecks = {
    active: original.active,
    namespace: original.namespace.includes("codextheme-codex-skin"),
    accent: original.accent.toLowerCase() === correctedAccent.toLowerCase(),
    saturation: accentMetrics.saturation >= 41.5,
    contrast: accentMetrics.contrastAgainstSurface >= 4.5,
  };
  report.rootChecks = rootChecks;
  if (!Object.values(rootChecks).every(Boolean)) {
    throw new Error(`Root/accent validation failed: ${JSON.stringify(rootChecks)}`);
  }
  const viewports = [
    { id: "desktop", width: original.width, height: original.height },
    { id: "narrow", ...NARROW_VIEWPORT },
  ];
  const sessionRunContext = {};
  if (!homeOnly) {
    if (original.browserPanelVisible) {
      progress("browser-panel", "closing for summary audit");
      report.browserPanel.changedForAudit = await setBrowserPanel(session, false);
    }
    report.browserPanel.closedDuringSessionMatrix = !(await browserPanelVisible(session));
    for (const viewport of viewports) {
      await setViewport(session, viewport, original);
      report.cells.push(await auditCell(
        session,
        "session",
        viewport,
        original.selectedThreadId,
        sessionRunContext,
      ));
    }
  }
  if (!sessionOnly) {
    await setViewport(session, viewports[0], original);
    await navigateHome(session);
    originalHomeProjectContext = await readHomeProjectContext(session);
    if (!originalHomeProjectContext) throw new Error("Could not record the original Home project context.");
  }
  if (!sessionOnly && temporarilyClearHomeDraft) {
    homeDraftBackup = await readHomeDraft(session);
    if (!homeDraftBackup) throw new Error("Could not read the authorized Home draft editor.");
    const beforeHash = sha256(homeDraftBackup.value);
    homeDraftBackupFile = path.join(
      "/private/tmp",
      `codextheme-home-draft-backup-${process.pid}.json`,
    );
    await fs.writeFile(
      homeDraftBackupFile,
      `${JSON.stringify(homeDraftBackup)}\n`,
      { mode: 0o600 },
    );
    await fs.chmod(homeDraftBackupFile, 0o600);
    report.draft = {
      ...report.draft,
      backupFile: homeDraftBackupFile,
      backupRemoved: false,
      kind: homeDraftBackup.kind,
      stringLength: homeDraftBackup.value.length,
      byteLength: Buffer.byteLength(homeDraftBackup.value, "utf8"),
      sha256Before: beforeHash,
      selectionCaptured: Boolean(homeDraftBackup.selection?.valid),
    };
    progress("draft:backup", `sha256=${beforeHash} bytes=${report.draft.byteLength}`);
    await setHomeDraft(session, homeDraftBackup, "");
    await waitFor(
      session,
      `(() => {
        const textarea = document.querySelector(".composer-surface-chrome textarea");
        const editable = document.querySelector(
          '.composer-surface-chrome [contenteditable="true"]'
        );
        return (textarea?.value ?? editable?.innerText ?? "").trim() === "";
      })()`,
      "the authorized Home draft clear",
    );
    await waitFor(
      session,
      `(() => {
        const selector = '.dream-home section[class~="group/home-suggestions"] button';
        return document.querySelectorAll(selector).length === 4
          && [...document.querySelectorAll(
            '[data-composer-utility-bar-scroll-area] button'
          )].filter((element) => element.matches(selector)).length === 0;
      })()`,
      "the four Home suggestion cards",
    );
    report.draft.preflightClear = true;
    report.draft.preflightSuggestions = true;
    await setHomeDraft(session, homeDraftBackup, homeDraftBackup.value);
    await waitFor(
      session,
      `(() => {
        const textarea = document.querySelector(".composer-surface-chrome textarea");
        const editable = document.querySelector(
          '.composer-surface-chrome [contenteditable="true"]'
        );
        return (textarea?.value ?? editable?.innerText ?? null)
          === ${cssString(homeDraftBackup.value)};
      })()`,
      "the reversible preflight Home draft restoration",
    );
    const preflightRestored = await readHomeDraft(session);
    report.draft.preflightRestoreHashEqual = Boolean(
      preflightRestored
      && sha256(preflightRestored.value) === beforeHash
      && preflightRestored.value === homeDraftBackup.value,
    );
    if (!report.draft.preflightRestoreHashEqual) {
      throw new Error("The reversible Home draft preflight did not restore byte-for-byte.");
    }
    progress("draft:preflight", "clear=true suggestions=4 restoreHashEqual=true");
    await setHomeDraft(session, homeDraftBackup, "");
    await waitFor(
      session,
      `(() => {
        const selector = '.dream-home section[class~="group/home-suggestions"] button';
        return document.querySelectorAll(selector).length === 4
          && [...document.querySelectorAll(
            '[data-composer-utility-bar-scroll-area] button'
          )].filter((element) => element.matches(selector)).length === 0;
      })()`,
      "the four Home suggestion cards after the preflight",
    );
    progress("draft:clear", "suggestionCards=4");
  }
  if (!sessionOnly) {
    for (const viewport of viewports) {
      await setViewport(session, viewport, original);
      report.cells.push(await auditCell(session, "home", viewport, original.selectedThreadId));
    }
  }
} catch (error) {
  report.fatalError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
} finally {
  if (session) {
    try {
      await closeMenu(session);
      report.restoration.menu = "Pass";
    } catch (error) {
      report.restoration.menu = `Fail: ${error.message}`;
    }
    try {
      await session.send("Emulation.clearDeviceMetricsOverride");
      if (original) {
        await waitFor(
          session,
          `innerWidth === ${original.width} && innerHeight === ${original.height}`,
          "exact original viewport restoration",
        );
      }
      report.restoration.viewport = "Pass";
    } catch (error) {
      report.restoration.viewport = `Fail: ${error.message}`;
    }
    try {
      if (homeDraftBackup) {
        const current = await readRootState(session);
        if (current.view !== "home") await navigateHome(session);
        await setHomeDraft(session, homeDraftBackup, homeDraftBackup.value);
        await waitFor(
          session,
          `(() => {
            const textarea = document.querySelector(".composer-surface-chrome textarea");
            const editable = document.querySelector(
              '.composer-surface-chrome [contenteditable="true"]'
            );
            return (textarea?.value ?? editable?.innerText ?? null)
              === ${cssString(homeDraftBackup.value)};
          })()`,
          "exact Home draft restoration",
        );
        const restoredEditorState = await restoreHomeEditorState(session, homeDraftBackup);
        const restoredDraft = await readHomeDraft(session);
        const afterHash = restoredDraft ? sha256(restoredDraft.value) : null;
        report.draft.selectionRestored = selectionSnapshotsEqual(
          homeDraftBackup.selection,
          restoredDraft?.selection,
        );
        report.draft.sha256After = afterHash;
        if (!restoredDraft
          || restoredDraft.value !== homeDraftBackup.value
          || afterHash !== report.draft.sha256Before
          || !restoredEditorState?.restored
          || !report.draft.selectionRestored) {
          throw new Error("The Home draft text or editor selection did not restore exactly.");
        }
        homeDraftRestoredInPlace = true;
      }
      if (!homeDraftBackup) report.restoration.draft = "Pass";
    } catch (error) {
      report.restoration.draft = `Fail: ${error.message}`;
    }
    try {
      if (sessionOnly) {
        report.restoration.projectContext = "Pass";
      } else if (originalHomeProjectContext) {
        const restoredProjectContext = await readHomeProjectContext(session);
        report.restoration.projectContext = restoredProjectContext === originalHomeProjectContext
          ? "Pass"
          : "Fail: Home project context changed";
      } else {
        report.restoration.projectContext = "Fail: original Home project context unavailable";
      }
    } catch (error) {
      report.restoration.projectContext = `Fail: ${error.message}`;
    }
    try {
      const state = await readRootState(session);
      if (original?.selectedThreadId && state.selectedThreadId !== original.selectedThreadId) {
        await restoreThread(session, original.selectedThreadId);
      }
      if (homeDraftBackup) {
        if (!homeDraftRestoredInPlace) {
          throw new Error("The in-place Home draft restoration did not complete.");
        }
        await navigateHome(session);
        const independentlyRestoredDraft = await readHomeDraft(session);
        const independentHash = independentlyRestoredDraft
          ? sha256(independentlyRestoredDraft.value)
          : null;
        if (!independentlyRestoredDraft
          || independentlyRestoredDraft.value !== homeDraftBackup.value
          || independentHash !== report.draft.sha256Before) {
          throw new Error("The independent persisted Home draft hash did not match.");
        }
        await restoreThread(session, original.selectedThreadId);
        await fs.unlink(homeDraftBackupFile);
        report.draft.backupRemoved = true;
        report.restoration.draft = "Pass";
        report.restoration.draftIndependent = "Pass";
      }
      const restored = await readRootState(session);
      report.restoration.route = original?.selectedThreadId
        && restored.view === "session"
        && restored.selectedThreadId === original.selectedThreadId
        ? "Pass"
        : `Fail: restored ${restored.view} without the original selected task`;
    } catch (error) {
      report.restoration.route = `Fail: ${error.message}`;
      if (homeDraftBackup) {
        if (report.restoration.draft !== "Pass") {
          report.restoration.draft = `Fail: ${error.message}`;
        }
        report.restoration.draftIndependent = `Fail: ${error.message}`;
        try {
          const state = await readRootState(session);
          if (original?.selectedThreadId && state.selectedThreadId !== original.selectedThreadId) {
            await restoreThread(session, original.selectedThreadId);
          }
        } catch {
          // Retain the recovery failure and the mode-0600 backup.
        }
      }
    }
    try {
      if (original) {
        await setBrowserPanel(session, original.browserPanelVisible);
        const restoredPanel = await browserPanelVisible(session);
        report.restoration.browserPanel = restoredPanel === original.browserPanelVisible
          ? "Pass"
          : `Fail: expected ${original.browserPanelVisible ? "open" : "closed"} Browser panel`;
      } else {
        report.restoration.browserPanel = "Fail: original Browser panel state unavailable";
      }
    } catch (error) {
      report.restoration.browserPanel = `Fail: ${error.message}`;
    }
    try {
      const restored = await readRootState(session);
      const delta = Math.abs((restored.composerBottom ?? Number.NaN)
        - (original?.composerBottom ?? Number.NaN));
      report.restoration.bottomPanel = Number.isFinite(delta) && delta <= 1
        ? "Pass"
        : `Fail: composer bottom changed by ${Number.isFinite(delta) ? delta : "unknown"}px`;
    } catch (error) {
      report.restoration.bottomPanel = `Fail: ${error.message}`;
    }
    try {
      await evaluate(session, `document.querySelectorAll("[${QA_ATTRIBUTE}]")
        .forEach((element) => element.removeAttribute(${cssString(QA_ATTRIBUTE)}))`);
      const remaining = await evaluate(
        session,
        `document.querySelectorAll("[${QA_ATTRIBUTE}]").length`,
      );
      report.restoration.temporaryAttributes = remaining === 0 ? "Pass" : `Fail: ${remaining} remain`;
    } catch (error) {
      report.restoration.temporaryAttributes = `Fail: ${error.message}`;
    }
    try {
      await movePointer(session);
      report.restoration.pointer = "Pass";
    } catch (error) {
      report.restoration.pointer = `Fail: ${error.message}`;
    }
    progress("restoration", JSON.stringify(report.restoration));
    session.close();
  }
}

const restorationPass = Object.values(report.restoration).every((value) => value === "Pass");
const expectedCellCount = homeOnly || sessionOnly ? 2 : 4;
const cellsPass = report.cells.length === expectedCellCount
  && report.cells.every((cell) => cell.result === "Pass");
report.result = !report.fatalError
  && report.applied?.every(({ pass }) => pass)
  && report.rootChecks
  && Object.values(report.rootChecks).every(Boolean)
  && cellsPass
  && restorationPass
  ? "Pass"
  : "Fail";

if (reportFile) {
  await fs.mkdir(path.dirname(reportFile), { recursive: true });
  await fs.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({
  result: report.result,
  reportFile,
  renderer: report.renderer,
  accent: report.fixture.correctedAccent,
  accentMetrics: report.fixture.accentMetrics,
  draft: report.draft,
  cells: report.cells.map((cell) => ({
    view: cell.view,
    viewport: cell.viewport,
    result: cell.result,
    familySamples: Object.fromEntries(
      cell.families.map((family) => [family.family, family.sampledControls]),
    ),
    exclusionStatus: Object.fromEntries(
      cell.exclusions.map((probe) => [probe.class, probe.status]),
    ),
    directProbeStatus: Object.fromEntries(
      cell.directProbes.map((probe) => [probe.class, probe.status]),
    ),
    failures: cell.failures,
    screenshot: cell.screenshot,
  })),
  restoration: report.restoration,
  fatalError: report.fatalError,
}, null, 2));
if (report.result !== "Pass") process.exitCode = 1;
