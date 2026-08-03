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

test("management and audit roles cannot mutate scheme masters", async ({
  page,
}) => {
  await page.goto("/subvention/schemes");
  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Management Viewer" }).click();

  await page
    .getByRole("row", { name: /APL-CORP-Q3-26.*Draft/i })
    .click();
  await expect(
    page.getByRole("button", { name: "Submit for approval" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit scheme" })).toBeDisabled();

  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Auditor" }).click();
  await expect(
    page.getByRole("button", { name: "Submit for approval" }),
  ).toHaveCount(0);
});

test("returned masters become editable drafts before resubmission", async ({
  page,
}) => {
  await page.goto("/subvention/schemes");
  await page
    .getByRole("row", { name: /APL-CORP-Q3-26.*Draft/i })
    .click();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page.getByLabel("Submission remarks").fill("Ready for review");
  await page.getByRole("button", { name: "Submit scheme" }).click();
  await page.getByRole("button", { name: "Active role" }).click();
  await page
    .getByRole("option", { name: "Business Head Checker" })
    .click();
  await page.getByRole("button", { name: "Return" }).click();
  await page.getByLabel("Return remarks").fill("Correct product scope");
  await page.getByRole("button", { name: "Return scheme" }).click();
  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Sales Ops Maker" }).click();

  await expect(page.getByRole("button", { name: "Edit scheme" })).toBeEnabled();
});

test("failed successor command keeps its dialog and remarks intact", async ({
  page,
}) => {
  await page.goto("/subvention/schemes");
  await page
    .getByRole("row", { name: /APL-H2-26.*Approved/i })
    .click();
  await page.getByRole("button", { name: "New version" }).click();
  await page.getByLabel("Successor effective from").fill("2026-12-01");
  await page.getByLabel("Successor effective to").fill("2027-03-31");
  await page.getByLabel("Version remarks").fill("Invalid overlapping window");
  await page.getByRole("button", { name: "Create draft version" }).click();

  await expect(
    page.getByRole("dialog", { name: /Create a new scheme version/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Version remarks")).toHaveValue(
    "Invalid overlapping window",
  );
  await expect(
    page.getByText(/Successor scheme effective from must be after/i),
  ).toBeVisible();
});

test("read-only roles cannot invoke purchase import or eligibility evaluation", async ({
  page,
}) => {
  await page.goto("/subvention/transactions");
  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Management Viewer" }).click();
  await expect(
    page.getByRole("button", { name: "Import transactions" }),
  ).toBeDisabled();

  await page.goto(
    "/subvention/eligibility?transaction=transaction-eligible-01",
  );
  await expect(
    page.getByRole("button", { name: "Evaluate eligibility" }),
  ).toBeDisabled();
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

test("focus return follows the selected row while desktop detail stays open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/subvention/schemes");
  const first = page.getByRole("row", { name: /APL-H1-26.*Approved/i });
  const second = page.getByRole("row", { name: /APL-H2-26.*Approved/i });

  await first.click();
  await expect(
    page.getByRole("heading", { name: "APL-H1-26", exact: true }),
  ).toBeFocused();
  await second.click();
  await expect(
    page.getByRole("heading", { name: "APL-H2-26", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Close detail" }).click();
  await expect(second).toBeFocused();
});

test("programme successor uses an explicit window and preserves prior validity", async ({
  page,
}) => {
  await page.goto("/subvention/programme-mappings");
  await page
    .getByRole("row", {
      name: /employer-alpha.*programme-apple.*distributor-ingram.*Approved/i,
    })
    .click();
  await page.getByRole("button", { name: "New version" }).click();
  await page.getByLabel("Successor effective from").fill("2026-10-01");
  await page.getByLabel("Successor effective to").fill("2027-03-31");
  await page.getByLabel("Version remarks").fill("Q4 programme transition");
  await page.getByRole("button", { name: "Create draft version" }).click();

  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page.getByLabel("Submission remarks").fill("Window checked");
  await page.getByRole("button", { name: "Submit mapping" }).click();
  await page.getByRole("button", { name: "Active role" }).click();
  await page
    .getByRole("option", { name: "Business Head Checker" })
    .click();
  await page.getByRole("button", { name: "Approve mapping" }).click();
  await page.getByLabel("Approval remarks").fill("Approved Q4 transition");
  await page
    .getByRole("button", { name: "Confirm mapping approval" })
    .click();

  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Versions", exact: true }).click();
  await expect(
    page.getByRole("row", { name: /v1.*2026-07-01.*2026-12-31.*Approved/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /v2.*2026-10-01.*2027-03-31.*Approved/i }),
  ).toBeVisible();
});

test("scheme deep link restores its selected scheme", async ({ page }) => {
  await page.goto("/subvention/schemes?scheme=scheme-version-draft");

  await expect(
    page.getByRole("heading", { name: "APL-CORP-Q3-26", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /APL-CORP-Q3-26.*Draft/i }),
  ).toHaveAttribute("aria-selected", "true");
});

test("programme mapping deep link restores its selected mapping", async ({
  page,
}) => {
  await page.goto(
    "/subvention/programme-mappings?mapping=mapping-alpha-apple",
  );

  await expect(
    page.getByRole("heading", { name: "programme-apple", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", {
      name: /employer-alpha.*programme-apple.*distributor-ingram.*Approved/i,
    }),
  ).toHaveAttribute("aria-selected", "true");
});

test("rejects incoherent mapping scope and selected-record tuples", async ({
  page,
}) => {
  await page.goto(
    "/subvention/programme-mappings?status=APPROVED&mapping=mapping-alpha-apple&employer=employer-beta&programme=programme-google",
  );

  await expect(
    page.getByRole("heading", { name: "programme-apple", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Close detail" }),
  ).toHaveCount(0);
});

test("programme conflict deep link restores employer and programme scope", async ({
  page,
}) => {
  await page.goto(
    "/subvention/programme-mappings?employer=employer-unmapped&programme=programme-apple",
  );

  await expect(
    page.getByRole("heading", { name: "employer-unmapped", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review validity and product scope" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /employer-unmapped.*programme-apple/i }),
  ).toHaveAttribute("aria-selected", "true");
});
