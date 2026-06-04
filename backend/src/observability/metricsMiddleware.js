const {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpErrorsTotal,
} = require('./metrics');

function normalizeRoute(req) {
  // Use the matched route pattern if available, otherwise use path
  if (req.route && req.baseUrl) {
    return `${req.baseUrl}${req.route.path}`;
  }
  // Fallback: collapse numeric IDs in the path
  return req.path.replace(/\/\d+/g, '/:id');
}

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSeconds = durationNs / 1e9;
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
}

module.exports = { metricsMiddleware };
