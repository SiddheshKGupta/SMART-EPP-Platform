import { expect, test } from "@playwright/test";

test("guided demo follows the connected Northstar case and remains open across workspace navigation", async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: "Start Demo Journey" });
  await start.click();
  await expect(page.getByRole("dialog", { name: "Guided Demo Journey" })).toBeVisible();
  await expect(page.getByText("Northstar Consulting Private Limited")).toBeVisible();
  await page.getByRole("button", { name: "Open current step" }).click();
  await expect(page).toHaveURL(/\/programmes\/readiness/);
  await page.getByRole("button", { name: "Next journey step" }).click();
  await expect(page).toHaveURL(/\/employees\/enrolment/);
  await expect(page.getByRole("dialog", { name: "Guided Demo Journey" })).toBeVisible();
  await page.getByRole("button", { name: "Previous journey step" }).click();
  await expect(page).toHaveURL(/\/programmes\/readiness/);
  await page.getByRole("button", { name: "Exit Demo" }).click();
  await expect(page.getByRole("dialog", { name: "Guided Demo Journey" })).toHaveCount(0);
  await expect(start).toBeFocused();
});
