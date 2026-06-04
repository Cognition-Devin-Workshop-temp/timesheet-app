const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { requireTeamAccess } = require('../middleware/teamAuth');
const {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
  workloadQuerySchema
} = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Create team
router.post('/', (req, res, next) => {
  try {
    const { error, value } = createTeamSchema.validate(req.body);
    if (error) return next(error);

    const db = getDatabase();
    const { name } = value;

    db.run(
      'INSERT INTO teams (name, manager_email) VALUES (?, ?)',
      [name, req.userEmail],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create team' });
        }

        const teamId = this.lastID;

        // Auto-insert manager as team member
        db.run(
          `INSERT INTO team_members (team_id, user_email, display_name, role) VALUES (?, ?, ?, 'manager')`,
          [teamId, req.userEmail, req.userEmail],
          (err) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Team created but failed to add manager as member' });
            }

            db.get('SELECT * FROM teams WHERE id = ?', [teamId], (err, team) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Team created but failed to retrieve' });
              }
              res.status(201).json({
                message: 'Team created successfully',
                team: {
                  id: team.id,
                  name: team.name,
                  managerEmail: team.manager_email,
                  createdAt: team.created_at,
                  updatedAt: team.updated_at
                }
              });
            });
          }
        );
      }
    );
  } catch (err) {
    next(err);
  }
});

