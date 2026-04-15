const mongoose = require('mongoose');

/**
 * Local DB: SFIO (Serious Fraud Investigation Office) Active Investigations
 * Source: MCA/SFIO press releases (api/cron/refreshSFIOWatchlist.js)
 * Refresh: Weekly Sunday 01:00 IST
 */
const SFIOWatchlistSchema = new mongoose.Schema({
  cin:             { type: String, index: true },
  company_name:    { type: String, required: true, trim: true },
  pan:             { type: String, uppercase: true, index: true },
  investigation_status: {
    type: String,
    enum: ['active', 'completed', 'suspended'],
    default: 'active',
  },
  investigation_start: { type: Date },
  investigation_details: { type: String },
  order_reference:     { type: String },
  refreshed_at:        { type: Date, default: Date.now },
}, {
  collection: 'sfio_watchlist',
  timestamps: false,
});

SFIOWatchlistSchema.index({ cin: 1 });
SFIOWatchlistSchema.index({ pan: 1 });
SFIOWatchlistSchema.index({ company_name: 'text' });

module.exports = mongoose.model('SFIOWatchlist', SFIOWatchlistSchema);
