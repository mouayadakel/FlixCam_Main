# Equipment vs Excel Source of Truth Report

**Generated:** Comparison of database equipment vs `equipment-full-ai-filled_last_import.xlsx`

---

## Summary

| Metric | Count |
|--------|-------|
| Equipment in DB | 260 |
| Items in Excel | 171 |
| **Equipment OUTSIDE Excel** | **133** |
| QSM items in Excel | 0 |
| QSM items in DB (not in Excel) | 100 |

---

## 1. Equipment Outside the Excel (133 items)

These 133 equipment items exist in the database but are **not** found in the Excel source-of-truth file (by name or SKU match).

### Why are they outside the Excel?

1. **Different import sources** – The Excel uses `BRAND-MODEL-###` SKU format (e.g. `SONY-SONY-A7R5-002`, `FLIX-HARD-CASE-2-002`). The DB also has items from:
   - **QSM** prefix (QSM-001–QSM-100): ~100 items from a different import flow
   - **Flix Stock** script: `FLX-*`, `STAB-*`, `CASE-*`, `GRIP-*`, `SND-*`, `PWR-*`, `LIVE-*` SKUs

2. **Manual entry** – Admin/vendor equipment added outside the import flow

3. **Different naming** – Excel uses `name_en` / `model`; DB may use Arabic suffixes or different wording (e.g. "Sony FX3 سوني" vs "Sony FX3 Cinema Camera")

4. **Legacy / removed** – Items removed from Excel but still active in DB

5. **Vendor equipment** – Equipment added by vendors

---

## 2. QSM SKU Items in Excel

**Count: 0**

No rows in `equipment-full-ai-filled_last_import.xlsx` have SKU containing "QSM". The Excel uses the `BRAND-MODEL-###` SKU format (e.g. `SONY-SONY-A7R5-002`, `FLIX-HARD-CASE-2-002`).

---

## 3. QSM SKU Items in DB (not in Excel)

**Count: 100**

These 100 equipment items have SKU containing "QSM" and exist only in the database. They are not in the Excel file.

| # | SKU | Display Name |
|---|-----|--------------|
| 1 | QSM-002 | Aputure Light Dome Mini II دووم ميني |
| 2 | QSM-006 | Impact Safety Cable |
| 3 | QSM-007 | Sony A7S III سوني |
| ... | ... | ... |
| 100 | QSM-063 | Sound Engineer مهندس صوت |

*(Full list available by running `npx tsx scripts/compare-equipment-with-excel.ts`)*

---

## How to regenerate this report

```bash
npx tsx scripts/compare-equipment-with-excel.ts
```
