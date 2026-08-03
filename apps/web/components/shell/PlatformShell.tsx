"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";
import { SubventionProvider } from "@/features/subvention/store/SubventionProvider";
import { CommandBar } from "./CommandBar";
import { GlobalRail } from "./GlobalRail";
import { ModuleNavigation } from "./ModuleNavigation";

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
  const hasModuleNavigation = pathname.startsWith("/subvention");

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
        <GlobalRail />
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

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <SubventionProvider>
      <TooltipProvider>
        <ShellFrame>{children}</ShellFrame>
      </TooltipProvider>
    </SubventionProvider>
  );
}
