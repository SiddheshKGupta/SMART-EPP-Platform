"use client";

import { useMemo } from "react";
import type {
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  SchemeVersion,
} from "@smart-epp/domain";
import {
  AttentionLedger,
  type AttentionItem,
} from "@/components/shared/AttentionLedger";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DEMO_NOW } from "@/features/subvention/data/seed";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";

function addDays(value: string, days: number): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function ownerForRole(role: string): string {
  if (role === "BUSINESS_HEAD_CHECKER") return "Business head";
  if (role === "MASTER_DATA_ADMIN") return "Master data";
  if (role === "AUDITOR") return "Control assurance";
  if (role === "MANAGEMENT_VIEWER") return "Operating leadership";
  return "Sales operations";
}

function expiredTransactionItems(
  transactions: PurchaseTransaction[],
  mappings: EmployerProgrammeMappingVersion[],
  schemes: SchemeVersion[],
  owner: string,
): AttentionItem[] {
  const operatingDate = new Date(DEMO_NOW);

  return transactions.flatMap((transaction) => {
    const mapping = mappings.find(
      (candidate) =>
        candidate.workflowStatus === "APPROVED" &&
        candidate.employerId === transaction.employerId &&
        candidate.programmeId === transaction.programmeId &&
        candidate.oemId === transaction.oemId,
    );
    const scheme = schemes.find(
      (candidate) =>
        candidate.id === mapping?.schemeVersionId &&
        candidate.workflowStatus === "APPROVED",
    );
    if (!scheme) return [];

    const deadline = addDays(transaction.invoiceDate, scheme.claimTimelineDays);
    if (new Date(`${deadline}T00:00:00.000Z`) >= operatingDate) return [];

    return [
      {
        id: `deadline-${transaction.id}`,
        title: `Filing deadline passed for ${transaction.leaseId}`,
        module: "SUBVENTION" as const,
        owner,
        dueDate: deadline,
        severity: "CRITICAL" as const,
        financialImpactPaise: transaction.invoiceValuePaise,
        href: `/subvention/eligibility?deadline=overdue&transaction=${transaction.id}`,
      },
    ];
  });
}

export default function Page() {
  const { activeActor, snapshot } = useSubvention();
  const owner = ownerForRole(activeActor.role);

  const attentionItems = useMemo(() => {
    const expired = expiredTransactionItems(
      snapshot.transactions,
      snapshot.programmeMappings,
      snapshot.schemes,
      owner,
    );
    const quarantined: AttentionItem[] = snapshot.quarantinedImports.map(
      (row) => ({
        id: `quarantine-${row.rowNumber}`,
        title: `Correct quarantined purchase row ${row.rowNumber}`,
        module: "SUBVENTION",
        owner,
        dueDate: addDays(row.input.invoiceDate, 7),
        severity: "CRITICAL",
        financialImpactPaise: row.input.invoiceValuePaise,
        href: `/subvention/purchase-imports?status=QUARANTINED&row=${row.rowNumber}`,
      }),
    );
    const submitted: AttentionItem[] = snapshot.programmeMappings
      .filter((mapping) => mapping.workflowStatus === "SUBMITTED")
      .map((mapping) => ({
        id: `mapping-${mapping.id}`,
        title: `Review programme mapping ${mapping.mappingId}`,
        module: "SUBVENTION",
        owner,
        dueDate: addDays(mapping.createdAt, 2),
        severity: "ATTENTION",
        financialImpactPaise: 0,
        href: `/subvention/programme-mappings?status=SUBMITTED&mapping=${mapping.id}`,
      }));
    const drafts: AttentionItem[] = snapshot.schemes
      .filter((scheme) => scheme.workflowStatus === "DRAFT")
      .map((scheme) => ({
        id: `scheme-${scheme.id}`,
        title: `Complete scheme ${scheme.code}`,
        module: "SUBVENTION",
        owner,
        dueDate: scheme.effectiveFrom,
        severity: "INFO",
        financialImpactPaise: 0,
        href: `/subvention/schemes?status=DRAFT&scheme=${scheme.id}`,
      }));

    if (activeActor.role === "BUSINESS_HEAD_CHECKER") return submitted;
    if (activeActor.role === "MASTER_DATA_ADMIN") return drafts;
    if (activeActor.role === "SALES_OPS_MAKER") {
      return [...expired, ...quarantined];
    }
    return [...expired, ...quarantined, ...submitted, ...drafts];
  }, [activeActor.role, owner, snapshot]);

  return (
    <div className="workbench">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Connect institutional operations</span>
          <h1>My Workbench</h1>
          <p>
            Prioritised source records for {owner.toLowerCase()}, with traceable
            exposure and due dates.
          </p>
        </div>
        <StatusBadge
          status="INFO"
          label={activeActor.role.replaceAll("_", " ")}
        />
      </header>

      <div className="workbench-split">
        <AttentionLedger items={attentionItems} />
        <aside className="control-aperture" aria-labelledby="aperture-title">
          <span className="aperture-index" aria-hidden="true">
            {String(attentionItems.length).padStart(2, "0")}
          </span>
          <div>
            <span className="eyebrow">Control aperture</span>
            <h2 id="aperture-title">Your operational line of sight</h2>
            <p>
              This ledger changes with the active role. Each row opens its
              filtered source queue; no aggregate is a dead end.
            </p>
          </div>
          <dl>
            <div>
              <dt>Open records</dt>
              <dd>{attentionItems.length}</dd>
            </div>
            <div>
              <dt>Critical</dt>
              <dd>
                {
                  attentionItems.filter((item) => item.severity === "CRITICAL")
                    .length
                }
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
