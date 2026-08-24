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

    if (money.length === 0) continue;

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
  const period = findPeriod(text.slice(0, 8000));

  const { rows, continuationCount } = collectRawRows(lines, currency);
  if (rows.length === 0) {
    return { ok: false, code: "no_transactions_found", warnings: [] };
  }

  const rawDateTokens = rows.flatMap((row) => row.dateTokens);
  const dateOrder: DateOrder = inferDateOrder(rawDateTokens);
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

  const clusters = clusterColumns(rows);
  if (clusters.length === 0) {
    return { ok: false, code: "layout_not_recognized", warnings: [] };
  }

  const firstRow = rows[0];
  const derivedHeaderRoles = firstRow ? headerRoles(lines, clusters, firstRow.lineIndex) : null;
  const hasSections = rows.some((row) => row.section !== null);
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

  let best: {
    statement: NormalizedStatement;
    reconciliation: ReconciliationResult;
    layout: string;
  } | null = null;

  for (const hypothesis of hypotheses) {
    const built = buildTransactions(
      rows,
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
        new Set(rows.map((row) => row.section).filter(Boolean)).size,
      ),
      mixedAccount: false,
      truncated: false,
      timedOut: false,
      pagesWithCandidateRows: new Set(rows.map((row) => row.page)),
      informationalPages: new Set(
        document.pages
          .filter(
            (page) =>
              !rows.some((row) => row.page === page.page) &&
              /\b(summary|account information|customer service|fees?|interest|disclosures?|continued)\b/i.test(
                page.items.map((item) => item.t).join(" "),
              ),
          )
          .map((page) => page.page),
      ),
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
