const { authorize } = require('../../middleware/authorize');

describe('Authorize Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should return 401 if no userRole set', () => {
    const middleware = authorize('admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 403 if user role not in allowed roles', () => {
    req.userRole = 'user';
    const middleware = authorize('admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next() if user role is allowed', () => {
    req.userRole = 'admin';
    const middleware = authorize('admin', 'user');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should allow admin when admin is in allowed roles', () => {
    req.userRole = 'admin';
    const middleware = authorize('admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should allow user when user is in allowed roles', () => {
    req.userRole = 'user';
    const middleware = authorize('user');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should handle multiple allowed roles', () => {
    req.userRole = 'user';
    const middleware = authorize('admin', 'user');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
