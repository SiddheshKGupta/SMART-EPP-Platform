import { expect, test, type Locator, type Page } from "@playwright/test";

async function tabTo(
  page: Page,
  target: Locator,
  options: { reverse?: boolean; limit?: number } = {},
) {
  const key = options.reverse ? "Shift+Tab" : "Tab";
  for (let index = 0; index <= (options.limit ?? 80); index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`Keyboard traversal did not reach ${await target.getAttribute("aria-label") ?? await target.textContent()}`);
}

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectContainedOrScrollable(region: Locator) {
  const state = await region.evaluate((element) => {
    const style = getComputedStyle(element);
    const before = { left: element.scrollLeft, top: element.scrollTop };
    const horizontal = element.scrollWidth > element.clientWidth;
    const vertical = element.scrollHeight > element.clientHeight;
    if (horizontal) element.scrollLeft = element.scrollWidth;
    if (vertical) element.scrollTop = element.scrollHeight;
    return {
      before,
      after: { left: element.scrollLeft, top: element.scrollTop },
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
    };
  });

  if (state.scrollWidth > state.clientWidth) {
    expect(["auto", "scroll"]).toContain(state.overflowX);
    expect(state.after.left).toBeGreaterThan(state.before.left);
  } else {
    expect(state.scrollWidth).toBeLessThanOrEqual(state.clientWidth);
  }
  if (state.scrollHeight > state.clientHeight) {
    expect(["auto", "scroll"]).toContain(state.overflowY);
    expect(state.after.top).toBeGreaterThanOrEqual(state.before.top);
  }
}

const responsiveViewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

