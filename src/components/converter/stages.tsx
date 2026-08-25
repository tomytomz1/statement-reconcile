"use client";

import Link from "next/link";
import { useState } from "react";

import { routes, siteConfig } from "@/config/site";
import type { ExtractionErrorCode } from "@/lib/extraction/types";
import { Button } from "@/components/ui/button";
import { Card, Heading } from "@/components/ui/primitives";

/**
 * Progress and failure states.
 *
 * Two rules shape everything here. Progress is described in terms of what is happening to
 * the customer's document, not in terms of our internals, because "Checking the arithmetic"
 * tells them something and "POST /api/parse" does not. And every failure names the next
 * action, because a message that explains a problem without saying what to do about it just
 * moves the work onto the customer.
 */

export type Stage = "reading" | "parsing" | "checking";

const STAGE_COPY: Record<Stage, { title: string; detail: string }> = {
  reading: {
    title: "Reading your PDF",
    detail: "Opening the file in your browser and pulling out the text layer. Nothing is uploaded.",
  },
  parsing: {
    title: "Rebuilding the transaction table",
    detail: "Working out which columns hold dates, descriptions, debits, credits, and balances.",
  },
  checking: {
    title: "Checking the arithmetic",
    detail: "Adding up every row and comparing the totals with the balances on your statement.",
  },
};

const STAGE_ORDER: Stage[] = ["reading", "parsing", "checking"];

