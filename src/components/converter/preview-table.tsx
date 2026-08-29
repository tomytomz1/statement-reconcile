"use client";

import { formatCurrency, formatIsoDate, formatSigned } from "@/lib/money/display";
import type { Transaction } from "@/lib/schema/statement";
import { cn } from "@/components/ui/cn";

/**
 * The preview table.
 *
 * Shows the first transaction values as they will appear in the export, while the downloaded
 * files add Posted Date and reference columns. Amounts use tabular figures and are right-aligned,
 * because a column of misaligned digits is unreadable and this table is the thing the customer
 * is being asked to check.
 */
export function PreviewTable({
  rows,
  currency,
  totalCount,
  locked,
  selectedId,
  onSelect,
}: {
  rows: readonly Transaction[];
  currency: string;
  totalCount: number;
  locked?: boolean;
  selectedId?: string | null;
  onSelect?: (row: Transaction) => void;
}) {
  const hidden = Math.max(0, totalCount - rows.length);

  return (
    <div className="rounded-card border-ink-200 shadow-panel overflow-hidden border bg-white">
      <div className="border-ink-200 flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
        <h3 className="text-ink-950 text-sm font-semibold">
          Extracted transactions
          <span className="text-ink-500 ml-2 font-normal">
            showing {rows.length} of {totalCount}
          </span>
        </h3>
        <p className="text-ink-500 text-xs">
          Same transaction data; exports add Posted Date and reference columns
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            The first {rows.length} of {totalCount} transactions extracted from your statement.
          </caption>
          <thead>
            <tr className="border-ink-200 bg-ink-50 border-b text-left">
              <Th>Date</Th>
              <Th>Description</Th>
              <Th align="right">Debit</Th>
              <Th align="right">Credit</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id ?? `${row.date}-${index}-${row.amount}`}
                tabIndex={onSelect ? 0 : undefined}
                aria-selected={selectedId === row.id}
                onClick={() => onSelect?.(row)}
                onKeyDown={(event) => {
                  if (!onSelect) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(row);
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    const next = rows[index + 1];
                    if (next) onSelect(next);
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    const previous = rows[index - 1];
                    if (previous) onSelect(previous);
                  }
                }}
                className={cn(
                  "border-ink-100 border-b last:border-0",
                  index % 2 === 1 && "bg-ink-50/50",
                  onSelect && "hover:bg-accent-50 cursor-pointer",
                  selectedId === row.id && "bg-accent-50",
                )}
              >
                <Td className="tabular text-ink-700 whitespace-nowrap">
                  {formatIsoDate(row.date)}
                </Td>
                <Td className="text-ink-900 max-w-[22rem]">
                  <span className="line-clamp-2">{row.description}</span>
                </Td>
                <Td align="right" className="tabular text-ink-700">
                  {row.debit ? formatCurrency(row.debit, currency) : ""}
                </Td>
                <Td align="right" className="tabular text-ink-700">
                  {row.credit ? formatCurrency(row.credit, currency) : ""}
                </Td>
                <Td
                  align="right"
                  className={cn(
                    "tabular font-medium",
                    row.amount.startsWith("-") ? "text-ink-900" : "text-verified-700",
                  )}
                >
                  {formatSigned(row.amount, currency)}
                </Td>
                <Td align="right" className="tabular text-ink-600">
                  {row.runningBalance ? formatSigned(row.runningBalance, currency) : ""}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hidden > 0 ? (
        <div className="border-ink-200 bg-ink-50 text-ink-600 border-t px-5 py-4 text-sm">
          {locked ? (
            <>
              <span className="text-ink-900 font-medium">
                {hidden.toLocaleString("en-US")} more {hidden === 1 ? "row" : "rows"}
              </span>{" "}
              are in the files. They were all included in the balance check above — that is what
              makes the check meaningful.
            </>
          ) : (
            <>The remaining {hidden.toLocaleString("en-US")} rows are in your downloaded files.</>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "text-ink-600 px-4 py-2.5 text-xs font-semibold tracking-[0.06em] uppercase",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-2.5 align-top", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}
