-- SMART EPP Platform core persistence contract.
-- Local package only: applying this migration is a separate approval gate.
-- The schema intentionally contains no Supabase project identifier or credential.

begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.iam_principals (
  id text primary key,
  subject_id text not null unique,
  display_name text not null,
  role_keys text[] not null default '{}',
  masked_fields text[] not null default '{}',
  is_admin boolean not null default false,
  is_management boolean not null default false,
  all_employers boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  check (length(btrim(subject_id)) > 0),
  check (length(btrim(display_name)) > 0)
);

create table public.iam_module_grants (
  id bigint generated always as identity primary key,
  principal_id text not null references public.iam_principals(id) on delete cascade,
  module_key text not null,
  action text not null check (action in ('READ', 'CREATE', 'EDIT', 'SUBMIT', 'APPROVE', 'REJECT', 'RETURN', 'REOPEN', 'OVERRIDE', 'EXPORT', 'CONFIGURE', 'DELETE')),
  created_at timestamptz not null default now(),
  unique (principal_id, module_key, action),
  check (length(btrim(module_key)) > 0)
);

create table public.employers (
  id text primary key,
  name text not null,
  sanction_paise bigint not null check (sanction_paise >= 0),
  utilised_paise bigint not null check (utilised_paise >= 0 and utilised_paise <= sanction_paise),
  status text not null check (status in ('HEALTHY', 'PENDING', 'OVERDUE', 'REJECTED', 'RECONCILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  check (length(btrim(name)) > 0)
);

create table public.iam_employer_scopes (
  id bigint generated always as identity primary key,
  principal_id text not null references public.iam_principals(id) on delete cascade,
  employer_id text not null references public.employers(id) on delete cascade,
  access_mode text not null check (access_mode in ('READ', 'WRITE', 'APPROVE')),
  created_at timestamptz not null default now(),
  unique (principal_id, employer_id, access_mode)
);

create table public.programmes (
  id text primary key,
  employer_id text not null unique references public.employers(id) on delete restrict,
  stage text not null check (stage in ('ONBOARDING', 'IMPLEMENTATION', 'ACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0)
);

create table public.employees (
  id text primary key,
  employer_id text not null references public.employers(id) on delete restrict,
  name text not null,
  payroll_id text not null,
  pan text not null,
  bank_account text not null,
  status text not null check (status in ('HEALTHY', 'PENDING', 'OVERDUE', 'REJECTED', 'RECONCILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  unique (id, employer_id),
  unique (employer_id, payroll_id),
  check (length(btrim(name)) > 0)
);

create table public.assets (
  id text primary key,
  oem text not null,
  model text not null,
  category text not null,
  serial_number text not null unique,
  invoice_value_paise bigint not null check (invoice_value_paise >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0)
);

create table public.applications (
  id text primary key,
  employer_id text not null references public.employers(id) on delete restrict,
  employee_id text not null,
  asset_id text not null references public.assets(id) on delete restrict,
  requested_paise bigint not null check (requested_paise >= 0),
  reserved_paise bigint not null check (reserved_paise >= 0 and reserved_paise <= requested_paise),
  status text not null check (status in ('HEALTHY', 'PENDING', 'OVERDUE', 'REJECTED', 'RECONCILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  unique (id, employer_id),
  foreign key (employee_id, employer_id) references public.employees(id, employer_id) on delete restrict
);

create table public.exposure_events (
  id text primary key,
  employer_id text not null references public.employers(id) on delete restrict,
  application_id text not null,
  event_type text not null check (event_type in ('RESERVATION', 'UTILISATION', 'RELEASE')),
  amount_paise bigint not null check (amount_paise > 0),
  business_event text not null,
  idempotency_key text not null unique,
  actor_id text not null,
  reason text not null,
  occurred_at timestamptz not null,
  foreign key (application_id, employer_id) references public.applications(id, employer_id) on delete restrict,
  check (length(btrim(business_event)) > 0),
  check (length(btrim(reason)) > 0)
);

create table public.leases (
  id text primary key,
  employer_id text not null references public.employers(id) on delete restrict,
  application_id text not null,
  lot_id text not null,
  tenure_months integer not null check (tenure_months > 0),
  rental_paise bigint not null check (rental_paise >= 0),
  residual_value_paise bigint not null check (residual_value_paise >= 0),
  status text not null check (status in ('HEALTHY', 'PENDING', 'OVERDUE', 'REJECTED', 'RECONCILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  unique (id, employer_id),
  foreign key (application_id, employer_id) references public.applications(id, employer_id) on delete restrict
);

create table public.work_items (
  id text primary key,
  employer_id text not null references public.employers(id) on delete restrict,
  module_key text not null,
  title text not null,
  owner_key text not null,
  assigned_user_id text,
  queue_keys jsonb not null default '[]'::jsonb check (jsonb_typeof(queue_keys) = 'array'),
  initiated_by text,
  requested_action text check (requested_action is null or requested_action in ('READ', 'CREATE', 'EDIT', 'SUBMIT', 'APPROVE', 'REJECT', 'RETURN', 'REOPEN', 'OVERRIDE', 'EXPORT', 'CONFIGURE', 'DELETE')),
  due_date date not null,
  state text not null check (state in ('HEALTHY', 'PENDING', 'OVERDUE', 'REJECTED', 'RECONCILED')),
  financial_impact_paise bigint not null check (financial_impact_paise >= 0),
  href text not null,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  check ((completed_at is null) = (completed_by is null))
);

create table public.guided_journeys (
  id text primary key,
  employer_id text not null references public.employers(id) on delete restrict,
  employee_id text not null,
  application_id text not null,
  lease_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  foreign key (employee_id, employer_id) references public.employees(id, employer_id) on delete restrict,
  foreign key (application_id, employer_id) references public.applications(id, employer_id) on delete restrict,
  foreign key (lease_id, employer_id) references public.leases(id, employer_id) on delete restrict
);

create table public.guided_journey_steps (
  id text primary key,
  journey_id text not null references public.guided_journeys(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  label text not null,
  href text not null,
  status text not null check (status in ('COMPLETE', 'CURRENT', 'UPCOMING')),
  unique (journey_id, sequence_no)
);

create table public.integration_adapters (
  id text primary key,
  name text not null,
  mode text not null default 'MOCK' check (mode = 'MOCK'),
  status text not null check (status in ('HEALTHY', 'PARTIAL', 'FAILED')),
  last_sync_at timestamptz not null,
  accepted_count bigint not null check (accepted_count >= 0),
  rejected_count bigint not null check (rejected_count >= 0),
  pending_count bigint not null check (pending_count >= 0),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0)
);

create table public.platform_exceptions (
  id text primary key,
  employer_id text not null references public.employers(id) on delete restrict,
  scenario text not null check (scenario in ('RETURNED', 'DUPLICATED', 'MISMATCHED')),
  operating_state text not null check (operating_state in ('HEALTHY', 'PENDING', 'OVERDUE', 'REJECTED', 'RECONCILED')),
  recovery_state text not null check (recovery_state in ('OPEN', 'IN_PROGRESS', 'RECOVERED')),
  source_record_type text not null check (source_record_type in ('Application', 'Employee', 'IntegrationAdapter')),
  source_record_id text not null,
  work_item_id text not null references public.work_items(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0)
);

create table public.audit_events (
  id text primary key,
  employer_id text references public.employers(id) on delete restrict,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_id text not null,
  reason text not null,
  outcome text not null check (outcome in ('SUCCESS', 'DENIED', 'NO_CHANGE', 'PARTIAL', 'FAILURE')),
  prior_state jsonb,
  new_state jsonb,
  correlation_id text,
  occurred_at timestamptz not null,
  check (length(btrim(reason)) > 0)
);

comment on table public.audit_events is 'Append-only evidence; application roles receive SELECT only and mutations occur inside trusted command transactions.';

create table public.outbox_events (
  id text primary key,
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

comment on table public.outbox_events is 'Append-only integration intent; only a trusted worker may advance delivery metadata.';

-- Index every foreign key and every common RLS/filter predicate not already
-- covered by a primary or unique key.
create index iam_module_grants_principal_id_idx on public.iam_module_grants (principal_id);
create index iam_employer_scopes_principal_id_idx on public.iam_employer_scopes (principal_id);
create index iam_employer_scopes_employer_id_idx on public.iam_employer_scopes (employer_id);
create index employees_employer_id_idx on public.employees (employer_id);
create index applications_employer_id_idx on public.applications (employer_id);
create index applications_employee_id_idx on public.applications (employee_id);
create index applications_asset_id_idx on public.applications (asset_id);
create index exposure_events_employer_id_idx on public.exposure_events (employer_id);
create index exposure_events_application_id_occurred_at_idx on public.exposure_events (application_id, occurred_at desc);
create index leases_employer_id_idx on public.leases (employer_id);
create index leases_application_id_idx on public.leases (application_id);
create index work_items_employer_state_due_date_idx on public.work_items (employer_id, state, due_date);
create index work_items_assigned_user_id_idx on public.work_items (assigned_user_id) where assigned_user_id is not null;
create index guided_journeys_employer_id_idx on public.guided_journeys (employer_id);
create index guided_journeys_employee_id_idx on public.guided_journeys (employee_id);
create index guided_journey_steps_journey_id_idx on public.guided_journey_steps (journey_id);
create index platform_exceptions_employer_recovery_state_idx on public.platform_exceptions (employer_id, recovery_state);
create index platform_exceptions_work_item_id_idx on public.platform_exceptions (work_item_id);
create index audit_events_employer_occurred_at_idx on public.audit_events (employer_id, occurred_at desc);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, occurred_at desc);
create index outbox_events_pending_idx on public.outbox_events (available_at, created_at) where status in ('PENDING', 'FAILED');

-- Resolve the authenticated subject from PostgREST request claims without
-- depending on a project reference or an auth-schema foreign key.
create or replace function app_private.request_subject()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )
$$;

create or replace function app_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.request_subject() <> ''
    and exists (
      select 1
      from public.iam_principals principal
      where principal.subject_id = app_private.request_subject()
        and principal.is_active
        and principal.is_admin
    )
$$;

create or replace function app_private.can_read_employer(target_employer_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_employer_id is not null
    and app_private.request_subject() <> ''
    and exists (
      select 1
      from public.iam_principals principal
      where principal.subject_id = app_private.request_subject()
        and principal.is_active
        and (
          principal.all_employers
          or exists (
            select 1
            from public.iam_employer_scopes scope
            where scope.principal_id = principal.id
              and scope.employer_id = target_employer_id
              and scope.access_mode in ('READ', 'WRITE', 'APPROVE')
          )
        )
    )
$$;

revoke execute on function app_private.request_subject() from public, anon;
revoke execute on function app_private.is_platform_admin() from public, anon;
revoke execute on function app_private.can_read_employer(text) from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.request_subject() to authenticated;
grant execute on function app_private.is_platform_admin() to authenticated;
grant execute on function app_private.can_read_employer(text) to authenticated;

-- Explicit grants account for the 2026 Data API default change. Browser-side
-- access is read-only; trusted server commands must repeat IAM checks and write
-- entity + audit + outbox records in one transaction.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

grant usage on schema public to authenticated;
grant select on table public.iam_principals to authenticated;
grant select on table public.iam_module_grants to authenticated;
grant select on table public.iam_employer_scopes to authenticated;
grant select on table public.employers to authenticated;
grant select on table public.programmes to authenticated;
grant select on table public.employees to authenticated;
grant select on table public.assets to authenticated;
grant select on table public.applications to authenticated;
grant select on table public.exposure_events to authenticated;
grant select on table public.leases to authenticated;
grant select on table public.work_items to authenticated;
grant select on table public.guided_journeys to authenticated;
grant select on table public.guided_journey_steps to authenticated;
grant select on table public.integration_adapters to authenticated;
grant select on table public.platform_exceptions to authenticated;
grant select on table public.audit_events to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Defense in depth: every exposed table has RLS enabled and forced.
alter table public.iam_principals enable row level security;
alter table public.iam_principals force row level security;
alter table public.iam_module_grants enable row level security;
alter table public.iam_module_grants force row level security;
alter table public.iam_employer_scopes enable row level security;
alter table public.iam_employer_scopes force row level security;
alter table public.employers enable row level security;
alter table public.employers force row level security;
alter table public.programmes enable row level security;
alter table public.programmes force row level security;
alter table public.employees enable row level security;
alter table public.employees force row level security;
alter table public.assets enable row level security;
alter table public.assets force row level security;
alter table public.applications enable row level security;
alter table public.applications force row level security;
alter table public.exposure_events enable row level security;
alter table public.exposure_events force row level security;
alter table public.leases enable row level security;
alter table public.leases force row level security;
alter table public.work_items enable row level security;
alter table public.work_items force row level security;
alter table public.guided_journeys enable row level security;
alter table public.guided_journeys force row level security;
alter table public.guided_journey_steps enable row level security;
alter table public.guided_journey_steps force row level security;
alter table public.integration_adapters enable row level security;
alter table public.integration_adapters force row level security;
alter table public.platform_exceptions enable row level security;
alter table public.platform_exceptions force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
alter table public.outbox_events enable row level security;
alter table public.outbox_events force row level security;

create policy iam_principals_read on public.iam_principals
  for select to authenticated
  using (subject_id = (select app_private.request_subject()) or (select app_private.is_platform_admin()));

create policy iam_module_grants_read on public.iam_module_grants
  for select to authenticated
  using (
    principal_id in (
      select principal.id from public.iam_principals principal
      where principal.subject_id = (select app_private.request_subject())
    )
    or (select app_private.is_platform_admin())
  );

create policy iam_employer_scopes_read on public.iam_employer_scopes
  for select to authenticated
  using (
    principal_id in (
      select principal.id from public.iam_principals principal
      where principal.subject_id = (select app_private.request_subject())
    )
    or (select app_private.is_platform_admin())
  );

create policy employers_scoped_read on public.employers
  for select to authenticated using ((select app_private.can_read_employer(id)));
create policy programmes_scoped_read on public.programmes
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy employees_scoped_read on public.employees
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy assets_authenticated_read on public.assets
  for select to authenticated using (true);
create policy applications_scoped_read on public.applications
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy exposure_events_scoped_read on public.exposure_events
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy leases_scoped_read on public.leases
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy work_items_scoped_read on public.work_items
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy guided_journeys_scoped_read on public.guided_journeys
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy guided_journey_steps_scoped_read on public.guided_journey_steps
  for select to authenticated
  using (
    exists (
      select 1 from public.guided_journeys journey
      where journey.id = journey_id
        and (select app_private.can_read_employer(journey.employer_id))
    )
  );
create policy integration_adapters_authenticated_read on public.integration_adapters
  for select to authenticated using (true);
create policy platform_exceptions_scoped_read on public.platform_exceptions
  for select to authenticated using ((select app_private.can_read_employer(employer_id)));
create policy audit_events_scoped_read on public.audit_events
  for select to authenticated
  using (employer_id is null or (select app_private.can_read_employer(employer_id)));

commit;
