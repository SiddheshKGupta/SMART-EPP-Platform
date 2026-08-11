import { moduleBySlug } from "@smart-epp/domain";
import { ModuleWorkspace } from "@/features/platform/workspaces/ModuleWorkspace";
import { createPlatformApplication } from "@/features/platform/server/platformApplication";

export default async function Page() {
  const module = moduleBySlug("foreclosure");
  if (!module) return null;
  const snapshot = await createPlatformApplication().loadSnapshot();
  return <ModuleWorkspace module={module} snapshot={snapshot} filters={{}} />;
}
