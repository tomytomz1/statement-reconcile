import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup/unit-env.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/setup/integration-env.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/fixtures/**"],
      /**
       * Ratchets, not aspirations.
       *
       * Each figure sits at or just under what the suite achieves today, so the gate fails
       * on a regression rather than on an ambition. Raising a number is a deliberate act;
       * lowering one to make a build pass is the thing this is here to prevent.
       *
       * The per-directory thresholds cover the modules where a silent regression would be
       * expensive: the arithmetic that decides whether a statement is sellable, the gate
       * that decides whether it may be bought, the pack identity that binds payment to
       * data, and the headers that keep a page holding a statement from talking to anyone.
       *
       * `payments` is the lowest of these and deliberately so — `stripe.ts` is mostly
       * client construction and a network retrieval, which is covered by the pure
       * `matchOfferAgainstPrice` tests rather than by mocking the SDK.
       */
      thresholds: {
        "src/lib/reconciliation/**": { statements: 95, branches: 85, functions: 95, lines: 95 },
        "src/lib/verification/**": { statements: 90, branches: 80, functions: 88, lines: 92 },
        "src/lib/schema/**": { statements: 85, branches: 85, functions: 88, lines: 88 },
        "src/lib/security/**": { statements: 70, branches: 60, functions: 82, lines: 74 },
        "src/lib/export/**": { statements: 74, branches: 62, functions: 70, lines: 76 },
        // Raised from 55/52/68/58 by the A1/A2 branch tests — deterministic Price-gate
        // cases and route-level recovery authorization, not excluded files.
        "src/lib/payments/**": { statements: 80, branches: 75, functions: 82, lines: 83 },
        // The sealed envelope is the paywall. Added when seal-mode tests replaced the
        // situation where the unit suite silently exercised the plaintext fallback.
        "src/lib/crypto/**": { statements: 86, branches: 78, functions: 95, lines: 90 },
      },
    },
  },
});
