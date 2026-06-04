const express = require('express');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(email) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Login endpoint - creates user if doesn't exist, returns JWT
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email } = value;
    const db = getDatabase();

    db.get('SELECT email, created_at FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const token = generateToken(email);

      if (row) {
        return res.json({
          message: 'Login successful',
          token,
          user: {
            email: row.email,
            createdAt: row.created_at
          }
        });
      } else {
        db.run('INSERT INTO users (email) VALUES (?)', [email], function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          res.status(201).json({
            message: 'User created and logged in successfully',
            token,
            user: {
              email: email,
              createdAt: new Date().toISOString()
            }
          });
        });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user info (requires JWT)
router.get('/me', authenticateUser, (req, res) => {
  const db = getDatabase();

  db.get('SELECT email, created_at FROM users WHERE email = ?', [req.userEmail], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        email: row.email,
        createdAt: row.created_at
      }
    });
  });
});

module.exports = router;
