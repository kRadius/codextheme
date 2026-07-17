import { createInterface } from "node:readline/promises";

const MESSAGE = "Codex 需要重新打开才能完整应用主题。未发送的输入可能丢失。\n现在重新打开 Codex？[y/N] ";

export async function confirmRestart({ input = process.stdin, output = process.stdout } = {}) {
  if (!input?.isTTY || !output?.isTTY) return false;
  const readline = createInterface({ input, output });
  try {
    const answer = await readline.question(MESSAGE);
    return answer.trim().toLowerCase() === "y";
  } finally {
    readline.close();
  }
}
