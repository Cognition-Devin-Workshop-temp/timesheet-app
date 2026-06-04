const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const workEntryRoutes = require('./routes/workEntries');
const reportRoutes = require('./routes/reports');

const { initializeDatabase } = require('./database/init');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./observability/logger');
const { register } = require('./observability/metrics');
const { requestIdMiddleware } = require('./observability/requestId');
const { metricsMiddleware } = require('./observability/metricsMiddleware');
const { livenessHandler, readinessHandler } = require('./observability/healthCheck');

const app = express();
const PORT = process.env.PORT || 3001;

// Request ID middleware (must be first to propagate through all logs)
app.use(requestIdMiddleware);

// Structured JSON logging via pino-http
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          'x-request-id': req.headers['x-request-id'],
          'user-agent': req.headers['user-agent'],
          host: req.headers.host,
        },
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
}));

// Prometheus metrics middleware
app.use(metricsMiddleware);

// Security middleware with CSP configured for React SPA
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
    useDefaults: false,
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  strictTransportSecurity: false,
}));

// CORS configuration - in production, same origin so allow all
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error({ err, requestId: req.id }, 'Failed to collect metrics');
    res.status(500).end();
  }
});

// Health check endpoints
app.get('/health/live', livenessHandler);
app.get('/health/ready', readinessHandler);

// Legacy health check (backwards compatibility)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/work-entries', workEntryRoutes);
app.use('/api/reports', reportRoutes);

// Error handling for API routes
app.use('/api', errorHandler);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));
  
  // Handle React routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

module.exports = app;
