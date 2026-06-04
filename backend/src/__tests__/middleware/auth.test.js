const jwt = require('jsonwebtoken');
const { authenticateUser } = require('../../middleware/auth');

describe('Authentication Middleware', () => {
  let req, res, next;
  const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
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
        error: 'Authentication token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header has no token', () => {
      req.headers.authorization = 'Bearer ';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is expired', () => {
      const token = jwt.sign({ email: 'test@example.com' }, TEST_SECRET, { expiresIn: '-1s' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Valid Token Authentication', () => {
    test('should authenticate user with valid token and call next()', () => {
      const token = jwt.sign({ email: 'test@example.com' }, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should extract email from token payload', () => {
      const token = jwt.sign({ email: 'another@example.com' }, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('another@example.com');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should reject token signed with wrong secret', () => {
      const token = jwt.sign({ email: 'test@example.com' }, 'wrong-secret', { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should accept token with subdomain email', () => {
      const token = jwt.sign({ email: 'test@mail.example.com' }, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@mail.example.com');
      expect(next).toHaveBeenCalled();
    });
  });
});
