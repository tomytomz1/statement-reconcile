"use client";

import { useCallback, useEffect, useState } from "react";

import { routes, siteConfig } from "@/config/site";
import { rowBucket } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/client";
import { requestExport, saveBlob, verifyPayment } from "@/lib/client/api";
import { deleteJob, findJobByDigest, type StoredJob } from "@/lib/client/job-store";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Heading } from "@/components/ui/primitives";

import { DownloadPanel } from "./download-panel";
import { PreviewTable } from "./preview-table";
import { ReconciliationPanel } from "./reconciliation-panel";

/**
 * The page a customer lands on after paying.
 *
 * Two things have to line up: Stripe has to confirm the session was paid, and this browser has
 * to still hold the sealed result for the digest that session paid for. The session is looked
 * up first and the job is then found *by digest* rather than by an id passed through the
 * redirect, so paying in a new tab, or coming back to the URL later, still works.
 *
 * When only one half is present the message says which half, because "payment received, but
 * this browser no longer has the converted statement" needs a completely different response
 * from the customer than "that payment has not completed yet".
 */

type State =
  | { kind: "verifying" }
  | { kind: "ready"; job: StoredJob; sessionId: string }
  | { kind: "unpaid"; reason: string }
  | { kind: "job_missing"; sessionId: string }
  | { kind: "error"; message: string };

export function CheckoutReturn({ sessionId }: { sessionId: string | null }) {
  // A missing session reference is knowable before the first render, so it is the initial
  // state rather than something an effect corrects afterwards.
  const [state, setState] = useState<State>(() =>
    sessionId
      ? { kind: "verifying" }
      : { kind: "error", message: "This link is missing its payment reference." },
  );

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    void (async () => {
      const verified = await verifyPayment(sessionId);
      if (cancelled) return;

      if (verified.status === "error") {
        setState({ kind: "error", message: verified.message });
        return;
      }
      if (verified.status === "unpaid") {
        setState({ kind: "unpaid", reason: verified.reason });
        return;
      }

      track("payment_confirmed", {});
      const job = await findJobByDigest(verified.digest);
      if (cancelled) return;

      setState(job ? { kind: "ready", job, sessionId } : { kind: "job_missing", sessionId });
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const download = useCallback(
    async (format: "csv" | "xlsx" | "report" | "manifest") => {
      if (state.kind !== "ready") return;
      track("export_requested", { format });
      const outcome = await requestExport({
        sessionId: state.sessionId,
        digest: state.job.digest,
        sealed: state.job.sealed,
        format,
      });
      if (outcome.status === "error") {
        track("export_failed", { format, code: outcome.code });
        throw new Error(outcome.message);
      }
      saveBlob(outcome.blob, outcome.filename);
      track("export_downloaded", { format, rows: rowBucket(state.job.totalTransactions) });
    },
    [state],
  );

  const remove = useCallback(async () => {
    if (state.kind !== "ready") return;
    await deleteJob(state.job.jobId);
    track("data_deleted", {});
  }, [state]);

  if (state.kind === "verifying") {
    return (
      <Card>
        <div aria-live="polite">
          <Heading level={3}>Confirming your payment…</Heading>
          <p className="text-ink-600 mt-2 text-sm">
            Checking with Stripe and matching the payment to your conversion. This takes a moment.
          </p>
        </div>
        <div className="bg-ink-100 mt-5 h-2 w-full overflow-hidden rounded-full">
          <div className="bg-accent-600 h-full w-1/3 animate-pulse rounded-full" />
        </div>
      </Card>
    );
  }

  if (state.kind === "unpaid") {
    return (
      <Card className="border-l-caution-700 border-l-4">
        <Heading level={3}>Your verified result is still available on this device</Heading>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed">
          Stripe has not recorded this checkout as paid, and you have not been charged by{" "}
          {siteConfig.brandName} unless Stripe confirms the payment. Your conversion and its
          verification are untouched.
        </p>
        <p className="text-ink-600 mt-3 text-sm leading-relaxed">
          If you have just finished paying, some payment methods take a few seconds to settle —
          check again in a moment. If you cancelled, nothing was charged and there is nothing to
          undo.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={routes.app}>Return to checkout</ButtonLink>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Check again
          </Button>
        </div>
      </Card>
    );
  }

  if (state.kind === "job_missing") {
    return (
      <Card className="border-l-caution-700 border-l-4">
        <Heading level={3}>Payment received, but this browser no longer has the statement</Heading>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed">
          Your payment went through. The converted result is held only on the device that ran the
          conversion — we never keep a copy — and this browser does not have it.
        </p>
        <ul className="text-ink-700 mt-4 space-y-2 text-sm leading-relaxed">
          <li className="ml-4 list-disc">
            If you paid on a different device or browser, open this page there and the download will
            appear.
          </li>
          <li className="ml-4 list-disc">
            If you cleared your browsing data, or the hour-long expiry passed, re-upload the exact
            same files. A matching verified pack restores the download without another charge.
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={`${routes.app}?session_id=${encodeURIComponent(state.sessionId)}`}>
            Re-upload the paid files
          </ButtonLink>
          <ButtonLink href={routes.refundPolicy} variant="secondary">
            Read the refund policy
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="border-l-refused-700 border-l-4">
        <Heading level={3}>We could not confirm this payment</Heading>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed">{state.message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <ButtonLink href={routes.contact} variant="quiet">
            Contact support
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <DownloadPanel
        transactionCount={state.job.totalTransactions}
        onDownload={download}
        onDelete={remove}
        onConvertAnother={() => window.location.assign(routes.app)}
      />
      <ReconciliationPanel
        summary={state.job.summary}
        reconciliation={state.job.reconciliation}
        warnings={state.job.warnings}
      />
      <PreviewTable
        rows={state.job.preview}
        currency={state.job.summary.currency}
        totalCount={state.job.totalTransactions}
      />
    </div>
  );
}
