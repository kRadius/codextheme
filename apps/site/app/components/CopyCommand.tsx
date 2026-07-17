"use client";

import { useRef, useState } from "react";

export function CopyCommand({ command }: { command: string }) {
  const [label, setLabel] = useState("复制命令");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setLabel("已复制，去 Terminal 粘贴并回车");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLabel("复制命令"), 2500);
  }

  return <button className="copy-button" type="button" data-copy-command data-command={command} onClick={copy}>{label}<span aria-hidden="true">⌘C</span></button>;
}
