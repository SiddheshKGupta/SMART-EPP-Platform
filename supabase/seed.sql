-- Deterministic synthetic data for local/demo environments only.
-- Run after 20260811000100_platform_core.sql. No real PII is present.

begin;

insert into public.iam_principals
  (id, subject_id, display_name, role_keys, masked_fields, is_admin, is_management, all_employers)
values
  ('principal-platform-admin', 'platform-admin', 'Platform Administrator', array['ADMIN'], '{}', true, false, true),
  ('principal-ops-lead', 'ops-lead', 'Operations Lead', array['OPERATIONS_LEAD'], '{}', false, false, true),
  ('principal-management', 'portfolio-manager', 'Portfolio Manager', array['MANAGEMENT'], array['employee.payrollId'], false, true, true)
on conflict (id) do nothing;

insert into public.iam_module_grants (principal_id, module_key, action)
values
  ('principal-platform-admin', 'ALL', 'CONFIGURE'),
  ('principal-platform-admin', 'ALL', 'APPROVE'),
  ('principal-ops-lead', 'ALL', 'EDIT'),
  ('principal-ops-lead', 'ALL', 'SUBMIT'),
  ('principal-management', 'LEASES_PORTFOLIO', 'APPROVE')
on conflict (principal_id, module_key, action) do nothing;

insert into public.employers (id, name, sanction_paise, utilised_paise, status)
values
  ('employer-northstar', 'Northstar Consulting Private Limited', 50000000, 28400000, 'HEALTHY'),
  ('employer-pinnacle', 'Pinnacle Manufacturing Limited', 75000000, 61900000, 'PENDING'),
  ('employer-harbour', 'Harbour Retail Services Limited', 30000000, 12600000, 'RECONCILED')
on conflict (id) do nothing;

insert into public.programmes (id, employer_id, stage)
values
  ('programme-northstar-epp', 'employer-northstar', 'ACTIVE'),
  ('programme-pinnacle-epp', 'employer-pinnacle', 'IMPLEMENTATION'),
  ('programme-harbour-epp', 'employer-harbour', 'ONBOARDING')
on conflict (id) do nothing;

insert into public.employees (id, employer_id, name, payroll_id, pan, bank_account, status)
values
  ('employee-northstar-01', 'employer-northstar', 'Aarav Mehta', 'NS-1001', 'SYNTH-PAN-NS01', 'SYNTH-BANK-NS01', 'HEALTHY'),
  ('employee-pinnacle-01', 'employer-pinnacle', 'Rohan Gupta', 'PM-2001', 'SYNTH-PAN-PM01', 'SYNTH-BANK-PM01', 'PENDING'),
  ('employee-harbour-01', 'employer-harbour', 'Arjun Kapoor', 'HR-3001', 'SYNTH-PAN-HR01', 'SYNTH-BANK-HR01', 'HEALTHY')
on conflict (id) do nothing;

insert into public.assets (id, oem, model, category, serial_number, invoice_value_paise)
values
  ('asset-01', 'Apple', 'MacBook Air M4', 'Laptop', 'SYNTH-C02X000001', 12490000),
  ('asset-04', 'Lenovo', 'ThinkPad X1', 'Laptop', 'SYNTH-PF5X000004', 14250000),
  ('asset-06', 'Dell', 'Latitude 7450', 'Laptop', 'SYNTH-D3LX000006', 11800000)
on conflict (id) do nothing;

insert into public.applications
  (id, employer_id, employee_id, asset_id, requested_paise, reserved_paise, status)
values
  ('application-01', 'employer-northstar', 'employee-northstar-01', 'asset-01', 12490000, 12490000, 'HEALTHY'),
  ('application-04', 'employer-pinnacle', 'employee-pinnacle-01', 'asset-04', 14250000, 14250000, 'PENDING'),
  ('application-06', 'employer-harbour', 'employee-harbour-01', 'asset-06', 11800000, 11800000, 'HEALTHY')
on conflict (id) do nothing;

insert into public.exposure_events
  (id, employer_id, application_id, event_type, amount_paise, business_event, idempotency_key, actor_id, reason, occurred_at)
values
  ('exposure-01-reservation', 'employer-northstar', 'application-01', 'RESERVATION', 12490000, 'APPLICATION_APPROVED', 'demo-exposure-01-reservation', 'ops-lead', 'Eligibility and exposure checks passed', '2026-08-08T10:30:00Z'),
  ('exposure-01-utilisation', 'employer-northstar', 'application-01', 'UTILISATION', 12490000, 'LEASE_ACTIVATED', 'demo-exposure-01-utilisation', 'portfolio-manager', 'Lease activation confirmed', '2026-08-09T14:15:00Z')
