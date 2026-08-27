import {
  type DateContext,
  type DateOrder,
  findPeriod,
  inferDateOrder,
  normalizeDate,
} from "@/lib/dates/normalize";
import { type MoneyValue, currencyTolerance, formatMoney, toMoney } from "@/lib/money/decimal";
import { parseMoneyToken } from "@/lib/money/parse";
import { localOnlyDisclosure } from "@/lib/privacy/receipt";
import { reconcile } from "@/lib/reconciliation/reconcile";
import { passedVerification, tracedFields, transactionId } from "@/lib/schema/build";
import {
  EXTRACTOR_VERSION_DETERMINISTIC,
  SCHEMA_VERSION,
  type CategoryHint,
  type NormalizedStatement,
  type ReconciliationResult,
  type SourceRegion,
  type StatementType,
  type Transaction,
  normalizedStatementSchema,
} from "@/lib/schema/statement";
import { evaluateCompleteness } from "@/lib/verification/completeness";
import { evaluateVerificationGate } from "@/lib/verification/gate";

import { canonicalizeStatement } from "../canonicalize";
import type { ExtractedPdfText, ExtractionErrorCode, StatementLine } from "../types";
import { buildDocumentLines, cellRight, documentText } from "./lines";
import {
  ACCOUNT_NUMBER_PATTERN,
  CATEGORY_PATTERNS,
  CHECKING_SIGNALS,
  COLUMN_HEADERS,
  CREDIT_CARD_SIGNALS,
  CURRENCY_HINTS,
  LABEL_RULES,
  NOISE_PATTERNS,
  SAVINGS_SIGNALS,
  type LabelledField,
} from "./patterns";

/**
 * Deterministic statement parser.
 *
 * The parser reads the geometry of the text layer rather than asking a model what the
 * document says. Where a layout is genuinely ambiguous — an amount column with no signs
 * and no running balance — the parser enumerates a small set of *interpretations* of the
 * same numbers and keeps the one the reconciliation engine independently validates.
 *
 * It never edits an amount, never drops a row to make a total match, and never invents a
 * row. Interpreting which column is "deposits" is inference; changing 41.20 into 41.02 is
 * not, and does not happen here.
 */

export type DeterministicSuccess = {
  ok: true;
  statement: NormalizedStatement;
  reconciliation: ReconciliationResult;
  layout: string;
  warnings: string[];
};

export type DeterministicFailure = {
  ok: false;
  code: ExtractionErrorCode;
  /** Best attempt, when one was produced. Used to explain the failure to the user. */
  statement?: NormalizedStatement;
  reconciliation?: ReconciliationResult;
  warnings: string[];
};

export type DeterministicOutcome = DeterministicSuccess | DeterministicFailure;

export type ParseHint = {
  statementType?: StatementType;
  currency?: string;
};

const CLUSTER_TOLERANCE = 8;
const MAX_HYPOTHESES = 24;
/**
 * How far below its date a wrapped row's amounts may appear.
 *
 * Two lines covers the observed shape — description continues, amounts land on the next
 * line. Kept deliberately short: a larger window would let a date-only line in a summary
 * block adopt an unrelated figure printed further down, which would invent a transaction
 * rather than lose one.
 */
const MAX_WRAP_DISTANCE = 2;
/** Share of a page's rows that must use a column before it counts toward that page's shape. */
const SIGNATURE_SHARE = 0.4;

// ---------------------------------------------------------------------------
// Document-level detection
// ---------------------------------------------------------------------------

export function detectStatementType(text: string, hint?: StatementType): StatementType {
  const score = (patterns: readonly RegExp[]): number =>
    patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);

  const credit = score(CREDIT_CARD_SIGNALS);
  const savings = score(SAVINGS_SIGNALS);
  const checking = score(CHECKING_SIGNALS);

  if (credit >= 2 && credit > checking) return "credit_card";
  if (savings >= 2 && savings >= checking) return "savings";
  if (checking >= 1) return "checking";
  if (credit >= 1) return "credit_card";
  return hint ?? "unknown";
}

export function detectCurrency(text: string, hint?: string): string {
  for (const { code, pattern } of CURRENCY_HINTS) {
    if (pattern.test(text)) return code;
  }
  if (hint) return hint.toUpperCase();
  // A bare `$` is ambiguous between several dollar currencies; USD is the documented
  // default and the reconciliation tolerance is identical for all of them.
  return "USD";
}

/**
 * Count distinct masked account identifiers. More than one means the document bundles
 * several accounts and cannot be reconciled as a single statement.
 */
