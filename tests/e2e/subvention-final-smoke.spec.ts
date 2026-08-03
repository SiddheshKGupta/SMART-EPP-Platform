import { expect, test } from "@playwright/test";

test("management metrics drill into their live claim records", async ({ page }) => {
  await page.goto("/subvention");
  const metrics = page.getByLabel("Financial metrics");
  await expect(metrics).toBeVisible();
  await metrics.getByRole("button").first().click();
  await expect(page.getByText("Source records", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("operations opens the controlled evidence drawer", async ({ page }) => {
  await page.goto("/subvention/operations");
  await page.getByRole("button", { name: /Review evidence|Open evidence|Review exception/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Purchase order", { exact: true })).toBeVisible();
  await expect(page.getByText("Vendor invoice", { exact: true })).toBeVisible();
});

test("claims exposes preparation and lifecycle workspaces", async ({ page }) => {
  await page.goto("/subvention/claims");
  await expect(page.getByRole("heading", { name: "Ready by settlement route" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lifecycle position" })).toBeVisible();
});
