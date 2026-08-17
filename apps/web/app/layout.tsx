import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { createPlatformApplication } from "@/features/platform/server/platformApplication";

export const metadata: Metadata = {
  title: "Smart EPP",
  description: "Connect institutional employee purchase programme operations",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initialSnapshot = await createPlatformApplication().loadSnapshot();
  return (
    <html lang="en">
      <body>
        <AppShell initialSnapshot={initialSnapshot}>{children}</AppShell>
      </body>
    </html>
  );
}
