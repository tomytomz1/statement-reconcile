import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ESLint configuration.
 *
 * `pnpm lint` runs with `--max-warnings=0`, so a warning is a build failure. That is only
 * workable if the ignore list is accurate, hence the generated and vendored artefacts below:
 * the pdf.js worker in particular is a minified third-party bundle copied in by a postinstall
 * script, and linting it produces thousands of meaningless findings.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated or vendored, never authored here:
    "public/pdf.worker.min.mjs",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "fixtures/generated/**",
  ]),
  {
    // Test code legitimately does things production code should not: non-null assertions on
    // fixtures that are known to exist, and empty catch blocks used to assert a throw.
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Node scripts run outside the bundler and use the console as their user interface.
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
