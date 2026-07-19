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
const availableThemeCopy = {
  "cathedral-nocturne": {
    name: "Cathedral Nocturne",
    description: "A monumental obsidian cathedral shaped by restrained antique-gold light.",
  },
  "crimson-procession": {
    name: "Crimson Procession",
    description: "A rain-darkened gothic cloister crosses the path of a controlled crimson moon.",
  },
  "silver-reliquary": {
    name: "Silver Reliquary",
    description: "Moonlight settles across a ruined silver reliquary and its quiet stone arches.",
  },
};

test("all flagship routes have source entries", async () => {
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
});

test("home and every flagship theme render screenshot-first crawlable HTML", async () => {
  const home = await render("/");
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /<html lang="en">/);
  assert.match(homeHtml, /<title>Custom Codex Skin &amp; Theme Generator \| CodexTheme<\/title>/);
  assert.match(homeHtml, /Create a custom Codex skin from any image/);
  assert.match(homeHtml, /<link rel="canonical" href="https:\/\/codextheme\.tech"/);
  assert.match(homeHtml, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"/);

  const jsonLdBlocks = [...homeHtml.matchAll(
    /<script type="application\/ld\+json">(.*?)<\/script>/gs,
  )].map((match) => JSON.parse(match[1]));
  assert.deepEqual(jsonLdBlocks.find((entry) => entry["@type"] === "WebSite"), {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CodexTheme",
    alternateName: "Codex Skins & Themes",
    url: "https://codextheme.tech/",
  });
  assert.match(homeHtml, /G-YB7Y6G2FRP/);
  for (const slug of availableSlugs) {
    assert.match(homeHtml, new RegExp(slug));
  }
  assert.match(homeHtml, /CUSTOM CODEX SKIN GENERATOR/);
  assert.match(homeHtml, /Turn any image into a Codex skin/);
  assert.match(homeHtml, /custom Codex skin/i);
  assert.match(homeHtml, /Codex theme generator/i);
  assert.match(homeHtml, /No account/);
  assert.match(homeHtml, /Private temporary upload/);
  assert.match(homeHtml, /Need inspiration\?<br\/>Start with a ready-made skin/);
  assert.match(homeHtml, /Cathedral Nocturne/);
  assert.match(homeHtml, /Create a skin/);
  assert.match(homeHtml, /Submit a theme/);
  assert.doesNotMatch(homeHtml, /apply-private [a-z0-9]+\.[A-Za-z0-9_-]+/);
  assert.match(homeHtml, /github\.com\/kRadius\/codextheme\/issues\/new/);
  assert.match(homeHtml, /mailto:codextheme@codextheme\.tech/);
  assert.doesNotMatch(homeHtml, /把 Codex|全部主题|提交主题|安装帮助|已可安装/);
  assert.doesNotMatch(homeHtml, /主题槽位|制作中|真实截图待补齐|midnight-circuit|aurora-glass|搜索主题|上传图片|为什么只有三个|mini-shell|preview-ui|composer-mock/);

  for (const slug of availableSlugs) {
    const response = await render(`/themes/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-copy-command/g) ?? []).length, 1);
    assert.match(html, new RegExp(`data-theme-slug="${slug}"`));
    assert.match(html, new RegExp(`@codextheme\\/cli@0\\.2\\.0 apply ${slug}`));
    assert.match(html, new RegExp(availableThemeCopy[slug].name));
    assert.match(html, new RegExp(availableThemeCopy[slug].description.replaceAll(".", "\\.")));
    assert.match(html, /Ready to install/);
    assert.match(html, /Apply with one command/);
    assert.match(html, /Copy command/);
    assert.match(html, /HOME \/ VERIFIED THEME PREVIEW/);
    assert.match(html, /SESSION \/ VERIFIED THEME PREVIEW/);
    assert.doesNotMatch(html, /真实截图待补齐|制作中|返回全部主题|一条命令应用|安装边界/);
    assert.doesNotMatch(html, /安装 Skill|\.pkg|curl \| bash|@latest/);
  }
});

test("security, help, robots, and sitemap routes render", async () => {
  for (const [pathname, expected] of [
    ["/security", /Codex\.app stays untouched/],
    ["/help", /Apply a theme for the first time/],
    ["/robots.txt", /User-Agent/],
    ["/sitemap.xml", /themes\/cathedral-nocturne/],
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, expected);
    if (["/help", "/security"].includes(pathname)) {
      assert.match(html, /mailto:codextheme@codextheme\.tech/);
      assert.doesNotMatch(html, /返回首页|使用帮助|安全边界/);
    }
  }

  const missing = await render("/themes/not-a-real-theme");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /This theme page does not exist/);
});

test("private skin routes fail closed before storage access", async () => {
  const malformed = await fetch(`${origin}/api/private-skins`, {
    method: "POST",
    body: new FormData(),
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "invalid_upload" });

  const invalidId = await fetch(`${origin}/api/private-skins/not-an-id`);
  assert.equal(invalidId.status, 404);
  assert.equal(invalidId.headers.get("cache-control"), "no-store");

  const cleanup = await fetch(`${origin}/api/private-skins/cleanup`);
  assert.equal(cleanup.status, 401);
});
