import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const themeRoot = path.resolve(import.meta.dirname, "..");
const moduleUrl = new URL("../scripts/cathedral-icon-contract.mjs", import.meta.url);
const lintPolicyUrl = new URL("../scripts/theme-lint-policy.mjs", import.meta.url);

test("Cathedral icon anchors are closed, structural, and classify drift safely", async () => {
  let contract;
  await assert.doesNotReject(async () => {
    contract = await import(moduleUrl);
  });

  const { CATHEDRAL_ICON_ANCHORS, classifyCathedralIconCounts } = contract;
  assert.equal(CATHEDRAL_ICON_ANCHORS.length, 12);
  assert.equal(new Set(CATHEDRAL_ICON_ANCHORS.map(({ id }) => id)).size, 12);
  const byId = Object.fromEntries(CATHEDRAL_ICON_ANCHORS.map((anchor) => [anchor.id, anchor]));
  assert.match(byId["icon-new-chat"].selector, /> div\.relative\.z-10 /);
  assert.match(byId["icon-pull-requests"].selector, /button:nth-child\(1\) svg$/);
  assert.match(byId["icon-sites"].selector, /button:nth-child\(2\) svg$/);
  assert.match(byId["icon-scheduled"].selector, /button:nth-child\(3\) svg$/);
  assert.match(byId["icon-plugins"].selector, /button:nth-child\(4\) svg$/);
  assert.doesNotMatch(byId["icon-pull-requests"].selector, /nth-child\(2\)/);
  for (const id of ["icon-explore", "icon-build", "icon-review", "icon-fix"]) {
    assert.deepEqual([byId[id].min, byId[id].max], [0, 1]);
  }
  const addAnchor = CATHEDRAL_ICON_ANCHORS.find(({ id }) => id === "icon-add");
  assert.match(addAnchor.selector, /button\.aspect-square > svg$/);
  assert.doesNotMatch(addAnchor.selector, /:first-child/);

  for (const anchor of CATHEDRAL_ICON_ANCHORS) {
    assert.match(anchor.id, /^icon-[a-z-]+$/);
    assert.ok(anchor.contexts.length >= 1);
    assert.doesNotMatch(anchor.selector, /New chat|Pull requests|Scheduled|Plugins|新建|拉取|已安排|插件/);
    assert.doesNotMatch(anchor.selector, /#radix-|https?:|url\(/i);
  }

  const exact = Object.fromEntries(CATHEDRAL_ICON_ANCHORS.map((anchor) => [
    anchor.id,
    anchor.expected ?? anchor.min,
  ]));
  assert.ok(classifyCathedralIconCounts("home", exact).every(({ status }) => status === "pass"));

  const under = { ...exact, "icon-new-chat": 0 };
  assert.equal(
    classifyCathedralIconCounts("session", under).find(({ id }) => id === "icon-new-chat").status,
    "warning",
  );

  const over = { ...exact, "icon-project-folder": 21 };
  assert.equal(
    classifyCathedralIconCounts("home", over).find(({ id }) => id === "icon-project-folder").status,
    "error",
  );
});

test("Cathedral CSS maps every anchor to its own image and preserves native boxes", async () => {
  const { CATHEDRAL_ICON_ANCHORS } = await import(moduleUrl);
  const css = await readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const root = 'html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]';

  for (const anchor of CATHEDRAL_ICON_ANCHORS) {
    const selector = `${root} ${anchor.selector}`;
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `missing CSS rule for ${anchor.id}`);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    assert.match(block, new RegExp(`background-image:\\s*var\\(--codedrobe-image-${anchor.id}\\)`));
    assert.match(block, /background-position:\s*center/);
    assert.match(block, /background-repeat:\s*no-repeat/);
    assert.match(block, /background-size:\s*contain/);
    assert.doesNotMatch(block, /(?:width|height|padding|margin|display|pointer-events)\s*:/);

    const childStart = css.indexOf(`${selector} > * {`);
    assert.notEqual(childStart, -1, `missing native-child fallback rule for ${anchor.id}`);
    const childBlock = css.slice(childStart, css.indexOf("}", childStart) + 1);
    assert.match(childBlock, /opacity:\s*0\s*!important/);
    assert.doesNotMatch(childBlock, /display:\s*none/);
  }
});

test("live count expression reads only bounded selector counts", async () => {
  const { buildCathedralIconCountExpression } = await import(moduleUrl);
  assert.equal(typeof buildCathedralIconCountExpression, "function");

  const expression = buildCathedralIconCountExpression("session");
  assert.match(expression, /document\.querySelectorAll/);
  assert.doesNotMatch(expression, /innerText|textContent|outerHTML|innerHTML|value|location|href/);
  assert.doesNotMatch(expression, /icon-explore|icon-build|icon-review|icon-fix/);
});

test("renderer count merge ignores empty overlays without summing windows", async () => {
  const { mergeCathedralIconCounts } = await import(moduleUrl);
  assert.equal(typeof mergeCathedralIconCounts, "function");
  assert.deepEqual(
    mergeCathedralIconCounts([
      { "icon-new-chat": 0, "icon-project-folder": 0 },
      { "icon-new-chat": 1, "icon-project-folder": 2 },
      { "icon-new-chat": 1, "icon-project-folder": 1 },
    ]),
    { "icon-new-chat": 1, "icon-project-folder": 2 },
  );
});

test("lint policy exempts only registered Cathedral selector warnings", async () => {
  let policy;
  await assert.doesNotReject(async () => {
    policy = await import(lintPolicyUrl);
  });

  const { CATHEDRAL_ICON_ANCHORS } = await import(moduleUrl);
  const selector = CATHEDRAL_ICON_ANCHORS[0].selector;
  const root = 'html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]';
  const approved = {
    code: "positional-selector",
    appId: "codex",
    location: "targets.codex.css",
    selector: `${root} ${selector}`,
  };

  const cathedral = { theme: { id: "cathedral-nocturne", version: "1.1.0" } };
  const silver = { theme: { id: "silver-reliquary", version: "1.0.0" } };

  assert.deepEqual(policy.unapprovedCatalogThemeLintWarnings(cathedral, [approved]), []);
  assert.deepEqual(policy.unapprovedCatalogThemeLintWarnings(silver, [approved]), []);
  assert.equal(policy.unapprovedCatalogThemeLintWarnings(silver, [
    { ...approved, location: "targets.codex.verification.recommended.icon-new-chat", selector },
  ]).length, 1);
  assert.equal(policy.unapprovedCatalogThemeLintWarnings(cathedral, [
    { ...approved, code: "external-resource" },
  ]).length, 1);
  assert.equal(policy.unapprovedCatalogThemeLintWarnings(cathedral, [
    { ...approved, selector: `${root} body svg` },
  ]).length, 1);
  assert.equal(policy.unapprovedCatalogThemeLintWarnings({
    theme: { id: "private-aaaaaaaaaaaaaaaaaaaa", version: "1.1.0" },
  }, [approved]).length, 1);
});
