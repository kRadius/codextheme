import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packages = [
  { name: "@codextheme/runtime", version: "0.1.0", directory: "packages/runtime" },
  { name: "@codextheme/cli", version: "0.2.2", directory: "packages/cli" },
];
const requiredFiles = new Set(["LICENSE", "NOTICE", "README.md", "package.json"]);
const forbiddenScripts = new Set(["preinstall", "install", "postinstall"]);
const textExtensions = new Set([".css", ".js", ".json", ".md", ".mjs", ".ts"]);

function fail(message) {
  throw new Error(`Package check failed: ${message}`);
}

function isTextFile(filename) {
  return requiredFiles.has(filename) || textExtensions.has(path.extname(filename));
}

async function packList(name) {
  const { stdout } = await execFileAsync("npm", ["pack", "--json", "--dry-run", "-w", name], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed) || parsed.length !== 1) fail(`${name} returned an invalid npm pack manifest.`);
  return parsed[0];
}

function checkManifest(expected, manifest) {
  if (manifest.name !== expected.name || manifest.version !== expected.version) {
    fail(`${expected.directory}/package.json must be ${expected.name}@${expected.version}.`);
  }
  for (const script of Object.keys(manifest.scripts ?? {})) {
    if (forbiddenScripts.has(script)) fail(`${expected.name} contains forbidden lifecycle script '${script}'.`);
  }
  if (expected.name === "@codextheme/runtime" && manifest.bin) {
    fail("runtime must not ship an executable.");
  }
  if (expected.name === "@codextheme/cli") {
    if (manifest.dependencies?.["@codextheme/runtime"] !== "0.1.0") {
      fail("CLI must depend on the exact @codextheme/runtime 0.1.0 release.");
    }
    if (Object.keys(manifest.dependencies ?? {}).length !== 1) {
      fail("CLI must not add undeclared runtime dependencies.");
    }
  }
}

function checkPackFiles(expected, pack) {
  const files = pack.files.map((file) => file.path);
  for (const required of requiredFiles) {
    if (!files.includes(required)) fail(`${expected.name} tarball is missing ${required}.`);
  }
  if (expected.name === "@codextheme/cli") {
    for (const required of [
      "src/private-source.mjs",
      "src/cache.mjs",
      "src/handoff.mjs",
      "src/handoff-runner.mjs",
      "src/handoff-worker.mjs",
    ]) {
      if (!files.includes(required)) fail(`CLI tarball is missing ${required}.`);
    }
    const themes = files.filter((filename) => filename.startsWith("themes/") && filename.endsWith(".codextheme-theme"));
    const expectedThemes = [
      "themes/aurora-glass.codextheme-theme",
      "themes/cathedral-nocturne.codextheme-theme",
      "themes/crimson-eclipse.codextheme-theme",
      "themes/crimson-procession.codextheme-theme",
      "themes/midnight-circuit.codextheme-theme",
      "themes/silver-reliquary.codextheme-theme",
    ];
    if (JSON.stringify(themes.sort()) !== JSON.stringify(expectedThemes)) {
      fail(`CLI must ship exactly the six backward-compatible themes; received ${themes.join(", ") || "none"}.`);
    }
    const inheritedNames = files.filter((filename) => filename.endsWith(".codedrobe-theme"));
    if (inheritedNames.length) fail(`CLI artifact filenames must use the codextheme-owned extension; received ${inheritedNames.join(", ")}.`);
  }
  return files;
}

function scanText(packageName, filename, source) {
  const checks = [
    ["private key material", /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/],
    ["absolute macOS user path", /\/Users\//],
    ["pipe-to-shell installer", /curl[^\n|]*\|\s*(?:ba)?sh\b/i],
    ["legacy @codedrobe/core package dependency", /@codedrobe\/core/],
    ["non-loopback debugging address", /remote-debugging-address=(?!127\.0\.0\.1\b)[^\s"']+/],
    ["non-loopback CDP websocket", /ws:\/\/(?!127\.0\.0\.1(?::|\/)|localhost(?::|\/)|\[::1\](?::|\/))[^\s"']+/i],
  ];
  for (const [label, pattern] of checks) {
    if (pattern.test(source)) fail(`${packageName} ships ${label} in ${filename}.`);
  }
}

for (const expected of packages) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, expected.directory, "package.json"), "utf8"));
  checkManifest(expected, manifest);
  const pack = await packList(expected.name);
  if (pack.name !== expected.name || pack.version !== expected.version) {
    fail(`npm pack reported unexpected identity '${pack.name}@${pack.version}'.`);
  }
  const files = checkPackFiles(expected, pack);
  for (const filename of files.filter(isTextFile)) {
    const source = await fs.readFile(path.join(root, expected.directory, filename), "utf8");
    scanText(expected.name, filename, source);
  }
  console.log(`✓ ${expected.name}@${expected.version}: ${files.length} files, ${pack.size} bytes`);
}

console.log("Package release checks passed.");
