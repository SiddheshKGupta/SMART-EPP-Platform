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
      title="Purchase Imports"
      description="Inspect accepted and quarantined source transactions before eligibility processing."
      filters={await searchParams}
    />
  );
}
