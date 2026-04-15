'use strict';

/**
 * VendorIQ — API Key Routes (CA Partner Program)
 * =================================================
 * POST   /api/keys        — Generate a new API key
 * GET    /api/keys        — List user's active API keys
 * DELETE /api/keys/:keyId — Revoke an API key
 *
 * Access: Enterprise only
 * Keys are bcrypt-hashed — shown ONCE on creation.
 * Used by CA partner API (/api/v1) via x-api-key header.
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const { z }   = require('zod');
const logger  = require('../utils/logger');
const { ApiKey } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const MAX_KEYS_PER_USER = 5;

// ── Enterprise guard ──────────────────────────────────────────────────────
function requireEnterprise(req, res, next) {
  if (req.user?.subscription_tier !== 'enterprise') {
    return res.status(403).json({
      success: false,
      error: { code: 'PLAN_LIMIT', message: 'API keys require an Enterprise plan' },
    });
  }
  next();
}

// ── POST / — create key ───────────────────────────────────────────────────
router.post('/', authMiddleware, requireEnterprise, async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(2).max(60) }).parse(req.body);

    // Enforce key limit
    const count = await ApiKey.countDocuments({ client_id: req.clientId, is_active: true });
    if (count >= MAX_KEYS_PER_USER) {
      return res.status(400).json({
        success: false,
        error: { code: 'KEY_LIMIT', message: `Maximum ${MAX_KEYS_PER_USER} active API keys allowed` },
      });
    }

    // Generate raw key: viq_live_<32 random bytes hex>
    const rawKey    = `viq_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash   = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.substring(0, 16); // Show prefix for identification

    const apiKey = new ApiKey({
      client_id:   req.clientId,
      name,
      key_hash:    keyHash,
      key_prefix:  keyPrefix,
      is_active:   true,
      last_used_at: null,
    });
    await apiKey.save();

    logger.info('API key created', { client_id: req.clientId, key_id: apiKey._id, name });

    return res.status(201).json({
      success: true,
      data: {
        key_id:     apiKey._id,
        name:       apiKey.name,
        key:        rawKey,   // ⚠️ Shown ONCE — user must copy now
        key_prefix: keyPrefix,
        created_at: apiKey.created_at,
        message:    'Copy this key now — it will not be shown again.',
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: err.errors } });
    next(err);
  }
});

// ── GET / — list keys ─────────────────────────────────────────────────────
router.get('/', authMiddleware, requireEnterprise, async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ client_id: req.clientId, is_active: true })
      .select('-key_hash')
      .sort({ created_at: -1 });

    return res.json({
      success: true,
      data: { keys, total: keys.length },
    });
  } catch (err) { next(err); }
});

// ── DELETE /:keyId — revoke ───────────────────────────────────────────────
router.delete('/:keyId', authMiddleware, requireEnterprise, async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.keyId, client_id: req.clientId });
    if (!apiKey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }

    apiKey.is_active   = false;
    apiKey.revoked_at  = new Date();
    await apiKey.save();

    logger.info('API key revoked', { client_id: req.clientId, key_id: apiKey._id, name: apiKey.name });
    return res.json({ success: true, data: { message: 'API key revoked successfully' } });
  } catch (err) { next(err); }
});

module.exports = router;
