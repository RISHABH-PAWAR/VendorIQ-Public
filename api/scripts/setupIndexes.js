'use strict';
/**
 * Run once after first deploy: node scripts/setupIndexes.js
 * Creates all compound indexes needed for VendorIQ queries.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import all models (registers schemas with Mongoose)
const models = require('../models');

async function setupIndexes() {
  logger.info('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  logger.info('Connected. Creating indexes...');

  for (const [name, Model] of Object.entries(models)) {
    try {
      await Model.createIndexes();
      logger.info(`✓ Indexes created: ${name}`);
    } catch (err) {
      logger.error(`✗ Index error: ${name}`, { error: err.message });
    }
  }

  logger.info('All indexes created.');
  await mongoose.disconnect();
}

setupIndexes().catch(err => {
  logger.error('setupIndexes failed', { error: err.message });
  process.exit(1);
});
