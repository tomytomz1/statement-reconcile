"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge, Card, Heading } from "@/components/ui/primitives";

type DownloadFormat = "csv" | "xlsx" | "report" | "manifest";

/**
 * Post-payment download.
 *
 * Excel, CSV, the verification report, and the pack manifest are one payment, so the
 * buttons are equally available. The delete control is here because we told the customer
 * their data stays on their device.
 */
export function DownloadPanel({
  onDownload,
  onDelete,
  onConvertAnother,
  transactionCount,
}: {
  onDownload: (format: DownloadFormat) => Promise<void>;
  onDelete: () => Promise<void>;
  onConvertAnother: () => void;
  transactionCount: number;
}) {
  const [busy, setBusy] = useState<DownloadFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function download(format: DownloadFormat) {
    setBusy(format);
    setError(null);
    try {
      await onDownload(format);
    } catch {
      setError("The download did not start. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (deleted) {
    return (
      <Card>
        <Heading level={3}>Deleted from this device</Heading>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed">
          The converted result has been removed from your browser&rsquo;s storage. We never had a
          copy, so there is nothing left anywhere. Your downloaded files are unaffected.
        </p>
        <Button className="mt-5" variant="secondary" onClick={onConvertAnother}>
          Convert another statement
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-verified-200 bg-verified-50/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level={3}>Payment confirmed — your files are ready</Heading>
          <p className="text-ink-700 mt-1.5 text-sm leading-relaxed">
            All {transactionCount.toLocaleString("en-US")}{" "}
            {transactionCount === 1 ? "transaction" : "transactions"}, plus verification reports.
            Download as many times as you need.
          </p>
        </div>
        <Badge tone="verified">Paid</Badge>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          size="lg"
          onClick={() => void download("xlsx")}
          disabled={busy !== null}
          aria-busy={busy === "xlsx"}
          data-testid="download-xlsx"
        >
          {busy === "xlsx" ? "Preparing workbook…" : "Download Excel (.xlsx)"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => void download("csv")}
          disabled={busy !== null}
          aria-busy={busy === "csv"}
          data-testid="download-csv"
        >
          {busy === "csv" ? "Preparing CSV…" : "Download CSV"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => void download("report")}
          disabled={busy !== null}
          aria-busy={busy === "report"}
          data-testid="download-report"
        >
          {busy === "report" ? "Preparing report…" : "Download verification PDF"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => void download("manifest")}
          disabled={busy !== null}
          aria-busy={busy === "manifest"}
          data-testid="download-manifest"
        >
          {busy === "manifest" ? "Preparing manifest…" : "Download pack manifest"}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-refused-200 text-refused-900 mt-4 rounded-lg border bg-white px-4 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      <div className="border-verified-200 mt-7 border-t pt-5">
        {/*
         * Two different lifetimes, and conflating them is how someone loses a file they paid
         * for. The converted result lives in this browser for `localJobTtlMinutes` and then
         * deletes itself. The 30-day entitlement is a separate thing held against the Stripe
         * session, and redeeming it means re-uploading the same PDFs so the digest can be
         * matched — which is only possible if the customer still has them.
         */}
        <p className="text-ink-700 text-sm leading-relaxed">
          <span className="text-ink-900 font-semibold">Download them now.</span> The converted
          result is held only in this browser and expires by itself within the hour.
        </p>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed">
          Your purchase lasts 30 days. After the local copy expires you can still get the files back
          by re-uploading the same PDFs on this device — they will be matched to your payment and
          you will not be charged again. Keep the original statements until you have the files you
          need.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onConvertAnother}>
            Convert another statement
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await onDelete();
              setDeleted(true);
            }}
          >
            Delete my data now
          </Button>
        </div>
      </div>
    </Card>
  );
}
