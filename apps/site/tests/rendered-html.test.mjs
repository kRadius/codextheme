import assert from "node:assert/strict";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import next from "next";
import test, { after, before } from "node:test";
import { buildPrivateSkinForm } from "../app/lib/browser-image.mjs";

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
  assert.match(homeHtml, /<link rel="icon" href="\/brand-mark\.svg" type="image\/svg\+xml"/);
  assert.match(homeHtml, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180" type="image\/png"/);
  const visibleBrandMarks = [...homeHtml.matchAll(/<img(?=[^>]*class="brand-mark")(?=[^>]*src="\/brand-mark\.svg")(?=[^>]*width="22")(?=[^>]*height="22")(?=[^>]*alt="")(?=[^>]*data-nimg="1")[^>]*>/g)];
  assert.equal(visibleBrandMarks.length, 2);

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
  assert.match(homeHtml, /<p class="studio-lead">Upload an image, choose a complete visual system, and apply the finished Codex skin with one command\.<\/p>/);
  assert.match(homeHtml, /custom Codex skin/i);
  assert.match(homeHtml, /No account/);
  assert.match(homeHtml, /Private temporary upload/);
  assert.match(homeHtml, /Paste into a local Codex task/);
  assert.doesNotMatch(homeHtml, /Paste one command into Terminal/);
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
    assert.equal((html.match(/data-copy-terminal/g) ?? []).length, 1);
    assert.match(html, new RegExp(`data-theme-slug="${slug}"`));
    assert.match(html, new RegExp(`@codextheme\\/cli@0\\.2\\.4 apply ${slug}`));
    assert.match(html, new RegExp(availableThemeCopy[slug].name));
    assert.match(html, new RegExp(availableThemeCopy[slug].description.replaceAll(".", "\\.")));
    assert.match(html, /Ready to install/);
    assert.match(html, /Apply with Codex/);
    assert.match(html, /Copy &amp; apply with Codex/);
    assert.match(html, /Copy Terminal command/);
    assert.doesNotMatch(html, /open Terminal, paste it/i);
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

  const helpHtml = await (await render("/help")).text();
  assert.match(helpHtml, /local Codex task/);
  assert.match(helpHtml, /Terminal fallback/);

  const securityHtml = await (await render("/security")).text();
  assert.match(securityHtml, /temporary ID/);
  assert.match(securityHtml, /Agent provider/);
  assert.doesNotMatch(securityHtml, /CodeDrobe/i);

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

test("browser private skin settings reach image validation", async () => {
  const browserForm = buildPrivateSkinForm({
    image: new Blob(["not-a-webp"], { type: "image/webp" }),
    settings: { recipe: "glass" },
  });
  const invalidImage = await fetch(`${origin}/api/private-skins`, {
    method: "POST",
    body: browserForm,
  });
  assert.equal(invalidImage.status, 400);
  assert.deepEqual(await invalidImage.json(), { error: "invalid_upload" });
});

test("unknown private skin settings return a stable client error", async () => {
  const unknownSettings = new FormData();
  unknownSettings.append("image", new Blob(["not-a-webp"], { type: "image/webp" }), "custom-skin.webp");
  unknownSettings.append("settings", JSON.stringify({ recipe: "glass", unknown: true }));
  const invalidSettings = await fetch(`${origin}/api/private-skins`, {
    method: "POST",
    body: unknownSettings,
  });
  assert.equal(invalidSettings.status, 400);
  assert.deepEqual(await invalidSettings.json(), { error: "invalid_settings" });
});

test("malformed private skin settings return a stable client error", async () => {
  const malformedSettings = new FormData();
  malformedSettings.append("image", new Blob(["not-a-webp"], { type: "image/webp" }), "custom-skin.webp");
  malformedSettings.append("settings", "{not-json");
  const response = await fetch(`${origin}/api/private-skins`, {
    method: "POST",
    body: malformedSettings,
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_settings" });
});
