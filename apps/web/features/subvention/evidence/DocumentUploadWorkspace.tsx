"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, FileSpreadsheet, FileText, Upload, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type UploadState = "READY" | "PROCESSING" | "RECOGNISED" | "REVIEW" | "REJECTED";

interface QueuedDocument {
  id: string;
  file: File;
  documentType: string;
  state: UploadState;
  message: string;
}

const allowedExtensions = new Set(["pdf", "csv", "xlsx", "xls", "xlsb"]);
const MAX_BYTES = 50 * 1024 * 1024;

function classify(name: string): { documentType: string; message: string } {
  const normalized = name.toLowerCase();
  if (normalized.includes("eway") || normalized.includes("e-way")) return { documentType: "E-Way Bill", message: "Ready for invoice matching" };
  if (normalized.includes("delivered") && normalized.includes("device")) return { documentType: "Delivered Devices report", message: "Ready for device and IMEI matching" };
  if (normalized.includes("billing") || normalized.includes("summary")) return { documentType: "Vendor Billing Summary", message: "Ready for billing reconciliation" };
  if (normalized.includes("invoice") || normalized.includes("document")) return { documentType: "Vendor invoice", message: "Ready for PO and IMEI extraction" };
  if (normalized.endsWith(".pdf")) return { documentType: "PDF document", message: "Document type requires confirmation" };
  return { documentType: "Transaction spreadsheet", message: "Ready for controlled import review" };
}

export function DocumentUploadWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<QueuedDocument[]>([]);
  const [dragging, setDragging] = useState(false);

  function addFiles(files: File[]) {
    setDocuments((current) => {
      const fingerprints = new Set(current.map((row) => `${row.file.name}:${row.file.size}:${row.file.lastModified}`));
      const additions = files.flatMap<QueuedDocument>((file) => {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
        if (fingerprints.has(fingerprint)) return [];
        fingerprints.add(fingerprint);
        if (!allowedExtensions.has(extension)) return [{ id: crypto.randomUUID(), file, documentType: "Unsupported document", state: "REJECTED", message: "Use PDF, CSV, XLS, XLSX or XLSB." }];
        if (file.size > MAX_BYTES) return [{ id: crypto.randomUUID(), file, documentType: "File too large", state: "REJECTED", message: "Maximum file size is 50 MB." }];
        const identified = classify(file.name);
        return [{ id: crypto.randomUUID(), file, documentType: identified.documentType, state: "READY", message: identified.message }];
      });
      return [...current, ...additions];
    });
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function processDocuments() {
    setDocuments((current) => current.map((row) => row.state === "READY" ? { ...row, state: "PROCESSING" } : row));
    window.setTimeout(() => {
      setDocuments((current) => current.map((row) => {
        if (row.state !== "PROCESSING") return row;
        const review = row.documentType === "PDF document";
        return { ...row, state: review ? "REVIEW" : "RECOGNISED", message: review ? "Confirm the document type before matching." : row.message };
      }));
    }, 250);
  }

  const readyCount = documents.filter((row) => row.state === "READY").length;
  const recognisedCount = documents.filter((row) => row.state === "RECOGNISED").length;

  return (
    <div className="space-y-5">
      <header className="page-heading">
        <div><span className="eyebrow">Document intelligence</span><h1>Upload Documents</h1><p>Upload vendor invoices, E-Way Bills and Tortoise reports. Personal fields remain restricted in operational views.</p></div>
        <Button onClick={() => inputRef.current?.click()}><Upload aria-hidden />Choose documents</Button>
      </header>

      <input ref={inputRef} className="sr-only" type="file" multiple accept=".pdf,.csv,.xlsx,.xls,.xlsb" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />

      <div
        className={`grid min-h-52 place-items-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${dragging ? "border-[var(--provenance-plum)] bg-[var(--provenance-soft)]" : "border-[var(--border-strong)] bg-white"}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <div><Upload className="mx-auto size-8 text-[var(--provenance-plum)]" aria-hidden /><h2 className="mt-3 text-lg font-semibold">Drop document packages here</h2><p className="mt-1 text-sm text-[var(--muted)]">PDF, CSV, XLS, XLSX or XLSB · maximum 50 MB per file</p><Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()}>Browse files</Button></div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white" aria-labelledby="upload-queue-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><span className="eyebrow">Current batch</span><h2 className="mt-1 text-base font-semibold" id="upload-queue-title">Recognition queue</h2></div><div className="flex items-center gap-2"><span className="text-sm text-[var(--muted)]">{documents.length} files · {recognisedCount} recognised</span><Button disabled={readyCount === 0} onClick={processDocuments}>Process {readyCount || "ready"} document{readyCount === 1 ? "" : "s"}</Button></div></div>
        {documents.length === 0 ? <div className="grid min-h-40 place-items-center px-6 text-center"><div><strong className="text-sm">No documents selected</strong><p className="mt-1 text-xs text-[var(--muted)]">Choose invoice packages or platform reports to begin recognition.</p></div></div> : <ul className="divide-y">{documents.map((row) => <li className="grid items-center gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_180px_130px_auto]" key={row.id}>{row.file.name.toLowerCase().endsWith(".pdf") ? <FileText className="size-5 text-[var(--muted)]" aria-hidden /> : <FileSpreadsheet className="size-5 text-[var(--muted)]" aria-hidden />}<div className="min-w-0"><strong className="block truncate text-sm">{row.file.name}</strong><span className="text-xs text-[var(--muted)]">{(row.file.size / 1024).toFixed(1)} KB</span></div><span className="text-sm">{row.documentType}</span><span className={`text-xs font-semibold ${row.state === "REJECTED" ? "text-[var(--critical)]" : row.state === "RECOGNISED" ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>{row.state === "RECOGNISED" ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4" />Recognised</span> : row.state.replaceAll("_", " ")}</span><Button size="icon-sm" variant="ghost" aria-label={`Remove ${row.file.name}`} onClick={() => setDocuments((current) => current.filter((item) => item.id !== row.id))}><X aria-hidden /></Button><p className="sm:col-start-2 sm:col-span-4 text-xs text-[var(--muted)]">{row.message}</p></li>)}</ul>}
      </section>

      <div className="flex justify-end"><Button asChild variant="outline"><Link href="/subvention/transactions">Open Purchase Repository</Link></Button></div>
    </div>
  );
}
