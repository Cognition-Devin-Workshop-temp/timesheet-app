# Root Cause Analysis: Date Stored as Unix Timestamp

## Bug Summary

Work entry dates are stored in SQLite as raw Unix timestamps (milliseconds since epoch) instead of ISO date strings. This causes CSV and PDF exports to display meaningless numbers like `1780617600000` instead of readable dates like `2026-06-05`.

## Symptoms

| Surface | Before Fix | After Fix |
|---------|-----------|-----------|
| API response (`GET /api/work-entries`) | `"date": 1780617600000` | `"date": "2026-06-05"` |
| CSV export | `1780617600000,4.5,...` | `2026-06-05,4.5,...` |
| PDF export | `1780617600000` in date column | `2026-06-05` in date column |
| Frontend (UI) | Renders correctly* | Renders correctly |

\* The frontend masked the bug by wrapping the value in `new Date(entry.date).toLocaleDateString()`, which accepts both timestamps and strings.

## Root Cause

The Joi validation schema used `Joi.date().iso()` to validate the `date` field:

```javascript
// backend/src/validation/schemas.js (BEFORE)
const workEntrySchema = Joi.object({
  ...
  date: Joi.date().iso().required()
});
```

`Joi.date().iso()` performs two actions:
1. **Validates** that the input is a valid ISO 8601 date string
2. **Converts** the string into a JavaScript `Date` object

When this `Date` object is then passed to the sqlite3 driver's parameterized query:

```javascript
db.run('INSERT INTO work_entries (..., date) VALUES (..., ?)', [..., date], ...)
```

The `sqlite3` Node.js binding serializes JavaScript `Date` objects as their numeric value (milliseconds since Unix epoch). SQLite's flexible type system stores this number without complaint — the column is declared `DATE` but SQLite doesn't enforce type affinity on inserted values.

The end result: `"2026-06-05"` goes in, `1780617600000` comes out.

## Impact

- **CSV exports are unusable** — date column shows raw timestamps that are meaningless to users
- **PDF exports show gibberish dates** — same timestamp numbers appear in the PDF document
- **API consumers get unexpected types** — any external integration expecting ISO date strings receives numbers instead
- **Data portability is broken** — exported data cannot be imported into other tools without manual date conversion
- **Projects feature (startDate) has the same bug** — the same `Joi.date().iso()` pattern was used

## Fix

Added a reusable `isoDateString` Joi custom type that validates the date format (keeping the strong ISO validation) but converts the `Date` object back to a `YYYY-MM-DD` string before the value reaches the route handler:

```javascript
// backend/src/validation/schemas.js (AFTER)
const isoDateString = Joi.date().iso().custom((value) => {
  return value.toISOString().split('T')[0];
});

const workEntrySchema = Joi.object({
  ...
  date: isoDateString.required()
});
```

This fix:
- Preserves Joi's date validation (rejects invalid dates like `2026-02-30`)
- Ensures the database always stores proper `YYYY-MM-DD` strings
- Is applied to both `workEntrySchema`, `updateWorkEntrySchema`, `projectSchema`, and `updateProjectSchema`
- Requires no changes to routes, frontend, or export logic

## Verification

All 192 existing tests pass after the fix. The CSV export now produces:

```
Date,Hours,Description,Created At
2026-06-05,4.5,After fix test,2026-06-05 19:42:43
```

## Other Bugs Found During Testing

1. **XSS vectors accepted** — Client names like `<script>alert(1)</script>` are stored as-is. Not exploitable (React escapes output) but represents a defense-in-depth gap.
2. **Work entries cascade-deleted with client** — Deleting a client silently removes all associated work entries. No warning is shown to the user. This could lead to accidental data loss.