// List teams for current user
router.get('/', (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT t.id, t.name, t.manager_email, t.created_at, t.updated_at,
            tm.role AS my_role,
            (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
     FROM teams t
     JOIN team_members tm ON tm.team_id = t.id AND tm.user_email = ?
     ORDER BY t.name`,
    [req.userEmail],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const teams = (rows || []).map(r => ({
        id: r.id,
        name: r.name,
        managerEmail: r.manager_email,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        myRole: r.my_role,
        memberCount: r.member_count
      }));

      res.json({ teams });
    }
  );
});

// Get team details + members
router.get('/:teamId', requireTeamAccess, (req, res) => {
  const db = getDatabase();

  db.get('SELECT * FROM teams WHERE id = ?', [req.teamId], (err, team) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    db.all(
      'SELECT user_email, display_name, weekly_capacity_hours, role, joined_at FROM team_members WHERE team_id = ? ORDER BY role DESC, display_name',
      [req.teamId],
      (err, members) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        res.json({
          team: {
            id: team.id,
            name: team.name,
            managerEmail: team.manager_email,
            createdAt: team.created_at,
            updatedAt: team.updated_at
          },
          members: (members || []).map(m => ({
            email: m.user_email,
            displayName: m.display_name,
            weeklyCapacityHours: m.weekly_capacity_hours,
            role: m.role,
            joinedAt: m.joined_at
          }))
        });
      }
    );
  });
});

// Update team name (manager only)
router.put('/:teamId', requireTeamAccess, (req, res, next) => {
  try {
    if (!req.isTeamManager) {
      return res.status(403).json({ error: 'Only the team manager can update the team' });
    }

    const { error, value } = updateTeamSchema.validate(req.body);
    if (error) return next(error);

    const db = getDatabase();

    db.run(
      'UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [value.name, req.teamId],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to update team' });
        }

        db.get('SELECT * FROM teams WHERE id = ?', [req.teamId], (err, team) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Team updated but failed to retrieve' });
          }
          res.json({
            message: 'Team updated successfully',
            team: {
              id: team.id,
              name: team.name,
              managerEmail: team.manager_email,
              createdAt: team.created_at,
              updatedAt: team.updated_at
            }
          });
        });
      }
    );
  } catch (err) {
    next(err);
  }
});

// Delete team (manager only)
router.delete('/:teamId', requireTeamAccess, (req, res) => {
  if (!req.isTeamManager) {
    return res.status(403).json({ error: 'Only the team manager can delete the team' });
  }

  const db = getDatabase();

  db.run('DELETE FROM teams WHERE id = ?', [req.teamId], function (err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to delete team' });
    }
    res.json({ message: 'Team deleted successfully' });
  });
});

// Add member (manager only)
router.post('/:teamId/members', requireTeamAccess, (req, res, next) => {
  try {
    if (!req.isTeamManager) {
      return res.status(403).json({ error: 'Only the team manager can add members' });
    }

    const { error, value } = addTeamMemberSchema.validate(req.body);
    if (error) return next(error);

    const { email, displayName, weeklyCapacityHours } = value;
    const db = getDatabase();

    // Auto-create user if not exists (matching auth middleware pattern)
    db.get('SELECT email FROM users WHERE email = ?', [email], (err, userRow) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const insertMember = () => {
        db.run(
          'INSERT INTO team_members (team_id, user_email, display_name, weekly_capacity_hours, role) VALUES (?, ?, ?, ?, ?)',
          [req.teamId, email, displayName, weeklyCapacityHours, 'member'],
          function (err) {
            if (err) {
              if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'User is already a member of this team' });
              }
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to add member' });
            }
            res.status(201).json({
              message: 'Member added successfully',
              member: {
                email,
                displayName,
                weeklyCapacityHours,
                role: 'member'
              }
            });
          }
        );
      };

      if (!userRow) {
        db.run('INSERT INTO users (email) VALUES (?)', [email], (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }
          insertMember();
        });
      } else {
        insertMember();
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update member (manager only)
router.put('/:teamId/members/:email', requireTeamAccess, (req, res, next) => {
  try {
    if (!req.isTeamManager) {
      return res.status(403).json({ error: 'Only the team manager can update members' });
    }

    const { error, value } = updateTeamMemberSchema.validate(req.body);
    if (error) return next(error);

    const memberEmail = req.params.email;
    const db = getDatabase();

    const updates = [];
    const values = [];

    if (value.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(value.displayName);
    }
    if (value.weeklyCapacityHours !== undefined) {
      updates.push('weekly_capacity_hours = ?');
      values.push(value.weeklyCapacityHours);
    }

    values.push(req.teamId, memberEmail);

    db.run(
      `UPDATE team_members SET ${updates.join(', ')} WHERE team_id = ? AND user_email = ?`,
      values,
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to update member' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Member not found in this team' });
        }
        res.json({ message: 'Member updated successfully' });
      }
    );
  } catch (err) {
    next(err);
  }
});

// Remove member (manager only)
router.delete('/:teamId/members/:email', requireTeamAccess, (req, res) => {
  if (!req.isTeamManager) {
    return res.status(403).json({ error: 'Only the team manager can remove members' });
  }

  const memberEmail = req.params.email;
  const db = getDatabase();

  // Cannot remove the manager
  db.get('SELECT manager_email FROM teams WHERE id = ?', [req.teamId], (err, team) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!team || team.manager_email === memberEmail) {
      return res.status(400).json({ error: 'Cannot remove the team manager' });
    }

    db.run(
      'DELETE FROM team_members WHERE team_id = ? AND user_email = ?',
      [req.teamId, memberEmail],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to remove member' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Member not found in this team' });
        }
        res.json({ message: 'Member removed successfully' });
      }
    );
  });
});

// Get team workload
router.get('/:teamId/workload', requireTeamAccess, (req, res, next) => {
  try {
    const { error, value } = workloadQuerySchema.validate(req.query);
    if (error) return next(error);

    const { startDate, endDate } = value;
    const startStr = new Date(startDate).toISOString().split('T')[0];
    const endStr = new Date(endDate).toISOString().split('T')[0];

    const db = getDatabase();

    // Calculate number of weeks in the period for capacity calculation
    const msPerDay = 86400000;
    const days = Math.round((new Date(endStr) - new Date(startStr)) / msPerDay) + 1;
    const weeks = days / 7;

    db.all(
      `SELECT tm.user_email, tm.display_name, tm.weekly_capacity_hours, tm.role,
              COALESCE(SUM(we.hours), 0) AS total_hours, COUNT(we.id) AS entry_count
       FROM team_members tm
       LEFT JOIN work_entries we ON we.user_email = tm.user_email AND we.date BETWEEN ? AND ?
       WHERE tm.team_id = ?
       GROUP BY tm.user_email, tm.display_name, tm.weekly_capacity_hours, tm.role
       ORDER BY total_hours DESC`,
      [startStr, endStr, req.teamId],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        const members = (rows || []).map(r => {
          const capacityHours = r.weekly_capacity_hours * weeks;
          let utilizationPct = null;
          let status = 'unknown';

          if (capacityHours > 0) {
            utilizationPct = Math.round((r.total_hours / capacityHours) * 10000) / 100;
            if (utilizationPct >= 100) status = 'overloaded';
            else if (utilizationPct >= 80) status = 'at-risk';
            else if (utilizationPct >= 40) status = 'on-track';
            else status = 'underutilized';
          }

          return {
            email: r.user_email,
            displayName: r.display_name,
            role: r.role,
            totalHours: r.total_hours,
            entryCount: r.entry_count,
            capacityHours: Math.round(capacityHours * 100) / 100,
            utilizationPct,
            status
          };
        });

        const totalTeamHours = members.reduce((s, m) => s + m.totalHours, 0);
        const totalTeamCapacity = members.reduce((s, m) => s + m.capacityHours, 0);
        const teamUtilizationPct = totalTeamCapacity > 0
          ? Math.round((totalTeamHours / totalTeamCapacity) * 10000) / 100
          : 0;

        const summary = {
          totalTeamHours,
          totalTeamCapacity,
          teamUtilizationPct,
          memberCount: members.length,
          overloadedCount: members.filter(m => m.status === 'overloaded').length,
          atRiskCount: members.filter(m => m.status === 'at-risk').length,
          onTrackCount: members.filter(m => m.status === 'on-track').length,
          underutilizedCount: members.filter(m => m.status === 'underutilized').length
        };

        db.get('SELECT id, name FROM teams WHERE id = ?', [req.teamId], (err, team) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          if (!team) {
            return res.status(404).json({ error: 'Team not found' });
          }

          res.json({
            team: { id: team.id, name: team.name },
            period: { startDate: startStr, endDate: endStr },
            summary,
            members
          });
        });
      }
    );
  } catch (err) {
    next(err);
  }
});

// Get team workload breakdown per client
router.get('/:teamId/workload/breakdown', requireTeamAccess, (req, res, next) => {
  try {
    const { error, value } = workloadQuerySchema.validate(req.query);
    if (error) return next(error);

    const { startDate, endDate } = value;
    const startStr = new Date(startDate).toISOString().split('T')[0];
    const endStr = new Date(endDate).toISOString().split('T')[0];

    const db = getDatabase();

    db.all(
      `SELECT tm.user_email, tm.display_name,
              c.id AS client_id, c.name AS client_name,
              COALESCE(SUM(we.hours), 0) AS hours, COUNT(we.id) AS entry_count
       FROM team_members tm
       LEFT JOIN work_entries we ON we.user_email = tm.user_email AND we.date BETWEEN ? AND ?
       LEFT JOIN clients c ON c.id = we.client_id
       WHERE tm.team_id = ?
       GROUP BY tm.user_email, tm.display_name, c.id, c.name
       ORDER BY tm.display_name, hours DESC`,
      [startStr, endStr, req.teamId],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        // Group by member
        const memberMap = {};
        (rows || []).forEach(r => {
          if (!memberMap[r.user_email]) {
            memberMap[r.user_email] = {
              email: r.user_email,
              displayName: r.display_name,
              clients: []
            };
          }
          if (r.client_id) {
            memberMap[r.user_email].clients.push({
              clientId: r.client_id,
              clientName: r.client_name,
              hours: r.hours,
              entryCount: r.entry_count
            });
          }
        });

        db.get('SELECT id, name FROM teams WHERE id = ?', [req.teamId], (err, team) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          if (!team) {
            return res.status(404).json({ error: 'Team not found' });
          }

          if (!team) {
            return res.status(404).json({ error: 'Team not found' });
          }

          res.json({
            team: { id: team.id, name: team.name },
            period: { startDate: startStr, endDate: endStr },
            breakdown: Object.values(memberMap)
          });
        });
      }
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
