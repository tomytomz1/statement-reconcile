import { siteConfig } from "@/config/site";

/**
 * The wordmark.
 *
 * Drawn inline as SVG rather than loaded as an image file: it is a few hundred bytes, it
 * never causes a layout shift, it inherits the current text colour so it works on the light
 * header and the dark footer, and it adds no request to a page whose speed is a ranking
 * factor.
 *
 * The glyph is two ledger rows and a tick — the product in one mark.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 28 28"
          className="size-7 shrink-0"
          role="presentation"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="0.75"
            y="0.75"
            width="26.5"
            height="26.5"
            rx="7.25"
            className="fill-accent-700"
          />
          <path
            d="M7 9.5h9M7 14h6"
            stroke="currentColor"
            className="text-accent-200"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M9 19.25 12.4 22.5 21 12.5"
            stroke="currentColor"
            className="text-white"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="flex flex-col leading-none">
          <span className="text-[0.9375rem] font-bold tracking-tight">{siteConfig.brandName}</span>
          <span className="text-ink-500 mt-0.5 text-[0.6875rem] font-medium">
            {siteConfig.brandDescriptor}
          </span>
        </span>
      </span>
    </span>
  );
}
