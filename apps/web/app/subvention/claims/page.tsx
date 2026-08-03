import { ClaimLifecycleTracker } from "@/features/subvention/claims/ClaimLifecycleTracker";
import { ClaimPreparation } from "@/features/subvention/claims/ClaimPreparation";

export default function Page() {
  return <main className="mx-auto w-full max-w-[1480px] p-5 lg:p-7"><ClaimPreparation /><ClaimLifecycleTracker /></main>;
}
