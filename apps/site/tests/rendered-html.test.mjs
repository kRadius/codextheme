import assert from "node:assert/strict";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import next from "next";
import test, { after, before } from "node:test";

const routes = [
  "../app/page.tsx",
  "../app/themes/[slug]/page.tsx",
  "../app/security/page.tsx",
  "../app/help/page.tsx",
];

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const app = next({ dev: false, dir: siteRoot });
let origin;
let server;

before(async () => {
  await app.prepare();
  const handler = app.getRequestHandler();
  server = createServer((request, response) => handler(request, response));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await app.close();
});

function render(pathname = "/") {
  return fetch(`${origin}${pathname}`, { headers: { accept: "text/html" } });
}

const availableSlugs = [
  "cathedral-nocturne",
  "crimson-procession",
  "silver-reliquary",
];

test("all flagship routes have source entries", async () => {
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
});

test("home and every flagship theme render screenshot-first crawlable HTML", async () => {
  const home = await render("/");
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /<html lang="en">/);
  assert.match(homeHtml, /<title>Codex Themes for Codex Desktop \| CodexTheme<\/title>/);
  assert.match(homeHtml, /<link rel="canonical" href="https:\/\/codextheme\.tech"/);
  assert.match(homeHtml, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"/);

  const jsonLdBlocks = [...homeHtml.matchAll(
    /<script type="application\/ld\+json">(.*?)<\/script>/gs,
  )].map((match) => JSON.parse(match[1]));
  assert.deepEqual(jsonLdBlocks.find((entry) => entry["@type"] === "WebSite"), {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CodexTheme",
    alternateName: "Codex Themes",
    url: "https://codextheme.tech/",
  });
  assert.match(homeHtml, /G-YB7Y6G2FRP/);
  for (const slug of availableSlugs) {
    assert.match(homeHtml, new RegExp(slug));
  }
  assert.match(homeHtml, /Codex themes that turn your workspace into a world/);
  assert.match(homeHtml, /Cathedral Nocturne/);
  assert.match(homeHtml, /Browse all themes/);
  assert.match(homeHtml, /Submit a theme/);
  assert.match(homeHtml, /Three complete worlds/);
  assert.match(homeHtml, /github\.com\/kRadius\/codextheme\/issues\/new/);
  assert.match(homeHtml, /mailto:codextheme@codextheme\.tech/);
  assert.doesNotMatch(homeHtml, /把 Codex|全部主题|提交主题|安装帮助|已可安装/);
  assert.doesNotMatch(homeHtml, /主题槽位|制作中|真实截图待补齐|midnight-circuit|crimson-eclipse|aurora-glass|搜索主题|上传图片|为什么只有三个|mini-shell|preview-ui|composer-mock/);

  for (const slug of availableSlugs) {
    const response = await render(`/themes/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-copy-command/g) ?? []).length, 1);
    assert.match(html, new RegExp(`data-theme-slug="${slug}"`));
    assert.match(html, new RegExp(`@codextheme\\/cli@0\\.1\\.1 apply ${slug}`));
    assert.match(html, /HOME \/ VERIFIED THEME PREVIEW/);
    assert.match(html, /SESSION \/ VERIFIED THEME PREVIEW/);
    assert.doesNotMatch(html, /真实截图待补齐|制作中/);
    assert.doesNotMatch(html, /安装 Skill|\.pkg|curl \| bash|@latest/);
  }
});

test("security, help, robots, and sitemap routes render", async () => {
  for (const [pathname, expected] of [
    ["/security", /不修改 Codex 安装包/],
    ["/help", /reapply/],
    ["/robots.txt", /User-Agent/],
    ["/sitemap.xml", /themes\/cathedral-nocturne/],
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, expected);
    if (["/help", "/security"].includes(pathname)) {
      assert.match(html, /mailto:codextheme@codextheme\.tech/);
    }
  }
});
