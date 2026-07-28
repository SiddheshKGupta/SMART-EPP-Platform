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
      title="Recovery"
      description="Monitor counterparty receivables, filing obligations and recovery follow-up."
      filters={await searchParams}
    />
  );
}
