import { expect, test } from "@playwright/test";

test("admin keeps IAM, BRE, and workflow configuration separate", async ({ page }) => {
  await page.goto("/admin");
  for (const name of ["IAM", "Masters", "BRE Engine", "Workflow Configuration", "Integrations", "Audit & System Logs", "Platform Settings"]) await expect(page.getByRole("link", { name })).toBeVisible();
});

test("integration simulator changes mock state without a live connector", async ({ page }) => {
  await page.goto("/admin/integrations");
  await expect(page.getByText("Demo only", { exact: true })).toBeVisible();
  await expect(page.getByText("No live connection or credential is used", { exact: true })).toBeVisible();
  const tally = page.getByRole("row", { name: /Tally/ });
  await expect(tally.getByRole("button", { name: "Simulate partial failure" })).toBeDisabled();
  await expect(tally.getByText("Requires IAM permission")).toBeVisible();
  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Admin" }).click();
  await tally.getByRole("button", { name: "Simulate partial failure" }).click();
  await expect(tally.getByText("Partial", { exact: true })).toBeVisible();
  await tally.getByRole("button", { name: "Retry mock sync" }).click();
  await expect(tally.getByText("Healthy", { exact: true })).toBeVisible();
  await expect(page.getByText(/MOCK_INTEGRATION_SUCCESS/)).toBeVisible();
});