for (const viewport of responsiveViewports) {
  test(`platform has no page overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expectNoPageOverflow(page);
  });
}

for (const viewport of responsiveViewports) {
  test(`data workspace contains subnavigation, table, and inspector at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/applications/register");
    await expectNoPageOverflow(page);
    await expectContainedOrScrollable(page.locator(".module-links"));
    await expectContainedOrScrollable(page.locator(".operations-table-scroll"));

    const inspect = page.getByRole("button", { name: "Inspect Application 01" });
    await inspect.scrollIntoViewIfNeeded();
    await expect(inspect).toBeVisible();
    await inspect.click();

    const inspector = page.getByRole("dialog", { name: "Application 01 inspector" });
    const box = await inspector.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    await expect(inspector.getByRole("button", { name: "Close inspector" })).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test(`admin integrations retain usable controls and contained data at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/admin/integrations");
    await expectNoPageOverflow(page);
    await expectContainedOrScrollable(page.locator(".integration-simulator .operations-table-scroll"));

    const tally = page.getByRole("row", { name: /Tally/ });
    const denied = tally.getByText("Requires IAM permission", { exact: true });
    await denied.scrollIntoViewIfNeeded();
    await expect(denied).toBeVisible();
    const deniedBox = await denied.boundingBox();
    expect(deniedBox).not.toBeNull();
    expect(deniedBox!.x).toBeGreaterThanOrEqual(0);
    expect(deniedBox!.x + deniedBox!.width).toBeLessThanOrEqual(viewport.width + 1);
  });
}

test("keyboard users can reach shell controls and the workspace inspector with visible focus", async ({ page }) => {
  await page.goto("/applications/register");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-width", "3px");

  const capability = page.getByRole("link", { name: "Employer Programmes" });
  await tabTo(page, capability, { limit: 24 });
  await expect(capability).toBeFocused();
  expect(await capability.evaluate((element) => element.matches(":focus-visible"))).toBe(true);

  const submodule = page.getByRole("link", { name: "New Applications" });
  await tabTo(page, submodule, { limit: 30 });
  await expect(submodule).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/applications\/new$/);

  const commandAction = page.getByRole("button", { name: "Work queue" });
  await tabTo(page, commandAction, { reverse: true, limit: 12 });
  await expect(commandAction).toBeFocused();
  expect(await commandAction.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/\/workbench\/my-tasks$/);

  await page.goto("/applications/register");
  const commandMenu = page.getByRole("button", { name: "Open command menu" });
  await tabTo(page, commandMenu, { limit: 50 });
  await expect(commandMenu).toBeFocused();
  expect(await commandMenu.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Platform navigation" })).toBeVisible();
  await page.keyboard.press("Escape");

  const inspect = page.getByRole("button", { name: "Inspect Application 01" });
  await tabTo(page, inspect, { limit: 50 });
  await expect(inspect).toBeFocused();
  expect(await inspect.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Application 01 inspector" })).toBeVisible();
});

test("operational metadata never renders below twelve pixels", async ({ page }) => {
  await page.goto("/applications/register");
  await page.getByRole("button", { name: "Inspect Application 01" }).click();

  const sizes = await page
    .locator(".workspace-kpi small, .workspace-inspector-panel dt")
    .evaluateAll((elements) =>
      elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    );

  expect(sizes.length).toBeGreaterThan(0);
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
});

test("command centre exposes operations and executive lenses to every profile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Command Centre" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Operations" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Executive" })).toBeVisible();
  await page.getByRole("tab", { name: "Executive" }).click();
  await expect(page.getByText("Exposure and utilisation")).toBeVisible();
});

test("workbench retains all queue types without hiding modules", async ({ page }) => {
  await page.goto("/workbench");
  await expect(page.getByRole("tab", { name: "My Tasks" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Approvals" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Exceptions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Employer Programmes" })).toBeVisible();
});

test("workbench consumes KPI queue and status filters exactly", async ({ page }) => {
  await page.goto("/workbench?queue=team-queues&status=OVERDUE");
  await expect(page.getByRole("tab", { name: "Team Queues" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("2 records · OVERDUE")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
  await page.goto("/workbench?queue=my-approvals");
  await expect(page.getByRole("tab", { name: "My Approvals" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("1 record", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
  await expect(page.getByText(/Requires IAM permission/)).toBeAttached();
});

test("command and workbench tabs implement roving keyboard activation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[role="tabpanel"][id^="command-panel-"]')).toHaveCount(2);
  await expect(page.locator("#command-panel-operations")).not.toHaveAttribute("hidden");
  await expect(page.locator("#command-panel-executive")).toHaveAttribute("hidden", "");
  const operations = page.getByRole("tab", { name: "Operations" });
  await tabTo(page, operations, { limit: 50 });
  await page.keyboard.press("ArrowRight");
  const executive = page.getByRole("tab", { name: "Executive" });
  await expect(executive).toBeFocused();
  await expect(executive).toHaveAttribute("aria-selected", "true");
  await expect(executive).toHaveAttribute("aria-controls", "command-panel-executive");
  await page.goto("/workbench");
  await expect(page.locator('[role="tabpanel"][id^="workbench-panel-"]')).toHaveCount(9);
  const first = page.getByRole("tab", { name: "My Tasks" });
  await tabTo(page, first, { limit: 50 });
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Recently Viewed" })).toBeFocused();
});

test("command metrics use two tablet columns and one mobile column", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  await expect.poll(() => page.locator(".command-metric-grid:not([hidden])").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);
  await page.setViewportSize({ width: 760, height: 900 });
  await expect.poll(() => page.locator(".command-metric-grid:not([hidden])").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(1);
});

test("sanction and utilisation destination renders employer evidence totals", async ({ page }) => {
  await page.goto("/portfolio/sanction-utilisation");
  await expect(page.getByRole("heading", { name: "Sanction and Exposure Utilisation" })).toBeVisible();
  await expect(page.getByText("₹15,50,000.00", { exact: true })).toBeVisible();
  await expect(page.getByText("₹10,29,000.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(4);
});

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

test("mobile workspace inspector is a contained full-height sheet with accessible controls", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/applications/register");
  const inspect = page.getByRole("button", { name: "Inspect Application 01" });
  await expect(inspect).toBeVisible();
  expect((await inspect.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await inspect.click();
  const inspector = page.getByRole("dialog", { name: "Application 01 inspector" });
  await expect(inspector).toBeVisible();
  const inspectorBox = await inspector.boundingBox();
  expect(inspectorBox?.width).toBeLessThanOrEqual(375);
  expect(inspectorBox?.height).toBeGreaterThanOrEqual(800);
  const close = inspector.getByRole("button", { name: "Close inspector" });
  expect((await close.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(inspector).toHaveCount(0);
  await expect(inspect).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
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
