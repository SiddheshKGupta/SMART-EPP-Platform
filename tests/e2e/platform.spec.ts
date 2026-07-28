import { expect, test } from "@playwright/test";

test("command centre", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Command Centre" }),
  ).toBeVisible();
});

test("subvention", async ({ page }) => {
  await page.goto("/subvention");
  await expect(
    page.getByRole("heading", { level: 1, name: "Subvention Control Desk" }),
  ).toBeVisible();
});
