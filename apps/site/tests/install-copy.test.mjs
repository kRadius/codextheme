import assert from "node:assert/strict";
import test from "node:test";
import { buildInstallCopy } from "../app/lib/install-copy.mjs";

const catalogCommand = "npx --yes @codextheme/cli@0.2.0 apply cathedral-nocturne";
const privateCommand = "npx --yes @codextheme/cli@0.2.0 apply-private mrsm16zh.UsX3wZp4MRN7Y54nKXfLKH5dwSyWLzSi";

test("agent copy constrains the Code Agent and preserves the exact command", () => {
  const payload = buildInstallCopy(catalogCommand, "agent");

  assert.match(payload, /interactive local macOS shell \(PTY\)/);
  assert.match(payload, /Do not use any installed theme skill/);
  assert.match(payload, /substitute another package/);
  assert.match(payload, /@codextheme\/cli/);
  assert.ok(payload.endsWith(`\n\n${catalogCommand}`));
});

test("terminal copy returns the private command unchanged", () => {
  assert.equal(buildInstallCopy(privateCommand, "terminal"), privateCommand);
});

test("copy rejects commands that are not a pinned install action", () => {
  for (const command of [
    `${catalogCommand}\necho injected`,
    "npx --yes @codextheme/cli@latest apply cathedral-nocturne",
    "npx --yes @codextheme/cli@0.2.0 restore",
    "npx --yes @codedrobe/core apply cathedral-nocturne",
  ]) {
    assert.throws(
      () => buildInstallCopy(command, "agent"),
      /Invalid pinned CodexTheme install command\./,
    );
  }
});

test("copy rejects unknown destinations", () => {
  assert.throws(
    () => buildInstallCopy(catalogCommand, "chat"),
    /Invalid install copy mode\./,
  );
});
