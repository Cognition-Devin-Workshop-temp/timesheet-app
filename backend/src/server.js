const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');

const logger = require('./lib/logger');
const { correlationId } = require('./middleware/correlationId');
const { metricsMiddleware, register } = require('./middleware/metrics');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const workEntryRoutes = require('./routes/workEntries');
const reportRoutes = require('./routes/reports');

const { initializeDatabase } = require('./database/init');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

let isReady = false;

// Correlation ID (must be first to propagate through all middleware)
app.use(correlationId);

// Prometheus metrics collection
app.use(metricsMiddleware);

// Structured HTTP request logging via pino-http
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customProps: (req) => ({
    requestId: req.id
  }),
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        requestId: req.id
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  }
}));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics endpoint (registered before rate limiter)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoints (registered before rate limiter)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

// Rate limiting (applied only to /api routes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/work-entries', workEntryRoutes);
app.use('/api/reports', reportRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    isReady = true;
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

module.exports = app;
