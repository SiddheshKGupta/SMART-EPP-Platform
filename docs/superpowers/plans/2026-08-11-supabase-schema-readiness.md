# Supabase Schema Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare a local, provider-portable Supabase migration that can back the existing asynchronous platform repository ports without applying any cloud change.

**Architecture:** Keep the application boundary provider-neutral and represent the current `PlatformSnapshot` as normalized Postgres tables. Expose read projections through explicit authenticated grants plus tenant-scoped RLS; reserve writes for a trusted server adapter that must re-run IAM controls and atomically append audit/outbox rows.

**Tech Stack:** PostgreSQL/Supabase SQL, Vitest contract smoke test, Markdown mapping.

## Global Constraints

- Do not apply the migration to a cloud project or use credentials.
- Do not add a Supabase SDK or another dependency.
- Do not hard-code a Supabase project reference, URL, or key.
- Do not modify common, Claude, Gemini, or preserved Subvention files.
- Keep intensive database integration and RLS persona tests in the pre-wiring backlog.

---

### Task 1: Portable platform schema package

**Files:**
- Create: `supabase/migrations/20260811000100_platform_core.sql`
- Create: `tests/unit/platform/supabase-schema-contract.test.ts`
- Create: `docs/supabase-readiness.md`

**Interfaces:**
- Consumes: `PlatformSnapshot`, `PlatformQueryPort`, `PlatformCommandPort`, and the existing IAM employer scopes.
- Produces: normalized tables, deny-by-default RLS, explicit grants, append-only audit/outbox storage, and a field mapping for a future adapter.

- [x] **Step 1: Write the failing contract smoke test**

  Assert the migration exists, defines every snapshot aggregate, uses paise-safe amounts, enables RLS, exposes no anonymous access, and contains no project-specific value.

- [x] **Step 2: Run the focused test and verify RED**

  Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/supabase-schema-contract.test.ts --no-cache`
  Expected: FAIL because the migration file does not exist.

- [x] **Step 3: Add the minimum migration and mapping note**

  Use text identifiers compatible with current demo IDs, `bigint` for paise, `timestamptz` for instants, checks for lifecycle states, indexed foreign keys and RLS scope columns, explicit Data API grants, and no direct authenticated writes.

- [x] **Step 4: Run focused smoke and schema lint checks**

  Run the focused Vitest file and scan the SQL for secret/project-reference patterns. A live Postgres migration and persona matrix remain a pre-wiring gate because no local Supabase CLI/database is installed.

- [ ] **Step 5: Commit only the three scoped files**

  Commit message: `feat(platform): prepare portable Supabase schema`
