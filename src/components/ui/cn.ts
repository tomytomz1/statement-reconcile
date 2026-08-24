/**
 * Minimal class-name joiner.
 *
 * A dedicated utility package is not worth a dependency for this: the components in this
 * project compose a handful of conditional classes and never need Tailwind conflict
 * resolution, because variants are defined as complete class strings rather than patched
 * together at the call site.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
