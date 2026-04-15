const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema({
  client_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // ── Key storage (SECURITY: never store raw key) ──────────────
  key_hash:    { type: String, required: true, select: false }, // bcrypt hash of full key
  key_prefix:  { type: String, required: true },   // First 12 chars (viq_live_xxxx) for lookup
  name:        { type: String, required: true },   // e.g. "Production App"
  label:       { type: String },  // alias, kept for backward compat

  // ── White-label config ────────────────────────────────────────
  white_label_config: {
    logo_url:              { type: String },
    primary_color:         { type: String, default: '#1A56DB' },
    company_name:          { type: String },
    hide_vendoriq_branding:{ type: Boolean, default: false },
  },

  // ── Usage ─────────────────────────────────────────────────────
  requests_total:        { type: Number, default: 0 },
  requests_this_month:   { type: Number, default: 0 },
  last_used_at:          { type: Date },
  rate_limit_per_hour:   { type: Number, default: 1000 }, // Enterprise: 1000/hr

  // ── State ─────────────────────────────────────────────────────
  active:      { type: Boolean, default: true },
  is_active:   { type: Boolean, default: true },  // alias for route queries
  revoked_at:  { type: Date },

  created_at:  { type: Date, default: Date.now },
});

ApiKeySchema.index({ key_prefix: 1 });   // For fast key lookup on every API call
ApiKeySchema.index({ partner_id: 1 });

module.exports = mongoose.model('ApiKey', ApiKeySchema);
