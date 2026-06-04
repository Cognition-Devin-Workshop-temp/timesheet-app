const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { registerSchema, loginSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return next(error);

    const { email, password } = value;
    const db = getDatabase();

    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) return res.status(500).json({ error: 'Internal server error' });
      if (row) return res.status(409).json({ error: 'User already exists' });

      const passwordHash = await bcrypt.hash(password, 12);
      db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create user' });

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: { email, createdAt: new Date().toISOString() }
        });
      });
    });
  } catch (error) { next(error); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return next(error);

    const { email, password } = value;
    const db = getDatabase();

    db.get('SELECT email, password_hash, created_at FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) return res.status(500).json({ error: 'Internal server error' });
      if (!row) return res.status(401).json({ error: 'Invalid email or password' });

      const isValid = await bcrypt.compare(password, row.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      res.json({
        message: 'Login successful',
        token,
        user: { email: row.email, createdAt: row.created_at }
      });
    });
  } catch (error) { next(error); }
});

// GET /api/auth/me (protected)
router.get('/me', authenticateUser, (req, res) => {
  const db = getDatabase();
  db.get('SELECT email, created_at FROM users WHERE email = ?', [req.userEmail], (err, row) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { email: row.email, createdAt: row.created_at } });
  });
});

module.exports = router;
