"use client";

import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import type { VerificationEvidence } from "@/lib/verification/evidence";

/**
 * Exact verification denominators shown before payment.
 *
 * Copy is generated from the evidence object, not from marketing strings. "Verified"
 * here means extraction/provenance/completeness/arithmetic checks — not authenticity.
 */
export function EvidencePanel({
  evidence,
  fileCount,
  totalPages,
}: {
  evidence: VerificationEvidence;
  fileCount: number;
  totalPages: number;
}) {
  const passed = evidence.state === "verification_passed";
  const running = evidence.runningBalance;

  return (
    <div className="rounded-card border-ink-200 border bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-ink-950 text-sm font-semibold tracking-[0.08em] uppercase"
          data-testid="verification-state"
        >
          {passed ? "Verification passed" : "Verification rejected"}
        </p>
        <Badge tone={passed ? "verified" : "refused"}>
          {passed ? "VERIFICATION PASSED" : "VERIFICATION REJECTED"}
        </Badge>
      </div>

      <ul className="text-ink-800 mt-4 space-y-1.5 text-sm tabular-nums">
        <li>
          {fileCount} {fileCount === 1 ? "file" : "files"} · {totalPages} /{" "}
          {siteConfig.limits.maxPages} total pages
        </li>
        <li>
          {evidence.sourceMappedRows} / {evidence.transactionCount} transaction rows traced to
          source
        </li>
        <li>
          {running.applicable
            ? `${running.transitionsPassed} / ${running.transitionsChecked} applicable running-balance transitions passed`
            : "Running-balance transitions: not applicable (no printed running balance on extracted rows)"}
        </li>
        <li>
          {evidence.pagesProcessed} / {evidence.pagesDeclared} PDF pages processed
        </li>
        <li>{evidence.materialAmbiguities} unresolved monetary or sign ambiguities</li>
      </ul>

      <div className="text-ink-600 mt-4 space-y-1 text-xs leading-relaxed">
        {evidence.disclosure.map((sentence) => (
          <p key={sentence}>{sentence}</p>
        ))}
      </div>
    </div>
  );
}

export function evidenceToneClass(passed: boolean): string {
  return cn(passed ? "border-verified-200" : "border-refused-200");
}
