import { z } from "zod";

import { MAX_ENVELOPE_CHARS } from "@/lib/crypto/seal";
import { PAYLOAD_LIMITS } from "@/lib/extraction/types";

/**
 * Request shapes for the checkout and export routes.
 *
 * Both routes take the same three things: the job id (for correlation only), the digest of
 * the pack (or legacy single-statement result), and the sealed envelope the parse route
 * produced. Neither route accepts a transaction list, a balance, or any other statement
 * value from the client.
 */

export const sha256Hex = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{64}$/, "must be a SHA-256 hex digest");

export const jobIdSchema = z.string().regex(/^[0-9a-f]{32}$/);

export const sealedEnvelopeSchema = z
  .string()
  .min(8)
  .max(MAX_ENVELOPE_CHARS)
  .regex(/^v1\.(gcm|plain)\./, "unrecognized envelope");

export const createCheckoutSchema = z.object({
  jobId: jobIdSchema,
  digest: sha256Hex,
  sealed: sealedEnvelopeSchema,
  pageCount: z.number().int().min(1).max(PAYLOAD_LIMITS.maxPages),
  fileCount: z.number().int().min(1).max(PAYLOAD_LIMITS.maxPages).optional(),
});
export type CreateCheckoutRequest = z.infer<typeof createCheckoutSchema>;

export const exportFormatSchema = z.enum(["csv", "xlsx", "report", "manifest"]);
export type ExportFormatRequest = z.infer<typeof exportFormatSchema>;

export const exportRequestSchema = z.object({
  sessionId: z.string().trim().min(8).max(300),
  digest: sha256Hex,
  sealed: sealedEnvelopeSchema,
  format: exportFormatSchema,
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;

export const assemblePackRequestSchema = z.object({
  jobId: jobIdSchema,
  files: z
    .array(
      z.object({
        fileId: z.string().regex(/^[0-9a-f]{16}$/),
        digest: sha256Hex,
        sealed: sealedEnvelopeSchema,
        pageCount: z.number().int().min(1).max(PAYLOAD_LIMITS.maxPages),
      }),
    )
    .min(1)
    .max(PAYLOAD_LIMITS.maxPages),
});
export type AssemblePackRequest = z.infer<typeof assemblePackRequestSchema>;

/** Envelope size ceiling for the checkout and export bodies. */
export const MAX_GATED_BODY_BYTES = 6 * 1024 * 1024;
