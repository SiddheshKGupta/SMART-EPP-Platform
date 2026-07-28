import {
  RouteContractPage,
  type RouteSearchParams,
} from "@/components/shared/RouteContractPage";

export default async function Page({
  searchParams,
}: {
  searchParams: RouteSearchParams;
}) {
  return (
    <RouteContractPage
      title="Audit Trail"
      description="Trace material actions, actors, rule snapshots and effective record versions."
      filters={await searchParams}
    />
  );
}
