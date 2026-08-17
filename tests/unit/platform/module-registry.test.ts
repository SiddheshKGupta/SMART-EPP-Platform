import { describe, expect, it } from "vitest";
import {
  PLATFORM_MODULES,
  moduleBySlug,
  submoduleByPath,
} from "@smart-epp/domain";

describe("platform module registry", () => {
  it("exposes the approved fifteen capabilities with unique paths", () => {
    expect(PLATFORM_MODULES).toHaveLength(15);
    expect(new Set(PLATFORM_MODULES.map((item) => item.slug)).size).toBe(15);
    expect(PLATFORM_MODULES.map((item) => item.label)).toContain("Foreclosure");
    expect(PLATFORM_MODULES.map((item) => item.label)).not.toContain(
      "Foreclosure & Closure",
    );
  });

  it("resolves admin configuration and integration routes", () => {
    expect(moduleBySlug("admin")?.label).toBe("Admin");
    expect(submoduleByPath("admin", ["bre-engine"])?.label).toBe("BRE Engine");
    expect(submoduleByPath("admin", ["integrations"])?.demoOnly).toBe(true);
  });
});