export function countDistinctAccounts(text: string): number {
  const found = new Set<string>();
  for (const match of text.matchAll(ACCOUNT_NUMBER_PATTERN)) {
    const raw = match[1];
    if (!raw) continue;
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 3) found.add(digits);
  }
  return found.size;
}

type LabelledAmounts = Partial<Record<LabelledField, string>>;

/**
 * Read labelled summary amounts such as "Beginning balance 1,204.55".
 *
 * The label must begin a cell, and the amount is taken from the rightmost monetary cell
 * on the same line. Requiring the label at the start of a cell stops a transaction
 * description that happens to contain the word "balance" from overwriting a total.
 */
export function extractLabelledAmounts(
  lines: readonly StatementLine[],
  currency: string,
): LabelledAmounts {
  const best = new Map<LabelledField, { specificity: number; value: string }>();

  for (const line of lines) {
    const moneyCells = line.cells
      .map((cell) => ({ cell, parsed: parseMoneyToken(cell.text, { currency }) }))
      .filter((entry) => entry.parsed !== null);
    if (moneyCells.length === 0) continue;

    for (const rule of LABEL_RULES) {
      const labelCell = line.cells.find(
        (cell) => rule.pattern.test(cell.text) && parseMoneyToken(cell.text, { currency }) === null,
      );
      if (!labelCell) continue;

      const candidate =
        moneyCells.filter((entry) => entry.cell.x > labelCell.x).pop() ??
        moneyCells[moneyCells.length - 1];
      if (!candidate?.parsed) continue;

      const existing = best.get(rule.field);
      if (!existing || rule.specificity > existing.specificity) {
        best.set(rule.field, { specificity: rule.specificity, value: candidate.parsed.canonical });
      }
    }
  }

  const result: LabelledAmounts = {};
  for (const [field, entry] of best) {
    result[field] = entry.value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Row detection
// ---------------------------------------------------------------------------

const LEADING_DATE =
  /^(\d{1,4}[-/.]\d{1,2}(?:[-/.]\d{2,4})?|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:,?\s*\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:\.?\s+\d{2,4})?)\b/;

type MoneyCell = {
  text: string;
  x: number;
  right: number;
  canonical: string;
  value: MoneyValue;
  explicitlyNegative: boolean;
  suffixMarker: "CR" | "DR" | null;
};

type RawRow = {
  lineIndex: number;
  page: number;
  /** Date tokens found at the start of the line, in order. */
  dateTokens: string[];
  description: string;
  money: MoneyCell[];
  /** Section heading in effect for this row, when the layout uses sections. */
  section: "credit" | "debit" | null;
  line: StatementLine;
  continuationLines: StatementLine[];
};

function regionFromLine(line: StatementLine): SourceRegion {
  const xs = line.cells.map((cell) => cell.x);
  const rights = line.cells.map((cell) => cell.x + cell.width);
  const x = xs.length > 0 ? Math.min(...xs) : 0;
  const right = rights.length > 0 ? Math.max(...rights) : x;
  return {
    page: line.page,
    textItemIds: line.cells.flatMap((cell) => cell.itemIds),
    rawText: line.text,
    extractionPath: "local_text",
    bbox: { x, y: line.y, width: Math.max(0, right - x), height: line.height },
  };
}

function isNoise(line: StatementLine): boolean {
  const text = line.text.trim();
  if (text === "") return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function moneyCellsOf(line: StatementLine, currency: string): MoneyCell[] {
  const cells: MoneyCell[] = [];
  for (const cell of line.cells) {
    const parsed = parseMoneyToken(cell.text, { currency, requireDecimalOrSymbol: true });
    if (!parsed) continue;
    cells.push({
      text: cell.text,
      x: cell.x,
      right: cellRight(cell),
      canonical: parsed.canonical,
      value: parsed.value,
      explicitlyNegative: parsed.explicitlyNegative,
      suffixMarker: parsed.suffixMarker,
    });
  }
  return cells;
}

const CREDIT_SECTION =
  /^(deposits|credits|payments\s+and\s+credits|deposits\s+and\s+(other\s+)?(additions|credits)|additions|amounts?\s+received|money\s+in)\b/i;
const DEBIT_SECTION =
  /^(withdrawals|debits|checks\s+paid|purchases|charges|withdrawals\s+and\s+(other\s+)?(subtractions|debits)|electronic\s+withdrawals|fees|money\s+out|transactions)\b/i;

function detectSection(line: StatementLine, currency: string): "credit" | "debit" | null {
  const text = line.text.trim();
  if (text.length > 60) return null;
  if (moneyCellsOf(line, currency).length > 0) return null;
  if (CREDIT_SECTION.test(text)) return "credit";
  if (DEBIT_SECTION.test(text)) return "debit";
  return null;
}

function collectRawRows(
  lines: readonly StatementLine[],
  currency: string,
): { rows: RawRow[]; continuationCount: number } {
  const rows: RawRow[] = [];
  let section: "credit" | "debit" | null = null;
  let continuationCount = 0;

  /**
   * A dated line whose amounts have not appeared yet.
   *
   * Some statements wrap a long description across two printed lines and put the date on the
   * first and the amount and balance on the second. Handled line by line, both halves look
   * like rubbish — the first has a date but no money, the second money but no date — and both
   * used to be discarded, so the transaction vanished without a warning and took its step out
   * of the running-balance chain with it. A silently missing row is the worst outcome
   * available here: the arithmetic then fails for a reason that points nowhere near the cause.
   *
   * Held only briefly. It must be claimed by a dateless line carrying money on the same page
   * within `MAX_WRAP_DISTANCE` lines, or it is abandoned. That keeps a date-only line in a
   * summary block from adopting the first unrelated figure printed after it.
   */
  let pending: {
    lineIndex: number;
    page: number;
    dateTokens: string[];
    description: string;
    line: StatementLine;
    section: "credit" | "debit" | null;
  } | null = null;

  for (const [lineIndex, line] of lines.entries()) {
    const sectionChange = detectSection(line, currency);
    if (sectionChange) {
      section = sectionChange;
      continue;
    }
    if (isNoise(line)) continue;

    const firstCell = line.cells[0];
    if (!firstCell) continue;

    const dateMatch = LEADING_DATE.exec(firstCell.text.trim());
    const money = moneyCellsOf(line, currency);

    if (!dateMatch) {
      // The second half of a wrapped row: no date of its own, but carrying the amounts that
      // belong to the dated line just above it.
      if (
        pending &&
        money.length > 0 &&
        pending.page === line.page &&
        lineIndex - pending.lineIndex <= MAX_WRAP_DISTANCE
      ) {
        const firstMoneyX = money[0]?.x ?? Number.POSITIVE_INFINITY;
        const tail = line.cells
          .filter((cell) => cell.x < firstMoneyX)
          .map((cell) => cell.text)
          .join(" ");
        rows.push({
          lineIndex: pending.lineIndex,
          page: pending.page,
          dateTokens: pending.dateTokens,
          description: `${pending.description} ${tail}`.replace(/\s+/g, " ").trim(),
          money,
          section: pending.section,
          line: pending.line,
          continuationLines: [line],
        });
        continuationCount += 1;
        pending = null;
        continue;
      }

      // A line with no date and no amount continues the previous row's description.
      const previous = rows[rows.length - 1];
      if (
        previous &&
        money.length === 0 &&
        line.text.length <= 200 &&
        previous.page === line.page
      ) {
        previous.description = `${previous.description} ${line.text}`.trim();
        previous.continuationLines.push(line);
        continuationCount += 1;
      }
      continue;
    }

    // A leading date cell may also carry the start of the description when the PDF places
    // them close together. Only a cell that is *nothing but* a date can be a second date
    // column, otherwise a description like "5 STAR PIZZA" would be read as a posted date.
    const dateTokens: string[] = [];
    let cursor = 0;
    let inlineRemainder = "";
    while (cursor < line.cells.length && dateTokens.length < 2) {
      const cell = line.cells[cursor];
      if (!cell) break;
      const cellText = cell.text.trim();
      const match = LEADING_DATE.exec(cellText);
      if (!match?.[1] || match.index !== 0) break;
      const remainder = cellText.slice(match[0].length).trim();
      if (remainder !== "") {
        if (dateTokens.length === 0) {
          dateTokens.push(match[1]);
          inlineRemainder = remainder;
          cursor += 1;
        }
        break;
      }
      dateTokens.push(match[1]);
      cursor += 1;
    }
    if (dateTokens.length === 0) continue;

    const firstMoneyX = money[0]?.x ?? Number.POSITIVE_INFINITY;
    const descriptionCells = line.cells.filter(
      (cell, index) => index >= cursor && cell.x < firstMoneyX,
    );
    const description = [inlineRemainder, ...descriptionCells.map((cell) => cell.text)]
      .filter((part) => part !== "")
      .join(" ")
      .trim();

    if (money.length === 0) {
      // Dated, but nothing monetary on this line. On a wrapped row the amounts are printed
      // on the line below, so hold this one rather than discarding it.
      pending = {
        lineIndex,
        page: line.page,
        dateTokens,
        description: description.replace(/\s+/g, " ").trim(),
        line,
        section,
      };
      continue;
    }

    // Reaching a complete row means anything still held never found its amounts. Drop it:
    // it was a date-only line that is not a transaction.
    pending = null;

    rows.push({
      lineIndex,
      page: line.page,
      dateTokens,
      description: description.replace(/\s+/g, " ").trim(),
      money,
      section,
      line,
      continuationLines: [],
    });
  }

  return { rows, continuationCount };
}

// ---------------------------------------------------------------------------
// Column clustering and layout hypotheses
// ---------------------------------------------------------------------------

type Cluster = { right: number; count: number };

export function clusterColumns(rows: readonly RawRow[]): Cluster[] {
  const points = rows.flatMap((row) => row.money.map((cell) => cell.right)).sort((a, b) => a - b);
  const clusters: Cluster[] = [];
  for (const point of points) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(point - last.right) <= CLUSTER_TOLERANCE) {
      last.right = (last.right * last.count + point) / (last.count + 1);
      last.count += 1;
    } else {
      clusters.push({ right: point, count: 1 });
    }
  }
  return clusters;
}

