"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { OperatingState, PlatformModuleDefinition, PlatformSnapshot, PlatformSubmoduleDefinition } from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import { StatusBadge, type SemanticStatus } from "@/components/shared/StatusBadge";

type CapabilityRow = {
  id: string;
  title: string;
  reference: string;
  owner: string;
  state: OperatingState | null;
  amountPaise: number;
  evidence: string;
};

type CapabilityPresentation = {
  eyebrow: string;
  register: string;
  source: string;
  stages: readonly string[];
  rows: CapabilityRow[];
};

const tone: Record<OperatingState, SemanticStatus> = {
  HEALTHY: "APPROVED",
  PENDING: "ATTENTION",
  OVERDUE: "CRITICAL",
  REJECTED: "REJECTED",
  RECONCILED: "INFO",
};

const titleCase = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());

function presentationFor(module: PlatformModuleDefinition, submodule: PlatformSubmoduleDefinition | undefined, snapshot: PlatformSnapshot): CapabilityPresentation {
  const focus = titleCase(submodule?.slug ?? "overview");
  const common = { eyebrow: `${module.label} · ${focus}`, source: "SMART EPP connected demo snapshot" };

  switch (module.key) {
    case "ASSETS_PARTNERS":
      return { ...common, register: "Asset, product and partner register", stages: ["Partner master", "Catalogue", "Identification", "Ownership"], rows: snapshot.assets.map((item) => ({ id: item.id, title: `${item.oem} ${item.model}`, reference: `${item.category} · ${item.serialNumber}`, owner: "vendor-operations", state: null, amountPaise: item.invoiceValuePaise, evidence: "Asset and vendor registry" })) };
    case "ORDERS_APPROVALS":
      return { ...common, register: "Order execution register", stages: ["Quotation", "Approval", "Fulfilment", "Lease handoff"], rows: snapshot.applications.map((item) => ({ id: `order-${item.id}`, title: `Order for ${item.id.replace("application-", "Application ")}`, reference: `${focus} · Employee ${item.employeeId}`, owner: "order-operations", state: item.status, amountPaise: item.requestedPaise, evidence: "Application-to-order handoff" })) };
    case "LEASES_PORTFOLIO":
      return { ...common, register: "Lease and lot register", stages: ["Handoff", "Activation", "Schedule", "Reconciliation"], rows: snapshot.leases.map((item) => ({ id: item.id, title: item.id.replace("lease-", "Lease "), reference: `${item.lotId} · ${item.tenureMonths} months`, owner: "portfolio-operations", state: item.status, amountPaise: item.rentalPaise * item.tenureMonths, evidence: "Lease administration snapshot" })) };
    case "BILLING_COLLECTIONS":
      return { ...common, register: "Billing and collection ledger", stages: ["Schedule", "Invoice", "Receipt", "Allocation"], rows: snapshot.leases.map((item) => ({ id: `billing-${item.id}`, title: `Billing for ${item.id}`, reference: `${focus} · Monthly rental`, owner: "billing-operations", state: item.status, amountPaise: item.rentalPaise, evidence: "Lease rental schedule" })) };
    case "SUBVENTION":
      return { ...common, register: "Subvention claim and settlement register", stages: ["Eligibility", "Claim", "OEM response", "Settlement"], rows: snapshot.applications.map((item) => ({ id: `subvention-${item.id}`, title: `Subvention claim · ${item.id}`, reference: `${focus} · Employee ${item.employeeId}`, owner: "subvention-operations", state: item.status, amountPaise: item.reservedPaise, evidence: "Application and scheme eligibility evidence" })) };
    case "FORECLOSURE":
      return { ...common, register: "Foreclosure case register", stages: ["Intake", "Computation", "Settlement", "Closure"], rows: snapshot.leases.map((item) => ({ id: `fc-${item.id}`, title: `Foreclosure case · ${item.id}`, reference: `${focus} · ${item.lotId}`, owner: "foreclosure-operations", state: item.status, amountPaise: item.rentalPaise * Math.min(item.tenureMonths, 6), evidence: "Lease and settlement evidence" })) };
    case "DOCUMENTS_EVIDENCE":
      return { ...common, register: "Document and evidence register", stages: ["Capture", "Verify", "Version", "Archive"], rows: snapshot.auditEvents.map((item) => ({ id: `document-${item.id}`, title: titleCase(item.action), reference: `${item.entityType} · ${item.entityId}`, owner: item.actorId, state: null, amountPaise: 0, evidence: `${item.outcome} · ${item.reason}` })) };
    case "EXCEPTIONS_RECONCILIATIONS":
      return { ...common, register: "Exception and reconciliation register", stages: ["Detect", "Assign", "Remediate", "Close"], rows: snapshot.exceptions.map((item) => ({ id: item.id, title: `${titleCase(item.scenario)} exception`, reference: `${item.sourceRecordType} · ${item.sourceRecordId}`, owner: snapshot.workItems.find((work) => work.id === item.workItemId)?.owner ?? "exception-control", state: item.operatingState, amountPaise: snapshot.workItems.find((work) => work.id === item.workItemId)?.financialImpactPaise ?? 0, evidence: `Recovery · ${item.recoveryState}` })) };
    case "REPORTS_MIS":
      return { ...common, register: "Management reporting evidence", stages: ["Source", "Reconcile", "Publish", "Export"], rows: snapshot.employers.map((item) => ({ id: `report-${item.id}`, title: `${item.name} · ${focus}`, reference: `${item.programmeId} · ${item.programmeStage}`, owner: "management-reporting", state: item.status, amountPaise: item.utilisedPaise, evidence: "Employer programme portfolio" })) };
    default:
      return { ...common, register: `${module.label} register`, stages: ["Intake", "Review", "Decision", "Complete"], rows: snapshot.workItems.map((item) => ({ id: item.id, title: item.title, reference: item.dueDate, owner: item.owner, state: item.state, amountPaise: item.financialImpactPaise, evidence: "Operational work queue" })) };
  }
}

