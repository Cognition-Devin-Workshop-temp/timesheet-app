const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/stats - Get dashboard statistics
router.get('/', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM reports').get();
  const byStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM reports GROUP BY status'
  ).all();
  const bySeverity = db.prepare(
    'SELECT severity, COUNT(*) as count FROM reports GROUP BY severity'
  ).all();
  const recentReports = db.prepare(
    'SELECT * FROM reports ORDER BY created_at DESC LIMIT 5'
  ).all();

  // Reports in last 7 days
  const lastWeek = db.prepare(
    "SELECT COUNT(*) as count FROM reports WHERE created_at >= datetime('now', '-7 days')"
  ).get();

  // Cleaned in last 7 days
  const cleanedLastWeek = db.prepare(
    "SELECT COUNT(*) as count FROM reports WHERE status = 'cleaned' AND updated_at >= datetime('now', '-7 days')"
  ).get();

  res.json({
    success: true,
    data: {
      total: total.count,
      byStatus: byStatus.reduce((acc, row) => { acc[row.status] = row.count; return acc; }, {}),
      bySeverity: bySeverity.reduce((acc, row) => { acc[row.severity] = row.count; return acc; }, {}),
      recentReports,
      lastWeek: lastWeek.count,
      cleanedLastWeek: cleanedLastWeek.count
    }
  });
});

module.exports = router;
