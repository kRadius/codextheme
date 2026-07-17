#!/usr/bin/env node

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 4)) {
  console.error("E_NODE_VERSION: CodexTheme 需要 Node.js 22.4 或更高版本。");
  process.exitCode = 1;
} else {
  const { run } = await import("./main.mjs");
  process.exitCode = await run(process.argv.slice(2));
}
