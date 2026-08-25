/**
 * Headline experiment readout, from server logs.
 *
 * The conversion half of this funnel cannot be measured client-side: `/app` and `/checkout`
 * get `connect-src 'self'` with no analytics origin, so a page holding a statement cannot
 * reach a vendor. The variant is instead stamped onto `pack_assembled`, `checkout_started`,
 * and `export_delivered` by `copyVariantFromHeaders()`, and read back from here.
 *
 * Both halves of the primary metric — verified preview to payment — are therefore in the
 * server logs, which is why this script needs no analytics vendor credentials.
 *
 * Usage:
 *   pnpm tsx scripts/funnel-variant-report.ts --since 2026-08-25T14:00:00Z
 *   pnpm tsx scripts/funnel-variant-report.ts --since 24h
 *
 * Requires the Vercel CLI, authenticated, with the project linked.
 */
import { spawnSync } from "node:child_process";

/** Verified preview. The denominator of the primary metric. */
const DENOMINATOR = "pack_assembled";
/** Paid and delivered. The numerator — `payment_completed` is unstamped by design. */
const NUMERATOR = "export_delivered";
/** Intent, between the two. Useful for telling "did not try" from "tried and failed". */
const INTERMEDIATE = "checkout_started";

const TRACKED = [DENOMINATOR, INTERMEDIATE, NUMERATOR] as const;

/**
 * The sample the product owner set before a winner may be called: 200 qualified verified
 * previews overall, and at least 50 in each arm. Encoded here rather than left to judgement,
 * because the entire failure mode of a small experiment is someone eyeballing an early lead.
 */
const THRESHOLD_TOTAL = 200;
const THRESHOLD_PER_VARIANT = 50;

type Counts = Record<string, number>;

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? String(process.argv[index + 1]) : fallback;
}

/**
 * Time arguments are interpolated into a shell command, so they are validated rather than
 * trusted. ISO timestamps or a relative form like `24h`/`30m`, nothing else.
 */
const TIME_ARGUMENT = /^(now|\d+[smhd]|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)$/;

function assertTimeArgument(name: string, value: string): void {
  if (!TIME_ARGUMENT.test(value)) {
    throw new Error(
      `--${name} must be an ISO timestamp or a relative value like 24h, got ${value}`,
    );
  }
}

function fetchLogs(since: string, until: string, limit: number): unknown[] {
  assertTimeArgument("since", since);
  assertTimeArgument("until", until);
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("--limit must be a positive integer");

  const parts = ["vercel", "logs", "--json", "--since", since, "--limit", String(limit)];
  if (until !== "now") parts.push("--until", until);

  // `shell: true` because on Windows the CLI is a `.cmd` shim that cannot be spawned by bare
  // name. Every argument is either a literal or validated above.
  //
  // `spawnSync` rather than `execFileSync` because the CLI writes a complete log stream to
  // stdout and then exits non-zero anyway. Treating that as a failure would throw away a
  // perfectly good report, so the exit code is only consulted when stdout came back empty.
  const result = spawnSync(parts.join(" "), {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
    shell: true,
  });

  const raw = result.stdout ?? "";
  if (!raw.trim()) {
    const detail = (result.stderr ?? "").trim() || `exit code ${result.status}`;
    throw new Error(`vercel logs returned nothing: ${detail}`);
  }

  // The CLI repeats entries when it pages, so dedupe by id before counting anything.
  const byId = new Map<string, unknown>();
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const row = JSON.parse(trimmed) as { id?: string };
      if (row.id) byId.set(row.id, row);
    } catch {
      // A partial line at a chunk boundary is not worth failing the report over.
    }
  }
  return [...byId.values()];
}

/** Pull the application's own `logEvent` lines out of a request's nested log array. */
function appEvents(rows: unknown[]): Array<{ event: string; copyVariant?: string }> {
  const events: Array<{ event: string; copyVariant?: string }> = [];
  for (const row of rows) {
    const logs = (row as { logs?: Array<{ message?: string }> }).logs;
    if (!Array.isArray(logs)) continue;
    for (const entry of logs) {
      const message = entry?.message;
      if (typeof message !== "string" || !message.includes('"event"')) continue;
      try {
        const parsed = JSON.parse(message) as { event?: string; copyVariant?: string };
        if (parsed.event) events.push({ event: parsed.event, copyVariant: parsed.copyVariant });
      } catch {
        // Not every log line is one of ours.
      }
    }
  }
  return events;
}

function rate(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function main(): void {
  const since = arg("since", "24h");
  const until = arg("until", "now");
  const limit = Number(arg("limit", "5000"));

  const rows = fetchLogs(since, until, limit);
  const events = appEvents(rows);

  const variants = new Set<string>(["a", "b"]);
  for (const e of events) if (e.copyVariant) variants.add(e.copyVariant);

  const counts: Record<string, Counts> = {};
  let unattributed = 0;
  for (const name of TRACKED) counts[name] = {};
  for (const e of events) {
    if (!TRACKED.includes(e.event as (typeof TRACKED)[number])) continue;
    if (!e.copyVariant) {
      unattributed += 1;
      continue;
    }
    const bucket = counts[e.event];
    if (bucket) bucket[e.copyVariant] = (bucket[e.copyVariant] ?? 0) + 1;
  }

  const ordered = [...variants].sort();

  console.log(`window        ${since} → ${until}`);
  console.log(`log entries   ${rows.length} unique requests, ${events.length} app events`);
  console.log("");
  console.log("variant  verified preview  checkout started  paid+delivered   preview→paid");
  console.log("-------  ----------------  ----------------  --------------   ------------");

  let totalDenominator = 0;
  for (const v of ordered) {
    const d = counts[DENOMINATOR]?.[v] ?? 0;
    const i = counts[INTERMEDIATE]?.[v] ?? 0;
    const n = counts[NUMERATOR]?.[v] ?? 0;
    totalDenominator += d;
    console.log(
      `${v.padEnd(7)}  ${String(d).padStart(16)}  ${String(i).padStart(16)}  ${String(n).padStart(14)}   ${rate(n, d).padStart(12)}`,
    );
  }

  if (unattributed > 0) {
    console.log("");
    console.log(
      `note          ${unattributed} tracked event(s) carried no variant and are excluded rather than guessed at`,
    );
  }

  console.log("");
  const perVariantOk = ordered.every(
    (v) => (counts[DENOMINATOR]?.[v] ?? 0) >= THRESHOLD_PER_VARIANT,
  );
  const totalOk = totalDenominator >= THRESHOLD_TOTAL;

  if (totalOk && perVariantOk) {
    console.log(
      `SAMPLE REACHED — ${totalDenominator} verified previews overall, ${THRESHOLD_PER_VARIANT}+ per variant.`,
    );
    console.log("A winner may now be assessed. Still report the interval, not just the point.");
  } else {
    console.log(
      `BELOW THRESHOLD — ${totalDenominator}/${THRESHOLD_TOTAL} verified previews overall; need ${THRESHOLD_PER_VARIANT}+ per variant.`,
    );
    console.log(
      "Do NOT call a winner. Report the observed counts and the uncertainty around them.",
    );
  }
}

main();
