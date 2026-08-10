"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { OperatingState, PlatformModuleDefinition, PlatformSnapshot, PlatformSubmoduleDefinition } from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import { StatusBadge, type SemanticStatus } from "@/components/shared/StatusBadge";
import type { RouteFilters } from "@/components/shared/RouteContractPage";

export type WorkspaceRecord = { id: string; title: string; context: string; owner: string; state: OperatingState | null; sourceStatus?: string; amountPaise: number; source: string };
export type WorkspaceView = { records: WorkspaceRecord[]; totalPaise: number; pending: number; filters: { q: string; status: OperatingState | "" } };

const statusTone: Record<OperatingState, SemanticStatus> = { HEALTHY: "APPROVED", PENDING: "ATTENTION", OVERDUE: "CRITICAL", REJECTED: "REJECTED", RECONCILED: "INFO" };
const first = <T,>(items: readonly T[], offset: number) => items.length ? [...items.slice(offset % items.length), ...items.slice(0, offset % items.length)] : [];

function sourceRecords(module: PlatformModuleDefinition, submodule: PlatformSubmoduleDefinition | undefined, snapshot: PlatformSnapshot): WorkspaceRecord[] {
  const key = submodule?.slug ?? "overview";
  const offset = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const labelled = (source: string, records: Array<Omit<WorkspaceRecord, "source">>) => records.map((record) => ({ ...record, context: `${record.context} · ${submodule?.label ?? module.label}`, source }));
  const employers = () => labelled("Employer programme master", first(snapshot.employers, offset).map((item) => ({ id: item.id, title: item.name, context: item.programmeId, owner: "relationship-manager", state: item.status, amountPaise: item.utilisedPaise })));
  const employees = () => labelled("Employer HRMS feed", first(snapshot.employees, offset).map((item) => ({ id: item.id, title: item.name, context: item.payrollId, owner: "hrms-operator", state: item.status, amountPaise: 0 })));
  const applications = () => labelled("Application register", first(snapshot.applications, offset).map((item) => ({ id: item.id, title: item.id.replace("application-", "Application "), context: `Reserved ${item.reservedPaise / 100}`, owner: "ops-lead", state: item.status, amountPaise: item.requestedPaise })));
  const assets = () => labelled("Asset and vendor registry", first(snapshot.assets, offset).map((item) => ({ id: item.id, title: `${item.oem} ${item.model}`, context: `${item.category} · ${item.serialNumber}`, owner: "vendor-operations", state: null, amountPaise: item.invoiceValuePaise })));
  const leases = (source = "Lease administration") => labelled(source, first(snapshot.leases, offset).map((item) => ({ id: item.id, title: item.id.replace("lease-", "Lease "), context: `${item.lotId} · ${item.tenureMonths} months`, owner: "portfolio-manager", state: item.status, amountPaise: item.rentalPaise * item.tenureMonths })));
  const work = () => labelled("Operational work queue", first(snapshot.workItems, offset).map((item) => ({ id: item.id, title: item.title, context: item.dueDate, owner: item.owner, state: item.state, amountPaise: item.financialImpactPaise })));
  const integrations = () => labelled("Integration adapter monitor", first(snapshot.integrations, offset).map((item) => ({ id: item.id, title: item.name, context: `${item.mode} · accepted ${item.accepted}`, owner: "platform-admin", state: null, sourceStatus: item.status, amountPaise: 0 })));
  const audits = () => labelled("Configuration and audit evidence", first(snapshot.auditEvents, offset).map((item) => ({ id: item.id, title: item.action.replaceAll("_", " "), context: `${item.entityType} · ${item.entityId}`, owner: item.actorId, state: null, amountPaise: 0 })));
  const profiles = () => labelled("IAM profile configuration", first(snapshot.profiles, offset).map((item) => ({ id: item.userId, title: item.userId, context: item.roleKeys.join(", "), owner: "platform-admin", state: null, amountPaise: 0 })));
  const aggregates = () => labelled("Portfolio and programme evidence", first(snapshot.employers, offset).map((item) => ({ id: `report-${item.id}`, title: `${item.name} portfolio`, context: `${snapshot.applications.filter((app) => app.employeeId.includes(item.id.split("-")[1] ?? "")).length} linked applications`, owner: "management-reporting", state: item.status, amountPaise: item.utilisedPaise })));

  switch (module.key) {
    case "COMMAND_CENTRE": return key === "integration-health" ? integrations() : key === "portfolio-health" || key === "exposure-utilisation" ? leases("Portfolio control evidence") : work();
    case "WORKBENCH": return work();
    case "EMPLOYER_PROGRAMMES": return employers();
    case "EMPLOYEES": return employees();
    case "APPLICATIONS_ELIGIBILITY": return applications();
    case "ASSETS_PARTNERS": return assets();
    case "ORDERS_APPROVALS": return key.includes("vendor") || key.includes("quotation") ? assets() : applications();
    case "LEASES_PORTFOLIO": return leases();
    case "BILLING_COLLECTIONS": return leases("Billing and collections ledger");
    case "SUBVENTION": return applications();
    case "FORECLOSURE": return leases("Foreclosure case register");
    case "DOCUMENTS_EVIDENCE": return key.includes("access") ? audits() : assets();
    case "EXCEPTIONS_RECONCILIATIONS": return key.includes("reconciliation") ? integrations() : work();
    case "REPORTS_MIS": return aggregates();
    case "ADMIN": return key === "iam" ? profiles() : key === "integrations" ? integrations() : audits();
  }
}

