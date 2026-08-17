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
      title="Reconciliation"
      description="Resolve billing, collection and accounting variances against approved values."
      filters={await searchParams}
    />
  );
}
