import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const siteRoot = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL("package.json", siteRoot), "utf8"),
);
const nextConfigSource = await readFile(
  new URL("next.config.ts", siteRoot),
  "utf8",
);
const gitignoreSource = await readFile(new URL(".gitignore", siteRoot), "utf8");

test("site uses the native Next.js commands Vercel detects", () => {
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
});

test("site has no Cloudflare or Vinext build dependencies", () => {
  for (const dependency of [
    "@cloudflare/vite-plugin",
    "@vitejs/plugin-react",
    "@vitejs/plugin-rsc",
    "react-server-dom-webpack",
    "vinext",
    "vite",
    "wrangler",
  ]) {
    assert.equal(packageJson.dependencies?.[dependency], undefined);
    assert.equal(packageJson.devDependencies?.[dependency], undefined);
  }
});

test("site has no hosting-specific Worker build entry points", async () => {
  for (const pathname of [
    "vite.config.ts",
    "worker/index.ts",
    "build/sites-vite-plugin.ts",
  ]) {
    await assert.rejects(
      access(new URL(pathname, siteRoot)),
      (error) => error?.code === "ENOENT",
    );
  }
});

test("site pins the monorepo root and uses its single package lock", async () => {
  assert.match(nextConfigSource, /turbopack:\s*\{/);
  assert.match(nextConfigSource, /root:\s*repoRoot/);
  await assert.rejects(
    access(new URL("package-lock.json", siteRoot)),
    (error) => error?.code === "ENOENT",
  );
});

test("site ignores TypeScript incremental build state", () => {
  assert.match(gitignoreSource, /^\*\.tsbuildinfo$/m);
});
