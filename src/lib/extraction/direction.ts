import { type MoneyValue, formatMoney } from "@/lib/money/decimal";
import type { StatementType } from "@/lib/schema/statement";

/**
 * Populate the fixed Debit/Credit export columns from the canonical signed amount.
 *
 * The signed amount remains the arithmetic authority. These columns are a deterministic
 * projection for spreadsheet/import convenience; deriving them must never change the sign
 * that reconciliation already proved.
 */
export function directionColumns(
  amount: MoneyValue,
  statementType: StatementType,
  currency: string,
): { debit?: string; credit?: string } {
  if (amount.isZero()) return {};

  const magnitude = formatMoney(amount.abs(), currency);
  if (statementType === "credit_card") {
    return amount.isNegative() ? { credit: magnitude } : { debit: magnitude };
  }
  return amount.isNegative() ? { debit: magnitude } : { credit: magnitude };
}
