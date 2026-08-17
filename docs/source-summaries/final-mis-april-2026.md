# Final MIS April 2026 — verified source summary

Source: `Final_MIS_Apr_26.xlsb`, inspected read-only on 2026-07-28.

## Workbook structure

- `Summary`: approved April amount of ₹241,691.82.
- `Connect`: 67 device transactions routed through Redington.
- `Sheet1`: supporting lot/device reference data.
- `Connect Mar26 FC Rejection`: 243 rejected transactions.
- `Connect Feb26 FC Rejection`: 2 rejected transactions.

## April response population

- 67 unique device identifiers; no duplicates within the sheet.
- 64 approved transactions and 3 rejected transactions.
- Financed amount represented: ₹7,219,017.45.
- Gross expected subvention: ₹252,665.61.
- Approved subvention: ₹241,691.82, which ties exactly to `Summary`.
- Rejected subvention: ₹10,973.79.
- Distributor: Redington Limited.

April rejection reasons:

- Validated on another partner.
- Financed amount exceeds maximum product price.
- May transaction deferred to the next claim cycle.

## Historical rejection/representation evidence

- 245 unique rejected transactions across February and March rejection sheets.
- Expected subvention represented: ₹539,890.35.
- 242 were beyond the 90-day transaction timeline and include an exception representation note.
- 2 exceeded 100% of product MRP.
- 1 was validated on another partner.

## Implementation implications

- OEM response must be transaction-level and support mixed approved/rejected batches.
- Original reason, representation note, response cycle, and final decision must be stored separately.
- A filing-timeline failure can enter authorised exception review; it is not silently made eligible.
- Expected, approved, rejected, deferred, invoiced, and collected values require distinct fields.
- Summary amounts must reconcile to transaction-level approved values.
