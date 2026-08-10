"use client";

import {
  BadgeIndianRupee,
  BriefcaseBusiness,
  ChartColumn,
  CircleDollarSign,
  FileCheck,
  FolderOpen,
  Inbox,
  Landmark,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PLATFORM_MODULES, type PlatformModuleDefinition } from "@smart-epp/domain";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  inbox: Inbox,
  "briefcase-business": BriefcaseBusiness,
  users: Users,
  "file-check": FileCheck,
  package: Package,
  "shopping-cart": ShoppingCart,
  landmark: Landmark,
  receipt: Receipt,
  "badge-indian-rupee": BadgeIndianRupee,
  "circle-dollar-sign": CircleDollarSign,
  "folder-open": FolderOpen,
  "triangle-alert": ShieldAlert,
  "chart-column": ChartColumn,
  settings: Settings,
};

function isCurrent(pathname: string, module: PlatformModuleDefinition) {
  const href = module.slug === "command-centre" ? "/" : `/${module.slug}`;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function CapabilityLink({ module, collapsed }: { module: PlatformModuleDefinition; collapsed: boolean }) {
  const pathname = usePathname();
  const Icon = ICONS[module.icon] ?? LayoutDashboard;
  const href = module.slug === "command-centre" ? "/" : `/${module.slug}`;
  const active = isCurrent(pathname, module);
  const link = (
    <Link
      className="capability-link"
      data-active={active}
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={module.label}
    >
      <Icon aria-hidden className="capability-icon" />
      <span className="capability-label">{module.label}</span>
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>{module.label}</TooltipContent>
    </Tooltip>
  );
}

export function CapabilitySidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const primary = PLATFORM_MODULES.filter((module) => module.key !== "ADMIN");
  const admin = PLATFORM_MODULES.find((module) => module.key === "ADMIN");

  useEffect(() => {
    document.querySelector(".platform-shell")?.setAttribute("data-capability-collapsed", String(collapsed));
    return () => document.querySelector(".platform-shell")?.removeAttribute("data-capability-collapsed");
  }, [collapsed]);

  return (
    <aside className="capability-sidebar" data-collapsed={collapsed}>
      <div className="capability-sidebar-header">
        <span className="capability-mark" aria-hidden="true">SE</span>
        <strong className="capability-brand">Smart EPP</strong>
        <Button
          variant="ghost"
          size="icon"
          className="capability-collapse"
          aria-label={collapsed ? "Expand capability navigation" : "Collapse capability navigation"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden>{collapsed ? "+" : "−"}</span>
        </Button>
      </div>
      <nav aria-label="SMART EPP capabilities" className="capability-links">
        <div className="capability-link-list">
          {primary.map((module) => <CapabilityLink key={module.key} module={module} collapsed={collapsed} />)}
        </div>
        {admin ? <div className="capability-admin"><CapabilityLink module={admin} collapsed={collapsed} /></div> : null}
      </nav>
    </aside>
  );
}
