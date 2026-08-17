import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260811000100_platform_core.sql",
);

const migration = (): string => readFileSync(migrationPath, "utf8");

describe("Supabase platform schema contract", () => {
  it("covers the asynchronous platform snapshot aggregates", () => {
    const sql = migration();
    const requiredTables = [
      "iam_principals",
      "iam_module_grants",
      "iam_employer_scopes",
      "employers",
      "programmes",
      "employees",
      "assets",
      "applications",
      "exposure_events",
      "leases",
      "work_items",
      "guided_journeys",
      "guided_journey_steps",
      "integration_adapters",
      "platform_exceptions",
      "audit_events",
      "outbox_events",
    ];

    for (const table of requiredTables) {
      expect(sql).toContain(`create table public.${table}`);
    }
  });

  it("stores exact paise amounts and timezone-aware instants", () => {
    const sql = migration();

    expect(sql).toMatch(/sanction_paise bigint not null/);
    expect(sql).toMatch(/requested_paise bigint not null/);
    expect(sql).toMatch(/occurred_at timestamptz not null/);
    expect(sql).not.toMatch(/\b(real|double precision|money|timestamp without time zone)\b/i);
  });

  it("enables and forces RLS for every public table", () => {
    const sql = migration();
    const tables = [...sql.matchAll(/create table public\.([a-z_]+)/g)].map(
      ([, table]) => table,
    );

    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`alter table public.${table} force row level security`);
    }
  });

  it("uses explicit grants and exposes nothing to anonymous callers", () => {
    const sql = migration();

    expect(sql).toContain("revoke all on all tables in schema public from anon");
    expect(sql).toContain("grant select on table public.employers to authenticated");
    expect(sql).not.toMatch(/grant\s+.+\s+to\s+anon\b/i);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all).+to\s+authenticated\b/i);
  });

  it("scopes tenant reads through indexed employer predicates", () => {
    const sql = migration();

    expect(sql).toContain("app_private.can_read_employer");
    expect(sql).toContain("create index employees_employer_id_idx");
    expect(sql).toContain("create index applications_employer_id_idx");
    expect(sql).toContain("create index leases_employer_id_idx");
  });

  it("keeps audit and outbox records append-only for application roles", () => {
    const sql = migration();

    expect(sql).toContain("comment on table public.audit_events is 'Append-only");
    expect(sql).toContain("comment on table public.outbox_events is 'Append-only");
    expect(sql).not.toMatch(/grant\s+(update|delete).+audit_events/i);
    expect(sql).not.toMatch(/grant\s+(update|delete).+outbox_events/i);
  });

  it("contains no deployment-specific identifiers or credentials", () => {
    const sql = migration();

    expect(sql).not.toMatch(/obhefhzqcqyuucjdtlbe|supabase\.co|service_role_key|sb_secret_|eyJ[a-zA-Z0-9_-]+/);
  });
});
