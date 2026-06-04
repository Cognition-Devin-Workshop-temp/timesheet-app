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

  describe('Token Validation', () => {
    test('should return 401 if Authorization header is missing', () => {
      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header does not start with Bearer', () => {
      req.headers['authorization'] = 'Basic some-token';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', () => {
      req.headers['authorization'] = 'Bearer invalid-token';

      jwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is expired', () => {
      req.headers['authorization'] = 'Bearer expired-token';

      jwt.verify.mockImplementation(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

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
      req.headers['authorization'] = 'Bearer valid-token';

      jwt.verify.mockReturnValue({ email: 'test@example.com' });

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should extract email from decoded token', () => {
      req.headers['authorization'] = 'Bearer valid-token';

      jwt.verify.mockReturnValue({ email: 'another@example.com' });

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('another@example.com');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle Bearer with empty token', () => {
      req.headers['authorization'] = 'Bearer ';

      jwt.verify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
    });

    test('should handle malformed JWT', () => {
      req.headers['authorization'] = 'Bearer not.a.valid.jwt';

      jwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
    });
  });
});
