"use client";

import { CircleDot, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLATFORM_MODULES, moduleBySlug, type PlatformModuleDefinition, type PlatformSubmoduleDefinition } from "@smart-epp/domain";

const SUBVENTION_PATHS: Record<string, string> = {
  "control-desk": "/subvention",
  schemes: "/subvention/schemes",
  "programme-mappings": "/subvention/programme-mappings",
  "purchase-repository": "/subvention/transactions",
  "import-quarantine": "/subvention/purchase-imports",
  "purchase-evidence": "/subvention/transactions",
  eligibility: "/subvention/eligibility",
  "claim-preparation": "/subvention/claims",
  "claim-batching": "/subvention/claims",
  "claim-reconciliation": "/subvention/reconciliation",
  rejections: "/subvention/eligibility",
  representation: "/subvention/recovery",
  invoicing: "/subvention/claims",
  "receipts-allocation": "/subvention/reconciliation",
  "accounting-closure": "/subvention/reconciliation",
  mis: "/subvention/operations",
};

function activeModule(pathname: string): PlatformModuleDefinition | undefined {
  const [slug] = pathname.split("/").filter(Boolean);
  return slug ? moduleBySlug(slug) : PLATFORM_MODULES[0];
}

export function platformSubmoduleHref(module: PlatformModuleDefinition, submodule: PlatformSubmoduleDefinition) {
  return module.slug === "subvention"
    ? SUBVENTION_PATHS[submodule.slug] ?? `/subvention/${submodule.slug}`
    : `/${module.slug}/${submodule.slug}`;
}

function isCurrent(pathname: string, href: string) {
  return href === "/subvention" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function ModuleNavigation() {
  const pathname = usePathname();
  const module = activeModule(pathname);
  if (!module?.submodules.length) return null;

  return (
    <aside className="module-navigation">
      <div className="module-heading">
        <span className="module-kicker">Capability</span>
        <strong>{module.label}</strong>
      </div>
      <nav aria-label={`${module.label} navigation`} className="module-links">
        {module.submodules.map((submodule) => {
          const href = platformSubmoduleHref(module, submodule);
          const current = isCurrent(pathname, href);
          const Icon: LucideIcon = CircleDot;
          return (
            <Link key={submodule.key} className="module-link" data-active={current} href={href} aria-current={current ? "page" : undefined}>
              <Icon aria-hidden />
              <span>{submodule.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="module-footnote">Operational workspace</div>
    </aside>
  );
}
