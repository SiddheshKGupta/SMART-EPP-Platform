import type { ReactNode } from "react";
import { PlatformShell } from "@/components/shell/PlatformShell";

export function AppShell({ children }: { children: ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
