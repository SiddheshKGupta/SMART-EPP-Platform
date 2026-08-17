"use client";

import Link from "next/link";
import { useState } from "react";
import {
  evaluateAccess,
  type AccessProfile,
  type OperatingState,
  type PlatformAction,
  type PlatformModuleDefinition,
  type PlatformSnapshot,
  type PlatformSubmoduleDefinition,
} from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import type { RouteFilters } from "@/components/shared/RouteContractPage";

type OriginationDomain = "PROGRAMME" | "EMPLOYEE" | "APPLICATION";
type OriginationRow = {
  id: string;
  title: string;
  reference: string;
  relationship: string;
  detail: string;
  valuePaise: number | null;
  state: OperatingState;
  source: string;
  freshness: string;
  audit: string;
  actionHref?: string;
};

export type OriginationWorkspaceModel = {
  domain: OriginationDomain;
  activeStageSlug: string;
  title: string;
  rows: OriginationRow[];
  totalRows: number;
  attentionRows: number;
  valuePaise: number;
  filters: { q: string; status: OperatingState | "" };
  action: { key: PlatformAction; label: string; allowed: boolean; reason: string };
};

const states: OperatingState[] = ["HEALTHY", "PENDING", "OVERDUE", "REJECTED", "RECONCILED"];
const tone: Record<OperatingState, { icon: string; label: string; className: string }> = {
  HEALTHY: { icon: "✓", label: "Healthy", className: "is-positive" },
  PENDING: { icon: "…", label: "Pending", className: "is-attention" },
  OVERDUE: { icon: "!", label: "Overdue", className: "is-critical" },
  REJECTED: { icon: "×", label: "Rejected", className: "is-critical" },
  RECONCILED: { icon: "↻", label: "Reconciled", className: "is-info" },
};

const moduleDomain = (module: PlatformModuleDefinition): OriginationDomain => {
  if (module.key === "EMPLOYER_PROGRAMMES") return "PROGRAMME";
  if (module.key === "EMPLOYEES") return "EMPLOYEE";
  return "APPLICATION";
};

const actionFor = (domain: OriginationDomain, slug: string): { key: PlatformAction; label: string } => {
  if (["leads", "enrolment", "new"].includes(slug)) return { key: "CREATE", label: "Create controlled draft" };
  if (slug === "approval-routing") return { key: "APPROVE", label: "Open approval action" };
  if (["credit-handoff", "uat-go-live", "exposure-reservation", "reservation-lifecycle"].includes(slug)) return { key: "SUBMIT", label: "Submit to next control" };
  return { key: "EDIT", label: `Prepare ${domain.toLowerCase()} change` };
};

const directAudit = (snapshot: PlatformSnapshot, entityType: string, id: string): string => {
  const event = [...snapshot.auditEvents].reverse().find((candidate) => candidate.entityType === entityType && candidate.entityId === id);
  return event ? `${event.action.replaceAll("_", " ")} · ${event.outcome} · ${event.actorId}` : "No direct audit event in this connected snapshot";
};

