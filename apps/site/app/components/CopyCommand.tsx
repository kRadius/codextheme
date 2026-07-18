"use client";

import { useRef, useState } from "react";
import { trackInstallCopy } from "../lib/analytics.mjs";

export function CopyCommand({ command, themeSlug }: { command: string; themeSlug: string }) {
  const [label, setLabel] = useState("复制命令");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    await navigator.clipboard.writeText(command);
    trackInstallCopy(themeSlug);
    setLabel("已复制，去 Terminal 粘贴并回车");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLabel("复制命令"), 2500);
  }

  return <button className="copy-button" type="button" data-copy-command data-command={command} data-theme-slug={themeSlug} onClick={copy}>{label}<span aria-hidden="true">⌘C</span></button>;
}