export function CapabilityOperationsWorkspace({ module, submodule, snapshot }: { module: PlatformModuleDefinition; submodule?: PlatformSubmoduleDefinition; snapshot: PlatformSnapshot }) {
  const view = presentationFor(module, submodule, snapshot);
  const [selected, setSelected] = useState<CapabilityRow | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (selected && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [selected]);
  const close = () => { dialog.current?.close(); setSelected(null); requestAnimationFrame(() => trigger.current?.focus()); };
  const needsAttention = view.rows.filter((row) => row.state === "PENDING" || row.state === "OVERDUE").length;
  const totalPaise = view.rows.reduce((sum, row) => sum + row.amountPaise, 0);
  const title = submodule?.label ?? module.label;

  return <section className="operations-workbench" aria-labelledby="capability-title">
    <header className="page-heading"><div><span className="eyebrow">{view.eyebrow}</span><h1 id="capability-title">{title}</h1><p>{submodule?.description ?? module.description}</p></div><div className="workspace-summary"><StatusBadge status="INFO" label="Connected demo" /><span>Freshness: <strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.generatedAt))}</strong></span></div></header>
    <nav className="journey-step-list" aria-label={`${module.label} workflow`}>{view.stages.map((stage, index) => <span key={stage} className={index === Math.min(view.stages.length - 1, Math.max(0, module.submodules.findIndex((item) => item.slug === submodule?.slug) % view.stages.length)) ? "is-current" : ""}><small>0{index + 1}</small>{stage}</span>)}</nav>
    <div className="signal-board" aria-label={`${title} indicators`}><div className="signal-grid"><div className="workspace-kpi"><span>Connected records</span><strong>{view.rows.length}</strong><small>{view.source}</small></div><div className="workspace-kpi"><span>Value in view</span><strong><Money paise={totalPaise} /></strong><small>Exact recorded demo amounts</small></div><div className="workspace-kpi"><span>Needs attention</span><strong>{needsAttention}</strong><small>Pending or overdue evidence</small></div><div className="workspace-kpi"><span>Audit events</span><strong>{snapshot.auditEvents.length}</strong><small>Evidence available for drill-down</small></div></div></div>
    <section className="operations-queue" aria-labelledby="capability-register-title"><div className="workspace-heading"><div><span className="eyebrow">Operational workspace</span><h2 id="capability-register-title">{view.register}</h2></div><Link href={`/workbench/team-queues?q=${encodeURIComponent(submodule?.slug ?? module.slug)}`}>Open related work queue</Link></div><div className="operations-table-scroll"><table><thead><tr><th>Record</th><th>Reference / owner</th><th className="align-right">Recorded value</th><th>State</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{view.rows.map((row) => <tr key={row.id}><td><div className="operations-primary-cell"><strong>{row.title}</strong><span>{row.id}</span></div></td><td>{row.reference}<br /><span className="text-muted">{row.owner}</span></td><td className="align-right"><Money paise={row.amountPaise} /></td><td>{row.state ? <StatusBadge status={tone[row.state]} label={row.state} /> : <StatusBadge status="INFO" label="EVIDENCE" />}</td><td><button className="workspace-inspect-trigger" onClick={(event) => { trigger.current = event.currentTarget; setSelected(row); }}>Inspect</button></td></tr>)}</tbody></table></div></section>
    {selected && <dialog ref={dialog} className="workspace-inspector-panel" aria-label={`${selected.title} inspector`} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { setSelected(null); requestAnimationFrame(() => trigger.current?.focus()); }}><header><div><span className="eyebrow">Connected evidence</span><h2>{selected.title}</h2></div><button onClick={close}>Close</button></header><dl><div><dt>Record ID</dt><dd>{selected.id}</dd></div><div><dt>Owner</dt><dd>{selected.owner}</dd></div><div><dt>Reference</dt><dd>{selected.reference}</dd></div><div><dt>Evidence</dt><dd>{selected.evidence}</dd></div><div><dt>Snapshot</dt><dd>{snapshot.generatedAt}</dd></div></dl><Link href={`/workbench/team-queues?q=${encodeURIComponent(selected.id)}`}>Open related operational work</Link></dialog>}
  </section>;
}
