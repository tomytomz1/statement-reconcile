"use client";

import { useCallback, useId, useRef, useState } from "react";

import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

/**
 * File selection.
 *
 * Drag and drop plus a real `<input type="file">`, because the input is what makes the
 * control keyboard-accessible and announceable by a screen reader. The visible drop area is
 * a label for that input rather than a div with a click handler, so focus, Enter, and Space
 * all behave the way the operating system's file picker is expected to behave.
 */
export function Dropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      const files = list ? Array.from(list).filter((file) => file.size > 0) : [];
      if (files.length > 0) onFiles(files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <label
        htmlFor={inputId}
        className={cn(
          "rounded-card flex cursor-pointer flex-col items-center justify-center gap-4 border-2 border-dashed px-6 py-14 text-center transition-colors",
          dragging
            ? "border-accent-500 bg-accent-50"
            : "border-ink-300 hover:border-accent-400 hover:bg-accent-50/40 bg-white",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <span
          aria-hidden="true"
          className="bg-accent-100 text-accent-700 flex size-12 items-center justify-center rounded-full"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
          </svg>
        </span>

        <span className="space-y-1.5">
          <span className="text-ink-950 block text-base font-semibold">
            Drop PDF statements here
          </span>
          <span className="text-ink-600 block text-sm">
            or{" "}
            <span className="text-accent-700 font-medium underline underline-offset-2">
              choose one or more files
            </span>{" "}
            from your device
          </span>
        </span>

        <span className="flex flex-wrap items-center justify-center gap-2">
          <Badge tone="neutral">PDF only</Badge>
          <Badge tone="neutral">Up to {siteConfig.limits.maxPages} total pages</Badge>
          <Badge tone="neutral">Max {siteConfig.limits.maxFileSizeMb} MB per file</Badge>
          <Badge tone="verified">Read in your browser</Badge>
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          disabled={disabled}
          data-testid="pdf-input"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      <p className="text-ink-500 mt-3 text-center text-xs leading-relaxed">
        The PDFs themselves are never uploaded. Your browser reads them and sends only the text they
        contain, which is discarded as soon as the transactions come back.
      </p>
    </div>
  );
}
