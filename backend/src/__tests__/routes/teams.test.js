const request = require('supertest');
const express = require('express');
const teamRoutes = require('../../routes/teams');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.userEmail = 'manager@example.com';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/teams', teamRoutes);
app.use((err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({ error: 'Validation error' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('Team Routes', () => {
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

  describe('POST /api/teams', () => {
    test('should create a new team', async () => {
      mockDb.run.mockImplementation(function(query, params, callback) {
        if (query.includes('INSERT INTO teams')) {
          this.lastID = 1;
          callback.call(this, null);
        } else {
          callback.call(this, null);
        }
      });
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, name: 'Engineering', manager_email: 'manager@example.com', created_at: '2024-01-01', updated_at: '2024-01-01' });
      });

      const response = await request(app)
        .post('/api/teams')
        .send({ name: 'Engineering' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Team created successfully');
      expect(response.body.team.name).toBe('Engineering');
    });

    test('should reject empty name', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    test('should reject missing name', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({});

      expect(response.status).toBe(400);
    });

    test('should handle database error on team creation', async () => {
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, new Error('Database error'));
      });

      const response = await request(app)
        .post('/api/teams')
        .send({ name: 'Team' });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/teams', () => {
    test('should list teams for current user', async () => {
      const mockTeams = [
        { id: 1, name: 'Engineering', manager_email: 'manager@example.com', created_at: '2024-01-01', updated_at: '2024-01-01', my_role: 'manager', member_count: 3 }
      ];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockTeams);
      });

      const response = await request(app).get('/api/teams');

      expect(response.status).toBe(200);
      expect(response.body.teams).toHaveLength(1);
      expect(response.body.teams[0].name).toBe('Engineering');
      expect(response.body.teams[0].myRole).toBe('manager');
    });

    test('should return empty array when no teams', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      const response = await request(app).get('/api/teams');

      expect(response.status).toBe(200);
      expect(response.body.teams).toEqual([]);
    });

    test('should handle database error', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/api/teams');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/teams/:teamId (with access check)', () => {
    test('should return team details when user is a member', async () => {
      // First call: requireTeamAccess check
      // Second call: get team
      // Third call: all members
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          // requireTeamAccess
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          // get team details
          callback(null, { id: 1, name: 'Engineering', manager_email: 'manager@example.com', created_at: '2024-01-01', updated_at: '2024-01-01' });
        }
      });
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { user_email: 'manager@example.com', display_name: 'Manager', weekly_capacity_hours: 40, role: 'manager', joined_at: '2024-01-01' }
        ]);
      });

      const response = await request(app).get('/api/teams/1');

      expect(response.status).toBe(200);
      expect(response.body.team.name).toBe('Engineering');
      expect(response.body.members).toHaveLength(1);
    });

    test('should return 403 when user is not a member', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/teams/1');

      expect(response.status).toBe(403);
    });

    test('should return 400 for invalid team ID', async () => {
      const response = await request(app).get('/api/teams/invalid');

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/teams/:teamId', () => {
    test('should update team name when manager', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, { id: 1, name: 'Updated Name', manager_email: 'manager@example.com', created_at: '2024-01-01', updated_at: '2024-01-02' });
        }
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/teams/1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.team.name).toBe('Updated Name');
    });

    test('should return 403 when non-manager tries to update', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'other@example.com', role: 'member' });
      });

      const response = await request(app)
        .put('/api/teams/1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/teams/:teamId', () => {
    test('should delete team when manager', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/teams/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Team deleted successfully');
    });

    test('should return 403 when non-manager tries to delete', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'other@example.com', role: 'member' });
      });

      const response = await request(app).delete('/api/teams/1');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/teams/:teamId/members', () => {
    test('should add a member when manager', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          // requireTeamAccess
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          // check user exists
          callback(null, { email: 'dev@example.com' });
        }
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/teams/1/members')
        .send({ email: 'dev@example.com', displayName: 'Developer', weeklyCapacityHours: 40 });

      expect(response.status).toBe(201);
      expect(response.body.member.email).toBe('dev@example.com');
    });

    test('should auto-create user if not exists', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, null); // user doesn't exist
        }
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/teams/1/members')
        .send({ email: 'new@example.com', displayName: 'New User' });

      expect(response.status).toBe(201);
    });

    test('should return 409 for duplicate member', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
      });
      let runCallCount = 0;
      mockDb.run.mockImplementation(function(query, params, callback) {
        runCallCount++;
        if (query.includes('INSERT INTO team_members')) {
          callback.call(this, new Error('UNIQUE constraint failed: team_members.team_id, team_members.user_email'));
        } else {
          callback.call(this, null);
        }
      });

      const response = await request(app)
        .post('/api/teams/1/members')
        .send({ email: 'manager@example.com', displayName: 'Manager' });

      expect(response.status).toBe(409);
    });

    test('should return 403 when non-manager adds member', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'other@example.com', role: 'member' });
      });

      const response = await request(app)
        .post('/api/teams/1/members')
        .send({ email: 'dev@example.com', displayName: 'Dev' });

      expect(response.status).toBe(403);
    });

    test('should reject invalid email', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
      });

      const response = await request(app)
        .post('/api/teams/1/members')
        .send({ email: 'not-an-email', displayName: 'Dev' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/teams/:teamId/members/:email', () => {
    test('should update member capacity', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/teams/1/members/dev@example.com')
        .send({ weeklyCapacityHours: 32 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member updated successfully');
    });

    test('should return 404 for non-existent member', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/teams/1/members/unknown@example.com')
        .send({ weeklyCapacityHours: 32 });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/teams/:teamId/members/:email', () => {
    test('should remove a member', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, { manager_email: 'manager@example.com' });
        }
      });
      mockDb.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/teams/1/members/dev@example.com');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member removed successfully');
    });

    test('should not allow removing the manager', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, { manager_email: 'manager@example.com' });
        }
      });

      const response = await request(app).delete('/api/teams/1/members/manager@example.com');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot remove the team manager');
    });
  });

  describe('GET /api/teams/:teamId/workload', () => {
    test('should return workload with utilization data', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, { id: 1, name: 'Engineering' });
        }
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { user_email: 'dev1@example.com', display_name: 'Dev 1', weekly_capacity_hours: 40, role: 'member', total_hours: 42, entry_count: 5 },
          { user_email: 'dev2@example.com', display_name: 'Dev 2', weekly_capacity_hours: 40, role: 'member', total_hours: 20, entry_count: 3 }
        ]);
      });

      const response = await request(app)
        .get('/api/teams/1/workload')
        .query({ startDate: '2024-01-01', endDate: '2024-01-07' });

      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(2);
      expect(response.body.summary.memberCount).toBe(2);
      expect(response.body.summary.totalTeamHours).toBe(62);
      expect(response.body.period.startDate).toBe('2024-01-01');
      expect(response.body.period.endDate).toBe('2024-01-07');
    });

    test('should classify overloaded status correctly', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, { id: 1, name: 'Team' });
        }
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { user_email: 'a@test.com', display_name: 'A', weekly_capacity_hours: 40, role: 'member', total_hours: 45, entry_count: 5 }
        ]);
      });

      const response = await request(app)
        .get('/api/teams/1/workload')
        .query({ startDate: '2024-01-01', endDate: '2024-01-07' });

      expect(response.status).toBe(200);
      expect(response.body.members[0].status).toBe('overloaded');
      expect(response.body.summary.overloadedCount).toBe(1);
    });

    test('should classify underutilized status correctly', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, { id: 1, name: 'Team' });
        }
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { user_email: 'a@test.com', display_name: 'A', weekly_capacity_hours: 40, role: 'member', total_hours: 5, entry_count: 1 }
        ]);
      });

      const response = await request(app)
        .get('/api/teams/1/workload')
        .query({ startDate: '2024-01-01', endDate: '2024-01-07' });

      expect(response.status).toBe(200);
      expect(response.body.members[0].status).toBe('underutilized');
      expect(response.body.summary.underutilizedCount).toBe(1);
    });

    test('should reject missing dates', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
      });

      const response = await request(app)
        .get('/api/teams/1/workload');

      expect(response.status).toBe(400);
    });

    test('should reject endDate before startDate', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
      });

      const response = await request(app)
        .get('/api/teams/1/workload')
        .query({ startDate: '2024-01-07', endDate: '2024-01-01' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/teams/:teamId/workload/breakdown', () => {
    test('should return per-client breakdown per member', async () => {
      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
        } else {
          callback(null, { id: 1, name: 'Engineering' });
        }
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { user_email: 'dev@test.com', display_name: 'Dev', client_id: 1, client_name: 'Acme', hours: 20, entry_count: 3 },
          { user_email: 'dev@test.com', display_name: 'Dev', client_id: 2, client_name: 'Beta', hours: 10, entry_count: 2 }
        ]);
      });

      const response = await request(app)
        .get('/api/teams/1/workload/breakdown')
        .query({ startDate: '2024-01-01', endDate: '2024-01-07' });

      expect(response.status).toBe(200);
      expect(response.body.breakdown).toHaveLength(1);
      expect(response.body.breakdown[0].clients).toHaveLength(2);
      expect(response.body.breakdown[0].email).toBe('dev@test.com');
    });
  });
});
