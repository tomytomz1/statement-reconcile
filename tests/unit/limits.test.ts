import { describe, expect, it } from "vitest";

import { COMMERCIAL_OFFER } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { validateFile } from "@/lib/client/pdf";
import { PAYLOAD_LIMITS, parseRequestSchema } from "@/lib/extraction/types";

/**
 * The two limits, and where each one actually lives.
 *
 * 20 MB per original PDF is a **browser** limit and can only be a browser limit: the PDF
 * bytes never reach the server, which is the whole point of the privacy design. Testing it
 * through an API would be testing a fiction, so these exercise `validateFile` directly.
 *
 * 50 total pages per pack is a **server** limit as well as a browser one, because the
 * extracted text does cross the boundary. Those cases go through the request schema, which
 * is the first server-side trust boundary a direct API caller would meet.
 */

function fileOfSize(bytes: number, name = "statement.pdf", type = "application/pdf"): File {
  // A sparse-ish buffer: the size is what is under test, not the contents.
  return new File([new Uint8Array(bytes)], name, { type });
}

const MAX_BYTES = siteConfig.limits.maxFileSizeBytes;

describe("per-file size limit (browser)", () => {
  it("accepts a file at exactly the limit", () => {
    expect(validateFile(fileOfSize(MAX_BYTES))).toBeNull();
  });

  it("rejects one byte over the limit", () => {
    expect(validateFile(fileOfSize(MAX_BYTES + 1))).toEqual({ code: "file_too_large" });
  });

  it("rejects a zero-byte file", () => {
    expect(validateFile(fileOfSize(0))).toEqual({ code: "unreadable_pdf" });
  });

  it("accepts a .pdf name even when the OS reports no MIME type", () => {
    // Browsers frequently report an empty type. Refusing on that alone would reject
    // perfectly good statements.
    expect(validateFile(fileOfSize(1024, "statement.pdf", ""))).toBeNull();
  });

  it("rejects a non-PDF MIME type with a non-PDF name", () => {
    expect(validateFile(fileOfSize(1024, "statement.xlsx", "application/vnd.ms-excel"))).toEqual({
      code: "not_a_pdf",
    });
  });

  it("accepts a wrong MIME type when the name is .pdf, leaving magic-number checking to readPdf", () => {
    // `validateFile` is the cheap pre-check. The authoritative test is the %PDF- magic
    // number in `readPdf`, which does not trust the MIME type at all.
    expect(validateFile(fileOfSize(1024, "statement.pdf", "application/octet-stream"))).toBeNull();
  });

  it("uses the same limit the uploader advertises", () => {
    expect(MAX_BYTES).toBe(siteConfig.limits.maxFileSizeMb * 1024 * 1024);
  });
});

function pageOf(page: number, items = 1) {
  return {
    page,
    width: 612,
    height: 792,
    items: Array.from({ length: items }, (_, index) => ({
      t: "x",
      x: index,
      y: index,
      w: 5,
      h: 10,
    })),
  };
}

/** A syntactically valid job id; the schema requires one alongside the document. */
const JOB_ID = "a".repeat(32);

function documentOf(pageCount: number, itemsPerPage = 1) {
  return {
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => pageOf(index + 1, itemsPerPage)),
  };
}

describe("combined page limit (server trust boundary)", () => {
  it("accepts a single document at exactly the cap", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      document: documentOf(PAYLOAD_LIMITS.maxPages),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a single document one page over the cap", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      document: documentOf(PAYLOAD_LIMITS.maxPages + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a multi-file pack summing to exactly the cap", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      files: [
        { fileId: "a".repeat(16), document: documentOf(25) },
        { fileId: "b".repeat(16), document: documentOf(25) },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a multi-file pack summing to one page over the cap", () => {
    // Each file is individually legal. Only the sum is not — which is the case a caller
    // splitting a large pack across files would rely on going unnoticed.
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      files: [
        { fileId: "a".repeat(16), document: documentOf(25) },
        { fileId: "b".repeat(16), document: documentOf(26) },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a declared page count that disagrees with the pages supplied", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      document: { pageCount: 2, pages: [pageOf(1)] },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-sequential page sequence", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      document: { pageCount: 2, pages: [pageOf(1), pageOf(3)] },
    });
    expect(parsed.success).toBe(false);
  });

  it("enforces the same cap the commercial offer sells", () => {
    expect(PAYLOAD_LIMITS.maxPages).toBe(COMMERCIAL_OFFER.maxTotalPages);
  });
});

describe("extracted-text ceilings (server)", () => {
  it("rejects more items on one page than the per-page ceiling", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      document: { pageCount: 1, pages: [pageOf(1, PAYLOAD_LIMITS.maxItemsPerPage + 1)] },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a single text item longer than the character ceiling", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      document: {
        pageCount: 1,
        pages: [
          {
            width: 612,
            height: 792,
            page: 1,
            items: [{ t: "x".repeat(PAYLOAD_LIMITS.maxItemChars + 1), x: 0, y: 0, w: 5, h: 10 }],
          },
        ],
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a text item at exactly the character ceiling", () => {
    const parsed = parseRequestSchema.safeParse({
      jobId: JOB_ID,
      document: {
        pageCount: 1,
        pages: [
          {
            width: 612,
            height: 792,
            page: 1,
            items: [{ t: "x".repeat(PAYLOAD_LIMITS.maxItemChars), x: 0, y: 0, w: 5, h: 10 }],
          },
        ],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("keeps a body ceiling sized for the page cap", () => {
    expect(PAYLOAD_LIMITS.maxBodyBytes).toBeGreaterThan(0);
    expect(PAYLOAD_LIMITS.maxTotalItems).toBeGreaterThan(PAYLOAD_LIMITS.maxItemsPerPage);
  });
});
