const mongoose = require('mongoose');

/**
 * Local DB: GeM (Government e-Marketplace) Blacklisted Vendors
 * Source: GeM portal blacklist CSV (api/cron/refreshGeMBlacklist.js)
 * Refresh: Weekly Monday 02:00 IST
 */
const GeMBlacklistSchema = new mongoose.Schema({
  vendor_name:   { type: String, required: true, trim: true },
  cin:           { type: String, index: true },
  gstin:         { type: String, index: true },
  pan:           { type: String, uppercase: true, index: true },

  blacklist_date:   { type: Date },
  blacklist_reason: { type: String },
  blacklist_period: {
    from:  { type: Date },
    until: { type: Date },   // null = permanent
  },
  is_active:   { type: Boolean, default: true, index: true },
  gem_seller_id: { type: String },

  refreshed_at: { type: Date, default: Date.now },
}, {
  collection: 'gem_blacklist',
  timestamps: false,
});

GeMBlacklistSchema.index({ cin: 1, is_active: 1 });
GeMBlacklistSchema.index({ gstin: 1 });
GeMBlacklistSchema.index({ pan: 1 });
GeMBlacklistSchema.index({ vendor_name: 'text' });

module.exports = mongoose.model('GeMBlacklist', GeMBlacklistSchema);
