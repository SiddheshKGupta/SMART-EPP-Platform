"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { PLATFORM_MODULES, moduleBySlug } from "@smart-epp/domain";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";
import { SubventionProvider } from "@/features/subvention/store/SubventionProvider";
import { PlatformProvider } from "@/features/platform/store/PlatformProvider";
import { CommandBar } from "./CommandBar";
import { CapabilitySidebar } from "./CapabilitySidebar";
import { ModuleNavigation } from "./ModuleNavigation";
import { GuidedDemoDrawer } from "@/features/platform/guided-demo/GuidedDemoDrawer";
import type { PlatformSnapshot } from "@smart-epp/domain";

function ActionAnnouncements() {
  const { actionError, issues } = useSubvention();
  if (!actionError && issues.length === 0) return null;

  return (
    <div className="action-announcement" role="alert" aria-live="assertive">
      {actionError?.message}
      {issues.map((issue) => (
        <span key={`${issue.code}-${issue.field ?? "record"}`}>
          {issue.message} {issue.recoveryAction}
        </span>
      ))}
    </div>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasMounted = useRef(false);
  const [slug] = pathname.split("/").filter(Boolean);
  const activeModule = slug ? moduleBySlug(slug) : PLATFORM_MODULES[0];
  const hasModuleNavigation = Boolean(activeModule?.submodules.length);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      const destinationHeading = main?.querySelector<HTMLElement>("h1");
      const focusTarget = destinationHeading ?? main;
      if (!focusTarget) return;
      focusTarget.tabIndex = -1;
      focusTarget.focus();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div
        className="platform-shell"
        data-has-module={hasModuleNavigation}
      >
        <CapabilitySidebar />
        {hasModuleNavigation ? <ModuleNavigation /> : null}
        <div className="shell-stage">
          <CommandBar />
          <ActionAnnouncements />
          <main id="main-content" className="shell-main" tabIndex={-1}>
            {children}
          </main>
          <footer className="platform-provenance">
            Developed by <strong>V L &amp; CO</strong>
          </footer>
        </div>
      </div>
    </>
  );
}

export function PlatformShell({ children, initialSnapshot }: { children: ReactNode; initialSnapshot?: PlatformSnapshot }) {
  return (
    <PlatformProvider initialSnapshot={initialSnapshot}>
      <SubventionProvider>
        <TooltipProvider>
          <ShellFrame>{children}</ShellFrame>
          <GuidedDemoDrawer />
        </TooltipProvider>
      </SubventionProvider>
    </PlatformProvider>
  );
}
