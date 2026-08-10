import { expect, test } from "@playwright/test";

const destinations = [
  ["/programmes/credit-handoff", "Credit Handoff"],
  ["/employees/enrolment", "Employee Enrolment"],
  ["/applications/exposure-lifecycle", "Reservation, Utilisation and Release"],
  ["/assets/device-identifiers", "Serial/IMEI Identification"],
  ["/orders/lease-handoff", "Lease-Execution Handoff"],
  ["/portfolio/sanction-utilisation", "Sanction and Exposure Utilisation"],
  ["/billing/tally-handoff", "Tally Handoff and Status"],
  ["/foreclosure/checker-validation", "Checker Validation"],
  ["/documents/evidence-links", "Evidence Links"],
  ["/exceptions/reconciliation-breaks", "Reconciliation Breaks"],
  ["/reports/management", "Management Dashboard"],
  ["/admin/bre-engine", "BRE Engine"],
] as const;

for (const [href, heading] of destinations) {
  test(`${href} resolves to its read-only workspace`, async ({ page }) => {
    await page.goto(href);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByText("Read only", { exact: true })).toBeVisible();
    await expect(page.getByText(/Source freshness:/)).toBeVisible();
    await expect(page.getByText("404", { exact: true })).toHaveCount(0);
  });
}

test("unknown platform workspace returns 404", async ({ page }) => {
  await page.goto("/programmes/not-a-workspace");
  await expect(page.getByText("404", { exact: true })).toBeVisible();
});

test("unknown platform module returns 404", async ({ page }) => {
  await page.goto("/not-a-module");
  await expect(page.getByText("404", { exact: true })).toBeVisible();
});

test("module overview, onboarding redirect and foreclosure share the workspace contract", async ({ page }) => {
  await page.goto("/programmes");
  await expect(page.getByRole("heading", { name: "Employer Programmes" })).toBeVisible();
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/programmes\/readiness$/);
  await page.goto("/foreclosure");
  await expect(page.getByRole("heading", { name: "Foreclosure" })).toBeVisible();
  await expect(page.getByText("Read only", { exact: true })).toBeVisible();
});

test("workspace filters and inspector preserve operational context", async ({ page }) => {
  await page.goto("/applications/register");
  await page.getByLabel("Filter by operating state").selectOption("OVERDUE");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("1 active filter")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Inspect Application 05" }).click();
  const inspector = page.getByRole("dialog", { name: "Application 05 inspector" });
  await expect(inspector).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(inspector).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Inspect Application 05" })).toBeFocused();
  await page.getByRole("link", { name: "Reset" }).click();
  await expect(page.getByText("All records")).toBeVisible();
});

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
      const control = page.getByRole("button", { name });
      await expect(control).toBeVisible();
      expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    const commandBar = await page.locator(".command-bar").boundingBox();
    const main = await page.locator("#main-content").boundingBox();
    expect(commandBar?.y! + commandBar?.height!).toBeLessThanOrEqual(main?.y!);
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(width);
  });
}

test("collapsed capability shell remains one column on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Collapse capability navigation" }).click();
  const columns = await page.locator(".platform-shell").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns,
  );
  expect(columns.split(" ")).toHaveLength(1);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("command palette preserves the Subvention control desk route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open command menu" }).click();
  await page.getByRole("option", { name: "Subvention: Control Desk" }).click();
  await expect(page).toHaveURL(/\/subvention$/);
});
