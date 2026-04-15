# VendorIQ — Agent Context
**Version:** 1.1 | **Read this file at the start of EVERY session before writing any code.**

---

## Project
VendorIQ is a B2B SaaS platform that generates AI-powered vendor health reports for Indian companies.
Users pay ₹2,000 per report (or subscribe). Input: CIN number. Output: VHS score + PDF report in < 5 minutes.

---

## ⚠️ CRITICAL CORRECTIONS — Override anything in older docs

| Item | Old (WRONG) | New (CORRECT) |
|------|-------------|---------------|
| Report price | ₹999 | **₹2,000 (200000 paise)** |
| Pitch comparison | "10x cheaper" | **"5x cheaper"** |
| Professional plan | ₹15,000/month | **₹9,999/month (50 reports, 20 monitors)** |
| Enterprise plan | ₹50,000/month | **₹34,999/month (unlimited)** |
| Enterprise annual | — | **₹27,999/month (20% off, billed yearly)** |
| CA Partner setup | ₹1,00,000 | **₹69,000** |
| CA Partner per-report | ₹3/report | **₹9/report** |
| Bulk minimum | ₹49,950 | **₹1,00,000 (50 × ₹2,000)** |
| Primary LLM | OpenAI GPT-4o-mini | **Google Gemini 1.5 Flash** |
| LLM env vars | OPENAI_API_KEY | **GEMINI_API_KEY + LLM_PROVIDER=gemini** |
| GPT swap | code change | **env var only: LLM_PROVIDER=openai — zero code changes** |
| Embedding model | text-embedding-3-small | **models/text-embedding-004 (Gemini)** |
| Data sources | 6 | **13** |
| Report accuracy | — | **85–88% with all sources active** |
| Min sources for report | 4 of 6 | **7 of 13** |
| Hard disqualifiers | 5 | **6 (added: SFIO active investigation)** |
| REPORT_PRICE_PAISE | 99900 | **200000** |
| Scraping service | — | **ScrapingBee (free 1,000 credits/month)** |

---

## Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, GSAP, Recharts, D3.js
- **API:** Express.js, Node.js 20, Bull.js, Puppeteer, MongoDB, Redis (Upstash)
- **AI:** Python FastAPI, LangGraph, **Google Gemini 1.5 Flash** (GPT-swappable via env var)
- **Worker:** Bull.js background jobs
- **Payments:** Razorpay (TEST mode: rzp_test_*)
- **Storage:** AWS S3 (eu-north-1, bucket: vendoriq-reports)
- **Scraping:** Puppeteer + ScrapingBee (CAPTCHA bypass for govt portals)

---

## VHS Scoring Algorithm — NEVER CHANGE WEIGHTS
```
VHS = (Financial × 0.30) + (Legal × 0.25) + (GST × 0.20) + (Directors × 0.15) + (Market × 0.10)

Hard Disqualifiers → VHS = 0 immediately (any one triggers):
  1. Company status = STRUCK_OFF
  2. Any director DIN disqualified (MCA disqualified DIN list)
  3. Active NCLT CIRP admitted
  4. SFIO active investigation
  5. RBI wilful defaulter match
  6. Director in active SEBI debarment order

Risk Bands:
  0–40   → HIGH RISK   → #DC2626 Red   → REJECT
  41–65  → MEDIUM RISK → #F59E0B Amber → INVESTIGATE
  66–100 → LOW RISK    → #16A34A Green → APPROVE
```

---

## 13 Data Sources

**Paid — Sandbox.co.in (SANDBOX_API_KEY set):**
1. MCA company master
2. MCA directors + DINs
3. MCA charges register
4. GST filing history (needs GSTIN)
5. PAN verification

**Free APIs — No key needed:**
6. GST public portal API
7. Google News RSS (6 queries per company)
8. GDELT Project API (global news intelligence)
9. BSE/NSE listed company data

