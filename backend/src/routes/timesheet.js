const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateUser);

// GET /api/timesheet?weekStart=YYYY-MM-DD
// Returns work entries for the week grouped by client and day
router.get('/', (req, res) => {
  const { weekStart } = req.query;

  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart query param required (YYYY-MM-DD)' });
  }

  const start = new Date(weekStart + 'T00:00:00Z');
  if (isNaN(start.getTime())) {
    return res.status(400).json({ error: 'Invalid weekStart date' });
  }

  // Compute weekEnd (6 days after weekStart)
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd = end.toISOString().split('T')[0];

  const db = getDatabase();

  // Fetch all entries for the user in this date range
  db.all(
    `SELECT we.id, we.client_id, we.hours, we.description, we.date,
            c.name as client_name
     FROM work_entries we
     JOIN clients c ON we.client_id = c.id
     WHERE we.user_email = ? AND we.date >= ? AND we.date <= ?
     ORDER BY c.name, we.date`,
    [req.userEmail, weekStart, weekEnd],
    (err, entries) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Also fetch all clients for this user to show in the grid
      db.all(
        'SELECT id, name FROM clients WHERE user_email = ? ORDER BY name',
        [req.userEmail],
        (err, clients) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          res.json({ weekStart, weekEnd, entries, clients });
        }
      );
    }
  );
});

// PUT /api/timesheet
// Bulk save timesheet entries for a week.
// Body: { weekStart: "YYYY-MM-DD", entries: [{ clientId, date, hours, description? }] }
// Replaces all entries for this user in the given week for the specified clients.
router.put('/', (req, res) => {
  const { weekStart, entries } = req.body;

  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart required (YYYY-MM-DD)' });
  }

  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'entries must be an array' });
  }

  // Validate each entry
  for (const entry of entries) {
    if (!entry.clientId || typeof entry.clientId !== 'number') {
      return res.status(400).json({ error: 'Each entry must have a numeric clientId' });
    }
    if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      return res.status(400).json({ error: 'Each entry must have a date (YYYY-MM-DD)' });
    }
    if (typeof entry.hours !== 'number' || entry.hours < 0 || entry.hours > 24) {
      return res.status(400).json({ error: 'Each entry must have hours between 0 and 24' });
    }
  }

  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd = end.toISOString().split('T')[0];

  const db = getDatabase();

  // Collect unique clientIds from entries
  const clientIds = [...new Set(entries.map(e => e.clientId))];

  if (clientIds.length === 0) {
    return res.json({ message: 'No entries to save', saved: 0 });
  }

  // Verify all clients belong to the user
  const placeholders = clientIds.map(() => '?').join(',');
  db.all(
    `SELECT id FROM clients WHERE id IN (${placeholders}) AND user_email = ?`,
    [...clientIds, req.userEmail],
    (err, validClients) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const validIds = new Set(validClients.map(c => c.id));
      const invalidIds = clientIds.filter(id => !validIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: `Invalid client IDs: ${invalidIds.join(', ')}` });
      }

      // Delete existing entries for these clients in this week, then insert new ones
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Delete old entries for the touched clients in this week
        db.run(
          `DELETE FROM work_entries
           WHERE user_email = ? AND date >= ? AND date <= ?
           AND client_id IN (${placeholders})`,
          [req.userEmail, weekStart, weekEnd, ...clientIds]
        );

        // Insert new entries (skip zero-hour entries)
        const nonZeroEntries = entries.filter(e => e.hours > 0);
        let inserted = 0;

        if (nonZeroEntries.length === 0) {
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Commit error:', err);
              return res.status(500).json({ error: 'Failed to save timesheet' });
            }
            return res.json({ message: 'Timesheet saved', saved: 0 });
          });
          return;
        }

        const insertStmt = db.prepare(
          'INSERT INTO work_entries (client_id, user_email, hours, description, date) VALUES (?, ?, ?, ?, ?)'
        );

        for (const entry of nonZeroEntries) {
          insertStmt.run(
            entry.clientId,
            req.userEmail,
            entry.hours,
            entry.description || null,
            entry.date,
            (err) => {
              if (err) console.error('Insert error:', err);
              else inserted++;
            }
          );
        }

        insertStmt.finalize(() => {
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Commit error:', err);
              return res.status(500).json({ error: 'Failed to save timesheet' });
            }
            res.json({ message: 'Timesheet saved', saved: inserted });
          });
        });
      });
    }
  );
});

module.exports = router;
