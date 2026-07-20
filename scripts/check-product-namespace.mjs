import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrivateSkinPackage } from "../apps/site/app/lib/private-skin-package.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PRODUCT_ROOTS = [
  "themes/shared",
  "packages/cli/themes",
  "packages/cli/src",
  "apps/site/app",
  "packages/runtime/src",
  "packages/runtime/types",
];
const ATTRIBUTION_FILES = new Set(["LICENSE", "NOTICE", "UPSTREAM.md", "README.md", "README_zh.md"]);
const COMPATIBILITY_FILES = new Set([
  "packages/runtime/src/host/historical-codex-settings.mjs",
  "packages/runtime/src/runtime/legacy-namespace.mjs",
  "packages/runtime/src/theme/historical-package.mjs",
]);
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".mjs", ".ts", ".tsx", ".codextheme-theme"]);
const PRODUCT_LEAK = /codedrobe/iu;

async function filesUnder(filename) {
  let entries;
  try {
    entries = await fs.readdir(filename, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const nested = await Promise.all(entries.map((entry) => {
    const child = path.join(filename, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  }));
  return nested.flat();
}

function shouldScan(root, filename) {
  const relative = path.relative(root, filename).split(path.sep).join("/");
  if (ATTRIBUTION_FILES.has(path.basename(filename))) return false;
  if (COMPATIBILITY_FILES.has(relative)) return false;
  return TEXT_EXTENSIONS.has(path.extname(filename));
}

function assertSource(filename, source) {
  if (PRODUCT_LEAK.test(source)) {
    throw new Error(`CodeDrobe product namespace leak in ${filename}`);
  }
}

export async function assertCodexThemeProductNamespace(root = repoRoot, {
  productRoots = DEFAULT_PRODUCT_ROOTS,
  additionalSources = [],
} = {}) {
  const filenames = (await Promise.all(productRoots.map((entry) => filesUnder(path.join(root, entry))))).flat();
  for (const filename of filenames) {
    if (!shouldScan(root, filename)) continue;
    assertSource(path.relative(root, filename).split(path.sep).join("/"), await fs.readFile(filename, "utf8"));
  }

  const builtHtml = await filesUnder(path.join(root, "apps", "site", ".next", "server", "app"));
  for (const filename of builtHtml.filter((entry) => path.extname(entry) === ".html")) {
    assertSource(path.relative(root, filename).split(path.sep).join("/"), await fs.readFile(filename, "utf8"));
  }

  for (const item of additionalSources) assertSource(item.filename, item.source);
  return { scannedFiles: filenames.length + builtHtml.filter((entry) => path.extname(entry) === ".html").length + additionalSources.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const privatePackage = buildPrivateSkinPackage({
    id: "namespace.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exportedAt: "2026-07-20T00:00:00.000Z",
    image: Buffer.from("namespace-check"),
    settings: {},
  });
  const result = await assertCodexThemeProductNamespace(repoRoot, {
    additionalSources: [{ filename: "generated/private-skin.codextheme-theme", source: privatePackage }],
  });
  console.log(`Product namespace check passed (${result.scannedFiles} files).`);
}
