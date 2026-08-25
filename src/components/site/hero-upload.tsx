"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

import { usePendingFiles } from "@/components/converter/pending-files";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Card, Heading } from "@/components/ui/primitives";
import { routes, siteConfig } from "@/config/site";
import { track } from "@/lib/analytics/client";

export function HeroUpload() {
  const router = useRouter();
  const { queueFiles } = usePendingFiles();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState(false);

  const handOff = useCallback(
    (list: FileList | null) => {
      if (moving) return;
      const files = list ? Array.from(list).filter((file) => file.size > 0) : [];
      if (files.length === 0) return;

      setMoving(true);
      queueFiles(files);
      track("cta_clicked", {
        location: "home_hero_upload",
        label: "Choose PDF Statements",
      });
      router.push(routes.app);
    },
    [moving, queueFiles, router],
  );

  return (
    <Card className="border-accent-200 bg-accent-50/50 p-5 sm:p-6">
      <div
        onDragOver={(event) => {
          if (moving) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (moving) return;
          event.preventDefault();
          setDragging(false);
          handOff(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-card border-accent-200 border bg-white p-6 text-center transition-colors",
          dragging && "border-accent-500 bg-accent-50",
        )}
      >
        <div className="bg-accent-100 text-accent-700 mx-auto flex size-12 items-center justify-center rounded-full">
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
          </svg>
        </div>
        <Heading level={3} className="mt-4">
          Choose your PDF statements
        </Heading>
        <p className="text-ink-600 mt-2 text-sm leading-relaxed">
          Select one statement or a supported batch. Your browser reads each PDF locally. The
          original file is never uploaded.
        </p>
        <Button
          type="button"
          size="lg"
          fullWidth
          className="mt-6"
          disabled={moving}
          aria-busy={moving}
          onClick={() => {
            track("file_picker_open", { location: "home_hero_upload" });
            inputRef.current?.click();
          }}
        >
          {moving ? "Opening the converter…" : "Choose PDF Statements"}
        </Button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          disabled={moving}
          data-testid="home-pdf-input"
          aria-label="PDF statement files"
          onChange={(event) => {
            handOff(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        <p className="text-ink-500 mt-3 text-xs">
          PDF · Up to {siteConfig.limits.maxPages} total pages · Text-based statements · Max{" "}
          {siteConfig.limits.maxFileSizeMb} MB per file
        </p>
        <p data-testid="hero-offer" className="text-ink-800 mt-3 text-sm font-semibold">
          {siteConfig.uploaderPriceLine}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[
          ["Local", "PDF reading"],
          ["Exact", "money math"],
          ["Private", "by design"],
        ].map(([value, label]) => (
          <div key={value}>
            <p className="text-ink-950 text-sm font-bold">{value}</p>
            <p className="text-ink-500 mt-0.5 text-[0.6875rem]">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
