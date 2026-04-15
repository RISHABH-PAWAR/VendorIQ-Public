# VendorIQ — Setup Guide

## Demo Login Credentials

After running the seed script (step 3), use these accounts:

| Role  | Email | Password | Plan |
|-------|-------|----------|------|
| **Demo** | demo@vendoriq.in | Demo@1234 | Pro (50 reports) |
| **Admin** | admin@vendoriq.in | Admin@VIQ2025 | Enterprise (unlimited) |

Login at: http://localhost:3000/auth/login

---

## First-Time Setup (5 steps)

### Step 1 — Install dependencies

```bash
# API
cd api && npm install

# Worker (shares api node_modules via Docker, or install separately)
cd ../worker && npm install

# Frontend
cd ../frontend && npm install

# AI Service
cd ../ai-service && pip install -r requirements.txt
```

### Step 2 — Environment files (already included)

Real `.env` files are included in this zip:
- `api/.env` — all API credentials
- `frontend/.env.local` — frontend public vars
- `ai-service/.env` — Gemini API key (add your key)

⚠️ **Add your Gemini API key** to `ai-service/.env`:
```
GEMINI_API_KEY=your_gemini_key_here
```
Get one free at: https://aistudio.google.com/

### Step 3 — Database setup

```bash
cd api

# Create MongoDB indexes
node scripts/setupIndexes.js

# Seed local risk databases (SFIO, SEBI, GeM blacklists)
node scripts/seedLocalDBs.js

# Create demo accounts ← DO THIS
node scripts/seedDemoAccount.js
```

### Step 4 — Start all services

Open 4 terminals:

```bash
# Terminal 1 — API server
cd api && npm run dev

# Terminal 2 — Background worker
cd worker && node index.js

# Terminal 3 — AI service
cd ai-service && uvicorn main:app --reload --port 8000

# Terminal 4 — Frontend
cd frontend && npm run dev
```

### Step 5 — Open the app

http://localhost:3000

---

## Razorpay Plans Setup (for subscriptions)

```bash
cd api && node scripts/createRazorpayPlans.js
```
This creates Pro and Enterprise plan IDs in Razorpay test mode.
Copy the output plan IDs into `api/.env`:
```
RAZORPAY_PLAN_PRO=plan_XXXXXXXXXXXX
RAZORPAY_PLAN_ENTERPRISE=plan_XXXXXXXXXXXX
```

---

## Production Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full VPS + Docker + nginx + SSL runbook.

---

## All Credentials (real keys — keep this zip private)

| Service | Credential |
|---------|-----------|
| MongoDB Atlas | In `api/.env` → `MONGODB_URI` |
| Upstash Redis | In `api/.env` → `REDIS_URL` |
| Razorpay TEST | In `api/.env` → `RAZORPAY_KEY_ID` |
| Sandbox.co.in | In `api/.env` → `SANDBOX_API_KEY` |
| SendGrid | In `api/.env` → `SENDGRID_API_KEY` |
| AWS S3 | In `api/.env` → `AWS_ACCESS_KEY_ID` |
| Sentry | In `api/.env` → `SENTRY_DSN` |
| NewsAPI | In `api/.env` → `NEWSAPI_KEY` |
| ScrapingBee | In `api/.env` → `SCRAPINGBEE_API_KEY` |
| Gemini AI | Add to `ai-service/.env` → `GEMINI_API_KEY` |
