"use client";

import type { ExtractedPdfText, ExtractionErrorCode } from "@/lib/extraction/types";
import type { ReconciliationResult, StatementSummary, Transaction } from "@/lib/schema/statement";
import type { VerificationEvidence } from "@/lib/verification/evidence";

/**
 * Typed client for the three API routes the funnel uses.
 *
 * Every response is validated structurally before it reaches React state, and every error
 * path resolves to one of the known error codes so the UI always has something specific to
 * say. Nothing here retries automatically: a statement conversion is not idempotent from
 * the customer's point of view, and silently re-sending it would double provider cost.
 */

export type ParseFileResult = {
  fileId: string;
  pageCount: number;
  status: "reconciled" | "rejected";
  code: ExtractionErrorCode | null;
  message: string | null;
  source: string;
  reconciliation: ReconciliationResult | null;
  summary: StatementSummary | null;
  preview: Transaction[] | null;
  totalTransactions?: number;
  warnings?: string[];
  digest: string | null;
  sealed: string | null;
  verification: VerificationEvidence | null;
};

export type ParseSuccess = {
  status: "reconciled";
  jobId: string;
  source: "deterministic" | "provider";
  layout: string | null;
  digest: string;
  sealed: string;
  summary: StatementSummary;
  reconciliation: ReconciliationResult;
  preview: Transaction[];
  totalTransactions: number;
  warnings: string[];
  verification?: VerificationEvidence | null;
  fileCount?: number;
  totalPages?: number;
  files?: ParseFileResult[];
};

export type ParsePack = {
  status: "pack";
  jobId: string;
  eligible: boolean;
  fileCount: number;
  totalPages: number;
  digest: string | null;
  sealed: string | null;
  files: ParseFileResult[];
};

export type ParseRejection = {
  status: "rejected";
  jobId: string;
  code: ExtractionErrorCode;
  message: string;
  source: string;
  reconciliation: ReconciliationResult | null;
  summary: StatementSummary | null;
  preview: Transaction[] | null;
};

export type ApiFailure = {
  status: "error";
  code: ExtractionErrorCode | "bad_request" | "forbidden" | "network" | "aborted";
  message: string;
  retryAfterSeconds?: number;
};

export type ParseOutcome = ParseSuccess | ParseRejection | ParsePack | ApiFailure;

const GENERIC_ERROR = "Something went wrong on our side. Please try again.";

export async function requestParse(
  input: {
    jobId: string;
    document?: ExtractedPdfText;
    files?: Array<{
      fileId: string;
      document: ExtractedPdfText;
      hint?: { statementType?: string; currency?: string };
    }>;
    hint?: { statementType?: string; currency?: string };
  },
  signal?: AbortSignal,
): Promise<ParseOutcome> {
  try {
    const response = await fetch("/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: signal ?? null,
      credentials: "same-origin",
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      return failureFrom(response, body);
    }
    if (body?.status === "reconciled") return body as unknown as ParseSuccess;
    if (body?.status === "rejected") return body as unknown as ParseRejection;
    if (body?.status === "pack") return body as unknown as ParsePack;
    return { status: "error", code: "internal_error", message: GENERIC_ERROR };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "error", code: "aborted", message: "Conversion cancelled." };
    }
    return {
      status: "error",
      code: "network",
      message: "We could not reach the server. Check your connection and try again.",
    };
  }
}

export async function requestAssemblePack(input: {
  jobId: string;
  files: Array<{ fileId: string; digest: string; sealed: string; pageCount: number }>;
}): Promise<
  | { status: "ok"; digest: string; sealed: string; fileCount: number; totalPages: number }
  | ApiFailure
> {
  try {
    const response = await fetch("/api/pack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      credentials: "same-origin",
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) return failureFrom(response, body);
    if (typeof body?.digest === "string" && typeof body?.sealed === "string") {
      return {
        status: "ok",
        digest: body.digest,
        sealed: body.sealed,
        fileCount: Number(body.fileCount ?? input.files.length),
        totalPages: Number(body.totalPages ?? 0),
      };
    }
    return { status: "error", code: "internal_error", message: GENERIC_ERROR };
  } catch {
    return {
      status: "error",
      code: "network",
      message: "We could not assemble the conversion pack. Please try again.",
    };
  }
}

export type CheckoutOutcome = { status: "ok"; url: string; sessionId: string } | ApiFailure;

export async function requestCheckout(input: {
  jobId: string;
  digest: string;
  sealed: string;
  pageCount: number;
  fileCount?: number;
}): Promise<CheckoutOutcome> {
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      credentials: "same-origin",
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) return failureFrom(response, body);
    if (typeof body?.url === "string" && typeof body?.sessionId === "string") {
      return { status: "ok", url: body.url, sessionId: body.sessionId };
    }
    return { status: "error", code: "internal_error", message: GENERIC_ERROR };
  } catch {
    return {
      status: "error",
      code: "network",
      message: "We could not reach the payment service. Please try again.",
    };
  }
}

export type VerifyOutcome =
  | { status: "paid"; digest: string; sessionId: string }
  | { status: "unpaid"; reason: string }
  | ApiFailure;

export async function verifyPayment(sessionId: string): Promise<VerifyOutcome> {
  try {
    const response = await fetch(
      `/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`,
      {
        credentials: "same-origin",
        cache: "no-store",
      },
    );
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.paid === true && typeof body.digest === "string") {
      return { status: "paid", digest: body.digest, sessionId };
    }
    if (body?.paid === false) {
      return { status: "unpaid", reason: String(body.reason ?? "not_paid") };
    }
    return failureFrom(response, body);
  } catch {
    return {
      status: "error",
      code: "network",
      message: "We could not confirm your payment. Please refresh in a moment.",
    };
  }
}

export type DownloadOutcome = { status: "ok"; blob: Blob; filename: string } | ApiFailure;

export async function requestExport(input: {
  sessionId: string;
  digest: string;
  sealed: string;
  format: "csv" | "xlsx" | "report" | "manifest";
}): Promise<DownloadOutcome> {
  try {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      return failureFrom(response, body);
    }

    return {
      status: "ok",
      blob: await response.blob(),
      filename: filenameFromDisposition(response.headers.get("content-disposition"), input.format),
    };
  } catch {
    return {
      status: "error",
      code: "network",
      message: "The download could not be started. Please try again.",
    };
  }
}

function failureFrom(response: Response, body: Record<string, unknown> | null): ApiFailure {
  const error = body?.error as { code?: string; message?: string } | undefined;
  const retryAfter = Number(response.headers.get("retry-after") ?? "");
  const failure: ApiFailure = {
    status: "error",
    code: (error?.code as ApiFailure["code"]) ?? "internal_error",
    message: error?.message ?? GENERIC_ERROR,
  };
  if (Number.isFinite(retryAfter) && retryAfter > 0) failure.retryAfterSeconds = retryAfter;
  return failure;
}

function filenameFromDisposition(header: string | null, format: string): string {
  const match = header?.match(/filename="([^"]+)"/);
  const candidate = match?.[1];
  if (candidate && /^[A-Za-z0-9._-]+$/.test(candidate)) return candidate;
  return `statement.${format}`;
}

/** Trigger a browser download from a blob, then release the object URL. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
