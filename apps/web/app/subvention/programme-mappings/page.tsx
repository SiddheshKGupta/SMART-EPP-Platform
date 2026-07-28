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
      title="Programme Mappings"
      description="Review employer, programme and OEM mappings with effective rule precedence."
      filters={await searchParams}
    />
  );
}