/**
 * Split rows into the transaction register and any other table printed alongside it.
 *
 * A statement is not always one table. A register can be followed by an index — "Items Paid"
 * printed two-up, two `Date | Item | Amount` groups per line — whose money sits in columns
 * the register never uses and which has no balance column at all. Clustering across the whole
 * document merges both geometries, header matching then gives up because there are more
 * columns than headers, and a perfectly readable register is rejected.
 *
 * Pages are grouped by which money columns their rows actually occupy. When every page agrees,
 * nothing happens and this is a no-op — the ordinary single-table statement is untouched.
 * When they disagree, the largest group by row count is the register and the rest is set
 * aside.
 *
 * Two deliberate limits. A tie changes nothing, because with no clear majority there is no
 * evidence about which table is the register, and guessing risks discarding real
 * transactions. And a set-aside page is reported, both as a warning on the statement and as
 * an informational page for completeness, so a dropped section is visible in the verification
 * record rather than silently absent.
 */
function partitionRegisterRows(
  rows: readonly RawRow[],
  clusters: readonly Cluster[],
): { register: RawRow[]; setAsidePages: Set<number> } {
  const none = { register: [...rows], setAsidePages: new Set<number>() };
  if (clusters.length < 2) return none;

  // The columns a page's rows genuinely occupy. The threshold keeps a stray figure — a page
  // total, a carried-forward line — from changing a page's shape.
  const columnsOf = (page: number): Set<number> => {
    const pageRows = rows.filter((row) => row.page === page);
    const counts = new Map<number, number>();
    for (const row of pageRows) {
      for (const cell of row.money) {
        const index = assignColumn(cell, clusters);
        if (index >= 0) counts.set(index, (counts.get(index) ?? 0) + 1);
      }
    }
    return new Set(
      [...counts.entries()]
        .filter(([, n]) => n >= pageRows.length * SIGNATURE_SHARE)
        .map(([index]) => index),
    );
  };

  const pages = [...new Set(rows.map((row) => row.page))];
  const shapes = new Map<number, Set<number>>();
  for (const page of pages) {
    const columns = columnsOf(page);
    if (columns.size > 0) shapes.set(page, columns);
  }
  if (shapes.size < 2) return none;

  // The register is the shape carrying the most rows.
  const byKey = new Map<string, { columns: Set<number>; rowCount: number }>();
  for (const [page, columns] of shapes) {
    const key = [...columns].sort((a, b) => a - b).join(",");
    const group = byKey.get(key) ?? { columns, rowCount: 0 };
    group.rowCount += rows.filter((row) => row.page === page).length;
    byKey.set(key, group);
  }
  const ranked = [...byKey.values()].sort((a, b) => b.rowCount - a.rowCount);
  const dominant = ranked[0];
  if (!dominant) return none;

  // Only a page sharing *no* column with the register is treated as another table.
  //
  // Overlap is kept deliberately generous. Pages of one register legitimately differ — a page
  // with no credits never uses the credit column — and treating that as a separate table
  // would discard real transactions, which is far worse than failing to split. Disjointness
  // is the signal that carries actual evidence: a two-up index sits in columns the register
  // never touches.
  const setAsidePages = new Set<number>();
  for (const [page, columns] of shapes) {
    const overlaps = [...columns].some((column) => dominant.columns.has(column));
    if (!overlaps) setAsidePages.add(page);
  }
  if (setAsidePages.size === 0) return none;

  return {
    register: rows.filter((row) => !setAsidePages.has(row.page)),
    setAsidePages,
  };
}

