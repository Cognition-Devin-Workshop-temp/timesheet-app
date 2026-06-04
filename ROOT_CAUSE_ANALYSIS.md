# Root Cause Analysis: Work Entry Dates Stored as Numeric Timestamps

## Bug Summary

Work entry dates are stored in SQLite as **numeric millisecond timestamps** (e.g., `1780531200000`) instead of **ISO date strings** (e.g., `"2026-06-04"`). This causes:

1. **Corrupted CSV exports** — the Date column shows raw numbers like `1780531200000`
2. **Corrupted PDF exports** — dates render as `1780531200000` in generated reports
3. **Timezone-dependent date display** — for any user west of UTC, dates can appear off by one day in the frontend (e.g., June 4 stored at UTC midnight displays as June 3 in US Eastern)

## Symptoms

| Area | Before Fix | After Fix |
|---|---|---|
| API response | `"date": 1780531200000` | `"date": "2026-06-04"` |
| CSV export | `1780531200000,8,Backend development work,...` | `2026-06-04,8,Backend development work,...` |
| PDF export | Date column shows `1780531200000` | Date column shows `2026-06-04` |
| Frontend (UTC) | Displays correctly by coincidence | Displays correctly by design |
| Frontend (UTC-5) | Shows previous day (off-by-one) | Shows correct date |

## Root Cause

In `backend/src/validation/schemas.js`, the work entry date field was defined as:

```js
date: Joi.date().iso().required()
```

`Joi.date().iso()` validates the input as an ISO date string but **converts it to a JavaScript `Date` object**. When this `Date` object is passed to the SQLite3 Node.js driver as a query parameter, the driver serializes it as a **numeric Unix timestamp in milliseconds** (e.g., `new Date("2026-06-04")` → `1780531200000`).

### The conversion chain

```
Frontend sends:  "2026-06-04"           (string)
     ↓
Joi validates:   new Date("2026-06-04") (Date object, UTC midnight)
     ↓
SQLite3 stores:  1780531200000          (number, milliseconds since epoch)
     ↓
API returns:     1780531200000          (number — not a date string)
     ↓
CSV/PDF render:  "1780531200000"        (raw number as text)
```

The same issue existed in `updateWorkEntrySchema` for the optional date field.

## Fix

Changed the Joi schema from `Joi.date().iso()` to a custom `Joi.string()` validator that:

1. Validates the format matches `YYYY-MM-DD` via regex
2. Verifies the date is a valid calendar date (rejects `2026-13-45`)
3. **Preserves the value as a string** — never converts to a Date object

```js
const isoDateString = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const date = new Date(value + 'T00:00:00Z');
    if (isNaN(date.getTime())) {
      return helpers.error('any.invalid');
    }
    const [y, m, d] = value.split('-').map(Number);
    if (date.getUTCFullYear() !== y || date.getUTCMonth() + 1 !== m || date.getUTCDate() !== d) {
      return helpers.error('any.invalid');
    }
    return value;
  });
```

Applied to both `workEntrySchema` and `updateWorkEntrySchema`.

## Why This Happened

The `Joi.date().iso()` API name is misleading — it suggests "validate this is an ISO date" but actually means "parse this into a Date object." The SQLite3 driver's behavior of converting Date objects to numeric timestamps compounds the issue, since SQLite itself has no native date type and stores whatever the driver sends.

## Impact

- **All CSV exports** contained numeric timestamps instead of readable dates
- **All PDF exports** rendered numeric timestamps in the date column
- **Frontend date display** was incorrect for users in non-UTC timezones (off-by-one day)
- **Data integrity** — existing entries stored as numbers would need migration to fix (out of scope for this fix; new entries are stored correctly)

## Files Changed

- `backend/src/validation/schemas.js` — replaced `Joi.date().iso()` with string-based date validation

## Verification

- All 161 existing backend tests pass
- Frontend lint passes
- Manual testing confirmed:
  - Valid dates (`"2026-06-04"`) accepted and stored as strings
  - Invalid formats (`"June 4, 2026"`) rejected
  - Invalid calendar dates (`"2026-13-45"`) rejected
  - CSV exports show readable dates
  - PDF exports show readable dates
