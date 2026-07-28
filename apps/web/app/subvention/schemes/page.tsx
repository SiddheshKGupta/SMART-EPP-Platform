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
      title="Scheme Versions"
      description="Manage effective-dated, maker-checker controlled subvention scheme versions."
      filters={await searchParams}
    />
  );
}
