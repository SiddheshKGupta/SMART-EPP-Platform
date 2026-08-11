export type CommandCentreLens = "operations" | "executive";

export type CommandCentreView = {
  lens: CommandCentreLens;
  title: string;
  description: string;
  metricKeys: readonly string[];
};

const OPERATIONS = ["workItems", "overdue", "approvals", "alerts", "integrations"] as const;
const EXECUTIVE = ["health", "sanction", "utilised", "exposure", "pipeline"] as const;

const VIEWS: Record<string, CommandCentreView> = {
  "executive-overview": { lens: "executive", title: "Executive Overview", description: "Portfolio scale, health, utilisation and delivery pipeline from the fixed operating snapshot.", metricKeys: EXECUTIVE },
  "operations-overview": { lens: "operations", title: "Operations Overview", description: "Operating queues, approvals and exceptions requiring attention.", metricKeys: OPERATIONS },
  "portfolio-health": { lens: "executive", title: "Portfolio Health", description: "Lease health and programme delivery position with reconciling evidence.", metricKeys: ["health", "pipeline"] },
  "exposure-utilisation": { lens: "executive", title: "Exposure and Utilisation", description: "Sanction, utilisation and contractual rental exposure in one governed view.", metricKeys: ["sanction", "utilised", "exposure"] },
  "financial-snapshot": { lens: "executive", title: "Financial Snapshot", description: "Source-backed financial position without inferred targets or trends.", metricKeys: ["sanction", "utilised", "exposure"] },
  "sla-ageing": { lens: "operations", title: "SLA and Ageing", description: "Work requiring attention, including items in an explicit overdue control state.", metricKeys: ["overdue", "workItems"] },
  "control-alerts": { lens: "operations", title: "Exceptions and Control Alerts", description: "Approval and exception populations requiring controlled intervention.", metricKeys: ["alerts", "approvals"] },
  "integration-health": { lens: "operations", title: "Integration Health", description: "Mock-only adapter exceptions and last-known integration state for Lighthouse readiness.", metricKeys: ["integrations"] },
  "guided-demo": { lens: "operations", title: "Guided Demo Journey", description: "Start the connected case journey from the persistent action bar, then follow each controlled milestone.", metricKeys: ["workItems", "approvals", "alerts"] },
};

const DEFAULT_VIEW: CommandCentreView = { lens: "operations", title: "Command Centre", description: "Management and operational oversight from a fixed, source-backed snapshot.", metricKeys: OPERATIONS };

export function resolveCommandCentreView(slug?: string): CommandCentreView {
  return slug ? VIEWS[slug] ?? DEFAULT_VIEW : DEFAULT_VIEW;
}
