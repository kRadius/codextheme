import os from "node:os";
import path from "node:path";

export function defaultHistoricalCodexBackupPath({
  platform = process.platform,
  home = os.homedir(),
  env = process.env,
  stateRoot = null,
} = {}) {
  let root = stateRoot;
  if (!root && platform === "darwin") root = path.join(home, "Library", "Application Support", "CodeDrobe");
  if (!root && platform === "win32") root = path.join(env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "CodeDrobe");
  if (!root) root = path.join(env.XDG_STATE_HOME || path.join(home, ".local", "state"), "codedrobe", "codex");
  return path.join(root, "config.before-codedrobe.toml");
}
