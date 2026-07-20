import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { getAdapter } from "../src/adapters/index.mjs";
import { probeApp, waitForTargets, watchTheme } from "../src/runtime/injector.mjs";

function messageEvent(data) {
  const event = new Event("message");
  Object.defineProperty(event, "data", { value: data });
  return event;
}

test("target wait respects a short timeout and returns structured diagnostics", async (t) => {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end("[]");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  const startedAt = Date.now();

  await assert.rejects(
    waitForTargets(getAdapter("workbuddy"), address.port, 300),
    (error) => {
      assert.equal(error.code, "CODEXTHEME_TARGET_TIMEOUT");
      assert.equal(error.port, address.port);
      assert.equal(error.timeoutMs, 300);
      assert.match(error.message, /within 300ms/);
      return true;
    },
  );
  assert.ok(Date.now() - startedAt < 1000);
});

test("renderer compatibility can become ready after the first five seconds of the launch budget", async (t) => {
  const server = http.createServer((_request, response) => {
    const address = server.address();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify([{
      id: "slow-codex-renderer",
      title: "Codex",
      type: "page",
      url: "app://-/index.html",
      webSocketDebuggerUrl: `ws://127.0.0.1:${address.port}/devtools/page/slow-codex-renderer`,
    }]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const NativeWebSocket = globalThis.WebSocket;
  const nativeNow = Date.now;
  let virtualNow = 0;
  let evaluations = 0;

  class SlowRendererWebSocket extends EventTarget {
    constructor() {
      super();
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }

    send(payload) {
      const request = JSON.parse(payload);
      let result = {};
      if (request.method === "Runtime.evaluate") {
        evaluations += 1;
        virtualNow += 1000;
        result = { result: { value: { compatible: evaluations >= 6 } } };
      }
      queueMicrotask(() => this.dispatchEvent(messageEvent(JSON.stringify({ id: request.id, result }))));
    }

    close() {
      queueMicrotask(() => this.dispatchEvent(new Event("close")));
    }
  }

  globalThis.WebSocket = SlowRendererWebSocket;
  Date.now = () => virtualNow;
  t.after(() => {
    globalThis.WebSocket = NativeWebSocket;
    Date.now = nativeNow;
  });

  const results = await probeApp({
    adapter: getAdapter("codex"),
    port: server.address().port,
    timeoutMs: 30_000,
  });

  assert.equal(results[0].result.compatible, true);
  assert.equal(evaluations, 6);
});

test("theme watcher can be owned and stopped by an AbortSignal", async () => {
  const controller = new AbortController();
  controller.abort();
  const adapter = getAdapter("codex");
  const startedAt = Date.now();

  await watchTheme({
    adapter,
    targetTheme: {
      theme: { id: "signal-test", displayName: "Signal test", version: "1.0.0" },
      css: "",
      options: {},
      verification: null,
      artDataUrl: null,
    },
    port: adapter.defaultPort,
    signal: controller.signal,
  });

  assert.ok(Date.now() - startedAt < 250);
});
