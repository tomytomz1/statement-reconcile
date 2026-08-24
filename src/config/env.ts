import { z } from "zod";

/**
 * Server-side environment access.
 *
 * Nothing in this module may be imported from a client component. Values are read
 * lazily so that a missing optional integration never breaks an unrelated page, and
 * so that `next build` does not require production secrets to be present.
 */

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .catch(undefined)
  .transform((value) => (value === "" ? undefined : value));

const serverEnvSchema = z.object({
  APP_ENV: z.enum(["development", "preview", "production", "test"]).default("development"),

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_ID: optionalString,

  /**
   * Secret used to seal the extraction result that the browser holds between the preview
   * and the paid export. When present, the full transaction table never exists in
   * plaintext outside the server; when absent the app falls back to the browser holding
   * the plaintext result, which still cannot be exported without a verified payment.
   */
  EXPORT_SEAL_SECRET: optionalString,

  PARSER_PROVIDER: z
    .enum(["none", "openai", "anthropic", "openai-compatible"])
    .default("none")
    .catch("none"),
  PARSER_API_KEY: optionalString,
  PARSER_MODEL: optionalString,
  PARSER_BASE_URL: optionalString,
  PARSER_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(45_000).catch(45_000),

  RATE_LIMIT_PROVIDER: z.enum(["memory", "upstash"]).default("memory").catch("memory"),
  RATE_LIMIT_URL: optionalString,
  RATE_LIMIT_TOKEN: optionalString,

  /**
   * Deterministic-only mode. When true the parsing endpoint never calls an external
   * provider, even if one is configured. Useful for local development and CI.
   */
  PARSER_DETERMINISTIC_ONLY: optionalString,

  /**
   * Required in production when a parser provider is configured. The provider must be
   * confirmed not to retain statement text and not to train on it. Without both flags the
   * provider is treated as unconfigured so text is never sent.
   */
  PARSER_ZERO_DATA_RETENTION: optionalString,
  PARSER_DISABLE_TRAINING: optionalString,

  /**
   * Test-only payment bypass for end-to-end tests. Guarded three ways: it requires an
   * explicit opt-in, `APP_ENV=test`, and a non-production `NODE_ENV`.
   */
  E2E_MOCK_PAYMENTS: optionalString,

  /** Set by Vercel; used only for non-sensitive build identification on /api/health. */
  VERCEL_GIT_COMMIT_SHA: optionalString,
  VERCEL_ENV: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    cached = serverEnvSchema.parse(process.env);
  }
  return cached;
}

/** Test helper: forget the memoized environment after mutating `process.env`. */
export function resetServerEnvCache(): void {
  cached = undefined;
}

export function isProduction(): boolean {
  return serverEnv().APP_ENV === "production" || process.env.NODE_ENV === "production";
}

export function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

/** Stripe is usable when a secret key is present. */
export function stripeConfigured(): boolean {
  return Boolean(serverEnv().STRIPE_SECRET_KEY);
}

export function stripeMode(): "live" | "test" | "unconfigured" {
  const key = serverEnv().STRIPE_SECRET_KEY;
  if (!key) return "unconfigured";
  return key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : "test";
}

export function parserProviderConfigured(): boolean {
  const env = serverEnv();
  if (isTruthy(env.PARSER_DETERMINISTIC_ONLY)) return false;
  if (env.PARSER_PROVIDER === "none" || !env.PARSER_API_KEY) return false;
  if (isProduction() && !parserSafeguardsOk()) return false;
  return true;
}

/** Provider may receive statement text only when retention/training safeguards are explicit. */
export function parserSafeguardsOk(): boolean {
  const env = serverEnv();
  if (env.PARSER_PROVIDER === "none" || !env.PARSER_API_KEY) return true;
  return isTruthy(env.PARSER_ZERO_DATA_RETENTION) && isTruthy(env.PARSER_DISABLE_TRAINING);
}

export function rateLimitDurable(): boolean {
  const env = serverEnv();
  return (
    env.RATE_LIMIT_PROVIDER === "upstash" && Boolean(env.RATE_LIMIT_URL && env.RATE_LIMIT_TOKEN)
  );
}

/**
 * The mock-payment path exists so end-to-end tests can exercise the paid export gate
 * without contacting Stripe. It must be impossible to enable in production.
 */
export function mockPaymentsEnabled(): boolean {
  const env = serverEnv();
  if (process.env.NODE_ENV === "production") return false;
  if (env.APP_ENV !== "test") return false;
  return isTruthy(env.E2E_MOCK_PAYMENTS);
}
