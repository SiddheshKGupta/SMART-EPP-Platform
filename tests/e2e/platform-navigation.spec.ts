import { expect, test } from "@playwright/test";

test("every approved capability is visible and navigable", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "SMART EPP capabilities",
  });

  await expect(
    navigation.getByRole("link", { name: "Employer Programmes" }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Foreclosure" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Admin" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Employees" })).toHaveAttribute(
    "href",
    "/employees",
  );
});

test("subvention keeps its workspace inside the common shell", async ({ page }) => {
  await page.goto("/subvention");
  await expect(
    page.getByRole("navigation", { name: "SMART EPP capabilities" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Subvention Control Desk" }),
  ).toBeVisible();
});
