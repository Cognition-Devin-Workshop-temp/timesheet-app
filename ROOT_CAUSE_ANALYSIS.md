# Root Cause Analysis — Foreign Key Cascade Bug

## Bug Summary

Deleting a client causes its associated work entries to silently disappear from the UI without being properly deleted from the database. Users lose tracked work hours with no warning, error message, or ability to recover the data.

## Root Cause

SQLite requires `PRAGMA foreign_keys = ON` to enforce foreign key constraints, including `ON DELETE CASCADE`. This pragma is **OFF by default** in every new SQLite connection.

The schema in `backend/src/database/init.js` correctly declares cascade behavior:

```sql
FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
```

However, without `PRAGMA foreign_keys = ON`, the cascade never fires. When a client is deleted:

1. The client row is removed from the `clients` table.
2. The related `work_entries` rows are **not** cascade-deleted — they remain in the database with a `client_id` pointing to a non-existent client (orphaned rows).
3. The work entries API query uses `INNER JOIN clients c ON we.client_id = c.id`, which silently filters out orphaned rows because no matching client exists.
4. The UI shows an empty work entries list — the data still exists in the database but is invisible.

## Impact

**Silent data loss** — users lose all tracked work hours for a deleted client with no warning or error. The orphaned rows are irrecoverable through the UI, and there is no indication that data was lost.

## Fix

Added `PRAGMA foreign_keys = ON` as the first statement inside `database.serialize()` in `backend/src/database/init.js`:

```js
database.serialize(() => {
  // Enable foreign key constraints (SQLite has them OFF by default)
  database.run('PRAGMA foreign_keys = ON');

  // Create users table
  database.run(`...
```

This ensures:
- `ON DELETE CASCADE` works correctly — deleting a client automatically deletes its work entries at the database level.
- All foreign key references are enforced, preventing orphaned rows.

## How to Verify

1. Start the backend (`cd backend && npm run dev`).
2. Log in and create a client.
3. Add several work entries for that client.
4. Delete the client from the Clients page.
5. Navigate to Work Entries — entries should be properly cascade-deleted (empty list), not silently orphaned.

## Other Known Issues

- **Timezone display bug** (`frontend/src/pages/WorkEntriesPage.tsx`): Date-only strings (e.g., `2025-01-15`) are parsed via `new Date(entry.date)` which interprets them as UTC midnight. In negative-offset timezones this shifts the displayed date back by one day. A fix would be to append `T00:00:00` or split the date string and display it directly.
- **Missing JWT implementation**: The auth flow uses a simple email-only login with no password or token-based authentication (`jsonwebtoken` is absent from the backend). This is a known gap for future hardening.
