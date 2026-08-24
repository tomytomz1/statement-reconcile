import type { NormalizedStatementCandidate } from "@/lib/schema/statement";

export type RegionExtractionRequest = {
  page: number;
  rawText: string;
  adjacentText?: string;
  textItemIds: string[];
};

/**
 * Provider abstraction for statement extraction.
 *
 * The application depends on this interface, never on a vendor SDK. Swapping models or
 * vendors must not require touching the funnel, the reconciliation engine, or the export.
 */
export interface StatementExtractionProvider {
  readonly name: string;
  readonly model: string;
  extractRegion(
    input: RegionExtractionRequest,
    signal?: AbortSignal,
  ): Promise<NormalizedStatementCandidate>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "unavailable" | "invalid_output" | "timeout" | "rate_limited",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
