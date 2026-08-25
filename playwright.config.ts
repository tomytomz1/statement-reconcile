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
  /**
   * Two workers, everywhere.
   *
   * Left unset, Playwright sizes the pool from the CPU count — four on a typical dev
   * machine. Independent verification saw that produce 22 passed / 4 failed on one release
   * run and 24 passed / 2 timed out on another, while the same tests passed in isolation and
   * the whole suite passed at `--workers=2`. The failures were timeouts on unrelated static
   * pages, which is what a single Next dev server looks like when several workers compile
   * routes at once — not a defect in any of the features being tested.
   *
   * Pinned rather than derived so a laptop and a CI runner behave the same way; a gate that
   * passes on one and not the other is not a gate.
   */
  workers: 2,
  /**
   * No retries, on purpose.
   *
   * Retries were set to 2 in CI, which would have hidden the contention above rather than
   * surfacing it — and will hide the next real regression just as effectively. With the
   * worker count fixed, a failure here should mean something is broken.
   */
  retries: 0,
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
