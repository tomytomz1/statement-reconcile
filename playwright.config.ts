import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL, trace: "on-first-retry" },
  webServer: {
    command: `pnpm exec next dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      APP_ENV: "test",
      E2E_MOCK_PAYMENTS: "1",
      RATE_LIMIT_PROVIDER: "memory",
      PARSER_DETERMINISTIC_ONLY: "1",
      PARSER_PROVIDER: "none",
      EXPORT_SEAL_SECRET: "e2e-seal-secret-not-used-anywhere-real",
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
