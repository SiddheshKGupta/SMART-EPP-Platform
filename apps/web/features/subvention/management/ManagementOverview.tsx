"use client";

import { ArrowUpRight, Clock3 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  financialYearForDate,
  normalizeManagementPeriodFilter,
  type ManagementDrilldownRecord,
  type ManagementPeriodFilter,
  type SubventionFinancialRecord,
} from "../../../../../packages/domain/src/subvention/management";
import { ManagementDrilldown } from "./ManagementDrilldown";
import {
  createManagementReadModel,
  managementFilterFromSearchParams,
  managementFilterToSearchParams,
  monthsForManagementFilter,
} from "./managementReadModel";

interface ActiveDrilldown {
  title: string;
  definition: string;
  records: ManagementDrilldownRecord[];
}

function phaseLabel(phase: string) {
  return phase
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

export interface ManagementOverviewProps {
  records: SubventionFinancialRecord[];
  businessDate: string;
}

export function ManagementOverview({ records, businessDate }: ManagementOverviewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackFinancialYear = financialYearForDate(businessDate);
  const filter = managementFilterFromSearchParams(searchParams, fallbackFinancialYear);
  const model = createManagementReadModel(records, filter, businessDate);
  const [activeDrilldown, setActiveDrilldown] = useState<ActiveDrilldown | null>(null);

  function updateFilter(next: ManagementPeriodFilter) {
    const normalized = normalizeManagementPeriodFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("fy");
    params.delete("quarter");
    params.delete("month");
    managementFilterToSearchParams(normalized).forEach((value, key) => params.set(key, value));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const metrics = [model.received, model.paymentDue, model.inProgress, model.overdue];
  const financialYears = [...new Set([fallbackFinancialYear, ...model.availableFinancialYears])].sort().reverse();
  const monthOptions = monthsForManagementFilter(filter);

  return (
    <section className="space-y-5" aria-labelledby="management-overview-title" data-testid="management-overview">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-xs font-semibold tracking-[0.08em] text-[var(--provenance-plum)] uppercase">
            Management overview
          </span>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em]" id="management-overview-title">
            Subvention financial position
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Posted receipts, approved dues and live claims. Every amount opens the exact records included.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] bg-white p-2" aria-label="Management period filters">
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">
            Financial year
            <Select
              value={filter.financialYear}
              onValueChange={(financialYear) =>
                updateFilter({ financialYear, quarter: "ALL", month: "ALL" })
              }
            >
              <SelectTrigger className="min-w-28" aria-label="Financial year"><SelectValue /></SelectTrigger>
              <SelectContent>
                {financialYears.map((financialYear) => (
                  <SelectItem key={financialYear} value={financialYear}>FY {financialYear}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">
            Quarter
            <Select
              value={filter.quarter}
              onValueChange={(quarter) =>
                updateFilter({ ...filter, quarter: quarter as ManagementPeriodFilter["quarter"] })
              }
            >
              <SelectTrigger className="min-w-24" aria-label="Quarter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {(["Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">
            Month
            <Select
              value={filter.month}
              onValueChange={(month) => updateFilter({ ...filter, month })}
            >
              <SelectTrigger className="min-w-36" aria-label="Month"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All months</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>{monthLabel(month)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Financial metrics">
        {metrics.map((metric) => (
          <button
            className="group min-h-36 rounded-xl border border-[var(--border)] bg-white p-4 text-left transition-colors hover:border-[var(--border-strong)] focus-visible:outline-offset-2"
            key={metric.key}
            onClick={() => setActiveDrilldown({ title: metric.label, definition: metric.definition, records: metric.records })}
            type="button"
          >
            <span className="flex items-center justify-between text-sm font-medium text-[var(--muted)]">
              {metric.label}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </span>
            <strong className="mt-5 block text-2xl font-semibold tracking-[-0.035em]"><Money paise={metric.amountPaise} /></strong>
            <span className="mt-2 block text-xs text-[var(--muted)]">{metric.count} claim record{metric.count === 1 ? "" : "s"}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-[var(--border)] bg-white" aria-labelledby="phase-position-title">
          <div className="flex items-end justify-between border-b border-[var(--border)] p-4">
            <div><span className="text-xs font-semibold text-[var(--muted)] uppercase">Lifecycle</span><h2 className="mt-1 text-base font-semibold" id="phase-position-title">Claims by phase</h2></div>
            <span className="text-xs text-[var(--muted)]">Count and value</span>
          </div>
          <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
            {model.phasePosition.map((phase) => (
              <button
                className="group flex min-h-24 items-center justify-between bg-white p-4 text-left hover:bg-[var(--workspace-detail)]"
                key={phase.phase}
                onClick={() => setActiveDrilldown({ title: phaseLabel(phase.phase), definition: `Claim value currently at ${phaseLabel(phase.phase)}.`, records: phase.records })}
                type="button"
              >
                <span><strong className="block text-sm font-semibold">{phaseLabel(phase.phase)}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{phase.count} claim{phase.count === 1 ? "" : "s"}</span></span>
                <span className="text-right"><strong className="block"><Money paise={phase.amountPaise} /></strong><ArrowUpRight className="ml-auto mt-2 size-4 text-[var(--muted)]" aria-hidden /></span>
              </button>
            ))}
            {model.phasePosition.length === 0 ? (
              <div className="col-span-full grid min-h-36 place-items-center bg-white px-6 text-center">
                <div>
                  <strong className="text-sm font-semibold">No claim activity in this period</strong>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Change the financial period or prepare a claim batch to populate this view.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white" aria-labelledby="employer-position-title">
          <div className="border-b border-[var(--border)] p-4"><span className="text-xs font-semibold text-[var(--muted)] uppercase">Breakup</span><h2 className="mt-1 text-base font-semibold" id="employer-position-title">Employer position</h2></div>
          <div className="divide-y divide-[var(--border)]">
            {model.employerPosition.slice(0, 6).map((employer) => (
              <button className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[var(--workspace-detail)]" key={employer.employerId} onClick={() => setActiveDrilldown({ title: employer.employerName, definition: "Claim value for this employer in the selected period.", records: employer.records })} type="button">
                <span className="min-w-0"><strong className="block truncate text-sm">{employer.employerName}</strong><span className="text-xs text-[var(--muted)]">{employer.count} claim{employer.count === 1 ? "" : "s"}</span></span>
                <span className="shrink-0 text-sm font-semibold"><Money paise={employer.amountPaise} /></span>
              </button>
            ))}
            {model.employerPosition.length === 0 ? (
              <div className="grid min-h-36 place-items-center px-6 text-center">
                <div>
                  <strong className="text-sm font-semibold">No employer claims in this period</strong>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Employer-level values appear after claims enter the selected period.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-white" aria-labelledby="counterparty-dues-title">
        <div className="flex items-end justify-between border-b border-[var(--border)] p-4">
          <div><span className="text-xs font-semibold text-[var(--muted)] uppercase">Recovery</span><h2 className="mt-1 text-base font-semibold" id="counterparty-dues-title">Payment due by ND / vendor</h2></div>
          <span className="text-xs text-[var(--muted)]">Approved less received</span>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Counterparty</TableHead><TableHead>Claims</TableHead><TableHead>Earliest due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Payment due</TableHead><TableHead><span className="sr-only">Action</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {model.counterpartyDues.map((counterparty) => (
              <TableRow key={counterparty.counterpartyId}>
                <TableCell className="font-medium">{counterparty.counterpartyName}</TableCell>
                <TableCell>{counterparty.count}</TableCell>
                <TableCell>{counterparty.earliestDueDate ?? "—"}</TableCell>
                <TableCell>{counterparty.overdue ? <span className="inline-flex items-center gap-1 font-medium text-[var(--critical)]"><Clock3 className="size-4" aria-hidden />Overdue</span> : <span className="text-[var(--muted)]">Current</span>}</TableCell>
                <TableCell className="text-right font-semibold"><Money paise={counterparty.amountPaise} /></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setActiveDrilldown({ title: `${counterparty.counterpartyName} payment due`, definition: "Approved value less posted receipts for this settlement counterparty.", records: counterparty.records })}>View breakup</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {model.counterpartyDues.length === 0 ? <div className="grid min-h-36 place-items-center border-t border-[var(--border)] text-sm text-[var(--muted)]">No counterparty payments are due for this period.</div> : null}
      </section>

      <ManagementDrilldown
        definition={activeDrilldown?.definition ?? ""}
        onOpenChange={(open) => { if (!open) setActiveDrilldown(null); }}
        open={activeDrilldown !== null}
        records={activeDrilldown?.records ?? []}
        title={activeDrilldown?.title ?? "Metric detail"}
      />
    </section>
  );
}
