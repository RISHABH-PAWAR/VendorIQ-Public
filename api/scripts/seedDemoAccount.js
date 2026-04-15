/**
 * VendorIQ — Demo Account Seeder
 * Creates a ready-to-use demo user + admin user in MongoDB
 *
 * Usage:  node scripts/seedDemoAccount.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Inline minimal User schema (avoids circular requires) ──────────────
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  hashed_password: { type: String, select: false },
  company: { type: String },
  phone: { type: String },
  subscription_tier: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'pro' },
  subscription_status: { type: String, default: 'active' },
  reports_used_this_month: { type: Number, default: 0 },
  plan_reports_limit: { type: Number, default: 10 },
  monitors_used: { type: Number, default: 0 },
  plan_monitors_limit: { type: Number, default: 5 },
  plan_api_calls_limit: { type: Number, default: 1000 },
  is_admin: { type: Boolean, default: false },
  google_id: { type: String },
  created_at: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const DEMO_ACCOUNTS = [
  {
    name: 'Demo User',
    email: 'demo@vendoriq.in',
    password: 'Demo@1234',
    company: 'VendorIQ Demo',
    subscription_tier: 'pro',
    plan_reports_limit: 50,
    plan_monitors_limit: 10,
    plan_api_calls_limit: 5000,
    reports_used_this_month: 3,
    is_admin: false,
  },
  {
    name: 'Admin User',
    email: 'admin@vendoriq.in',
    password: 'Admin@VIQ2025',
    company: 'VendorIQ',
    subscription_tier: 'enterprise',
    plan_reports_limit: null, // unlimited
    plan_monitors_limit: null,
    plan_api_calls_limit: 999999,
    reports_used_this_month: 0,
    is_admin: true,
  },
];

async function seed() {
  try {
    console.log('\n🌱  VendorIQ — Demo Account Seeder');
    console.log('──────────────────────────────────────────');

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✓  Connected to MongoDB');

    for (const account of DEMO_ACCOUNTS) {
      const { password, ...rest } = account;
      const hashed_password = await bcrypt.hash(password, 12);

      const existing = await User.findOne({ email: rest.email });
      if (existing) {
        // Update password in case it changed
        await User.updateOne({ email: rest.email }, { $set: { hashed_password, ...rest } });
        console.log(`✓  Updated:  ${rest.email}`);
      } else {
        await User.create({ ...rest, hashed_password });
        console.log(`✓  Created:  ${rest.email}`);
      }
    }

    console.log('\n──────────────────────────────────────────');
    console.log('✅  Demo accounts ready!\n');
    console.log('  DEMO USER');
    console.log('  Email:    demo@vendoriq.in');
    console.log('  Password: Demo@1234');
    console.log('  Plan:     Pro (50 reports/month)\n');
    console.log('  ADMIN');
    console.log('  Email:    admin@vendoriq.in');
    console.log('  Password: Admin@VIQ2025');
    console.log('  Plan:     Enterprise (unlimited)\n');
    console.log('  Login at: http://localhost:3000/auth/login');
    console.log('──────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌  Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
