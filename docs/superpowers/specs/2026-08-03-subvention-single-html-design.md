# Subvention Single-HTML Prototype Design

## Objective

Deliver the current Smart EPP Subvention Control Centre as one offline HTML file that opens directly in Chrome or Edge without Node.js, a local server, installation, or network access.

## Functional parity

The standalone artifact must preserve the current prototype's seeded in-memory state and principal working surfaces:

- Management overview, filters, KPI drill-downs and phase/counterparty break-ups.
- Operations workbench, document intake, transaction review, claim preparation and claim tracking.
- Scheme creation, draft editing, submission, approval and successor versioning.
- Employer programme mappings and employer-specific commercial overrides.
- Apple scheme defaulting to Invoice Value while Maruti Suzuki uses an authorised Base Value override.
- OEM, National Distributor, reseller and related master CRUD with maker-checker and effective-dated successor versions.
- Document selection, drag-and-drop, filename recognition, duplicate validation and processing queue.
- Exceptions, audit history and role switching.

## Packaging architecture

The deliverable will be a client-side single-page application with:

- One HTML document containing all application markup, styles, JavaScript and seed data.
- Hash-based routes so browser navigation works from a local `file://` URL.
- No external fonts, scripts, stylesheets, images or CDN dependencies.
- Embedded SVG icons and system fonts.
- A namespaced `localStorage` record for mutable prototype state.
- A schema version and seed fingerprint so incompatible older state can be reset safely.

The standalone artifact is a distribution build. The existing Next.js application remains the maintainable source product and is not replaced by the generated HTML.

## State and data behavior

On first open, the file loads the complete canonical seed snapshot. Material user actions update the in-memory store and persist the snapshot in browser `localStorage`. Refreshing or reopening the file retains changes in the same browser profile.

The interface will provide:

- Export current state to JSON.
- Import a previously exported state file after schema validation.
- Reset to canonical seeded data with an explicit confirmation.

Approved scheme, programme and master versions remain immutable. Editing an approved record creates a successor version. Historical transactions retain their prior rule references and audit history.

## Upload boundary

Browser file selection and drag-and-drop must work offline. The prototype will classify and stage supported PDF, CSV, XLS, XLSX and XLSB files using filename and browser metadata rules already present in the product. Files are not uploaded to a server.

The artifact will not claim full PDF or spreadsheet content extraction unless the required parser is bundled into the HTML and verified. Staged file metadata is persisted; raw file bytes are not retained after the browser session.

## Safety and privacy

- No network requests.
- No personal data beyond the current anonymised seed set.
- Corporate, vendor, employer, commercial and invoice references remain available.
- Import rejects malformed or incompatible JSON rather than partially replacing state.
- Destructive reset and delete actions require confirmation.

## Verification

The finished file must be tested by opening it directly from disk and confirming:

1. It renders with networking disabled.
2. Management and Operations views navigate correctly.
3. A scheme draft can be created and survives refresh.
4. An approved OEM or counterparty can create an editable successor version.
5. The Maruti programme shows Base Value while the Apple scheme default remains Invoice Value.
6. The upload picker and drag-and-drop queue accept supported files.
7. JSON export, import and reset operate correctly.
8. No uncaught browser errors occur during the smoke path.

## Deliverable

`Smart_EPP_Subvention_Standalone.html` in the repository root, ready to copy or share as a single file.
