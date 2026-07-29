import { expect, test } from "@playwright/test";

test("filters purchases and opens adaptive eligibility evidence", async ({
  page,
}) => {
  await page.goto("/subvention/transactions");
  await page
    .getByPlaceholder("Search lease, IMEI/serial, invoice, employer")
    .fill("351234567890123");
  await page.getByRole("row", { name: /351234567890123/ }).click();

  await expect(
    page.getByRole("heading", { name: /Transaction evidence/ }),
  ).toBeVisible();
  await expect(page.getByText("Invoice value")).toBeVisible();
  await expect(page.getByText("source-purchases-april.xlsx")).toBeVisible();
  await expect(page.getByText("Connect Equipment Leasing")).toBeVisible();
});

test("evaluates a transaction and shows ordered rule trace", async ({
  page,
}) => {
  await page.goto("/subvention/eligibility");
  await page.getByRole("row", { name: /LES-1001/ }).click();
  await page.getByRole("button", { name: "Evaluate eligibility" }).click();

  await expect(page.getByText("Eligible", { exact: true })).toBeVisible();
  await expect(page.getByText("Programme mapping resolved")).toBeVisible();
  await expect(page.getByText("Scheme effective")).toBeVisible();
  await expect(page.getByText("Expected subvention")).toBeVisible();
});

test("shows an expired transaction as exception review", async ({ page }) => {
  await page.goto("/subvention/eligibility?status=EXCEPTION_REVIEW");
  await page.getByRole("row", { name: /Filing timeline expired/ }).click();

  await expect(page.getByText("Authorised override required")).toBeVisible();
});

test("bulk evaluation reports each outcome independently", async ({ page }) => {
  await page.goto("/subvention/eligibility");
  await page.getByLabel("Select LES-1001").check();
  await page.getByLabel("Select LES-1002").check();
  await page.getByRole("button", { name: "Evaluate 2 selected" }).click();

  await expect(page.getByText(/2 evaluated/)).toBeVisible();
  await expect(page.getByText(/Eligible.*₹/)).toBeVisible();
});

test("purchase repository exports the filtered view and exposes quarantine", async ({
  page,
}) => {
  await page.goto("/subvention/transactions");
  await page.getByRole("button", { name: "Import transactions" }).click();

  await expect(page.getByText("Atomic import summary")).toBeVisible();
  await expect(page.getByRole("cell", { name: "FORMULA_ROW" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Classify this workbook row/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export filtered CSV" }),
  ).toBeVisible();
});

test("transaction evidence is keyboard-safe at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/subvention/transactions");
  await page
    .getByPlaceholder("Search lease, IMEI/serial, invoice, employer")
    .fill("351234567890123");
  const row = page.getByRole("row", { name: /351234567890123/ });

  await row.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Transaction evidence · LES-1001",
      exact: true,
    }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(row).toBeFocused();
});
