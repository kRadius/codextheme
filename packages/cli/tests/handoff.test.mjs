import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRestartHandoff } from "../src/handoff.mjs";

async function temporaryHome(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "codextheme-handoff-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  return home;
}

function spawnRecorder() {
  const calls = [];
  let unrefCount = 0;
  return {
    calls,
    get unrefCount() { return unrefCount; },
    spawnProcess(...args) {
      calls.push(args);
      return { unref() { unrefCount += 1; } };
    },
  };
}

test("restart handoff writes an owner-only allowlisted job and detaches one worker", async (t) => {
  const home = await temporaryHome(t);
  const spawned = spawnRecorder();
  const workerPath = "/package/src/handoff-worker.mjs";
  const handoff = createRestartHandoff({
    home,
    workerPath,
    execPath: "/node",
    parentPid: 4321,
    now: () => new Date("2026-07-19T08:00:00.000Z"),
    spawnProcess: spawned.spawnProcess,
  });

  const result = await handoff.schedule({
    schemaVersion: 2,
    source: "catalog",
    themeSlug: "cathedral-nocturne",
  });

  assert.deepEqual(await handoff.store.readPending(), {
    schemaVersion: 1,
    createdAt: "2026-07-19T08:00:00.000Z",
    parentPid: 4321,
    action: { source: "catalog", themeSlug: "cathedral-nocturne" },
  });
  assert.equal((await fs.stat(handoff.store.directory)).mode & 0o777, 0o700);
  assert.equal((await fs.stat(handoff.store.pendingPath)).mode & 0o777, 0o600);
  assert.deepEqual(spawned.calls, [[
    "/node",
    [workerPath, handoff.store.pendingPath, "4321"],
    { detached: true, stdio: "ignore" },
  ]]);
  assert.equal(spawned.unrefCount, 1);
  assert.deepEqual(result, {
    queued: true,
    resultPath: handoff.store.resultPath,
  });
});

test("restart handoff stores only the local private cache reference", async (t) => {
  const home = await temporaryHome(t);
  const spawned = spawnRecorder();
  const handoff = createRestartHandoff({ home, spawnProcess: spawned.spawnProcess });
  const cacheKey = "a".repeat(64);

  await handoff.schedule({ schemaVersion: 2, source: "private", cacheKey });

  const serialized = await fs.readFile(handoff.store.pendingPath, "utf8");
  assert.match(serialized, new RegExp(cacheKey));
  assert.doesNotMatch(serialized, /privateId|apply-private|codextheme\.tech|theme\s*:/i);
  const invalidHome = await temporaryHome(t);
  await assert.rejects(
    () => createRestartHandoff({ home: invalidHome, spawnProcess: spawned.spawnProcess }).schedule({
      schemaVersion: 2,
      source: "private",
      cacheKey,
      privateId: "must-not-be-stored",
    }),
    { code: "E_HANDOFF_FAILED" },
  );
});

test("fresh jobs block duplicates while stale jobs are replaced", async (t) => {
  const home = await temporaryHome(t);
  const spawned = spawnRecorder();
  const first = createRestartHandoff({
    home,
    now: () => new Date("2026-07-19T08:00:00.000Z"),
    spawnProcess: spawned.spawnProcess,
  });
  await first.schedule({ schemaVersion: 2, source: "catalog", themeSlug: "silver-reliquary" });

  const fresh = createRestartHandoff({
    home,
    now: () => new Date("2026-07-19T08:04:59.000Z"),
    spawnProcess: spawned.spawnProcess,
  });
  await assert.rejects(
    () => fresh.schedule({ schemaVersion: 2, source: "catalog", themeSlug: "crimson-procession" }),
    { code: "E_HANDOFF_BUSY" },
  );

  const stale = createRestartHandoff({
    home,
    now: () => new Date("2026-07-19T08:05:01.000Z"),
    spawnProcess: spawned.spawnProcess,
  });
  await stale.schedule({ schemaVersion: 2, source: "catalog", themeSlug: "crimson-procession" });
  assert.equal((await stale.store.readPending()).action.themeSlug, "crimson-procession");
  assert.equal(spawned.calls.length, 2);
});

test("spawn failure removes pending state and returns a stable error", async (t) => {
  const home = await temporaryHome(t);
  const handoff = createRestartHandoff({
    home,
    spawnProcess() { throw new Error("internal launch detail"); },
  });

  await assert.rejects(
    () => handoff.schedule({ schemaVersion: 2, source: "catalog", themeSlug: "aurora-glass" }),
    { code: "E_HANDOFF_FAILED", message: "无法启动独立的 Codex 重启任务。" },
  );
  await assert.rejects(() => fs.stat(handoff.store.pendingPath), { code: "ENOENT" });
});

test("handoff store rejects nested fields added to a pending action", async (t) => {
  const home = await temporaryHome(t);
  const handoff = createRestartHandoff({ home, spawnProcess: spawnRecorder().spawnProcess });
  await handoff.schedule({ schemaVersion: 2, source: "catalog", themeSlug: "aurora-glass" });
  const tampered = JSON.parse(await fs.readFile(handoff.store.pendingPath, "utf8"));
  tampered.action.schemaVersion = 2;
  await fs.writeFile(handoff.store.pendingPath, JSON.stringify(tampered), { mode: 0o600 });

  await assert.rejects(() => handoff.store.readPending(), { code: "E_HANDOFF_FAILED" });
});
