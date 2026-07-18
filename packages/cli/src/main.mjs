import { CATALOG, getCatalogEntry } from "./catalog.mjs";
import { applyTheme, CliError, reapplyTheme, restoreTheme } from "./lifecycle.mjs";
import { confirmRestart } from "./prompt.mjs";
import { runtime as productionRuntime } from "./runtime.mjs";
import { createStateStore } from "./state.mjs";

export const VERSION = "0.1.1";
const REAPPLY = "npx --yes @codextheme/cli@0.1.1 reapply";
const RESTORE = "npx --yes @codextheme/cli@0.1.1 restore";

const HELP = `CodexTheme ${VERSION}

用法：
  codextheme apply <theme>
  codextheme reapply
  codextheme restore

首发主题：${Object.keys(CATALOG).join(", ")}
`;

function usage(message) {
  return new CliError("E_USAGE", message);
}

function safePublicError(error) {
  if (error?.code === "E_USAGE") return { code: "E_USAGE", message: error.message, exitCode: 2 };
  const allowed = new Set([
    "E_NODE_VERSION",
    "E_PLATFORM",
    "E_CODEX_NOT_FOUND",
    "E_RESTART_REQUIRED",
    "E_DOM_INCOMPATIBLE",
    "E_CORE_VERIFY",
    "E_RESTORE_FAILED",
  ]);
  if (allowed.has(error?.code)) return { code: error.code, message: error.message, exitCode: 1 };
  return { code: "E_DOM_INCOMPATIBLE", message: "CodexTheme 未能完成本次操作。", exitCode: 1 };
}

function validateCommand(argv) {
  if (argv.length === 2 && argv[0] === "apply") {
    const theme = getCatalogEntry(argv[1]);
    if (!theme) throw usage("未知主题。请从 codextheme.tech 复制完整命令。");
    return { command: "apply", slug: theme.slug };
  }
  if (argv.length === 1 && argv[0] === "reapply") return { command: "reapply" };
  if (argv.length === 1 && argv[0] === "restore") return { command: "restore" };
  throw usage("参数无效。运行 codextheme --help 查看用法。");
}

export async function run(argv, dependencies = {}) {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;

  if (argv.length === 1 && ["--version", "-v"].includes(argv[0])) {
    stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (!argv.length || (argv.length === 1 && ["--help", "-h"].includes(argv[0]))) {
    stdout.write(HELP);
    return 0;
  }

  try {
    const parsed = validateCommand(argv);
    if ((dependencies.platform ?? process.platform) !== "darwin") {
      throw new CliError("E_PLATFORM", "0.1.1 首发版仅支持 macOS 上的 Codex Desktop。");
    }
    const services = {
      runtime: dependencies.runtime ?? productionRuntime,
      stateStore: dependencies.stateStore ?? createStateStore(),
      promptRestart: dependencies.promptRestart ?? (() => confirmRestart()),
      now: dependencies.now ?? (() => new Date()),
    };

    if (parsed.command === "apply") {
      const result = await applyTheme({ ...services, slug: parsed.slug });
      const name = result.theme.theme?.displayName?.split(" / ")[0] ?? getCatalogEntry(parsed.slug).name;
      stdout.write(`✓ ${name} 主题已应用并通过验证\n重开 Codex 后运行：${REAPPLY}\n恢复官方外观：${RESTORE}\n`);
    } else if (parsed.command === "reapply") {
      const result = await reapplyTheme(services);
      const name = result.theme.theme?.displayName?.split(" / ")[0] ?? "当前";
      stdout.write(`✓ ${name} 主题已重新应用并通过验证\n恢复官方外观：${RESTORE}\n`);
    } else {
      await restoreTheme(services);
      stdout.write("✓ 已恢复 Codex 官方外观\n");
    }
    return 0;
  } catch (error) {
    const safe = safePublicError(error);
    stderr.write(`${safe.code}: ${safe.message}\n`);
    return safe.exitCode;
  }
}
