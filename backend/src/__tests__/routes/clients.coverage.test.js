const request = require('supertest');
const express = require('express');
const clientRoutes = require('../../routes/clients');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.userEmail = 'test@example.com';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/clients', clientRoutes);
app.use((err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({ error: 'Validation error' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('Client Routes - Coverage Enhancement', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      all: jest.fn(),
      get: jest.fn(),
      run: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE /api/clients (all clients)', () => {
    test('should delete all clients for authenticated user', async () => {
      mockDb.run.mockImplementation(function(query, params, callback) {
        this.changes = 3;
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/clients');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('All clients deleted successfully');
      expect(response.body.deletedCount).toBe(3);
    });

    test('should return 0 deleted count when no clients exist', async () => {
      mockDb.run.mockImplementation(function(query, params, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/clients');

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(0);
    });

    test('should handle database error when deleting all clients', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(new Error('Delete all failed'));
      });

      const response = await request(app).delete('/api/clients');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete clients' });
    });

    test('should only delete clients belonging to authenticated user', async () => {
      mockDb.run.mockImplementation(function(query, params, callback) {
        expect(params).toContain('test@example.com');
        expect(query).toContain('WHERE user_email = ?');
        this.changes = 2;
        callback.call(this, null);
      });

      await request(app).delete('/api/clients');

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM clients WHERE user_email = ?'),
        ['test@example.com'],
        expect.any(Function)
      );
    });
  });

  describe('PUT /api/clients/:id - Update email field', () => {
    test('should update client email', async () => {
      const updatedClient = { id: 1, name: 'Client', email: 'new@email.com' };

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 });
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, updatedClient);
      });

      const response = await request(app)
        .put('/api/clients/1')
        .send({ email: 'new@email.com' });

      expect(response.status).toBe(200);
      expect(response.body.client.email).toBe('new@email.com');
    });

    test('should update client department', async () => {
      const updatedClient = { id: 1, name: 'Client', department: 'Engineering' };

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 });
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, updatedClient);
      });

      const response = await request(app)
        .put('/api/clients/1')
        .send({ department: 'Engineering' });

      expect(response.status).toBe(200);
      expect(response.body.client.department).toBe('Engineering');
    });

    test('should update multiple fields including email and department', async () => {
      const updatedClient = {
        id: 1,
        name: 'Updated Corp',
        description: 'Updated desc',
        department: 'Sales',
        email: 'sales@corp.com'
      };

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 });
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, updatedClient);
      });

      const response = await request(app)
        .put('/api/clients/1')
        .send({
          name: 'Updated Corp',
          description: 'Updated desc',
          department: 'Sales',
          email: 'sales@corp.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.client).toEqual(updatedClient);
    });

    test('should set email to null when empty string provided', async () => {
      const updatedClient = { id: 1, name: 'Client', email: null };

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 });
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        // Verify null is passed for empty email
        expect(params).toContain(null);
        callback(null);
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, updatedClient);
      });

      const response = await request(app)
        .put('/api/clients/1')
        .send({ email: '' });

      expect(response.status).toBe(200);
    });

    test('should set department to null when empty string provided', async () => {
      const updatedClient = { id: 1, name: 'Client', department: null };

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 });
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        expect(params).toContain(null);
        callback(null);
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, updatedClient);
      });

      const response = await request(app)
        .put('/api/clients/1')
        .send({ department: '' });

      expect(response.status).toBe(200);
    });

    test('should return 400 for invalid email format in update', async () => {
      const response = await request(app)
        .put('/api/clients/1')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/clients - Edge Cases', () => {
    test('should create client with all optional fields', async () => {
      const newClient = {
        name: 'Full Client',
        description: 'Full description',
        department: 'Engineering',
        email: 'client@example.com'
      };
      const createdClient = { id: 1, ...newClient };

      mockDb.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, createdClient);
      });

      const response = await request(app)
        .post('/api/clients')
        .send(newClient);

      expect(response.status).toBe(201);
      expect(response.body.client).toEqual(createdClient);
    });

    test('should return 400 for name exceeding max length', async () => {
      const longName = 'A'.repeat(256);

      const response = await request(app)
        .post('/api/clients')
        .send({ name: longName });

      expect(response.status).toBe(400);
    });

    test('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/clients')
        .send({ name: 'Test', email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    test('should handle description exceeding max length', async () => {
      const longDesc = 'D'.repeat(1001);

      const response = await request(app)
        .post('/api/clients')
        .send({ name: 'Test', description: longDesc });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/clients/:id - Catch block', () => {
    test('should handle unexpected errors in update route', async () => {
      // Force an error that would be caught by try/catch
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 });
      });

      const response = await request(app)
        .put('/api/clients/1')
        .send({ name: 'Test' });

      expect(response.status).toBe(500);
    });
  });
});
