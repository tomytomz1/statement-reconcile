import { formatMoney } from "@/lib/money/decimal";
import type { NormalizedStatement } from "@/lib/schema/statement";

import { csvRow, neutralizeFormula } from "./sanitize";

/**
 * CSV export.
 *
 * The column order is fixed and documented on the marketing pages, because customers
 * build imports against it. Columns that a statement does not provide are written as
 * empty strings rather than omitted, so every file has the same shape.
 */

export const CSV_COLUMNS = [
  "Date",
  "Posted Date",
  "Description",
  "Debit",
  "Credit",
  "Amount",
  "Balance",
] as const;

/** UTF-8 BOM, so Excel on Windows opens the file as UTF-8 rather than the system codepage. */
const BOM = "\uFEFF";

export function buildCsv(statement: NormalizedStatement, options: { bom?: boolean } = {}): string {
  const currency = statement.currency;
  const lines: string[] = [csvRow([...CSV_COLUMNS])];

  for (const transaction of statement.transactions) {
    lines.push(
      csvRow([
        transaction.date,
        transaction.postedDate ?? "",
        neutralizeFormula(transaction.description),
        transaction.debit ? formatMoney(transaction.debit, currency) : "",
        transaction.credit ? formatMoney(transaction.credit, currency) : "",
        formatMoney(transaction.amount, currency),
        transaction.runningBalance ? formatMoney(transaction.runningBalance, currency) : "",
      ]),
    );
  }

  // CRLF is what RFC 4180 specifies and what Excel expects.
  const body = `${lines.join("\r\n")}\r\n`;
  return options.bom === false ? body : `${BOM}${body}`;
}
