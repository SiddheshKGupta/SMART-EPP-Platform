"use client";

import { Money } from "@/components/shared/Money";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManagementDrilldownRecord } from "../../../../../packages/domain/src/subvention/management";

const basisLabels: Record<ManagementDrilldownRecord["amountBasis"], string> = {
  POSTED_RECEIPT_ALLOCATION: "Posted receipt",
  OUTSTANDING_APPROVED_VALUE: "Approved less received",
  EXPECTED_CLAIM_VALUE: "Expected claim value",
  APPROVED_CLAIM_VALUE: "Approved claim value",
};

function phaseLabel(phase: string) {
  return phase
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface ManagementDrilldownProps {
  open: boolean;
  title: string;
  definition: string;
  records: ManagementDrilldownRecord[];
  onOpenChange(open: boolean): void;
}

export function ManagementDrilldown({
  open,
  title,
  definition,
  records,
  onOpenChange,
}: ManagementDrilldownProps) {
  const totalPaise = records.reduce((sum, record) => sum + record.amountPaise, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(94vw,920px)] sm:max-w-[min(94vw,920px)]" side="right">
        <SheetHeader className="border-b border-[var(--border)] pr-12">
          <span className="text-xs font-semibold tracking-[0.08em] text-[var(--provenance-plum)] uppercase">
            Source records
          </span>
          <SheetTitle className="text-xl font-semibold">{title}</SheetTitle>
          <SheetDescription>{definition}</SheetDescription>
          <div className="mt-3 flex items-end justify-between border-t border-[var(--border)] pt-3">
            <span className="text-xs text-[var(--muted)]">{records.length} claim record{records.length === 1 ? "" : "s"}</span>
            <strong className="text-lg"><Money paise={totalPaise} /></strong>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-6">
          <Table aria-label={`${title} source records`}>
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow>
                <TableHead>Claim / date</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead className="text-right">Claim value</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Included amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={`${record.claimId}-${record.amountBasis}`}>
                  <TableCell>
                    <strong className="block font-mono text-xs">{record.claimId}</strong>
                    <time className="text-xs text-[var(--muted)]" dateTime={record.eventDate}>
                      {record.eventDate}
                    </time>
                  </TableCell>
                  <TableCell>{record.employerName}</TableCell>
                  <TableCell>{record.counterpartyName}</TableCell>
                  <TableCell>{phaseLabel(record.phase)}</TableCell>
                  <TableCell className="text-right"><Money paise={record.claimValuePaise} /></TableCell>
                  <TableCell className="text-right"><Money paise={record.approvedValuePaise} /></TableCell>
                  <TableCell className="text-right"><Money paise={record.receivedPaise} /></TableCell>
                  <TableCell className="text-right"><Money paise={record.outstandingPaise} /></TableCell>
                  <TableCell>{record.dueDate ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <strong className="block"><Money paise={record.amountPaise} /></strong>
                    <span className="text-xs text-[var(--muted)]">{basisLabels[record.amountBasis]}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {records.length === 0 ? (
            <div className="grid min-h-48 place-items-center text-center text-sm text-[var(--muted)]">
              No records match this metric and period.
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
