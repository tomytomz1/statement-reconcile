/**
 * Only public, single-segment marketing URLs are eligible for optional GA4.
 * Financial workflows must not generate analytics, even through our own relay.
 * Shared by client and server to prevent accidental drift.
 */
const PUBLIC_PATH = /^\/(?:[a-z0-9-]{1,100})?$/;
const RESERVED_ROOTS = new Set(["/app", "/checkout", "/api", "/admin"]);

export function isPublicMarketingPath(pathname: string): boolean {
  if (!PUBLIC_PATH.test(pathname)) return false;
  return !RESERVED_ROOTS.has(pathname);
}