type ColumnRole = "amount" | "debit" | "credit" | "balance" | "ignore";

type SignStrategy = "printed" | "balance-delta" | "section" | "all-charges" | "all-debits";

type Hypothesis = {
  label: string;
  roles: ColumnRole[];
  sign: SignStrategy;
};

function headerRoles(
  lines: readonly StatementLine[],
  clusters: readonly Cluster[],
  firstRowIndex: number,
): ColumnRole[] | null {
  // Search upward from the first transaction row for a line whose cells look like headers.
  for (let index = firstRowIndex - 1; index >= 0 && index >= firstRowIndex - 12; index -= 1) {
    const line = lines[index];
    if (!line) continue;
    const matched = line.cells
      .map((cell) => {
        const header = COLUMN_HEADERS.find((entry) => entry.pattern.test(cell.text.trim()));
        return header ? { kind: header.kind, right: cellRight(cell), x: cell.x } : null;
      })
      .filter(
        (
          entry,
        ): entry is { kind: (typeof COLUMN_HEADERS)[number]["kind"]; right: number; x: number } =>
          entry !== null,
      );

    const amountHeaders = matched.filter((entry) =>
      ["debit", "credit", "amount", "balance"].includes(entry.kind),
    );
    if (amountHeaders.length < clusters.length || amountHeaders.length === 0) continue;

    const roles: ColumnRole[] = clusters.map((cluster) => {
      let bestRole: ColumnRole = "ignore";
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const header of amountHeaders) {
        // Amount columns are right-aligned; headers may be left- or right-aligned, so
        // compare against both edges and keep the closest.
        const distance = Math.min(
          Math.abs(cluster.right - header.right),
          Math.abs(cluster.right - header.x),
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestRole = header.kind as ColumnRole;
        }
      }
      return bestDistance <= 60 ? bestRole : "ignore";
    });

    if (roles.some((role) => role !== "ignore")) return roles;
  }
  return null;
}

