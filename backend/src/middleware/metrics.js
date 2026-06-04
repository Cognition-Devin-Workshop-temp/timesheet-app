const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (status >= 400)',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

function normalizeRoute(req) {
  if (req.route && req.route.path) {
    return req.baseUrl + req.route.path;
  }
  return 'unmatched';
}

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSec);

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
}

module.exports = { metricsMiddleware, register };
