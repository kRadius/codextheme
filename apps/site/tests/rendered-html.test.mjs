import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const routes = [
  "../app/page.tsx",
  "../app/themes/[slug]/page.tsx",
  "../app/security/page.tsx",
  "../app/help/page.tsx",
];

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("all traffic MVP routes have source entries", async () => {
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
});

test("home and every curated theme render real crawlable HTML", async () => {
  const home = await render("/");
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /<title>CodexTheme/);
  assert.match(homeHtml, /midnight-circuit/);
  assert.match(homeHtml, /crimson-eclipse/);
  assert.match(homeHtml, /aurora-glass/);
  assert.doesNotMatch(homeHtml, /codex-preview|react-loading-skeleton/);

  for (const slug of ["midnight-circuit", "crimson-eclipse", "aurora-glass"]) {
    const response = await render(`/themes/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-copy-command/g) ?? []).length, 1);
    assert.match(html, new RegExp(`@codextheme\\/cli@0\\.1\\.0 apply ${slug}`));
    assert.match(html, /Home 预览/);
    assert.match(html, /Session 预览/);
    assert.doesNotMatch(html, /安装 Skill|\.pkg|curl \| bash|@latest/);
  }
});

test("security, help, robots, and sitemap routes render", async () => {
  for (const [pathname, expected] of [
    ["/security", /不修改 Codex 安装包/],
    ["/help", /reapply/],
    ["/robots.txt", /User-Agent/],
    ["/sitemap.xml", /themes\/midnight-circuit/],
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(await response.text(), expected);
  }
});
