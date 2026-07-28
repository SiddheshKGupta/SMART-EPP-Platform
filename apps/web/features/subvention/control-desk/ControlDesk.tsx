"use client";

import { ArrowUpRight, Clock3, DatabaseZap, GitPullRequest } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
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
import { selectControlDeskReadModel } from "./controlDeskReadModel";

export function ControlDesk() {
  const { activeActor, snapshot } = useSubvention();

  const model = useMemo(() => {
    const readModel = selectControlDeskReadModel(snapshot, {
      actor: activeActor,
      evaluatedAt: DEMO_NOW,
    });

    return {
      ...readModel,
      signals: [
        {
          id: "deadline",
          title: "Exceptions due within 7 days",
          count: readModel.deadlineExceptions.length,
          impactPaise: readModel.deadlineExceptions.reduce(
            (total, row) => total + row.decision.expectedAmountPaise,
            0,
          ),
          status: "CRITICAL" as const,
          href: "/subvention/eligibility?deadline=7d",
          icon: Clock3,
        },
        {
          id: "approvals",
          title: "Master approvals waiting",
          count: readModel.approvalQueue.length,
          impactPaise: 0,
          status: "ATTENTION" as const,
          href: "/subvention/programme-mappings?status=SUBMITTED",
          icon: GitPullRequest,
        },
        {
          id: "quarantine",
          title: "Purchase rows quarantined",
          count: readModel.quarantinedImports.length,
          impactPaise: readModel.quarantinedImports.reduce(
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
          count: readModel.blockedTransactions.length,
          impactPaise: readModel.blockedTransactions.reduce(
            (total, row) => total + row.decision.expectedAmountPaise,
            0,
          ),
          status: "ATTENTION" as const,
          href: "/subvention/eligibility?status=BLOCKED",
          icon: DatabaseZap,
        },
      ],
    };
  }, [activeActor, snapshot]);

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
              <TableHead className="align-right">Expected value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {model.deadlineExceptions.map((row) => (
              <TableRow key={row.transaction.id}>
                <TableCell>
                  <Link
                    className="record-link"
                    href={`/subvention/eligibility?transaction=${row.transaction.id}`}
                  >
                    {row.transaction.leaseId}
                  </Link>
                </TableCell>
                <TableCell>{row.transaction.employerId}</TableCell>
                <TableCell>{row.transaction.invoiceNumber}</TableCell>
                <TableCell>
                  <time dateTime={row.decision.filingDeadline}>
                    {row.decision.filingDeadline}
                  </time>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      row.deadlineState === "OVERDUE"
                        ? "CRITICAL"
                        : "ATTENTION"
                    }
                    label={
                      row.deadlineState === "OVERDUE"
                        ? "Overdue"
                        : "Due soon"
                    }
                  />
                </TableCell>
                <TableCell className="align-right">
                  <Money paise={row.decision.expectedAmountPaise} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
