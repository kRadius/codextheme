import assert from "node:assert/strict";
import test from "node:test";
import { createPrivateQaThemeTransaction } from "../lib/private-qa-theme-transaction.mjs";

const catalogState = Object.freeze({
  schemaVersion: 2,
  source: "catalog",
  themeSlug: "original-theme",
  appliedAt: "2026-07-25T00:00:00.000Z",
});
const originalTheme = Object.freeze({
  theme: Object.freeze({ id: "original-theme", version: "1.0.0" }),
});
const fixtureTheme = Object.freeze({
  theme: Object.freeze({ id: "fixture-theme", version: "1.0.0" }),
});
const installedRenderer = Object.freeze({
  installed: true,
  stylePresent: true,
  themeId: "original-theme",
  version: "1.0.0",
});
const nativeRenderer = Object.freeze({
  installed: false,
  stylePresent: false,
  themeId: null,
  version: null,
});
const passingTargets = () => [{ result: { pass: true } }];

function themedTransaction(overrides = {}) {
  const calls = [];
  let renderer = installedRenderer;
  const transaction = createPrivateQaThemeTransaction({
    readStoredState: async () => {
      calls.push(["readStoredState"]);
      return catalogState;
    },
    loadStoredTheme: async (state) => {
      calls.push(["loadStoredTheme", state]);
      return originalTheme;
    },
    readRendererState: async () => {
      calls.push(["readRendererState"]);
      return renderer;
    },
    applyTheme: async (theme) => {
      calls.push(["applyTheme", theme.theme.id]);
      renderer = {
        installed: true,
        stylePresent: true,
        themeId: theme.theme.id,
        version: theme.theme.version,
      };
      return passingTargets();
    },
    removeTheme: async () => {
      calls.push(["removeTheme"]);
      renderer = nativeRenderer;
      return [{ result: true }];
    },
    verifyTheme: async (theme) => {
      calls.push(["verifyTheme", theme.theme.id]);
      return renderer.themeId === theme.theme.id ? passingTargets() : [{ result: { pass: false } }];
    },
    ...overrides,
  });
  return { calls, transaction, getRenderer: () => renderer };
}

test("restores and verifies the complete original stored theme", async () => {
  const app = themedTransaction();
  const restoration = [];

  const result = await app.transaction.runFixture({
    fixtureTheme,
    audit: async (applied) => {
      app.calls.push(["audit", applied[0].result.pass]);
      return "audit-result";
    },
    onRestoration: (status) => restoration.push(status),
  });

  assert.equal(result, "audit-result");
  assert.deepEqual(app.getRenderer(), installedRenderer);
  assert.deepEqual(restoration, [{ status: "Pass", original: "theme" }]);
  assert.deepEqual(
    app.calls.filter(([name]) => ["applyTheme", "verifyTheme", "audit"].includes(name)),
    [
      ["verifyTheme", "original-theme"],
      ["applyTheme", "fixture-theme"],
      ["audit", true],
      ["applyTheme", "original-theme"],
      ["verifyTheme", "original-theme"],
    ],
  );
});

test("restores and verifies native state when no theme was originally stored", async () => {
  const calls = [];
  let renderers = [nativeRenderer, nativeRenderer];
  const transaction = createPrivateQaThemeTransaction({
    readStoredState: async () => null,
    loadStoredTheme: async () => assert.fail("native state must not load a theme"),
    readRendererState: async () => renderers,
    applyTheme: async (theme) => {
      calls.push(["applyTheme", theme.theme.id]);
      const installed = {
        installed: true,
        stylePresent: true,
        themeId: theme.theme.id,
        version: theme.theme.version,
      };
      renderers = [installed, installed];
      return passingTargets();
    },
    removeTheme: async () => {
      calls.push(["removeTheme"]);
      renderers = [nativeRenderer, nativeRenderer];
      return [{ result: true }];
    },
    verifyTheme: async () => assert.fail("native state must not verify a theme"),
  });
  const restoration = [];

  await transaction.runFixture({
    fixtureTheme,
    audit: async () => undefined,
    onRestoration: (status) => restoration.push(status),
  });

  assert.deepEqual(calls, [
    ["applyTheme", "fixture-theme"],
    ["removeTheme"],
  ]);
  assert.deepEqual(renderers, [nativeRenderer, nativeRenderer]);
  assert.deepEqual(restoration, [{ status: "Pass", original: "native" }]);
});

test("reapplies a stored intended theme when every renderer target is initially native", async () => {
  const app = themedTransaction({
    readRendererState: async () => nativeRenderer,
  });

  await app.transaction.runFixture({
    fixtureTheme,
    audit: async () => undefined,
    onRestoration: () => undefined,
  });

  assert.deepEqual(
    app.calls.filter(([name]) => name === "applyTheme"),
    [
      ["applyTheme", "fixture-theme"],
      ["applyTheme", "original-theme"],
    ],
  );
});

