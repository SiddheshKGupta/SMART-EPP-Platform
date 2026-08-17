"use client";

import type { AuditEvent, MasterRecord } from "@smart-epp/domain";
import { History, ShieldCheck } from "lucide-react";

export function MasterHistoryInspector({
  record,
  events,
  versions,
}: {
  record: MasterRecord;
  events: AuditEvent[];
  versions: MasterRecord[];
}) {
  const logicalVersions = versions
    .filter((candidate) => candidate.logicalId === record.logicalId)
    .sort((a, b) => b.version - a.version);
  const versionIds = new Set(logicalVersions.map((candidate) => candidate.id));
  const history = events
    .filter((event) => event.entityType === "MasterRecord" && versionIds.has(event.entityId))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <div className="space-y-5 px-5 py-4">
      <section className="grid grid-cols-2 gap-px overflow-hidden border bg-slate-200 text-xs">
        {[
          ["Record ID", record.id],
          ["Workflow status", record.workflowStatus],
          ["Logical ID", record.logicalId],
          ["Version", String(record.version)],
          ["Created", new Date(record.createdAt).toLocaleString("en-IN")],
          ["Last changed", new Date(record.updatedAt).toLocaleString("en-IN")],
        ].map(([label, value]) => (
          <div className="bg-white p-3" key={label}>
            <div className="font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
            <div className="mt-1 break-words font-mono text-slate-900">{value}</div>
          </div>
        ))}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Retained versions</h3>
        <div className="mt-3 divide-y border">
          {logicalVersions.map((version) => (
            <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2.5 text-xs" key={version.id}>
              <span className="font-mono font-semibold text-[#53284F]">v{version.version}</span>
              <span>{version.effectiveFrom} to {version.effectiveTo}</span>
              <span>{version.workflowStatus.replaceAll("_", " ")}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="size-4 text-[#53284F]" />Change history</h3>
        {history.length === 0 ? (
          <div className="mt-3 border border-dashed p-4 text-xs text-slate-600">No command history yet. Seed records retain their source timestamps above.</div>
        ) : (
          <ol className="mt-3 border-l border-slate-300 pl-4">
            {history.map((event) => (
              <li className="relative pb-5 text-xs last:pb-0" key={event.id}>
                <span className="absolute -left-[21px] top-0.5 size-2.5 rounded-full border-2 border-white bg-[#53284F] ring-1 ring-[#53284F]" />
                <div className="font-semibold text-slate-900">{event.action.replace("MASTER_", "").replaceAll("_", " ")}</div>
                <div className="mt-0.5 text-slate-600">{event.remarks}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-slate-500">
                  <span>{event.actor.userId}</span>
                  <time>{new Date(event.occurredAt).toLocaleString("en-IN")}</time>
                </div>
                <div className="mt-2 flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 text-slate-600">
                  <ShieldCheck className="size-3.5" />
                  {event.provenance.source} · {event.provenance.sourceEntityId}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
