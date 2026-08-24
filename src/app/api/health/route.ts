import { parserProviderConfigured, serverEnv, stripeMode } from "@/config/env";
import { flags } from "@/config/flags";
import { siteConfig } from "@/config/site";
import { sealMode } from "@/lib/crypto/seal";
import { rateLimitBackend, rateLimitMisconfigured } from "@/lib/security/rate-limit";
import { jsonResponse } from "@/lib/security/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational health.
 *
 * This is the whole of the admin surface: which integrations are configured, which mode
 * they are in, and whether anything is misconfigured. It returns no secrets, no key
 * fragments, no customer data, and no statement content — only booleans, enums, and the
 * build identifier.
 */
export function GET(): Response {
  const env = serverEnv();
  const seal = sealMode();
  const limiter = rateLimitBackend();
  const limiterUnsafe = rateLimitMisconfigured();

  const warnings: string[] = [];
  if (limiterUnsafe) {
    warnings.push(
      "No durable rate limiter is configured. The parsing endpoint fails closed until RATE_LIMIT_URL and RATE_LIMIT_TOKEN are set.",
    );
  }
  if (stripeMode() === "unconfigured") {
    warnings.push("Stripe is not configured, so checkout cannot be created.");
  }
  if (!env.STRIPE_WEBHOOK_SECRET && stripeMode() !== "unconfigured") {
    warnings.push("STRIPE_WEBHOOK_SECRET is missing, so webhook signatures cannot be verified.");
  }
  if (seal === "plaintext") {
    warnings.push(
      "EXPORT_SEAL_SECRET is not set. The extraction result is held in the browser as plaintext; the paid export gate still applies.",
    );
  }

  const status = limiterUnsafe || stripeMode() === "unconfigured" ? "degraded" : "ok";

  return jsonResponse(
    {
      status,
      brand: siteConfig.brandName,
      version: siteConfig.productVersion,
      appEnv: env.APP_ENV,
      vercelEnv: env.VERCEL_ENV ?? null,
      commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
      buildTimestamp: BUILD_TIMESTAMP,
      integrations: {
        stripe: stripeMode(),
        stripeWebhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
        stripePriceId: Boolean(env.STRIPE_PRICE_ID),
        parserProvider: parserProviderConfigured() ? env.PARSER_PROVIDER : "none",
        parserDeterministicOnly: !parserProviderConfigured(),
        rateLimiter: limiter,
        resultSealing: seal,
        analytics: siteConfig.analytics.provider,
      },
      limits: {
        maxPages: siteConfig.limits.maxPages,
        maxFileSizeMb: siteConfig.limits.maxFileSizeMb,
      },
      featureFlags: flags,
      warnings,
    },
    status === "ok" ? 200 : 503,
  );
}

/** Captured at build time so a deployment can be identified without exposing anything. */
const BUILD_TIMESTAMP = new Date().toISOString();
