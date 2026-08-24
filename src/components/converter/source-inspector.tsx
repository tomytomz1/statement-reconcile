"use client";

import type { Transaction } from "@/lib/schema/statement";
import { Card, Heading } from "@/components/ui/primitives";

import { PdfSourcePreview } from "./pdf-source-preview";

export function SourceInspector({
  transaction,
  bytes,
}: {
  transaction: Transaction | null;
  bytes: Uint8Array | null;
}) {
  if (!transaction) {
    return (
      <Card>
        <Heading level={4}>Source inspection</Heading>
        <p className="text-ink-600 mt-2 text-sm leading-relaxed">
          Select a preview row to jump to its page and compare the raw source text with the
          normalized values.
        </p>
      </Card>
    );
  }

  const page = transaction.sourceRegions[0]?.page ?? transaction.sourcePage ?? 1;

  return (
    <Card>
      <Heading level={4}>Source inspection</Heading>
      <p className="text-ink-600 mt-1 text-sm">
        Page {page}. Keyboard users can move between rows with arrow keys.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-500 text-xs font-semibold tracking-[0.06em] uppercase">
            Raw source text
          </dt>
          <dd className="text-ink-900 mt-1 break-words">{transaction.rawSourceText || "—"}</dd>
        </div>
        <div>
          <dt className="text-ink-500 text-xs font-semibold tracking-[0.06em] uppercase">
            Normalized values
          </dt>
          <dd className="text-ink-900 mt-1">
            {transaction.date} · {transaction.description} · {transaction.amount}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-ink-500 text-xs font-semibold tracking-[0.06em] uppercase">
            Checks applied
          </dt>
          <dd className="text-ink-800 mt-1">
            {transaction.verification.checks.join(" · ") || "source mapped"}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <PdfSourcePreview bytes={bytes} page={page} regions={transaction.sourceRegions} />
      </div>
    </Card>
  );
}
