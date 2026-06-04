const { logger } = require('../observability/logger');

function errorHandler(err, req, res, next) {
  const requestId = req.id;

  // Joi validation errors
  if (err.isJoi) {
    logger.warn({
      requestId,
      err: {
        type: 'ValidationError',
        message: err.message,
        details: err.details.map(d => d.message),
      },
    }, 'Validation error');

    return res.status(400).json({
      error: 'Validation error',
      details: err.details.map(detail => detail.message)
    });
  }

  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    logger.error({
      requestId,
      err: {
        type: 'DatabaseError',
        code: err.code,
        message: err.message,
        stack: err.stack,
      },
    }, 'Database error');

    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while processing your request'
    });
  }

  // Default error
  logger.error({
    requestId,
    err: {
      type: err.name || 'Error',
      message: err.message,
      stack: err.stack,
      status: err.status,
    },
  }, 'Unhandled error');

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = {
  errorHandler
};
