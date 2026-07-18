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
