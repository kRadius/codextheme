import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { confirmRestart } from "../src/prompt.mjs";
import { createStateStore } from "../src/state.mjs";

test("state writes only the approved schema with private permissions", async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "codextheme-state-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const state = createStateStore({ home });
  await state.write({
    schemaVersion: 1,
    themeSlug: "midnight-circuit",
    appliedAt: "2026-07-18T12:00:00.000Z",
    token: "must-not-persist",
  });
  assert.deepEqual(await state.read(), {
    schemaVersion: 1,
    themeSlug: "midnight-circuit",
    appliedAt: "2026-07-18T12:00:00.000Z",
  });
  assert.equal((await fs.stat(state.filename)).mode & 0o777, 0o600);
});

test("restart prompt refuses non-TTY and accepts only normalized y", async () => {
  assert.equal(await confirmRestart({ input: { isTTY: false }, output: { isTTY: true } }), false);

  const input = new PassThrough();
  const output = new PassThrough();
  input.isTTY = true;
  output.isTTY = true;
  input.end(" y \n");
  assert.equal(await confirmRestart({ input, output }), true);

  const otherInput = new PassThrough();
  const otherOutput = new PassThrough();
  otherInput.isTTY = true;
  otherOutput.isTTY = true;
  otherInput.end("yes\n");
  assert.equal(await confirmRestart({ input: otherInput, output: otherOutput }), false);
});
