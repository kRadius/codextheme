"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CodexMockup } from "./CodexMockup";
import { buildPrivateSkinForm, processBrowserImage, validateSourceFile } from "../lib/browser-image.mjs";
import { normalizePrivateSkinSettings } from "../lib/private-skin-schema.mjs";
import { deriveRecipeDefaults, deriveSkinTokens } from "../lib/private-skin-profile.mjs";
import { trackRecipeSelect, trackStudioEvent } from "../lib/analytics.mjs";
import { buildInstallCopy } from "../lib/install-copy.mjs";
import { createStudioAsyncCoordinator } from "../lib/studio-request-revision.mjs";

const SAMPLE = "/themes/crimson-eclipse/hero.jpg";

type Result = { command: string; expiresAt: string };
type RecipeId = "cinematic" | "glass" | "focus";
type ImageProfile = {
  primary: string;
  secondary: string;
  highlight: string;
  luminance: number;
  saturation: number;
  contrast: number;
  complexity: number;
  recommendedRecipe: RecipeId;
};
type SkinSettings = {
  recipe: RecipeId;
  visibility: number;
  overlay: number;
  blur: number;
  zoom: number;
  positionX: number;
  positionY: number;
};
type AdjustableSetting = Exclude<keyof SkinSettings, "recipe">;

const SAMPLE_PROFILE: ImageProfile = Object.freeze({
  primary: "#741d2d",
  secondary: "#2f1821",
  highlight: "#db6f7c",
  luminance: 27,
  saturation: 52,
  contrast: 54,
  complexity: 46,
  recommendedRecipe: "cinematic",
});

const RECIPES = Object.freeze([
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Strong contrast and cinematic depth.",
  },
  {
    id: "glass",
    label: "Glass",
    description: "Lighter glass surfaces keep calm artwork visible.",
  },
  {
    id: "focus",
    label: "Focus",
    description: "Opaque work surfaces quiet bright or busy images.",
  },
] satisfies ReadonlyArray<{ id: RecipeId; label: string; description: string }>);

function RecipeCard({
  recipe,
  profile,
  position,
  selected,
  recommended,
  disabled,
  onSelect,
}: {
  recipe: (typeof RECIPES)[number];
  profile: ImageProfile;
  position: Pick<SkinSettings, "positionX" | "positionY">;
  selected: boolean;
  recommended: boolean;
  disabled: boolean;
  onSelect: (id: RecipeId) => void;
}) {
  const recipeSettings = deriveRecipeDefaults(profile, recipe.id, position);
  const tokens = deriveSkinTokens(profile, recipeSettings);
  const swatchStyle = {
    "--recipe-primary": profile.primary,
    "--recipe-highlight": profile.highlight,
    "--recipe-accent": tokens.accent,
    "--recipe-accent-soft": tokens.accentSoft,
    "--recipe-surface": tokens.surface,
    "--recipe-surface-raised": tokens.surfaceRaised,
    "--recipe-visibility": tokens.visibility / 100,
    "--recipe-overlay": tokens.overlay / 100,
    "--recipe-art-blur": `${tokens.blur}px`,
    "--recipe-art-zoom": tokens.zoom / 100,
    "--recipe-saturation": tokens.saturation / 100,
    "--recipe-contrast": tokens.imageContrast / 100,
    "--recipe-sidebar-alpha": `${tokens.sidebarAlpha}%`,
    "--recipe-main-alpha": `${tokens.mainAlpha}%`,
    "--recipe-composer-alpha": `${tokens.composerAlpha}%`,
    "--recipe-sidebar-blur": `${tokens.sidebarBlur}px`,
    "--recipe-main-blur": `${tokens.mainBlur}px`,
    "--recipe-composer-blur": `${tokens.composerBlur}px`,
    "--recipe-border-alpha": `${tokens.borderAlpha}%`,
    "--recipe-radius": `${tokens.radius}px`,
    "--recipe-shadow": tokens.shadow,
  } as CSSProperties;

  return (
    <button
      type="button"
      className="recipe-card"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(recipe.id)}
    >
      <span className="recipe-swatch" aria-hidden="true" style={swatchStyle}>
        <i className="recipe-art" />
        <i className="recipe-backdrop" />
        <i className="recipe-material-sidebar" />
        <i className="recipe-material-main" />
        <i className="recipe-material-composer" />
      </span>
      <span className="recipe-card-copy">
        <b>{recipe.label}</b>
        <small>{recipe.description}</small>
      </span>
      {recommended && <em>Recommended for this image</em>}
    </button>
  );
}

