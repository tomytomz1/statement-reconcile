/**
 * Local setup check.
 *
 * Prints the *names* of missing tools and configuration — never values, never secrets.
 * Intended as the first command after clone: `pnpm setup:check`.
 */
import { spawnSync } from "node:child_process";

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const missing: string[] = [];
const ok: string[] = [];

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

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
if (nodeMajor >= 20) {
  ok.push("Node.js >= 20");
} else {
  missing.push("Node.js >= 20");
}

if (run("pnpm", ["--version"])) {
  ok.push("pnpm");
} else {
  missing.push("pnpm");
}

const envNames = [
  "NEXT_PUBLIC_SITE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "EXPORT_SEAL_SECRET",
  "PARSER_PROVIDER",
  "PARSER_API_KEY",
  "RATE_LIMIT_PROVIDER",
  "RATE_LIMIT_URL",
  "RATE_LIMIT_TOKEN",
] as const;

for (const name of envNames) {
  if (present(name)) ok.push(name);
  else missing.push(name);
}

if (run("gh", ["auth", "status"])) ok.push("gh auth");
else missing.push("gh auth");

if (run("npx", ["--yes", "vercel", "whoami"], 45_000)) ok.push("vercel auth");
else missing.push("vercel auth");

for (const name of ok) {
  console.log(`ok    ${name}`);
}

if (missing.length > 0) {
  console.log("");
  console.log("missing:");
  for (const name of missing) console.log(`  ${name}`);
  process.exitCode = 1;
} else {
  console.log("");
  console.log("setup-check: all named checks passed");
}
