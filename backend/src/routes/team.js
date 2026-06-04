const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser, requireManager } = require('../middleware/auth');
const { teamWorkloadQuerySchema, updateMemberSchema } = require('../validation/schemas');

const router = express.Router();

// All team routes require authentication and manager role
router.use(authenticateUser);
router.use(requireManager);

// Helper: get Monday of the current week
function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (d) => d.toISOString().split('T')[0];
  return { startDate: format(monday), endDate: format(sunday) };
}

// GET /workload
router.get('/workload', (req, res) => {
  const { error, value } = teamWorkloadQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  let { startDate, endDate } = value;
  if (!startDate || !endDate) {
    const defaults = getCurrentWeekRange();
    startDate = startDate || defaults.startDate;
    endDate = endDate || defaults.endDate;
  }

  // Format dates as strings if they are Date objects
  if (startDate instanceof Date) startDate = startDate.toISOString().split('T')[0];
  if (endDate instanceof Date) endDate = endDate.toISOString().split('T')[0];

  const db = getDatabase();

  // Get team name
  db.get('SELECT id, name FROM teams WHERE id = ?', [req.teamId], (err, team) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Get workload data for all team members
    const query = `
      SELECT
        u.email,
        u.display_name,
        u.weekly_capacity,
        COALESCE(SUM(we.hours), 0) AS total_hours,
        COUNT(we.id) AS entry_count
      FROM users u
      LEFT JOIN work_entries we ON we.user_email = u.email
        AND we.date BETWEEN ? AND ?
      WHERE u.team_id = ?
      GROUP BY u.email
    `;

    db.all(query, [startDate, endDate, req.teamId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Internal server error' });

      const members = (rows || []).map((row) => {
        const totalHours = row.total_hours;
        const capacity = row.weekly_capacity || 40;
        let utilizationPct = null;
        let status = 'healthy';

        if (capacity === 0) {
          utilizationPct = null;
          status = 'healthy';
        } else {
          utilizationPct = (totalHours / capacity) * 100;
          if (utilizationPct > 100) {
            status = 'overloaded';
          } else if (utilizationPct >= 80) {
            status = 'healthy';
          } else {
            status = 'underloaded';
          }
        }

        return {
          email: row.email,
          displayName: row.display_name || null,
          totalHours,
          capacity,
          utilizationPct: utilizationPct !== null ? Math.round(utilizationPct * 100) / 100 : null,
          entryCount: row.entry_count,
          status,
        };
      });

      const teamTotalHours = members.reduce((sum, m) => sum + m.totalHours, 0);
      const memberCount = members.length;
      const teamAvgHours = memberCount > 0 ? teamTotalHours / memberCount : 0;
      const overloadedCount = members.filter((m) => m.status === 'overloaded').length;

      res.json({
        week: { startDate, endDate },
        team: { id: team.id, name: team.name },
        summary: {
          memberCount,
          teamTotalHours,
          teamAvgHours: Math.round(teamAvgHours * 100) / 100,
          overloadedCount,
        },
        members,
      });
    });
  });
});

// GET /workload/:userEmail/breakdown
router.get('/workload/:userEmail/breakdown', (req, res) => {
  const { userEmail } = req.params;
  const { error, value } = teamWorkloadQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  let { startDate, endDate } = value;
  if (!startDate || !endDate) {
    const defaults = getCurrentWeekRange();
    startDate = startDate || defaults.startDate;
    endDate = endDate || defaults.endDate;
  }

  if (startDate instanceof Date) startDate = startDate.toISOString().split('T')[0];
  if (endDate instanceof Date) endDate = endDate.toISOString().split('T')[0];

  const db = getDatabase();

  // Verify target user belongs to same team
  db.get('SELECT email, display_name, weekly_capacity, team_id FROM users WHERE email = ?', [userEmail], (err, member) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!member) return res.status(404).json({ error: 'User not found' });
    if (member.team_id !== req.teamId) {
      return res.status(403).json({ error: 'User does not belong to your team' });
    }

    // Get total hours for this member in the date range
    db.get(
      'SELECT COALESCE(SUM(hours), 0) AS total_hours FROM work_entries WHERE user_email = ? AND date BETWEEN ? AND ?',
      [userEmail, startDate, endDate],
      (err, totals) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });

        // Get breakdown by client
        const breakdownQuery = `
          SELECT
            c.id,
            c.name,
            c.department,
            SUM(we.hours) AS hours,
            COUNT(we.id) AS entries
          FROM work_entries we
          JOIN clients c ON c.id = we.client_id
          WHERE we.user_email = ? AND we.date BETWEEN ? AND ?
          GROUP BY c.id
        `;

        db.all(breakdownQuery, [userEmail, startDate, endDate], (err, rows) => {
          if (err) return res.status(500).json({ error: 'Internal server error' });

          const breakdown = (rows || []).map((row) => ({
            clientId: row.id,
            clientName: row.name,
            department: row.department || null,
            hours: row.hours,
            entries: row.entries,
          }));

          res.json({
            member: {
              email: member.email,
              displayName: member.display_name || null,
              totalHours: totals.total_hours,
              capacity: member.weekly_capacity || 40,
            },
            week: { startDate, endDate },
            breakdown,
          });
        });
      }
    );
  });
});

// GET /members
router.get('/members', (req, res) => {
  const db = getDatabase();

  db.get('SELECT id, name FROM teams WHERE id = ?', [req.teamId], (err, team) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    db.all(
      'SELECT email, display_name, role, weekly_capacity, created_at FROM users WHERE team_id = ?',
      [req.teamId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });

        const members = (rows || []).map((row) => ({
          email: row.email,
          displayName: row.display_name || null,
          role: row.role,
          weeklyCapacity: row.weekly_capacity,
          createdAt: row.created_at,
        }));

        res.json({
          team: { id: team.id, name: team.name },
          members,
        });
      }
    );
  });
});

// PATCH /members/:userEmail
router.patch('/members/:userEmail', (req, res) => {
  const { error, value } = updateMemberSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { userEmail } = req.params;
  const db = getDatabase();

  // Verify target user belongs to same team
  db.get('SELECT email, team_id FROM users WHERE email = ?', [userEmail], (err, member) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!member) return res.status(404).json({ error: 'User not found' });
    if (member.team_id !== req.teamId) {
      return res.status(403).json({ error: 'User does not belong to your team' });
    }

    // Build dynamic update
    const updates = [];
    const params = [];

    if (value.displayName !== undefined) {
      updates.push('display_name = ?');
      params.push(value.displayName);
    }
    if (value.weeklyCapacity !== undefined) {
      updates.push('weekly_capacity = ?');
      params.push(value.weeklyCapacity);
    }
    if (value.role !== undefined) {
      updates.push('role = ?');
      params.push(value.role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(userEmail);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE email = ?`;

    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ error: 'Internal server error' });

      // Fetch updated member
      db.get(
        'SELECT email, display_name, role, weekly_capacity, created_at FROM users WHERE email = ?',
        [userEmail],
        (err, row) => {
          if (err) return res.status(500).json({ error: 'Internal server error' });

          res.json({
            member: {
              email: row.email,
              displayName: row.display_name || null,
              role: row.role,
              weeklyCapacity: row.weekly_capacity,
              createdAt: row.created_at,
            },
          });
        }
      );
    });
  });
});

module.exports = router;
