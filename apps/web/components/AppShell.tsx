import type { ReactNode } from "react";
import { PlatformShell } from "@/components/shell/PlatformShell";
import type { PlatformSnapshot } from "@smart-epp/domain";

export function AppShell({ children, initialSnapshot }: { children: ReactNode; initialSnapshot?: PlatformSnapshot }) {
  return <PlatformShell initialSnapshot={initialSnapshot}>{children}</PlatformShell>;
}
