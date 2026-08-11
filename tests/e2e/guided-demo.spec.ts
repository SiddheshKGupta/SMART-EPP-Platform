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

for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
] as const) {
  test(`guided journey remains keyboard-operable without page overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const start = page.getByRole("button", { name: "Start Demo Journey" });
    await start.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Guided Demo Journey" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("CURRENT", { exact: true })).toBeVisible();

    const openStep = dialog.getByRole("button", { name: "Open current step" });
    await openStep.focus();
    await expect(openStep).toBeFocused();
    expect(await openStep.evaluate((element) => element.matches(":focus-visible"))).toBe(true);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(start).toBeFocused();
  });
}
