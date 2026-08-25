import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as checkout } from "@/app/api/checkout/route";
import { GET as verify } from "@/app/api/checkout/verify/route";
import { POST as exportFile } from "@/app/api/export/route";
import { POST as parse } from "@/app/api/parse/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { resetServerEnvCache } from "@/config/env";
import { generateFixture } from "@/lib/fixtures/generator";
import { CHECKOUT_METADATA_KEYS, buildCheckoutMetadata } from "@/lib/payments/entitlement";
import { resetStripeClient } from "@/lib/payments/stripe";
import { resetMemoryRateLimits } from "@/lib/security/rate-limit";

const JOB_ID = "a".repeat(32);
const PARSE_URL = "http://localhost:3000/api/parse";
const CHECKOUT_URL = "http://localhost:3000/api/checkout";
const EXPORT_URL = "http://localhost:3000/api/export";

function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", host: "localhost:3000" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetMemoryRateLimits();
});

afterEach(() => {
  resetMemoryRateLimits();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  resetServerEnvCache();
  resetStripeClient();
});

async function parseFixture(family: string) {
  const fixture = generateFixture(family, 1);
  const response = await parse(
    jsonRequest(PARSE_URL, { jobId: JOB_ID, document: fixture.document }),
  );
  const body = (await response.json()) as Record<string, unknown>;
  return { response, body, fixture };
}

