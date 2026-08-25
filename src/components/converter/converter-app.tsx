"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { routes, siteConfig } from "@/config/site";
import { durationBucket, pageBucket, rowBucket, sizeBucket } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/client";
import {
  requestAssemblePack,
  requestCheckout,
  requestParse,
  verifyPayment,
  type ParseFileResult,
  type ParseSuccess,
} from "@/lib/client/api";
import { readPdf, releasePdfBytes, validateFile } from "@/lib/client/pdf";
import { saveJob } from "@/lib/client/job-store";
import { randomId } from "@/lib/crypto/digest";
import {
  EXTRACTION_ERROR_MESSAGES,
  PAYLOAD_LIMITS,
  type ExtractionErrorCode,
} from "@/lib/extraction/types";
import { formatFileSize } from "@/lib/money/display";
import type { ReconciliationResult, StatementSummary, Transaction } from "@/lib/schema/statement";
import { Button } from "@/components/ui/button";
import { Card, Heading } from "@/components/ui/primitives";

import { Dropzone } from "./dropzone";
import { EvidencePanel } from "./evidence-panel";
import { Paywall } from "./paywall";
import { usePendingFiles } from "./pending-files";
import { PreviewTable } from "./preview-table";
import { ReconciliationPanel } from "./reconciliation-panel";
import { SourceInspector } from "./source-inspector";
import { FailurePanel, ProgressPanel, type Stage } from "./stages";

/**
 * The conversion funnel.
 *
 * Paywall is unreachable unless every kept file is `verification_passed` and a pack digest
 * exists. PDF bytes stay in RAM for source highlighting and are never written to IndexedDB.
 */

type LocalFile = {
  fileId: string;
  fileName: string;
  pageCount: number;
  bytes: Uint8Array;
  document: import("@/lib/extraction/types").ExtractedPdfText;
};

type PackView = {
  jobId: string;
  files: ParseFileResult[];
  local: LocalFile[];
  digest: string | null;
  sealed: string | null;
  eligible: boolean;
  totalPages: number;
  checkoutBusy: boolean;
  checkoutError: string | null;
  selected: Transaction | null;
  selectedFileId: string | null;
};

type State =
  | { kind: "idle" }
  | { kind: "working"; stage: Stage; progress: number; fileName: string }
  | { kind: "pack"; view: PackView; storageWarning: boolean }
  | {
      kind: "rejected";
      code: string;
      message: string;
      summary: StatementSummary | null;
      reconciliation: ReconciliationResult | null;
      preview: Transaction[] | null;
    };