export function buildOriginationWorkspaceModel(
  module: PlatformModuleDefinition,
  submodule: PlatformSubmoduleDefinition | undefined,
  snapshot: PlatformSnapshot,
  routeFilters: RouteFilters,
  profile: AccessProfile,
): OriginationWorkspaceModel {
  const domain = moduleDomain(module);
  const slug = submodule?.slug ?? module.submodules[0]?.slug ?? "overview";
  const q = typeof routeFilters.q === "string" ? routeFilters.q.trim().toLowerCase() : "";
  const candidate = typeof routeFilters.status === "string" ? routeFilters.status.trim().toUpperCase() : "";
  const status = states.includes(candidate as OperatingState) ? candidate as OperatingState : "";
  const employers = new Map(snapshot.employers.map((item) => [item.id, item]));
  const employees = new Map(snapshot.employees.map((item) => [item.id, item]));
  const assets = new Map(snapshot.assets.map((item) => [item.id, item]));

  const allRows: OriginationRow[] = domain === "PROGRAMME"
    ? snapshot.employers.map((item) => ({
      id: item.id, title: item.name, reference: item.programmeId,
      relationship: item.programmeStage, detail: `Sanction ₹${new Intl.NumberFormat("en-IN").format(item.sanctionPaise / 100)}`,
      valuePaise: item.utilisedPaise, state: item.status, source: "Employer programme master", freshness: snapshot.generatedAt,
      audit: directAudit(snapshot, "Employer", item.id),
      actionHref: snapshot.workItems.find((work) => work.module === module.key && work.employerId === item.id)?.href,
    }))
    : domain === "EMPLOYEE"
      ? snapshot.employees.map((item) => ({
        id: item.id, title: item.name, reference: item.payrollId,
        relationship: employers.get(item.employerId)?.name ?? item.employerId, detail: "Employer HRMS feed",
        valuePaise: null, state: item.status, source: "Employer HRMS feed", freshness: snapshot.generatedAt,
        audit: directAudit(snapshot, "Employee", item.id),
        actionHref: snapshot.workItems.find((work) => work.module === module.key && work.employerId === item.employerId)?.href,
      }))
      : snapshot.applications.map((item) => {
        const employee = employees.get(item.employeeId);
        const asset = assets.get(item.assetId);
        return {
          id: item.id, title: item.id.replace("application-", "Application "), reference: employee?.name ?? item.employeeId,
          relationship: `${asset?.oem ?? "Asset"} ${asset?.model ?? item.assetId}`, detail: `Reserved ₹${new Intl.NumberFormat("en-IN").format(item.reservedPaise / 100)}`,
          valuePaise: item.requestedPaise, state: item.status, source: "Application register", freshness: snapshot.generatedAt,
          audit: directAudit(snapshot, "Application", item.id),
          actionHref: snapshot.workItems.find((work) => work.module === module.key && work.href.includes(item.id))?.href,
        };
      });

  const rows = allRows.filter((row) => (!q || `${row.id} ${row.title} ${row.reference} ${row.relationship}`.toLowerCase().includes(q)) && (!status || row.state === status));
  const desiredAction = actionFor(domain, slug);
  const access = evaluateAccess({ profile, module: module.key, action: desiredAction.key });
  return {
    domain,
    activeStageSlug: slug,
    title: submodule?.label ?? module.label,
    rows,
    totalRows: allRows.length,
    attentionRows: rows.filter((row) => row.state === "PENDING" || row.state === "OVERDUE").length,
    valuePaise: rows.reduce((sum, row) => sum + (row.valuePaise ?? 0), 0),
    filters: { q, status },
    action: { ...desiredAction, allowed: access.allowed, reason: access.reason },
  };
}

function StateMark({ state }: { state: OperatingState }) {
  const item = tone[state];
  return <span className={`origination-state ${item.className}`}><span aria-hidden="true">{item.icon}</span>{item.label}</span>;
}

