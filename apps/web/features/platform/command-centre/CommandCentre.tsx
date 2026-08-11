"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import type { PlatformSnapshot, WorkItem } from "@smart-epp/domain";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePlatform } from "@/features/platform/store/PlatformProvider";

export type CentreMetric = {
  label: string;
  meaning: string;
  formula: string;
  unit: "Records" | "INR";
  source: string;
  freshness: string;
  filters: string;
  breakdown: string[];
  drilldown: string;
  owner: string;
  access: string;
  reconciliation: string;
  exception: string;
  value: number;
  valuePaise?: number;
};

export const formatIndianAggregate = (paise: number) => {
  const rupees = paise / 100;
  if (Math.abs(rupees) >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(rupees) >= 100_000) return `₹${(rupees / 100_000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(rupees);
};

export function nextTabIndex(current: number, key: string, count: number): number {
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return current;
}

export function buildCommandCentreMetrics(snapshot: PlatformSnapshot) {
  const queue = (key: WorkItem["queueKeys"][number]) => snapshot.workItems.filter((item) => item.queueKeys.includes(key));
  const team = queue("TEAM_QUEUES");
  const overdue = team.filter((item) => item.state === "OVERDUE");
  const approvals = queue("MY_APPROVALS");
  const alerts = queue("MY_EXCEPTIONS");
  const sanction = snapshot.employers.reduce((sum, item) => sum + item.sanctionPaise, 0);
  const utilised = snapshot.employers.reduce((sum, item) => sum + item.utilisedPaise, 0);
  const exposure = snapshot.leases.reduce((sum, item) => sum + item.rentalPaise * item.tenureMonths, 0);
  const common = { freshness: snapshot.generatedAt, access: "All authenticated employees have read access." };
  const countMetric = (input: Omit<CentreMetric, "unit" | "freshness" | "access" | "value"> & { items: WorkItem[] }): CentreMetric => ({ ...input, ...common, unit: "Records", value: input.items.length });
  const moneyMetric = (input: Omit<CentreMetric, "unit" | "freshness" | "access" | "value" | "valuePaise"> & { valuePaise: number }): CentreMetric => ({ ...input, ...common, unit: "INR", value: input.valuePaise, valuePaise: input.valuePaise });
  return {
    operations: {
      workItems: countMetric({ label: "Open work queue", meaning: "All records classified into the team operating queue.", formula: "Count of work items with TEAM_QUEUES provenance.", source: "PlatformSnapshot.workItems.queueKeys", filters: "Queue classification: Team Queues; all states.", breakdown: ["All source-backed team work"], drilldown: "/workbench?queue=team-queues", owner: "Operations control", reconciliation: `${team.length} headline records = ${team.length} destination rows.`, exception: "No exception applied." , items: team }),
      overdue: countMetric({ label: "Overdue items", meaning: "Team queue records beyond their due control state.", formula: "Count of TEAM_QUEUES work items where state = OVERDUE.", source: "PlatformSnapshot.workItems.queueKeys + state", filters: "Queue classification: Team Queues; state: OVERDUE.", breakdown: overdue.map((item) => item.id), drilldown: "/workbench?queue=team-queues&status=OVERDUE", owner: "Operations control", reconciliation: `${overdue.length} headline records = ${overdue.length} destination rows.`, exception: "Overdue status is an explicit control state.", items: overdue }),
      approvals: countMetric({ label: "Pending approvals", meaning: "Records explicitly requesting approval.", formula: "Count of work items with MY_APPROVALS provenance and requestedAction = APPROVE.", source: "PlatformSnapshot.workItems.queueKeys + requestedAction", filters: "Queue classification: My Approvals; requested action: APPROVE.", breakdown: approvals.map((item) => item.id), drilldown: "/workbench?queue=my-approvals", owner: "Approval control", reconciliation: `${approvals.length} headline records = ${approvals.length} destination rows.`, exception: "IAM and maker-checker are evaluated per destination row.", items: approvals }),
      alerts: countMetric({ label: "Control alerts", meaning: "Explicit exception-queue records requiring control attention.", formula: "Count of work items with MY_EXCEPTIONS provenance.", source: "PlatformSnapshot.workItems.queueKeys", filters: "Queue classification: My Exceptions; all explicit exception states.", breakdown: alerts.map((item) => `${item.state}: ${item.id}`), drilldown: "/workbench?queue=my-exceptions", owner: "Control assurance", reconciliation: `${alerts.length} headline records = ${alerts.length} destination rows.`, exception: "This metric is itself the explicit exception population.", items: alerts }),
    },
    executive: {
      health: { ...common, label: "Portfolio health", meaning: "Lease records in an explicit healthy operating state.", formula: "Count of leases where status = HEALTHY.", unit: "Records" as const, source: "PlatformSnapshot.leases.status", filters: "Registered Lease Register; status: HEALTHY.", breakdown: snapshot.leases.filter((item) => item.status === "HEALTHY").map((item) => item.id), drilldown: "/portfolio/leases?status=HEALTHY", owner: "Portfolio management", reconciliation: "Headline count equals filtered Lease Register rows.", exception: "No inferred health score; explicit status only.", value: snapshot.leases.filter((item) => item.status === "HEALTHY").length },
      sanction: moneyMetric({ label: "Sanction", meaning: "Approved employer programme sanction exposure.", formula: "Sum of employer sanctionPaise.", source: "PlatformSnapshot.employers.sanctionPaise", filters: "All employer programmes in the fixed snapshot.", breakdown: snapshot.employers.map((item) => `${item.programmeId}: ${formatIndianAggregate(item.sanctionPaise)}`), drilldown: "/portfolio/sanction-utilisation", owner: "Portfolio management", reconciliation: "Headline INR equals the destination sanction column total.", exception: "No currency conversion or comparison applied.", valuePaise: sanction }),
      utilised: moneyMetric({ label: "Exposure and utilisation", meaning: "Employer programme sanction currently utilised.", formula: "Sum of employer utilisedPaise.", source: "PlatformSnapshot.employers.utilisedPaise", filters: "All employer programmes in the fixed snapshot.", breakdown: snapshot.employers.map((item) => `${item.programmeId}: ${formatIndianAggregate(item.utilisedPaise)}`), drilldown: "/portfolio/sanction-utilisation", owner: "Portfolio management", reconciliation: "Headline INR equals the destination utilised column total.", exception: "No target or utilisation trend applied.", valuePaise: utilised }),
      exposure: moneyMetric({ label: "Financial exposure", meaning: "Contractual lease rentals across the registered portfolio.", formula: "Sum of rentalPaise × tenureMonths for every lease.", source: "PlatformSnapshot.leases", filters: "Registered Lease Register; all states.", breakdown: snapshot.leases.map((item) => item.id), drilldown: "/portfolio/leases", owner: "Finance control", reconciliation: "Headline INR equals the Lease Register recorded-value total.", exception: "Residual value is excluded from this stated formula.", valuePaise: exposure }),
      pipeline: { ...common, label: "Programme pipeline", meaning: "Employer programmes grouped by their explicit delivery stage.", formula: "Count of employer programme records by programmeStage.", unit: "Records" as const, source: "PlatformSnapshot.employers.programmeStage", filters: "All employer programme stages in the fixed snapshot.", breakdown: (["ACTIVE", "IMPLEMENTATION", "ONBOARDING"] as const).map((stage) => `${stage}: ${snapshot.employers.filter((item) => item.programmeStage === stage).length}`), drilldown: "/programmes", owner: "Programme management", reconciliation: "Headline count equals Employer Programmes rows; breakdown sums to headline.", exception: "Stages are explicit synthetic provenance, not inferred from status.", value: snapshot.employers.length },
    },
  };
}

function Metric({ metric }: { metric: CentreMetric }) {
  return <article className="command-metric"><Link href={metric.drilldown}><span>{metric.label}</span><strong>{metric.valuePaise === undefined ? metric.value : formatIndianAggregate(metric.valuePaise)}</strong></Link><details><summary>Metric evidence</summary><dl>{[
    ["Meaning", metric.meaning], ["Formula", metric.formula], ["Unit", metric.unit], ["Source", metric.source], ["Freshness", metric.freshness], ["Filters", metric.filters], ["Breakdown", metric.breakdown.join("; ")], ["Owner", metric.owner], ["Access", metric.access], ["Reconciliation", metric.reconciliation], ["Exception", metric.exception],
  ].map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}<div><dt>Drill-down</dt><dd><Link href={metric.drilldown}>Open reconciling evidence</Link></dd></div></dl></details></article>;
}

export function CommandCentre() {
  const { snapshot } = usePlatform();
  const [lens, setLens] = useState<"operations" | "executive">("operations");
  const metrics = buildCommandCentreMetrics(snapshot);
  const lenses = ["operations", "executive"] as const;
  const selected = lens === "operations" ? Object.values(metrics.operations) : Object.values(metrics.executive);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => { const next = nextTabIndex(index, event.key, lenses.length); if (next !== index || ["Home", "End"].includes(event.key)) { event.preventDefault(); const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role=tab]"); setLens(lenses[next]!); requestAnimationFrame(() => tabs?.[next]?.focus()); } };
  return <section className="command-centre" aria-labelledby="command-centre-title"><header className="page-heading"><div><span className="eyebrow">Fixed operating snapshot</span><h1 id="command-centre-title">Command Centre</h1><p>Snapshot period ending {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.generatedAt))}. No target, trend, or comparison is implied.</p></div><StatusBadge status="INFO" label="Source-backed snapshot" /></header><div role="tablist" aria-label="Command Centre lenses" className="command-tabs">{lenses.map((item, index) => <button key={item} id={`command-tab-${item}`} role="tab" aria-selected={lens === item} aria-controls={`command-panel-${item}`} tabIndex={lens === item ? 0 : -1} onClick={() => setLens(item)} onKeyDown={(event) => onKeyDown(event, index)}>{item === "operations" ? "Operations" : "Executive"}</button>)}</div><div id={`command-panel-${lens}`} role="tabpanel" aria-labelledby={`command-tab-${lens}`} className="command-metric-grid">{selected.map((metric) => <Metric key={metric.label} metric={metric} />)}</div><p className="command-freshness">Freshness: generated {snapshot.generatedAt}; every headline links to its registered reconciling evidence.</p></section>;
}
