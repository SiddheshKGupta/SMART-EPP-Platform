# Subvention Single-HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and verify one offline HTML file containing the Smart EPP Subvention prototype, canonical seed data, mutable browser state and core operational workflows.

**Architecture:** Add a focused standalone source and generation script rather than altering the maintainable Next.js product. The output is a dependency-free hash-routed browser application whose state adapter uses a versioned `localStorage` envelope.

**Tech Stack:** HTML5, CSS, browser JavaScript, JSON, Playwright for direct-file smoke verification.

## Global Constraints

- Output filename is `Smart_EPP_Subvention_Standalone.html`.
- The file must work from `file://` with networking disabled.
- No external fonts, scripts, stylesheets, images or CDN dependencies.
- Approved records remain immutable; edits create successor versions.
- Apple defaults to Invoice Value; Maruti Suzuki uses the authorised Base Value override.
- Material actions create audit events.

---

### Task 1: Build the standalone artifact

**Files:**
- Create: `tools/build-subvention-standalone.mjs`
- Create: `Smart_EPP_Subvention_Standalone.html`

**Interfaces:**
- Produces: a single HTML application with versioned state, hash routing, CRUD/version controls, upload queue, export/import/reset and seeded data.

- [ ] **Step 1: Add the deterministic generator**

Create a Node script containing the canonical seed data, offline CSS and browser application JavaScript. Write the output with `fs.writeFileSync` so regeneration is deterministic.

- [ ] **Step 2: Generate the artifact**

Run: `node tools/build-subvention-standalone.mjs`

Expected: `Smart_EPP_Subvention_Standalone.html` exists and contains no `http://` or `https://` asset references.

- [ ] **Step 3: Validate static packaging**

Run: `node --check tools/build-subvention-standalone.mjs`

Expected: exit code 0 and output HTML contains the storage key, Maruti override, master catalogues and upload input.

### Task 2: Verify offline behavior

**Files:**
- Create: `tests/e2e/subvention-single-html.spec.ts`
- Test: `Smart_EPP_Subvention_Standalone.html`

**Interfaces:**
- Consumes: direct `file://` URL for the generated artifact.
- Produces: verified offline render and functional smoke path.

- [ ] **Step 1: Write the direct-file smoke test**

Test navigation to Management, Schemes, Programme Mappings, Master Data and Upload Documents; assert Apple Invoice Value and Maruti Base Value; create a scheme draft; create an approved master successor; select a mock PDF; refresh and assert persisted state.

- [ ] **Step 2: Run the focused smoke test**

Run: `npx playwright test tests/e2e/subvention-single-html.spec.ts --workers=1`

Expected: all assertions pass without console errors or network requests.

- [ ] **Step 3: Commit**

```powershell
git add tools/build-subvention-standalone.mjs Smart_EPP_Subvention_Standalone.html tests/e2e/subvention-single-html.spec.ts docs/superpowers/plans/2026-08-03-subvention-single-html.md
git commit -m "feat(subvention): deliver offline standalone prototype"
```