export function CustomSkinStudio() {
  const [status, setStatus] = useState<"sample" | "processing" | "editing" | "creating" | "ready" | "error">("sample");
  const [mode, setMode] = useState<"home" | "session">("home");
  const [image, setImage] = useState<{ blob: Blob; url: string; profile: ImageProfile } | null>(null);
  const [settings, setSettings] = useState<SkinSettings>(() => deriveRecipeDefaults(SAMPLE_PROFILE, "cinematic"));
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [asyncCoordinator] = useState(createStudioAsyncCoordinator);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (image?.url.startsWith("blob:")) URL.revokeObjectURL(image.url); }, [image]);

  async function selectFile(file?: File) {
    if (!file) return;
    const processingRevision = asyncCoordinator.beginImage();
    setResult(null);
    setStatus("processing");
    setMessage("");
    const validation = validateSourceFile(file);
    if (!validation.ok) {
      asyncCoordinator.failImage(processingRevision);
      setStatus("error");
      setMessage(validation.error ?? "This image cannot be used.");
      trackStudioEvent("custom_create_error", file.size > 10_000_000 ? "upload_too_large" : "invalid_upload");
      return;
    }
    trackStudioEvent("custom_upload_selected");
    setMessage("Preparing your preview…");
    try {
      const processed = await processBrowserImage(file);
      if (!asyncCoordinator.commitImage(processingRevision)) {
        if (processed.url.startsWith("blob:")) URL.revokeObjectURL(processed.url);
        return;
      }
      const processedProfile = processed.profile as ImageProfile;
      setImage((current) => {
        if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
        return { ...processed, profile: processedProfile };
      });
      setSettings(deriveRecipeDefaults(processedProfile, processedProfile.recommendedRecipe));
      setResult(null);
      setStatus("editing");
      setMessage("");
      trackStudioEvent("custom_preview_ready");
    } catch (error) {
      if (!asyncCoordinator.failImage(processingRevision)) return;
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "This image could not be prepared.");
      trackStudioEvent("custom_create_error", "invalid_upload");
    }
  }

  function update(name: AdjustableSetting, value: number) {
    if (status === "processing") return;
    asyncCoordinator.invalidateCreate();
    setSettings((current) => normalizePrivateSkinSettings({ ...current, [name]: value }));
    setResult(null);
    setStatus("editing");
    setMessage("");
  }

  function selectRecipe(id: RecipeId) {
    if (status === "processing") return;
    asyncCoordinator.invalidateCreate();
    setSettings((current) => deriveRecipeDefaults(profile, id, current));
    setResult(null);
    setStatus("editing");
    setMessage("");
    trackRecipeSelect(id, id === profile.recommendedRecipe);
  }

  function resetAutomaticSettings() {
    if (status === "processing") return;
    asyncCoordinator.invalidateCreate();
    setSettings((current) => deriveRecipeDefaults(profile, current.recipe, current));
    setResult(null);
    setStatus("editing");
    setMessage("");
  }

  async function createSkin() {
    if (!image || status === "processing") return;
    const requestRevision = asyncCoordinator.beginCreate();
    setStatus("creating");
    setMessage("");
    try {
      const response = await fetch("/api/private-skins", {
        method: "POST",
        body: buildPrivateSkinForm({ image: image.blob, settings }),
      });
      if (!asyncCoordinator.isCurrentCreate(requestRevision)) return;
      const body = await response.json();
      if (!asyncCoordinator.isCurrentCreate(requestRevision)) return;
      if (!response.ok || typeof body?.command !== "string" || typeof body?.expiresAt !== "string") {
        throw new Error(body?.error === "upload_too_large"
          ? "The processed image is still too large. Try another image."
          : "The private skin could not be created. Try again.");
      }
      setResult({ command: body.command, expiresAt: body.expiresAt });
      setStatus("ready");
      trackStudioEvent("custom_create_success");
    } catch (error) {
      if (!asyncCoordinator.isCurrentCreate(requestRevision)) return;
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

  const profile = image?.profile ?? SAMPLE_PROFILE;
  const imageUrl = image?.url ?? SAMPLE;
  const canEdit = Boolean(image);

  return (
    <section className="studio" id="create" aria-labelledby="studio-title">
      <div className="studio-copy">
        <p className="eyebrow"><span /> CUSTOM CODEX SKIN GENERATOR</p>
        <h1 id="studio-title">Turn any image into a Codex skin.</h1>
        <p className="studio-lead">Upload an image, choose a complete visual system, and apply the finished Codex skin with one command.</p>
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

        {canEdit && <>
          <fieldset className="studio-recipes">
            <legend>Skin style</legend>
            <div className="recipe-grid">
              {RECIPES.map((recipe) => <RecipeCard
                key={recipe.id}
                recipe={recipe}
                profile={profile}
                position={settings}
                selected={settings.recipe === recipe.id}
                recommended={profile.recommendedRecipe === recipe.id}
                disabled={status === "processing"}
                onSelect={selectRecipe}
              />)}
            </div>
          </fieldset>
          <details className="studio-advanced">
            <summary>Advanced adjustments</summary>
            <div className="studio-controls" aria-label="Skin adjustments">
              <label><span>Background visibility <output>{settings.visibility}%</output></span><input disabled={status === "processing"} type="range" min="20" max="100" value={settings.visibility} onChange={(event) => update("visibility", Number(event.target.value))} /></label>
              <label><span>Overlay darkness <output>{settings.overlay}%</output></span><input disabled={status === "processing"} type="range" min="0" max="80" value={settings.overlay} onChange={(event) => update("overlay", Number(event.target.value))} /></label>
              <label><span>Blur <output>{settings.blur}px</output></span><input disabled={status === "processing"} type="range" min="0" max="16" value={settings.blur} onChange={(event) => update("blur", Number(event.target.value))} /></label>
              <label><span>Zoom <output>{settings.zoom}%</output></span><input disabled={status === "processing"} type="range" min="100" max="160" value={settings.zoom} onChange={(event) => update("zoom", Number(event.target.value))} /></label>
              <div className="position-pair"><span>Image position</span><label><small>X</small><input disabled={status === "processing"} aria-label="Horizontal image position" type="range" min="0" max="100" value={settings.positionX} onChange={(event) => update("positionX", Number(event.target.value))} /></label><label><small>Y</small><input disabled={status === "processing"} aria-label="Vertical image position" type="range" min="0" max="100" value={settings.positionY} onChange={(event) => update("positionY", Number(event.target.value))} /></label></div>
              <button className="studio-reset" type="button" disabled={status === "processing"} onClick={resetAutomaticSettings}>Reset automatic settings</button>
            </div>
          </details>
        </>}

        <div className="studio-action">
          {canEdit ? <button className="primary-link" type="button" disabled={status === "creating" || status === "processing"} onClick={() => void createSkin()}>{status === "processing" ? "Preparing preview…" : status === "creating" ? "Creating private skin…" : "Create private skin"}<span>→</span></button> : <button className="text-link studio-sample-link" type="button" onClick={() => input.current?.click()}>Replace the sample with your image ↑</button>}
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

      <CodexMockup imageUrl={imageUrl} profile={profile} settings={settings} mode={mode} onModeChange={setMode} />
    </section>
  );
}
