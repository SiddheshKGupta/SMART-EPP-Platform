import { expect, test } from "@playwright/test";

async function switchToMasterAdmin(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Master Data Admin" }).click();
}

test("master admin creates a reseller and sees its audit history", async ({ page }) => {
  await page.goto("/subvention/masters?kind=RESELLER");
  await switchToMasterAdmin(page);

  await page.getByRole("button", { name: "Add reseller" }).click();
  await page.getByLabel("Code").fill("RS-NEW");
  await page.getByLabel("Name").fill("New Channel Systems Private Limited");
  await page.getByLabel("OEM").click();
  await page.getByRole("option", { name: "Apple" }).click();
  await page.getByLabel("National distributor").click();
  await page
    .getByRole("option", { name: "Ingram Micro India Private Limited" })
    .click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("RS-NEW saved and logged.")).toBeVisible();
  await page.getByRole("button", { name: "View history" }).click();
  await expect(page.getByText("MASTER_DATA_WORKBENCH")).toBeVisible();
});

test("failed duplicate save keeps the form and entered values", async ({ page }) => {
  await page.goto("/subvention/masters?kind=RESELLER");
  await switchToMasterAdmin(page);
  await page.getByRole("button", { name: "Add reseller" }).click();
  await page.getByLabel("Code").fill("RADIUS");
  await page.getByLabel("Name").fill("Duplicate Radius");
  await page.getByLabel("OEM").click();
  await page.getByRole("option", { name: "Apple" }).click();
  await page.getByLabel("National distributor").click();
  await page
    .getByRole("option", { name: "Ingram Micro India Private Limited" })
    .click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("This record needs correction")).toBeVisible();
  await expect(page.getByLabel("Code")).toHaveValue("RADIUS");
  await expect(page.getByLabel("Name")).toHaveValue("Duplicate Radius");
});

test("read-only roles cannot maintain masters and hierarchy links filter catalogues", async ({ page }) => {
  await page.goto("/subvention/masters");
  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Management Viewer" }).click();
  await expect(page.getByRole("button", { name: "Add OEM" })).toBeDisabled();
  await expect(page.getByText(/Read-only view/)).toBeVisible();

  await page.goto("/subvention/administration/data-model");
  await page.getByRole("link", { name: /Reseller \/ vendor/ }).click();
  await expect(page).toHaveURL(/subvention\/masters\?kind=RESELLER/);
  await expect(page.getByRole("heading", { name: "Resellers / vendors" })).toBeVisible();
});
