'use strict';

/**
 * VendorIQ — Auth Routes
 * =======================
 * POST /api/auth/register    — create account
 * POST /api/auth/login       — get JWT
 * GET  /api/auth/me          — get current user
 * POST /api/auth/refresh     — refresh JWT (7-day sliding window)
 * POST /api/auth/logout      — client-side (blacklist optional)
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');
const router  = express.Router();
const { User }= require('../models');
const logger  = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRY  = '7d';

// ── Validation schemas ─────────────────────────────────────────
const RegisterSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(2).max(80),
  password: z.string().min(8).max(72),
  company:  z.string().max(100).optional(),
  phone:    z.string().regex(/^\+?[0-9]{10,13}$/).optional(),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// POST /register
router.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);

    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
      });
    }

    const user = new User({
      email:   body.email.toLowerCase().trim(),
      name:    body.name.trim(),
      company: body.company?.trim(),
      phone:   body.phone,
    });
    await user.setPassword(body.password);
    await user.save();

    const token = signToken(user._id);

    logger.info('User registered', { user_id: user._id, email: user.email });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toSafeObject(),
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: err.errors } });
    }
    next(err);
  }
});

// POST /login
router.post('/login', async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = await User.findOne({ email: body.email.toLowerCase() }).select('+hashed_password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const valid = await user.verifyPassword(body.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Update last login
    user.last_login_at = new Date();
    user.login_history.push({
      ip:         req.ip,
      user_agent: req.get('user-agent'),
      logged_at:  new Date(),
    });
    if (user.login_history.length > 10) user.login_history = user.login_history.slice(-10);
    await user.save();

    const token = signToken(user._id);
    logger.info('User logged in', { user_id: user._id });

    return res.json({
      success: true,
      data: { token, user: user.toSafeObject() },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: err.errors } });
    }
    next(err);
  }
});

// GET /me — requires auth
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    return res.json({ success: true, data: { user: user.toSafeObject() } });
  } catch (err) { next(err); }
});

// POST /refresh — returns a fresh token
router.post('/refresh', authMiddleware, async (req, res) => {
  const token = signToken(req.userId);
  return res.json({ success: true, data: { token } });
});

// PATCH /me — update profile (name, company)
router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const allowed = ['name', 'company', 'phone'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    logger.info('Profile updated', { user_id: req.userId, fields: Object.keys(updates) });
    return res.json({ success: true, data: { user: user.toSafeObject() } });
  } catch (err) { next(err); }
});

// POST /change-password
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'current_password and new_password required' } });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters' } });
    }
    const user = await User.findById(req.userId).select('+hashed_password');
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });

    const valid = await user.verifyPassword(current_password);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
    }
    await user.setPassword(new_password);
    await user.save();
    logger.info('Password changed', { user_id: req.userId });
    return res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (err) { next(err); }
});

// POST /logout — client discards token (stateless JWT)
router.post('/logout', authMiddleware, (req, res) => {
  logger.info('User logged out', { user_id: req.userId });
  return res.json({ success: true, data: { message: 'Logged out' } });
});


// ── GET /google — redirect to Google OAuth consent screen ───────────────
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ success: false, error: { code: 'OAUTH_DISABLED', message: 'Google OAuth not configured' } });
  }
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${process.env.FRONTEND_URL?.replace('3000', '4000') || 'http://localhost:4000'}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ── GET /google/callback — exchange code → JWT, redirect to frontend ────
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, error } = req.query;
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (error || !code) {
      return res.redirect(`${FRONTEND}/auth/login?error=oauth_cancelled`);
    }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${FRONTEND}/auth/login?error=oauth_not_configured`);
    }

    // 1. Exchange code for tokens
    const tokenRes = await require('axios').post('https://oauth2.googleapis.com/token', {
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${process.env.FRONTEND_URL?.replace('3000', '4000') || 'http://localhost:4000'}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    });

    // 2. Fetch Google profile
    const profileRes = await require('axios').get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });
    const profile = profileRes.data;
    // profile: { sub, name, email, picture, email_verified }

    if (!profile.email_verified) {
      return res.redirect(`${FRONTEND}/auth/login?error=email_not_verified`);
    }

    // 3. Upsert user — find by google_id or email
    let user = await User.findOne({ $or: [{ google_id: profile.sub }, { email: profile.email.toLowerCase() }] });

    if (!user) {
      // New user — create with starter plan
      user = await User.create({
        email:     profile.email.toLowerCase(),
        name:      profile.name || profile.email.split('@')[0],
        google_id: profile.sub,
        // No hashed_password — Google auth only (can set password later)
      });
      logger.info('New user via Google OAuth', { user_id: user._id, email: user.email });
    } else if (!user.google_id) {
      // Existing email user — link Google account
      user.google_id = profile.sub;
      await user.save();
      logger.info('Google account linked to existing user', { user_id: user._id });
    }

    // 4. Issue JWT (same as email login)
    const token = signToken(user._id);

    // 5. Redirect to frontend with token in query param
    // Frontend will store it and clear the URL
    return res.redirect(`${FRONTEND}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    logger.error('Google OAuth callback error', { error: err.message });
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${FRONTEND}/auth/login?error=oauth_failed`);
  }
});

module.exports = router;
