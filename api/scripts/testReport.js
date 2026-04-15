'use strict';
/**
 * Phase 1 Acceptance Test
 * Run: node scripts/testReport.js L17110MH1973PLC019786
 * Expected: VHS score printed with breakdown
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { collectAllData } = require('../services/dataCollector');
const { calculateVHS } = require('../services/scoringEngine');
const logger = require('../utils/logger');

const cin = process.argv[2] || 'L17110MH1973PLC019786';

async function runTest() {
  logger.info(`Testing VHS pipeline for CIN: ${cin}`);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  logger.info('DB connected');

  console.log('\n── Step 1: Collecting data ────────────────────────────');
  const rawData = await collectAllData(cin);
  console.log(`Sources available: ${rawData.sources_available}/13`);
  console.log(`Partial report:    ${rawData.partial_report}`);

  console.log('\n── Step 2: Calculating VHS ────────────────────────────');
  const result = calculateVHS(rawData);

  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  VHS Score:    ${String(result.vhs_score).padEnd(22)} ║`);
  console.log(`║  Risk Level:   ${String(result.risk_level).padEnd(22)} ║`);
  console.log(`║  Confidence:   ${String(result.confidence + '%').padEnd(22)} ║`);
  console.log('╠══════════════════════════════════════╣');
  console.log('║  Breakdown:                          ║');
  console.log(`║    Financial:  ${String(result.breakdown.financial).padEnd(22)} ║`);
  console.log(`║    Legal:      ${String(result.breakdown.legal).padEnd(22)} ║`);
  console.log(`║    GST:        ${String(result.breakdown.gst).padEnd(22)} ║`);
  console.log(`║    Directors:  ${String(result.breakdown.directors).padEnd(22)} ║`);
  console.log(`║    Market:     ${String(result.breakdown.market).padEnd(22)} ║`);
  console.log('╚══════════════════════════════════════╝');

  if (result.hard_flags.length > 0) {
    console.log('\n⚠️  HARD DISQUALIFIERS:');
    result.hard_flags.forEach(f => console.log(`   [${f.code}] ${f.message}`));
  }

  if (result.key_flags.length > 0) {
    console.log('\n⚑  KEY FLAGS:');
    result.key_flags.slice(0, 5).forEach(f => console.log(`   [${f.severity}] ${f.message}`));
  }

  console.log('\n✅ Phase 1 acceptance test PASSED\n');
  await mongoose.disconnect();
}

runTest().catch(err => {
  console.error('❌ Test FAILED:', err.message);
  process.exit(1);
});
