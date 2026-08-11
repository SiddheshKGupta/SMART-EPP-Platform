"use client";

import Link from "next/link";
import { PLATFORM_MODULES, type PlatformSubmoduleDefinition } from "@smart-epp/domain";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePlatform } from "@/features/platform/store/PlatformProvider";
import { IntegrationSimulator } from "./IntegrationSimulator";

const governance: Record<string, { state: string; approval: string; evidence: string }> = {
  iam: { state: "Configuration controlled", approval: "IAM permission and maker-checker separation apply to approvals.", evidence: "Profile and explicit-grant snapshot" },
  masters: { state: "Configuration controlled", approval: "Master changes are effective-dated and versioned.", evidence: "No new changes in fixed demo snapshot" },
  "bre-engine": { state: "Configuration controlled", approval: "Rule changes require approved configuration workflow.", evidence: "No new rule version in fixed demo snapshot" },
  "workflow-configuration": { state: "Configuration controlled", approval: "Maker cannot approve own work.", evidence: "No new workflow version in fixed demo snapshot" },
  integrations: { state: "Demo configuration", approval: "Explicit IAM CONFIGURE grant required for simulation.", evidence: "Seven fixed MOCK adapters; fixed snapshot" },
  "audit-logs": { state: "Read only", approval: "Audit events are evidence, not editable controls.", evidence: "Fixed snapshot plus local demo events" },
  "platform-settings": { state: "Configuration controlled", approval: "Configuration change approval is required by workflow.", evidence: "No new changes in fixed demo snapshot" },
};

function ControlRow({ submodule }: { submodule: PlatformSubmoduleDefinition }) {
  const item = governance[submodule.slug]!;
  return <li className="admin-control-row"><div><Link href={`/admin/${submodule.slug}`}><strong>{submodule.label}</strong></Link><p>{submodule.description}</p></div><div><StatusBadge status="INFO" label={item.state} /></div><div><span className="admin-label">Control</span><p>{item.approval}</p></div><div><span className="admin-label">Evidence freshness</span><p>{item.evidence}</p></div><Link className="admin-drilldown" href={`/admin/${submodule.slug}`}>Open {submodule.label}</Link></li>;
}

export function AdminWorkspace({ submodule }: { submodule?: PlatformSubmoduleDefinition }) {
  const { snapshot } = usePlatform();
  if (submodule?.slug === "integrations") return <IntegrationSimulator />;
  const admin = PLATFORM_MODULES.find((module) => module.key === "ADMIN")!;
  if (submodule) return <section className="admin-workspace"><header className="page-heading"><div><span className="eyebrow">Administration control evidence</span><h1>{submodule.label}</h1><p>{governance[submodule.slug]!.approval}</p></div><StatusBadge status="INFO" label="Read only" /></header><p className="admin-evidence">Evidence freshness: {governance[submodule.slug]!.evidence}. Snapshot: {snapshot.generatedAt}.</p><Link className="admin-drilldown" href="/admin">Back to Admin controls</Link></section>;
  return <section className="admin-workspace" aria-labelledby="admin-title"><header className="page-heading"><div><span className="eyebrow">Platform administration</span><h1 id="admin-title">Admin controls</h1><p>All profiles may view control scope and source evidence. Configuration remains IAM-governed.</p></div><StatusBadge status="INFO" label="Read only overview" /></header><ol className="admin-control-list">{admin.submodules.map((item) => <ControlRow key={item.slug} submodule={item} />)}</ol></section>;
}
