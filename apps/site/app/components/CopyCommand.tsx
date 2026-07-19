"use client";

import { useState } from "react";
import { trackInstallCopy } from "../lib/analytics.mjs";
import { buildInstallCopy } from "../lib/install-copy.mjs";

export function CopyCommand({ command, themeSlug }: { command: string; themeSlug: string }) {
  const [message, setMessage] = useState("");

  async function copy(mode: "agent" | "terminal") {
    try {
      await navigator.clipboard.writeText(buildInstallCopy(command, mode));
      trackInstallCopy(themeSlug);
      setMessage(mode === "agent"
        ? "Copied — paste into a local Codex task."
        : "Terminal command copied.");
    } catch {
      setMessage("Clipboard unavailable. Select the command above and copy it manually.");
    }
  }

  return <div className="install-copy-wrap">
    <div className="install-copy-actions">
      <button className="copy-button" type="button" data-copy-command data-command={command} data-theme-slug={themeSlug} onClick={() => void copy("agent")}>Copy &amp; apply with Codex<span aria-hidden="true">⌘C</span></button>
      <button className="terminal-copy" type="button" data-copy-terminal onClick={() => void copy("terminal")}>Copy Terminal command</button>
    </div>
    {message && <p className="install-copy-status" role="status">{message}</p>}
  </div>;
}
