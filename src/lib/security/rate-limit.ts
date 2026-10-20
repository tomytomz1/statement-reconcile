import {
  isProduction,
  rateLimitDurable,
  rateLimitIdentityPerSession,
  serverEnv,
} from "@/config/env";

import { logEvent, logFailure } from "./logging";

/**
 * Rate limiting.
 *
 * Parsing is the expensive operation: it can call a paid provider and it always costs
 * CPU. Without a limit, one script can run up an unbounded bill. Limits are applied per
 * client identity (forwarded IP, falling back to a session cookie) and per route.
 *
 * Two backends:
 *
 * - `upstash`: a fixed window implemented with `INCR` + `EXPIRE` over the Upstash REST
 *   API. Durable and shared across serverless instances, which is the only thing that
 *   actually works in production.
 * - `memory`: a per-process window for local development. It is not a real limit on a
 *   serverless platform, so production refuses to run silently unprotected — the parse
 *   route fails closed and `/api/health` reports the condition.
 *
 * The REST protocol is spoken directly with `fetch` rather than through an SDK: it is two
 * commands, and any Upstash-compatible endpoint works.
 */

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetSeconds: number;
};

export type RateLimitRule = {
  /** Stable name used in the key, e.g. `parse`. */
  name: string;
  limit: number;
  windowSeconds: number;
};

export const RATE_LIMITS = {
  parse: { name: "parse", limit: 12, windowSeconds: 600 },
  checkout: { name: "checkout", limit: 20, windowSeconds: 600 },
  exportFile: { name: "export", limit: 40, windowSeconds: 600 },
} as const satisfies Record<string, RateLimitRule>;

const memoryWindows = new Map<string, { count: number; expiresAt: number }>();

/** Exposed for tests. */
export function resetMemoryRateLimits(): void {
  memoryWindows.clear();
}

export function rateLimitBackend(): "upstash" | "memory" {
  return rateLimitDurable() ? "upstash" : "memory";
}

/**
 * True when the deployment is running without a durable limiter in production. The parse
 * route treats this as a hard failure rather than serving unprotected traffic.
 */
export function rateLimitMisconfigured(): boolean {
  return isProduction() && !rateLimitDurable();
}

export async function checkRateLimit(
  rule: RateLimitRule,
  identity: string,
): Promise<RateLimitDecision> {
  const key = `srl:${rule.name}:${identity}`;
  if (rateLimitDurable()) {
    try {
      return await upstashFixedWindow(key, rule);
    } catch (error) {
      // Log only the safe error class, never credentials, URLs or Redis keys.
      logFailure("rate_limit_backend_unavailable", error, { rule: rule.name });
      // Fail closed: if the limiter cannot be reached we do not know how much traffic has
      // already been served, so we decline rather than open the door.
      return { allowed: false, limit: rule.limit, remaining: 0, resetSeconds: rule.windowSeconds };
    }
  }
  return memoryFixedWindow(key, rule);
}

function memoryFixedWindow(key: string, rule: RateLimitRule): RateLimitDecision {
  const now = Date.now();
  const existing = memoryWindows.get(key);
  if (!existing || existing.expiresAt <= now) {
    memoryWindows.set(key, { count: 1, expiresAt: now + rule.windowSeconds * 1000 });
    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit - 1,
      resetSeconds: rule.windowSeconds,
    };
  }
  existing.count += 1;
  const remaining = Math.max(0, rule.limit - existing.count);
  return {
    allowed: existing.count <= rule.limit,
    limit: rule.limit,
    remaining,
    resetSeconds: Math.ceil((existing.expiresAt - now) / 1000),
  };
}

async function upstashFixedWindow(key: string, rule: RateLimitRule): Promise<RateLimitDecision> {
  const env = serverEnv();
  const base = (env.RATE_LIMIT_URL ?? "").replace(/\/$/, "");
  const token = env.RATE_LIMIT_TOKEN ?? "";

  const response = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(rule.windowSeconds), "NX"],
      ["TTL", key],
    ]),
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    logEvent("rate_limit_backend_http_error", { rule: rule.name, httpStatus: response.status });
    throw new Error("Redis REST rejected the rate-limit request");
  }

  const results = (await response.json()) as Array<{ result?: number | string }>;
  const count = Number(results[0]?.result ?? 0);
  const ttl = Number(results[2]?.result ?? rule.windowSeconds);

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetSeconds: ttl > 0 ? ttl : rule.windowSeconds,
  };
}

/**
 * Derive a stable, non-identifying client key.
 *
 * The forwarded IP is hashed with a per-deployment salt before use so a raw address never
 * becomes part of a persisted key. When no IP is available (some runtimes strip it) the
 * anonymous session cookie is used, and failing that a single shared bucket, which is
 * conservative rather than permissive.
 */
export async function clientIdentity(request: Request): Promise<string> {
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("cf-connecting-ip")?.trim() ??
    "";

  const session = readSessionCookie(request);
  // Under end-to-end tests the order is inverted so each browser context is its own client;
  // see `rateLimitIdentityPerSession` for why that is never done outside a test run.
  const preferSession = session !== null && rateLimitIdentityPerSession();
  const raw = preferSession
    ? `sid:${session}`
    : forwarded !== ""
      ? `ip:${forwarded}`
      : session
        ? `sid:${session}`
        : "anonymous";

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${serverEnv().APP_ENV}|${raw}`),
  );
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const SESSION_COOKIE = "sr_sid";

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      const value = rest.join("=");
      return /^[0-9a-f]{16,64}$/.test(value) ? value : null;
    }
  }
  return null;
}

export function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  return {
    "x-ratelimit-limit": String(decision.limit),
    "x-ratelimit-remaining": String(decision.remaining),
    "retry-after": String(decision.resetSeconds),
  };
}
