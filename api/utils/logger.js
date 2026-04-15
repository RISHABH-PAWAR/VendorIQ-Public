const winston = require('winston');

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

// ─── Format for production: structured JSON ─────────────────────────────────
const productionFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  json()
);

// ─── Format for development: human-readable ──────────────────────────────────
const developmentFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'HH:mm:ss' }),
  colorize(),
  simple()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'vendoriq-api', version: '1.1.0' },
  transports: [
    new winston.transports.Console(),
  ],
  // Never crash on uncaught logger errors
  exitOnError: false,
});

// ─── Request logger middleware ────────────────────────────────────────────────
logger.requestMiddleware = (req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now().toString(36)}`;

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP request', {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });
  });

  next();
};

module.exports = logger;
