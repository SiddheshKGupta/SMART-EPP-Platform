"use client";

import {
  BadgeIndianRupee,
  ClipboardCheck,
  FileClock,
  FileInput,
  GitBranch,
  LayoutDashboard,
  Scale,
  ScrollText,
} from "lucide-react";
import { gsap } from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ComponentType } from "react";
import { MOTION } from "@/lib/motion";

interface ModuleItem {
  label: string;
  href: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
}

const subventionItems: ModuleItem[] = [
  { label: "Control desk", href: "/subvention", icon: LayoutDashboard },
  { label: "Scheme versions", href: "/subvention/schemes", icon: FileClock },
  {
    label: "Programme mappings",
    href: "/subvention/programme-mappings",
    icon: GitBranch,
  },
  {
    label: "Purchase imports",
    href: "/subvention/purchase-imports",
    icon: FileInput,
  },
  {
    label: "Eligibility",
    href: "/subvention/eligibility",
    icon: ClipboardCheck,
  },
  { label: "Claims", href: "/subvention/claims", icon: ScrollText },
  {
    label: "Reconciliation",
    href: "/subvention/reconciliation",
    icon: Scale,
  },
  {
    label: "Recovery",
    href: "/subvention/recovery",
    icon: BadgeIndianRupee,
  },
];

function isCurrent(pathname: string, href: string): boolean {
  return href === "/subvention"
    ? pathname === href
    : pathname.startsWith(href);
}

export function ModuleNavigation() {
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (
      !panel ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const tween = gsap.fromTo(
      panel,
      { opacity: 0, x: -12 },
      {
        opacity: 1,
        x: 0,
        duration: MOTION.enter,
        ease: MOTION.panelEase,
      },
    );

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <aside ref={panelRef} className="module-navigation">
      <div className="module-heading">
        <span className="module-kicker">Operating vertical</span>
        <strong>Subvention</strong>
      </div>
      <nav aria-label="Subvention navigation" className="module-links">
        {subventionItems.map((item) => {
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
      </nav>
      <p className="module-footnote">
        Rule snapshots remain attached to every processed record.
      </p>
    </aside>
  );
}
