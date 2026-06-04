const logger = require('../lib/logger');

function errorHandler(err, req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';
  const errorContext = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack
    }
  };

  // Joi validation errors
  if (err.isJoi) {
    logger.warn(errorContext, 'Validation error');
    return res.status(400).json({
      error: 'Validation error',
      details: err.details.map(detail => detail.message)
    });
  }

  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    errorContext.error.code = err.code;
    logger.error(errorContext, 'Database error');
    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while processing your request'
    });
  }

  // Default error
  logger.error(errorContext, 'Unhandled error');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = {
  errorHandler
};
