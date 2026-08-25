import type Stripe from "stripe";

import { COMMERCIAL_OFFER, matchOfferAgainstSessionTerms } from "@/config/commerce";
import { mockPaymentsEnabled, serverEnv } from "@/config/env";
import { siteConfig } from "@/config/site";
import { isSha256Hex, timingSafeEqualHex } from "@/lib/crypto/digest";
import { logEvent } from "@/lib/security/logging";

import { isStripeReady, stripe } from "./stripe";

/**
 * Entitlement: deciding whether a given extraction result has been paid for.
 *
 * The rule is narrow on purpose. A paid Checkout Session entitles the holder to exactly
 * one conversion pack: the one whose canonical digest was recorded in the session's metadata at
 * the moment checkout was created. Presenting a paid session with different data is not a
 * partial match, it is a rejection.
 *
 * Stripe is authoritative. There is no local database of purchases, no signed cookie that
 * can be replayed against a different result, and no client-supplied claim that is
 * believed. Every export re-reads the session from Stripe.
 */

export const CHECKOUT_METADATA_KEYS = {
  digest: "result_digest",
  jobId: "job_id",
  pageCount: "page_count",
  transactionCount: "transaction_count",
  productVersion: "product_version",
  schemaVersion: "schema_version",
  fileCount: "file_count",
} as const;

/**
 * Metadata attached to a Checkout Session.
 *
 * This is the complete list. No balances, no bank name, no account identifier, no
 * description, no date from the statement, and no filename. The digest is a one-way hash
 * of the pack manifest (ordered file-level result digests, counts, and versions).
 */
export type CheckoutMetadata = {
  [CHECKOUT_METADATA_KEYS.digest]: string;
  [CHECKOUT_METADATA_KEYS.jobId]: string;
  [CHECKOUT_METADATA_KEYS.pageCount]: string;
  [CHECKOUT_METADATA_KEYS.transactionCount]: string;
  [CHECKOUT_METADATA_KEYS.productVersion]: string;
  [CHECKOUT_METADATA_KEYS.schemaVersion]: string;
  [CHECKOUT_METADATA_KEYS.fileCount]: string;
};

export function buildCheckoutMetadata(input: {
  digest: string;
  jobId: string;
  pageCount: number;
  transactionCount: number;
  fileCount?: number;
}): CheckoutMetadata {
  if (!isSha256Hex(input.digest)) throw new Error("digest must be a SHA-256 hex string");
  return {
    [CHECKOUT_METADATA_KEYS.digest]: input.digest,
    [CHECKOUT_METADATA_KEYS.jobId]: input.jobId,
    [CHECKOUT_METADATA_KEYS.pageCount]: String(input.pageCount),
    [CHECKOUT_METADATA_KEYS.transactionCount]: String(input.transactionCount),
    [CHECKOUT_METADATA_KEYS.productVersion]: siteConfig.productVersion,
    [CHECKOUT_METADATA_KEYS.schemaVersion]: "2",
    [CHECKOUT_METADATA_KEYS.fileCount]: String(input.fileCount ?? 1),
  };
}

export type Entitlement = {
  sessionId: string;
  digest: string;
  jobId: string;
  paidAt: number | null;
  amountTotal: number | null;
  currency: string | null;
  livemode: boolean;
};

export type EntitlementResult =
  { ok: true; entitlement: Entitlement } | { ok: false; reason: EntitlementFailure };

export type EntitlementFailure =
  | "stripe_unavailable"
  | "session_not_found"
  | "not_paid"
  | "no_digest"
  | "digest_mismatch"
  /** Paid, but not at the advertised amount or currency. See `matchOfferAgainstSessionTerms`. */
  | "terms_mismatch"
  /** Paid and correct, but outside the 30-day entitlement window. */
  | "expired";

const SESSION_ID_PATTERN = /^cs_(?:test|live)_[A-Za-z0-9]{10,200}$/;
const MOCK_SESSION_PREFIX = "cs_mock_";

export function looksLikeSessionId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (mockPaymentsEnabled() && value.startsWith(MOCK_SESSION_PREFIX)) return true;
  return SESSION_ID_PATTERN.test(value);
}

/**
 * Verify a Checkout Session against a digest.
 *
 * `expectedDigest` is the digest of the data the caller is actually asking us to export.
 * It is compared in constant time against the digest Stripe holds.
 */
