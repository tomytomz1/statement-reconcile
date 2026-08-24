import type { FaqEntry } from "@/content/faq";

/**
 * FAQ rendering.
 *
 * Built from `<details>` rather than a JavaScript accordion, so it works before hydration, is
 * keyboard-operable and announced correctly with no ARIA of our own, and is fully present in
 * the HTML for a crawler — which matters because these answers are marked up as JSON-LD and
 * the markup has to match visible content.
 */
export function FaqList({ entries }: { entries: readonly FaqEntry[] }) {
  return (
    <div className="divide-ink-200 rounded-card border-ink-200 divide-y overflow-hidden border bg-white">
      {entries.map((entry) => (
        <details key={entry.question} className="group">
          <summary className="text-ink-900 hover:bg-ink-50 flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left font-semibold">
            <span>{entry.question}</span>
            <span
              aria-hidden="true"
              className="text-ink-400 mt-1 shrink-0 transition-transform group-open:rotate-45"
            >
              <svg
                viewBox="0 0 20 20"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="text-ink-700 space-y-3 px-5 pb-5 text-[0.9375rem] leading-relaxed">
            {entry.answer.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
