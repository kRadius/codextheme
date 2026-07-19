"use client";

import { useEffect, useRef, useState } from "react";
import { CodexMockup } from "./CodexMockup";
import { buildPrivateSkinForm, processBrowserImage, validateSourceFile } from "../lib/browser-image.mjs";
import { DEFAULT_PRIVATE_SKIN_SETTINGS, normalizePrivateSkinSettings } from "../lib/private-skin-schema.mjs";
import { trackStudioEvent } from "../lib/analytics.mjs";
import { buildInstallCopy } from "../lib/install-copy.mjs";

const SAMPLE = "/themes/crimson-eclipse/hero.jpg";
const SAMPLE_PALETTE = { accent: "#d95764", surface: "#170d10", ink: "#f4f1eb" };

type Result = { command: string; expiresAt: string };
type SkinSettings = {
  visibility: number;
  overlay: number;
  blur: number;
  zoom: number;
  positionX: number;
  positionY: number;
};

export function CustomSkinStudio() {
  const [status, setStatus] = useState<"sample" | "editing" | "creating" | "ready" | "error">("sample");
  const [mode, setMode] = useState<"home" | "session">("home");
  const [image, setImage] = useState<{ blob: Blob; url: string; palette: typeof SAMPLE_PALETTE } | null>(null);
  const [settings, setSettings] = useState<SkinSettings>({ ...DEFAULT_PRIVATE_SKIN_SETTINGS });
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (image?.url.startsWith("blob:")) URL.revokeObjectURL(image.url); }, [image]);

  async function selectFile(file?: File) {
    if (!file) return;
    const validation = validateSourceFile(file);
    if (!validation.ok) {
      setStatus("error");
      setMessage(validation.error ?? "This image cannot be used.");
      trackStudioEvent("custom_create_error", file.size > 10_000_000 ? "upload_too_large" : "invalid_upload");
      return;
    }
    trackStudioEvent("custom_upload_selected");
    setMessage("Preparing your preview…");
    try {
      const processed = await processBrowserImage(file);
      setImage((current) => {
        if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
        return processed;
      });
      setSettings({ ...DEFAULT_PRIVATE_SKIN_SETTINGS });
      setResult(null);
      setStatus("editing");
      setMessage("");
      trackStudioEvent("custom_preview_ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "This image could not be prepared.");
      trackStudioEvent("custom_create_error", "invalid_upload");
    }
  }

  function update(name: keyof typeof settings, value: number) {
    setSettings((current) => normalizePrivateSkinSettings({ ...current, [name]: value }));
  }

  async function createSkin() {
    if (!image) return;
    setStatus("creating");
    setMessage("");
    try {
      const response = await fetch("/api/private-skins", {
        method: "POST",
        body: buildPrivateSkinForm({ image: image.blob, settings }),
      });
      const body = await response.json();
      if (!response.ok || typeof body?.command !== "string" || typeof body?.expiresAt !== "string") {
        throw new Error(body?.error === "upload_too_large"
          ? "The processed image is still too large. Try another image."
          : "The private skin could not be created. Try again.");
      }
      setResult({ command: body.command, expiresAt: body.expiresAt });
      setStatus("ready");
      trackStudioEvent("custom_create_success");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The private skin could not be created.");
      trackStudioEvent("custom_create_error", "service_unavailable");
    }
  }

  async function copyInstall(mode: "agent" | "terminal") {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildInstallCopy(result.command, mode));
      setMessage(mode === "agent"
        ? "Copied — paste into a local Codex task."
        : "Terminal command copied.");
      trackStudioEvent("custom_command_copy");
    } catch {
      setMessage("Clipboard unavailable. Select the command above and copy it manually.");
    }
  }

  const palette = image?.palette ?? SAMPLE_PALETTE;
  const imageUrl = image?.url ?? SAMPLE;
  const canEdit = Boolean(image);

  return (
    <section className="studio" id="create" aria-labelledby="studio-title">
      <div className="studio-copy">
        <p className="eyebrow"><span /> CUSTOM CODEX SKIN GENERATOR</p>
        <h1 id="studio-title">Turn any image into a Codex skin.</h1>
        <p className="studio-lead">Upload an image, see it inside a real Codex-shaped preview, and apply the finished skin with one command. This Codex theme generator keeps the preview local until you create it.</p>
        <div className="studio-trust"><span>No account</span><span>Private temporary upload</span><span>24-hour link</span></div>

        <div
          className={`studio-drop ${canEdit ? "has-image" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }}
        >
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectFile(event.target.files?.[0])} />
          <button className="studio-upload" type="button" onClick={() => input.current?.click()}>
            <span>{canEdit ? "Choose another image" : "Choose an image"}</span><b>JPG · PNG · WEBP / 10 MB</b>
          </button>
          {!canEdit && <p>or drop it here</p>}
        </div>

        {canEdit && <div className="studio-controls" aria-label="Skin adjustments">
          <label><span>Background visibility <output>{settings.visibility}%</output></span><input type="range" min="20" max="100" value={settings.visibility} onChange={(event) => update("visibility", Number(event.target.value))} /></label>
          <label><span>Overlay darkness <output>{settings.overlay}%</output></span><input type="range" min="0" max="80" value={settings.overlay} onChange={(event) => update("overlay", Number(event.target.value))} /></label>
          <label><span>Blur <output>{settings.blur}px</output></span><input type="range" min="0" max="16" value={settings.blur} onChange={(event) => update("blur", Number(event.target.value))} /></label>
          <label><span>Zoom <output>{settings.zoom}%</output></span><input type="range" min="100" max="160" value={settings.zoom} onChange={(event) => update("zoom", Number(event.target.value))} /></label>
          <div className="position-pair"><span>Image position</span><label><small>X</small><input aria-label="Horizontal image position" type="range" min="0" max="100" value={settings.positionX} onChange={(event) => update("positionX", Number(event.target.value))} /></label><label><small>Y</small><input aria-label="Vertical image position" type="range" min="0" max="100" value={settings.positionY} onChange={(event) => update("positionY", Number(event.target.value))} /></label></div>
          <button className="studio-reset" type="button" onClick={() => setSettings({ ...DEFAULT_PRIVATE_SKIN_SETTINGS })}>Reset automatic settings</button>
        </div>}

        <div className="studio-action">
          {canEdit ? <button className="primary-link" type="button" disabled={status === "creating"} onClick={() => void createSkin()}>{status === "creating" ? "Creating private skin…" : "Create private skin"}<span>→</span></button> : <button className="text-link studio-sample-link" type="button" onClick={() => input.current?.click()}>Replace the sample with your image ↑</button>}
          <p>Nothing uploads until you create the skin.</p>
        </div>

        {result && <div className="studio-result" aria-live="polite">
          <p>PRIVATE SKIN READY · LINK EXPIRES {new Date(result.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <code>{result.command}</code>
          <div className="install-copy-actions">
            <button className="copy-button" type="button" onClick={() => void copyInstall("agent")}>Copy &amp; apply with Codex <span>⌘C</span></button>
            <button className="terminal-copy" type="button" onClick={() => void copyInstall("terminal")}>Copy Terminal command</button>
          </div>
          <p className="studio-private-note">This skin stays out of the public gallery. Pasting it into an Agent sends the temporary ID to that provider; use Terminal to keep the ID out of an Agent conversation.</p>
        </div>}
        {message && <p className={`studio-message ${status === "error" ? "is-error" : ""}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
      </div>

      <CodexMockup imageUrl={imageUrl} settings={settings} palette={palette} mode={mode} onModeChange={setMode} />
    </section>
  );
}
