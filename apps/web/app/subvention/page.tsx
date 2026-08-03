"use client";

import { ArrowRight, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_NOW } from "@/features/subvention/data/seed";
import { ManagementOverview } from "@/features/subvention/management/ManagementOverview";
import { financialRecordsFromSnapshot } from "@/features/subvention/management/managementReadModel";
import { OperationsWorkbench } from "@/features/subvention/operations/OperationsWorkbench";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";

function roleLabel(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function roleFocus(role: string) {
  if (role === "MANAGEMENT_VIEWER") {
    return {
      title: "Management view",
      detail: "Financial position, claim movement and counterparty dues are prioritised below.",
      href: "#management-position",
      action: "Review financial position",
    };
  }
  if (role === "MASTER_DATA_ADMIN") {
    return {
      title: "Master data controls",
      detail: "Maintain the reference data that governs programme and claim decisions.",
      href: "/subvention/masters",
      action: "Open master data",
    };
  }
  return {
    title: "Operations view",
    detail: "Review exceptions, confirm evidence and move clear transactions into claims.",
    href: "#operations-position",
    action: "Open today’s queue",
  };
}

export default function Page() {
  const { activeActor, snapshot } = useSubvention();
  const focus = roleFocus(activeActor.role);
  const managementRecords = financialRecordsFromSnapshot(snapshot);

  return (
    <div className="subvention-landing">
      <header className="subvention-product-header">
        <div>
          <span className="eyebrow">Smart EPP · Subvention</span>
          <h1>Subvention Control Centre</h1>
          <p>
            One controlled view from purchase evidence and eligibility through claim,
            recovery and accounting closure.
          </p>
        </div>
        <aside className="subvention-role-cue" aria-label="Current workspace focus">
          <ShieldCheck aria-hidden />
          <div>
            <span>{roleLabel(activeActor.role)}</span>
            <strong>{focus.title}</strong>
            <p>{focus.detail}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={focus.href}>
              {focus.action}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </aside>
      </header>

      <div id="management-position" className="subvention-landing-section">
        <Suspense fallback={<div className="subvention-section-loading">Loading financial position…</div>}>
          <ManagementOverview
            records={managementRecords}
            businessDate={DEMO_NOW.slice(0, 10)}
          />
        </Suspense>
      </div>

      <div className="subvention-section-divider" aria-hidden="true" />

      <section id="operations-position" className="subvention-landing-section" aria-label="Operations overview">
        <div className="subvention-section-intro">
          <div>
            <span className="eyebrow">Daily processing</span>
            <h2>Operations position</h2>
            <p>System validation runs first. Operations concentrates on exceptions and next actions.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/subvention/operations">
              Open dedicated workbench
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <OperationsWorkbench />
      </section>

      <aside className="subvention-governance-note">
        <Database aria-hidden />
        <p>
          Metrics and queues use persisted control records. Preview calculations are never
          included in management totals.
        </p>
      </aside>
    </div>
  );
}
