# Root Cause Analysis: Date Off-by-One Bug

## Bug Summary
Work entry dates display incorrectly and shift backward by one day each time an entry is edited.

## Symptoms
- Dates in work entries table, reports, and dashboard show one day earlier than the actual date (in timezones west of UTC)
- Editing a work entry and saving it without changes causes the date to shift backward by one day
- Repeated edits cause cumulative date drift

## Root Cause
JavaScript's `new Date("YYYY-MM-DD")` parses date-only strings as UTC midnight per the ECMAScript spec. When displayed using `toLocaleDateString()` in a timezone behind UTC (e.g., US timezones), the UTC midnight time rolls back to the previous day in local time.

The same issue corrupts data on edit: the date is parsed as UTC, converted back to an ISO string (still in UTC), and the resulting date string is one day behind.

### Affected Files
- `frontend/src/pages/WorkEntriesPage.tsx` — display and edit form
- `frontend/src/pages/ReportsPage.tsx` — report table display
- `frontend/src/pages/DashboardPage.tsx` — recent entries display

## Fix
Created timezone-safe date parsing and formatting utilities in `frontend/src/utils/date.ts`. All date-only strings from the API are now parsed as local dates using `new Date(year, month - 1, day)` instead of `new Date("YYYY-MM-DD")`. Date serialization for API requests uses local date components instead of `toISOString()`.

## Prevention
- Added shared utility functions for date handling to prevent future instances
- All date-only strings should be parsed with the local-time-aware utility, never with `new Date(dateString)` directly
