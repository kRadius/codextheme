import assert from "node:assert/strict";
import test from "node:test";

const analyticsModuleUrl = new URL("../app/lib/analytics.mjs", import.meta.url);

async function loadAnalytics() {
  return import(analyticsModuleUrl).catch(() => null);
}

test("install copy tracking sends the selected theme without personal data", async () => {
  const analytics = await loadAnalytics();
  assert.ok(analytics, "the analytics module should exist");

  const calls = [];
  const sent = analytics.trackInstallCopy("cathedral-nocturne", {
    gtag: (...args) => calls.push(args),
  });

  assert.equal(sent, true);
  assert.deepEqual(calls, [
    [
      "event",
      "copy_install_command",
      { theme_slug: "cathedral-nocturne" },
    ],
  ]);
});

test("install copy tracking never interferes when analytics is blocked", async () => {
  const analytics = await loadAnalytics();
  assert.ok(analytics, "the analytics module should exist");
  assert.equal(analytics.trackInstallCopy("cathedral-nocturne", {}), false);
});

test("studio tracking accepts only coarse events and normalized errors", async () => {
  const analytics = await loadAnalytics();
  const calls = [];
  const target = { gtag: (...args) => calls.push(args) };

  assert.equal(analytics.trackStudioEvent("custom_preview_ready", undefined, target), true);
  assert.equal(analytics.trackStudioEvent("custom_create_error", "invalid_upload", target), true);
  assert.equal(analytics.trackStudioEvent("filename.jpg", "private-id", target), false);
  assert.deepEqual(calls, [
    ["event", "custom_preview_ready", {}],
    ["event", "custom_create_error", { error_category: "invalid_upload" }],
  ]);
});