export function ProgressPanel({ stage, progress }: { stage: Stage; progress: number }) {
  const copy = STAGE_COPY[stage];
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <Card>
      <div aria-live="polite" aria-atomic="true">
        <Heading level={3}>{copy.title}</Heading>
        <p className="text-ink-600 mt-1.5 text-sm leading-relaxed">{copy.detail}</p>
      </div>

      <div
        className="bg-ink-100 mt-5 h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Conversion progress"
      >
        <div
          className="bg-accent-600 h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>

      <ol className="mt-5 space-y-2">
        {STAGE_ORDER.map((item, index) => {
          const current = STAGE_ORDER.indexOf(stage);
          const state = index < current ? "done" : index === current ? "active" : "todo";
          return (
            <li key={item} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className={
                  state === "done"
                    ? "bg-verified-600 flex size-5 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
                    : state === "active"
                      ? "border-accent-600 flex size-5 items-center justify-center rounded-full border-2 bg-white"
                      : "border-ink-200 flex size-5 items-center justify-center rounded-full border-2 bg-white"
                }
              >
                {state === "done" ? "✓" : ""}
              </span>
              <span className={state === "todo" ? "text-ink-400" : "text-ink-800"}>
                {STAGE_COPY[item].title}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/**
 * What to do about each failure.
 *
 * Every code has a specific next step. Where the honest answer is "this tool cannot do that",
 * it says so plainly instead of inviting the customer to keep retrying.
 */
const REMEDIES: Partial<Record<ExtractionErrorCode | "network" | "aborted", string[]>> = {
  no_text_layer: [
    "Download the statement again from your online banking rather than scanning or photographing the paper copy — the downloaded version contains real text.",
    "If you only have a paper statement, this tool cannot help: it does not read images, and guessing at a scanned table is exactly the mistake it exists to avoid.",
  ],
  encrypted_pdf: [
    "Open the PDF in your usual reader, enter the password, and save a copy without one.",
    "In Preview on macOS: File → Export as PDF with encryption unchecked. In Adobe Acrobat: File → Properties → Security → No Security.",
  ],
  not_a_pdf: [
    "Upload the PDF file your bank issued. Screenshots, images, and spreadsheets cannot be converted.",
  ],
  unreadable_pdf: [
    "Download the statement again — the file may have been truncated during the original download.",
    "If a second copy fails the same way, the file is damaged and there is nothing recoverable in it.",
  ],
  too_many_pages: [
    `This statement is longer than ${siteConfig.limits.maxPages} pages. Split it in a PDF editor and convert each part separately, or get in touch about a longer statement.`,
  ],
  file_too_large: [
    `The file is above ${siteConfig.limits.maxFileSizeMb} MB. Statements are rarely this large; check you have the statement rather than a bundle of documents.`,
  ],
  multiple_accounts: [
    "This document contains more than one account. A combined document cannot be balanced as a single statement, because there is no single opening and closing balance to check against.",
    "Download each account's statement separately and convert them one at a time.",
  ],
  no_transactions_found: [
    "We could not find a transaction table. Check that this is the full statement and not a summary, a cover letter, or an annual interest certificate.",
  ],
  layout_not_recognized: [
    "We read the page but could not identify the columns confidently enough to trust the result. Rather than hand you a spreadsheet that might be wrong, we stopped.",
    "Get in touch and include the name of your bank and the statement layout — not the statement itself. Layouts we hear about get added.",
  ],
  reconciliation_failed: [
    "We extracted transactions, but the totals do not match the balances printed on the statement, which means something was misread.",
    "You have not been charged. The figures we calculated are shown above so you can see where the discrepancy is.",
  ],
  unsupported_currency: [
    "We could not determine the statement's currency with confidence, and getting that wrong would change every amount.",
  ],
  provider_unavailable: ["This is temporary. Wait a moment and try the same file again."],
  provider_invalid_output: ["We could not read this layout reliably. You have not been charged."],
  rate_limited: [
    "You have run several conversions in a short time. Wait a few minutes and try again.",
  ],
  payload_too_large: [
    "This statement contains more text than a single conversion can handle. Split it into two files and convert each one.",
  ],
  network: ["Check your connection and try again. Your file has not left your device."],
  internal_error: ["This one is on us. Try again, and get in touch if it happens twice."],
};

/**
 * Codes that mean our infrastructure failed rather than the statement being unusable.
 *
 * These get a support code, because there is nothing the customer can inspect for
 * themselves and "try again" is only useful advice the first time.
 */
const INFRASTRUCTURE_FAILURES = new Set<string>([
  "internal_error",
  "provider_unavailable",
  "provider_invalid_output",
]);

/**
 * A reference a customer can quote to support.
 *
 * Derived from the error code plus four random characters, so it identifies one incident
 * without encoding anything about the statement — the code half is a fixed enum member and
 * the suffix half is noise. §94 requires the reference to carry no sensitive information,
 * which rules out anything derived from the document, the filename, or the job.
 */
function supportCode(code: string): string {
  const stem = code
    .replace(/[^a-z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const suffix = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `SR-${stem}${suffix}`;
}

export function FailurePanel({
  code,
  message,
  onRetry,
  children,
}: {
  code: string;
  message: string;
  onRetry: () => void;
  children?: React.ReactNode;
}) {
  const remedies = REMEDIES[code as ExtractionErrorCode] ?? REMEDIES.internal_error ?? [];
  // Whether we got far enough to compute figures the customer can look at. When we did, the
  // reassurance can be stronger: there is nothing to refund because nothing was ever billed.
  const reachedArithmetic = code === "reconciliation_failed" || code === "layout_not_recognized";
  const isInfrastructure = INFRASTRUCTURE_FAILURES.has(code);
  // Generated once per mounted failure, so the reference a customer writes down does not
  // change under them on a re-render.
  const [reference] = useState(() => (isInfrastructure ? supportCode(code) : null));

  return (
    <Card className="border-l-refused-700 border-l-4">
      <div role="alert">
        <Heading level={3}>
          {isInfrastructure
            ? "We couldn't complete this conversion"
            : "We couldn't verify this statement safely"}
        </Heading>
        <p className="text-ink-800 mt-2 text-sm leading-relaxed">{message}</p>
      </div>

      <p className="bg-verified-50 text-verified-900 mt-4 rounded-lg px-4 py-3 text-sm font-semibold">
        You have not been charged.{" "}
        <span className="font-normal">
          {reachedArithmetic
            ? "There is nothing to refund, because the payment step only appears once the numbers agree."
            : "The payment step only appears once a statement has passed verification."}
        </span>
      </p>

      {children}

      {remedies.length > 0 ? (
        <div className="mt-5">
          <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
            What to do next
          </p>
          <ul className="text-ink-700 mt-2.5 space-y-2 text-sm leading-relaxed">
            {remedies.map((remedy) => (
              <li key={remedy} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="bg-ink-400 mt-[0.4rem] size-1.5 shrink-0 rounded-full"
                />
                <span>{remedy}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {reference ? (
        <p className="border-ink-200 text-ink-600 mt-5 rounded-lg border bg-white px-4 py-3 text-sm">
          If it happens again, quote this when you get in touch:{" "}
          <span className="text-ink-950 tabular font-semibold">{reference}</span>
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={onRetry} variant="secondary">
          Try another statement
        </Button>
        <Link
          href={`${routes.howItWorks}#failure`}
          className="text-accent-700 text-sm font-medium underline-offset-2 hover:underline"
        >
          Why verification fails
        </Link>
        <Link
          href={routes.contact}
          className="text-ink-600 text-sm font-medium underline-offset-2 hover:underline"
        >
          Tell us about this layout
        </Link>
      </div>
    </Card>
  );
}
