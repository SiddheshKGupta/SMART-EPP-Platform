import { SchemeProgrammeWorkspace } from "@/features/subvention/schemes/SchemeProgrammeWorkspace";

type SchemeWorkspaceSearchParams = Promise<{
  status?: string | string[];
  scheme?: string | string[];
}>;

export default async function Page({
  searchParams,
}: {
  searchParams: SchemeWorkspaceSearchParams;
}) {
  const { status, scheme } = await searchParams;
  return (
    <SchemeProgrammeWorkspace
      initialStatus={typeof status === "string" ? status.trim() : undefined}
      initialSchemeId={typeof scheme === "string" ? scheme.trim() : undefined}
    />
  );
}
