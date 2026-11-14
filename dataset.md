# Synthetic Provider Dataset — Chennai

## Goal
Generate a synthetic CSV of healthcare providers across Chennai for the provider map feature. No real data. Names, phones, addresses are fictional.

## File
`backend/data/providers.csv`

## Fields

| Field | Type | Notes |
|---|---|---|
| id | int | Auto increment |
| name | string | Doctor name or hospital/lab name |
| type | enum | `individual_doctor` / `hospital` / `lab` |
| specialty | string | See list below |
| address | string | Street, area, Chennai |
| phone | string | 044-XXXXXXXX format |
| lat | float | Chennai area lat (~12.9–13.1) |
| lng | float | Chennai area lng (~80.2–80.3) |

## Specialties to Cover

- Cardiology
- Orthopedics
- Neurology
- Dermatology
- Ophthalmology
- ENT
- Gastroenterology
- Endocrinology (Diabetes)
- Nephrology
- Pulmonology
- Psychiatry
- General Medicine
- Pathology (Lab only)
- Radiology (Lab only)

## Record Counts

| Type | Count |
|---|---|
| Individual doctors | 1–2 per specialty |
| Hospitals (multi-specialty) | 5–6, spread across Chennai |
| Labs (pathology/radiology) | 4–5 |

Total: ~40–50 rows.

## Area Spread (use these Chennai zones)

- Anna Nagar
- T. Nagar
- Adyar
- Velachery
- Tambaram
- Chromepet
- Egmore
- Nungambakkam
- Mylapore
- Porur

## Rules

- Names fictional but realistic (Tamil/Indian names).
- Hospitals get multiple specialty rows (one row per specialty they cover).
- Individual doctors have exactly one specialty.
- Labs have type `lab`, specialty `Pathology` or `Radiology`.
- Phones follow `044-XXXXXXXX` (landline) or `9XXXXXXXXX` (mobile) format.
- lat/lng must fall inside Chennai bounds (lat 12.90–13.15, lng 80.17–80.30).
- No duplicate lat/lng. Offset by at least 0.005 per record.

## Output

Single CSV file. No extra files. Header row included.

```
id,name,type,specialty,address,phone,lat,lng
```
