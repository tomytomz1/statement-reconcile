import type { NormalizedStatementCandidate } from "@/lib/schema/statement";
import type { SourceRegion } from "@/lib/schema/statement";
import type { RegionExtractionRequest } from "../providers/interface";

/**
 * Selective secondary extraction.
 *
 * Sends only the minimum text region required to resolve a material uncertainty. A second
 * full-document provider call is forbidden. Agreement on material fields may resolve an
 * ambiguity; disagreement rejects. The secondary extractor cannot declare a file verified.
 */

export interface RegionExtractor {
  readonly name: string;
  readonly model: string;
  extractRegion(
    input: RegionExtractionRequest,
    signal?: AbortSignal,
  ): Promise<NormalizedStatementCandidate>;
}

export type SecondaryComparison = {
  agreed: boolean;
  materialFields: string[];
  primary: Record<string, string | undefined>;
  secondary: Record<string, string | undefined>;
};

const MATERIAL_FIELDS = ["date", "amount", "debit", "credit", "runningBalance"] as const;

export function compareMaterialFields(
  primary: {
    date?: string;
    amount?: string;
    debit?: string;
    credit?: string;
    runningBalance?: string;
  },
  secondary: {
    date?: string | null;
    amount?: string | null;
    debit?: string | null;
    credit?: string | null;
    runningBalance?: string | null;
  },
): SecondaryComparison {
  const left: Record<string, string | undefined> = {};
  const right: Record<string, string | undefined> = {};
  let agreed = true;
  for (const field of MATERIAL_FIELDS) {
    const a = normalize(primary[field]);
    const b = normalize(secondary[field] ?? undefined);
    left[field] = a;
    right[field] = b;
    if (a && b && a !== b) agreed = false;
    if ((a && !b) || (!a && b)) agreed = false;
  }
  return { agreed, materialFields: [...MATERIAL_FIELDS], primary: left, secondary: right };
}

export function regionFromSource(region: SourceRegion, adjacentText = ""): RegionExtractionRequest {
  return {
    page: region.page,
    rawText: region.rawText,
    adjacentText,
    textItemIds: region.textItemIds,
  };
}

function normalize(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim();
}
