import { expect, test } from "@playwright/test";

test("scheme uses maker-checker and locks approved version", async ({
  page,
}) => {
  await page.goto("/subvention/schemes");
  await page
    .getByRole("row", { name: /APL-CORP-Q3-26.*Draft/i })
    .click();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page
    .getByLabel("Submission remarks")
    .fill("Commercial terms checked");
  await page.getByRole("button", { name: "Submit scheme" }).click();
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Active role" }).click();
  await page
    .getByRole("option", { name: "Business Head Checker" })
    .click();
  await page.getByRole("button", { name: "Approve scheme" }).click();
  await page
    .getByLabel("Approval remarks")
    .fill("Approved against BH-2026-014");
  await page.getByRole("button", { name: "Confirm approval" }).click();

  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit scheme" })).toBeDisabled();
  await page.getByRole("tab", { name: "Audit" }).click();
  await expect(page.getByText("SCHEME_APPROVED")).toBeVisible();
});

test("scheme prevents a maker from approving own work", async ({ page }) => {
  await page.goto("/subvention/schemes");
  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Master Data Admin" }).click();

  await page
    .getByRole("row", { name: /APL-CORP-Q3-26.*Draft/i })
    .click();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page
    .getByLabel("Submission remarks")
    .fill("Submitted by the scheme maker");
  await page.getByRole("button", { name: "Submit scheme" }).click();

  await page.getByRole("button", { name: "Approve scheme" }).click();
  await page
    .getByLabel("Approval remarks")
    .fill("Attempting self approval");
  await page.getByRole("button", { name: "Confirm approval" }).click();

  await expect(page.getByText("Maker cannot approve own work")).toBeVisible();
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible();
});

test("programme mappings expose conflict recovery and unevaluated impact", async ({
  page,
}) => {
  await page.goto("/subvention/schemes");
  await page.getByRole("tab", { name: "Programme mappings" }).click();

  const conflict = page.getByRole("row", {
    name: /employer-unmapped.*programme-apple/i,
  });
  await expect(conflict).toContainText("Conflict");
  await conflict.click();
  await expect(page.getByText("Not evaluated", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Review validity and product scope",
    }),
  ).toBeVisible();
});

test("adaptive detail moves focus in and returns it to the selected row", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/subvention/schemes");
  const row = page.getByRole("row", {
    name: /APL-CORP-Q3-26.*Draft/i,
  });

  await row.click();
  const heading = page.getByRole("heading", {
    name: "APL-CORP-Q3-26",
    exact: true,
  });
  await expect(heading).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(row).toBeFocused();
});
