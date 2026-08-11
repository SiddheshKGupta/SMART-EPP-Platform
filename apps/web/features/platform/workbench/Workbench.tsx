"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import {
  evaluateAccess,
  type AccessProfile,
  type OperatingState,
  type PlatformSnapshot,
  type WorkItem,
  type WorkQueueKey,
} from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { RouteFilters } from "@/components/shared/RouteContractPage";
import { nextTabIndex } from "@/features/platform/command-centre/CommandCentre";
import { usePlatform } from "@/features/platform/store/PlatformProvider";

const queueDefinitions = [
  ["my-tasks", "My Tasks", "MY_TASKS"],
  ["my-approvals", "My Approvals", "MY_APPROVALS"],
  ["my-exceptions", "My Exceptions", "MY_EXCEPTIONS"],
  ["team-queues", "Team Queues", "TEAM_QUEUES"],
  ["unassigned-work", "Unassigned Work", "UNASSIGNED_WORK"],
  ["notifications", "Notifications", "NOTIFICATIONS"],
  ["escalations", "Escalations", "ESCALATIONS"],
  ["delegations", "Delegations", "DELEGATIONS"],
  ["recently-viewed", "Recently Viewed", "RECENTLY_VIEWED"],
] as const satisfies ReadonlyArray<readonly [string, string, WorkQueueKey]>;

export type WorkbenchQueue = { slug: string; label: string; items: WorkItem[] };
type WorkbenchFilters = Partial<Pick<RouteFilters, "queue" | "status">>;

const filterValue = (value: unknown): string => typeof value === "string" ? value.trim().toLowerCase() : "";

export function buildWorkbenchQueues(snapshot: PlatformSnapshot, profile: AccessProfile): WorkbenchQueue[] {
  return queueDefinitions.map(([slug, label, key]) => ({
    slug,
    label,
    items: snapshot.workItems.filter((item) => item.queueKeys.includes(key) && (key !== "MY_TASKS" || item.assignedUserId === profile.userId)),
  }));
}

export function buildWorkbenchView(snapshot: PlatformSnapshot, profile: AccessProfile, filters: WorkbenchFilters = {}) {
  const queues = buildWorkbenchQueues(snapshot, profile);
  const requestedQueue = filterValue(filters.queue);
  const activeIndex = Math.max(0, queues.findIndex((queue) => queue.slug === requestedQueue));
  const statusCandidate = filterValue(filters.status).toUpperCase();
  const status = (["HEALTHY", "PENDING", "OVERDUE", "REJECTED", "RECONCILED"] as const).includes(statusCandidate as OperatingState) ? statusCandidate as OperatingState : "";
  const queue = queues[activeIndex]!;
  const items = status ? queue.items.filter((item) => item.state === status) : queue.items;
  return { queues, queue, activeIndex, status, items, totalPaise: items.reduce((sum, item) => sum + item.financialImpactPaise, 0) };
}

export function getWorkItemAction(item: WorkItem, profile: AccessProfile) {
  if (!item.requestedAction) return null;
  return { action: item.requestedAction, ...evaluateAccess({ profile, module: item.module, action: item.requestedAction, initiatedBy: item.initiatedBy }) };
}

const actionLabel = (item: WorkItem) => item.requestedAction?.toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) ?? "";
const statusTone = (state: OperatingState) => state === "OVERDUE" ? "CRITICAL" : state === "REJECTED" ? "REJECTED" : state === "HEALTHY" || state === "RECONCILED" ? "APPROVED" : "ATTENTION";

export function Workbench({ initialQueue, filters = {} }: { initialQueue?: string; filters?: WorkbenchFilters }) {
  const { snapshot, activeProfile } = usePlatform();
  const initial = buildWorkbenchView(snapshot, activeProfile, { ...filters, queue: filterValue(filters.queue) || initialQueue });
  const [active, setActive] = useState(initial.activeIndex);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState("");
  const queues = buildWorkbenchQueues(snapshot, activeProfile);
  const queue = queues[active]!;
  const status = initial.status;
  const items = status ? queue.items.filter((item) => item.state === status) : queue.items;

  const selectTab = (index: number, event?: KeyboardEvent<HTMLButtonElement>) => {
    const tabs = event?.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role=tab]");
    setActive(index);
    if (event) requestAnimationFrame(() => tabs?.[index]?.focus());
  };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(index, event.key, queues.length);
    if (next !== index || ["Home", "End"].includes(event.key)) { event.preventDefault(); selectTab(next, event); }
  };

  return <section className="operations-workbench" aria-labelledby="workbench-title">
    <header className="page-heading"><div><span className="eyebrow">Source-backed operational queues</span><h1 id="workbench-title">Workbench</h1><p>Profile changes permitted actions and personal assignment only; every registered queue remains available.</p></div><StatusBadge status="INFO" label={activeProfile.roleKeys.join(", ")} /></header>
    <div role="tablist" aria-label="Workbench queues" className="command-tabs">{queues.map((item, index) => <button key={item.slug} id={`workbench-tab-${item.slug}`} role="tab" aria-selected={active === index} aria-controls={`workbench-panel-${item.slug}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => onTabKeyDown(event, index)}>{item.label}</button>)}</div>
    {queues.map((panelQueue, panelIndex) => <div key={panelQueue.slug} id={`workbench-panel-${panelQueue.slug}`} role="tabpanel" aria-labelledby={`workbench-tab-${panelQueue.slug}`} className="operations-table-scroll" hidden={active !== panelIndex}>{active === panelIndex && <>
      <div className="workspace-heading"><span className="ledger-count">{items.length} record{items.length === 1 ? "" : "s"}{status ? ` · ${status}` : ""}</span><strong><Money paise={items.reduce((sum, item) => sum + item.financialImpactPaise, 0)} /></strong></div>
      {items.length > 0 && <table><thead><tr><th>Work item</th><th>Owner / due</th><th className="align-right">Impact (INR)</th><th>State</th><th>Action</th></tr></thead><tbody>{items.map((item) => {
        const decision = getWorkItemAction(item, activeProfile);
        const reasonId = `permission-${item.id}`;
        const isComplete = completed.has(item.id);
        const deniedReason = decision && !decision.allowed ? (decision.requiresBreakGlass ? decision.reason : `Requires IAM permission: ${decision.reason}`) : "";
        return <tr key={item.id}><td><Link href={item.href}>{item.title}</Link><br /><span className="text-muted">{item.id}</span></td><td>{item.owner}<br /><time dateTime={item.dueDate}>{item.dueDate}</time></td><td className="align-right"><Money paise={item.financialImpactPaise} /></td><td><StatusBadge status={statusTone(item.state)} label={item.state} /></td><td>{decision ? <><button disabled={!decision.allowed || isComplete} aria-describedby={!decision.allowed ? reasonId : undefined} onClick={() => { setCompleted((current) => new Set(current).add(item.id)); setAnnouncement(`${actionLabel(item)} completed for ${item.title}`); }}>{isComplete ? "Completed" : actionLabel(item)}</button>{deniedReason && <span id={reasonId} className="sr-only">{deniedReason}</span>}</> : <span className="text-muted">No action requested</span>}</td></tr>;
      })}</tbody></table>}
      {items.length === 0 && <div className="operations-empty-state"><h2>No source-backed records in this queue</h2><p>This deterministic snapshot has no qualifying records for the selected queue and status.</p></div>}
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </>}</div>)}
  </section>;
}
