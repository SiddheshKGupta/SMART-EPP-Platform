import { expect, test } from "@playwright/test";

test("renders the standalone Subvention control centre", async ({ page }) => {
  await page.goto("/subvention");

  await expect(page.getByRole("heading", { name: "Subvention Control Centre" })).toBeVisible();
  await expect(page.getByTestId("management-overview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review Transactions" })).toBeVisible();
  await expect(page.getByText("Developed by V L & CO", { exact: false }).first()).toBeVisible();

  await expect(page.getByRole("navigation", { name: "Subvention navigation" }).getByRole("link", { name: "Onboarding" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Subvention navigation" }).getByRole("link", { name: "Foreclosure" })).toHaveCount(0);
});

test("opens the dedicated Operations workbench", async ({ page }) => {
  await page.goto("/subvention/operations");
  await expect(page.getByRole("heading", { name: "Review Transactions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Operations workbench" })).toHaveAttribute("aria-current", "page");
});
