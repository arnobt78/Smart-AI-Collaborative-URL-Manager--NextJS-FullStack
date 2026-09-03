// REQ-0053: E2E never falls back to a developer or production database.
import { defineConfig } from "@playwright/test";

const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
if (!e2eDatabaseUrl) {
  throw new Error("E2E_DATABASE_URL is required for Playwright and must point to an isolated database.");
}
if (process.env.DATABASE_URL && process.env.DATABASE_URL === e2eDatabaseUrl) {
  throw new Error("E2E_DATABASE_URL must not equal DATABASE_URL.");
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    storageState: "e2e/.auth/owner.json",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl, DIRECT_URL: e2eDatabaseUrl },
  },
});