on conflict (id) do nothing;

insert into public.leases
  (id, employer_id, application_id, lot_id, tenure_months, rental_paise, residual_value_paise, status)
values
  ('lease-01', 'employer-northstar', 'application-01', 'lot-northstar-01', 36, 392500, 2498000, 'HEALTHY'),
  ('lease-03', 'employer-pinnacle', 'application-04', 'lot-pinnacle-01', 36, 448500, 2850000, 'PENDING'),
  ('lease-05', 'employer-harbour', 'application-06', 'lot-harbour-01', 36, 371000, 2360000, 'HEALTHY')
on conflict (id) do nothing;

insert into public.work_items
  (id, employer_id, module_key, title, owner_key, assigned_user_id, queue_keys, initiated_by, requested_action, due_date, state, financial_impact_paise, href)
values
  ('work-01', 'employer-northstar', 'APPLICATIONS_ELIGIBILITY', 'Review Northstar application', 'ops-lead', 'ops-lead', '["MY_TASKS","TEAM_QUEUES"]', 'relationship-manager', 'EDIT', '2026-08-10', 'HEALTHY', 12490000, '/applications/register?q=application-01'),
  ('work-03', 'employer-pinnacle', 'EXCEPTIONS_RECONCILIATIONS', 'Resolve Pinnacle rental arrears', 'collections-analyst', null, '["MY_EXCEPTIONS","ESCALATIONS"]', null, null, '2026-08-05', 'OVERDUE', 6490000, '/exceptions/reconciliation-breaks?q=lease-03'),
  ('work-07', 'employer-harbour', 'LEASES_PORTFOLIO', 'Activate Harbour laptop lease', 'portfolio-manager', 'portfolio-manager', '["TEAM_QUEUES"]', 'ops-lead', 'EDIT', '2026-08-10', 'HEALTHY', 11800000, '/portfolio/activation?q=lease-05')
on conflict (id) do nothing;

insert into public.guided_journeys (id, employer_id, employee_id, application_id, lease_id)
values ('journey-northstar-01', 'employer-northstar', 'employee-northstar-01', 'application-01', 'lease-01')
on conflict (id) do nothing;

insert into public.guided_journey_steps (id, journey_id, sequence_no, label, href, status)
values
  ('journey-step-01', 'journey-northstar-01', 1, 'Employer readiness', '/programmes/readiness?q=Northstar', 'CURRENT'),
  ('journey-step-02', 'journey-northstar-01', 2, 'Employee enrolment', '/employees/enrolment?q=Aarav', 'UPCOMING'),
  ('journey-step-03', 'journey-northstar-01', 3, 'Eligibility and credit', '/applications/eligibility?q=application-01', 'UPCOMING'),
  ('journey-step-04', 'journey-northstar-01', 4, 'Lease handoff and activation', '/portfolio/activation?q=lease-01', 'UPCOMING'),
  ('journey-step-05', 'journey-northstar-01', 5, 'Foreclosure', '/foreclosure/intake?q=lease-01', 'UPCOMING')
on conflict (id) do nothing;

insert into public.integration_adapters
  (id, name, status, last_sync_at, accepted_count, rejected_count, pending_count)
values
  ('integration-master-hub', 'Master Hub', 'HEALTHY', '2026-08-10T09:00:00Z', 1240, 0, 0),
  ('integration-leasing-platform', 'Existing Leasing Platform', 'PARTIAL', '2026-08-10T09:00:00Z', 982, 3, 5),
  ('integration-tally', 'Tally', 'HEALTHY', '2026-08-10T09:00:00Z', 426, 0, 0)
on conflict (id) do nothing;

insert into public.platform_exceptions
  (id, employer_id, scenario, operating_state, recovery_state, source_record_type, source_record_id, work_item_id)
values ('exception-mismatched-01', 'employer-pinnacle', 'MISMATCHED', 'OVERDUE', 'OPEN', 'Application', 'application-04', 'work-03')
on conflict (id) do nothing;

insert into public.audit_events
  (id, employer_id, entity_type, entity_id, action, actor_id, reason, outcome, occurred_at)
values
  ('audit-01', 'employer-northstar', 'Employer', 'employer-northstar', 'PROGRAMME_ACTIVATED', 'platform-admin', 'Approved programme go-live', 'SUCCESS', '2026-08-01T09:00:00Z'),
  ('audit-02', 'employer-northstar', 'Application', 'application-01', 'APPLICATION_APPROVED', 'ops-lead', 'Eligibility and exposure checks passed', 'SUCCESS', '2026-08-08T10:30:00Z')
on conflict (id) do nothing;

commit;
