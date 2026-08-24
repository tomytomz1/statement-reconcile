"use client";

import { formatCurrency, formatPeriod, formatSigned } from "@/lib/money/display";
import type { ReconciliationResult, StatementSummary } from "@/lib/schema/statement";
import { Badge, Card, Heading } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

/**
 * The reconciliation panel.
 *
 * This is the product. Everything else — the upload, the table, the paywall — exists to get
 * a customer to this panel and let them decide for themselves whether to trust it.
 *
 * So it shows the arithmetic rather than a verdict badge. The equation used, the two numbers
 * being compared, the difference between them, and every individual check with its expected
 * and actual value. A customer who wants to verify our claim with a calculator can, and that
 * possibility is the reason the claim is worth anything.
 */
export function ReconciliationPanel({
  summary,
  reconciliation,
  warnings,
}: {
  summary: StatementSummary;
  reconciliation: ReconciliationResult;
  warnings?: readonly string[];
}) {
  const passed = reconciliation.passed;
  const currency = summary.currency;

  return (
    <Card className={cn("border-l-4", passed ? "border-l-verified-600" : "border-l-refused-700")}>
      <div
        className="flex flex-wrap items-start justify-between gap-3"
        data-testid="reconciliation-status"
      >
        <div>
          <Heading level={3}>
            {passed ? "This statement balances" : "This statement does not balance"}
          </Heading>
          <p className="text-ink-600 mt-1.5 text-sm leading-relaxed">
            {passed
              ? "Every transaction we extracted was added up and compared with the figures printed on your statement. They agree exactly."
              : "We added up every transaction we extracted and compared it with the figures printed on your statement. They do not agree, so we will not sell you this conversion."}
          </p>
        </div>
        <Badge tone={passed ? "verified" : "refused"}>{passed ? "Verified" : "Not verified"}</Badge>
      </div>

      {reconciliation.equation ? (
        <div className="bg-ink-50 mt-5 rounded-lg p-4">
          <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
            Check applied
          </p>
          <p className="tabular text-ink-900 mt-2 text-sm font-medium">{reconciliation.equation}</p>
          <p className="text-ink-500 mt-1 text-xs">{reconciliation.methodLabel}</p>
        </div>
      ) : null}

      {reconciliation.expectedClosingBalance && reconciliation.actualClosingBalance ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Figure
            label="Calculated from transactions"
            value={formatSigned(reconciliation.expectedClosingBalance, currency)}
          />
          <Figure
            label="Printed on the statement"
            value={formatSigned(reconciliation.actualClosingBalance, currency)}
          />
          <Figure
            label="Difference"
            value={formatSigned(reconciliation.difference ?? "0", currency)}
            tone={passed ? "verified" : "refused"}
          />
        </dl>
      ) : null}

      <dl className="border-ink-200 mt-6 grid gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          label="Statement period"
          value={formatPeriod(summary.periodStart, summary.periodEnd)}
          small
        />
        <Figure label="Transactions found" value={String(summary.transactionCount)} small />
        <Figure label="Money in" value={formatCurrency(summary.totalCredits, currency)} small />
        <Figure label="Money out" value={formatCurrency(summary.totalDebits, currency)} small />
        {summary.openingBalance ? (
          <Figure
            label="Opening balance"
            value={formatSigned(summary.openingBalance, currency)}
            small
          />
        ) : null}
        {summary.closingBalance ? (
          <Figure
            label="Closing balance"
            value={formatSigned(summary.closingBalance, currency)}
            small
          />
        ) : null}
        <Figure label="Net change" value={formatSigned(summary.netChange, currency)} small />
        <Figure label="Currency" value={currency} small />
      </dl>

      <details className="group border-ink-200 mt-6 border-t pt-4">
        <summary className="text-accent-700 hover:text-accent-800 cursor-pointer text-sm font-semibold">
          Show every check we ran ({reconciliation.checks.length})
        </summary>
        <ul className="mt-4 space-y-2.5">
          {reconciliation.checks.map((check) => (
            <li
              key={check.name}
              className="bg-ink-50 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md px-3 py-2.5 text-sm"
            >
              <span className="flex items-baseline gap-2">
                <CheckMark passed={check.passed} advisory={check.advisory} />
                <span className="text-ink-800">{check.label}</span>
              </span>
              {check.expected !== undefined || check.actual !== undefined ? (
                <span className="tabular text-ink-600 text-xs">
                  expected {check.expected ?? "—"} · found {check.actual ?? "—"}
                  {check.difference ? ` · off by ${check.difference}` : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </details>

      {reconciliation.rejectionReasons.length > 0 ? (
        <div className="border-refused-200 bg-refused-50 mt-5 rounded-lg border p-4">
          <p className="text-refused-900 text-sm font-semibold">Why we could not verify it</p>
          <ul className="text-refused-900/90 mt-2 space-y-1.5 text-sm leading-relaxed">
            {reconciliation.rejectionReasons.map((reason) => (
              <li key={reason} className="ml-4 list-disc">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings && warnings.length > 0 ? (
        <div className="border-caution-200 bg-caution-50 mt-4 rounded-lg border p-4">
          <p className="text-caution-900 text-sm font-semibold">
            Worth a look before you rely on this
          </p>
          <ul className="text-caution-900/90 mt-2 space-y-1.5 text-sm leading-relaxed">
            {warnings.map((warning) => (
              <li key={warning} className="ml-4 list-disc">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function Figure({
  label,
  value,
  small,
  tone,
}: {
  label: string;
  value: string;
  small?: boolean;
  tone?: "verified" | "refused";
}) {
  return (
    <div>
      <dt className="text-ink-500 text-xs font-medium tracking-[0.06em] uppercase">{label}</dt>
      <dd
        className={cn(
          "tabular mt-1 font-semibold",
          small ? "text-ink-900 text-sm" : "text-lg",
          tone === "verified" && "text-verified-700",
          tone === "refused" && "text-refused-700",
          !tone && !small && "text-ink-950",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function CheckMark({ passed, advisory }: { passed: boolean; advisory: boolean }) {
  const label = passed ? "Passed" : advisory ? "Note" : "Failed";
  const tone = passed ? "text-verified-600" : advisory ? "text-caution-700" : "text-refused-700";
  return (
    <span className={cn("shrink-0 text-xs font-bold tracking-wide uppercase", tone)}>
      <span className="sr-only">{label}: </span>
      <span aria-hidden="true">{passed ? "✓" : advisory ? "!" : "✕"}</span>
    </span>
  );
}
