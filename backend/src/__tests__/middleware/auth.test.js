const { authenticateUser } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

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

  describe('Token Extraction', () => {
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

    test('should return 401 if token is empty after Bearer', () => {
      req.headers.authorization = 'Bearer ';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication token required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Token Verification', () => {
    test('should authenticate user with valid token and call next()', () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ email: 'test@example.com' });

      authenticateUser(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(req.userEmail).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 if token is expired', () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token verification throws generic error', () => {
      req.headers.authorization = 'Bearer bad-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Something went wrong');
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
