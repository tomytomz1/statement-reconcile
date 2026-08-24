import type { AmbiguityFinding, NormalizedStatement, Transaction } from "@/lib/schema/statement";

/**
 * Material ambiguity findings.
 *
 * A material finding is any uncertainty that could change inclusion, date, amount, sign,
 * order, account assignment, running balance, or reconciliation. Unresolved material
 * findings block verification. The arithmetic must never be used to pick a candidate.
 */

export function materialUnresolved(findings: readonly AmbiguityFinding[]): AmbiguityFinding[] {
  return findings.filter((finding) => finding.material && finding.resolution === "unresolved");
}

export function finding(
  partial: Omit<AmbiguityFinding, "id"> & { id?: string },
  index: number,
): AmbiguityFinding {
  return {
    id: partial.id ?? `amb-${String(index).padStart(3, "0")}`,
    scope: partial.scope,
    code: partial.code,
    material: partial.material,
    sourceRegions: partial.sourceRegions,
    candidates: partial.candidates,
    resolution: partial.resolution,
  };
}

export function sourceMappingFailures(transactions: readonly Transaction[]): AmbiguityFinding[] {
  const findings: AmbiguityFinding[] = [];
  for (const [index, transaction] of transactions.entries()) {
    if (transaction.sourceRegions.length === 0) {
      findings.push(
        finding(
          {
            scope: "transaction",
            code: "row_boundary",
            material: true,
            sourceRegions: [],
            candidates: [],
            resolution: "unresolved",
          },
          index,
        ),
      );
    }
    const requiredFields = [
      "date",
      "description",
      "amount",
      ...(transaction.debit ? ["debit"] : []),
      ...(transaction.credit ? ["credit"] : []),
      ...(transaction.runningBalance ? ["runningBalance"] : []),
    ];
    const invalidFields = requiredFields.filter((field) => {
      const provenance = transaction.fieldProvenance.find((entry) => entry.field === field);
      return (
        !provenance ||
        provenance.status !== "traced" ||
        provenance.sourceRegions.length === 0 ||
        provenance.sourceRegions.some(
          (region) => region.rawText.trim() === "" || region.textItemIds.length === 0,
        )
      );
    });
    if (transaction.rawSourceText.trim() === "") invalidFields.push("rawSourceText");
    if (invalidFields.length > 0) {
      findings.push(
        finding(
          {
            scope: "field",
            code: invalidFields.includes("amount") ? "amount_digits" : "row_boundary",
            material: true,
            sourceRegions: transaction.sourceRegions,
            candidates: invalidFields,
            resolution: "unresolved",
          },
          index + 1000,
        ),
      );
    }
  }
  return findings;
}

export function duplicateRowFindings(transactions: readonly Transaction[]): AmbiguityFinding[] {
  const findings: AmbiguityFinding[] = [];
  for (let left = 0; left < transactions.length; left += 1) {
    const first = transactions[left];
    if (!first) continue;
    const firstIds = new Set(first.sourceRegions.flatMap((region) => region.textItemIds));
    for (let right = left + 1; right < transactions.length; right += 1) {
      const second = transactions[right];
      if (!second) continue;
      const overlaps = second.sourceRegions.some((region) =>
        region.textItemIds.some((id) => firstIds.has(id)),
      );
      if (!overlaps) continue;
      findings.push(
        finding(
          {
            scope: "transaction",
            code: "duplicate_row",
            material: true,
            sourceRegions: [...first.sourceRegions, ...second.sourceRegions].slice(0, 20),
            candidates: [first.id, second.id],
            resolution: "unresolved",
          },
          2000 + findings.length,
        ),
      );
    }
  }
  return findings;
}

export function applyAmbiguityToRows(
  statement: NormalizedStatement,
  findings: readonly AmbiguityFinding[],
): Transaction[] {
  const blocked = materialUnresolved(findings);
  return statement.transactions.map((transaction) => {
    const hit = blocked.some(
      (findingItem) =>
        findingItem.scope === "transaction" &&
        findingItem.sourceRegions.some((region) =>
          transaction.sourceRegions.some((source) => source.page === region.page),
        ),
    );
    const checks = transaction.verification.checks.filter((check) => check !== "ambiguity_clear");
    if (!hit && blocked.length === 0) checks.push("ambiguity_clear");
    return {
      ...transaction,
      verification: {
        ...transaction.verification,
        ambiguityStatus: hit || blocked.length > 0 ? "blocked" : "clear",
        checks,
      },
    };
  });
}
