import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { generateFixtureSeries } from "../../src/lib/fixtures/generator";
import { parseStatementDeterministically } from "../../src/lib/extraction/deterministic/parser";

type CaseResult = {
  id: string;
  family: string;
  expected: "reconciles" | "rejects";
  outcome: "reconciles" | "rejects";
  correctDisposition: boolean;
  truthRows: number;
  extractedRows: number;
  exactRows: number;
  sourcePageEvidencePassed: number;
};

export type SyntheticBenchmarkResult = {
  kind: "synthetic";
  generatedAt: string;
  seeds: number[];
  cases: number;
  truthRows: number;
  exactRows: number;
  falsePositiveRows: number;
  falseNegativeRows: number;
  sourcePageEvidencePassed: number;
  correctDisposition: number;
  dispositionRate: number;
  rowPrecision: number;
  rowRecall: number;
  passed: boolean;
  publicClaimEligible: false;
  caseResults: CaseResult[];
};

export async function runSyntheticBenchmark(
  seeds: readonly number[] = [7, 11, 31],
): Promise<SyntheticBenchmarkResult> {
  const fixtures = generateFixtureSeries(seeds);
  const caseResults: CaseResult[] = fixtures.map((fixture) => {
    const parsed = parseStatementDeterministically(fixture.document);
    const outcome = parsed.ok ? "reconciles" : "rejects";
    const actual = parsed.ok
      ? parsed.statement.transactions.map((row) => `${row.date}|${row.amount}`)
      : [];
    const truth = fixture.truth.transactions.map((row) => `${row.date}|${row.amount}`);
    const exactRows = multisetIntersectionSize(actual, truth);
    return {
      id: fixture.id,
      family: fixture.family,
      expected: fixture.expectation,
      outcome,
      correctDisposition: fixture.expectation === outcome,
      truthRows: fixture.expectation === "reconciles" ? truth.length : 0,
      extractedRows: actual.length,
      exactRows,
      sourcePageEvidencePassed: parsed.ok
        ? parsed.statement.transactions.filter(
            (row) =>
              row.sourcePage !== undefined &&
              row.sourceRegions.length > 0 &&
              row.sourceRegions.every((region) => region.page === row.sourcePage),
          ).length
        : 0,
    };
  });

  const truthRows = sum(caseResults.map((item) => item.truthRows));
  const exactRows = sum(caseResults.map((item) => item.exactRows));
  const extractedRows = sum(caseResults.map((item) => item.extractedRows));
  const correctDisposition = caseResults.filter((item) => item.correctDisposition).length;
  const sourcePageEvidencePassed = sum(caseResults.map((item) => item.sourcePageEvidencePassed));
  const result: SyntheticBenchmarkResult = {
    kind: "synthetic",
    generatedAt: new Date().toISOString(),
    seeds: [...seeds],
    cases: caseResults.length,
    truthRows,
    exactRows,
    falsePositiveRows: Math.max(0, extractedRows - exactRows),
    falseNegativeRows: Math.max(0, truthRows - exactRows),
    sourcePageEvidencePassed,
    correctDisposition,
    dispositionRate: ratio(correctDisposition, caseResults.length),
    rowPrecision: ratio(exactRows, extractedRows),
    rowRecall: ratio(exactRows, truthRows),
    passed:
      correctDisposition === caseResults.length &&
      exactRows === truthRows &&
      extractedRows === exactRows &&
      sourcePageEvidencePassed === extractedRows,
    publicClaimEligible: false,
    caseResults,
  };
  return result;
}

async function main(): Promise<void> {
  const result = await runSyntheticBenchmark();
  await mkdir("benchmarks/results", { recursive: true });
  const path = "benchmarks/results/synthetic-latest.json";
  await writeFile(path, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `synthetic benchmark: ${result.correctDisposition}/${result.cases} dispositions; precision=${result.rowPrecision.toFixed(4)} recall=${result.rowRecall.toFixed(4)}`,
  );
  console.log(`result: ${path}`);
  if (!result.passed) process.exitCode = 1;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : Number((numerator / denominator).toFixed(6));
}

function multisetIntersectionSize(left: readonly string[], right: readonly string[]): number {
  const remaining = new Map<string, number>();
  for (const value of right) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  let matches = 0;
  for (const value of left) {
    const count = remaining.get(value) ?? 0;
    if (count === 0) continue;
    matches += 1;
    remaining.set(value, count - 1);
  }
  return matches;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "benchmark failed");
    process.exitCode = 1;
  });
}
