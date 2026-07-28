# AGENTS.md
## Mission
Build Smart EPP as Connect's institutional operating platform.

## Mandatory direction
- Do not visually copy the prior onboarding or foreclosure prototypes.
- Use them only for workflow, fields, controls and business rules.
- Build a new enterprise-grade, desktop-first UX.
- Optimise for dense operational work, management drill-down, traceability and control.

## Domain rules
- Employer is contractual obligor; employee is beneficiary.
- Connect underwrites the employer.
- Maker cannot approve own work.
- Approved claim batches are immutable.
- Master changes are effective-dated and versioned.
- Historical records retain the rule snapshot used at processing.
- OEM logic must be configurable, never hardcoded.
- Duplicate IMEIs and duplicate claims are prohibited.
- Claims beyond filing timelines require authorised override.
- Invoice eligibility is based on approved value.
- Claims close only after billing, collection and accounting reconcile.
- Every material action creates an audit event.

## Quality gates
Run lint, type-check, tests and build before completion.
