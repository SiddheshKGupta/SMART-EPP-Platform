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
      title="Claims Register"
      description="Track immutable approved claims through billing, collection and accounting closure."
      filters={await searchParams}
    />
  );
}
