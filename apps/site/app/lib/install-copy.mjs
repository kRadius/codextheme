const PINNED_INSTALL_COMMAND = /^npx --yes @codextheme\/cli@0\.2\.0 (?:apply [a-z0-9]+(?:-[a-z0-9]+)*|apply-private [a-z0-9]+\.[A-Za-z0-9_-]{32})$/;

const AGENT_INSTRUCTION = [
  "Run the following command exactly in my local macOS shell.",
  "Do not use any installed theme skill, substitute another package, or modify the command.",
  "Ask for approval only if required. After it finishes, report whether Codex needs to be reopened.",
].join("\n");

export function buildInstallCopy(command, mode) {
  if (typeof command !== "string" || !PINNED_INSTALL_COMMAND.test(command)) {
    throw new TypeError("Invalid pinned CodexTheme install command.");
  }
  if (mode === "terminal") return command;
  if (mode === "agent") return `${AGENT_INSTRUCTION}\n\n${command}`;
  throw new TypeError("Invalid install copy mode.");
}
