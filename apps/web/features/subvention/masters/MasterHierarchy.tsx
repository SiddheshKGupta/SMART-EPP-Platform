import Link from "next/link";
import { ArrowRight, Building2, Boxes, Factory, Network, Store } from "lucide-react";

const nodes = [
  { kind: "OEM", label: "OEM", detail: "Commercial defaults", icon: Factory },
  { kind: "DISTRIBUTOR", label: "National distributor", detail: "Settlement route", icon: Network },
  { kind: "RESELLER", label: "Reseller / vendor", detail: "Purchase counterparty", icon: Store },
  { kind: "PRODUCT", label: "Product", detail: "Eligible device model", icon: Boxes },
  { kind: "EMPLOYER", label: "Employer", detail: "Contractual obligor", icon: Building2 },
] as const;

function Node({ node }: { node: (typeof nodes)[number] }) {
  const Icon = node.icon;
  return (
    <Link
      href={`/subvention/masters?kind=${node.kind}`}
      className="group flex min-h-24 flex-col justify-between border bg-white p-4 outline-none transition-colors hover:border-[#8a607f] hover:bg-[#fbf8fa] focus-visible:ring-2 focus-visible:ring-[#53284F]"
    >
      <div className="flex items-start justify-between">
        <Icon className="size-4 text-[#53284F]" />
        <ArrowRight className="size-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{node.label}</div>
        <div className="mt-0.5 text-xs text-slate-500">{node.detail}</div>
      </div>
    </Link>
  );
}

export function MasterHierarchy() {
  return (
    <div className="space-y-6">
      <div className="border bg-white p-5">
        <div className="mb-5 flex items-end justify-between gap-4 border-b pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#53284F]">Reference data lineage</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Commercial configuration path</h2>
          </div>
          <p className="max-w-md text-right text-xs leading-5 text-slate-500">Select a node to open that catalogue. Arrows show where a relationship constrains downstream records.</p>
        </div>

        <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Node node={nodes[0]} />
          <ArrowRight className="mx-auto hidden size-4 text-slate-400 lg:block" />
          <Node node={nodes[1]} />
          <ArrowRight className="mx-auto hidden size-4 text-slate-400 lg:block" />
          <Node node={nodes[2]} />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Node node={nodes[3]} />
          <Node node={nodes[4]} />
        </div>
      </div>

      <div className="overflow-hidden border bg-white">
        <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Relationship catalogue</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-[0.06em] text-slate-500">
              <tr><th className="px-4 py-2.5">Parent</th><th className="px-4 py-2.5">Relationship</th><th className="px-4 py-2.5">Dependent</th><th className="px-4 py-2.5">Control</th></tr>
            </thead>
            <tbody className="divide-y">
              {[
                ["OEM", "oemId", "Distributor, reseller, product", "Only active OEMs may be referenced"],
                ["Distributor", "distributorId", "Reseller, scheme, programme mapping", "Deactivation blocked while referenced"],
                ["Product", "eligibleProductIds", "Approved scheme version", "Historical scheme snapshot remains immutable"],
                ["Employer", "employerId", "Employer programme mapping", "Employer remains contractual obligor"],
                ["Scheme version", "schemeVersionId", "Purchase eligibility decision", "Exact rule version retained at evaluation"],
              ].map((row) => (
                <tr key={row[1]}><td className="px-4 py-3 font-semibold text-slate-900">{row[0]}</td><td className="px-4 py-3 font-mono text-[#53284F]">{row[1]}</td><td className="px-4 py-3 text-slate-700">{row[2]}</td><td className="px-4 py-3 text-slate-600">{row[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
