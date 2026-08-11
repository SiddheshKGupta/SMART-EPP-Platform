import { moduleBySlug, submoduleByPath } from "@smart-epp/domain";
import { notFound } from "next/navigation";
import { ModuleWorkspace } from "@/features/platform/workspaces/ModuleWorkspace";
import { createPlatformApplication } from "@/features/platform/server/platformApplication";
import type { RouteFilters } from "@/components/shared/RouteContractPage";

export default async function Page({ params, searchParams }: { params: Promise<{ module: string; submodule?: string[] }>; searchParams: Promise<RouteFilters> }) {
  const route = await params;
  const module = moduleBySlug(route.module);
  if (!module) {
    notFound();
    return null;
  }
  const submodule = submoduleByPath(route.module, route.submodule ?? []);
  if ((route.submodule?.length ?? 0) > 0 && !submodule) {
    notFound();
    return null;
  }
  const snapshot = await createPlatformApplication().loadSnapshot();
  return <ModuleWorkspace module={module} submodule={submodule} snapshot={snapshot} filters={await searchParams} />;
}
