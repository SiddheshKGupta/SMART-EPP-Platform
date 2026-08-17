import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Boxes,
  Building2,
  Calculator,
  ClipboardCheck,
  Factory,
  FileCheck2,
  FileText,
  Landmark,
  Network,
  ReceiptIndianRupee,
  ScrollText,
  Smartphone,
  Store,
} from "lucide-react";
import type { ComponentType } from "react";

interface HierarchyNode {
  label: string;
  detail: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const commercialPath: HierarchyNode[] = [
  { label: "OEM", detail: "Commercial defaults", href: "/subvention/masters?kind=OEM", icon: Factory },
  { label: "National distributor", detail: "Settlement counterparty", href: "/subvention/masters?kind=DISTRIBUTOR", icon: Network },
  { label: "Reseller / vendor", detail: "Purchase counterparty", href: "/subvention/masters?kind=RESELLER", icon: Store },
  { label: "Product", detail: "Eligible device model", href: "/subvention/masters?kind=PRODUCT", icon: Boxes },
];

const programmePath: HierarchyNode[] = [
  { label: "Employer", detail: "Contractual obligor", href: "/subvention/masters?kind=EMPLOYER", icon: Building2 },
  { label: "Programme mapping", detail: "Employer-specific rules", href: "/subvention/programme-mappings?status=APPROVED", icon: Network },
  { label: "Scheme version", detail: "Effective claim terms", href: "/subvention/schemes?status=APPROVED", icon: FileCheck2 },
];

const transactionPath: HierarchyNode[] = [
  { label: "Purchase order", detail: "Approved procurement", href: "/subvention/purchase-imports?evidence=po", icon: ClipboardCheck },
  { label: "Vendor invoice", detail: "Recognised evidence", href: "/subvention/transactions?evidence=invoice", icon: FileText },
  { label: "IMEI / transaction", detail: "Unique device record", href: "/subvention/transactions?evidence=device", icon: Smartphone },
  { label: "Eligibility", detail: "Rule snapshot", href: "/subvention/eligibility?status=READY_FOR_CLAIM", icon: Calculator },
  { label: "Claim batch", detail: "Controlled submission", href: "/subvention/claims", icon: ScrollText },
  { label: "Subvention invoice", detail: "Approved billing value", href: "/subvention/recovery?stage=INVOICED", icon: ReceiptIndianRupee },
  { label: "Receipt", detail: "Allocated recovery", href: "/subvention/recovery?stage=COLLECTED", icon: BadgeIndianRupee },
  { label: "Accounting", detail: "Reconciled closure", href: "/subvention/reconciliation?stage=ACCOUNTING_RECONCILED", icon: Landmark },
];

function Node({ node }: { node: HierarchyNode }) {
  const Icon = node.icon;
  return (
    <Link
      href={node.href}
      className="group flex min-h-24 min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 outline-none transition-colors hover:border-[#8a607f] hover:bg-[#fbf8fa] focus-visible:ring-2 focus-visible:ring-[#53284F]"
      aria-label={`Open ${node.label} filtered view`}
    >
      <div className="flex items-start justify-between gap-3">
        <Icon className="size-4 shrink-0 text-[#53284F]" />
        <ArrowRight className="size-3.5 shrink-0 text-slate-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{node.label}</div>
        <div className="mt-0.5 text-xs text-slate-500">{node.detail}</div>
      </div>
    </Link>
  );
}

function Path({ title, description, nodes }: { title: string; description: string; nodes: HierarchyNode[] }) {
  const titleId = `${title.replaceAll(" ", "-").toLowerCase()}-title`;
  return (
    <section className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0" aria-labelledby={titleId}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950" id={titleId}>{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="hierarchy-path">
        {nodes.map((node, index) => (
          <div className="hierarchy-step" key={node.label}>
            <Node node={node} />
            {index < nodes.length - 1 ? <ArrowRight className="hierarchy-arrow" aria-hidden /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function MasterHierarchy() {
  const relationships = [
    ["OEM", "oemId", "Distributor → reseller → product", "Only active OEM relationships may be selected"],
    ["Employer", "employerId", "Programme mapping → scheme", "Employer remains the contractual obligor"],
    ["Purchase order", "purchaseOrderId", "Invoice → device transaction", "Vendor, employer and approved amount must reconcile"],
    ["Invoice line", "deviceIdentifier", "Eligibility decision", "IMEI must be unique and present on recognised evidence"],
    ["Scheme version", "schemeVersionId", "Eligibility → claim line", "Exact effective rule snapshot remains immutable"],
    ["Claim batch", "claimBatchId", "Invoice → receipt → accounting", "Closure requires billing, collection and accounting reconciliation"],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#53284F]">Reference and transaction lineage</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Subvention data model</h2>
          </div>
          <p className="max-w-lg text-right text-xs leading-5 text-slate-500">Select any node to open its filtered working view. Arrows show how configuration and evidence constrain downstream records.</p>
        </div>

        <div className="space-y-5">
          <Path title="Commercial configuration" description="Who supplies and settles the eligible product" nodes={commercialPath} />
          <Path title="Employer programme" description="Which effective rules govern the employer" nodes={programmePath} />
          <Path title="Transaction to closure" description="How evidence becomes a reconciled recovery" nodes={transactionPath} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Relationship catalogue</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
              <tr><th className="px-4 py-2.5">Parent</th><th className="px-4 py-2.5">Relationship</th><th className="px-4 py-2.5">Dependent path</th><th className="px-4 py-2.5">Control</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {relationships.map((row) => (
                <tr key={row[1]}><td className="px-4 py-3 font-semibold text-slate-900">{row[0]}</td><td className="px-4 py-3 font-mono text-[#53284F]">{row[1]}</td><td className="px-4 py-3 text-slate-700">{row[2]}</td><td className="px-4 py-3 text-slate-600">{row[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
