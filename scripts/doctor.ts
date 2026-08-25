/**
 * Launch doctor.
 *
 * Reports whether this checkout can run locally and what is still missing for a production
 * deployment. Prints configuration *names* only — never values, fragments, or secrets.
 */
import { spawnSync } from "node:child_process";

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const missing: string[] = [];
const warnings: string[] = [];

function present(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim());
}

function run(command: string, args: string[], timeoutMs = 20_000): boolean {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status === 0;
}

async function main(): Promise<void> {
  const { parserProviderConfigured, parserSafeguardsOk, rateLimitDurable, serverEnv, stripeMode } =
    await import("@/config/env");
  const { siteConfig } = await import("@/config/site");
  const { sealMode } = await import("@/lib/crypto/seal");
  const { rateLimitBackend } = await import("@/lib/security/rate-limit");

  // Must agree with `engines.node`, `.nvmrc`, and CI. All four say 22.
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (nodeMajor !== 22) missing.push(`Node.js 22 (found major ${nodeMajor})`);
  else console.log(`ok    Node.js (major ${nodeMajor})`);

  if (run("pnpm", ["--version"])) console.log("ok    pnpm");
  else missing.push("pnpm");

  const env = serverEnv();
  const stripe = stripeMode();
  console.log(`ok    Stripe mode: ${stripe}`);
  if (stripe === "unconfigured") missing.push("STRIPE_SECRET_KEY");
  if (!present("STRIPE_WEBHOOK_SECRET")) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!present("STRIPE_PRICE_ID")) warnings.push("STRIPE_PRICE_ID");

  console.log(
    `ok    Parser provider: ${parserProviderConfigured() ? env.PARSER_PROVIDER : "none"}`,
  );
  if (env.PARSER_PROVIDER !== "none" && !present("PARSER_API_KEY")) missing.push("PARSER_API_KEY");
  if (env.PARSER_PROVIDER !== "none" && !parserSafeguardsOk()) {
    warnings.push("PARSER_ZERO_DATA_RETENTION");
    warnings.push("PARSER_DISABLE_TRAINING");
  }

  console.log(`ok    Rate limiter: ${rateLimitBackend()}`);
  if (!rateLimitDurable()) {
    warnings.push("RATE_LIMIT_URL");
    warnings.push("RATE_LIMIT_TOKEN");
  }

  console.log(`ok    Result sealing: ${sealMode()}`);
  if (!present("EXPORT_SEAL_SECRET")) missing.push("EXPORT_SEAL_SECRET");

  if (present("NEXT_PUBLIC_SITE_URL")) console.log("ok    NEXT_PUBLIC_SITE_URL");
  else missing.push("NEXT_PUBLIC_SITE_URL");

  if (!process.env.NEXT_PUBLIC_LEGAL_JURISDICTION?.trim()) {
    warnings.push("NEXT_PUBLIC_LEGAL_JURISDICTION");
  }

  if (run("gh", ["auth", "status"])) console.log("ok    gh auth");
  else missing.push("gh auth");

  if (run("vercel", ["whoami"], 20_000)) console.log("ok    vercel auth");
  else missing.push("vercel auth");

  console.log(`ok    Brand: ${siteConfig.brandName}`);
  console.log(`ok    Offer: ${siteConfig.price.display} (amount not a secret)`);

  /**
   * Retired offer variables.
   *
   * The price, page cap, and file-size cap moved into `src/config/commerce.ts` so the
   * published figure and the Stripe charge cannot diverge. A deployment that still sets one
   * of these is not broken — the value is ignored — but somebody believes it is doing
   * something, and the gap between that belief and the behaviour is the whole failure this
   * change exists to close. Report it by name; never print the value.
   *
   * Deliberately a warning rather than a hard failure: making a stale variable fatal would
   * take production down to fix a documentation problem.
   */
  const retiredOfferVars = [
    "NEXT_PUBLIC_PRICE_USD",
    "NEXT_PUBLIC_MAX_PAGES",
    "NEXT_PUBLIC_MAX_FILE_SIZE_MB",
  ];
  const stale = retiredOfferVars.filter((name) => (process.env[name] ?? "").trim() !== "");
  if (stale.length > 0) {
    console.log("");
    console.log("retired and ignored (remove from the deployment):");
    for (const name of stale) {
      console.log(`  ${name} — the offer is code-owned in src/config/commerce.ts`);
    }
  } else {
    console.log("ok    No retired offer variables are set");
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("recommended (names only):");
    for (const name of warnings) console.log(`  ${name}`);
  }

  if (missing.length > 0) {
    console.log("");
    console.log("missing:");
    for (const name of missing) console.log(`  ${name}`);
    process.exitCode = 1;
  } else {
    console.log("");
    console.log("doctor: required named checks passed");
  }
}

void main().catch(() => {
  console.error("doctor: launch checks could not complete");
  process.exitCode = 1;
});
