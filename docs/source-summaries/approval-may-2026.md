# Approval May 2026 — verified source summary

Source: `Approval_May26_Connect.xlsx`, inspected read-only on 2026-07-28.

## Verified population

- 145 device transactions plus one formula-total row.
- 145 unique device identifiers; no duplicates within the file.
- 10 employers and 15 lots.
- Financed amount: ₹14,361,786.85.
- Calculated subvention: ₹502,662.54.
- Claimable/quarter-tagged subvention: ₹498,861.33.
- Rejected subvention: ₹3,801.21 from one transaction.

## Commercial evidence

- Distributor: Ingram Micro India Private Limited.
- Rate: 3.5% for every transaction in this file.
- Tenures: 12 months (88), 24 months (25), and 48 months (32).
- Connect entity: Connect Equipment Leasing Private Limited (113) and Connect Residuary Private Limited (32).
- Reseller values contain two labels for Radius (`Private Limited` and `Pvt Ltd`) and one Softcell label.

## Outcome evidence

- Quarter/status field: Q3'26 (141), Q2'26 (3), Rejected (1).
- Rejection reason: `Validated on another partner`.

## Implementation implications

- Legal entity is transaction-level data, not a platform constant.
- Counterparty and reseller names require canonical IDs plus preserved source labels.
- Quarter and adjudication status must be separate fields even though the source combines them.
- The imported total row must be classified as a control row, not a transaction.