export function ConverterApp({ initialSession }: { initialSession?: string }) {
  const router = useRouter();
  const { takeFiles } = usePendingFiles();
  const [state, setState] = useState<State>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const bytesRef = useRef<LocalFile[]>([]);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(
    () => () => {
      for (const file of bytesRef.current) releasePdfBytes(file.bytes);
      bytesRef.current = [];
    },
    [],
  );

  useEffect(() => {
    if (state.kind === "pack" || state.kind === "rejected") {
      resultRef.current?.focus();
    }
  }, [state.kind]);

  const reset = useCallback(() => {
    for (const file of bytesRef.current) releasePdfBytes(file.bytes);
    bytesRef.current = [];
    setState({ kind: "idle" });
  }, []);

  const convert = useCallback(
    async (picked: File[]) => {
      for (const file of bytesRef.current) releasePdfBytes(file.bytes);
      bytesRef.current = [];

      const invalid = picked.map(validateFile).find(Boolean);
      if (invalid) {
        track("file_rejected", { code: invalid.code });
        setState({
          kind: "rejected",
          code: invalid.code,
          message: EXTRACTION_ERROR_MESSAGES[invalid.code],
          summary: null,
          reconciliation: null,
          preview: null,
        });
        return;
      }

      const startedAt = Date.now();
      setState({
        kind: "working",
        stage: "reading",
        progress: 0.02,
        fileName:
          picked.length === 1 ? (picked[0]?.name ?? "statement.pdf") : `${picked.length} files`,
      });

      const local: LocalFile[] = [];
      let combinedPages = 0;

      for (const [index, file] of picked.entries()) {
        const read = await readPdf(file, (fraction) => {
          setState((current) =>
            current.kind === "working"
              ? {
                  ...current,
                  stage: "reading",
                  progress: 0.05 + ((index + fraction) / picked.length) * 0.5,
                }
              : current,
          );
        });
        if (!read.ok) {
          track("file_rejected", { code: read.failure.code });
          setState({
            kind: "rejected",
            code: read.failure.code,
            message: EXTRACTION_ERROR_MESSAGES[read.failure.code],
            summary: null,
            reconciliation: null,
            preview: null,
          });
          for (const held of local) releasePdfBytes(held.bytes);
          return;
        }
        combinedPages += read.document.pageCount;
        if (combinedPages > PAYLOAD_LIMITS.maxPages) {
          releasePdfBytes(read.bytes);
          for (const held of local) releasePdfBytes(held.bytes);
          track("file_rejected", { code: "too_many_pages" });
          setState({
            kind: "rejected",
            code: "too_many_pages",
            message: EXTRACTION_ERROR_MESSAGES.too_many_pages,
            summary: null,
            reconciliation: null,
            preview: null,
          });
          return;
        }
        local.push({
          fileId: randomId(8),
          fileName: file.name,
          pageCount: read.document.pageCount,
          bytes: read.bytes,
          document: read.document,
        });
      }

      bytesRef.current = local;
      track("file_selected", {
        pages: pageBucket(combinedPages),
        size: sizeBucket(picked.reduce((sum, file) => sum + file.size, 0)),
      });
      track("extraction_started", { pages: pageBucket(combinedPages) });

      setState((current) =>
        current.kind === "working" ? { ...current, stage: "parsing", progress: 0.62 } : current,
      );

      const controller = new AbortController();
      abortRef.current = controller;
      const jobId = randomId(16);

      const outcome = await requestParse(
        {
          jobId,
          files: local.map((file) => ({
            fileId: file.fileId,
            document: file.document,
          })),
        },
        controller.signal,
      );
      abortRef.current = null;

      const elapsed = Date.now() - startedAt;

      if (outcome.status === "error") {
        if (outcome.code === "aborted") return;
        track("extraction_failed", {
          code: outcome.code,
          pages: pageBucket(combinedPages),
          duration: durationBucket(elapsed),
        });
        setState({
          kind: "rejected",
          code: outcome.code,
          message: outcome.message,
          summary: null,
          reconciliation: null,
          preview: null,
        });
        return;
      }

      if (outcome.status === "rejected") {
        track("extraction_failed", {
          code: outcome.code,
          pages: pageBucket(combinedPages),
          duration: durationBucket(elapsed),
        });
        setState({
          kind: "rejected",
          code: outcome.code,
          message: outcome.message,
          summary: outcome.summary,
          reconciliation: outcome.reconciliation,
          preview: outcome.preview,
        });
        return;
      }

      setState((current) =>
        current.kind === "working" ? { ...current, stage: "checking", progress: 0.9 } : current,
      );

      const files: ParseFileResult[] =
        outcome.status === "pack"
          ? outcome.files
          : (outcome.files ?? [
              {
                fileId: local[0]?.fileId ?? randomId(8),
                pageCount: local[0]?.pageCount ?? combinedPages,
                status: "reconciled",
                code: null,
                message: null,
                source: outcome.source,
                reconciliation: outcome.reconciliation,
                summary: outcome.summary,
                preview: outcome.preview,
                totalTransactions: outcome.totalTransactions,
                warnings: outcome.warnings,
                digest: null,
                sealed: null,
                verification: outcome.verification ?? null,
              },
            ]);

      const digest = outcome.status === "pack" ? outcome.digest : outcome.digest;
      const sealed = outcome.status === "pack" ? outcome.sealed : outcome.sealed;
      const eligible = outcome.status === "pack" ? outcome.eligible : Boolean(digest && sealed);
      const totalPages = outcome.status === "pack" ? outcome.totalPages : combinedPages;

      if (eligible && digest && sealed) {
        const first = files.find((file) => file.status === "reconciled");
        const stored = await saveJob({
          jobId: outcome.jobId,
          digest,
          sealed,
          summary: first?.summary ?? (outcome as ParseSuccess).summary,
          reconciliation: first?.reconciliation ?? (outcome as ParseSuccess).reconciliation,
          preview: first?.preview ?? (outcome as ParseSuccess).preview,
          totalTransactions: files.reduce((sum, file) => sum + (file.totalTransactions ?? 0), 0),
          warnings: first?.warnings ?? (outcome.status === "reconciled" ? outcome.warnings : []),
          createdAt: Date.now(),
        }).catch(() => false);

        const recovered = initialSession ? await verifyPayment(initialSession) : null;
        const recoveryError =
          recovered?.status === "paid" && recovered.digest !== digest
            ? "These verified files do not match the pack covered by that payment. Re-upload the exact same files; you have not been charged again."
            : recovered?.status === "error"
              ? recovered.message
              : recovered?.status === "unpaid"
                ? "That checkout is not recorded as paid."
                : null;

        if (recovered?.status === "paid" && recovered.digest === digest && stored) {
          router.replace(
            `${routes.checkoutSuccess}?session_id=${encodeURIComponent(initialSession ?? "")}`,
          );
          return;
        }

        if (outcome.status === "reconciled") {
          track("extraction_succeeded", {
            pages: pageBucket(totalPages),
            rows: rowBucket(outcome.totalTransactions),
            statementType: outcome.summary.statementType,
            method: outcome.reconciliation.method,
            duration: durationBucket(elapsed),
            source: outcome.source,
          });
          track("reconciliation_passed", {
            method: outcome.reconciliation.method,
            rows: rowBucket(outcome.totalTransactions),
          });
        }

        setState({
          kind: "pack",
          storageWarning: !stored,
          view: {
            jobId: outcome.jobId,
            files,
            local,
            digest,
            sealed,
            eligible: true,
            totalPages,
            checkoutBusy: false,
            checkoutError: recoveryError,
            selected: first?.preview?.[0] ?? null,
            selectedFileId: first?.fileId ?? null,
          },
        });
        return;
      }

      setState({
        kind: "pack",
        storageWarning: false,
        view: {
          jobId: outcome.jobId,
          files,
          local,
          digest: null,
          sealed: null,
          eligible: false,
          totalPages,
          checkoutBusy: false,
          checkoutError: null,
          selected: files.find((file) => file.preview?.length)?.preview?.[0] ?? null,
          selectedFileId: files[0]?.fileId ?? null,
        },
      });
    },
    [initialSession, router],
  );

  useEffect(() => {
    const pending = takeFiles();
    if (pending.length > 0) {
      queueMicrotask(() => void convert(pending));
    }
  }, [convert, takeFiles]);

  const removeFile = useCallback(
    async (fileId: string) => {
      if (state.kind !== "pack") return;
      const remaining = state.view.files.filter((file) => file.fileId !== fileId);
      const remainingLocal = state.view.local.filter((file) => file.fileId !== fileId);
      const dropped = state.view.local.find((file) => file.fileId === fileId);
      if (dropped) releasePdfBytes(dropped.bytes);
      bytesRef.current = remainingLocal;

      if (remaining.length === 0) {
        reset();
        return;
      }

      const passing = remaining.filter(
        (file) => file.status === "reconciled" && file.digest && file.sealed,
      );
      if (passing.length !== remaining.length) {
        setState({
          kind: "pack",
          storageWarning: false,
          view: {
            ...state.view,
            files: remaining,
            local: remainingLocal,
            digest: null,
            sealed: null,
            eligible: false,
            totalPages: remainingLocal.reduce((sum, file) => sum + file.pageCount, 0),
          },
        });
        return;
      }

      const assembled = await requestAssemblePack({
        jobId: state.view.jobId,
        files: passing.map((file) => ({
          fileId: file.fileId,
          digest: file.digest!,
          sealed: file.sealed!,
          pageCount: file.pageCount,
        })),
      });
      if (assembled.status === "error") {
        setState({
          kind: "pack",
          storageWarning: false,
          view: {
            ...state.view,
            files: remaining,
            local: remainingLocal,
            digest: null,
            sealed: null,
            eligible: false,
            checkoutError: assembled.message,
            totalPages: remainingLocal.reduce((sum, file) => sum + file.pageCount, 0),
          },
        });
        return;
      }

      const first = remaining.find((file) => file.status === "reconciled");
      const stored = await saveJob({
        jobId: state.view.jobId,
        digest: assembled.digest,
        sealed: assembled.sealed,
        summary: first?.summary as StatementSummary,
        reconciliation: first?.reconciliation as ReconciliationResult,
        preview: first?.preview ?? [],
        totalTransactions: remaining.reduce((sum, file) => sum + (file.totalTransactions ?? 0), 0),
        warnings: first?.warnings ?? [],
        createdAt: Date.now(),
      }).catch(() => false);

      setState({
        kind: "pack",
        storageWarning: !stored,
        view: {
          ...state.view,
          files: remaining,
          local: remainingLocal,
          digest: assembled.digest,
          sealed: assembled.sealed,
          eligible: true,
          checkoutError: null,
          totalPages: assembled.totalPages,
        },
      });
    },
    [reset, state],
  );

  const startCheckout = useCallback(async () => {
    if (state.kind !== "pack" || !state.view.eligible || !state.view.digest || !state.view.sealed) {
      return;
    }
    const view = state.view;
    const digest = view.digest;
    const sealed = view.sealed;
    if (!digest || !sealed) return;
    setState({ ...state, view: { ...view, checkoutBusy: true, checkoutError: null } });

    const rows = view.files.reduce((sum, file) => sum + (file.totalTransactions ?? 0), 0);
    track("checkout_clicked", { rows: rowBucket(rows), statementType: "unknown" });

    const outcome = await requestCheckout({
      jobId: view.jobId,
      digest,
      sealed,
      pageCount: view.totalPages,
      fileCount: view.files.length,
    });

    if (outcome.status === "error") {
      track("checkout_failed", { code: outcome.code });
      setState({
        ...state,
        view: { ...view, checkoutBusy: false, checkoutError: outcome.message },
      });
      return;
    }

    track("checkout_redirected", {});
    window.location.assign(outcome.url);
  }, [state]);

  const selectedFile =
    state.kind === "pack"
      ? (state.view.files.find((file) => file.fileId === state.view.selectedFileId) ??
        state.view.files.find((file) => file.status === "reconciled") ??
        state.view.files[0])
      : null;
  const selectedLocal =
    state.kind === "pack"
      ? state.view.local.find((file) => file.fileId === (selectedFile?.fileId ?? ""))
      : null;

  return (
    <div className="space-y-6">
      {state.kind === "pack" && state.storageWarning ? (
        <Card className="border-caution-200 bg-caution-50">
          <p className="text-caution-900 text-sm leading-relaxed">
            <span className="font-semibold">This browser will not keep your conversion.</span> We
            could not store the converted result locally — usually private browsing, or storage
            blocked for this site. Because we keep no copy on our side, paying now could leave you
            with a payment and no download. Use a normal window, or another browser, before paying.
          </p>
        </Card>
      ) : null}

      {initialSession && state.kind === "idle" ? (
        <Card className="border-accent-200 bg-accent-50">
          <p className="text-ink-800 text-sm leading-relaxed">
            Payment recovery is active. Re-upload the exact same file or files; after verification,
            their digest will be matched to the paid session and your download will return without a
            second charge.
          </p>
        </Card>
      ) : null}

      {state.kind === "idle" ? (
        <>
          <Dropzone onFiles={(files) => void convert(files)} />
          <IdlePromise />
        </>
      ) : null}

      {state.kind === "working" ? (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-ink-700 text-sm">
              <span className="text-ink-950 font-medium">Converting {state.fileName}</span>{" "}
              <span className="text-ink-500">
                — a combined {siteConfig.limits.maxPages}-page limit applies, and nothing is charged
                unless every kept file is verified.
              </span>
            </p>
          </Card>
          <ProgressPanel stage={state.stage} progress={state.progress} />
        </>
      ) : null}

      <div ref={resultRef} tabIndex={-1} className="space-y-6 focus:outline-none">
        {state.kind === "rejected" ? (
          <>
            <FailurePanel code={state.code} message={state.message} onRetry={reset} />
            {state.summary && state.reconciliation ? (
              <>
                <p className="text-ink-600 text-sm">
                  This is what we read, and where the numbers stopped agreeing. It is shown so you
                  can see the problem for yourself, not because we are asking you to pay for it.
                </p>
                <ReconciliationPanel
                  summary={state.summary}
                  reconciliation={state.reconciliation}
                />
                {state.preview && state.preview.length > 0 ? (
                  <PreviewTable
                    rows={state.preview}
                    currency={state.summary.currency}
                    totalCount={state.summary.transactionCount}
                    locked
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {state.kind === "pack" ? (
          <>
            <FileList
              files={state.view.files}
              local={state.view.local}
              selectedFileId={state.view.selectedFileId}
              onSelect={(fileId) =>
                setState({
                  ...state,
                  view: {
                    ...state.view,
                    selectedFileId: fileId,
                    selected:
                      state.view.files.find((file) => file.fileId === fileId)?.preview?.[0] ??
                      state.view.selected,
                  },
                })
              }
              onRemove={(fileId) => void removeFile(fileId)}
            />

            {selectedFile?.verification ? (
              <EvidencePanel
                evidence={selectedFile.verification}
                fileCount={state.view.files.length}
                totalPages={state.view.totalPages}
              />
            ) : null}

            {selectedFile?.summary && selectedFile.reconciliation ? (
              <ReconciliationPanel
                summary={selectedFile.summary}
                reconciliation={selectedFile.reconciliation}
                warnings={selectedFile.warnings}
              />
            ) : null}

            {selectedFile?.preview && selectedFile.summary ? (
              <PreviewTable
                rows={selectedFile.preview}
                currency={selectedFile.summary.currency}
                totalCount={selectedFile.totalTransactions ?? selectedFile.preview.length}
                locked
                selectedId={state.view.selected?.id}
                onSelect={(row) => {
                  // Fires once per opened row, with no identifier for which row: how many
                  // people actually check the evidence is a funnel question, which row they
                  // checked is a fact about their statement.
                  if (state.view.selected?.id !== row.id) track("source_reference_opened", {});
                  setState({ ...state, view: { ...state.view, selected: row } });
                }}
              />
            ) : null}

            <SourceInspector
              transaction={state.view.selected}
              bytes={selectedLocal?.bytes ?? null}
            />

            {state.view.eligible && state.view.digest && state.view.sealed ? (
              <Paywall
                transactionCount={state.view.files.reduce(
                  (sum, file) => sum + (file.totalTransactions ?? 0),
                  0,
                )}
                onCheckout={() => void startCheckout()}
                busy={state.view.checkoutBusy}
                error={state.view.checkoutError}
              />
            ) : (
              <Card className="border-caution-200 bg-caution-50">
                <Heading level={3}>Checkout is not available yet</Heading>
                <p className="text-ink-700 mt-2 text-sm leading-relaxed">
                  Every file you keep must pass verification. Remove a failed or ambiguous file to
                  buy only the verified subset — we will not silently omit it from a paid pack.
                </p>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function FileList({
  files,
  local,
  selectedFileId,
  onSelect,
  onRemove,
}: {
  files: ParseFileResult[];
  local: LocalFile[];
  selectedFileId: string | null;
  onSelect: (fileId: string) => void;
  onRemove: (fileId: string) => void;
}) {
  return (
    <Card>
      <Heading level={4}>Files in this pack</Heading>
      <p className="text-ink-600 mt-1 text-sm">
        Names stay in this browser. {files.length} {files.length === 1 ? "file" : "files"} ·{" "}
        {local.reduce((sum, file) => sum + file.pageCount, 0)} total pages.
      </p>
      <ul className="mt-4 space-y-2">
        {files.map((file) => {
          const name = local.find((entry) => entry.fileId === file.fileId)?.fileName ?? "Statement";
          const passed = file.status === "reconciled";
          return (
            <li
              key={file.fileId}
              className="border-ink-200 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
            >
              <button
                type="button"
                className="text-left text-sm"
                onClick={() => onSelect(file.fileId)}
                aria-current={selectedFileId === file.fileId}
              >
                <span className="text-ink-950 font-medium">{name}</span>
                <span className="text-ink-500 ml-2">
                  {file.pageCount} {file.pageCount === 1 ? "page" : "pages"} ·{" "}
                  {passed ? "VERIFICATION PASSED" : "VERIFICATION REJECTED"}
                </span>
              </button>
              {files.length > 1 ? (
                <Button size="sm" variant="secondary" onClick={() => onRemove(file.fileId)}>
                  Remove
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function IdlePromise() {
  const points = [
    {
      title: "The PDF never leaves your device",
      detail:
        "Your browser opens the file and extracts the text. The file itself is not uploaded, and the text we do receive is not stored after the response.",
    },
    {
      title: "You see the evidence before you pay",
      detail:
        "Source-mapped rows, running-balance transitions, page completeness, and the printed balances are shown first. Payment appears only after verification passes.",
    },
    {
      title: "If it is not verified, there is no charge",
      detail:
        "The payment step does not appear for incomplete, ambiguous, or rejected files. There is no refund to request because there is no payment to reverse.",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {points.map((point) => (
        <Card key={point.title} className="p-5">
          <Heading level={4}>{point.title}</Heading>
          <p className="text-ink-600 mt-2 text-sm leading-relaxed">{point.detail}</p>
        </Card>
      ))}
    </div>
  );
}

export const fileLimitLabel = `${formatFileSize(siteConfig.limits.maxFileSizeBytes)} max`;
export type { ExtractionErrorCode };
