const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { authSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('WARNING: JWT_SECRET is not set. Using an insecure default. Set JWT_SECRET in production!');
    return 'insecure-default-jwt-secret-do-not-use-in-production';
  }
  return secret;
}

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = authSchema.validate(req.body);
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
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash], function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const token = jwt.sign({ email }, getJwtSecret(), { expiresIn: '24h' });

          res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
              email: email,
              createdAt: new Date().toISOString()
            }
          });
        });
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
    const { error, value } = authSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email, password } = value;
    const db = getDatabase();

    db.get('SELECT email, password_hash, created_at FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      try {
        const isValidPassword = await bcrypt.compare(password, row.password_hash);

        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ email }, getJwtSecret(), { expiresIn: '24h' });

        res.json({
          message: 'Login successful',
          token,
          user: {
            email: row.email,
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
