export const GA_MEASUREMENT_ID = "G-YB7Y6G2FRP";

function sendEvent(target, name, parameters) {
  try {
    if (typeof target?.gtag !== "function") return false;
    target.gtag("event", name, parameters);
    return true;
  } catch {
    return false;
  }
}

/**
 * Track the highest-intent website conversion without collecting identity data.
 * Analytics failures must never block the clipboard action.
 *
 * @param {string} themeSlug
 * @param {{ gtag?: (...args: unknown[]) => void }} [target]
 * @returns {boolean}
 */
export function trackInstallCopy(themeSlug, target = globalThis) {
  return sendEvent(target, "copy_install_command", {
    theme_slug: themeSlug,
  });
}

const STUDIO_EVENTS = new Set([
  "custom_upload_selected",
  "custom_preview_ready",
  "custom_create_success",
  "custom_command_copy",
  "custom_create_error",
]);
const ERROR_CATEGORIES = new Set([
  "invalid_upload",
  "image_too_small",
  "upload_too_large",
  "network",
  "service_unavailable",
]);
const RECIPE_IDS = new Set(["cinematic", "glass", "focus"]);

export function trackStudioEvent(name, errorCategory, target = globalThis) {
  if (!STUDIO_EVENTS.has(name)) return false;
  const parameters = name === "custom_create_error" && ERROR_CATEGORIES.has(errorCategory)
    ? { error_category: errorCategory }
    : {};
  return sendEvent(target, name, parameters);
}

export function trackRecipeSelect(recipe, recommended, target = globalThis) {
  if (!RECIPE_IDS.has(recipe) || typeof recommended !== "boolean") return false;
  return sendEvent(target, "custom_recipe_select", {
    recipe,
    recommended: recommended ? "yes" : "no",
  });
}
