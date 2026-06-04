# Root Cause Analysis: Work Entry Dates Stored as Epoch Milliseconds

## Bug Summary

Work entry dates are stored in SQLite as epoch milliseconds (e.g., `1718409600000`) instead of ISO date strings (e.g., `"2024-06-15"`). This causes CSV and PDF exports to display raw numeric timestamps instead of human-readable dates.

## Impact

| Area | Severity | Description |
|------|----------|-------------|
| CSV Export | **Critical** | Date column shows `1718409600000` instead of `2024-06-15` |
| PDF Export | **Critical** | Date rendered as numeric timestamp in generated PDFs |
| API Response | **High** | `date` field returned as number, not string — fragile for consumers |
| Frontend Display | Low | Works by coincidence (`new Date(epoch_ms)` is valid JS) |
| Date Sorting | Low | Numeric sort still works correctly by accident |

## Root Cause

The bug occurs in `backend/src/routes/workEntries.js` in both the **create** (POST) and **update** (PUT) handlers.

### The Chain of Events

1. **Frontend** sends a valid ISO date string: `"2024-06-15"`
2. **Joi validation** (`Joi.date().iso()`) converts the string to a JavaScript `Date` object
3. The `Date` object is passed directly to the SQLite query parameter
4. **Node's `sqlite3` driver** calls `.valueOf()` on the `Date` object, storing it as epoch milliseconds (`1718409600000`)

### Why It Happens

Joi's `date().iso()` validator is designed to *parse and normalize* date inputs — it accepts an ISO string and returns a `Date` object. This is useful for in-memory validation, but problematic when the value is passed directly to a database driver that doesn't have native `Date` type support.

SQLite's type system stores values as one of: NULL, INTEGER, REAL, TEXT, or BLOB. The Node.js `sqlite3` package maps JavaScript types to SQLite types, and for objects (including `Date`), it calls `.valueOf()` which returns the numeric epoch representation.

### Affected Code (Before Fix)

```javascript
// POST /api/work-entries (create)
const { clientId, hours, description, date } = value;  // date is a Date object
db.run('INSERT INTO work_entries (..., date) VALUES (..., ?)',
  [clientId, req.userEmail, hours, description || null, date]  // Date object → epoch ms
);

// PUT /api/work-entries/:id (update)
if (value.date !== undefined) {
  updates.push('date = ?');
  values.push(value.date);  // Date object → epoch ms
}
```

## Fix Applied

Convert the Joi-returned `Date` object back to a `YYYY-MM-DD` string before passing it to SQLite:

```javascript
// POST /api/work-entries (create)
const { clientId, hours, description, date: rawDate } = value;
const date = rawDate instanceof Date ? rawDate.toISOString().split('T')[0] : rawDate;

// PUT /api/work-entries/:id (update)
if (value.date !== undefined) {
  updates.push('date = ?');
  const dateStr = value.date instanceof Date ? value.date.toISOString().split('T')[0] : value.date;
  values.push(dateStr);
}
```

## Verification

### Before Fix
```
$ curl .../api/work-entries -H "x-user-email: test@example.com"
{"workEntries":[{"date": 1718409600000, ...}]}

$ curl .../api/reports/export/csv/1 -H "x-user-email: test@example.com"
Date,Hours,Description,Created At
1718409600000,8,Test work,2026-06-04 15:59:20
```

### After Fix
```
$ curl .../api/work-entries -H "x-user-email: test@example.com"
{"workEntries":[{"date": "2024-06-15", ...}]}

$ curl .../api/reports/export/csv/1 -H "x-user-email: test@example.com"
Date,Hours,Description,Created At
2024-06-15,8,Test work,2026-06-04 16:03:22
```

## Prevention

To prevent similar issues in the future:

1. **Explicit type conversion at storage boundaries** — Always convert Joi-validated values to their intended storage format before passing to the database driver.
2. **Integration tests for export output** — Add tests that assert CSV/PDF content contains properly formatted dates, not raw numbers.
3. **Consider using `Joi.string().isoDate()`** — This validates the format without converting to a `Date` object, preserving the string type throughout the pipeline.