function layoutHypotheses(
  clusterCount: number,
  headerDerived: ColumnRole[] | null,
  statementType: StatementType,
  hasSections: boolean,
): Hypothesis[] {
  const signStrategies: SignStrategy[] = ["printed"];
  if (hasSections) signStrategies.push("section");
  if (statementType === "credit_card") signStrategies.push("all-charges");
  else signStrategies.push("all-debits");

  const shapes: Array<{ label: string; roles: ColumnRole[] }> = [];

  if (headerDerived) shapes.push({ label: "header", roles: headerDerived });

  switch (clusterCount) {
    case 0:
      break;
    case 1:
      shapes.push({ label: "amount-only", roles: ["amount"] });
      break;
    case 2:
      shapes.push({ label: "amount+balance", roles: ["amount", "balance"] });
      shapes.push({ label: "debit+credit", roles: ["debit", "credit"] });
      break;
    case 3:
      shapes.push({ label: "debit+credit+balance", roles: ["debit", "credit", "balance"] });
      shapes.push({ label: "amount+balance(3col)", roles: ["ignore", "amount", "balance"] });
      shapes.push({ label: "credit+debit+balance", roles: ["credit", "debit", "balance"] });
      break;
    default: {
      const roles: ColumnRole[] = new Array<ColumnRole>(clusterCount).fill("ignore");
      roles[clusterCount - 3] = "debit";
      roles[clusterCount - 2] = "credit";
      roles[clusterCount - 1] = "balance";
      shapes.push({ label: "trailing debit+credit+balance", roles });
      const alt: ColumnRole[] = new Array<ColumnRole>(clusterCount).fill("ignore");
      alt[clusterCount - 2] = "amount";
      alt[clusterCount - 1] = "balance";
      shapes.push({ label: "trailing amount+balance", roles: alt });
      break;
    }
  }

  const hypotheses: Hypothesis[] = [];
  for (const shape of shapes) {
    const usesAmountColumn = shape.roles.includes("amount");
    const hasBalance = shape.roles.includes("balance");
    const applicable = usesAmountColumn
      ? [...(hasBalance ? (["balance-delta"] as SignStrategy[]) : []), ...signStrategies]
      : (["printed"] as SignStrategy[]);
    for (const sign of applicable) {
      hypotheses.push({ label: `${shape.label}/${sign}`, roles: shape.roles, sign });
      if (hypotheses.length >= MAX_HYPOTHESES) return hypotheses;
    }
  }
  return hypotheses;
}

// ---------------------------------------------------------------------------
// Building a statement from a hypothesis
// ---------------------------------------------------------------------------

