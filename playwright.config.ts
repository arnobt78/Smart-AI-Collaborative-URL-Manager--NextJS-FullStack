// Playwright uses E2E_DATABASE_URL, or DATABASE_URL when E2E_ALLOW_SHARED_DB=1
// (demo/showcase only — never enable against real production user data).
import { defineConfig } from "@playwright/test";

const allowSharedDb = process.env.E2E_ALLOW_SHARED_DB === "1";
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ||
  (allowSharedDb ? process.env.DATABASE_URL : undefined);

if (!e2eDatabaseUrl) {
  throw new Error(
    "Set E2E_DATABASE_URL, or DATABASE_URL with E2E_ALLOW_SHARED_DB=1 for demo DB runs.",
  );
}
if (
  !allowSharedDb &&
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL === e2eDatabaseUrl
) {
  throw new Error(
    "E2E_DATABASE_URL must not equal DATABASE_URL unless E2E_ALLOW_SHARED_DB=1.",
  );
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL,
    storageState: "e2e/.auth/owner.json",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_URL: e2eDatabaseUrl,
      E2E_DATABASE_URL: e2eDatabaseUrl,
      ...(allowSharedDb ? { E2E_ALLOW_SHARED_DB: "1" as const } : {}),
    },
  },
});
