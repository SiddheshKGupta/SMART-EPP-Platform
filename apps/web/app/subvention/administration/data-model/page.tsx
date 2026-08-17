import { MasterHierarchy } from "@/features/subvention/masters/MasterHierarchy";

export default function SubventionDataModelPage() {
  return (
    <div className="space-y-4">
      <header className="border-b pb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#53284F]">Administration</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Data model & master hierarchy</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">How commercial reference data flows into programme configuration, eligibility and claim evidence.</p>
      </header>
      <MasterHierarchy />
    </div>
  );
}
