import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const artifact = pathToFileURL(
  resolve(process.cwd(), "Smart_EPP_Subvention_Standalone.html"),
).href;

test("runs the complete Subvention prototype directly from one offline HTML file", async ({ page }) => {
  const errors: string[] = [];
  const networkRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) networkRequests.push(request.url());
  });

  await page.goto(artifact);
  await expect(page.getByRole("heading", { name: "Subvention Control Centre" })).toBeVisible();
  await expect(page.getByText("Developed by V L & CO", { exact: false }).first()).toBeVisible();

  await page.getByRole("link", { name: "Scheme versions" }).click();
  await expect(page.getByRole("button", { name: "Add scheme" })).toBeVisible();
  await page.getByRole("button", { name: "Add scheme" }).click();
  await page.getByLabel("Scheme code").fill("OFFLINE-TEST-27");
  await page.getByLabel("Scheme name").fill("Offline persistence test");
  await page.getByRole("dialog").locator("select").nth(2).selectOption("distributor-ingram");
  await page.getByLabel("Effective from").fill("2027-01-01");
  await page.getByLabel("Effective to").fill("2027-03-31");
  await page.getByRole("group", { name: "Eligible products" }).getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Create scheme draft" }).click();
  await expect(page.getByRole("cell", { name: "OFFLINE-TEST-27" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("cell", { name: "OFFLINE-TEST-27" })).toBeVisible();

  await page.getByRole("link", { name: "Programme mappings" }).click();
  await expect(page.getByRole("heading", { name: "Programme Mappings" })).toBeVisible();
  await page.getByText("Maruti Suzuki India Limited", { exact: true }).last().click();
  await page.getByRole("tab", { name: "Configuration" }).click();
  await expect(page.getByText("Base value", { exact: true })).toBeVisible();
  await expect(page.getByText("MARUTI-APPLE-BASE-VALUE-CLAUSE", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Upload documents" }).click();
  const picker = page.locator('input[type="file"][accept*=".pdf"]');
  await picker.setInputFiles({ name: "FEPL10012_invoice.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await expect(page.getByText("FEPL10012_invoice.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Process 1 document/ }).click();
  await expect(page.getByText("Recognised", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Master data" }).click();
  await page.getByRole("button", { name: "Switch to Master Data Admin" }).click();
  await page.getByRole("button", { name: "Create editable version for APPLE" }).click();
  await page.getByLabel("Effective from").fill("2027-01-01");
  await page.getByLabel("Effective to").fill("2027-12-31");
  await page.getByRole("button", { name: "Create successor draft" }).click();
  await expect(page.getByText("Version 2 draft created from APPLE.", { exact: true })).toBeVisible();

  expect(networkRequests).toEqual([]);
  expect(errors).toEqual([]);
});
