import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertCodexThemeProductNamespace } from "../check-product-namespace.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codextheme-namespace-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "product"), { recursive: true });
  return root;
}

test("product namespace scanner accepts CodexTheme output and attribution files", async (t) => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, "product", "theme.css"), ":root.codextheme-theme { --codextheme-image-hero: none; }", "utf8");
  await fs.writeFile(path.join(root, "product", "NOTICE"), "Includes CodeDrobe-derived Apache-2.0 work.", "utf8");

  await assert.doesNotReject(() => assertCodexThemeProductNamespace(root, {
    productRoots: ["product"],
  }));
});

test("product namespace scanner rejects historical naming in current output", async (t) => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, "product", "theme.css"), ":root.codedrobe-theme { color: red; }", "utf8");

  await assert.rejects(
    () => assertCodexThemeProductNamespace(root, { productRoots: ["product"] }),
    /CodeDrobe product namespace leak.*product\/theme\.css/,
  );
});
