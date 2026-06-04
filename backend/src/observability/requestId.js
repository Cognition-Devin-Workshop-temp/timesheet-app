const { randomUUID } = require('crypto');

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = { requestIdMiddleware };
