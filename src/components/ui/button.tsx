import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Buttons and button-styled links.
 *
 * There is exactly one primary style, and it is reserved for the single action that moves a
 * customer forward on the current page. Competing primaries are the fastest way to make a
 * funnel ambiguous, so secondary and quiet variants exist for everything else.
 */

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-700 text-white shadow-sm hover:bg-accent-800 active:bg-accent-900 focus-visible:outline-accent-700",
  secondary:
    "border border-ink-300 bg-white text-ink-800 hover:border-ink-400 hover:bg-ink-50 focus-visible:outline-accent-700",
  quiet:
    "text-accent-700 hover:bg-accent-50 hover:text-accent-800 focus-visible:outline-accent-700",
  danger:
    "border border-refused-200 bg-white text-refused-700 hover:bg-refused-50 focus-visible:outline-refused-700",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

type SharedProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: Omit<SharedProps, "children">): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  children,
  ...rest
}: SharedProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...rest
}: SharedProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "href" | "className" | "children"
  >) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {children}
    </Link>
  );
}
