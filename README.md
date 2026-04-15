# VendorIQ

AI-powered vendor due diligence platform for Indian businesses. Submit a CIN number and receive a Vendor Health Score (VHS) with a full PDF report in under five minutes.

---

## Overview

VendorIQ automates the vendor screening process by aggregating data from 13 authoritative sources — including MCA, GST, eCourts, NCLT, SEBI, SFIO, and RBI — and running it through a weighted scoring engine to produce a structured risk assessment. The output is a standardised Vendor Health Score (0–100) and a detailed PDF report suited for procurement, credit, and compliance teams.

**Pricing:** Rs. 2,000 per report (pay-per-use) or subscription plans starting at Rs. 9,999/month.

---

## Architecture

```
Frontend    Next.js 14 (App Router) — TypeScript, Tailwind CSS, Framer Motion, GSAP, Recharts, D3.js
API         Express.js, Node.js 20 — Bull.js async workers, Puppeteer, MongoDB, Redis (Upstash)
AI Service  Python FastAPI — LangGraph, Google Gemini 1.5 Flash (GPT-swappable via env var)
Storage     MongoDB Atlas + Upstash Redis + AWS S3 (eu-north-1)
Payments    Razorpay
Scraping    Puppeteer + ScrapingBee (CAPTCHA bypass for government portals)
```

---

## VHS Scoring Model

```
VHS = (Financial x 0.30) + (Legal x 0.25) + (GST x 0.20) + (Directors x 0.15) + (Market x 0.10)
```

**Hard Disqualifiers** — any single trigger sets VHS to 0 immediately:

1. Company status = STRUCK_OFF
2. Director DIN on MCA disqualified list
3. Active NCLT CIRP admitted
4. SFIO active investigation
5. RBI wilful defaulter match
6. Director under active SEBI debarment order

**Risk Bands:**

| Score | Band | Recommendation |
|-------|------|----------------|
| 0–40 | High Risk | Reject |
| 41–65 | Medium Risk | Investigate |
| 66–100 | Low Risk | Approve |

---

## Data Sources

**Sandbox.co.in (paid, sandbox API key required):**
- MCA company master
- MCA directors and DINs
- MCA charges register
- GST filing history (requires GSTIN)
- PAN verification

**Free public APIs:**
- GST public portal API
- Google News RSS (6 queries per company)
- GDELT Project API
- BSE/NSE listed company data

**Scrapers (Puppeteer + ScrapingBee):**
- eCourts India — district courts, all states
- NCLT insolvency portal — CIRP and liquidation
- SEBI enforcement orders
- SFIO watchlist

**Local MongoDB collections (refreshed by cron):**
- `disqualified_dins` — MCA DIN CSV, refreshed monthly
- `wilful_defaulters` — RBI PDF parse, refreshed quarterly
- `sfio_watchlist` — SFIO scrape, refreshed weekly
- `sebi_debarred` — SEBI scrape, refreshed daily
- `gem_blacklist` — GeM and CPPP scrape, refreshed weekly

Minimum 7 of 13 sources must return data for a report to be generated. Expected accuracy with all sources active: 85–88%.

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+
- Docker and Docker Compose

### 1. Clone and configure

```bash
git clone https://github.com/yourname/vendoriq
cd vendoriq
cp .env.example api/.env
# Fill in api/.env with required values (see Environment Variables below)
```

### 2. Start local infrastructure

```bash
docker-compose up -d
# MongoDB  -> localhost:27017
# Redis    -> localhost:6379
```

### 3. Install API dependencies and seed databases

```bash
cd api && npm install
node scripts/seedLocalDBs.js
# Takes approximately 5–15 minutes on first run
```

### 4. Start all services

```bash
# API server
cd api && node index.js
# -> http://localhost:4000/api/health

# Frontend
cd frontend && npm install && npm run dev
# -> http://localhost:3000

# AI service
cd ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Background worker (separate terminal)
cd worker && node index.js
```

### 5. Test the pipeline

```bash
node api/scripts/testReport.js L17110MH1973PLC019786
```

---

## Environment Variables

```env
# AI
GEMINI_API_KEY=
LLM_PROVIDER=gemini          # Switch to "openai" + add OPENAI_API_KEY — zero code changes

# Data
SANDBOX_API_KEY=
SCRAPINGBEE_API_KEY=

# Database
MONGODB_URI=
REDIS_URL=

# Payments
RAZORPAY_KEY_ID=rzp_test_*
RAZORPAY_KEY_SECRET=

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-north-1
S3_BUCKET=vendoriq-reports

# Monitoring
SENTRY_DSN=
```

---

## Pricing

| Plan | Price | Reports | Monitors |
|------|-------|---------|----------|
| Starter | Rs. 2,000 per report | Pay-per-use | — |
| Professional | Rs. 9,999/month | 50/month | 20 |
| Enterprise | Rs. 34,999/month | Unlimited | Unlimited |
| Enterprise Annual | Rs. 27,999/month | Unlimited | Unlimited |
| CA Partner API | Rs. 69,000 setup + Rs. 9/report | — | — |

---

## Payment Constants

```javascript
const REPORT_PRICE_PAISE       = 200000;   // Rs. 2,000
const PROFESSIONAL_PRICE_PAISE = 999900;   // Rs. 9,999/month
const ENTERPRISE_PRICE_PAISE   = 3499900;  // Rs. 34,999/month
const ENTERPRISE_ANNUAL_PAISE  = 2799900;  // Rs. 27,999/month (annual)
const CA_SETUP_PAISE           = 6900000;  // Rs. 69,000 one-time
const CA_PER_REPORT_PAISE      = 900;      // Rs. 9/report
const BULK_MIN_PAISE           = 10000000; // Rs. 1,00,000 minimum
```

All monetary values stored as paise in the database. Display layer converts to rupees. 1 Rs. = 100 paise.

---

## API Response Format

All endpoints return a consistent envelope:

```json
// Success
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req_xxx",
    "timestamp": "ISO8601"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  },
  "request_id": "req_xxx"
}
```

---

## Database Security

All MongoDB queries on user data must include a `client_id` filter. No exceptions.

```javascript
// WRONG — cross-tenant data leak
Report.findOne({ report_id: id })

// CORRECT
Report.findOne({ report_id: id, client_id: req.clientId })
```

---

## Indian Data Formats

```
CIN    ^[LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$
GSTIN  ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
DIN    8 digits exactly
```

---

## LLM Provider Switching

The AI service abstracts LLM provider behind a single environment variable. No code changes required.

```env
LLM_PROVIDER=gemini    # Default — Gemini 1.5 Flash (GEMINI_API_KEY)
LLM_PROVIDER=openai    # Swap to GPT-4o-mini (OPENAI_API_KEY)
```

---

## Infrastructure Status

| Service | Provider | Status |
|---------|----------|--------|
| MongoDB | Atlas M0 (vandoriq cluster) | Connected |
| Redis | Upstash (quiet-marmoset-50005) | Connected |
| AI | Gemini free tier (AI Studio) | Configured |
| Payments | Razorpay TEST mode | Configured |
| Storage | AWS S3 eu-north-1 | Configured |
| Scraping | ScrapingBee free tier | Configured |
| Monitoring | Sentry | Configured |

---

## Current Development Phase

Phase 0 is complete. Active work is on Phase 1: data pipeline and VHS scoring engine.

---

## License

Proprietary. All rights reserved.
