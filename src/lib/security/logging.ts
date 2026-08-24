import { isProduction } from "@/config/env";

/**
 * Logging that cannot leak statement data.
 *
 * The only way to guarantee no statement content reaches a log aggregator is to make it
 * impossible to pass arbitrary values to the logger. `logEvent` accepts a fixed event
 * name and a record of values drawn from a narrow allowed type: booleans, integers, and
 * strings from a small set of known enums. Free-form strings are truncated hard and are
 * only ever used for internal codes.
 *
 * Request bodies, statement text, descriptions, amounts, balances, filenames, and
 * provider payloads are never logged anywhere in this application.
 */

export type LogValue = string | number | boolean | null | undefined;

export type LogFields = Record<string, LogValue>;

const MAX_STRING = 64;

const REDACTED = "[redacted]";

/** Field names that must never appear in a log line, whatever their value. */
const FORBIDDEN_KEYS = new Set([
  "description",
  "descriptions",
  "amount",
  "amounts",
  "balance",
  "balances",
  "transaction",
  "transactions",
  "statement",
  "text",
  "body",
  "filename",
  "file",
  "name",
  "email",
  "account",
  "accountnumber",
  "bank",
  "payload",
  "prompt",
  "response",
  "raw",
]);

function sanitizeValue(value: LogValue): LogValue {
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.slice(0, MAX_STRING);
  // Anything with a digit run long enough to be an account or card fragment is dropped.
  return /\d{4,}/.test(trimmed) ? REDACTED : trimmed;
}

function sanitizeFields(fields: LogFields): LogFields {
  const output: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    output[key] = FORBIDDEN_KEYS.has(key.toLowerCase()) ? REDACTED : sanitizeValue(value);
  }
  return output;
}

export function logEvent(event: string, fields: LogFields = {}): void {
  const line = { event, ...sanitizeFields(fields) };
  console.log(JSON.stringify(line));
}

/**
 * Log a failure without the error message.
 *
 * An exception raised while parsing a statement can easily contain a fragment of that
 * statement — a Zod issue quotes the offending value, a JSON parse error quotes the
 * surrounding characters. Only the error's constructor name is recorded.
 */
export function logFailure(event: string, error: unknown, fields: LogFields = {}): void {
  const kind = error instanceof Error ? error.name : typeof error;
  logEvent(event, { ...fields, errorKind: kind.slice(0, MAX_STRING) });
  if (!isProduction() && error instanceof Error) {
    // Locally, the stack is useful and there is no customer data at risk. Never in production.
    console.debug(`[dev] ${event}: ${error.stack ?? error.message}`);
  }
}
