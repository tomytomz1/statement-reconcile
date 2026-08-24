/**
 * Deterministic JSON serialization.
 *
 * The digest that binds a Stripe payment to one specific extraction result must be
 * byte-identical when computed in the browser before checkout and again on the server
 * during the paid export. That requires a canonical serialization: object keys sorted
 * by UTF-16 code unit, no insignificant whitespace, `undefined` and `null` members
 * dropped, and no reliance on property insertion order.
 *
 * This is a JCS-style (RFC 8785) subset: it accepts strings, booleans, integers,
 * arrays, and plain objects. Non-integer numbers are rejected because the product never
 * represents money as a float, and float formatting is the one part of JCS that is easy
 * to get subtly wrong across runtimes.
 */

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizationError";
  }
}

export type CanonicalValue =
  | string
  | boolean
  | number
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue | undefined };

export function canonicalJson(value: unknown): string {
  return serialize(value, 0);
}

const MAX_DEPTH = 32;

function serialize(value: unknown, depth: number): string {
  if (depth > MAX_DEPTH) throw new CanonicalizationError("value nested too deeply");

  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return quote(value);
    case "boolean":
      return value ? "true" : "false";
    case "number": {
      if (!Number.isFinite(value)) throw new CanonicalizationError("non-finite number");
      if (!Number.isInteger(value)) {
        throw new CanonicalizationError(
          "non-integer numbers are not canonicalizable; use a decimal string",
        );
      }
      return String(value === 0 ? 0 : value);
    }
    case "undefined":
      throw new CanonicalizationError("undefined is not serializable at this position");
    case "object":
      break;
    default:
      throw new CanonicalizationError(`unsupported type: ${typeof value}`);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => (item === undefined ? "null" : serialize(item, depth + 1)));
    return `[${items.join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined && record[key] !== null)
    .sort(compareCodeUnits);

  const members = keys.map((key) => `${quote(key)}:${serialize(record[key], depth + 1)}`);
  return `{${members.join(",")}}`;
}

function compareCodeUnits(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const ESCAPES: Record<string, string> = {
  '"': '\\"',
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

function quote(value: string): string {
  let out = '"';
  for (const char of value) {
    const escape = ESCAPES[char];
    if (escape) {
      out += escape;
      continue;
    }
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20) {
      out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    out += char;
  }
  return `${out}"`;
}
