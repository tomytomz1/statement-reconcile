import type { ReactNode } from "react";

import { ProcessingShell } from "@/components/site/processing-shell";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <ProcessingShell>{children}</ProcessingShell>;
}
