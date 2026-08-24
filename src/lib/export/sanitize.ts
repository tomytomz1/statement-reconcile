/**
 * Spreadsheet and CSV injection defence.
 *
 * A transaction description is attacker-controlled text: anyone can create a payee named
 * `=cmd|'/c calc'!A1`. Excel, LibreOffice, and Google Sheets treat a leading `=`, `+`,
 * `-`, `@`, tab, or carriage return as the start of a formula, so an unescaped
 * description can execute in the customer's spreadsheet. Every textual field written to
 * CSV or XLSX passes through {@link neutralizeFormula} first.
 *
 * The value is preserved, not deleted: a single apostrophe prefix is added, which
 * spreadsheets read as "this cell is text". The customer still sees the original text.
 */

/** Characters that begin a formula in mainstream spreadsheet applications. */
const FORMULA_LEADERS = new Set(["=", "+", "-", "@", "\t", "\r", "\n", "\u0009", "\u000D"]);

/** Control characters that have no place in a cell value. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function neutralizeFormula(value: string): string {
  const cleaned = value
    .replace(CONTROL_CHARS, " ")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  if (cleaned === "") return "";
  const first = cleaned[0] as string;
  return FORMULA_LEADERS.has(first) ? `'${cleaned}` : cleaned;
}

/** True when a value would be interpreted as a formula if written verbatim. */
export function wouldBeFormula(value: string): boolean {
  if (value === "") return false;
  const first = value[0] as string;
  return FORMULA_LEADERS.has(first);
}

/**
 * Quote a single CSV field.
 *
 * Fields are always quoted. Always quoting is a deliberate choice: it removes any
 * dependence on the reader's delimiter detection, and it means a description containing a
 * comma, a quote, or a newline cannot shift the column layout of the row.
 */
export function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Build one CSV line from already-sanitized values. */
export function csvRow(values: readonly string[]): string {
  return values.map((value) => csvField(value)).join(",");
}

/**
 * A worksheet name that Excel will accept: at most 31 characters and none of
 * `: \ / ? * [ ]`.
 */
export function safeSheetName(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned === "" ? fallback : cleaned).slice(0, 31);
}
