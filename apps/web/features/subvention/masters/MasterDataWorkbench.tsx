"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MasterKind, MasterRecord } from "@smart-epp/domain";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  History,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSubvention } from "../store/SubventionProvider";
import {
  MASTER_DEFINITION_BY_KIND,
  MASTER_DEFINITIONS,
  masterFieldValue,
  masterLabel,
} from "./masterDefinitions";
import { MasterHistoryInspector } from "./MasterHistoryInspector";
import { MasterRecordForm } from "./MasterRecordForm";

const PAGE_SIZE = 8;
type InspectorMode = "VIEW" | "EDIT" | "HISTORY" | "CREATE";

function isMasterKind(value: string | null): value is MasterKind {
  return MASTER_DEFINITIONS.some((definition) => definition.kind === value);
}

function fieldLabel(key: string) {
  return key
    .replace(/Id$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toLocaleUpperCase("en-IN"));
}

export function MasterDataWorkbench() {
  const searchParams = useSearchParams();
  const { snapshot, activeActor, saveMasterDraft, deactivateMaster, issues, actionError, isRefreshing } = useSubvention();
  const requestedKind = searchParams.get("kind");
  const [kind, setKind] = useState<MasterKind>(isMasterKind(requestedKind) ? requestedKind : "OEM");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MasterRecord>();
  const [mode, setMode] = useState<InspectorMode>("VIEW");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localMessage, setLocalMessage] = useState<string>();

  const definition = MASTER_DEFINITION_BY_KIND[kind];
  const records = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("en-IN");
    return snapshot.masters[
      ({ OEM: "oems", DISTRIBUTOR: "distributors", RESELLER: "resellers", PRODUCT: "products", EMPLOYER: "employers" } as const)[kind]
    ]
      .filter((record) => status === "ALL" || record.status === status)
      .filter((record) => !needle || `${record.code} ${record.name}`.toLocaleLowerCase("en-IN").includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, "en-IN"));
  }, [kind, query, snapshot.masters, status]);
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const visibleRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canMaintain = activeActor.role === "MASTER_DATA_ADMIN";

  const open = (nextMode: InspectorMode, record?: MasterRecord) => {
    setSelected(record);
    setMode(nextMode);
    setLocalMessage(undefined);
    setDrawerOpen(true);
  };

  const save = async (record: MasterRecord, reason: string) => {
    const result = await saveMasterDraft(record, reason);
    if (!result.ok) return false;
    setSelected(result.value);
    setMode("VIEW");
    setLocalMessage(`${result.value.code} saved and logged.`);
    return true;
  };

  const deactivate = async (record: MasterRecord) => {
    const result = await deactivateMaster(record.id, "Deactivate unused master record");
    if (!result.ok) {
      setLocalMessage(result.issues[0]?.recoveryAction ?? result.error.message);
      return;
    }
    setSelected(result.value);
    setLocalMessage(`${result.value.code} deactivated.`);
  };

  return (
    <div className="min-h-[calc(100vh-112px)] overflow-hidden border bg-white">
      <div className="grid min-h-[calc(100vh-112px)] lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="border-b bg-slate-50/70 lg:border-b-0 lg:border-r">
          <div className="border-b px-4 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#53284F]"><Database className="size-4" />Master catalogue</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Controlled reference data used by scheme and eligibility rules.</p>
          </div>
          <nav aria-label="Master catalogues" className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1">
            {MASTER_DEFINITIONS.map((item) => {
              const count = snapshot.masters[
                ({ OEM: "oems", DISTRIBUTOR: "distributors", RESELLER: "resellers", PRODUCT: "products", EMPLOYER: "employers" } as const)[item.kind]
              ].length;
              return (
                <button
                  type="button"
                  key={item.kind}
                  onClick={() => {
                    setKind(item.kind);
                    setPage(1);
                    setQuery("");
                  }}
                  aria-current={kind === item.kind ? "page" : undefined}
                  className="flex min-w-40 items-center justify-between gap-3 border-l-2 border-transparent px-3 py-2.5 text-left text-sm text-slate-700 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#53284F] aria-[current=page]:border-[#53284F] aria-[current=page]:bg-white aria-[current=page]:font-semibold aria-[current=page]:text-slate-950 lg:w-full"
                >
                  <span>{item.plural}</span><span className="font-mono text-xs text-slate-500">{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <header className="flex flex-col gap-3 border-b px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#53284F]">{definition.kind}</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{definition.plural}</h1>
              <p className="mt-1 text-xs text-slate-500">{definition.description}</p>
            </div>
            <Button onClick={() => open("CREATE")} disabled={!canMaintain}><Plus />Add {definition.singular}</Button>
          </header>

          {!canMaintain && (
            <div className="flex items-center gap-2 border-b bg-amber-50 px-5 py-2.5 text-xs text-amber-900"><ShieldAlert className="size-4" />Read-only view. Switch to Master Data Administrator to maintain records.</div>
          )}

          <div className="grid gap-2 border-b bg-slate-50/60 px-4 py-3 sm:grid-cols-[minmax(240px,1fr)_160px_auto]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <Input aria-label="Search masters" placeholder="Search code or name" value={query} onChange={(event) => setQuery(event.target.value)} className="bg-white pl-8" />
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(1); }}>
              <SelectTrigger aria-label="Filter by status" className="w-full bg-white"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
            </Select>
            <div className="flex items-center justify-end text-xs text-slate-500"><span className="font-mono font-semibold text-slate-800">{records.length}</span>&nbsp;records</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="border-b bg-white uppercase tracking-[0.06em] text-slate-500">
                <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th>{definition.tableFields.map((field) => <th key={field} className="px-4 py-3">{fieldLabel(field)}</th>)}<th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {visibleRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-semibold text-[#53284F]">{record.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{record.name}</td>
                    {definition.tableFields.map((field) => {
                      const raw = masterFieldValue(record, field);
                      const value = field.endsWith("Id") ? masterLabel(snapshot.masters, raw) : raw;
                      return <td key={field} className="px-4 py-3 text-slate-600">{value}</td>;
                    })}
                    <td className="px-4 py-3"><Badge variant={record.status === "ACTIVE" ? "secondary" : "outline"}>{record.status === "ACTIVE" ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={`View ${record.code}`} onClick={() => open("VIEW", record)}><Eye /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`View history for ${record.code}`} onClick={() => open("HISTORY", record)}><History /></Button>
                        {canMaintain && record.status === "ACTIVE" && <Button size="icon-sm" variant="ghost" aria-label={`Edit ${record.code}`} onClick={() => open("EDIT", record)}><Pencil /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleRecords.length === 0 && <tr><td colSpan={definition.tableFields.length + 4} className="px-4 py-12 text-center"><div className="font-semibold text-slate-900">No matching records</div><div className="mt-1 text-slate-500">Change the search or status filter.</div></td></tr>}
              </tbody>
            </table>
          </div>

          <footer className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500">
            <span>Page {Math.min(page, totalPages)} of {totalPages}</span>
            <div className="flex gap-1"><Button size="icon-sm" variant="outline" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><Button size="icon-sm" variant="outline" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button></div>
          </footer>
        </main>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full gap-0 sm:max-w-xl">
          <SheetHeader className="border-b pr-12">
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#53284F]">{mode === "CREATE" ? "New record" : definition.kind}</div>
            <SheetTitle>{mode === "CREATE" ? `Add ${definition.singular}` : selected?.name}</SheetTitle>
            <SheetDescription>{mode === "HISTORY" ? "Version, provenance and command history." : mode === "VIEW" ? "Controlled master details and current dependencies." : "Changes are validated and recorded in the audit trail."}</SheetDescription>
          </SheetHeader>

          {localMessage && <div role="status" className="border-b bg-[#f5eef3] px-5 py-2.5 text-xs text-[#53284F]">{localMessage}</div>}
          {(issues.length > 0 || actionError) && mode === "VIEW" && <div role="alert" className="border-b bg-red-50 px-5 py-2.5 text-xs text-red-900">{issues[0]?.message ?? actionError?.message}</div>}

          {(mode === "CREATE" || mode === "EDIT") && (
            <MasterRecordForm key={`${kind}-${selected?.id ?? "new"}-${mode}`} kind={kind} catalogue={snapshot.masters} record={mode === "EDIT" ? selected : undefined} issues={issues} pending={isRefreshing} onCancel={() => setDrawerOpen(false)} onSave={save} />
          )}
          {mode === "HISTORY" && selected && <div className="min-h-0 flex-1 overflow-y-auto"><MasterHistoryInspector record={selected} events={snapshot.auditEvents} /></div>}
          {mode === "VIEW" && selected && (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <dl className="grid grid-cols-2 gap-px overflow-hidden border bg-slate-200 text-xs">
                {[["Code", selected.code], ["Name", selected.name], ["Status", selected.status], ...definition.fields.map((field) => [field.label, field.key.endsWith("Id") ? masterLabel(snapshot.masters, masterFieldValue(selected, field.key)) : masterFieldValue(selected, field.key)])].map(([label, value]) => <div className="bg-white p-3" key={label}><dt className="font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-900">{value}</dd></div>)}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setMode("HISTORY")}><History />View history</Button>
                {canMaintain && selected.status === "ACTIVE" && <Button variant="outline" onClick={() => setMode("EDIT")}><Pencil />Edit record</Button>}
                {canMaintain && selected.status === "ACTIVE" && <Button variant="destructive" onClick={() => deactivate(selected)} disabled={isRefreshing}>Deactivate</Button>}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Deactivation is blocked when an active master, approved scheme or employer programme depends on this record. The system will explain the dependency and keep this panel open.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
