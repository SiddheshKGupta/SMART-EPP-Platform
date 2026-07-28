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
      title="Eligibility Review Queue"
      description="Trace eligibility decisions, rule outcomes, deadlines and approved-value exposure."
      filters={await searchParams}
    />
  );
}
