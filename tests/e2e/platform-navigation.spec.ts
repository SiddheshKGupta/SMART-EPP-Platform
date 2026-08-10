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

test("collapsing capability navigation reclaims its shell track", async ({ page }) => {
  await page.goto("/");
  const shell = page.locator(".platform-shell");
  const expandedColumns = await shell.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns,
  );

  await page.getByRole("button", { name: "Collapse capability navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Expand capability navigation" }),
  ).toBeVisible();
  await expect.poll(async () => shell.evaluate((element) => getComputedStyle(element).gridTemplateColumns)).not.toBe(expandedColumns);

  await page.getByRole("button", { name: "Expand capability navigation" }).click();
  await expect.poll(async () => shell.evaluate((element) => getComputedStyle(element).gridTemplateColumns)).toBe(expandedColumns);
});

for (const width of [768, 375]) {
  test(`global controls remain available at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const name of ["Start Demo Journey", "Work queue", "Alerts", "Integration health"]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }
  });
}

test("command palette preserves the Subvention control desk route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open command menu" }).click();
  await page.getByRole("option", { name: "Subvention: Control Desk" }).click();
  await expect(page).toHaveURL(/\/subvention$/);
});
