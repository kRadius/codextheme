import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const source = await fs.readFile(
  new URL("../qa-private-skin-app-chrome.mjs", import.meta.url),
  "utf8",
);

test("draft recovery uses a private random directory and exclusive backup file", () => {
  assert.match(source, /import os from "node:os";/u);
  assert.match(
    source,
    /fs\.mkdtemp\(\s*path\.join\(os\.tmpdir\(\), "private-skin-app-chrome-draft-"\),?\s*\)/u,
  );
  assert.match(
    source,
    /fs\.writeFile\(\s*homeDraftBackupFile,[\s\S]*?\{\s*flag: "wx",\s*mode: 0o600\s*\}/u,
  );
  assert.match(source, /await fs\.unlink\(homeDraftBackupFile\)/u);
  assert.match(source, /await fs\.rmdir\(homeDraftBackupDirectory\)/u);
  assert.doesNotMatch(source, /codextheme-home-draft-backup-\$\{process\.pid\}/u);
});

test("artifact directory creation never changes permissions of an existing directory", () => {
  const helper = source.match(
    /async function ensurePrivateArtifactDirectory\(directory\) \{[\s\S]*?^\}/mu,
  )?.[0];
  assert.ok(helper, "expected ensurePrivateArtifactDirectory helper");
  assert.match(helper, /const createdPath = await fs\.mkdir/u);
  assert.match(helper, /const created = createdPath !== undefined/u);
  assert.match(helper, /await fs\.lstat\(directory\)/u);
  assert.match(helper, /metadata\.isDirectory\(\)/u);
  assert.match(helper, /process\.getuid/u);
  assert.match(helper, /metadata\.uid/u);
  assert.match(helper, /metadata\.mode & 0o077/u);
  assert.match(helper, /if \(created\) await fs\.chmod\(directory, 0o700\)/u);
  assert.doesNotMatch(helper, /^\s*await fs\.chmod\(directory, 0o700\);$/mu);
});
