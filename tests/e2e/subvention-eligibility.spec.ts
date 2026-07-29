import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
  await page.goto(
    "/subvention/eligibility?deadline=overdue&transaction=transaction-expired-01",
  );
  await page.getByRole("button", { name: "Evaluate eligibility" }).click();
  await page
    .getByRole("button", { name: /Exception review/ })
    .click();

  await expect(page).toHaveURL(/status=EXCEPTION_REVIEW/);
  await page.getByRole("row", { name: /Filing timeline expired/ }).click();
  await expect(page.getByText("Authorised override required")).toBeVisible();
});

test("bulk evaluation reports each outcome independently", async ({ page }) => {
  await page.goto("/subvention/eligibility");
  await page.getByLabel("Select LES-1001").check();
  await page.getByLabel("Select LES-1002").check();
  await page.getByRole("button", { name: "Evaluate 2 selected" }).click();

  await expect(page.getByText(/2 evaluated/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Eligible decisions 2/ }),
  ).toBeVisible();
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

test("restores blocked, transaction, overdue, and existing eligibility deep links", async ({
  page,
}) => {
  await page.goto("/subvention/eligibility?status=BLOCKED");
  await expect(
    page.getByRole("button", { name: /Blocked source/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("row", { name: /LES-1024/ })).toBeVisible();

  await page.goto(
    "/subvention/eligibility?transaction=transaction-eligible-01",
  );
  await expect(
    page.getByRole("heading", { name: /Eligibility review.*LES-1001/ }),
  ).toBeVisible();

  await page.goto(
    "/subvention/eligibility?deadline=overdue&transaction=transaction-expired-01",
  );
  await expect(
    page.getByRole("heading", { name: /Eligibility review.*LES-1021/ }),
  ).toBeVisible();
  await expect(page.getByText("Authorised override required")).toBeVisible();

  await page.goto("/subvention/eligibility?deadline=7d");
  await expect(
    page.getByRole("button", { name: /Due in 7 days/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("updates valid eligibility filters in the URL and degrades repeated parameters safely", async ({
  page,
}) => {
  await page.goto("/subvention/eligibility");
  await page.getByRole("button", { name: /Eligible decisions/ }).click();
  await expect(page).toHaveURL(/status=ELIGIBLE/);

  await page.goto(
    "/subvention/eligibility?status=ELIGIBLE&status=INELIGIBLE&deadline=bogus&transaction=missing",
  );
  await expect(
    page.getByRole("button", { name: /Awaiting evaluation/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: /Eligibility review/ }),
  ).toHaveCount(0);
});

test("keeps projections out of persisted decision queues and labels them as previews", async ({
  page,
}) => {
  await page.goto("/subvention/eligibility");

  await expect(
    page.getByRole("button", { name: /Eligible decisions 0/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ineligible decisions 0/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Exception review 0/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /LES-1001.*Awaiting evaluation/ }),
  ).toBeVisible();
});

test("Space toggles a focused bulk checkbox without opening its row", async ({
  page,
}) => {
  await page.goto("/subvention/eligibility");
  const checkbox = page.getByLabel("Select LES-1001");

  await checkbox.focus();
  await page.keyboard.press("Space");

  await expect(checkbox).toBeChecked();
  await expect(
    page.getByRole("heading", { name: /Eligibility review/ }),
  ).toHaveCount(0);
});

test("renders integer paise with two fractional digits", async ({ page }) => {
  await page.goto("/subvention/transactions");

  await expect(
    page.getByText("₹82,600.00", { exact: true }).first(),
  ).toBeVisible();
});

test("exports the complete filtered record", async ({ page }) => {
  await page.goto("/subvention/transactions");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export filtered CSV" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("CSV download path was not available");
  const csv = await readFile(path, "utf8");
  const [header] = csv.split(/\r?\n/, 1);

  expect(header).toContain("Employee");
  expect(header).toContain("Product");
  expect(header).toContain("Programme");
  expect(header).toContain("Distributor");
  expect(header).toContain("Reseller");
  expect(header).toContain("Lease status");
});

test("shows joinable quarantine audit identity and recovery guidance", async ({
  page,
}) => {
  await page.goto("/subvention/transactions");
  await page.getByRole("button", { name: "Import transactions" }).click();

  await expect(
    page.getByRole("columnheader", { name: "Import ID" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Audit row ID" }),
  ).toBeVisible();
  await expect(page.getByText(/purchase-import-/).first()).toBeVisible();
  await expect(page.getByText("sales-ops-maker").first()).toBeVisible();
  await expect(
    page.getByText(/sha256:synthetic-import-/).first(),
  ).toBeVisible();

  await page.goto(
    "/subvention/eligibility?deadline=overdue&transaction=transaction-expired-01",
  );
  await expect(page.getByText("Recovery action")).toBeVisible();
  await expect(
    page.getByText(/authorised, audited filing-timeline override/i),
  ).toBeVisible();
});

test("keeps Task 10 operational text at or above 12px", async ({ page }) => {
  await page.goto("/subvention/transactions");
  await page.getByRole("row", { name: /351234567890123/ }).click();

  for (const selector of [
    ".repository-table td",
    ".repository-table th",
    ".evidence-grid dt",
    ".evidence-grid dd",
  ]) {
    const size = await page.locator(selector).first().evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(size, selector).toBeGreaterThanOrEqual(12);
  }

  await page.goto(
    "/subvention/eligibility?deadline=overdue&transaction=transaction-expired-01",
  );
  for (const selector of [
    ".eligibility-table td",
    ".rule-trace-heading strong",
    ".rule-trace-heading span",
    ".rule-trace p",
    ".comparison-table th",
    ".comparison-table td",
  ]) {
    const size = await page.locator(selector).first().evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(size, selector).toBeGreaterThanOrEqual(12);
  }
});

test("does not animate keyboard-triggered or row-to-row inspector selection", async ({
  page,
}) => {
  await page.goto("/subvention/eligibility");
  await page.evaluate(() => {
    const mutations: string[] = [];
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (
          record.target instanceof HTMLElement &&
          record.target.classList.contains("adaptive-detail")
        ) {
          mutations.push(record.target.getAttribute("style") ?? "");
        }
      });
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
      childList: true,
      subtree: true,
    });
    Object.assign(window, {
      __task10InspectorMutations: mutations,
      __task10InspectorObserver: observer,
    });
  });

  const first = page.getByRole("row", { name: /LES-1001/ });
  await first.focus();
  await page.keyboard.press("Enter");
  const second = page.getByRole("row", { name: /LES-1002/ });
  await second.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);

  const mutations = await page.evaluate(() => {
    const taskWindow = window as typeof window & {
      __task10InspectorMutations?: string[];
      __task10InspectorObserver?: MutationObserver;
    };
    taskWindow.__task10InspectorObserver?.disconnect();
    return taskWindow.__task10InspectorMutations ?? [];
  });
  expect(mutations).toEqual([]);
});

test("renders a directed filtered-empty state with reset", async ({ page }) => {
  await page.goto("/subvention/transactions");
  const search = page.getByPlaceholder(
    "Search lease, IMEI/serial, invoice, employer",
  );
  await search.fill("no-synthetic-record-can-match-this");

  await expect(
    page.getByText("No purchases match these filters"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("row", { name: /LES-1001/ })).toBeVisible();
});
