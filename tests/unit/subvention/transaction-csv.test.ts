import { describe, expect, it } from "vitest";
import {
  buildTransactionCsv,
  escapeCsvCell,
} from "../../../apps/web/features/subvention/transactions/transactionCsv";
import { createDemoSubventionSeed } from "../../../apps/web/features/subvention/data/seed";

describe("transaction CSV export", () => {
  it("neutralizes spreadsheet formulas in text cells", () => {
    expect(escapeCsvCell("=HYPERLINK(\"https://example.test\")")).toBe(
      "\"'=HYPERLINK(\"\"https://example.test\"\")\"",
    );
    expect(escapeCsvCell("+1+1")).toBe("\"'+1+1\"");
    expect(escapeCsvCell("-1+1")).toBe("\"'-1+1\"");
    expect(escapeCsvCell("@SUM(A1:A2)")).toBe("\"'@SUM(A1:A2)\"");
  });

  it("includes the complete filtered transaction record", () => {
    const snapshot = createDemoSubventionSeed();
    const transaction = {
      ...snapshot.transactions[0]!,
      employeeId: "=HYPERLINK(\"https://example.test\")",
    };
    const csv = buildTransactionCsv([
      { transaction, decision: undefined },
    ]);
    const [header, row] = csv.split("\n");

    expect(header).toContain("\"Employee\"");
    expect(header).toContain("\"Product\"");
    expect(header).toContain("\"Programme\"");
    expect(header).toContain("\"Distributor\"");
    expect(header).toContain("\"Reseller\"");
    expect(header).toContain("\"Lease status\"");
    expect(row).toContain("\"'=HYPERLINK(\"\"https://example.test\"\")\"");
  });
});
