import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testMatch: ["listing-media.spec.ts", "plugin.spec.ts"],
  outputDir: "test-results/listing",
  use: { baseURL: "http://127.0.0.1:3002", trace: "retain-on-failure" },
  projects: [{ name: "listing-chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node tests/e2e/partner-fixture.mjs", url: "http://127.0.0.1:3216/health", reuseExistingServer: false },
    { command: "pnpm dev --hostname 127.0.0.1 --port 3002", url: "http://127.0.0.1:3002/viewer", reuseExistingServer: false, timeout: 120000,
      env: { NEXT_DIST_DIR: ".next-e2e-listing", HALLWYL_VIEWER_ORIGIN: "http://127.0.0.1:3216", ARCHWALK_API_BASE: "http://127.0.0.1:3216", ARCHWALK_APP_ORIGIN: "http://127.0.0.1:3216", AW360_API_KEY: "listing-browser-secret-sentinel" } },
    { command: "pnpm dev --hostname 127.0.0.1 --port 3003", url: "http://127.0.0.1:3003/viewer", reuseExistingServer: false, timeout: 120000,
      env: { NEXT_DIST_DIR: ".next-e2e-photo", ARCHWALK_API_BASE: "http://127.0.0.1:3216", ARCHWALK_APP_ORIGIN: "http://127.0.0.1:3216", AW360_API_KEY: "" } },
  ],
});