describe("checkout, verify, export, webhook", () => {
  it("creates a mock checkout session after a reconciling parse", async () => {
    const { body: parsed, fixture } = await parseFixture("checking-debit-credit-balance");
    expect(parsed.status).toBe("reconciled");

    const response = await checkout(
      jsonRequest(CHECKOUT_URL, {
        jobId: JOB_ID,
        digest: parsed.digest,
        sealed: parsed.sealed,
        pageCount: fixture.document.pageCount,
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { url?: string; sessionId?: string };
    expect(body.sessionId).toBe(`cs_mock_${parsed.digest}`);
    expect(body.url).toContain("session_id=");
    expect(body.url).toContain(body.sessionId);
    expect(body.url).toContain("/checkout/success");
  });

  it("does not let a rejected parse reach checkout, and missing sealed is 400", async () => {
    const { body: parsed } = await parseFixture("invalid-altered-closing-balance");
    expect(parsed.status).toBe("rejected");
    expect(parsed).not.toHaveProperty("sealed");
    expect(parsed).not.toHaveProperty("digest");

    const missingSealed = await checkout(
      jsonRequest(CHECKOUT_URL, {
        jobId: JOB_ID,
        digest: "b".repeat(64),
        pageCount: 1,
      }),
    );
    expect(missingSealed.status).toBe(400);
  });

  it("checkout metadata carries the digest and no financial statement fields", () => {
    const digest = "ab".repeat(32);
    const metadata = buildCheckoutMetadata({
      digest,
      jobId: JOB_ID,
      pageCount: 2,
      transactionCount: 14,
    });

    expect(metadata[CHECKOUT_METADATA_KEYS.digest]).toBe(digest);
    expect(metadata[CHECKOUT_METADATA_KEYS.jobId]).toBe(JOB_ID);
    expect(Object.keys(metadata).sort()).toEqual(
      Object.values(CHECKOUT_METADATA_KEYS).slice().sort(),
    );

    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toMatch(/balance/i);
    expect(serialized).not.toMatch(/description/i);
    expect(serialized).not.toMatch(/opening/i);
    expect(serialized).not.toMatch(/closing/i);
  });

  it("verifies a mock session as paid with the matching digest", async () => {
    const { body: parsed } = await parseFixture("checking-debit-credit-balance");
    expect(parsed.status).toBe("reconciled");
    const sessionId = `cs_mock_${parsed.digest as string}`;

    const response = await verify(
      new Request(`http://localhost:3000/api/checkout/verify?session_id=${sessionId}`, {
        headers: { host: "localhost:3000" },
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { paid?: boolean; digest?: string };
    expect(body.paid).toBe(true);
    expect(body.digest).toBe(parsed.digest);
  });

  it("blocks export for an unpaid session", async () => {
    const { body: parsed } = await parseFixture("checking-debit-credit-balance");
    expect(parsed.status).toBe("reconciled");

    const response = await exportFile(
      jsonRequest(EXPORT_URL, {
        sessionId: "cs_test_unpaidplaceholder",
        digest: parsed.digest,
        sealed: parsed.sealed,
        format: "csv",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("blocks export when the mock session digest does not match", async () => {
    const { body: parsed } = await parseFixture("checking-debit-credit-balance");
    expect(parsed.status).toBe("reconciled");
    const otherDigest = "c".repeat(64);
    expect(otherDigest).not.toBe(parsed.digest);

    const response = await exportFile(
      jsonRequest(EXPORT_URL, {
        sessionId: `cs_mock_${otherDigest}`,
        digest: parsed.digest,
        sealed: parsed.sealed,
        format: "csv",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("exports CSV for a matching mock session with the documented header", async () => {
    const { body: parsed, fixture } = await parseFixture("checking-debit-credit-balance");
    expect(parsed.status).toBe("reconciled");

    const response = await exportFile(
      jsonRequest(EXPORT_URL, {
        sessionId: `cs_mock_${parsed.digest as string}`,
        digest: parsed.digest,
        sealed: parsed.sealed,
        format: "csv",
      }),
    );
    expect(response.status).toBe(200);
    const csv = await response.text();
    expect(csv).toContain('"Date","Posted Date","Description"');
    expect(csv.toLowerCase()).toContain("date");
    expect(fixture.truth.transactionCount).toBeGreaterThan(0);
  });

  it("exports a verification PDF and pack manifest for a matching mock session", async () => {
    const { body: parsed } = await parseFixture("checking-debit-credit-balance");
    expect(parsed.status).toBe("reconciled");
    const sessionId = `cs_mock_${parsed.digest as string}`;

    const report = await exportFile(
      jsonRequest(EXPORT_URL, {
        sessionId,
        digest: parsed.digest,
        sealed: parsed.sealed,
        format: "report",
      }),
    );
    expect(report.status).toBe(200);
    const pdf = new Uint8Array(await report.arrayBuffer());
    expect(String.fromCharCode(pdf[0]!, pdf[1]!, pdf[2]!, pdf[3]!)).toBe("%PDF");

    const manifest = await exportFile(
      jsonRequest(EXPORT_URL, {
        sessionId,
        digest: parsed.digest,
        sealed: parsed.sealed,
        format: "manifest",
      }),
    );
    expect(manifest.status).toBe(200);
    const json = (await manifest.json()) as { packDigest?: string };
    expect(json.packDigest).toBe(parsed.digest);
  });

  it("exports XLSX for a matching mock session as a zip", async () => {
    const { body: parsed } = await parseFixture("checking-debit-credit-balance");
    expect(parsed.status).toBe("reconciled");

    const response = await exportFile(
      jsonRequest(EXPORT_URL, {
        sessionId: `cs_mock_${parsed.digest as string}`,
        digest: parsed.digest,
        sealed: parsed.sealed,
        format: "xlsx",
      }),
    );
    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("rejects a webhook with no signature when Stripe is configured", async () => {
    process.env.STRIPE_SECRET_KEY = "placeholder_stripe_secret_not_a_real_key";
    process.env.STRIPE_WEBHOOK_SECRET = "placeholder_webhook_secret";
    resetServerEnvCache();
    resetStripeClient();

    const response = await webhook(
      new Request("http://localhost:3000/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", host: "localhost:3000" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 503 when webhooks are unconfigured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    resetServerEnvCache();
    resetStripeClient();

    const response = await webhook(
      new Request("http://localhost:3000/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", host: "localhost:3000" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(503);
  });
});
