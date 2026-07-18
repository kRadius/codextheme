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
  assert.match(homeHtml, /<title>CodexTheme/);
  for (const slug of availableSlugs) {
    assert.match(homeHtml, new RegExp(slug));
  }
  assert.match(homeHtml, /把 Codex 变成你的工作世界/);
  assert.match(homeHtml, /Cathedral Nocturne/);
  assert.match(homeHtml, /提交主题/);
  assert.match(homeHtml, /github\.com\/kRadius\/codextheme\/issues\/new/);
  assert.match(homeHtml, /mailto:codextheme@codextheme\.tech/);
  assert.doesNotMatch(homeHtml, /主题槽位|制作中|真实截图待补齐|midnight-circuit|crimson-eclipse|aurora-glass|搜索主题|上传图片|为什么只有三个|mini-shell|preview-ui|composer-mock/);

  for (const slug of availableSlugs) {
    const response = await render(`/themes/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-copy-command/g) ?? []).length, 1);
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
