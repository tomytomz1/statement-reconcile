import type { ReactNode } from "react";

import { cn } from "./cn";

/**
 * Layout and content primitives shared by the marketing pages and the app.
 *
 * Keeping section rhythm, measure, and heading scale in one place is what stops twenty-odd
 * landing pages from drifting into twenty-odd slightly different designs.
 */

export function Container({
  children,
  className,
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  width?: "narrow" | "prose" | "wide";
}) {
  const widths = {
    narrow: "max-w-3xl",
    prose: "max-w-2xl",
    wide: "max-w-6xl",
  } as const;
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8", widths[width], className)}>{children}</div>
  );
}

export function Section({
  children,
  className,
  tone = "default",
  id,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "raised" | "ink";
  id?: string;
  labelledBy?: string;
}) {
  const tones = {
    default: "",
    raised: "bg-white",
    ink: "bg-ink-950 text-ink-100",
  } as const;
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("py-14 sm:py-20", tones[tone], className)}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn("text-accent-700 text-xs font-semibold tracking-[0.12em] uppercase", className)}
    >
      {children}
    </p>
  );
}

export function Heading({
  level = 2,
  children,
  className,
  id,
}: {
  level?: 1 | 2 | 3 | 4;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const sizes = {
    1: "text-3xl font-bold tracking-tight text-ink-950 sm:text-[2.75rem] sm:leading-[1.1]",
    2: "text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl",
    3: "text-lg font-semibold text-ink-900 sm:text-xl",
    4: "text-base font-semibold text-ink-900",
  } as const;
  const Tag = `h${level}` as const;
  return (
    <Tag id={id} className={cn(sizes[level], className)}>
      {children}
    </Tag>
  );
}

export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-ink-600 text-lg leading-relaxed", className)}>{children}</p>;
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  return (
    <Tag className={cn("rounded-card border-ink-200 shadow-panel border bg-white p-6", className)}>
      {children}
    </Tag>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "verified" | "caution" | "refused" | "accent";
  className?: string;
}) {
  const tones = {
    neutral: "border-ink-200 bg-ink-50 text-ink-700",
    verified: "border-verified-200 bg-verified-50 text-verified-700",
    caution: "border-caution-200 bg-caution-50 text-caution-700",
    refused: "border-refused-200 bg-refused-50 text-refused-700",
    accent: "border-accent-200 bg-accent-50 text-accent-800",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A short list of plain claims.
 *
 * Deliberately not a grid of icons: the claims this product makes are numeric and specific,
 * and iconography makes specific claims read as generic ones.
 */
export function CheckList({
  items,
  className,
  tone = "verified",
}: {
  items: readonly string[];
  className?: string;
  tone?: "verified" | "neutral";
}) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="text-ink-700 flex gap-3 text-sm leading-relaxed">
          <span
            aria-hidden="true"
            className={cn(
              "mt-[0.35rem] size-1.5 shrink-0 rounded-full",
              tone === "verified" ? "bg-verified-600" : "bg-ink-400",
            )}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-ink-700 [&_a]:text-accent-700 [&_a:hover]:text-accent-800 [&_h2]:text-ink-950 [&_h3]:text-ink-900 [&_strong]:text-ink-900 space-y-5 text-[0.975rem] leading-[1.75] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:space-y-2 [&_ol_li]:list-decimal [&_strong]:font-semibold [&_ul]:space-y-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-ink-200", className)} />;
}
