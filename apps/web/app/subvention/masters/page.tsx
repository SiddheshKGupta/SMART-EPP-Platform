import { Suspense } from "react";
import { MasterDataWorkbench } from "@/features/subvention/masters/MasterDataWorkbench";

export default function SubventionMastersPage() {
  return (
    <Suspense fallback={<div className="border bg-white p-8 text-sm text-slate-600">Loading master catalogue…</div>}>
      <MasterDataWorkbench />
    </Suspense>
  );
}
