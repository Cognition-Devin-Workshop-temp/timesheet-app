const jwt = require('jsonwebtoken');
const { authenticateUser } = require('../../middleware/auth');

describe('Authentication Middleware', () => {
  let req, res, next;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
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
    test('should return 401 if no Authorization header is provided', () => {
      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header has no Bearer token', () => {
      req.headers['authorization'] = 'Bearer ';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 for an invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 for an expired token', () => {
      const token = jwt.sign({ email: 'test@example.com' }, JWT_SECRET, { expiresIn: '-1s' });
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 for a token signed with wrong secret', () => {
      const token = jwt.sign({ email: 'test@example.com' }, 'wrong-secret', { expiresIn: '24h' });
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Successful Authentication', () => {
    test('should authenticate user with valid token and call next()', () => {
      const token = jwt.sign({ email: 'test@example.com' }, JWT_SECRET, { expiresIn: '24h' });
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should extract email from token payload', () => {
      const token = jwt.sign({ email: 'another@example.com' }, JWT_SECRET, { expiresIn: '24h' });
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('another@example.com');
      expect(next).toHaveBeenCalled();
    });
  });
});
