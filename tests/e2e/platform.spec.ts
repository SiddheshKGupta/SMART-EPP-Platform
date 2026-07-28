import { expect, test } from "@playwright/test";

test("role-aware home drills attention into source work", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "My Workbench" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Subvention" }).click();
  await expect(
    page.getByRole("heading", { name: "Subvention Control Desk" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Exceptions due within 7 days/ }).click();
  await expect(page).toHaveURL(/eligibility\?deadline=7d/);
});

test("subvention", async ({ page }) => {
  await page.goto("/subvention");
  await expect(
    page.getByRole("heading", { level: 1, name: "Subvention Control Desk" }),
  ).toBeVisible();
});
