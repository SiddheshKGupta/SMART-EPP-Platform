"use client";

import { useMemo, useState } from "react";
import type {
  MasterCatalogue,
  MasterKind,
  MasterRecord,
} from "@smart-epp/domain";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MASTER_DEFINITION_BY_KIND, masterFieldValue } from "./masterDefinitions";

interface MasterRecordFormProps {
  kind: MasterKind;
  catalogue: MasterCatalogue;
  record?: MasterRecord;
  issues: Array<{ field?: string; message: string; recoveryAction: string }>;
  pending: boolean;
  onCancel(): void;
  onSave(record: MasterRecord, reason: string): Promise<boolean>;
}

function initialValues(kind: MasterKind, record?: MasterRecord) {
  const definition = MASTER_DEFINITION_BY_KIND[kind];
  return Object.fromEntries([
    ["code", record?.code ?? ""],
    ["name", record?.name ?? ""],
    ...definition.fields.map((field) => [
      field.key,
      record ? masterFieldValue(record, field.key).replace("—", "") : "",
    ]),
  ]);
}

function toMasterRecord(
  kind: MasterKind,
  values: Record<string, string>,
  existing?: MasterRecord,
): MasterRecord {
  const now = new Date().toISOString();
  const base = {
    id:
      existing?.id ??
      `${kind.toLocaleLowerCase("en-IN")}-${crypto.randomUUID()}`,
    kind,
    code: values.code.trim(),
    name: values.name.trim(),
    status: existing?.status ?? ("ACTIVE" as const),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (kind === "OEM") {
    return {
      ...base,
      kind,
      defaultClaimTimelineDays: Number(values.defaultClaimTimelineDays),
      defaultCalculationBasis:
        values.defaultCalculationBasis as "INVOICE_VALUE" | "BASE_VALUE" | "FLAT_AMOUNT",
      defaultSettlementCounterpartyType:
        values.defaultSettlementCounterpartyType as "OEM" | "DISTRIBUTOR" | "RESELLER",
      defaultRateBps: values.defaultRateBps
        ? Number(values.defaultRateBps)
        : undefined,
    };
  }
  if (kind === "DISTRIBUTOR") return { ...base, kind, oemId: values.oemId };
  if (kind === "RESELLER") {
    return {
      ...base,
      kind,
      oemId: values.oemId,
      distributorId: values.distributorId,
    };
  }
  if (kind === "PRODUCT") {
    return { ...base, kind, oemId: values.oemId, model: values.model };
  }
  return { ...base, kind: "EMPLOYER", programmeCode: values.programmeCode };
}

export function MasterRecordForm({
  kind,
  catalogue,
  record,
  issues,
  pending,
  onCancel,
  onSave,
}: MasterRecordFormProps) {
  const definition = MASTER_DEFINITION_BY_KIND[kind];
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(kind, record),
  );
  const [reason, setReason] = useState(record ? "Correct master details" : "Add controlled master");

  const issueByField = useMemo(
    () => new Map(issues.filter((item) => item.field).map((item) => [item.field!, item])),
    [issues],
  );

  const update = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(toMasterRecord(kind, values, record), reason);
      }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {issues.length > 0 && (
          <div role="alert" className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-xs text-red-900">
            <div className="flex items-center gap-2 font-semibold"><AlertCircle className="size-4" />This record needs correction</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {issues.map((item) => <li key={`${item.field}-${item.message}`}>{item.message} {item.recoveryAction}</li>)}
            </ul>
          </div>
        )}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Identity</legend>
          {[
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
          ].map((field) => (
            <div className="space-y-1.5" key={field.key}>
              <Label htmlFor={`master-${field.key}`}>{field.label}</Label>
              <Input
                id={`master-${field.key}`}
                value={values[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                aria-invalid={issueByField.has(field.key)}
                required
              />
              {issueByField.has(field.key) && <p className="text-xs text-red-700">{issueByField.get(field.key)!.message}</p>}
            </div>
          ))}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Configuration</legend>
          {definition.fields.map((field) => (
            <div className="space-y-1.5" key={field.key}>
              <Label htmlFor={`master-${field.key}`}>{field.label}</Label>
              {field.type === "select" ? (
                <Select value={values[field.key]} onValueChange={(value) => update(field.key, value)}>
                  <SelectTrigger id={`master-${field.key}`} className="w-full" aria-invalid={issueByField.has(field.key)}>
                    <SelectValue placeholder={`Select ${field.label.toLocaleLowerCase("en-IN")}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options?.(catalogue) ?? []).map((option) => (
                      <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`master-${field.key}`}
                  type={field.type}
                  value={values[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                  aria-invalid={issueByField.has(field.key)}
                  required={field.required}
                />
              )}
              {field.help && <p className="text-xs text-slate-500">{field.help}</p>}
              {issueByField.has(field.key) && <p className="text-xs text-red-700">{issueByField.get(field.key)!.message}</p>}
            </div>
          ))}
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="master-change-reason">Change reason</Label>
          <Input id="master-change-reason" value={reason} onChange={(event) => setReason(event.target.value)} required />
          <p className="text-xs text-slate-500">Stored with the audit event and provenance.</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
