require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const logger = require('./utils/logger');

// ─── App initialization ───────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 10000,
});

// ── Socket.io: report progress rooms ───────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_report', (reportId) => {
    if (typeof reportId === 'string' && reportId.startsWith('RPT_')) {
      socket.join(`report:${reportId}`);
    }
  });
  socket.on('leave_report', (reportId) => {
    socket.leave(`report:${reportId}`);
  });
});

// Export io for use in workers / routes
global._io = io;

const PORT = process.env.PORT || 4000;

// ─── Sentry (must init before other middleware) ────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Scrub sensitive keys before sending to Sentry
      const sensitiveKeys = [
        'api_key', 'SANDBOX_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY',
        'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'JWT_SECRET',
        'NEXTAUTH_SECRET', 'FASTAPI_SECRET', 'AWS_SECRET_ACCESS_KEY',
        'SCRAPINGBEE_API_KEY', 'SENDGRID_API_KEY', 'WHATSAPP_API_KEY',
        'password', 'hashed_password', 'authorization',
      ];
      if (event.request?.data) {
        sensitiveKeys.forEach(key => {
          if (event.request.data[key]) event.request.data[key] = '[REDACTED]';
        });
      }
      return event;
    },
  });
  // Sentry v8 automatically instruments Express. No requestHandler needed here.
}

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-request-id'],
}));

// ─── Rate limiting (global: 100 req/15min per IP) ─────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in 15 minutes.' },
  },
  skip: (req) => req.path === '/api/health', // Never rate-limit health check
});
app.use(globalLimiter);

// ─── Body parsing ──────────────────────────────────────────────────────────────
// NOTE: Razorpay webhook needs raw body — handled per-route in payments.js
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request logging ───────────────────────────────────────────────────────────
app.use(logger.requestMiddleware);

// ─── Health check (no auth, no rate limit, always responds) ───────────────────
app.get('/api/health', async (req, res) => {
  const checks = {
    mongodb: { status: 'unknown' },
    redis: { status: 'unknown' },
    ai_service: { status: 'unknown' },
  };

  // MongoDB check
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      checks.mongodb = { status: 'up', latency_ms: Date.now() - start };
    } else {
      checks.mongodb = { status: 'down', error: 'Not connected' };
    }
  } catch (err) {
    checks.mongodb = { status: 'down', error: err.message };
  }

  // Redis check
  try {
    const { redisClient } = require('./config/redis');
    const start = Date.now();
    await redisClient.ping();
    checks.redis = { status: 'up', latency_ms: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'down', error: 'Redis not configured' };
  }

  // AI service check (non-blocking)
  try {
    const axios = require('axios');
    const start = Date.now();
    await axios.get(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/health`, { timeout: 3000 });
    checks.ai_service = { status: 'up', latency_ms: Date.now() - start };
  } catch {
    checks.ai_service = { status: 'down', error: 'AI service unreachable' };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'up');
  const anyDown = Object.values(checks).some(c => c.status === 'down');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : anyDown ? 'degraded' : 'unknown',
    version: '1.1.0',
    checks,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Route mounts (placeholders — filled in per phase) ────────────────────────

// ── Per-route rate limiters ─────────────────────────────────────────────
const makeLimit = (windowMin, max, msg) => rateLimit({
  windowMs: windowMin * 60 * 1000, max,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: msg } },
});

// Auth: 10 attempts per 15 min (brute-force protection)
const authLimiter = makeLimit(15, 10, 'Too many auth attempts. Try again in 15 minutes.');
// Payments: 20 per 15 min (prevent order flooding)
const payLimiter = makeLimit(15, 20, 'Too many payment requests. Please wait.');
// Search: 30 per minute (CIN typeahead)
const searchLimiter = makeLimit(1, 30, 'Search rate limit reached. Slow down.');
// v1 API: 60 per minute per key (handled inside v1 router too — double guard)
const v1Limiter = makeLimit(1, 60, 'API rate limit: 60 requests/minute.');
// Admin: 30 per 15 min
const adminLimiter = makeLimit(15, 30, 'Admin rate limit reached.');

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/payments', payLimiter, require('./routes/payments'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/monitors', require('./routes/monitors'));
app.use('/api/bulk-audit', require('./routes/bulkAudit'));
app.use('/api/keys', require('./routes/apiKeys'));
app.use('/api/v1', v1Limiter, require('./routes/v1'));
app.use('/api/admin', adminLimiter, require('./routes/admin'));

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    request_id: req.requestId,
  });
});

// ─── Sentry error handler (must be before custom error handler) ───────────────
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    request_id: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
    request_id: req.requestId,
  });
});

// ─── Database connections + server start ──────────────────────────────────────
async function startServer() {
  try {
    // MongoDB
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vendoriq', {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected', { uri: (process.env.MONGODB_URI || '').replace(/:\/\/.*@/, '://***@') });

    // Redis (optional — won't crash if unavailable in dev)
    try {
      const { redisClient } = require('./config/redis');
      await redisClient.ping();
      logger.info('Redis connected');
    } catch (redisErr) {
      logger.warn('Redis not available — caching disabled', { error: redisErr.message });
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`VendorIQ API running`, {
        port: PORT,
        env: process.env.NODE_ENV,
        version: '1.1.0',
      });
    });

    // Start cron jobs (data refresh scheduler)
    // Skip in test environment to avoid side effects
    if (process.env.NODE_ENV !== 'test') {
      const { startCronJobs } = require('./cron');
      startCronJobs();
    }
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

startServer();

module.exports = app; // For testing