**Free Scrapers — Puppeteer + ScrapingBee:**
10. eCourts India (district courts, all states)
11. NCLT insolvency portal (CIRP/liquidation)
12. SEBI enforcement orders
13. SFIO watchlist

**Local MongoDB DBs — Refreshed by cron (instant lookups):**
- `disqualified_dins` — MCA DIN CSV (monthly, 1st of month)
- `wilful_defaulters` — RBI PDF parse (quarterly)
- `sfio_watchlist` — SFIO scrape (weekly Sunday)
- `sebi_debarred` — SEBI scrape (daily midnight)
- `gem_blacklist` — GeM + CPPP scrape (weekly)

---

## API Response Format (ALL endpoints)
```json
Success: { "success": true, "data": {...}, "meta": { "request_id": "req_xxx", "timestamp": "ISO" } }
Error:   { "success": false, "error": { "code": "ERROR_CODE", "message": "..." }, "request_id": "req_xxx" }
```

---

## Database Rules — CRITICAL
```
ALL MongoDB queries on user data MUST include: { client_id: req.user._id }
NO exceptions. Violating = cross-tenant data leak = end of business.

WRONG:   Report.findOne({ report_id: id })
CORRECT: Report.findOne({ report_id: id, client_id: req.clientId })
```

---

## Indian Business Data Formats
```
CIN:   ^[LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$
GSTIN: ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
DIN:   8 digits exactly
Money: Store paise in DB, display ₹. 1₹ = 100 paise.
```

---

## Design System — Obsidian Terminal
```
Fonts: Cabinet Grotesk (display) | Satoshi (body) | JetBrains Mono (numbers)
Colors: --brand-primary #1A56DB | --risk-high #DC2626 | --risk-medium #F59E0B | --risk-low #16A34A | --surface-dark #0F172A
Effects: Liquid glass cards (backdrop-filter: blur(24px)), cursor glow, shimmer skeletons
Motion: Framer Motion (300ms page transitions) | GSAP (800ms VHS gauge) | D3.js (force graph)
Rule: Dark ONLY. No light mode. No Inter font. No purple gradients.
```

---

## LLM Abstraction (ai-service/llm_client.py)
```python
LLM_PROVIDER=gemini  → GeminiClient (gemini-1.5-flash) — current default
LLM_PROVIDER=openai  → OpenAIClient (gpt-4o-mini) — add OPENAI_API_KEY
# Switching LLM = change 1 env var only. No code changes anywhere.
```

---

## Current Environment Status
```
MongoDB:   Atlas M0 (vandoriq cluster) — ✅ Connected
Redis:     Upstash (quiet-marmoset-50005) — ✅ Connected
AI:        Gemini free tier (aistudio key) — ✅ Configured
Payments:  Razorpay TEST mode — ✅ Configured
Storage:   AWS S3 eu-north-1 — ✅ Configured (note: eu-north-1 not ap-south-1)
Scraping:  ScrapingBee free tier — ✅ Key added (SCRAPINGBEE_API_KEY)
Sentry:    ✅ DSN configured
```

---

## Razorpay Amount Constants (EXACT — copy into all payment files)
```javascript
const REPORT_PRICE_PAISE       = 200000;   // ₹2,000 — DO NOT CHANGE
const PROFESSIONAL_PRICE_PAISE = 999900;   // ₹9,999/month
const ENTERPRISE_PRICE_PAISE   = 3499900;  // ₹34,999/month
const ENTERPRISE_ANNUAL_PAISE  = 2799900;  // ₹27,999/month (annual)
const CA_SETUP_PAISE           = 6900000;  // ₹69,000 one-time
const CA_PER_REPORT_PAISE      = 900;      // ₹9/report
const BULK_MIN_PAISE           = 10000000; // ₹1,00,000 minimum
```

---

## Current Phase
Phase 0 ✅ complete → Building **Phase 1** (data pipeline + VHS engine)
