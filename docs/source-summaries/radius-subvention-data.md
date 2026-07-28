# Radius Subvention Data — verified source summary

Source: `Radius Subvention Data.xlsx`, inspected read-only on 2026-07-28.

## Verified population

- 103 transactions across two sheets and 10 lots.
- 103 unique device identifiers; no duplicates.
- Purchase amount: ₹8,274,211.45.
- Calculated subvention: ₹231,847.17.
- Employers: Maruti Suzuki (66) and Nayara Energy (37).
- Product categories: smartphone (86), iPad (10), tablet (7).
- OEM evidence in product codes/descriptions covers Samsung, Apple, and Google.

## Rate and basis combinations

| Employer/programme evidence | Basis | Rate | Transactions |
|---|---:|---:|---:|
| Maruti Suzuki | Base Value | 2.45% | 5 |
| Maruti Suzuki | Base Value | 2.50% | 61 |
| Nayara Energy | Invoice Value | 2.75% | 10 |
| Nayara Energy | Invoice Value | 3.50% | 27 |

The 3.5% group contains Samsung and Google devices. This proves that the engine must not infer rate solely from OEM or product category.

## Implementation implications

- Calculation basis and rate resolve through the applicable employer programme/scheme snapshot.
- Device identifier validation must accept both numeric IMEIs and alphanumeric serials.
- Product code, product category, and product description are separate source attributes.
- Calculation must preserve precision internally and round only under an explicit configured rule.
- Invoice date, reseller invoice number, lot, employer, reseller, device identifier, basis, and rate are required import evidence.
