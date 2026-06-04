const { getDatabase } = require('../database/init');

// Simple email-based authentication middleware
function authenticateUser(req, res, next) {
  const userEmail = req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required in x-user-email header' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const db = getDatabase();
  
  // Check if user exists, create if not
  db.get('SELECT email, role, team_id FROM users WHERE email = ?', [userEmail], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!row) {
      // Create new user
      db.run('INSERT INTO users (email) VALUES (?)', [userEmail], (err) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        
        req.userEmail = userEmail;
        req.userRole = 'member';
        req.teamId = null;
        next();
      });
    } else {
      req.userEmail = userEmail;
      req.userRole = row.role;
      req.teamId = row.team_id;
      next();
    }
  });
}

function requireManager(req, res, next) {
  const db = getDatabase();
  db.get(
    'SELECT role, team_id FROM users WHERE email = ?',
    [req.userEmail],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Internal server error' });
      if (!row || row.role !== 'manager') {
        return res.status(403).json({ error: 'Manager access required' });
      }
      if (!row.team_id) {
        return res.status(403).json({ error: 'Manager must belong to a team' });
      }
      req.userRole = 'manager';
      req.teamId = row.team_id;
      next();
    }
  );
}

module.exports = {
  authenticateUser,
  requireManager
};
