import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Subvention Control Centre · Smart EPP",
  description:
    "Controlled subvention operations, management reporting and master data for Connect Smart EPP.",
};

export default function SubventionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
