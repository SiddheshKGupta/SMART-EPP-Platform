import { expect, test } from "@playwright/test";

function luminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4),
    );
  return (
    0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  );
}

function contrastRatio(first: string, second: string): number {
  const brighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (brighter + 0.05) / (darker + 0.05);
}

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
  await expect(
    page.getByRole("heading", { name: "Eligibility Review Queue" }),
  ).toBeVisible();
  await expect(page.getByText("deadline", { exact: true })).toBeVisible();
  await expect(page.getByText("7d", { exact: true })).toBeVisible();
  await expect(page.getByText("404", { exact: true })).toHaveCount(0);
});

test("subvention", async ({ page }) => {
  await page.goto("/subvention");
  await expect(
    page.getByRole("heading", { level: 1, name: "Subvention Control Desk" }),
  ).toBeVisible();
});

test("approval KPIs drill into exactly the submitted master type counted", async ({
  page,
}) => {
  await page.goto("/subvention");

  const schemes = page.getByRole("link", {
    name: /Scheme approvals waiting 0/,
  });
  const mappings = page.getByRole("link", {
    name: /Programme mapping approvals waiting 1/,
  });
  await expect(schemes).toBeVisible();
  await expect(mappings).toBeVisible();

  await mappings.click();
  await expect(page).toHaveURL(
    /subvention\/programme-mappings\?status=SUBMITTED/,
  );
  await expect(
    page.getByRole("row", {
      name: /employer-epsilon.*programme-samsung.*Submitted/i,
    }),
  ).toBeVisible();
});

test("moves focus to the destination heading after client navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Subvention" }).click();

  await expect(
    page.getByRole("heading", { name: "Subvention Control Desk" }),
  ).toBeFocused();
});

test("every exposed route contract renders its heading and active filter", async ({
  page,
}) => {
  const destinations = [
    ["/subvention/schemes?status=DRAFT", "Scheme Versions", "DRAFT"],
    [
      "/subvention/programme-mappings?status=SUBMITTED",
      "Programme Mappings",
      "SUBMITTED",
    ],
    [
      "/subvention/purchase-imports?status=QUARANTINED",
      "Purchase Imports",
      "QUARANTINED",
    ],
    ["/subvention/claims?status=OPEN", "Claims Register", "OPEN"],
    [
      "/subvention/reconciliation?state=UNMATCHED",
      "Reconciliation",
      "UNMATCHED",
    ],
    ["/subvention/recovery?status=DUE", "Recovery", "DUE"],
    ["/audit?entity=PurchaseTransaction", "Audit Trail", "PurchaseTransaction"],
  ] as const;

  for (const [href, heading, filterValue] of destinations) {
    await page.goto(href);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByText(filterValue, { exact: true })).toBeVisible();
    await expect(page.getByText("404", { exact: true })).toHaveCount(0);
  }
});

test("opaque focus tokens meet contrast and keyboard focus is visible on the rail", async ({
  page,
}) => {
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      focusOnLight: root.getPropertyValue("--focus-on-light").trim(),
      focusOnDark: root.getPropertyValue("--focus-on-dark").trim(),
      surface: root.getPropertyValue("--surface").trim(),
      navy: root.getPropertyValue("--navy").trim(),
    };
  });

  expect(contrastRatio(tokens.focusOnLight, tokens.surface)).toBeGreaterThanOrEqual(
    3,
  );
  expect(contrastRatio(tokens.focusOnDark, tokens.navy)).toBeGreaterThanOrEqual(3);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const railLink = page.getByRole("link", { name: "My Workbench" });
  await expect(railLink).toBeFocused();
  await expect(railLink).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  await expect(railLink).toHaveCSS("outline-width", "3px");
});
