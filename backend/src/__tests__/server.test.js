const request = require('supertest');

// Mock the database before requiring the app
jest.mock('../database/init', () => {
  const mockDb = {
    serialize: jest.fn((cb) => cb()),
    run: jest.fn((q, pOrCb, cb) => {
      const callback = typeof pOrCb === 'function' ? pOrCb : cb;
      if (typeof callback === 'function') callback(null);
    }),
    get: jest.fn((query, params, callback) => {
      // For auth middleware - simulate user exists
      if (query && query.includes('SELECT email FROM users')) {
        callback(null, { email: params[0] });
      } else {
        callback(null, null);
      }
    }),
    all: jest.fn((query, params, callback) => {
      callback(null, []);
    }),
    close: jest.fn((cb) => cb && cb(null))
  };

  return {
    getDatabase: jest.fn(() => mockDb),
    initializeDatabase: jest.fn().mockResolvedValue(undefined),
    closeDatabase: jest.fn().mockResolvedValue(undefined)
  };
});

const app = require('../server');

describe('Server', () => {
  describe('GET /health', () => {
    test('should return 200 with status OK', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return valid ISO timestamp', async () => {
      const response = await request(app).get('/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('404 handler', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Route not found' });
    });

    test('should return 404 for unknown POST routes', async () => {
      const response = await request(app)
        .post('/nonexistent')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
    });

    test('should return 404 for nested unknown path', async () => {
      const response = await request(app).get('/api/some/deep/unknown/path');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Route not found' });
    });
  });

  describe('Security headers', () => {
    test('should include helmet security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should include x-dns-prefetch-control header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });
  });

  describe('CORS', () => {
    test('should allow requests from configured origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('Body parsing', () => {
    test('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Route mounting', () => {
    test('should mount auth routes at /api/auth', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      // Should get a response (not 404)
      expect(response.status).not.toBe(404);
    });

    test('should mount client routes at /api/clients', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('x-user-email', 'test@example.com');

      expect(response.status).not.toBe(404);
    });

    test('should mount work-entries routes at /api/work-entries', async () => {
      const response = await request(app)
        .get('/api/work-entries')
        .set('x-user-email', 'test@example.com');

      expect(response.status).not.toBe(404);
    });

    test('should mount report routes at /api/reports', async () => {
      const response = await request(app)
        .get('/api/reports/client/1')
        .set('x-user-email', 'test@example.com');

      // Route is mounted - we get a 404 "Client not found" from the route, not the generic 404 handler
      expect(response.body.error).not.toBe('Route not found');
    });
  });

  describe('Authentication required', () => {
    test('should return 401 for clients without auth header', async () => {
      const response = await request(app).get('/api/clients');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'User email required in x-user-email header' });
    });

    test('should return 401 for work-entries without auth header', async () => {
      const response = await request(app).get('/api/work-entries');

      expect(response.status).toBe(401);
    });

    test('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('x-user-email', 'not-an-email');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid email format' });
    });
  });
});
