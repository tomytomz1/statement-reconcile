import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as assemblePack } from "@/app/api/pack/route";
import { GET, POST as parse } from "@/app/api/parse/route";
import { PREVIEW_ROW_COUNT } from "@/lib/extraction/pipeline";
import { generateFixture } from "@/lib/fixtures/generator";
import { resetMemoryRateLimits } from "@/lib/security/rate-limit";

const JOB_ID = "a".repeat(32);

function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", host: "localhost:3000" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  resetMemoryRateLimits();
});

beforeEach(() => {
  resetMemoryRateLimits();
});

describe("POST /api/parse", () => {
  it("reconciles a checking fixture and returns digest, sealed, and a capped preview", async () => {
    const fixture = generateFixture("checking-debit-credit-balance", 1);
    const response = await parse(
      jsonRequest("http://localhost:3000/api/parse", {
        jobId: JOB_ID,
        document: fixture.document,
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.status).toBe("reconciled");
    expect(body.jobId).toBe(JOB_ID);
    expect(typeof body.digest).toBe("string");
    expect(body.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof body.sealed).toBe("string");
    expect(String(body.sealed).startsWith("v1.")).toBe(true);

    const preview = body.preview as unknown[];
    expect(Array.isArray(preview)).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(PREVIEW_ROW_COUNT);
    expect(preview.length).toBe(PREVIEW_ROW_COUNT);
    expect(typeof body.totalTransactions).toBe("number");
    expect(body.totalTransactions as number).toBeGreaterThan(PREVIEW_ROW_COUNT);
    expect(body).not.toHaveProperty("transactions");
    expect(body).not.toHaveProperty("statement");
  });

  it("rejects an invalid body with 400", async () => {
    const response = await parse(jsonRequest("http://localhost:3000/api/parse", {}));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("bad_request");
  });

  it("rejects a scanned document with no text layer", async () => {
    const response = await parse(
      jsonRequest("http://localhost:3000/api/parse", {
        jobId: JOB_ID,
        document: {
          pageCount: 1,
          pages: [{ page: 1, width: 612, height: 792, items: [] }],
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.status).toBe("rejected");
    expect(body).not.toHaveProperty("sealed");
    expect(body).not.toHaveProperty("digest");
  });

  it("rejects a combined pack over the 50-page cap", async () => {
    const page = (n: number) => ({
      page: n,
      width: 612,
      height: 792,
      items: [{ t: "x", x: 10, y: 10, w: 20, h: 10 }],
    });
    const doc = (count: number) => ({
      pageCount: count,
      pages: Array.from({ length: count }, (_, index) => page(index + 1)),
    });
    const response = await parse(
      jsonRequest("http://localhost:3000/api/parse", {
        jobId: JOB_ID,
        files: [
          { fileId: "aaaaaaaaaaaaaaaa", document: doc(30) },
          { fileId: "bbbbbbbbbbbbbbbb", document: doc(30) },
        ],
      }),
    );
    expect(response.status).toBe(413);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("too_many_pages");
  });

  it("does not trust a client page count while assembling a verified subset", async () => {
    const fixture = generateFixture("checking-debit-credit-balance", 1);
    const parsedResponse = await parse(
      jsonRequest("http://localhost:3000/api/parse", {
        jobId: JOB_ID,
        document: fixture.document,
      }),
    );
    const parsed = (await parsedResponse.json()) as {
      files?: Array<{ fileId: string; digest: string; sealed: string }>;
    };
    const file = parsed.files?.[0];
    expect(file).toBeDefined();

    const response = await assemblePack(
      jsonRequest("http://localhost:3000/api/pack", {
        jobId: JOB_ID,
        files: [{ ...file, pageCount: fixture.document.pageCount + 1 }],
      }),
    );
    expect(response.status).toBe(409);
  });

  it("rejects GET with 405", () => {
    const response = GET();
    expect(response.status).toBe(405);
  });
});
