"use client";

import Link from "next/link";
import { PLATFORM_MODULES, type PlatformSubmoduleDefinition } from "@smart-epp/domain";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePlatform } from "@/features/platform/store/PlatformProvider";
import { IntegrationSimulator } from "./IntegrationSimulator";

export const ADMIN_CONTROL_ROWS = [
  ["iam", "IAM permission and maker-checker separation apply to approvals.", "Profile and explicit-grant snapshot"],
  ["masters", "Master changes are effective-dated and versioned.", "Master-version evidence"],
  ["bre-engine", "Rule changes require approved configuration workflow.", "Rule-version evidence"],
  ["workflow-configuration", "Maker cannot approve own work.", "Workflow-version evidence"],
  ["integrations", "Explicit IAM CONFIGURE grant required for simulation.", "Seven fixed MOCK adapters"],
  ["audit-logs", "Audit events are evidence, not editable controls.", "Audit-event evidence"],
  ["platform-settings", "Configuration change approval is required by workflow.", "Platform configuration evidence"],
].map(([slug, approval, evidence]) => ({ slug, readOnly: "Read only", approval, evidence, lastChange: "No recorded change in demo snapshot" }));

const governance = Object.fromEntries(ADMIN_CONTROL_ROWS.map((row) => [row.slug, row]));

function ControlRow({ submodule }: { submodule: PlatformSubmoduleDefinition }) {
  const item = governance[submodule.slug]!;
  return <li className="admin-control-row"><div><Link href={`/admin/${submodule.slug}`}><strong>{submodule.label}</strong></Link><p>{submodule.description}</p></div><div><StatusBadge status="INFO" label={item.readOnly} /></div><div><span className="admin-label">Control</span><p>{item.approval}</p></div><div><span className="admin-label">Last change</span><p>{item.lastChange}</p><span className="admin-label">Evidence freshness</span><p>{item.evidence} · fixed demo snapshot</p></div><Link className="admin-drilldown" href={`/admin/${submodule.slug}`}>Open {submodule.label}</Link></li>;
}

export function AdminWorkspace({ submodule }: { submodule?: PlatformSubmoduleDefinition }) {
  const { snapshot } = usePlatform();
  if (submodule?.slug === "integrations") return <IntegrationSimulator />;
  const admin = PLATFORM_MODULES.find((module) => module.key === "ADMIN")!;
  if (submodule) return <section className="admin-workspace"><header className="page-heading"><div><span className="eyebrow">Administration control evidence</span><h1>{submodule.label}</h1><p>{governance[submodule.slug]!.approval}</p></div><StatusBadge status="INFO" label="Read only" /></header><p className="admin-evidence">Evidence freshness: {governance[submodule.slug]!.evidence}. Snapshot: {snapshot.generatedAt}.</p><Link className="admin-drilldown" href="/admin">Back to Admin controls</Link></section>;
  return <section className="admin-workspace" aria-labelledby="admin-title"><header className="page-heading"><div><span className="eyebrow">Platform administration</span><h1 id="admin-title">Admin controls</h1><p>All profiles may view control scope and source evidence. Configuration remains IAM-governed.</p></div><StatusBadge status="INFO" label="Read only overview" /></header><ol className="admin-control-list">{admin.submodules.map((item) => <ControlRow key={item.slug} submodule={item} />)}</ol></section>;
}
