import { afterEach, describe, expect, it } from "vitest";

import { rateLimitDurable, resetServerEnvCache, serverEnv } from "@/config/env";

const names = [
  "RATE_LIMIT_PROVIDER",
  "RATE_LIMIT_URL",
  "RATE_LIMIT_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    const value = original[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  resetServerEnvCache();
});

describe("rate-limit environment compatibility", () => {
  it("uses credentials injected by Vercel's Upstash integration", () => {
    process.env.RATE_LIMIT_PROVIDER = "upstash";
    delete process.env.RATE_LIMIT_URL;
    delete process.env.RATE_LIMIT_TOKEN;
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "token";
    resetServerEnvCache();

    expect(serverEnv().RATE_LIMIT_URL).toBe("https://example.upstash.io");
    expect(serverEnv().RATE_LIMIT_TOKEN).toBe("token");
    expect(rateLimitDurable()).toBe(true);
  });

  it("prefers explicit rate-limit credentials over integration aliases", () => {
    process.env.RATE_LIMIT_PROVIDER = "upstash";
    process.env.RATE_LIMIT_URL = "https://explicit.example";
    process.env.RATE_LIMIT_TOKEN = "explicit-token";
    process.env.KV_REST_API_URL = "https://integration.example";
    process.env.KV_REST_API_TOKEN = "integration-token";
    resetServerEnvCache();

    expect(serverEnv().RATE_LIMIT_URL).toBe("https://explicit.example");
    expect(serverEnv().RATE_LIMIT_TOKEN).toBe("explicit-token");
  });
});
