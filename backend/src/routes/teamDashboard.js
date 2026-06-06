const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Get team workload dashboard data
router.get('/', (req, res) => {
  const db = getDatabase();

  // Calculate start of current week (Monday) and end (Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const todayStr = now.toISOString().split('T')[0];

  // Calculate end of upcoming window (7 days from today)
  const upcomingEnd = new Date(now);
  upcomingEnd.setDate(now.getDate() + 7);
  const upcomingEndStr = upcomingEnd.toISOString().split('T')[0];

  const results = {};
  let completed = 0;
  let hasError = false;

  function checkDone() {
    completed++;
    if (hasError) return;
    if (completed === 3) {
      res.json(results);
    }
  }

  function handleError(err) {
    if (hasError) return;
    hasError = true;
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }

  // 1. Top loggers this week: aggregate hours per user for current week
  db.all(
    `SELECT we.user_email,
            SUM(we.hours) as total_hours,
            COUNT(we.id) as entry_count
     FROM work_entries we
     WHERE we.date >= ? AND we.date <= ?
     GROUP BY we.user_email
     ORDER BY total_hours DESC
     LIMIT 20`,
    [weekStartStr, weekEndStr],
    (err, rows) => {
      if (err) return handleError(err);
      results.topLoggers = rows || [];
      checkDone();
    }
  );

  // 2. Upcoming deadlines: work entries with future dates (next 7 days)
  db.all(
    `SELECT we.user_email,
            we.date,
            we.hours,
            we.description,
            c.name as client_name
     FROM work_entries we
     JOIN clients c ON we.client_id = c.id
     WHERE we.date > ? AND we.date <= ?
     ORDER BY we.date ASC
     LIMIT 50`,
    [todayStr, upcomingEndStr],
    (err, rows) => {
      if (err) return handleError(err);
      results.upcomingDeadlines = rows || [];
      checkDone();
    }
  );

  // 3. Most active clients: ranked by work entries this week
  db.all(
    `SELECT c.id as client_id,
            c.name as client_name,
            SUM(we.hours) as total_hours,
            COUNT(we.id) as entry_count,
            COUNT(DISTINCT we.user_email) as user_count
     FROM work_entries we
     JOIN clients c ON we.client_id = c.id
     WHERE we.date >= ? AND we.date <= ?
     GROUP BY c.id, c.name
     ORDER BY total_hours DESC
     LIMIT 20`,
    [weekStartStr, weekEndStr],
    (err, rows) => {
      if (err) return handleError(err);
      results.activeClients = rows || [];
      checkDone();
    }
  );
});

module.exports = router;
