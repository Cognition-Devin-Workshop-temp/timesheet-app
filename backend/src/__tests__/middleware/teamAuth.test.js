const { requireTeamAccess } = require('../../middleware/teamAuth');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');

describe('requireTeamAccess Middleware', () => {
  let mockDb;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockDb = {
      get: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);

    req = {
      params: { teamId: '1' },
      userEmail: 'user@example.com'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should allow access for team member', () => {
    mockDb.get.mockImplementation((query, params, callback) => {
      callback(null, { id: 1, manager_email: 'manager@example.com', role: 'member' });
    });

    requireTeamAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.teamId).toBe(1);
    expect(req.isTeamManager).toBe(false);
    expect(req.teamRole).toBe('member');
  });

  test('should allow access for team manager', () => {
    req.userEmail = 'manager@example.com';
    mockDb.get.mockImplementation((query, params, callback) => {
      callback(null, { id: 1, manager_email: 'manager@example.com', role: 'manager' });
    });

    requireTeamAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.isTeamManager).toBe(true);
  });

  test('should return 403 when user is not a member', () => {
    mockDb.get.mockImplementation((query, params, callback) => {
      callback(null, null);
    });

    requireTeamAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this team' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 400 for invalid team ID', () => {
    req.params.teamId = 'abc';

    requireTeamAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid team ID' });
  });

  test('should return 500 on database error', () => {
    mockDb.get.mockImplementation((query, params, callback) => {
      callback(new Error('DB error'), null);
    });

    requireTeamAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
