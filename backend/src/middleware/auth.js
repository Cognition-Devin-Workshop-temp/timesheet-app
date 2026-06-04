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
  
  // Upsert in a single statement to avoid read-then-write race under load
  db.run('INSERT OR IGNORE INTO users (email) VALUES (?)', [userEmail], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    req.userEmail = userEmail;
    next();
  });
}

module.exports = {
  authenticateUser
};
