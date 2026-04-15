const mongoose = require('mongoose');

/**
 * Local DB: RBI Wilful Defaulters
 * Source: RBI quarterly PDF publications (api/cron/downloadRBIDefaulters.js)
 * Refresh: Quarterly (1st of Jan/Apr/Jul/Oct, 04:00 IST)
 * Purpose: Instant lookup — no API call during report generation
 */
const WilfulDefaulterSchema = new mongoose.Schema({
  borrower_name:     { type: String, required: true, trim: true, index: true },
  pan:               { type: String, uppercase: true, index: true },
  cin:               { type: String, index: true },
  bank_name:         { type: String, trim: true },
  outstanding_amount:{ type: Number }, // In lakhs (as reported by RBI)
  suit_filed:        { type: Boolean, default: false },
  reported_date:     { type: Date },
  category:          { type: String }, // 'wilful_defaulter' | 'non_cooperative'
  refreshed_at:      { type: Date, default: Date.now },
}, {
  collection: 'wilful_defaulters',
  timestamps: false,
});

WilfulDefaulterSchema.index({ pan: 1 });
WilfulDefaulterSchema.index({ cin: 1 });
WilfulDefaulterSchema.index({ borrower_name: 'text' });

module.exports = mongoose.model('WilfulDefaulter', WilfulDefaulterSchema);
