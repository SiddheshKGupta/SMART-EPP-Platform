import { SchemeProgrammeWorkspace } from "@/features/subvention/schemes/SchemeProgrammeWorkspace";
import type { RouteSearchParams } from "@/components/shared/RouteContractPage";

export default async function Page({
  searchParams,
}: {
  searchParams: RouteSearchParams;
}) {
  const { status } = await searchParams;
  return (
    <SchemeProgrammeWorkspace
      initialStatus={Array.isArray(status) ? status[0] : status}
    />
  );
}