export async function verifyEntitlement(
  sessionId: string,
  expectedDigest: string,
): Promise<EntitlementResult> {
  if (!isSha256Hex(expectedDigest)) return { ok: false, reason: "digest_mismatch" };

  if (mockPaymentsEnabled() && sessionId.startsWith(MOCK_SESSION_PREFIX)) {
    // The end-to-end suite needs to prove that the export gate works. The mock session
    // encodes the digest it paid for, so a mismatch is still a rejection, and this branch
    // is unreachable unless APP_ENV=test and NODE_ENV is not production.
    const paidDigest = sessionId.slice(MOCK_SESSION_PREFIX.length);
    if (!isSha256Hex(paidDigest)) return { ok: false, reason: "no_digest" };
    if (!timingSafeEqualHex(paidDigest, expectedDigest)) {
      return { ok: false, reason: "digest_mismatch" };
    }
    return {
      ok: true,
      entitlement: {
        sessionId,
        digest: paidDigest,
        jobId: "mock",
        paidAt: Date.now(),
        amountTotal: COMMERCIAL_OFFER.amountCents,
        currency: COMMERCIAL_OFFER.currency,
        livemode: false,
      },
    };
  }

  const authorized = await authorizeSession(sessionId);
  if (!authorized.ok) return authorized;

  const { entitlement } = authorized;
  if (!timingSafeEqualHex(entitlement.digest, expectedDigest)) {
    return { ok: false, reason: "digest_mismatch" };
  }

  return { ok: true, entitlement };
}

/**
 * Everything that must hold about a paid session before it authorizes anything.
 *
 * Both the export gate and the recovery lookup go through here, so the two cannot drift
 * apart. That drift was real: recovery previously reported a session as usable after
 * checking only `payment_status` and the presence of a digest, so a session at the wrong
 * amount, in the wrong currency, or long past the entitlement window would be reported as
 * recoverable — and the customer would only discover otherwise at export.
 *
 * The digest is returned rather than compared here, because the two callers want different
 * things from it: export compares it against data the caller already holds, recovery hands
 * it back so the browser can find the matching local job.
 */
export async function authorizeSession(sessionId: string): Promise<EntitlementResult> {
  if (!isStripeReady()) return { ok: false, reason: "stripe_unavailable" };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return { ok: false, reason: "session_not_found" };
  }

  if (session.payment_status !== "paid") return { ok: false, reason: "not_paid" };

  // "Paid" is not sufficient. A session created against a Price that was changed, or with
  // an amount arrived at some other way, can still report paid — so the money is checked
  // against the commercial contract before anything is released.
  const terms = matchOfferAgainstSessionTerms(session);
  if (!terms.ok) {
    logEvent("entitlement_refused", { reason: terms.reason });
    return { ok: false, reason: "terms_mismatch" };
  }

  const paidDigest = session.metadata?.[CHECKOUT_METADATA_KEYS.digest];
  if (!paidDigest || !isSha256Hex(paidDigest)) return { ok: false, reason: "no_digest" };

  const entitlement: Entitlement = {
    sessionId: session.id,
    digest: paidDigest,
    jobId: session.metadata?.[CHECKOUT_METADATA_KEYS.jobId] ?? "",
    paidAt: session.created ? session.created * 1000 : null,
    amountTotal: session.amount_total,
    currency: session.currency,
    livemode: session.livemode,
  };

  if (!isWithinEntitlementWindow(entitlement)) {
    logEvent("entitlement_refused", { reason: "expired" });
    return { ok: false, reason: "expired" };
  }

  return { ok: true, entitlement };
}

/**
 * Look up a paid session without knowing the digest, for the "I lost my download" path.
 *
 * Returns only the digest the session paid for. The caller still has to present matching
 * data, so this cannot be used to obtain someone else's statement — a session id on its
 * own yields a hash and nothing more.
 */
export async function paidDigestForSession(
  sessionId: string,
): Promise<{ ok: true; digest: string } | { ok: false; reason: EntitlementFailure }> {
  if (mockPaymentsEnabled() && sessionId.startsWith(MOCK_SESSION_PREFIX)) {
    const digest = sessionId.slice(MOCK_SESSION_PREFIX.length);
    return isSha256Hex(digest) ? { ok: true, digest } : { ok: false, reason: "no_digest" };
  }

  // Same authorization as export: paid, at the contracted amount and currency, with a
  // usable digest, inside the entitlement window. Reporting a session as recoverable on
  // weaker conditions than the ones export will apply is how a customer ends up being told
  // their payment is fine and then refused the file.
  const authorized = await authorizeSession(sessionId);
  if (!authorized.ok) return authorized;
  return { ok: true, digest: authorized.entitlement.digest };
}

/**
 * How long after payment a session may still be used to download.
 *
 * Downloads are intentionally repeatable: a customer who paid and then lost the file must
 * be able to try again without contacting anybody. Replay is therefore not prevented, it
 * is bounded — the same session can only ever produce the same statement, and only for a
 * limited period.
 */
export const ENTITLEMENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isWithinEntitlementWindow(entitlement: Entitlement, now = Date.now()): boolean {
  if (entitlement.paidAt === null) return true;
  return now - entitlement.paidAt <= ENTITLEMENT_TTL_MS;
}

export function stripeModeFromEnv(): "live" | "test" | "unconfigured" {
  const key = serverEnv().STRIPE_SECRET_KEY;
  if (!key) return "unconfigured";
  return key.includes("_live_") ? "live" : "test";
}
