import { expect, test } from "@playwright/test";

test.describe("Subvention management overview", () => {
  test.fixme(
    true,
    "Task 8 owns landing-page composition; remove this marker when ManagementOverview is mounted on /subvention.",
  );

  test("filters the financial position and drills into the exact records", async ({ page }) => {
    await page.goto("/subvention?fy=2026-27&quarter=Q1");

    await expect(page.getByRole("heading", { name: "Subvention financial position" })).toBeVisible();
    await page.getByRole("button", { name: /Payment due/ }).click();
    await expect(page.getByRole("dialog", { name: "Payment due" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Payment due source records" })).toContainText("CLM-RED-2026-041");

    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("combobox", { name: "Quarter" }).click();
    await page.getByRole("option", { name: "Q2" }).click();
    await expect(page).toHaveURL(/quarter=Q2/);
    await expect(page).not.toHaveURL(/month=/);
  });
});
