const { errorHandler } = require('../../middleware/errorHandler');

jest.mock('../../lib/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  fatal: jest.fn()
}));

const logger = require('../../lib/logger');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      id: 'test-request-id',
      method: 'GET',
      originalUrl: '/test',
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Joi Validation Errors', () => {
    test('should handle Joi validation error', () => {
      const joiError = {
        isJoi: true,
        details: [
          { message: 'Field is required' },
          { message: 'Invalid format' }
        ]
      };

      errorHandler(joiError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: ['Field is required', 'Invalid format']
      });
    });

    test('should handle single Joi validation error', () => {
      const joiError = {
        isJoi: true,
        details: [{ message: 'Name is required' }]
      };

      errorHandler(joiError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: ['Name is required']
      });
    });
  });

  describe('SQLite Errors', () => {
    test('should handle SQLITE_CONSTRAINT error', () => {
      const sqliteError = {
        code: 'SQLITE_CONSTRAINT',
        message: 'UNIQUE constraint failed'
      };

      errorHandler(sqliteError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Database error',
        message: 'An error occurred while processing your request'
      });
    });

    test('should handle SQLITE_ERROR', () => {
      const sqliteError = {
        code: 'SQLITE_ERROR',
        message: 'SQL error'
      };

      errorHandler(sqliteError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Database error',
        message: 'An error occurred while processing your request'
      });
    });
  });

  describe('Generic Errors', () => {
    test('should handle error with custom status', () => {
      const customError = {
        status: 403,
        message: 'Forbidden access'
      };

      errorHandler(customError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden access'
      });
    });

    test('should default to 500 status if not specified', () => {
      const genericError = {
        message: 'Something went wrong'
      };

      errorHandler(genericError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Something went wrong'
      });
    });

    test('should use default message if none provided', () => {
      const emptyError = {};

      errorHandler(emptyError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });

  describe('Structured Logging', () => {
    test('should log error with structured context', () => {
      const error = new Error('Test error');
      
      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
          method: 'GET',
          url: '/test',
          error: expect.objectContaining({
            message: 'Test error',
            name: 'Error'
          })
        }),
        'Unhandled error'
      );
    });

    test('should log validation errors as warnings', () => {
      const joiError = {
        isJoi: true,
        details: [{ message: 'Field is required' }]
      };

      errorHandler(joiError, req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id'
        }),
        'Validation error'
      );
    });

    test('should log database errors with error code', () => {
      const sqliteError = {
        code: 'SQLITE_CONSTRAINT',
        message: 'UNIQUE constraint failed'
      };

      errorHandler(sqliteError, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
          error: expect.objectContaining({
            code: 'SQLITE_CONSTRAINT'
          })
        }),
        'Database error'
      );
    });
  });
});
