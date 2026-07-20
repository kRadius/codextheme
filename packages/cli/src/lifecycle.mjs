export class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CliError";
    this.code = code;
  }
}

function mappedError(error) {
  if (error instanceof CliError || String(error?.code ?? "").startsWith("E_")) return error;
  switch (error?.code) {
    case "CODEXTHEME_RESTART_REQUIRED":
      return new CliError("E_RESTART_REQUIRED", "需要得到你的确认后才能重新打开 Codex。");
    case "CODEXTHEME_DOM_INCOMPATIBLE":
      return new CliError("E_DOM_INCOMPATIBLE", "当前 Codex 界面结构与该主题暂不兼容。");
    case "CODEXTHEME_VERIFY_FAILED":
      return new CliError("E_CORE_VERIFY", "主题应用后的完整性验证失败，已尝试回滚。");
    default:
      return new CliError("E_DOM_INCOMPATIBLE", "Codex 主题运行时未能完成本次操作。");
  }
}

function isVerified(result) {
  return Array.isArray(result?.targets)
    && result.targets.length > 0
    && result.targets.every((target) => target.result?.pass === true);
}

async function requireRestartConsent(promptRestart) {
  if (!await promptRestart()) {
    throw new CliError("E_RESTART_REQUIRED", "未重新打开 Codex，主题没有被应用。");
  }
}

async function delegateRestart({ theme, nextState, restartHandoff }) {
  return {
    theme,
    handoff: await restartHandoff.schedule(nextState),
    appliedAt: null,
  };
}

async function applyResolvedTheme({ theme, nextState, runtime, stateStore, promptRestart, restartHandoff, now }) {
  let detection;
  try {
    detection = await runtime.detect();
  } catch (error) {
    throw mappedError(error);
  }
  if (!detection?.installed) {
    throw new CliError("E_CODEX_NOT_FOUND", "没有找到已安装的 Codex Desktop。");
  }

  let restartExisting = false;
  if (detection.running && !detection.ready) {
    await requireRestartConsent(promptRestart);
    if (restartHandoff) return delegateRestart({ theme, nextState, restartHandoff });
    restartExisting = true;
  }

  let result;
  try {
    result = await runtime.apply({ theme, restartExisting });
  } catch (error) {
    if (error?.code === "CODEXTHEME_RESTART_REQUIRED" && !restartExisting) {
      await requireRestartConsent(promptRestart);
      if (restartHandoff) return delegateRestart({ theme, nextState, restartHandoff });
      restartExisting = true;
      try {
        result = await runtime.apply({ theme, restartExisting });
      } catch (retryError) {
        throw mappedError(retryError);
      }
    } else {
      throw mappedError(error);
    }
  }

  if (!isVerified(result)) {
    throw new CliError("E_CORE_VERIFY", "主题应用后的完整性验证失败，未保存活动状态。");
  }

  const appliedAt = now().toISOString();
  await stateStore.write({ ...nextState, appliedAt });
  return { theme, result, appliedAt };
}

export async function applyTheme({ slug, runtime, stateStore, promptRestart, restartHandoff, now = () => new Date() }) {
  let theme;
  try {
    theme = await runtime.loadTheme(slug);
  } catch (error) {
    throw mappedError(error);
  }
  return applyResolvedTheme({
    theme,
    nextState: { schemaVersion: 2, source: "catalog", themeSlug: slug },
    runtime,
    stateStore,
    promptRestart,
    restartHandoff,
    now,
  });
}

export async function applyPrivateTheme({ bundle, cacheKey, runtime, stateStore, promptRestart, restartHandoff, now = () => new Date() }) {
  let theme;
  try {
    theme = await runtime.loadThemeBundle(bundle);
  } catch (error) {
    throw mappedError(error);
  }
  return applyResolvedTheme({
    theme,
    nextState: { schemaVersion: 2, source: "private", cacheKey },
    runtime,
    stateStore,
    promptRestart,
    restartHandoff,
    now,
  });
}

export async function reapplyTheme(options) {
  const state = await options.stateStore.read();
  if (!state) throw new CliError("E_USAGE", "没有可重新应用的活动主题，请先从主题页复制 apply 命令。");
  if (state.schemaVersion === 1 || state.source === "catalog") {
    return applyTheme({ ...options, slug: state.themeSlug });
  }
  if (state.schemaVersion !== 2 || state.source !== "private" || !options.cache) {
    throw new CliError("E_USAGE", "活动主题状态无效，请重新创建或应用主题。");
  }
  let bundle;
  try {
    bundle = JSON.parse(await options.cache.read(state.cacheKey));
  } catch (error) {
    if (String(error?.code ?? "").startsWith("E_")) throw error;
    throw new CliError("E_PRIVATE_CACHE", "无法安全读取本地私有主题缓存。");
  }
  return applyPrivateTheme({ ...options, bundle, cacheKey: state.cacheKey });
}

const RENDERER_ABSENT_CODES = new Set([
  "CODEXTHEME_TARGET_TIMEOUT",
  "ECONNREFUSED",
]);

export async function restoreTheme({ runtime, stateStore }) {
  let result;
  try {
    result = await runtime.restore();
  } catch {
    throw new CliError("E_RESTORE_FAILED", "无法完整恢复 Codex 官方外观，活动状态已保留。");
  }
  const rendererComplete = result?.renderer?.restored === true
    || RENDERER_ABSENT_CODES.has(result?.renderer?.code);
  const hostComplete = result?.host?.restored === true
    || result?.host?.reason === "missing-backup";
  if (!rendererComplete || !hostComplete) {
    throw new CliError("E_RESTORE_FAILED", "无法完整恢复 Codex 官方外观，活动状态已保留。");
  }
  await stateStore.remove();
  return result;
}
