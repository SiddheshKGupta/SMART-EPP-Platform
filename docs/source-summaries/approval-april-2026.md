# Approval April 2026 — verified source summary

Source: `Approval Apr26_Connect.xlsx`, inspected read-only on 2026-07-28.

## Verified population

- 93 device transactions plus one formula-total row.
- 93 unique device identifiers; no duplicates within the file.
- 6 employer labels and 7 lots.
- Financed amount: ₹10,099,489.62.
- Calculated subvention: ₹352,815.66.
- Claimable/quarter-tagged subvention: ₹338,253.96.
- Rejected subvention: ₹14,561.70 from four transactions.

## Commercial evidence

- Distributor: Ingram Micro India Private Limited.
- Rates: 3.5% for 91 transactions and 3.0% for two Tevapharma transactions.
- Connect entity: Connect Equipment Leasing Private Limited.
- Reseller labels include Radius, Softcell, and Dixit; Softcell also appears with a trailing full stop.

## Rejection evidence

- Validated on another partner (1).
- Financed amount exceeds maximum product price (2).
- Transaction beyond 90 days plus invalid MPN (1).

## Implementation implications

- Scheme/rate selection requires employer-programme precedence; an Apple transaction is not always 3.5%.
- Timeline, product code, price ceiling, and partner matching are independently reportable rule outcomes.
- The source combines quarter and rejection status, which must be normalised on import.
- Source labels should be retained while canonical counterparties are resolved.
