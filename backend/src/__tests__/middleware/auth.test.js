const jwt = require('jsonwebtoken');
const { authenticateUser } = require('../../middleware/auth');

const TEST_SECRET = 'test-jwt-secret';

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
    test('should return 401 if no Authorization header is provided', () => {
      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header has no Bearer token', () => {
      req.headers.authorization = 'Basic sometoken';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalidtoken';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is expired', () => {
      const expiredToken = jwt.sign({ email: 'test@example.com' }, TEST_SECRET, { expiresIn: '0s' });
      req.headers.authorization = `Bearer ${expiredToken}`;

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
      const token = jwt.sign({ email: 'user@domain.com' }, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('user@domain.com');
      expect(next).toHaveBeenCalled();
    });

    test('should accept token with subdomain email', () => {
      const token = jwt.sign({ email: 'test@mail.example.com' }, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@mail.example.com');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token signed with wrong secret', () => {
    test('should return 401 if token was signed with different secret', () => {
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
});
