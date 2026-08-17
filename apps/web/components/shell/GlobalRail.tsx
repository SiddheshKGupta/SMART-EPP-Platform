"use client";

import {
  BriefcaseBusiness,
  Building2,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RailItem {
  label: string;
  href: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
  match: (pathname: string) => boolean;
}

const railItems: RailItem[] = [
  {
    label: "My Workbench",
    href: "/",
    icon: BriefcaseBusiness,
    match: (pathname) => pathname === "/",
  },
  {
    label: "Onboarding",
    href: "/onboarding",
    icon: Building2,
    match: (pathname) => pathname.startsWith("/onboarding"),
  },
  {
    label: "Foreclosure",
    href: "/foreclosure",
    icon: Landmark,
    match: (pathname) => pathname.startsWith("/foreclosure"),
  },
  {
    label: "Subvention",
    href: "/subvention",
    icon: ShieldCheck,
    match: (pathname) => pathname.startsWith("/subvention"),
  },
];

export function GlobalRail() {
  const pathname = usePathname();

  return (
    <nav className="global-rail" aria-label="Global modules">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link className="rail-mark" href="/" aria-label="Smart EPP home">
            <span aria-hidden="true">SE</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Smart EPP
        </TooltipContent>
      </Tooltip>

      <div className="rail-modules">
        {railItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  className="rail-link"
                  data-active={isActive}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon aria-hidden className="rail-icon" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            className="rail-link rail-link-bottom"
            href="/audit"
            aria-label="Audit trail"
          >
            <span className="rail-monogram" aria-hidden="true">
              AT
            </span>
            <span className="sr-only">Audit trail</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Audit trail
        </TooltipContent>
      </Tooltip>
    </nav>
  );
}
