"use client";

import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Card, Heading } from "@/components/ui/primitives";

/**
 * The paywall.
 *
 * It is only ever rendered after the reconciliation panel has said the statement balances, so
 * by the time a customer reads this they have already seen the numbers agree and a sample of
 * their own data. The copy therefore does not need to persuade — it needs to remove doubt
 * about what happens next, which is why it states the price, the scope, and what is included
 * rather than repeating the pitch.
 */
export function Paywall({
  transactionCount,
  onCheckout,
  busy,
  error,
}: {
  transactionCount: number;
  onCheckout: () => void;
  busy: boolean;
  error?: string | null;
}) {
  return (
    <Card className="border-accent-200 from-accent-50/70 bg-gradient-to-b to-white">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <Heading level={3}>Download your verified files</Heading>
          <p className="text-ink-700 mt-2 text-sm leading-relaxed">
            All {transactionCount.toLocaleString("en-US")}{" "}
            {transactionCount === 1 ? "transaction" : "transactions"} are included, in Excel, CSV,
            and a verification report. One payment, for this conversion pack.
          </p>

          <ul className="text-ink-700 mt-4 space-y-2 text-sm">
            {[
              "Excel workbook (.xlsx) with transactions, a summary sheet, a verification sheet, and source references",
              "CSV file with a fixed column order, ready to import",
              "Per-statement verification PDF and pack-manifest.json",
              "Re-download for 30 days from the same browser",
              "Full refund if the file is wrong or you cannot use it",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="bg-accent-600 mt-[0.4rem] size-1.5 shrink-0 rounded-full"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-ink-950 text-4xl font-bold tracking-tight">
            {siteConfig.price.display}
          </p>
          <p className="text-ink-600 mt-1 text-sm">once · no account</p>
          <Button
            className="mt-4"
            size="lg"
            onClick={onCheckout}
            disabled={busy}
            aria-busy={busy}
            data-testid="checkout-button"
          >
            {busy ? "Opening secure checkout…" : siteConfig.verifiedCta}
          </Button>
          <p className="text-ink-500 mt-3 max-w-[15rem] text-xs leading-relaxed sm:ml-auto">
            Card details are entered on Stripe&rsquo;s own page. They never reach our servers.
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-refused-200 bg-refused-50 text-refused-900 mt-5 rounded-lg border px-4 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}
    </Card>
  );
}
