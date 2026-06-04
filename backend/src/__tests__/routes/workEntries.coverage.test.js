const request = require('supertest');
const express = require('express');
const workEntryRoutes = require('../../routes/workEntries');
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
app.use('/api/work-entries', workEntryRoutes);
app.use((err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({ error: 'Validation error' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('Work Entry Routes - Coverage Enhancement', () => {
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

  describe('POST /api/work-entries - Catch block (line 139)', () => {
    test('should handle unexpected error in create route', async () => {
      // Force getDatabase to throw, which will be caught by try/catch
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected DB failure');
      });

      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 1,
          hours: 5,
          date: '2024-01-01',
          description: 'Test'
        });

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/work-entries/:id - Catch block (line 256)', () => {
    test('should handle unexpected error in update route', async () => {
      // Force getDatabase to throw for the update path
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected DB failure');
      });

      const response = await request(app)
        .put('/api/work-entries/1')
        .send({ hours: 3 });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/work-entries - Boundary conditions', () => {
    test('should accept exactly 24 hours', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1 }); // client exists
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 }); // client exists check
      });

      // Need to handle the sequence: first get for client check, then run for insert, then get for retrieval
      let callCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(null, { id: 1 }); // client exists
        } else {
          callback(null, { id: 1, client_id: 1, hours: 24, date: '2024-01-01' });
        }
      });

      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 1,
          hours: 24,
          date: '2024-01-01'
        });

      // Should not fail validation (24 is max allowed)
      expect(response.status).not.toBe(400);
    });

    test('should reject hours of 0', async () => {
      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 1,
          hours: 0,
          date: '2024-01-01'
        });

      expect(response.status).toBe(400);
    });

    test('should reject negative hours', async () => {
      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 1,
          hours: -1,
          date: '2024-01-01'
        });

      expect(response.status).toBe(400);
    });

    test('should reject non-numeric clientId', async () => {
      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 'abc',
          hours: 5,
          date: '2024-01-01'
        });

      expect(response.status).toBe(400);
    });

    test('should reject invalid date format', async () => {
      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 1,
          hours: 5,
          date: 'not-a-date'
        });

      expect(response.status).toBe(400);
    });

    test('should accept work entry with empty description', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(null, { id: 1 }); // client exists
        } else {
          callback(null, { id: 1, client_id: 1, hours: 5, date: '2024-01-01', description: '' });
        }
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 1,
          hours: 5,
          date: '2024-01-01',
          description: ''
        });

      expect(response.status).not.toBe(400);
    });

    test('should reject description exceeding 1000 characters', async () => {
      const longDesc = 'A'.repeat(1001);

      const response = await request(app)
        .post('/api/work-entries')
        .send({
          clientId: 1,
          hours: 5,
          date: '2024-01-01',
          description: longDesc
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/work-entries/:id - Boundary conditions', () => {
    test('should reject update with hours exceeding 24', async () => {
      const response = await request(app)
        .put('/api/work-entries/1')
        .send({ hours: 25 });

      expect(response.status).toBe(400);
    });

    test('should reject update with negative hours', async () => {
      const response = await request(app)
        .put('/api/work-entries/1')
        .send({ hours: -1 });

      expect(response.status).toBe(400);
    });

    test('should reject update with non-integer clientId', async () => {
      const response = await request(app)
        .put('/api/work-entries/1')
        .send({ clientId: 1.5 });

      expect(response.status).toBe(400);
    });

    test('should reject update with invalid date', async () => {
      const response = await request(app)
        .put('/api/work-entries/1')
        .send({ date: 'invalid' });

      expect(response.status).toBe(400);
    });

    test('should accept fractional hours in update', async () => {
      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1 }); // work entry exists
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      mockDb.get.mockImplementationOnce((query, params, callback) => {
        callback(null, { id: 1, hours: 0.25 });
      });

      const response = await request(app)
        .put('/api/work-entries/1')
        .send({ hours: 0.25 });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/work-entries - Query filtering', () => {
    test('should filter work entries by clientId query param', async () => {
      const mockEntries = [
        { id: 1, client_id: 1, hours: 5, date: '2024-01-01' }
      ];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockEntries);
      });

      const response = await request(app).get('/api/work-entries?clientId=1');

      expect(response.status).toBe(200);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('client_id = ?'),
        expect.arrayContaining([1]),
        expect.any(Function)
      );
    });

    test('should return all entries without clientId filter', async () => {
      const mockEntries = [
        { id: 1, client_id: 1, hours: 5, date: '2024-01-01' },
        { id: 2, client_id: 2, hours: 3, date: '2024-01-02' }
      ];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockEntries);
      });

      const response = await request(app).get('/api/work-entries');

      expect(response.status).toBe(200);
      expect(response.body.workEntries).toEqual(mockEntries);
    });
  });
});
