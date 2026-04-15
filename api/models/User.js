const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // ── Identity ────────────────────────────────────────────────
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:            { type: String, required: true, trim: true },
  company:         { type: String, trim: true },
  phone:           { type: String, trim: true },
  designation:     { type: String, trim: true },
  hashed_password: { type: String, select: false }, // Never returned by default
  google_id:       { type: String, sparse: true },

  // ── Subscription ────────────────────────────────────────────
  subscription_tier: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    default: 'starter',
  },
  subscription_status: {
    type: String,
    enum: ['active', 'past_due', 'cancelled', 'trialing'],
    default: 'active',
  },
  razorpay_subscription_id: { type: String },
  razorpay_customer_id:     { type: String },
  subscription_start:       { type: Date },
  subscription_end:         { type: Date },

  // ── Usage Tracking (reset monthly) ──────────────────────────
  reports_used_this_month:  { type: Number, default: 0, min: 0 },
  monitors_used:            { type: Number, default: 0, min: 0 },
  api_calls_this_month:     { type: Number, default: 0, min: 0 },
  billing_cycle_start:      { type: Date, default: Date.now },

  // ── Plan Limits (cached from tier for fast checks) ───────────
  plan_reports_limit:       { type: Number, default: null },   // null = unlimited
  plan_monitors_limit:      { type: Number, default: 0 },
  plan_api_calls_limit:     { type: Number, default: 0 },

  // ── Preferences ─────────────────────────────────────────────
  onboarding_sector: {
    type: String,
    enum: ['manufacturing', 'pharma', 'fintech', 'realestate', 'it_services', 'fmcg', 'logistics', 'healthcare', null],
    default: null,
  },
  notifications: {
    whatsapp_enabled:   { type: Boolean, default: false },
    email_enabled:      { type: Boolean, default: true },
    min_vhs_drop:       { type: Number, default: 10 },        // Alert threshold
    digest_frequency:   { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
    alert_types:        { type: [String], default: ['vhs_change', 'hard_flag', 'court_case'] },
  },

  // ── Auth ─────────────────────────────────────────────────────
  email_verified:   { type: Boolean, default: false },
  last_login_at:    { type: Date },
  login_history:    [{
    device:     String,
    ip:         String,
    user_agent: String,
    logged_at:  { type: Date, default: Date.now },
  }],

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// ── Indexes ──────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ razorpay_subscription_id: 1 });
UserSchema.index({ created_at: -1 });

// ── Password helpers ─────────────────────────────────────────
UserSchema.methods.setPassword = async function(plaintext) {
  this.hashed_password = await bcrypt.hash(plaintext, 12);
};

UserSchema.methods.verifyPassword = async function(plaintext) {
  if (!this.hashed_password) return false;
  return bcrypt.compare(plaintext, this.hashed_password);
};

// ── Plan limit helpers ───────────────────────────────────────
UserSchema.methods.canGenerateReport = function() {
  if (this.subscription_tier === 'starter') return true; // Pay-per-use, no cap
  if (this.plan_reports_limit === null) return true;     // Unlimited (enterprise)
  return this.reports_used_this_month < this.plan_reports_limit;
};

UserSchema.methods.canAddMonitor = function() {
  if (this.plan_monitors_limit === null) return true;
  return this.monitors_used < this.plan_monitors_limit;
};

// ── Sanitized output (removes sensitive fields) ──────────────
UserSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.hashed_password;
  delete obj.google_id;
  delete obj.login_history;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
