import { EXTRACTION_ERROR_MESSAGES, type ExtractionErrorCode } from "@/lib/extraction/types";

/**
 * Response helpers for the API routes.
 *
 * Every API response is `no-store`. Statement data must never be cached by a browser, a
 * CDN, or an intermediary, and a cached error is nearly as bad as a cached success
 * because it can leak which document a device processed.
 *
 * Error bodies carry a generic, non-sensitive code and a customer-readable message. They
 * never include stack traces, provider responses, field values, or statement content.
 */

export const NO_STORE_HEADERS: Record<string, string> = {
  "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...NO_STORE_HEADERS,
      ...(extraHeaders as Record<string, string>),
    },
  });
}

export type ApiErrorBody = {
  error: {
    code: ExtractionErrorCode | "bad_request" | "not_found" | "method_not_allowed" | "forbidden";
    message: string;
  };
};

export function errorResponse(
  code: ApiErrorBody["error"]["code"],
  status: number,
  message?: string,
  extraHeaders: HeadersInit = {},
): Response {
  const resolved =
    message ??
    (code in EXTRACTION_ERROR_MESSAGES
      ? EXTRACTION_ERROR_MESSAGES[code as ExtractionErrorCode]
      : "The request could not be completed.");
  return jsonResponse(
    { error: { code, message: resolved } } satisfies ApiErrorBody,
    status,
    extraHeaders,
  );
}

export function fileResponse(
  body: Uint8Array | string,
  contentType: string,
  filename: string,
): Response {
  const payload = typeof body === "string" ? new TextEncoder().encode(body) : body;
  return new Response(payload as unknown as BodyInit, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "content-type": contentType,
      // The filename is sanitized by safeFilename before it reaches this point.
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(payload.byteLength),
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
