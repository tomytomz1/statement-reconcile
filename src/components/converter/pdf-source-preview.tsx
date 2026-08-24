"use client";

import { useEffect, useRef, useState } from "react";

import type { SourceRegion } from "@/lib/schema/statement";

/**
 * In-browser PDF page with source-region highlights.
 *
 * Bytes never leave the device and are not written to IndexedDB. Highlights use recorded
 * bounding boxes when present; otherwise the limitation is stated rather than fabricating
 * coordinates.
 */
export function PdfSourcePreview({
  bytes,
  page,
  regions,
}: {
  bytes: Uint8Array | null;
  page: number;
  regions: readonly SourceRegion[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const empty = !bytes || bytes.byteLength === 0;

  useEffect(() => {
    if (!bytes || bytes.byteLength === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const copy = bytes.slice();
        const task = pdfjs.getDocument({
          data: copy,
          disableFontFace: true,
          useSystemFonts: false,
        });
        const doc = await task.promise;
        const pdfPage = await doc.getPage(page);
        const viewport = pdfPage.getViewport({ scale: 1.25 });
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        if (!canvas || !overlay || cancelled) {
          await task.destroy();
          return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;

        const overlayContext = overlay.getContext("2d");
        if (overlayContext) {
          overlayContext.clearRect(0, 0, overlay.width, overlay.height);
          overlayContext.fillStyle = "rgba(37, 99, 235, 0.22)";
          overlayContext.strokeStyle = "rgba(29, 78, 216, 0.9)";
          overlayContext.lineWidth = 2;
          let highlighted = 0;
          for (const region of regions) {
            if (region.page !== page || !region.bbox) continue;
            const x = region.bbox.x * viewport.scale;
            const y = region.bbox.y * viewport.scale;
            const width = region.bbox.width * viewport.scale;
            const height = Math.max(region.bbox.height * viewport.scale, 10);
            overlayContext.fillRect(x, y, width, height);
            overlayContext.strokeRect(x, y, width, height);
            highlighted += 1;
          }
          setMessage(
            highlighted > 0
              ? null
              : "Precise coordinates were not available for this row. The originating page is shown; boxes were not fabricated.",
          );
        }

        pdfPage.cleanup();
        await task.destroy();
      } catch {
        if (!cancelled) setMessage("This page could not be drawn for inspection.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bytes, page, regions]);

  if (empty) {
    return (
      <p className="text-ink-600 text-sm">
        The PDF is held only in this browser session and is no longer available to highlight.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border-ink-200 bg-ink-50 relative overflow-auto rounded-lg border">
        <canvas ref={canvasRef} className="block max-w-full" />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 max-w-full" />
      </div>
      {message ? <p className="text-ink-600 text-xs leading-relaxed">{message}</p> : null}
    </div>
  );
}
