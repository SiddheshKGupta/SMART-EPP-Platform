import { expect, test, type Locator, type Page } from "@playwright/test";

async function tabTo(page: Page, target: Locator, limit = 80) {
  for (let index = 0; index <= limit; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard traversal did not reach ${await target.textContent()}`);
}

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
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const) {
  test(`guided journey remains keyboard-operable without page overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const start = page.getByRole("button", { name: "Start Demo Journey" });
    await tabTo(page, start, 50);
    await expect(start).toBeFocused();
    expect(await start.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    await page.keyboard.press("Space");

    const dialog = page.getByRole("dialog", { name: "Guided Demo Journey" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("CURRENT", { exact: true })).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width + 1);

    const openStep = dialog.getByRole("button", { name: "Open current step" });
    await tabTo(page, openStep, 12);
    await expect(openStep).toBeFocused();
    expect(await openStep.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/programmes\/readiness/);

    const next = dialog.getByRole("button", { name: "Next journey step" });
    await tabTo(page, next, 12);
    await expect(next).toBeFocused();
    expect(await next.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/employees\/enrolment/);

    const previous = dialog.getByRole("button", { name: "Previous journey step" });
    await tabTo(page, previous, 12);
    await expect(previous).toBeFocused();
    expect(await previous.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/programmes\/readiness/);

    const exit = dialog.getByRole("button", { name: "Exit Demo" });
    await tabTo(page, exit, 12);
    await expect(exit).toBeFocused();
    expect(await exit.evaluate((element) => element.matches(":focus-visible"))).toBe(true);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const scrollState = await dialog.evaluate((element) => {
      const before = element.scrollTop;
      element.scrollTop = element.scrollHeight;
      return {
        before,
        after: element.scrollTop,
        clientHeight: element.clientHeight,
        overflowY: getComputedStyle(element).overflowY,
        scrollHeight: element.scrollHeight,
      };
    });
    if (scrollState.scrollHeight > scrollState.clientHeight) {
      expect(["auto", "scroll"]).toContain(scrollState.overflowY);
      expect(scrollState.after).toBeGreaterThan(scrollState.before);
    }

    await page.keyboard.press("Space");
    await expect(dialog).toHaveCount(0);
    await expect(start).toBeFocused();
  });
}
