"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  CalculationBasis,
  EmployerProgrammeMappingVersion,
  SchemeVersion,
  SettlementCounterpartyType,
} from "@smart-epp/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_NOW } from "../data/seed";
import { useSubvention } from "../store/SubventionProvider";

function logicalId(prefix: string, code: string) {
  return `${prefix}-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

const fieldClass = "grid gap-1.5";
const selectClass = "h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm";

export function SchemeDraftDialog({
  open,
  scheme,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  scheme?: SchemeVersion;
  onOpenChange(open: boolean): void;
  onSaved(scheme: SchemeVersion): void;
}) {
  const store = useSubvention();
  const [code, setCode] = useState(scheme?.code ?? "");
  const [name, setName] = useState(scheme?.name ?? "");
  const [oemId, setOemId] = useState(scheme?.oemId ?? "oem-apple");
  const [distributorId, setDistributorId] = useState(scheme?.distributorId ?? "");
  const [route, setRoute] = useState<SettlementCounterpartyType>(scheme?.settlementCounterpartyType ?? "DISTRIBUTOR");
  const [basis, setBasis] = useState<CalculationBasis>(scheme?.calculationBasis ?? "INVOICE_VALUE");
  const [rate, setRate] = useState(scheme?.rateBps === undefined ? "3.5" : String(scheme.rateBps / 100));
  const [flatAmount, setFlatAmount] = useState(scheme?.flatAmountPaise === undefined ? "" : String(scheme.flatAmountPaise / 100));
  const [timeline, setTimeline] = useState(String(scheme?.claimTimelineDays ?? 90));
  const [priority, setPriority] = useState(String(scheme?.priority ?? 10));
  const [effectiveFrom, setEffectiveFrom] = useState(scheme?.effectiveFrom ?? "");
  const [effectiveTo, setEffectiveTo] = useState(scheme?.effectiveTo ?? "");
  const [productIds, setProductIds] = useState<string[]>(scheme?.eligibleProductIds ?? []);
  const [remarks, setRemarks] = useState(scheme ? "Update controlled scheme draft" : "Create controlled scheme draft");

  const products = store.snapshot.masters.products.filter(
    (product) => product.oemId === oemId && product.workflowStatus === "APPROVED",
  );
  const distributors = store.snapshot.masters.distributors.filter(
    (distributor) => distributor.oemId === oemId && distributor.workflowStatus === "APPROVED",
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const id = scheme?.id ?? `${logicalId("scheme-version", normalizedCode)}-${Date.now()}`;
    const draft: SchemeVersion = {
      id,
      schemeId: scheme?.schemeId ?? logicalId("scheme", normalizedCode),
      version: scheme?.version ?? 1,
      code: normalizedCode,
      name: name.trim(),
      oemId,
      distributorId: route === "DISTRIBUTOR" ? distributorId || undefined : undefined,
      settlementCounterpartyType: route,
      calculationBasis: basis,
      rateBps: basis === "FLAT_AMOUNT" ? undefined : Math.round(Number(rate) * 100),
      flatAmountPaise: basis === "FLAT_AMOUNT" ? Math.round(Number(flatAmount) * 100) : undefined,
      claimTimelineDays: Number(timeline),
      priority: Number(priority),
      eligibleProductIds: productIds,
      effectiveFrom,
      effectiveTo,
      requiredDocumentCodes: ["PURCHASE_INVOICE", "LEASE_SCHEDULE"],
      workflowStatus: "DRAFT",
      makerUserId: store.activeActor.userId,
      createdAt: scheme?.createdAt ?? DEMO_NOW,
      supersedesVersionId: scheme?.supersedesVersionId,
    };
    const result = await store.saveSchemeDraft(draft, remarks);
    if (!result.ok) return;
    onSaved(result.value);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{scheme ? "Edit scheme draft" : "Add scheme"}</DialogTitle>
          <DialogDescription>Configure the OEM rule once. Employer-specific exceptions belong in Programme Mappings.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldClass}><Label>Scheme code</Label><Input value={code} onChange={(event) => setCode(event.target.value)} required disabled={Boolean(scheme)} /></label>
            <label className={fieldClass}><Label>Scheme name</Label><Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label className={fieldClass}><Label>OEM</Label><select className={selectClass} value={oemId} onChange={(event) => { setOemId(event.target.value); setProductIds([]); setDistributorId(""); }}>{store.snapshot.masters.oems.filter((row) => row.workflowStatus === "APPROVED").map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className={fieldClass}><Label>Settlement route</Label><select className={selectClass} value={route} onChange={(event) => setRoute(event.target.value as SettlementCounterpartyType)}><option value="DISTRIBUTOR">National distributor</option><option value="RESELLER">Authorised reseller</option><option value="OEM">OEM</option></select></label>
            {route === "DISTRIBUTOR" ? <label className={fieldClass}><Label>National distributor</Label><select className={selectClass} value={distributorId} onChange={(event) => setDistributorId(event.target.value)} required><option value="">Select distributor</option>{distributors.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label> : null}
            <label className={fieldClass}><Label>Calculation basis</Label><select className={selectClass} value={basis} onChange={(event) => setBasis(event.target.value as CalculationBasis)}><option value="INVOICE_VALUE">Invoice value</option><option value="BASE_VALUE">Base value</option><option value="FLAT_AMOUNT">Flat amount</option></select></label>
            {basis === "FLAT_AMOUNT" ? <label className={fieldClass}><Label>Flat amount (₹)</Label><Input type="number" min="0" step="0.01" value={flatAmount} onChange={(event) => setFlatAmount(event.target.value)} required /></label> : <label className={fieldClass}><Label>Subvention rate (%)</Label><Input type="number" min="0" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} required /></label>}
            <label className={fieldClass}><Label>Claim timeline (days)</Label><Input type="number" min="1" value={timeline} onChange={(event) => setTimeline(event.target.value)} required /></label>
            <label className={fieldClass}><Label>Priority</Label><Input type="number" min="1" value={priority} onChange={(event) => setPriority(event.target.value)} required /></label>
            <label className={fieldClass}><Label>Effective from</Label><Input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} required /></label>
            <label className={fieldClass}><Label>Effective to</Label><Input type="date" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} required /></label>
          </div>
          <fieldset className="rounded-xl border p-3"><legend className="px-1 text-sm font-medium">Eligible products</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{products.map((product) => <label className="flex items-center gap-2 text-sm" key={product.id}><input type="checkbox" checked={productIds.includes(product.id)} onChange={(event) => setProductIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} />{product.name}</label>)}</div></fieldset>
          <label className={fieldClass}><Label>Change reason</Label><Input value={remarks} onChange={(event) => setRemarks(event.target.value)} required /></label>
          {store.issues.length || store.actionError ? <p role="alert" className="text-sm text-[var(--critical)]">{store.issues[0]?.message ?? store.actionError?.message}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={store.isRefreshing || productIds.length === 0}>{scheme ? "Save draft" : "Create scheme draft"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProgrammeOverrideDialog({
  open,
  mapping,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  mapping?: EmployerProgrammeMappingVersion;
  onOpenChange(open: boolean): void;
  onSaved(mapping: EmployerProgrammeMappingVersion): void;
}) {
  const store = useSubvention();
  const [basis, setBasis] = useState<"INHERIT" | CalculationBasis>(mapping?.overrides?.calculationBasis ?? "INHERIT");
  const [rate, setRate] = useState(mapping?.overrides?.rateBps === undefined ? "" : String(mapping.overrides.rateBps / 100));
  const [approvalReference, setApprovalReference] = useState(mapping?.overrides?.approvalReference ?? "");
  const [remarks, setRemarks] = useState("Update employer programme rule");

  const scheme = useMemo(() => store.snapshot.schemes.find((item) => item.id === mapping?.schemeVersionId), [mapping?.schemeVersionId, store.snapshot.schemes]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mapping) return;
    const hasOverride = basis !== "INHERIT" || rate.trim() !== "";
    const draft: EmployerProgrammeMappingVersion = {
      ...mapping,
      workflowStatus: "DRAFT",
      checkerUserId: undefined,
      approvedAt: undefined,
      makerUserId: store.activeActor.userId,
      overrides: hasOverride ? {
        calculationBasis: basis === "INHERIT" ? undefined : basis,
        rateBps: rate.trim() ? Math.round(Number(rate) * 100) : undefined,
        approvalReference: approvalReference.trim(),
      } : undefined,
    };
    const result = await store.saveProgrammeMappingDraft(draft, remarks);
    if (!result.ok) return;
    onSaved(result.value);
    onOpenChange(false);
  }

  if (!mapping) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Edit programme pricing rule</DialogTitle><DialogDescription>The scheme remains the default. Use this override only for an approved employer-specific commercial clause.</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="rounded-xl border bg-[var(--workspace-detail)] p-3 text-sm"><strong>Scheme default:</strong> {scheme?.calculationBasis.replaceAll("_", " ") ?? "Not found"}{scheme?.rateBps ? ` at ${(scheme.rateBps / 100).toFixed(2)}%` : ""}</div>
          <label className={fieldClass}><Label>Employer calculation basis</Label><select className={selectClass} value={basis} onChange={(event) => setBasis(event.target.value as typeof basis)}><option value="INHERIT">Inherit scheme default</option><option value="INVOICE_VALUE">Invoice value override</option><option value="BASE_VALUE">Base value override</option><option value="FLAT_AMOUNT">Flat amount override</option></select></label>
          <label className={fieldClass}><Label>Rate override (%)</Label><Input type="number" min="0" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Leave blank to inherit" /></label>
          {basis !== "INHERIT" || rate ? <label className={fieldClass}><Label>Approval reference</Label><Input value={approvalReference} onChange={(event) => setApprovalReference(event.target.value)} required /></label> : null}
          <label className={fieldClass}><Label>Change reason</Label><Input value={remarks} onChange={(event) => setRemarks(event.target.value)} required /></label>
          {store.issues.length || store.actionError ? <p role="alert" className="text-sm text-[var(--critical)]">{store.issues[0]?.message ?? store.actionError?.message}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={store.isRefreshing}>Save programme draft</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
