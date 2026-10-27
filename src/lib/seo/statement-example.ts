/**
 * Clearly fictional examples for illustrating arithmetic and CSV structure.
 * These are NOT files processed or validated by the production conversion engine.
 * Keep them separate from customers' real statements and parser fixtures.
 */
export type ExampleKind = "bank" | "card";

type ExampleTransaction = {
  date: string;
  description: string;
  movementCents: number;
};

const TRANSACTIONS: Record<ExampleKind, { openingCents: number; rows: ExampleTransaction[] }> = {
  bank: {
    openingCents: 100000,
    rows: [
      { date: "2026-10-01", description: "Example paycheck", movementCents: 85000 },
      { date: "2026-10-03", description: "Example rent", movementCents: -62500 },
      { date: "2026-10-04", description: "Example groceries", movementCents: -8525 },
      { date: "2026-10-05", description: "Example refund", movementCents: 2000 },
    ],
  },
  card: {
    openingCents: 80000,
    rows: [
      { date: "2026-10-01", description: "Example purchase", movementCents: 12500 },
      { date: "2026-10-02", description: "Example card payment", movementCents: -30000 },
      { date: "2026-10-03", description: "Example interest", movementCents: 1500 },
      { date: "2026-10-04", description: "Example refund", movementCents: -4000 },
    ],
  },
};

export function exampleStatement(kind: ExampleKind) {
  const { openingCents, rows } = TRANSACTIONS[kind];
  let balanceCents = openingCents;

  const transactions = rows.map((row) => {
    balanceCents += row.movementCents;
    return { ...row, balanceCents };
  });

  return {
    openingCents,
    transactions,
    netChangeCents: balanceCents - openingCents,
    closingCents: balanceCents,
  };
}

export function exampleCsv(kind: ExampleKind): string {
  const { transactions } = exampleStatement(kind);
  const cents = (value: number) => (value / 100).toFixed(2);
  const lines = transactions.map((row) => {
    // On credit cards, purchases increase amount owed. On bank accounts,
    // withdrawals reduce account funds; the Debit/Credit column depends on kind.
    const isDebit = kind === "card" ? row.movementCents > 0 : row.movementCents < 0;
    const debit = isDebit ? cents(Math.abs(row.movementCents)) : "";
    const credit = isDebit ? "" : cents(Math.abs(row.movementCents));
    return [
      row.date,
      row.date,
      row.description,
      debit,
      credit,
      cents(row.movementCents),
      cents(row.balanceCents),
    ].join(",");
  });

  return [
    "Date,Posted Date,Description,Debit,Credit,Amount,Balance",
    ...lines,
  ].join("\r\n");
}