function assignColumn(cell: MoneyCell, clusters: readonly Cluster[]): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [index, cluster] of clusters.entries()) {
    const distance = Math.abs(cell.right - cluster.right);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return bestDistance <= CLUSTER_TOLERANCE * 2 ? best : -1;
}

function categoryFor(
  description: string,
  amount: MoneyValue,
  statementType: StatementType,
): CategoryHint {
  for (const { hint, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(description)) {
      if (statementType === "credit_card") return hint;
      if (hint === "fee" || hint === "interest") return hint;
    }
  }
  if (statementType === "credit_card") {
    return amount.isNegative() ? "payment" : "charge";
  }
  return amount.isNegative() ? "debit" : "credit";
}

type BuildResult = { transactions: Transaction[]; warnings: string[] } | null;

function buildTransactions(
  rows: readonly RawRow[],
  clusters: readonly Cluster[],
  hypothesis: Hypothesis,
  context: DateContext,
  statementType: StatementType,
  currency: string,
  openingBalance: string | undefined,
): BuildResult {
  const transactions: Transaction[] = [];
  const warnings: string[] = [];
  const tolerance = currencyTolerance(currency);
  let previousBalance: MoneyValue | null = openingBalance ? toMoney(openingBalance) : null;

  for (const row of rows) {
    const byRole = new Map<ColumnRole, MoneyCell>();
    for (const cell of row.money) {
      const columnIndex = assignColumn(cell, clusters);
      if (columnIndex < 0) continue;
      const role = hypothesis.roles[columnIndex] ?? "ignore";
      if (role === "ignore") continue;
      if (!byRole.has(role)) byRole.set(role, cell);
    }

    const balanceCell = byRole.get("balance");
    const debitCell = byRole.get("debit");
    const creditCell = byRole.get("credit");
    const amountCell = byRole.get("amount");

    // A dated row carrying only a balance is a "balance forward" anchor, not activity.
    if (!debitCell && !creditCell && !amountCell) {
      if (balanceCell) previousBalance = balanceCell.value;
      continue;
    }

    const date = normalizeDate(row.dateTokens[0] ?? "", context);
    if (!date) return null;
    const postedDate = row.dateTokens[1] ? normalizeDate(row.dateTokens[1], context) : null;

    let amount: MoneyValue;
    let debit: string | undefined;
    let credit: string | undefined;

    if (debitCell || creditCell) {
      if (debitCell && creditCell) {
        // Both columns populated on one row: the direction is ambiguous. Reject rather
        // than pick one.
        return null;
      }
      if (debitCell) {
        debit = formatMoney(debitCell.value.abs(), currency);
        amount =
          statementType === "credit_card" ? debitCell.value.abs() : debitCell.value.abs().negated();
      } else if (creditCell) {
        credit = formatMoney(creditCell.value.abs(), currency);
        amount =
          statementType === "credit_card"
            ? creditCell.value.abs().negated()
            : creditCell.value.abs();
      } else {
        return null;
      }
    } else if (amountCell) {
      const magnitude = amountCell.value.abs();
      switch (hypothesis.sign) {
        case "printed": {
          if (amountCell.suffixMarker === "CR") {
            amount = statementType === "credit_card" ? magnitude.negated() : magnitude;
          } else if (amountCell.suffixMarker === "DR") {
            amount = statementType === "credit_card" ? magnitude : magnitude.negated();
          } else {
            amount = amountCell.value;
          }
          break;
        }
        case "balance-delta": {
          if (!balanceCell || !previousBalance) return null;
          const delta = balanceCell.value.minus(previousBalance);
          if (!delta.abs().minus(magnitude).abs().lessThanOrEqualTo(tolerance)) {
            // The printed amount does not explain the balance movement. Fail closed.
            return null;
          }
          amount = delta;
          break;
        }
        case "section": {
          if (!row.section) return null;
          amount = row.section === "credit" ? magnitude : magnitude.negated();
          if (statementType === "credit_card") amount = amount.negated();
          break;
        }
        case "all-charges":
          amount = magnitude;
          break;
        case "all-debits":
          amount = magnitude.negated();
          break;
        default:
          return null;
      }
    } else {
      return null;
    }

    if (amount.isZero()) {
      warnings.push("A row with a zero amount was found and kept as extracted.");
    }

    const sourceRegions = [regionFromLine(row.line), ...row.continuationLines.map(regionFromLine)];
    const rawSourceText = [row.line.text, ...row.continuationLines.map((line) => line.text)].join(
      " ",
    );

    const transaction: Transaction = {
      id: transactionId(transactions.length, date, formatMoney(amount, currency)),
      date,
      description: row.description === "" ? "(no description)" : row.description,
      amount: formatMoney(amount, currency),
      categoryHint: categoryFor(row.description, amount, statementType),
      sourcePage: row.page,
      sourceRegions,
      fieldProvenance: tracedFields(
        {
          date,
          description: row.description === "" ? "(no description)" : row.description,
          amount: formatMoney(amount, currency),
          ...(postedDate ? { postedDate } : {}),
          ...(debit ? { debit } : {}),
          ...(credit ? { credit } : {}),
        },
        sourceRegions[0] ?? regionFromLine(row.line),
      ),
      rawSourceText,
      extractorVersion: EXTRACTOR_VERSION_DETERMINISTIC,
      verification: passedVerification(["source_mapped"]),
    };
    if (postedDate) transaction.postedDate = postedDate;
    if (debit) transaction.debit = debit;
    if (credit) transaction.credit = credit;
    if (balanceCell) {
      transaction.runningBalance = formatMoney(balanceCell.value, currency);
      const balanceField = tracedFields(
        {
          date,
          description: transaction.description,
          amount: transaction.amount,
          runningBalance: transaction.runningBalance,
        },
        sourceRegions[0] ?? regionFromLine(row.line),
      ).find((field) => field.field === "runningBalance");
      if (balanceField) transaction.fieldProvenance.push(balanceField);
      previousBalance = balanceCell.value;
    } else if (previousBalance) {
      previousBalance = previousBalance.plus(amount);
    }

    transactions.push(transaction);
  }

  if (transactions.length === 0) return null;
  return { transactions, warnings };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function parseStatementDeterministically(
  document: ExtractedPdfText,
  hint: ParseHint = {},
): DeterministicOutcome {
  const lines = buildDocumentLines(document);
  if (lines.length === 0) {
    return { ok: false, code: "no_text_layer", warnings: [] };
  }

  const text = documentText(lines);
  const statementType = detectStatementType(text, hint.statementType);
  const currency = detectCurrency(text, hint.currency);

  if (countDistinctAccounts(text) > 1) {
    return { ok: false, code: "multiple_accounts", warnings: [] };
  }

  const labelled = extractLabelledAmounts(lines, currency);

  const { rows, continuationCount } = collectRawRows(lines, currency);
  if (rows.length === 0) {
    return { ok: false, code: "no_transactions_found", warnings: [] };
  }

  const rawDateTokens = rows.flatMap((row) => row.dateTokens);
  const dateOrder: DateOrder = inferDateOrder(rawDateTokens);

  // The period is read after the rows, not before, because the rows are what proves the
  // day/month order. A period like `07/09/26 - 08/08/26` has no component above 12 and
  // cannot disambiguate itself, while a single transaction dated `07-15` settles it. Reading
  // the period first meant discarding that evidence and, on statements whose transaction
  // dates carry no year, losing the only available source of one.
  const period = findPeriod(text.slice(0, 8000), dateOrder);
  const hasAmbiguousNumericDate = rawDateTokens.some((token) => {
    const match = /^(\d{1,2})[-/.](\d{1,2})(?:[-/.](?:\d{2}|\d{4}))?$/.exec(token.trim());
    return Boolean(match && Number(match[1]) <= 12 && Number(match[2]) <= 12);
  });
  if (dateOrder === "unknown" && hasAmbiguousNumericDate) {
    return {
      ok: false,
      code: "layout_not_recognized",
      warnings: ["Day/month order could not be proven from the document. We did not guess."],
    };
  }
  const context: DateContext = {
    periodStart: period?.start,
    periodEnd: period?.end,
    order: dateOrder,
  };

  const initialClusters = clusterColumns(rows);
  if (initialClusters.length === 0) {
    return { ok: false, code: "layout_not_recognized", warnings: [] };
  }

  // A register followed by a differently shaped table — an index printed two-up, say — would
  // otherwise have both geometries clustered together, leaving more columns than headers and
  // no workable layout. Splitting them first costs nothing on an ordinary single-table
  // statement, where every page shares one shape and this is a no-op.
  const { register: registerRows, setAsidePages } = partitionRegisterRows(rows, initialClusters);
  const clusters = setAsidePages.size > 0 ? clusterColumns(registerRows) : initialClusters;
  if (clusters.length === 0 || registerRows.length === 0) {
    return { ok: false, code: "layout_not_recognized", warnings: [] };
  }

  const firstRow = registerRows[0];
  const derivedHeaderRoles = firstRow ? headerRoles(lines, clusters, firstRow.lineIndex) : null;
  const hasSections = registerRows.some((row) => row.section !== null);
  const hypotheses = layoutHypotheses(
    clusters.length,
    derivedHeaderRoles,
    statementType,
    hasSections,
  );

  const baseWarnings: string[] = [];
  if (continuationCount > 0) {
    baseWarnings.push(`${continuationCount} wrapped description lines were joined to their rows.`);
  }
  if (setAsidePages.size > 0) {
    const pageList = [...setAsidePages].sort((a, b) => a - b).join(", ");
    baseWarnings.push(
      `Page ${pageList} uses a different column layout from the transaction register and was ` +
        `read as a summary section, not as transactions.`,
    );
  }

  let best: {
    statement: NormalizedStatement;
    reconciliation: ReconciliationResult;
    layout: string;
  } | null = null;

  for (const hypothesis of hypotheses) {
    const built = buildTransactions(
      registerRows,
      clusters,
      hypothesis,
      context,
      statementType,
      currency,
      labelled.openingBalance,
    );
    if (!built) continue;

    const completeness = evaluateCompleteness({
      document,
      acceptedRows: built.transactions.length,
      sourceMappedRows: built.transactions.filter((row) => row.sourceRegions.length > 0).length,
      unresolvedCandidateRows: 0,
      transactionSectionCount: Math.max(
        1,
        new Set(registerRows.map((row) => row.section).filter(Boolean)).size,
      ),
      mixedAccount: false,
      truncated: false,
      timedOut: false,
      pagesWithCandidateRows: new Set(registerRows.map((row) => row.page)),
      informationalPages: new Set([
        // A page set aside for using another layout is still accounted for. Without this it
        // would classify as `unprocessed` and fail completeness — the right default, since a
        // page nobody looked at must never pass silently, but this one was looked at and
        // positively identified as a different table.
        ...setAsidePages,
        ...document.pages
          .filter(
            (page) =>
              !registerRows.some((row) => row.page === page.page) &&
              !setAsidePages.has(page.page) &&
              /\b(summary|account information|customer service|fees?|interest|disclosures?|continued)\b/i.test(
                page.items.map((item) => item.t).join(" "),
              ),
          )
          .map((page) => page.page),
      ]),
    });

    const draft: NormalizedStatement = {
      schemaVersion: SCHEMA_VERSION,
      statementType,
      currency,
      transactions: built.transactions,
      extractionWarnings: [...baseWarnings, ...built.warnings],
      extractorVersion: EXTRACTOR_VERSION_DETERMINISTIC,
      extractionPath: "local_text",
      completeness,
      ambiguities: [],
      verificationState: "arithmetic_checked",
      runningBalanceSummary: {
        applicable: false,
        transitionsChecked: 0,
        transitionsPassed: 0,
        firstFailureIndex: null,
        firstFailureDifference: null,
      },
      privacy: localOnlyDisclosure(document.pageCount),
      ...labelled,
    };
    if (period) {
      draft.periodStart = period.start;
      draft.periodEnd = period.end;
    }

    const parsed = normalizedStatementSchema.safeParse(canonicalizeStatement(draft));
    if (!parsed.success) continue;

    const gated = evaluateVerificationGate({
      statement: parsed.data,
      completeness: parsed.data.completeness,
      ambiguities: parsed.data.ambiguities,
    });
    const reconciliation = reconcile(gated.statement);
    if (gated.result.passed) {
      return {
        ok: true,
        statement: gated.statement,
        reconciliation,
        layout: hypothesis.label,
        warnings: gated.statement.extractionWarnings,
      };
    }
    if (!best || betterAttempt(reconciliation, best.reconciliation)) {
      best = { statement: gated.statement, reconciliation, layout: hypothesis.label };
    }
  }

  if (!best) {
    return { ok: false, code: "layout_not_recognized", warnings: baseWarnings };
  }

  return {
    ok: false,
    code:
      best.statement.verificationState === "verification_rejected"
        ? "verification_rejected"
        : "reconciliation_failed",
    statement: best.statement,
    reconciliation: best.reconciliation,
    warnings: best.statement.extractionWarnings,
  };
}

/** Prefer the attempt that failed fewer checks, so the user sees the most useful diagnosis. */
function betterAttempt(candidate: ReconciliationResult, incumbent: ReconciliationResult): boolean {
  const failed = (result: ReconciliationResult): number =>
    result.checks.filter((check) => !check.passed && !check.advisory).length;
  const candidateFailures = failed(candidate);
  const incumbentFailures = failed(incumbent);
  if (candidateFailures !== incumbentFailures) return candidateFailures < incumbentFailures;
  return candidate.checks.length > incumbent.checks.length;
}
