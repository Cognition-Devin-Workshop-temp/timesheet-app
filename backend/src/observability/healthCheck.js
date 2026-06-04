const { getDatabase } = require('../database/init');
const { logger } = require('./logger');

function livenessHandler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

function readinessHandler(req, res) {
  try {
    const db = getDatabase();
    db.get('SELECT 1', (err) => {
      if (err) {
        logger.error({ err, requestId: req.id }, 'Readiness check failed: database unreachable');
        return res.status(503).json({
          status: 'unavailable',
          timestamp: new Date().toISOString(),
          checks: { database: 'unhealthy' },
        });
      }
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: { database: 'healthy' },
      });
    });
  } catch (err) {
    logger.error({ err, requestId: req.id }, 'Readiness check failed');
    res.status(503).json({
      status: 'unavailable',
      timestamp: new Date().toISOString(),
      checks: { database: 'unhealthy' },
    });
  }
}

module.exports = { livenessHandler, readinessHandler };
