"use client";

import {
  BadgeIndianRupee,
  ClipboardCheck,
  Database,
  FileClock,
  FileInput,
  GitBranch,
  LibraryBig,
  LayoutDashboard,
  Scale,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface ModuleItem {
  label: string;
  href: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
}

interface ModuleGroup {
  label: string;
  items: ModuleItem[];
}

const subventionGroups: ModuleGroup[] = [
  {
    label: "Control centre",
    items: [
      { label: "Overview", href: "/subvention", icon: LayoutDashboard },
      { label: "Operations workbench", href: "/subvention/operations", icon: ClipboardCheck },
    ],
  },
  {
    label: "Daily process",
    items: [
      { label: "Upload documents", href: "/subvention/purchase-imports", icon: FileInput },
      { label: "Transactions", href: "/subvention/transactions", icon: LibraryBig },
      { label: "Exception review", href: "/subvention/eligibility", icon: SlidersHorizontal },
      { label: "Claims & tracking", href: "/subvention/claims", icon: ScrollText },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Master data", href: "/subvention/masters", icon: Database },
      { label: "Scheme versions", href: "/subvention/schemes", icon: FileClock },
      { label: "Programme mappings", href: "/subvention/programme-mappings", icon: GitBranch },
      { label: "Data model", href: "/subvention/administration/data-model", icon: GitBranch },
    ],
  },
  {
    label: "Finance controls",
    items: [
      { label: "Reconciliation", href: "/subvention/reconciliation", icon: Scale },
      { label: "Recovery", href: "/subvention/recovery", icon: BadgeIndianRupee },
    ],
  },
];

function isCurrent(pathname: string, href: string): boolean {
  return href === "/subvention"
    ? pathname === href
    : pathname.startsWith(href);
}

export function ModuleNavigation() {
  const pathname = usePathname();

  return (
    <aside className="module-navigation">
      <div className="module-heading">
        <span className="module-product-mark" aria-hidden="true">SE</span>
        <span>
          <span className="module-kicker">Smart EPP</span>
          <strong>Subvention</strong>
        </span>
      </div>
      <nav aria-label="Subvention navigation" className="module-links">
        {subventionGroups.map((group) => (
          <div className="module-link-group" key={group.label}>
            <span className="module-group-label">{group.label}</span>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  className="module-link"
                  data-active={active}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="module-footnote">
        <span>Controlled operations</span>
        <p>Developed by <strong>V L &amp; CO</strong></p>
      </div>
    </aside>
  );
}
