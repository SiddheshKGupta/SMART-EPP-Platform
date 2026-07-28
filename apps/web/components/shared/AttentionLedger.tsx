import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
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

export interface AttentionItem {
  id: string;
  title: string;
  module: "ONBOARDING" | "FORECLOSURE" | "SUBVENTION";
  owner: string;
  dueDate: string;
  severity: "INFO" | "ATTENTION" | "CRITICAL";
  financialImpactPaise: number;
  href: string;
}

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function AttentionLedger({ items }: { items: AttentionItem[] }) {
  return (
    <section className="attention-ledger" aria-labelledby="attention-title">
      <div className="ledger-heading">
        <div>
          <span className="eyebrow">Role-aware attention ledger</span>
          <h2 id="attention-title">Work requiring intervention</h2>
        </div>
        <span className="ledger-count">{items.length} open</span>
      </div>

      {items.length === 0 ? (
        <div className="ledger-empty">
          <StatusBadge status="APPROVED" label="Clear" />
          <p>No seeded records currently require this role.</p>
        </div>
      ) : (
        <Table className="ledger-table">
          <TableHeader>
            <TableRow>
              <TableHead>Attention</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="align-right">Exposure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="ledger-row"
                data-severity={item.severity}
              >
                <TableCell>
                  <Link className="ledger-link" href={item.href}>
                    <StatusBadge status={item.severity} />
                    <span>
                      <strong>{item.title}</strong>
                      <small aria-hidden="true">{item.module}</small>
                    </span>
                    <ArrowUpRight aria-hidden />
                  </Link>
                </TableCell>
                <TableCell>{item.owner}</TableCell>
                <TableCell>
                  <time dateTime={item.dueDate}>
                    {formatDueDate(item.dueDate)}
                  </time>
                </TableCell>
                <TableCell className="align-right">
                  <Money paise={item.financialImpactPaise} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
