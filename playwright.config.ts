import { defineConfig, devices } from "@playwright/test";

/*
 * Deliberately not 3000: a developer's own `next dev` lives there, and reusing it would run
 * the suite against a server started without the env below — no mock payments, and a rate
 * limiter whose ten-minute windows carry over from whatever else that server has served.
 */
const port = process.env.PLAYWRIGHT_PORT ?? "3100";
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
    // Never adopt a server this config did not configure. If the port is busy, failing loudly
    // beats silently testing something else.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      APP_ENV: "test",
      E2E_MOCK_PAYMENTS: "1",
      // Rate-limit per browser context rather than per (shared) loopback address, so parallel
      // workers do not spend each other's budget. See `rateLimitIdentityPerSession`.
      E2E_ISOLATE_RATE_LIMIT: "1",
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
