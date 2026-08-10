import type {
  OperatingState,
  PlatformModuleDefinition,
  PlatformSnapshot,
  PlatformSubmoduleDefinition,
} from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import { StatusBadge, type SemanticStatus } from "@/components/shared/StatusBadge";
import type { RouteFilters } from "@/components/shared/RouteContractPage";

type WorkspaceRecord = {
  id: string;
  title: string;
  context: string;
  owner: string;
  state: OperatingState;
  amountPaise: number;
  source: string;
};

const statusTone: Record<OperatingState, SemanticStatus> = {
  HEALTHY: "APPROVED",
  PENDING: "ATTENTION",
  OVERDUE: "CRITICAL",
  REJECTED: "REJECTED",
  RECONCILED: "INFO",
};

function recordsForModule(module: PlatformModuleDefinition, snapshot: PlatformSnapshot): WorkspaceRecord[] {
  const work = snapshot.workItems.filter((item) => item.module === module.key).map((item) => ({
    id: item.id, title: item.title, context: item.dueDate, owner: item.owner, state: item.state,
    amountPaise: item.financialImpactPaise, source: "Operational work queue",
  }));
  if (work.length) return work;
  if (module.key === "EMPLOYER_PROGRAMMES") return snapshot.employers.map((record) => ({ id: record.id, title: record.name, context: record.programmeId, owner: "relationship-manager", state: record.status, amountPaise: record.utilisedPaise, source: "Employer programme master" }));
  if (module.key === "EMPLOYEES") return snapshot.employees.map((record) => ({ id: record.id, title: record.name, context: record.payrollId, owner: "hrms-operator", state: record.status, amountPaise: 0, source: "Employer HRMS feed" }));
  if (module.key === "APPLICATIONS_ELIGIBILITY") return snapshot.applications.map((record) => ({ id: record.id, title: record.id.replace("application-", "Application "), context: `Reserved ${record.reservedPaise / 100}`, owner: "ops-lead", state: record.status, amountPaise: record.requestedPaise, source: "Application register" }));
  if (module.key === "ASSETS_PARTNERS") return snapshot.assets.map((record) => ({ id: record.id, title: `${record.oem} ${record.model}`, context: `${record.category} · ${record.serialNumber}`, owner: "vendor-operations", state: "HEALTHY", amountPaise: record.invoiceValuePaise, source: "Asset registry" }));
  if (module.key === "LEASES_PORTFOLIO" || module.key === "FORECLOSURE") return snapshot.leases.map((record) => ({ id: record.id, title: record.id.replace("lease-", "Lease "), context: `${record.lotId} · ${record.tenureMonths} months`, owner: "portfolio-manager", state: record.status, amountPaise: record.rentalPaise * record.tenureMonths, source: "Lease administration" }));
  return snapshot.auditEvents.map((record, index) => ({ id: record.id, title: record.action.replaceAll("_", " "), context: `${record.entityType} · ${record.entityId}`, owner: record.actorId, state: index === 0 ? "HEALTHY" : "RECONCILED", amountPaise: 0, source: "Platform audit trail" }));
}

export function ModuleWorkspace({ module, submodule, snapshot, filters }: { module: PlatformModuleDefinition; submodule?: PlatformSubmoduleDefinition; snapshot: PlatformSnapshot; filters: RouteFilters }) {
  const records = recordsForModule(module, snapshot);
  const title = submodule?.label ?? module.label;
  const totalPaise = records.reduce((total, record) => total + record.amountPaise, 0);
  const pending = records.filter((record) => record.state === "PENDING" || record.state === "OVERDUE").length;
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== undefined);

  return (
    <section className="operations-workbench" aria-labelledby="module-workspace-title">
      <header className="page-heading">
        <div>
          <span className="eyebrow">{module.label} · connected operational snapshot</span>
          <h1 id="module-workspace-title">{title}</h1>
          <p>{submodule?.description ?? module.description}</p>
        </div>
        <div className="operations-result-summary">
          <StatusBadge status="INFO" label="Read only" />
          <span>Source freshness: <strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.generatedAt))}</strong></span>
        </div>
      </header>

      <div className="signal-board" aria-label="Workspace totals">
        <div className="signal-grid">
          <div className="signal-link"><span className="signal-label">Connected records</span><strong>{records.length}</strong><span className="signal-impact">Deterministic seed snapshot</span></div>
          <div className="signal-link"><span className="signal-label">Value in view</span><strong><Money paise={totalPaise} /></strong><span className="signal-impact">Recorded operational amounts</span></div>
          <div className="signal-link"><span className="signal-label">Needs attention</span><strong>{pending}</strong><span className="signal-impact">Pending or overdue records</span></div>
          <div className="signal-link"><span className="signal-label">Evidence source</span><strong>{snapshot.auditEvents.length}</strong><span className="signal-impact">Auditable platform events</span></div>
        </div>
      </div>

      <section className="operations-queue" aria-labelledby="workspace-register-title">
        <div className="workspace-heading"><div><span className="eyebrow">Operational register</span><h2 id="workspace-register-title">{title} records</h2></div><span className="ledger-count">{activeFilters.length ? `${activeFilters.length} active filter${activeFilters.length === 1 ? "" : "s"}` : "All records"}</span></div>
        <form className="operations-toolbar" aria-label="Workspace filters">
          <label className="operations-search"><span className="sr-only">Find a record</span><input name="q" defaultValue={typeof filters.q === "string" ? filters.q : ""} placeholder="Find a record in this connected snapshot" /></label>
          <label><span className="sr-only">Filter by operating state</span><select name="status" defaultValue={typeof filters.status === "string" ? filters.status : ""}><option value="">All operating states</option><option value="PENDING">Pending</option><option value="OVERDUE">Overdue</option><option value="HEALTHY">Healthy</option><option value="RECONCILED">Reconciled</option></select></label>
        </form>
        <div className="operations-table-scroll"><table><thead><tr><th>Record</th><th>Owner / context</th><th className="align-right">Recorded value</th><th>State</th><th><span className="sr-only">Inspector</span></th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><div className="operations-primary-cell"><strong>{record.title}</strong><span>{record.id}</span></div></td><td>{record.owner}<br /><span className="text-muted">{record.context}</span></td><td className="align-right"><Money paise={record.amountPaise} /></td><td><StatusBadge status={statusTone[record.state]} label={record.state} /></td><td><details className="workspace-inspector"><summary aria-label={`Inspect ${record.title}`}>Inspect</summary><div><strong>Provenance</strong><span>{record.source}</span><span>Snapshot: {snapshot.generatedAt}</span></div></details></td></tr>)}</tbody></table></div>
      </section>
    </section>
  );
}
