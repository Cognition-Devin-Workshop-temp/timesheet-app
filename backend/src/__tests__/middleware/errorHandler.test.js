const { errorHandler } = require('../../middleware/errorHandler');

// Mock the logger
jest.mock('../../observability/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
}));

const { logger } = require('../../observability/logger');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { id: 'test-request-id' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
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
    test('should handle SQLite errors', () => {
      const sqliteError = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed');
      sqliteError.code = 'SQLITE_CONSTRAINT';

      errorHandler(sqliteError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Database error',
        message: 'An error occurred while processing your request'
      });
    });

    test('should handle SQLITE_BUSY error', () => {
      const sqliteError = new Error('Database is locked');
      sqliteError.code = 'SQLITE_BUSY';

      errorHandler(sqliteError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Database error',
        message: 'An error occurred while processing your request'
      });
    });
  });

  describe('Default Errors', () => {
    test('should handle generic error with status', () => {
      const error = new Error('Not found');
      error.status = 404;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not found'
      });
    });

    test('should default to 500 for errors without status', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Something went wrong'
      });
    });

    test('should default to "Internal server error" for errors without message', () => {
      const emptyError = {};

      errorHandler(emptyError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });

  describe('Structured Logging', () => {
    test('should log error with request ID', () => {
      const error = new Error('Test error');
      
      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
          err: expect.objectContaining({
            message: 'Test error',
          }),
        }),
        expect.any(String)
      );
    });
  });
});
