import { z } from "zod";

import { siteConfig } from "@/config/site";

/**
 * The minimum representation of a PDF that leaves the browser.
 *
 * The original PDF bytes are never uploaded. Only positioned text items are sent, which
 * is the smallest input that still allows column-aware deterministic parsing.
 */

/** Hard caps on the parse payload, enforced on both sides of the network boundary. */
export const PAYLOAD_LIMITS = {
  maxPages: siteConfig.limits.maxPages,
  maxItemsPerPage: 4000,
  maxTotalItems: 40_000,
  maxItemChars: 400,
  maxTotalChars: 600_000,
  /** Serialized request body ceiling in bytes. Sized for a 50-page combined pack. */
  maxBodyBytes: 8 * 1024 * 1024,
} as const;

export const pdfTextItemSchema = z.object({
  /** Stable within this extraction. Assigned in the browser before the payload is sent. */
  id: z.string().min(1).max(40).optional(),
  /** Raw text run as reported by the PDF text layer. */
  t: z.string().max(PAYLOAD_LIMITS.maxItemChars),
  /** Horizontal position in PDF user-space units, rounded to one decimal. */
  x: z.number().finite(),
  /** Vertical position, measured from the top of the page. */
  y: z.number().finite(),
  /** Advance width of the run, used to locate right-aligned amount columns. */
  w: z.number().finite().nonnegative().optional(),
  /** Glyph height, used to group items onto the same visual line. */
  h: z.number().finite().nonnegative().optional(),
});
export type PdfTextItem = z.infer<typeof pdfTextItemSchema>;

export const pdfPageTextSchema = z.object({
  page: z.number().int().min(1).max(PAYLOAD_LIMITS.maxPages),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  items: z.array(pdfTextItemSchema).max(PAYLOAD_LIMITS.maxItemsPerPage),
});
export type PdfPageText = z.infer<typeof pdfPageTextSchema>;

export const extractedPdfTextSchema = z
  .object({
    pageCount: z.number().int().min(1).max(PAYLOAD_LIMITS.maxPages),
    pages: z.array(pdfPageTextSchema).min(1).max(PAYLOAD_LIMITS.maxPages),
  })
  .superRefine((value, ctx) => {
    const totalItems = value.pages.reduce((count, page) => count + page.items.length, 0);
    if (totalItems > PAYLOAD_LIMITS.maxTotalItems) {
      ctx.addIssue({ code: "custom", message: "too many text items" });
    }
    const totalChars = value.pages.reduce(
      (count, page) => count + page.items.reduce((sum, item) => sum + item.t.length, 0),
      0,
    );
    if (totalChars > PAYLOAD_LIMITS.maxTotalChars) {
      ctx.addIssue({ code: "custom", message: "too much text" });
    }
    const pageNumbers = new Set(value.pages.map((page) => page.page));
    if (pageNumbers.size !== value.pages.length) {
      ctx.addIssue({ code: "custom", message: "duplicate page numbers" });
    }
    if (value.pages.length !== value.pageCount) {
      ctx.addIssue({ code: "custom", message: "page count mismatch" });
    }
    const orderedPages = [...value.pages].sort((left, right) => left.page - right.page);
    if (orderedPages.some((page, index) => page.page !== index + 1)) {
      ctx.addIssue({ code: "custom", message: "page sequence mismatch" });
    }
  });
export type ExtractedPdfText = z.infer<typeof extractedPdfTextSchema>;

const parseHintSchema = z
  .object({
    statementType: z.enum(["checking", "savings", "credit_card", "unknown"]).optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .optional(),
  })
  .optional();

export const parseFileSchema = z.object({
  fileId: z.string().regex(/^[0-9a-f]{16}$/),
  document: extractedPdfTextSchema,
  hint: parseHintSchema,
});
export type ParseFile = z.infer<typeof parseFileSchema>;

