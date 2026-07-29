import { EligibilityWorkspace } from "@/features/subvention/eligibility/EligibilityWorkspace";

type EligibilitySearchParams = Promise<{
  status?: string | string[];
  deadline?: string | string[];
  transaction?: string | string[];
}>;

export default async function Page({
  searchParams,
}: {
  searchParams: EligibilitySearchParams;
}) {
  const { status, deadline, transaction } = await searchParams;
  return (
    <EligibilityWorkspace
      initialStatus={
        typeof status === "string" ? status.trim() : undefined
      }
      initialDeadline={
        typeof deadline === "string" ? deadline.trim() : undefined
      }
      initialTransaction={
        typeof transaction === "string"
          ? transaction.trim()
          : undefined
      }
    />
  );
}
