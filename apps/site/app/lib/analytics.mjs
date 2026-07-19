export const GA_MEASUREMENT_ID = "G-YB7Y6G2FRP";

/**
 * Track the highest-intent website conversion without collecting identity data.
 * Analytics failures must never block the clipboard action.
 *
 * @param {string} themeSlug
 * @param {{ gtag?: (...args: unknown[]) => void }} [target]
 * @returns {boolean}
 */
export function trackInstallCopy(themeSlug, target = globalThis) {
  if (typeof target?.gtag !== "function") return false;

  target.gtag("event", "copy_install_command", {
    theme_slug: themeSlug,
  });
  return true;
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

export function trackStudioEvent(name, errorCategory, target = globalThis) {
  if (!STUDIO_EVENTS.has(name) || typeof target?.gtag !== "function") return false;
  const parameters = name === "custom_create_error" && ERROR_CATEGORIES.has(errorCategory)
    ? { error_category: errorCategory }
    : {};
  target.gtag("event", name, parameters);
  return true;
}
