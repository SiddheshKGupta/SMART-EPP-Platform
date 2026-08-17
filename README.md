# Smart EPP — Subvention Control Centre

Standalone operational product for Connect's Smart EPP subvention lifecycle.

## Current product scope

- Management financial overview with FY, quarter and month filters
- Operations workbench for document intake, transaction review, claims and tracking
- Controlled master-data administration and relationship hierarchy
- Scheme, programme, eligibility, recovery and reconciliation controls

## Principles

Workbench-driven, exception-led, audit-ready, maker-checker controlled, configurable, drill-down enabled and modular. Approved claim batches are immutable. Effective master versions and rule snapshots remain historically reproducible.

## Structure
- `apps/web` — Next.js application
- `packages/domain` — shared business rules
- `packages/ui` — reusable UI building blocks
- `prisma` — database model
- `docs` — token-efficient product and domain context
- `tests` — unit and end-to-end specifications

## Start
```bash
npm install
npm run dev
```

Open `http://localhost:3000/subvention`.

Developed by **V L & CO**.