/** Request body accepted by `POST /api/parse`. */
export const parseRequestSchema = z
  .object({
    /** Client-generated, cryptographically random. Used only for correlating logs. */
    jobId: z.string().regex(/^[0-9a-f]{32}$/),
    /** Legacy single-document payload. Prefer `files` for conversion packs. */
    document: extractedPdfTextSchema.optional(),
    files: z.array(parseFileSchema).min(1).max(PAYLOAD_LIMITS.maxPages).optional(),
    /** Optional hint from the upload step; never trusted for reconciliation. */
    hint: parseHintSchema,
  })
  .superRefine((value, ctx) => {
    const hasDocument = Boolean(value.document);
    const hasFiles = Boolean(value.files && value.files.length > 0);
    if (hasDocument === hasFiles) {
      ctx.addIssue({ code: "custom", message: "provide document or files" });
      return;
    }
    const documents =
      value.files?.map((file) => file.document) ?? (value.document ? [value.document] : []);
    const totalPages = documents.reduce((sum, document) => sum + document.pageCount, 0);
    if (totalPages > PAYLOAD_LIMITS.maxPages) {
      ctx.addIssue({ code: "custom", message: "too many pages" });
    }
    const ids = new Set<string>();
    for (const file of value.files ?? []) {
      if (ids.has(file.fileId)) {
        ctx.addIssue({ code: "custom", message: "duplicate file id" });
        break;
      }
      ids.add(file.fileId);
      if (file.document.pages.length !== file.document.pageCount) {
        ctx.addIssue({ code: "custom", message: "page count mismatch" });
      }
    }
    if (value.document && value.document.pages.length !== value.document.pageCount) {
      ctx.addIssue({ code: "custom", message: "page count mismatch" });
    }
  });
export type ParseRequest = z.infer<typeof parseRequestSchema>;

/** A visual line reconstructed from positioned text items. */
export type StatementLine = {
  page: number;
  y: number;
  height: number;
  /** Full line text with single spaces between cells. */
  text: string;
  cells: Array<{
    text: string;
    x: number;
    width: number;
    y: number;
    height: number;
    itemIds: string[];
  }>;
};

export type ExtractionSource = "deterministic" | "provider";

export type ExtractionAttempt = {
  source: ExtractionSource;
  warnings: string[];
};

/** Generic, non-sensitive failure codes surfaced to the client and analytics. */
export const EXTRACTION_ERROR_CODES = [
  "no_text_layer",
  "encrypted_pdf",
  "too_many_pages",
  "file_too_large",
  "not_a_pdf",
  "unreadable_pdf",
  "no_transactions_found",
  "layout_not_recognized",
  "multiple_accounts",
  "unsupported_currency",
  "provider_unavailable",
  "provider_invalid_output",
  "reconciliation_failed",
  "completeness_failed",
  "verification_rejected",
  "rate_limited",
  "payload_too_large",
  "internal_error",
] as const;

export type ExtractionErrorCode = (typeof EXTRACTION_ERROR_CODES)[number];

export const EXTRACTION_ERROR_MESSAGES: Record<ExtractionErrorCode, string> = {
  no_text_layer:
    "This statement appears to be scanned. We could not verify it reliably, so we will not charge you.",
  encrypted_pdf:
    "This PDF is password protected. Remove the password in your PDF reader and try again.",
  too_many_pages: `This conversion pack has more than ${siteConfig.limits.maxPages} total pages, which is above the limit for a single ${siteConfig.price.display} conversion.`,
  file_too_large: `This file is larger than ${siteConfig.limits.maxFileSizeMb} MB.`,
  not_a_pdf: "That file is not a PDF. Please upload the PDF your bank issued.",
  unreadable_pdf: "We could not read this PDF. It may be damaged or incomplete.",
  no_transactions_found:
    "We could not find a transaction table in this statement, so we will not charge you.",
  layout_not_recognized:
    "We could not read this statement layout reliably, so we will not charge you.",
  multiple_accounts:
    "This document appears to contain more than one account. Please upload a single account statement.",
  unsupported_currency: "We could not determine the currency of this statement reliably.",
  provider_unavailable: "Our extraction service is temporarily unavailable. Please try again.",
  provider_invalid_output:
    "We could not read this statement layout reliably, so we will not charge you.",
  reconciliation_failed: "We could not verify this statement reliably. You will not be charged.",
  completeness_failed:
    "We could not confirm that every page of this statement was processed, so we will not charge you.",
  verification_rejected: "We could not verify this statement reliably. You will not be charged.",
  rate_limited: "Too many requests from this device. Please wait a moment and try again.",
  payload_too_large: "This statement is too large to process in one request.",
  internal_error: "Something went wrong on our side. Please try again.",
};
