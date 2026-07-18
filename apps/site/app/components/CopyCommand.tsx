"use client";

import { useRef, useState } from "react";
import { trackInstallCopy } from "../lib/analytics.mjs";

export function CopyCommand({ command, themeSlug }: { command: string; themeSlug: string }) {
  const [label, setLabel] = useState("Copy command");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    await navigator.clipboard.writeText(command);
    trackInstallCopy(themeSlug);
    setLabel("Copied — paste it into Terminal");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLabel("Copy command"), 2500);
  }

  return <button className="copy-button" type="button" data-copy-command data-command={command} data-theme-slug={themeSlug} onClick={copy}>{label}<span aria-hidden="true">⌘C</span></button>;
}