export function OriginationWorkspace({ module, submodule, snapshot, filters, profile }: {
  module: PlatformModuleDefinition;
  submodule?: PlatformSubmoduleDefinition;
  snapshot: PlatformSnapshot;
  filters: RouteFilters;
  profile: AccessProfile;
}) {
  const model = buildOriginationWorkspaceModel(module, submodule, snapshot, filters, profile);
  const [selectedId, setSelectedId] = useState(model.rows[0]?.id ?? "");
  const effectiveSelectedId = model.rows.some((row) => row.id === selectedId) ? selectedId : (model.rows[0]?.id ?? "");
  const selected = model.rows.find((row) => row.id === effectiveSelectedId) ?? model.rows[0];
  const basePath = `/${module.slug}`;
  const linkedAction = selected?.actionHref && model.action.allowed;

  return <section className="origination-workspace" aria-labelledby="origination-title">
    <header className="origination-header">
      <div><span className="eyebrow">Origination control room · {module.label}</span><h1 id="origination-title">{model.title}</h1><p>{submodule?.description ?? module.description}</p></div>
      <div className="origination-context"><span className="origination-readonly"><span aria-hidden="true">◉</span> Read-only baseline</span><span>Role: <strong>{profile.roleKeys.join(" + ")}</strong></span><span>Freshness: <strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.generatedAt))}</strong></span></div>
    </header>

    <nav className="origination-stage-rail" aria-label={`${module.label} workflow stages`}>
      {module.submodules.map((stage, index) => <Link key={stage.slug} href={`${basePath}/${stage.slug}`} aria-current={stage.slug === model.activeStageSlug ? "page" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{stage.label}</Link>)}
    </nav>

    <div className="origination-signals" aria-label="Connected register signals">
      <a href="#origination-register"><span>Connected records</span><strong>{model.rows.length}</strong><small>{model.totalRows} in source register</small></a>
      <a href="#origination-register"><span>Needs attention</span><strong>{model.attentionRows}</strong><small>Pending or overdue</small></a>
      <a href="#origination-register"><span>Value in view</span><strong><Money paise={model.valuePaise} /></strong><small>{model.domain === "PROGRAMME" ? "Utilised" : model.domain === "APPLICATION" ? "Requested" : "No financial field"}</small></a>
      <a href="#origination-evidence"><span>Evidence basis</span><strong>{snapshot.auditEvents.length}</strong><small>Connected audit events</small></a>
    </div>

    <div className="origination-toolbar">
      <form method="get" aria-label="Register filters"><label><span>Find record</span><input name="q" defaultValue={model.filters.q} placeholder={`Search ${module.label.toLowerCase()}`} /></label><label><span>Operating state</span><select name="status" defaultValue={model.filters.status}><option value="">All states</option>{states.map((state) => <option key={state} value={state}>{tone[state].label}</option>)}</select></label><button type="submit">Apply filters</button><Link href={`${basePath}/${model.activeStageSlug}`}>Reset</Link></form>
      {linkedAction ? <Link className="origination-primary-action" href={selected.actionHref!}>{model.action.label}</Link> : <button className="origination-primary-action" disabled title={model.action.allowed ? "No queued action is connected to this record." : model.action.reason}>{model.action.label}</button>}
    </div>

    <div className="origination-layout">
      <section id="origination-register" className="origination-register" aria-labelledby="origination-register-title">
        <div className="origination-section-heading"><div><span className="eyebrow">Connected operational register</span><h2 id="origination-register-title">{model.title}</h2></div><span>{model.rows.length} shown</span></div>
        <div className="operations-table-scroll"><table><thead><tr><th>Record</th><th>{model.domain === "PROGRAMME" ? "Stage / programme" : model.domain === "EMPLOYEE" ? "Employer / payroll" : "Employee / asset"}</th><th className="align-right">{model.domain === "PROGRAMME" ? "Utilised" : model.domain === "APPLICATION" ? "Requested" : "Value"}</th><th>State</th><th><span className="sr-only">Inspect</span></th></tr></thead><tbody>{model.rows.map((row) => <tr key={row.id} data-selected={row.id === selected?.id || undefined}><td><strong>{row.title}</strong><span>{row.id}</span></td><td><strong>{row.relationship}</strong><span>{row.reference} · {row.detail}</span></td><td className="align-right origination-number">{row.valuePaise === null ? "—" : <Money paise={row.valuePaise} />}</td><td><StateMark state={row.state} /></td><td><button className="origination-inspect" aria-pressed={row.id === selected?.id} onClick={() => setSelectedId(row.id)}>Inspect</button></td></tr>)}</tbody></table>{model.rows.length === 0 && <div className="operations-empty-state"><h3>No connected records match</h3><p>Reset the filters to restore the source register.</p></div>}</div>
      </section>

      <aside id="origination-evidence" className="origination-inspector" aria-live="polite">
        {selected ? <><header><span className="eyebrow">Context and evidence</span><h2>{selected.title}</h2><StateMark state={selected.state} /></header><dl><div><dt>Reference</dt><dd>{selected.reference}</dd></div><div><dt>Relationship</dt><dd>{selected.relationship}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div><div><dt>Snapshot freshness</dt><dd>{selected.freshness}</dd></div></dl><section><h3>Decision / audit trace</h3><p>{selected.audit}</p></section><section><h3>Action control</h3><p><strong>{model.action.key}</strong> · {model.action.reason}</p>{selected.actionHref ? <Link href={selected.actionHref}>Open connected work item</Link> : <span>No queued action is connected</span>}</section></> : <div className="operations-empty-state"><h3>No record selected</h3><p>Choose a register row to inspect its evidence.</p></div>}
      </aside>
    </div>
  </section>;
}
