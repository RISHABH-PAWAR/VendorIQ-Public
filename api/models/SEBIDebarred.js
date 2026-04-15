const mongoose = require('mongoose');

/**
 * Local DB: SEBI Debarred Entities
 * Source: SEBI enforcement orders (api/cron/refreshSEBIOrders.js)
 * Refresh: Daily midnight IST
 */
const SEBIDebarredSchema = new mongoose.Schema({
  entity_name:   { type: String, required: true, trim: true },
  entity_type:   { type: String, enum: ['company', 'individual', 'firm'], default: 'company' },
  pan:           { type: String, uppercase: true, index: true },
  cin:           { type: String, index: true },
  din:           { type: String, index: true },   // For individual directors

  order_date:    { type: Date },
  order_number:  { type: String },
  debarment_type:{ type: String }, // e.g. 'securities_market', 'trading'
  debarment_period: {
    from:  { type: Date },
    until: { type: Date },   // null = permanent
  },
  is_active:     { type: Boolean, default: true, index: true },
  order_url:     { type: String },  // Link to SEBI order PDF

  refreshed_at:  { type: Date, default: Date.now },
}, {
  collection: 'sebi_debarred',
  timestamps: false,
});

SEBIDebarredSchema.index({ pan: 1, is_active: 1 });
SEBIDebarredSchema.index({ cin: 1 });
SEBIDebarredSchema.index({ din: 1 });
SEBIDebarredSchema.index({ entity_name: 'text' });

module.exports = mongoose.model('SEBIDebarred', SEBIDebarredSchema);
