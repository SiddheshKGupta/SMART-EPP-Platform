-- Read-only synthetic demo projection for the public clickable prototype.
-- This function exposes only the deterministic demo rows loaded by seed.sql.

begin;

create or replace function public.get_demo_platform_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'generatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', p.subject_id,
        'roleKeys', to_jsonb(p.role_keys),
        'grants', coalesce((select jsonb_agg(jsonb_build_object('module', g.module_key, 'actions', jsonb_build_array(g.action))) from public.iam_module_grants g where g.principal_id = p.id), '[]'::jsonb),
        'dataScopes', case when p.all_employers then jsonb_build_array('ALL_EMPLOYERS') else '[]'::jsonb end,
        'maskedFields', to_jsonb(p.masked_fields),
        'isAdmin', p.is_admin,
        'isManagement', p.is_management
      ) order by p.id) from public.iam_principals p where p.is_active
    ), '[]'::jsonb),
    'employers', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'programmeId', p.id, 'programmeStage', p.stage, 'sanctionPaise', e.sanction_paise, 'utilisedPaise', e.utilised_paise, 'status', e.status) order by e.id)
      from public.employers e join public.programmes p on p.employer_id = e.id
    ), '[]'::jsonb),
    'employees', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'employerId', e.employer_id, 'name', e.name, 'payrollId', e.payroll_id, 'pan', e.pan, 'bankAccount', e.bank_account, 'status', e.status) order by e.id) from public.employees e
    ), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'employeeId', a.employee_id, 'assetId', a.asset_id, 'requestedPaise', a.requested_paise, 'reservedPaise', a.reserved_paise, 'status', a.status) order by a.id) from public.applications a
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'oem', a.oem, 'model', a.model, 'category', a.category, 'serialNumber', a.serial_number, 'invoiceValuePaise', a.invoice_value_paise) order by a.id) from public.assets a
    ), '[]'::jsonb),
    'leases', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'applicationId', l.application_id, 'lotId', l.lot_id, 'tenureMonths', l.tenure_months, 'rentalPaise', l.rental_paise, 'residualValuePaise', l.residual_value_paise, 'status', l.status) order by l.id) from public.leases l
    ), '[]'::jsonb),
    'workItems', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', w.id, 'employerId', w.employer_id, 'module', w.module_key, 'title', w.title, 'owner', w.owner_key, 'assignedUserId', w.assigned_user_id, 'queueKeys', w.queue_keys, 'initiatedBy', w.initiated_by, 'requestedAction', w.requested_action, 'dueDate', w.due_date::text, 'state', w.state, 'financialImpactPaise', w.financial_impact_paise, 'href', w.href, 'completedAt', w.completed_at, 'completedBy', w.completed_by)) order by w.id) from public.work_items w
    ), '[]'::jsonb),
    'guidedJourneys', coalesce((
      select jsonb_agg(jsonb_build_object('id', j.id, 'employerId', j.employer_id, 'employeeId', j.employee_id, 'applicationId', j.application_id, 'leaseId', j.lease_id, 'steps', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'label', s.label, 'href', s.href, 'status', s.status) order by s.sequence_no) from public.guided_journey_steps s where s.journey_id = j.id), '[]'::jsonb)) order by j.id) from public.guided_journeys j
    ), '[]'::jsonb),
    'integrations', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'mode', i.mode, 'status', i.status, 'lastSyncAt', i.last_sync_at, 'accepted', i.accepted_count, 'rejected', i.rejected_count, 'pending', i.pending_count) order by i.id) from public.integration_adapters i
    ), '[]'::jsonb),
    'exceptions', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'employerId', e.employer_id, 'scenario', e.scenario, 'operatingState', e.operating_state, 'recoveryState', e.recovery_state, 'sourceRecordType', e.source_record_type, 'sourceRecordId', e.source_record_id, 'workItemId', e.work_item_id) order by e.id) from public.platform_exceptions e
    ), '[]'::jsonb),
    'auditEvents', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'entityType', a.entity_type, 'entityId', a.entity_id, 'action', a.action, 'actorId', a.actor_id, 'reason', a.reason, 'outcome', a.outcome, 'occurredAt', a.occurred_at) order by a.occurred_at, a.id) from public.audit_events a
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.get_demo_platform_snapshot() from public;
grant execute on function public.get_demo_platform_snapshot() to anon, authenticated, service_role;
comment on function public.get_demo_platform_snapshot() is 'Synthetic demo-only read projection. Remove anon grant before using real customer data.';

commit;