test("restores the original theme after fixture application throws mid-mutation", async () => {
  let renderer = installedRenderer;
  const calls = [];
  const transaction = createPrivateQaThemeTransaction({
    readStoredState: async () => catalogState,
    loadStoredTheme: async () => originalTheme,
    readRendererState: async () => renderer,
    applyTheme: async (theme) => {
      calls.push(["applyTheme", theme.theme.id]);
      renderer = {
        installed: true,
        stylePresent: true,
        themeId: theme.theme.id,
        version: theme.theme.version,
      };
      if (theme === fixtureTheme) throw new Error("fixture apply failed");
      return passingTargets();
    },
    removeTheme: async () => assert.fail("stored theme must be reapplied"),
    verifyTheme: async (theme) => (
      renderer.themeId === theme.theme.id ? passingTargets() : [{ result: { pass: false } }]
    ),
  });
  const restoration = [];

  await assert.rejects(
    transaction.runFixture({
      fixtureTheme,
      audit: async () => assert.fail("audit must not run"),
      onRestoration: (status) => restoration.push(status),
    }),
    /fixture apply failed/u,
  );

  assert.deepEqual(calls, [
    ["applyTheme", "fixture-theme"],
    ["applyTheme", "original-theme"],
  ]);
  assert.deepEqual(renderer, installedRenderer);
  assert.deepEqual(restoration, [{ status: "Pass", original: "theme" }]);
});

test("fails the transaction and never reports Pass when restoration verification fails", async () => {
  let verifyCount = 0;
  const app = themedTransaction({
    verifyTheme: async () => {
      verifyCount += 1;
      return verifyCount === 1 ? passingTargets() : [{ result: { pass: false } }];
    },
  });
  const restoration = [];

  await assert.rejects(
    app.transaction.runFixture({
      fixtureTheme,
      audit: async () => undefined,
      onRestoration: (status) => restoration.push(status),
    }),
    /Original theme restoration verification failed/u,
  );

  assert.equal(restoration.length, 1);
  assert.equal(restoration[0].status, "Fail");
  assert.notEqual(restoration[0].status, "Pass");
});

test("fails closed before fixture apply when stored and renderer themes disagree", async () => {
  let fixtureApplied = false;
  const app = themedTransaction({
    verifyTheme: async () => [{ result: { pass: false } }],
    applyTheme: async () => {
      fixtureApplied = true;
      return passingTargets();
    },
  });

  await assert.rejects(
    app.transaction.runFixture({
      fixtureTheme,
      audit: async () => undefined,
      onRestoration: () => undefined,
    }),
    /does not match the stored active theme/u,
  );
  assert.equal(fixtureApplied, false);
});

test("fails closed before fixture apply when unstored renderer state is not native", async () => {
  let fixtureApplied = false;
  const transaction = createPrivateQaThemeTransaction({
    readStoredState: async () => null,
    loadStoredTheme: async () => assert.fail("must not load"),
    readRendererState: async () => installedRenderer,
    applyTheme: async () => {
      fixtureApplied = true;
      return passingTargets();
    },
    removeTheme: async () => undefined,
    verifyTheme: async () => undefined,
  });

  await assert.rejects(
    transaction.runFixture({
      fixtureTheme,
      audit: async () => undefined,
      onRestoration: () => undefined,
    }),
    /cannot be restored without stored state/u,
  );
  assert.equal(fixtureApplied, false);
});

test("fails closed when any unstored renderer target is not native", async () => {
  let fixtureApplied = false;
  const transaction = createPrivateQaThemeTransaction({
    readStoredState: async () => null,
    loadStoredTheme: async () => assert.fail("must not load"),
    readRendererState: async () => [nativeRenderer, installedRenderer],
    applyTheme: async () => {
      fixtureApplied = true;
      return passingTargets();
    },
    removeTheme: async () => undefined,
    verifyTheme: async () => undefined,
  });

  await assert.rejects(
    transaction.runFixture({
      fixtureTheme,
      audit: async () => undefined,
      onRestoration: () => undefined,
    }),
    /cannot be restored without stored state/u,
  );
  assert.equal(fixtureApplied, false);
});

test("fails native restoration when any renderer target remains themed", async () => {
  let readCount = 0;
  const transaction = createPrivateQaThemeTransaction({
    readStoredState: async () => null,
    loadStoredTheme: async () => assert.fail("must not load"),
    readRendererState: async () => {
      readCount += 1;
      return readCount === 1
        ? [nativeRenderer, nativeRenderer]
        : [nativeRenderer, installedRenderer];
    },
    applyTheme: async () => passingTargets(),
    removeTheme: async () => [{ result: true }],
    verifyTheme: async () => assert.fail("native state must not verify a theme"),
  });
  const restoration = [];

  await assert.rejects(
    transaction.runFixture({
      fixtureTheme,
      audit: async () => undefined,
      onRestoration: (status) => restoration.push(status),
    }),
    /Native theme restoration verification failed/u,
  );
  assert.equal(restoration[0].status, "Fail");
});
