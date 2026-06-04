const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRoutes = require('../../routes/auth');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');
jest.mock('bcryptjs');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use((err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({ error: 'Validation error' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-that-is-at-least-32-characters-long';

function makeToken(email, role = 'user') {
  return jwt.sign({ email, role }, JWT_SECRET, {
    expiresIn: '8h',
    issuer: 'timesheet-app',
    audience: 'timesheet-app-users'
  });
}

describe('Auth Routes', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      run: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);
    bcrypt.hash.mockResolvedValue('hashed-password');
    bcrypt.compare.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'Password1' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('new@example.com');
      expect(response.body.user.role).toBe('user');
    });

    test('should return 409 for duplicate email', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { email: 'exists@example.com' });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'exists@example.com', password: 'Password1' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });

    test('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'weak' });

      expect(response.status).toBe(400);
    });

    test('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
    });

    test('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'Password1' });

      expect(response.status).toBe(400);
    });

    test('should handle database error when checking existing user', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'Password1' });

      expect(response.status).toBe(500);
    });

    test('should handle database error when inserting user', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(new Error('Insert failed'));
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'Password1' });

      expect(response.status).toBe(500);
    });

    test('should handle bcrypt hash error', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      bcrypt.hash.mockRejectedValue(new Error('Hash failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'Password1' });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login existing user with correct password', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          email: 'test@example.com',
          password_hash: 'hashed',
          role: 'user',
          failed_login_attempts: 0,
          locked_until: null,
          created_at: '2024-01-01T00:00:00.000Z'
        });
      });
      mockDb.run.mockImplementation((query, params, callback) => {
        if (callback) callback(null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should return 401 for non-existent user', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexist@example.com', password: 'Password1' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should return 401 for wrong password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          email: 'test@example.com',
          password_hash: 'hashed',
          role: 'user',
          failed_login_attempts: 0,
          locked_until: null,
          created_at: '2024-01-01'
        });
      });
      mockDb.run.mockImplementation((query, params, callback) => {
        if (callback) callback(null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Password1' });

      expect(response.status).toBe(400);
    });

    test('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
    });

    test('should handle database error when checking user', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(response.status).toBe(500);
    });

    test('should return 423 for locked account', async () => {
      const futureDate = new Date(Date.now() + 600000).toISOString();
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          email: 'test@example.com',
          password_hash: 'hashed',
          role: 'user',
          failed_login_attempts: 5,
          locked_until: futureDate,
          created_at: '2024-01-01'
        });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(response.status).toBe(423);
      expect(response.body.error).toContain('Account locked');
    });

    test('should lock account after 5 failed attempts', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          email: 'test@example.com',
          password_hash: 'hashed',
          role: 'user',
          failed_login_attempts: 4,
          locked_until: null,
          created_at: '2024-01-01'
        });
      });
      mockDb.run.mockImplementation((query, params, callback) => {
        if (callback) callback(null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1' });

      expect(response.status).toBe(423);
      expect(response.body.error).toContain('Account locked');
    });

    test('should handle unexpected errors', async () => {
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(response.status).toBe(500);
    });

    test('should handle bcrypt compare error', async () => {
      bcrypt.compare.mockRejectedValue(new Error('Compare failed'));
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          email: 'test@example.com',
          password_hash: 'hashed',
          role: 'user',
          failed_login_attempts: 0,
          locked_until: null,
          created_at: '2024-01-01'
        });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return current user info', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          email: 'test@example.com',
          role: 'user',
          created_at: '2024-01-01T00:00:00.000Z'
        });
      });

      const token = makeToken('test@example.com');
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('user');
    });

    test('should return 401 if no token provided', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    test('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('should return 404 if user not found', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const token = makeToken('test@example.com');
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });

    test('should handle database error', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const token = makeToken('test@example.com');
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
    });
  });
});
