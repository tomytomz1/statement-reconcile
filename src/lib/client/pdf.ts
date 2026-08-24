"use client";

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

import { siteConfig } from "@/config/site";
import {
  PAYLOAD_LIMITS,
  type ExtractedPdfText,
  type ExtractionErrorCode,
  type PdfPageText,
  type PdfTextItem,
} from "@/lib/extraction/types";

/**
 * Client-side PDF reading.
 *
 * The PDF file itself never leaves the device. It is read into memory here, the text layer
 * is extracted with pdf.js, and only positioned text runs are sent to the server. That is
 * the smallest input that still supports column-aware parsing, and it means an uploaded
 * statement is never written to our disks, never traverses a log, and cannot be recovered
 * from a request body.
 *
 * The worker is served from our own origin (copied into `public/` by a postinstall script)
 * so the Content-Security-Policy can forbid third-party script entirely.
 */

export type PdfReadFailure = {
  code: ExtractionErrorCode;
  /** Number of pages, when we got far enough to know. Used for the page-limit message. */
  pageCount?: number;
};

export type PdfReadResult =
  | { ok: true; document: ExtractedPdfText; textDensity: number; bytes: Uint8Array }
  | { ok: false; failure: PdfReadFailure };

const PDF_MAGIC = "%PDF-";

/** Below this many characters per page we treat the document as scanned, not text. */
const MIN_CHARS_PER_PAGE = 120;

type PdfJsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

/**
 * Load pdf.js on demand.
 *
 * It is a large dependency and it is only needed once the customer actually picks a file,
 * so it is kept out of the initial bundle. The promise is memoized so a second file does
 * not re-download it.
 */
async function loadPdfjs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return module;
    });
  }
  return pdfjsPromise;
}

/** Cheap checks that can reject a file before pdf.js is even loaded. */
export function validateFile(file: File): PdfReadFailure | null {
  if (file.size === 0) return { code: "unreadable_pdf" };
  if (file.size > siteConfig.limits.maxFileSizeBytes) return { code: "file_too_large" };
  const name = file.name.toLowerCase();
  if (file.type && file.type !== "application/pdf" && !name.endsWith(".pdf")) {
    return { code: "not_a_pdf" };
  }
  return null;
}

export async function readPdf(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<PdfReadResult> {
  const invalid = validateFile(file);
  if (invalid) return { ok: false, failure: invalid };

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, failure: { code: "unreadable_pdf" } };
  }

  // The magic number is checked on the bytes rather than trusting the MIME type, which is
  // supplied by the operating system and is frequently wrong or absent.
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!header.includes(PDF_MAGIC)) {
    bytes.fill(0);
    return { ok: false, failure: { code: "not_a_pdf" } };
  }

  const pdfjs = await loadPdfjs();

  let doc: PDFDocumentProxy;
  let task: PDFDocumentLoadingTask;
  try {
    task = pdfjs.getDocument({
      data: bytes,
      // Only the text layer is needed, so font machinery is switched off entirely: it is the
      // part of a PDF renderer that fetches resources and executes embedded programs.
      disableFontFace: true,
      useSystemFonts: false,
      // No `password` is supplied and no `onPassword` handler is installed, so an encrypted
      // PDF rejects immediately instead of prompting. The UI explains how to unlock it.
    });
    doc = await task.promise;
  } catch (error) {
    bytes.fill(0);
    return { ok: false, failure: { code: classifyPdfjsError(error) } };
  }

  try {
    const pageCount = doc.numPages;
    if (pageCount > PAYLOAD_LIMITS.maxPages) {
      bytes.fill(0);
      return { ok: false, failure: { code: "too_many_pages", pageCount } };
    }

    const pages: PdfPageText[] = [];
    let totalItems = 0;
    let totalChars = 0;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        if (!("str" in raw) || typeof raw.str !== "string") continue;
        const text = raw.str;
        if (text.trim() === "") continue;
        if (items.length >= PAYLOAD_LIMITS.maxItemsPerPage) break;

        // transform is [a, b, c, d, e, f]; e and f are the translation, d approximates the
        // glyph height for horizontal text.
        const transform = raw.transform as number[] | undefined;
        const x = round(transform?.[4] ?? 0);
        const baseline = transform?.[5] ?? 0;
        // pdf.js reports y from the bottom of the page. Flipping it here means every
        // downstream consumer can treat y as "distance from the top", which is how a
        // statement actually reads.
        const y = round(viewport.height - baseline);

        items.push({
          id: `p${pageNumber}i${items.length}`,
          t: text.slice(0, PAYLOAD_LIMITS.maxItemChars),
          x,
          y,
          w: round(typeof raw.width === "number" ? raw.width : 0),
          h: round(
            typeof raw.height === "number" && raw.height > 0
              ? raw.height
              : Math.abs(transform?.[3] ?? 10),
          ),
        });
        totalChars += Math.min(text.length, PAYLOAD_LIMITS.maxItemChars);
      }

      totalItems += items.length;
      pages.push({
        page: pageNumber,
        width: round(viewport.width),
        height: round(viewport.height),
        items,
      });

      // Release the page's operator list and font data as we go; a 50-page statement held
      // entirely in memory is a needless peak on a low-end device.
      page.cleanup();
      onProgress?.(pageNumber / pageCount);

      if (totalItems > PAYLOAD_LIMITS.maxTotalItems || totalChars > PAYLOAD_LIMITS.maxTotalChars) {
        bytes.fill(0);
        return { ok: false, failure: { code: "payload_too_large", pageCount } };
      }
    }

    const density = totalChars / Math.max(1, pageCount);
    if (density < MIN_CHARS_PER_PAGE) {
      bytes.fill(0);
      return { ok: false, failure: { code: "no_text_layer", pageCount } };
    }

    return { ok: true, document: { pageCount, pages }, textDensity: density, bytes };
  } catch (error) {
    bytes.fill(0);
    return { ok: false, failure: { code: classifyPdfjsError(error) } };
  } finally {
    // Tear down the worker. Bytes stay with the caller so the preview can highlight
    // source regions; they are never uploaded and must be zeroed when the job ends.
    void task.destroy();
  }
}

/** Zero in-memory PDF bytes when the conversion job is discarded. */
export function releasePdfBytes(bytes: Uint8Array): void {
  bytes.fill(0);
}

function classifyPdfjsError(error: unknown): ExtractionErrorCode {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (name === "PasswordException" || message.includes("password")) return "encrypted_pdf";
  if (name === "InvalidPDFException" || message.includes("invalid pdf")) return "not_a_pdf";
  return "unreadable_pdf";
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
