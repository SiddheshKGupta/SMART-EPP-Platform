import { moduleBySlug } from "@smart-epp/domain";
import { ModuleWorkspace } from "@/features/platform/workspaces/ModuleWorkspace";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";

export default function Page() {
  const module = moduleBySlug("foreclosure");
  if (!module) return null;
  return <ModuleWorkspace module={module} snapshot={createPlatformDemoSeed()} filters={{}} />;
}
