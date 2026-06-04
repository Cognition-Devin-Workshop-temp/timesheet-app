const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

// Authentication middleware — supports JWT Bearer token and x-user-email header fallback
function authenticateUser(req, res, next) {
  // 1. Try Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const jwtSecret =
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-this-in-production-min-32-chars';

    try {
      const decoded = jwt.verify(token, jwtSecret);
      const email = decoded.email;
      if (email) {
        return upsertAndContinue(email, req, res, next);
      }
    } catch (err) {
      // Token invalid/expired — fall through to header check
    }
  }

  // 2. Fall back to x-user-email header
  const userEmail = req.headers['x-user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  upsertAndContinue(userEmail, req, res, next);
}

function upsertAndContinue(userEmail, req, res, next) {
  const db = getDatabase();

  // Check if user exists, create if not
  db.get('SELECT email FROM users WHERE email = ?', [userEmail], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!row) {
      db.run('INSERT INTO users (email) VALUES (?)', [userEmail], (insertErr) => {
        if (insertErr) {
          console.error('Error creating user:', insertErr);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        req.userEmail = userEmail;
        next();
      });
    } else {
      req.userEmail = userEmail;
      next();
    }
  });
}

module.exports = {
  authenticateUser
};
