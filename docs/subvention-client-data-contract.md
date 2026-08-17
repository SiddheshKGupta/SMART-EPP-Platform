# Subvention client data contract

Status: evidence-backed implementation contract  
Sources inspected read-only: four client workbooks supplied on 2026-07-28

## Authority and handling

The workbooks are operational evidence, not application templates. They remain outside the repository and must never be modified, committed, or copied into seed fixtures. Repository documentation may retain aggregates, field mappings, and non-personal examples only. Device identifiers must be synthetic in tests and demonstrations.

## Source populations

| Source | Operational role | Transaction evidence |
|---|---|---:|
| Approval April 2026 | Ingram claim approval file | 93 |
| Approval May 2026 | Ingram claim approval file | 145 |
| Final MIS April 2026 | Redington response, rejection, and representation MIS | 67 current-cycle + 245 historical rejections |
| Radius Subvention Data | Reseller purchase/subvention source | 103 |

No duplicate device identifier was found within any transaction population or across the four profiled populations.

## Canonical transaction import

| Canonical field | Source evidence | Import treatment |
|---|---|---|
| sourceSystem | Workbook/file family | Required provenance |
| sourceFile | File name and import checksum | Required; no path stored in user-facing data |
| sourceRow | Sheet and row | Required for quarantine traceability |
| leaseId | Not consistently present | Nullable at ingestion; required before claim |
| lotId | Lot Number / Lot No. / Connect | Canonicalise but retain source label |
| employerId | Client Name | Resolve to Employer Master |
| connectLegalEntityId | Partner_Name | Required transaction dimension |
| distributorId | Distributor / ND | Resolve when supplied |
| resellerId | Dealer Name | Resolve alias to canonical reseller |
| invoiceNumber | Invoice Number | Store as string to preserve formatting |
| invoiceDate | Invoice date / Transaction date | Preserve distinct source meaning |
| deviceIdentifier | Product Serial / IMEI | Required; string, not numeric |
| productCode | Product MPN | Required for product/scheme validation |
| productCategory | Product Name | Separate from product code |
| productDescription | Product description | Source description |
| tenureMonths | Tenure | Nullable where source omits it |
| calculationAmount | Financed amount / DP or Amount | Tagged with its source basis |
| calculationBasis | Explicit Radius field or resolved programme snapshot | Never inferred silently |
| rate | Interest Subvention % | Decimal rate |
| expectedSubvention | Formula or amount | Recalculate and compare to source |
| externalOutcome | Approved / Rejected / quarter marker | Normalise into separate status fields |
| externalReason | Remarks / Reason | Preserve verbatim and map to reason code |
| representationNote | Exception/partner note | Append-only response-cycle evidence |

## Required normalisation

- Counterparties use stable IDs with source aliases. Verified aliases include `Radius Systems Private Limited` / `Radius Systems Pvt Ltd` and Softcell with/without a trailing full stop.
- Connect legal entity is not constant: both Equipment Leasing and Residuary occur.
- A device identifier may be a 15-digit IMEI or an alphanumeric serial.
- Excel total/control rows are not transactions and must be quarantined or classified as controls.
- Invoice numbers and device identifiers are strings even when Excel stores them as numbers.
- Quarter, eligibility, claim, OEM response, billing, collection, and accounting statuses are distinct dimensions.

## Rule evidence

The workbooks directly support these configurable rules:

1. Calculation basis can be Base Value or Invoice Value.
2. Rates observed are 2.45%, 2.50%, 2.75%, 3.00%, and 3.50%.
3. Employer programme context can change rate/basis for the same OEM family.
4. Filing timeline is 90 days in the observed Apple rejection workflow, but remains configurable.
5. Duplicate/other-partner validation, product-code validity, and price ceiling are separate eligibility checks.
6. Mixed approval/rejection responses occur within one response population.
7. Rejected transactions can enter a representation cycle without overwriting the original decision.
8. The approved transaction sum must reconcile to the MIS summary.

## Import and eligibility controls

- Parse first; never partially write a file directly into the transaction repository.
- Validate required identifiers, dates, positive amounts, rate, product code, and counterparty resolution.
- Detect duplicates within the file, repository, approved claims, and alternative partner submissions.
- Recalculate expected subvention from the resolved rule snapshot and compare it with source amount.
- Quarantine unknown employers, legal entities, counterparties, products, ambiguous schemes, totals, and malformed rows.
- Require an authorised, audited override for timeline, partner, product, or price exceptions.
- Preserve the original row, normalised row, validation findings, rule decision chain, and import actor.

## Seed-data direction

Seed data should reproduce the evidenced shapes without copying client rows:

- Ingram and Redington Apple settlement paths.
- Employer-specific 3.0% and 3.5% Apple programmes.
- Base-value Samsung programme at 2.5%, tablet variant at 2.45%.
- Invoice-value programme variants at 2.75% and 3.5%.
- Equipment Leasing and Residuary legal-entity dimensions.
- Eligible, expired, partner-mismatch, invalid-product, price-ceiling, rejected, represented, and deferred examples.
- Numeric and alphanumeric synthetic device identifiers.
