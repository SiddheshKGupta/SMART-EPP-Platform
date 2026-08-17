import { describe, expect, it } from "vitest";
import { resolveCommandCentreView } from "@/features/platform/command-centre/command-centre-route";

describe("Command Centre route contract", () => {
  it.each([
    [undefined, "operations", "Command Centre", ["workItems", "overdue", "approvals", "alerts", "integrations"]],
    ["executive-overview", "executive", "Executive Overview", ["health", "sanction", "utilised", "exposure", "pipeline"]],
    ["control-alerts", "operations", "Exceptions and Control Alerts", ["alerts", "approvals"]],
    ["integration-health", "operations", "Integration Health", ["integrations"]],
    ["exposure-utilisation", "executive", "Exposure and Utilisation", ["sanction", "utilised", "exposure"]],
    ["guided-demo", "operations", "Guided Demo Journey", ["workItems", "approvals", "alerts"]],
  ] as const)(
    "maps %s to the %s lens and its source-backed view",
    (slug, expectedLens, expectedTitle, expectedMetrics) => {
      expect(resolveCommandCentreView(slug)).toEqual(
        expect.objectContaining({
          lens: expectedLens,
          title: expectedTitle,
          metricKeys: expectedMetrics,
        }),
      );
    },
  );
});
