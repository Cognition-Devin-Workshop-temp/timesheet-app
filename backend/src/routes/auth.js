const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { loginSchema, registerSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

const JWT_ISSUER = 'timesheet-app';
const JWT_AUDIENCE = 'timesheet-app-users';
const JWT_EXPIRY = '8h';
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MINUTES = 15;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set and at least 32 characters in production');
    }
    return 'dev-only-jwt-secret-not-for-production-use!!';
  }
  return secret;
}

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email, password } = value;
    const db = getDatabase();

    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (row) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      try {
        const passwordHash = await bcrypt.hash(password, 12);

        db.run(
          'INSERT INTO users (email, password_hash) VALUES (?, ?)',
          [email, passwordHash],
          function(err) {
            if (err) {
              console.error('Error creating user:', err);
              return res.status(500).json({ error: 'Failed to create user' });
            }

            const token = jwt.sign(
              { email, role: 'user' },
              getJwtSecret(),
              { expiresIn: JWT_EXPIRY, issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
            );

            res.status(201).json({
              message: 'User registered successfully',
              token,
              user: {
                email,
                role: 'user',
                createdAt: new Date().toISOString()
              }
            });
          }
        );
      } catch (hashError) {
        console.error('Error hashing password:', hashError);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email, password } = value;
    const db = getDatabase();

    db.get('SELECT email, password_hash, role, failed_login_attempts, locked_until, created_at FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check account lockout
      if (row.locked_until) {
        const lockedUntil = new Date(row.locked_until);
        if (lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((lockedUntil - new Date()) / 60000);
          return res.status(423).json({
            error: `Account locked. Try again in ${minutesLeft} minute(s)`
          });
        }
        // Lock period expired — reset
        db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = ?', [email]);
      }

      try {
        const passwordMatch = await bcrypt.compare(password, row.password_hash);
        if (!passwordMatch) {
          const attempts = (row.failed_login_attempts || 0) + 1;
          if (attempts >= LOCKOUT_THRESHOLD) {
            const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000).toISOString();
            db.run('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE email = ?', [attempts, lockUntil, email]);
            return res.status(423).json({
              error: `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes`
            });
          }
          db.run('UPDATE users SET failed_login_attempts = ? WHERE email = ?', [attempts, email]);
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Reset failed attempts on success
        db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = ?', [email]);

        const token = jwt.sign(
          { email, role: row.role },
          getJwtSecret(),
          { expiresIn: JWT_EXPIRY, issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            email: row.email,
            role: row.role,
            createdAt: row.created_at
          }
        });
      } catch (compareError) {
        console.error('Error comparing password:', compareError);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user info
router.get('/me', authenticateUser, (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT email, role, created_at FROM users WHERE email = ?', [req.userEmail], (err, row) => {
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
        role: row.role,
        createdAt: row.created_at
      }
    });
  });
});

module.exports = router;
module.exports.getJwtSecret = getJwtSecret;
module.exports.JWT_ISSUER = JWT_ISSUER;
module.exports.JWT_AUDIENCE = JWT_AUDIENCE;