export function buildWorkspaceView(module: PlatformModuleDefinition, submodule: PlatformSubmoduleDefinition | undefined, snapshot: PlatformSnapshot, filters: RouteFilters): WorkspaceView {
  const q = typeof filters.q === "string" ? filters.q.trim().toLowerCase() : "";
  const candidate = typeof filters.status === "string" ? filters.status.trim().toUpperCase() : "";
  const status = ["HEALTHY", "PENDING", "OVERDUE", "REJECTED", "RECONCILED"].includes(candidate) ? candidate as OperatingState : "";
  const records = sourceRecords(module, submodule, snapshot).filter((record) => (!q || `${record.title} ${record.context} ${record.owner} ${record.id}`.toLowerCase().includes(q)) && (!status || record.state === status));
  return { records, totalPaise: records.reduce((sum, record) => sum + record.amountPaise, 0), pending: records.filter((record) => record.state === "PENDING" || record.state === "OVERDUE").length, filters: { q, status } };
}

export function ModuleWorkspace({ module, submodule, snapshot, filters }: { module: PlatformModuleDefinition; submodule?: PlatformSubmoduleDefinition; snapshot: PlatformSnapshot; filters: RouteFilters }) {
  const view = buildWorkspaceView(module, submodule, snapshot, filters);
  const [selected, setSelected] = useState<WorkspaceRecord | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDialogElement | null>(null);
  const path = `/${module.slug}${submodule ? `/${submodule.slug}` : ""}`;
  const close = () => { panel.current?.close(); setSelected(null); requestAnimationFrame(() => trigger.current?.focus()); };
  useEffect(() => { if (selected && panel.current && !panel.current.open) panel.current.showModal(); }, [selected]);
  const active = Number(Boolean(view.filters.q)) + Number(Boolean(view.filters.status));
  const title = submodule?.label ?? module.label;
  return <section className="operations-workbench" aria-labelledby="module-workspace-title">
    <header className="page-heading"><div><span className="eyebrow">{module.label} · connected operational snapshot</span><h1 id="module-workspace-title">{title}</h1><p>{submodule?.description ?? module.description}</p></div><div className="workspace-summary"><StatusBadge status="INFO" label="Read only" /><span>Source freshness: <strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.generatedAt))}</strong></span></div></header>
    <div className="signal-board" aria-label="Workspace totals"><div className="signal-grid">{[["Connected records", String(view.records.length), "Deterministic filtered snapshot"], ["Value in view", <Money key="money" paise={view.totalPaise} />, "Recorded operational amounts"], ["Needs attention", String(view.pending), "Pending or overdue records"], ["Evidence source", String(snapshot.auditEvents.length), "Auditable platform events"]].map(([label, value, detail]) => <div className="workspace-kpi" key={label as string}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}</div></div>
    <section className="operations-queue" aria-labelledby="workspace-register-title"><div className="workspace-heading"><div><span className="eyebrow">Operational register</span><h2 id="workspace-register-title">{title} records</h2></div><span className="ledger-count">{active ? `${active} active filter${active === 1 ? "" : "s"}` : "All records"}</span></div><form className="operations-toolbar" aria-label="Workspace filters" method="get"><label className="operations-search"><span className="sr-only">Find a record</span><input name="q" defaultValue={view.filters.q} placeholder="Find a record in this connected snapshot" /></label><label><span className="sr-only">Filter by operating state</span><select name="status" defaultValue={view.filters.status}><option value="">All operating states</option><option value="PENDING">Pending</option><option value="OVERDUE">Overdue</option><option value="HEALTHY">Healthy</option><option value="RECONCILED">Reconciled</option></select></label><div className="workspace-filter-actions"><button type="submit">Apply filters</button><Link href={path}>Reset</Link></div></form><div className="operations-table-scroll"><table><thead><tr><th>Record</th><th>Owner / context</th><th className="align-right">Recorded value</th><th>State</th><th><span className="sr-only">Inspector</span></th></tr></thead><tbody>{view.records.map((record) => <tr key={record.id}><td><div className="operations-primary-cell"><strong>{record.title}</strong><span>{record.id}</span></div></td><td>{record.owner}<br /><span className="text-muted">{record.context}</span></td><td className="align-right"><Money paise={record.amountPaise} /></td><td>{record.state ? <StatusBadge status={statusTone[record.state]} label={record.state} /> : <span>{record.sourceStatus ?? "Source evidence"}</span>}</td><td><button className="workspace-inspect-trigger" onClick={(event) => { trigger.current = event.currentTarget; setSelected(record); }} aria-label={`Inspect ${record.title}`}>Inspect</button></td></tr>)}</tbody></table>{view.records.length === 0 && <div className="operations-empty-state"><h3>No connected records match these filters</h3><p>Clear a filter to restore the full deterministic snapshot.</p></div>}</div></section>
    {selected && <dialog className="workspace-inspector-panel" aria-label={`${selected.title} inspector`} ref={panel} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { setSelected(null); requestAnimationFrame(() => trigger.current?.focus()); }}><header><div><span className="eyebrow">Contextual inspector</span><h2>{selected.title}</h2></div><button onClick={close} aria-label="Close inspector">Close</button></header><dl><div><dt>Record</dt><dd>{selected.id}</dd></div><div><dt>Owner</dt><dd>{selected.owner}</dd></div><div><dt>Context</dt><dd>{selected.context}</dd></div><div><dt>Provenance</dt><dd>{selected.source}</dd></div><div><dt>Snapshot</dt><dd>{snapshot.generatedAt}</dd></div></dl></dialog>}
  </section>;
}
