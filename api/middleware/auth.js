'use strict';

/**
 * VendorIQ — Auth Middleware
 * ===========================
 * Validates JWT, populates req.userId and req.clientId.
 *
 * CRITICAL: req.clientId MUST be included in every MongoDB query
 * to enforce multi-tenant data isolation.
 * Pattern: Model.find({ client_id: req.clientId, ...query })
 */

const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Standard JWT auth — required for all protected routes.
 * Sets req.userId (string), req.clientId (ObjectId string).
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'Authorization header required: Bearer <token>' },
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId   = payload.sub;
    req.clientId = payload.sub; // Same — client_id IS the user._id

    // Attach request ID for tracing (if not already set by logger middleware)
    if (!req.requestId) {
      req.requestId = `req_${Date.now().toString(36)}`;
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'JWT token has expired — please login again' },
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid JWT token' },
      });
    }

    logger.error('Auth middleware error', { error: err.message, request_id: req.requestId });
    return res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication error' },
    });
  }
}

/**
 * Optional auth — doesn't reject if no token, but populates req.userId if present.
 * Used for shared report viewer (public token) where some endpoints are semi-public.
 */
function optionalAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    req.userId   = null;
    req.clientId = null;
    return next();
  }

  try {
    const payload  = jwt.verify(token, JWT_SECRET);
    req.userId     = payload.sub;
    req.clientId   = payload.sub;
  } catch {
    req.userId   = null;
    req.clientId = null;
  }

  next();
}

/**
 * API key auth — for CA partner /v1 routes.
 * Populates req.partnerId and req.clientId from the API key.
 */
async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_API_KEY', message: 'x-api-key header required' },
    });
  }

  // Key format: viq_live_xxxxxxxx_yyy...
  const prefix = apiKey.slice(0, 20);

  try {
    const bcrypt = require('bcryptjs');
    const { ApiKey } = require('../models');

    const keyDoc = await ApiKey.findOne({ key_prefix: prefix, active: true }).select('+key_hash');
    if (!keyDoc) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid or inactive API key' },
      });
    }

    const valid = await bcrypt.compare(apiKey, keyDoc.key_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' },
      });
    }

    // Update usage stats
    await ApiKey.findByIdAndUpdate(keyDoc._id, {
      $inc: { requests_total: 1, requests_this_month: 1 },
      $set: { last_used_at: new Date() },
    });

    req.partnerId = (keyDoc.client_id || keyDoc.partner_id).toString();
    req.clientId  = req.partnerId;  // client_id IS the user._id
    req.apiKeyId  = keyDoc._id.toString();

    next();
  } catch (err) {
    logger.error('API key auth error', { error: err.message });
    next(err);
  }
}

module.exports = { authMiddleware, optionalAuthMiddleware, apiKeyMiddleware };
