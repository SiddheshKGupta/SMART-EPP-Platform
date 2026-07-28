"use client";

import { ArrowUpRight, Clock3, DatabaseZap, GitPullRequest } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { PurchaseTransaction } from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_NOW } from "@/features/subvention/data/seed";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";

function addDays(value: string, days: number): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sumImpact(rows: PurchaseTransaction[]): number {
  return rows.reduce((total, row) => total + row.invoiceValuePaise, 0);
}

export function ControlDesk() {
  const { snapshot } = useSubvention();

  const model = useMemo(() => {
    const operatingDate = new Date(DEMO_NOW);
    const sevenDaysOut = new Date(DEMO_NOW);
    sevenDaysOut.setUTCDate(sevenDaysOut.getUTCDate() + 7);
    const deadlineRows = snapshot.transactions.flatMap((transaction) => {
      const mapping = snapshot.programmeMappings.find(
        (candidate) =>
          candidate.workflowStatus === "APPROVED" &&
          candidate.employerId === transaction.employerId &&
          candidate.programmeId === transaction.programmeId &&
          candidate.oemId === transaction.oemId,
      );
      const scheme = snapshot.schemes.find(
        (candidate) =>
          candidate.id === mapping?.schemeVersionId &&
          candidate.workflowStatus === "APPROVED",
      );
      if (!scheme) return [];
      const filingDeadline = addDays(
        transaction.invoiceDate,
        scheme.claimTimelineDays,
      );
      const due = new Date(`${filingDeadline}T00:00:00.000Z`);
      if (due > sevenDaysOut) return [];
      return [{ transaction, filingDeadline, overdue: due < operatingDate }];
    });

    const approvalRows = [
      ...snapshot.schemes.filter(
        (scheme) => scheme.workflowStatus === "SUBMITTED",
      ),
      ...snapshot.programmeMappings.filter(
        (mapping) => mapping.workflowStatus === "SUBMITTED",
      ),
    ];
    const blockedRows = snapshot.transactions.filter(
      (transaction) =>
        transaction.leaseStatus !== "ACTIVE" ||
        !snapshot.programmeMappings.some(
          (mapping) =>
            mapping.workflowStatus === "APPROVED" &&
            mapping.employerId === transaction.employerId &&
            mapping.programmeId === transaction.programmeId &&
            mapping.oemId === transaction.oemId,
        ),
    );

    return {
      deadlineRows,
      signals: [
        {
          id: "deadline",
          title: "Exceptions due within 7 days",
          count: deadlineRows.length,
          impactPaise: sumImpact(
            deadlineRows.map((row) => row.transaction),
          ),
          status: "CRITICAL" as const,
          href: "/subvention/eligibility?deadline=7d",
          icon: Clock3,
        },
        {
          id: "approvals",
          title: "Master approvals waiting",
          count: approvalRows.length,
          impactPaise: 0,
          status: "ATTENTION" as const,
          href: "/subvention/programme-mappings?status=SUBMITTED",
          icon: GitPullRequest,
        },
        {
          id: "quarantine",
          title: "Purchase rows quarantined",
          count: snapshot.quarantinedImports.length,
          impactPaise: snapshot.quarantinedImports.reduce(
            (total, row) => total + row.input.invoiceValuePaise,
            0,
          ),
          status: "CRITICAL" as const,
          href: "/subvention/purchase-imports?status=QUARANTINED",
          icon: DatabaseZap,
        },
        {
          id: "blocked",
          title: "Source transactions blocked",
          count: blockedRows.length,
          impactPaise: sumImpact(blockedRows),
          status: "ATTENTION" as const,
          href: "/subvention/eligibility?status=BLOCKED",
          icon: DatabaseZap,
        },
      ],
    };
  }, [snapshot]);

  return (
    <div className="control-desk">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Subvention management</span>
          <h1>Subvention Control Desk</h1>
          <p>
            Source-backed deadlines, approval gates and financial exposure
            across the current repository snapshot.
          </p>
        </div>
        <StatusBadge status="APPROVED" label="Repository current" />
      </header>

      <section className="signal-board" aria-labelledby="signals-title">
        <div className="signal-board-heading">
          <span className="eyebrow">Attention signals</span>
          <h2 id="signals-title">Control position</h2>
        </div>
        <div className="signal-grid">
          {model.signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <Link
                className="signal-link"
                href={signal.href}
                key={signal.id}
              >
                <div className="signal-label">
                  <Icon aria-hidden />
                  <span>{signal.title}</span>
                  <ArrowUpRight aria-hidden />
                </div>
                <strong>{signal.count}</strong>
                <span className="signal-impact">
                  <Money paise={signal.impactPaise} /> exposure
                </span>
                <StatusBadge status={signal.status} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="source-workspace" aria-labelledby="deadlines-title">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">Filtered source records</span>
            <h2 id="deadlines-title">Filing deadline exceptions</h2>
          </div>
          <Link href="/subvention/eligibility?deadline=7d">
            Open complete queue <ArrowUpRight aria-hidden />
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lease</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Filing deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="align-right">Invoice value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {model.deadlineRows.map(({ transaction, filingDeadline, overdue }) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <Link
                    className="record-link"
                    href={`/subvention/eligibility?transaction=${transaction.id}`}
                  >
                    {transaction.leaseId}
                  </Link>
                </TableCell>
                <TableCell>{transaction.employerId}</TableCell>
                <TableCell>{transaction.invoiceNumber}</TableCell>
                <TableCell>
                  <time dateTime={filingDeadline}>{filingDeadline}</time>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={overdue ? "CRITICAL" : "ATTENTION"}
                    label={overdue ? "Overdue" : "Due soon"}
                  />
                </TableCell>
                <TableCell className="align-right">
                  <Money paise={transaction.invoiceValuePaise} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
