const { getDatabase } = require('../database/init');

function requireTeamAccess(req, res, next) {
  const db = getDatabase();
  const teamId = parseInt(req.params.teamId);

  if (isNaN(teamId)) {
    return res.status(400).json({ error: 'Invalid team ID' });
  }

  db.get(
    `SELECT t.id, t.manager_email, tm.role
     FROM teams t
     LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_email = ?
     WHERE t.id = ? AND (t.manager_email = ? OR tm.user_email IS NOT NULL)`,
    [req.userEmail, teamId, req.userEmail],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!row) {
        return res.status(403).json({ error: 'Not a member of this team' });
      }
      req.teamId = teamId;
      req.isTeamManager = row.manager_email === req.userEmail;
      req.teamRole = row.role;
      next();
    }
  );
}

module.exports = { requireTeamAccess };
