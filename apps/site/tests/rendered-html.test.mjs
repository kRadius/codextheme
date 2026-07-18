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

const availableSlugs = ["midnight-circuit", "crimson-eclipse", "aurora-glass"];
const comingSoonSlugs = [
  "ink-mountain",
  "pixel-terminal",
  "neon-tokyo",
  "obsidian-gold",
  "sakura-observatory",
  "abyss-station",
];

test("all traffic MVP routes have source entries", async () => {
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
});

test("home and every repository theme render honest crawlable HTML", async () => {
  const home = await render("/");
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /<title>CodexTheme/);
  for (const slug of [...availableSlugs, ...comingSoonSlugs]) {
    assert.match(homeHtml, new RegExp(slug));
  }
  assert.match(homeHtml, /为 Codex 找一套新界面/);
  assert.match(homeHtml, /9 个主题槽位/);
  assert.match(homeHtml, /真实截图待补齐/);
  assert.match(homeHtml, /提交主题/);
  assert.match(homeHtml, /github\.com\/kRadius\/codextheme\/issues\/new/);
  assert.doesNotMatch(homeHtml, /搜索主题|上传图片|为什么只有三个|mini-shell|preview-ui|composer-mock/);

  for (const slug of availableSlugs) {
    const response = await render(`/themes/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-copy-command/g) ?? []).length, 1);
    assert.match(html, new RegExp(`@codextheme\\/cli@0\\.1\\.0 apply ${slug}`));
    assert.match(html, /真实截图待补齐/);
    assert.doesNotMatch(html, /安装 Skill|\.pkg|curl \| bash|@latest/);
  }

  for (const slug of comingSoonSlugs) {
    const response = await render(`/themes/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-copy-command/g) ?? []).length, 0);
    assert.match(html, /完成验证后开放安装/);
    assert.doesNotMatch(html, new RegExp(`@codextheme\\/cli@0\\.1\\.0 apply ${slug}`));
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
