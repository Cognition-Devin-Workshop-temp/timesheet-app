const jwt = require('jsonwebtoken');
const { authenticateUser } = require('../../middleware/auth');

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

      // split(' ')[1] will be 'abc123' which jwt.verify will throw on
      // Let jwt.verify throw
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 401 if Authorization header is empty string', () => {
      req.headers.authorization = '';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication token required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('JWT Verification', () => {
    test('should authenticate user with valid token and call next()', () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ email: 'test@example.com' });

      authenticateUser(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', undefined);
      expect(req.userEmail).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
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

    test('should set req.userEmail from decoded token', () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ email: 'specific@example.com' });

      authenticateUser(req, res, next);

      expect(req.userEmail).toBe('specific@example.com');
      expect(next).toHaveBeenCalled();
    });
  });
});
