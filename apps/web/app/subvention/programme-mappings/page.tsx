import { SchemeProgrammeWorkspace } from "@/features/subvention/schemes/SchemeProgrammeWorkspace";

type ProgrammeMappingWorkspaceSearchParams = Promise<{
  status?: string | string[];
  mapping?: string | string[];
  employer?: string | string[];
  programme?: string | string[];
}>;

export default async function Page({
  searchParams,
}: {
  searchParams: ProgrammeMappingWorkspaceSearchParams;
}) {
  const { status, mapping, employer, programme } = await searchParams;
  return (
    <SchemeProgrammeWorkspace
      initialView="programmes"
      initialStatus={typeof status === "string" ? status.trim() : undefined}
      initialMappingId={typeof mapping === "string" ? mapping.trim() : undefined}
      initialEmployerId={
        typeof employer === "string" ? employer.trim() : undefined
      }
      initialProgrammeId={
        typeof programme === "string" ? programme.trim() : undefined
      }
    />
  );
}
