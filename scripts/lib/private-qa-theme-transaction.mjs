function allTargetsPassed(results) {
  return (
    Array.isArray(results)
    && results.length > 0
    && results.every((entry) => entry?.result?.pass === true)
  );
}

function sameStoredState(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function rendererStates(value) {
  return Array.isArray(value) ? value : [value];
}

function allRenderersNative(value) {
  const states = rendererStates(value);
  return states.length > 0 && states.every((state) => (
    state?.installed === false
    && state?.stylePresent === false
    && (state?.themeId === null || state?.themeId === undefined)
  ));
}

export function createPrivateQaThemeTransaction({
  readStoredState,
  loadStoredTheme,
  readRendererState,
  applyTheme,
  removeTheme,
  verifyTheme,
}) {
  async function captureOriginal() {
    const storedState = await readStoredState();
    const rendererState = await readRendererState();

    if (storedState === null) {
      if (!allRenderersNative(rendererState)) {
        throw new Error(
          "The active renderer cannot be restored without stored state; refusing fixture mutation.",
        );
      }
      return { kind: "native", storedState: null };
    }

    const targetTheme = await loadStoredTheme(storedState);
    if (!allRenderersNative(rendererState)) {
      const verification = await verifyTheme(targetTheme);
      if (!allTargetsPassed(verification)) {
        throw new Error(
          "The current renderer does not match the stored active theme; refusing fixture mutation.",
        );
      }
    }

    return {
      kind: "theme",
      storedState,
      targetTheme,
    };
  }

  async function restoreOriginal(snapshot) {
    if (snapshot.kind === "native") {
      await removeTheme();
      const rendererState = await readRendererState();
      if (!allRenderersNative(rendererState)) {
        throw new Error("Native theme restoration verification failed.");
      }
      const storedState = await readStoredState();
      if (storedState !== null) {
        throw new Error("Native theme restoration changed the stored theme state.");
      }
      return;
    }

    const applied = await applyTheme(snapshot.targetTheme);
    if (!allTargetsPassed(applied)) {
      throw new Error("Original theme restoration application failed.");
    }
    const verification = await verifyTheme(snapshot.targetTheme);
    if (!allTargetsPassed(verification)) {
      throw new Error("Original theme restoration verification failed.");
    }
    const storedState = await readStoredState();
    if (!sameStoredState(storedState, snapshot.storedState)) {
      throw new Error("Original theme restoration changed the stored theme state.");
    }
  }

  async function runFixture({
    fixtureTheme,
    audit,
    onBeforeFixtureApply,
    onSnapshot,
    onRestoration,
  }) {
    const snapshot = await captureOriginal();
    await onSnapshot?.({
      original: snapshot.kind,
      storedStatePresent: snapshot.storedState !== null,
    });
    await onBeforeFixtureApply?.();

    let operationError;
    try {
      const applied = await applyTheme(fixtureTheme);
      if (!allTargetsPassed(applied)) {
        throw new Error("Fixture theme application verification failed.");
      }
      return await audit(applied);
    } catch (error) {
      operationError = error;
      throw error;
    } finally {
      try {
        await restoreOriginal(snapshot);
        await onRestoration?.({ status: "Pass", original: snapshot.kind });
      } catch (restorationError) {
        await onRestoration?.({
          status: "Fail",
          original: snapshot.kind,
          error: restorationError.message,
        });
        if (operationError) {
          operationError.themeRestorationError = restorationError;
        } else {
          throw restorationError;
        }
      }
    }
  }

  return { runFixture };
}
