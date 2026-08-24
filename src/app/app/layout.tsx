import type { ReactNode } from "react";

import { ProcessingShell } from "@/components/site/processing-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ProcessingShell>{children}</ProcessingShell>;
}
