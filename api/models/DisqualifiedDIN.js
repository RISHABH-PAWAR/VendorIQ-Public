const mongoose = require('mongoose');

/**
 * Local DB: MCA Disqualified Director Identification Numbers
 * Source: MCA21 monthly CSV download (api/cron/downloadDINCSV.js)
 * Refresh: Monthly (1st of month, 03:00 IST)
 * Purpose: Instant O(1) DIN check — no API call during report generation
 */
const DisqualifiedDINSchema = new mongoose.Schema({
  din: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^\d{8}$/, // DINs are exactly 8 digits
  },
  director_name:            { type: String, trim: true },
  disqualification_date:    { type: Date },
  disqualification_section: { type: String }, // e.g. "Section 164(2)"
  company_cin:              { type: String },  // CIN where disqualification occurred
  disqualification_reason:  { type: String },
  refreshed_at:             { type: Date, default: Date.now },
}, {
  collection: 'disqualified_dins',
  timestamps: false,
});

DisqualifiedDINSchema.index({ din: 1 }, { unique: true });
DisqualifiedDINSchema.index({ director_name: 'text' });
DisqualifiedDINSchema.index({ refreshed_at: -1 });

module.exports = mongoose.model('DisqualifiedDIN', DisqualifiedDINSchema);
