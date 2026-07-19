#!/usr/bin/env node

import { createPrivateCache } from "./cache.mjs";
import { createHandoffStore } from "./handoff.mjs";
import { runHandoffJob, validateWorkerInvocation } from "./handoff-runner.mjs";
import { runtime } from "./runtime.mjs";
import { createStateStore } from "./state.mjs";

const store = createHandoffStore();

try {
  const parentPid = validateWorkerInvocation(process.argv.slice(2), store.pendingPath);
  const pending = await store.readPending();
  if (pending.parentPid !== parentPid) {
    throw Object.assign(new Error("Handoff parent mismatch."), { code: "E_HANDOFF_FAILED" });
  }
  process.exitCode = await runHandoffJob({
    store,
    runtime,
    stateStore: createStateStore(),
    cache: createPrivateCache(),
  });
} catch {
  process.exitCode = 1;
}
