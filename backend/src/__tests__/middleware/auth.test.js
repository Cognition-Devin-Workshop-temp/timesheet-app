const jwt = require('jsonwebtoken');
const { authenticateUser } = require('../../middleware/auth');

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

describe('Authentication Middleware', () => {
  let req, res, next;

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
    delete process.env.JWT_SECRET;
  });

  describe('Token Validation', () => {
    test('should return 401 if no Authorization header is present', () => {
      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header has no Bearer token', () => {
      req.headers.authorization = 'Basic abc123';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
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
      const token = jwt.sign({ email: 'test@example.com' }, TEST_SECRET, { expiresIn: '0s' });
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
    test('should authenticate with valid token and set req.userEmail', () => {
      const token = jwt.sign({ email: 'test@example.com' }, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should authenticate with token signed with correct secret', () => {
      const token = jwt.sign({ email: 'user@example.com' }, TEST_SECRET, { expiresIn: '24h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('user@example.com');
      expect(next).toHaveBeenCalled();
    });

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
  });

  describe('Edge Cases', () => {
    test('should return 401 if Authorization header is empty string', () => {
      req.headers.authorization = '';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Bearer prefix is present but no token follows', () => {
      req.headers.authorization = 'Bearer ';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should accept email with subdomain in JWT payload', () => {
      const token = jwt.sign({ email: 'test@mail.example.com' }, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@mail.example.com');
      expect(next).toHaveBeenCalled();
    });
  });
});
