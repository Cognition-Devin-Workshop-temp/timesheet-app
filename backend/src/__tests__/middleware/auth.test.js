const jwt = require('jsonwebtoken');
const { authenticateUser } = require('../../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-that-is-at-least-32-characters-long';

function makeToken(email, role = 'user') {
  return jwt.sign({ email, role }, JWT_SECRET, {
    expiresIn: '8h',
    issuer: 'timesheet-app',
    audience: 'timesheet-app-users'
  });
}

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
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

  describe('Token Validation', () => {
    test('should return 401 if no Authorization header', () => {
      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required. Provide a Bearer token.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header does not start with Bearer', () => {
      req.headers['authorization'] = 'Basic sometoken';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 for invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 for expired token', () => {
      const token = jwt.sign(
        { email: 'test@example.com', role: 'user' },
        JWT_SECRET,
        { expiresIn: '0s', issuer: 'timesheet-app', audience: 'timesheet-app-users' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired. Please log in again.' });
    });

    test('should return 401 for token with wrong issuer', () => {
      const token = jwt.sign(
        { email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '8h', issuer: 'wrong-issuer', audience: 'timesheet-app-users' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    test('should return 401 for token with wrong audience', () => {
      const token = jwt.sign(
        { email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '8h', issuer: 'timesheet-app', audience: 'wrong-audience' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });

  describe('Successful Authentication', () => {
    test('should authenticate user with valid token and call next()', () => {
      const token = makeToken('test@example.com');
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@example.com');
      expect(req.userRole).toBe('user');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should set admin role from token', () => {
      const token = makeToken('admin@example.com', 'admin');
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('admin@example.com');
      expect(req.userRole).toBe('admin');
      expect(next).toHaveBeenCalled();
    });

    test('should default to user role if role not in token', () => {
      const token = jwt.sign(
        { email: 'norole@example.com' },
        JWT_SECRET,
        { expiresIn: '8h', issuer: 'timesheet-app', audience: 'timesheet-app-users' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userRole).toBe('user');
      expect(next).toHaveBeenCalled();
    });
  });
});
