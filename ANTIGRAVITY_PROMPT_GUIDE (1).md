# VendorIQ — Complete Antigravity Step-by-Step Prompt Guide
**Version:** 2.1 | **Author:** Rishabh Pawar | **Date:** March 2026
**Changes from v2.0:** ₹2,000 pricing · Gemini LLM · 13 data sources · Phase 1.5 (new scrapers + crons) · ScrapingBee

---

## ⚡ HOW TO USE THIS GUIDE

1. Open Antigravity IDE → Agent Manager
2. Place all context files in your project root (CONTEXT.md is the most important — read it every session)
3. Copy each prompt **exactly** — do NOT paraphrase
4. **Always review the artifact plan before approving**
5. Run acceptance tests before moving to the next prompt
6. If anything conflicts with CONTEXT.md, CONTEXT.md wins

**Agent Settings:**
- Planning Mode for new features
- Fast Mode for small fixes
- One major feature per session — never chain features in one prompt
- Reference max 2 files per prompt

---

## 🗂️ PRE-START CHECKLIST

```
□ Create GitHub repo: github.com/{yourname}/vendoriq
□ Sign up Sandbox.co.in → test API key:
    GET https://api.sandbox.co.in/v2/corporate/company/L17110MH1973PLC019786
    Header: x-api-key: your_key
□ Get Gemini API key FREE: https://aistudio.google.com/app/apikey
□ Sign up Razorpay → TEST mode keys (Key ID + Secret)
□ Sign up MongoDB Atlas → M0 free cluster → copy connection URI
□ Sign up Upstash → Redis DB → copy REST URL + token
□ Sign up Vercel → connect GitHub
□ Sign up Render.com → create account
□ Sign up SendGrid → API key + verify sender email
□ Sign up 360dialog or Wati.io → WhatsApp sandbox (Phase 3)
□ Sign up AWS → S3 bucket "vendoriq-reports" in eu-north-1 → IAM user
□ Sign up Sentry.io → create Node.js + Next.js projects
□ Sign up ScrapingBee (FREE) → https://scrapingbee.com → get API key (1,000 credits/month)
□ Copy api.env content → rename to api/.env (all keys already configured)
□ Create CONTEXT.md (v1.1) in repo root
□ docker-compose up -d → verify MongoDB + Redis running
```

---

## PHASE 0 — PROJECT SCAFFOLD
**Goal:** Create monorepo structure, install dependencies, configure Docker
**Time:** 2–3 hours | **Test:** All services start without errors

---

### PROMPT 0.1 — Monorepo Foundation

```
Read CONTEXT.md.

Create the complete VendorIQ monorepo with this exact directory structure:

vendoriq/
├── api/
│   ├── routes/          (placeholder index.js files)
│   ├── services/        (placeholder)
│   ├── scrapers/        (placeholder — NEW: eCourts, NCLT, SEBI, SFIO)
│   ├── cron/            (placeholder — NEW: 5 cron job files)
│   ├── middleware/      (placeholder)
│   ├── models/          (placeholder)
│   ├── config/
│   │   └── sectors/     (placeholder)
│   ├── templates/
│   ├── utils/
│   ├── scripts/         (placeholder)
│   └── index.js
├── ai-service/
│   ├── nodes/
│   ├── data/case_studies/
│   ├── indexes/
│   ├── main.py
│   ├── llm_client.py    (NEW — LLM abstraction layer)
│   ├── requirements.txt
│   └── Dockerfile
├── worker/
├── shared/
│   ├── types/
│   └── constants/
├── docker-compose.yml
├── .env.example
├── CONTEXT.md           (already exists)
└── README.md

Tasks:
1. Create all directories + placeholder files
2. Create docker-compose.yml:
   - MongoDB 7 on port 27017, volume: mongo_data
   - Redis 7 alpine on port 6379
   - Both with restart: unless-stopped
3. Create .env.example with ALL variables from CONTEXT.md Section 8.2
   (Use placeholders — no real values)
4. Create api/index.js:
   - Express app with cors, helmet, express-rate-limit (100 req/15min)
   - Mount route placeholders: /api/reports, /api/payments, /api/monitors,
     /api/bulk-audit, /api/subscriptions, /api/keys, /api/v1, /api/auth
   - GET /api/health → { status: "healthy", version: "1.1.0", timestamp: new Date() }
   - Winston logger for all requests (include request_id)
   - Sentry error handler at bottom
5. Create api/utils/logger.js: Winston with JSON format + request_id
6. Create ai-service/llm_client.py using the EXACT code from CONTEXT.md "LLM Configuration"

Show artifact plan first. Do NOT install npm packages.
```

---

### PROMPT 0.2 — Install All Dependencies

```
Read CONTEXT.md.

Install all npm and Python dependencies. Use EXACT versions from MVP_TECH_DOC.md Section 3.

Commands in order:
1. cd frontend && npx create-next-app@14.2.3 . --typescript --tailwind --app --src-dir --no-git
2. cd frontend && npx shadcn-ui@latest init (Dark theme, CSS variables, slate base)
3. cd frontend && npx shadcn-ui@latest add button card badge dialog table tabs progress tooltip dropdown-menu
4. cd frontend && npm install (all frontend deps from MVP_TECH_DOC.md Section 3.1)
5. cd api && npm install (all api deps from MVP_TECH_DOC.md Section 3.2 — INCLUDES:
   cheerio fast-xml-parser pdf-parse scrapingbee)
6. cd ai-service && python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt (from MVP_TECH_DOC.md Section 3.3 — INCLUDES:
   langchain-google-genai google-generativeai)

After installing:
1. docker-compose up -d
2. node api/index.js → GET localhost:4000/api/health → { status: "healthy" }
3. Verify Python: python -c "import google.generativeai; print('Gemini OK')"

Fix any dependency conflicts. Do not proceed if health check fails.
```

---

## PHASE 1 — DATA PIPELINE & VHS ENGINE
**Goal:** CLI that fetches real Indian company data and calculates VHS score
**Time:** Week 1–3 | **Test:** `node scripts/testReport.js L17110MH1973PLC019786` works end-to-end

---

### PROMPT 1.1 — MongoDB Models

```
Read CONTEXT.md and ARCHITECTURE.md Section 5.

Create all Mongoose models in api/models/:

CORE MODELS:
1. User.js — Full schema from ARCHITECTURE.md Section 5 (subscription_tier, reports_used_this_month, etc.)
2. Report.js — From ARCHITECTURE.md Section 5 (include all 13 raw_data fields, confidence, partial_report)
3. VendorMonitor.js — alert_config, alert_history, last_data_hash
4. BulkAudit.js + AuditResult.js — bulk job tracking
5. ApiKey.js — key_hash (bcrypt), key_prefix, white_label_config

LOCAL DB MODELS (new in v1.1):
6. DisqualifiedDIN.js:
   { din: String(unique), director_name: String, disqualification_date: Date,
     disqualification_section: String, company_cin: String, refreshed_at: Date }

7. WilfulDefaulter.js:
   { borrower_name: String, pan: String(indexed), cin: String(indexed),
     bank_name: String, outstanding_amount: Number, reported_date: Date, refreshed_at: Date }

8. SFIOWatchlist.js:
   { cin: String(unique), company_name: String, investigation_type: String,
     investigation_status: String, order_date: Date, refreshed_at: Date }

9. SEBIDebarred.js:
   { entity_name: String, cin: String(indexed), pan: String(indexed),
     order_type: String, order_date: Date, expiry_date: Date, order_reference: String, refreshed_at: Date }

10. GeMBlacklist.js:
    { vendor_name: String, cin: String(indexed), gstin: String(indexed),
      blacklist_reason: String, portal: String, blacklist_date: Date, refreshed_at: Date }

After creating models, create api/scripts/setupIndexes.js that creates ALL indexes
from ARCHITECTURE.md Section 5.3 (including all local DB indexes).

Acceptance: node scripts/setupIndexes.js → "All indexes created successfully"
```

---

### PROMPT 1.2 — Redis Config + Cache Helpers

```
Read CONTEXT.md.

Create api/config/redis.js with:
1. Upstash Redis connection using REDIS_URL env var (ioredis)
2. Helper functions:
   - getCached(key): returns parsed JSON or null
   - setCached(key, value, ttlSeconds): stores JSON with TTL
   - deleteCached(key): deletes key
   - invalidateVendorCache(cin): deletes all vendor:{cin}:* keys
3. Bull.js queue factory: createQueue(name) with Upstash Redis config
4. Error handling: log Redis errors but DO NOT throw (cache misses are OK)
5. Export: { redisClient, getCached, setCached, deleteCached, invalidateVendorCache, createQueue }

Test: node -e "const {redisClient} = require('./config/redis'); redisClient.ping().then(v => console.log('Redis:', v))"
```

---

### PROMPT 1.3 — dataCollector.js (13 Sources)

```
Read CONTEXT.md and MVP_TECH_DOC.md Section 4.

Create api/services/dataCollector.js using the EXACT code from MVP_TECH_DOC.md Section 4.

Requirements:
- 13 DataSource classes (5 Sandbox + 4 free APIs + 4 scrapers)
- Plugin architecture (OCP — adding source = add class + register in DATA_SOURCES array)
- Promise.allSettled() — never let one source failure block others
- Redis caching for each source (TTLs from ARCHITECTURE.md Section 8.3)
- Required sources: SandboxMCASource, SandboxDirectorsSource (throw if unavailable)
- Partial report flag: sources_available < 7
- localDBChecker.checkAll() called after parallel fetch

Important:
- Import newsCollector from ./newsCollector (create placeholder if not built yet)
- Import localDBChecker from ./localDBChecker (create placeholder if not built yet)
- Import scrapers from ../scrapers/ (create placeholders)
- Each source class: properly handles null/404/timeout (returns null, never throws)
- Log every source: name, success/fail, duration_ms

Create placeholder files for all imports that don't exist yet.
Acceptance: No import errors on require('./dataCollector')
```

---

### PROMPT 1.4 — Scoring Engine

```
Read CONTEXT.md and PRD.md Section 3 (Feature 2: VHS Score).

Create api/services/scoringEngine.js.

WEIGHTS (NEVER CHANGE):
  Financial × 0.30 + Legal × 0.25 + GST × 0.20 + Directors × 0.15 + Market × 0.10

Implement ALL 5 sub-score calculators:
1. calculateFinancialScore(mca_data, charges_data):
   - Company age points, paid-up capital points, annual return filed, balance sheet, status
   - Return 0–100

2. calculateLegalScore(courts_data, nclt_data, sebi_data):
   - Start at 100, deduct per case type
   - Criminal IPC 420/fraud: -20 each (max -60)
   - Civil: -5 each (max -30)
   - NCLT/IBC active: -50 HARD
   - SEBI penalty: -30 HARD
   - Minimum: 0

3. calculateGSTScore(gst_data, gst_portal_data):
   - 12 months filed = 100, -15 each missed
   - GST cancelled = 0 (OVERRIDE), Suspended = 20 (OVERRIDE)
   - Prefer gst_data (Sandbox) over gst_portal_data (public API)

4. calculateDirectorScore(director_data, local_checks):
   - Start at 100
   - Any DIN in local_checks.disqualified_dins → 0 (IMMEDIATE OVERRIDE)
   - Director in 5+ companies: -10 per director
   - Director in struck-off company: -15 per instance

5. calculateMarketScore(news_rss, news_gdelt):
   - Start at 100
   - Negative article: -10 each (max -50)
   - Fraud/scam keyword: -25 each (max -75)
   - No news: 70 (neutral)
   - GDELT tone score: use as additional signal (tone < -5 = negative)

Implement checkHardDisqualifiers(rawData) — 6 conditions from CONTEXT.md

Export: { calculateVHS, calculateFinancialScore, calculateLegalScore, calculateGSTScore, calculateDirectorScore, calculateMarketScore, checkHardDisqualifiers }

Create api/__tests__/scoringEngine.test.js with:
- Test VHS = 0 when DIN disqualified
- Test VHS = 0 when company STRUCK_OFF
- Test VHS = 0 when NCLT CIRP active
- Test LOW RISK for clean company
- Test HIGH RISK for multiple issues
- Verify WEIGHTS add up to 1.0

Acceptance: npm test -- scoringEngine.test.js → all tests pass
```

---

### PROMPT 1.5 — Test CLI Script

```
Read CONTEXT.md.

Create api/scripts/testReport.js — CLI tool to test the full data pipeline:

Usage: node scripts/testReport.js {CIN} [GSTIN]
Example: node scripts/testReport.js L17110MH1973PLC019786

The script should:
1. Call collectVendorData(cin, gstin)
2. Log each source result (name: ✓ or ✗, duration)
3. Log sources_available count out of 13
4. Call calculateVHS(rawData)
5. Print a formatted summary:
   ════════════════════════════════════════
   VENDOR: {company_name}
   CIN: {cin}
   VHS SCORE: {score}/100 — {risk_level}
   RECOMMENDATION: {recommendation}
   ────────────────────────────────────────
   Financial Score: {n}/100
   Legal Score: {n}/100
   GST Score: {n}/100
   Director Score: {n}/100
   Market Score: {n}/100
   ────────────────────────────────────────
   Hard Flags: {list or "None"}
   Sources: {available}/13 active
   Partial Report: {yes/no}
   ════════════════════════════════════════
6. If any hard flags: print them in RED
7. Exit 0 on success, exit 1 on error

Acceptance: node scripts/testReport.js L17110MH1973PLC019786 → real data + VHS score displayed
```

---

## PHASE 1.5 — FREE DATA SOURCES
**Goal:** Add news collector, local DB crons, and all govt portal scrapers
**Time:** Week 2 | **Test:** testReport.js shows court cases + news for known companies

---

### PROMPT 1.6 — News Collector (Google News RSS + GDELT)

```
Read CONTEXT.md and MVP_TECH_DOC.md Section 8.

Create api/services/newsCollector.js using the EXACT code from MVP_TECH_DOC.md Section 8.

Requirements:
- fetchGoogleNewsRSS(companyName): 6 search queries, parse XML with fast-xml-parser
  Queries: fraud/scam, penalty/fine, default/insolvency, SEBI/MCA/RBI, court/lawsuit, latest news
  Max 5 articles per query → deduplicate by URL → max 20 total
  Rate limit: 500ms between queries
- fetchGDELT(companyName): GDELT v2 API, 6-month lookback, 10 articles
  Return tone scores (negative = concerning)
- Both functions: return { articles, source, count } or null on error
- Redis cache: news:{cin}:data with 6h TTL (news changes faster)

Also update GoogleNewsSource and GDELTSource in dataCollector.js to call these functions.

Acceptance:
  node -e "
  const nc = require('./services/newsCollector');
  nc.fetchGoogleNewsRSS('Satyam Computer').then(r => console.log('RSS:', r.count, 'articles'));
  nc.fetchGDELT('Satyam Computer').then(r => console.log('GDELT:', r?.count, 'articles'));
  "
  → Both return article counts
```

---

### PROMPT 1.7 — Local DB Seeds + Cron Jobs

```
Read CONTEXT.md and SYSTEM_DESIGN.md Section 5.

Create all 5 cron job files and the seed script:

1. api/cron/downloadDINCSV.js:
   - Download MCA21 disqualified DIN CSV from:
     https://www.mca.gov.in/content/mca/global/en/mca/master-data/MCA_mds_disqualified.html
     (or the direct CSV link from that page)
   - Parse with papaparse
   - Upsert into DisqualifiedDIN collection (din as unique key)
   - Log: "DIN DB updated: N records"

2. api/cron/downloadRBIDefaulters.js:
   - Download RBI wilful defaulter PDFs from:
     https://www.rbi.org.in/scripts/bs_viewcontent.aspx?Id=2760
   - Parse PDFs with pdf-parse to extract text
   - Regex-extract: borrower name, PAN (if present), outstanding amount
   - Upsert into WilfulDefaulter collection
   - Log: "RBI Defaulters updated: N records"

3. api/cron/refreshSFIOWatchlist.js:
   - Scrape SFIO investigation orders from MCA website
   - Use axios + cheerio (no CAPTCHA on this page)
   - Extract: company name, CIN, investigation type, status
   - Upsert into SFIOWatchlist
   - Log: "SFIO watchlist updated: N records"

4. api/cron/refreshSEBIOrders.js:
   - Scrape SEBI enforcement orders from:
     https://www.sebi.gov.in/enforcement/orders/
   - Use axios + cheerio
   - Extract: entity name, order type, order date, expiry date, reference
   - Try to find CIN/PAN from company name via Sandbox.co.in if available
   - Upsert into SEBIDebarred
   - Log: "SEBI orders updated: N records"

5. api/cron/refreshGeMBlacklist.js:
   - Scrape GeM debarred vendor list from https://gem.gov.in
   - Scrape CPPP suspended vendors from https://etenders.gov.in
   - Use ScrapingBee (process.env.SCRAPINGBEE_API_KEY) if needed
   - Upsert into GeMBlacklist
   - Log: "GeM blacklist updated: N records"

6. api/cron/refreshLocalDBs.js — Master controller:
   - Import all 5 cron functions
   - Register schedules with node-cron:
     * Daily 00:00: refreshSEBIOrders
     * Weekly Sunday 01:00: refreshSFIOWatchlist
     * Weekly Monday 02:00: refreshGeMBlacklist
     * Monthly 1st 03:00: downloadDINCSV
     * Quarterly Jan/Apr/Jul/Oct 1st 04:00: downloadRBIDefaulters
   - Export: { startAllCrons } (called from api/index.js on startup)

7. api/scripts/seedLocalDBs.js — One-time initial seed:
   - Runs all 5 functions sequentially with progress logging
   - Handles errors per-source (don't abort if one fails)
   - Prints final counts per collection

ERROR HANDLING for all cron files:
   - Catch all errors, log with Winston, never crash the process
   - Set Redis key cron:{name}_last_run on success
   - If download fails: keep old data (stale is better than empty)

Acceptance: node api/scripts/seedLocalDBs.js → all 5 collections populated with real data
```

---

### PROMPT 1.8 — eCourts + NCLT Scrapers

```
Read CONTEXT.md and ARCHITECTURE.md Section 7.5.

Create two scraper files:

1. api/scrapers/eCourts.js:

Functions to create:
- scrapeECourts(companyName): main function called by dataCollector

Strategy:
a. Primary: Use ScrapingBee to bypass CAPTCHA
   const { ScrapingBeeClient } = require('scrapingbee');
   const client = new ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
   Navigate to: https://ecourts.gov.in/ecourts_home/
   Search by respondent/petitioner name = companyName
   Extract each case row:
   - case_number, court_name, state, filing_year, section_ipc, status,
     petitioner, respondent, next_hearing

b. Fallback: Direct Puppeteer (may fail on CAPTCHA)
   Launch headless Chrome, same steps

c. If both fail: return { cases: [], source: 'ecourts', error: 'unavailable' }

Rate limiting: max 1 request per 5 seconds (Redis-throttled)
Cache: courts:{cin}:data, 48h TTL
Return: { cases: [...], count: N, source: 'ecourts' }

Important notes:
- Never throw — always return gracefully
- Empty results is valid: return { cases: [], count: 0 }
- Log each attempt + result

2. api/scrapers/nclt.js:

- scrapeNCLT(cin): check NCLT insolvency portal
- URL: https://ibbi.gov.in/en/processes (or nclt.gov.in)
- Search by company CIN or name
- Extract: case_type (CIRP/Liquidation), admission_date, IP_name, status
- Return: { cases: [], cirp_admitted: Boolean, source: 'nclt' }
- Use ScrapingBee if needed (less likely to have CAPTCHA than eCourts)
- Cache: nclt:{cin}:data, 48h TTL

Acceptance:
  const { scrapeECourts } = require('./scrapers/eCourts');
  scrapeECourts('Satyam Computer Services').then(r => console.log('Courts:', r.count, 'cases'));
  → Returns cases array (may be 0 if company name not exact)
```

---

### PROMPT 1.9 — SEBI + SFIO Scrapers + localDBChecker

```
Read CONTEXT.md.

Create two more scrapers and the local DB checker:

1. api/scrapers/sebi.js:
- scrapeSEBI(companyName, cin): check SEBI enforcement + SCORES
- Sources:
  a. SEBI enforcement orders: https://www.sebi.gov.in/enforcement/orders/
  b. SEBI SCORES complaints: https://scores.sebi.gov.in
- Use axios + cheerio (or ScrapingBee for JS-rendered pages)
- Extract: order_type, date, entity, penalty_amount, status
- Cross-reference with local sebi_debarred collection first (instant)
- Return: { orders: [], complaints_count: 0, active_debarment: Boolean, source: 'sebi' }
- Cache: sebi:{cin}:data, 24h TTL

2. api/scrapers/sfio.js:
- scrapeSFIO(cin): check SFIO + MCA investigation orders
- URL: https://www.mca.gov.in/content/mca/global/en/enquiry-inspection/inspection-orders.html
- Use axios + cheerio
- Cross-reference with local sfio_watchlist collection first (instant)
- Return: { investigations: [], active_investigation: Boolean, source: 'sfio' }

3. api/services/localDBChecker.js:
   Create using the EXACT code from MVP_TECH_DOC.md Section 7.

The 5 check functions:
- checkDINs(dins): query DisqualifiedDIN by din array
- checkRBI(cin): query WilfulDefaulter by cin
- checkSFIO(cin): query SFIOWatchlist by cin where status='active'
- checkSEBI(cin): query SEBIDebarred by cin where expiry_date > now OR null
- checkGeM(cin): query GeMBlacklist by cin

checkAll(cin, directors): runs all 5 in parallel with Promise.all

Important: All checks are instant (<10ms) — they only query local MongoDB,
no external API calls. This is the key advantage of the local DB layer.

Acceptance:
  const ldc = require('./services/localDBChecker');
  // Test with a known disqualified DIN (use MCA DIN CSV to find one)
  ldc.checkAll('L17110MH1973PLC019786', [{din: '12345678'}]).then(r => console.log(r));
  → Returns { disqualified_dins: [...], rbi_defaulter: false, ... }
```

---

### PROMPT 1.10 — Update Scoring Engine for All 13 Sources

```
Read CONTEXT.md.

Update api/services/scoringEngine.js to use all 13 sources.

Changes needed:

1. calculateLegalScore now receives ALL legal data sources:
   (courts_data, nclt_data, sebi_data, sfio_data, local_checks)
   - Add SFIO investigation to legal penalties: active SFIO = -40 pts HARD
   - Add GeM blacklist: -15 pts
   - NCLT CIRP check: use BOTH nclt_data.cirp_admitted AND local_checks.nclt_active

2. calculateDirectorScore now also uses:
   - local_checks.disqualified_dins (primary DIN check source)
   - sebi_data: director in SEBI debarment = -20 pts per director

3. calculateMarketScore now uses BOTH news sources:
   - news_rss.articles: existing logic
   - news_gdelt.articles: use tone score (< -5 = negative article, -10 pts each)
   - GDELT and RSS articles that overlap (same event) = count only once

4. checkHardDisqualifiers updated to use all 6 conditions:
   1. STRUCK_OFF (mca_data)
   2. Disqualified DIN (local_checks.disqualified_dins)
   3. NCLT CIRP (nclt_data.cirp_admitted OR local_checks.nclt_active)
   4. SFIO investigation (sfio_data.active_investigation OR local_checks.sfio_active)
   5. RBI defaulter (local_checks.rbi_defaulter)
   6. SEBI debarment (local_checks.sebi_debarred OR sebi_data.active_debarment)

5. Update confidence calculation:
   confidence = Math.round((sources_available / 13) * 100)
   Add confidence warning to result if < 54% (< 7 sources)

Update all test cases in scoringEngine.test.js to cover new logic.

Acceptance: npm test -- scoringEngine.test.js → all tests pass
```

---

## PHASE 2 — MVP PRODUCT
**Goal:** Working end-to-end product with payment, AI narrative, and PDF
**Time:** Weeks 4–6

---

### PROMPT 2.1 — FastAPI AI Service (Gemini)

```
Read CONTEXT.md.

Build the complete Python FastAPI AI service.

Files to create:

1. ai-service/schemas.py — Pydantic models:
   - ReportRequest: { cin, vendor_name, raw_data, vhs_score, vhs_breakdown, sector }
   - ReportResponse: { narrative, key_flags, recommendation, similar_cases, conditions }
   - KeyFlag: { severity, message }

2. ai-service/rag.py — FAISS vector store:
   - load_or_create_index(): load from indexes/ or create from data/case_studies/cases.json
   - retrieve_similar_cases(company_data, k=3): find similar fraud cases
   - Use Gemini embeddings: models/text-embedding-004
   - If FAISS index doesn't exist yet: create with dummy cases (build later)

3. ai-service/prompts.py — ALL system prompts:
   ANALYZE_PROMPT: Given VHS breakdown {vhs_breakdown}, identify top 5 risk factors.
   Return JSON: { risk_factors: [{ factor, severity, evidence, score_impact }] }

   NARRATE_PROMPT: Write a professional 800-word board-ready risk assessment narrative.
   Structure: Executive Summary → Financial Health → Legal Standing → GST Compliance →
   Director Integrity → Market Reputation → Conclusion + Recommendation

   Both prompts must be Gemini-compatible (no OpenAI-specific formatting).

4. ai-service/nodes/ — LangGraph node functions:
   - extract.py: { state } → { structured_data } (parse rawData cleanly)
   - retrieve.py: { structured_data } → { similar_cases } (FAISS lookup)
   - analyze.py: { structured_data } → { risk_factors } (Gemini call)
   - narrate.py: { risk_factors, similar_cases } → { narrative, key_flags } (Gemini call)

5. ai-service/graph.py — LangGraph pipeline:
   extract → retrieve → analyze → narrate
   State: TypedDict with all fields
   Use LLM = get_llm_client() from llm_client.py in analyze + narrate nodes

6. ai-service/main.py — FastAPI app:
   POST /generate-report: receive ReportRequest, run pipeline, return ReportResponse
   GET /health: return { status: "ok", llm_provider: os.getenv("LLM_PROVIDER") }
   Auth: check X-Service-Secret header matches FASTAPI_SECRET

Acceptance: uvicorn main:app --reload → POST /generate-report with test data → returns narrative
```

---

### PROMPT 2.2 — Report Worker (Bull.js Pipeline)

```
Read CONTEXT.md and SYSTEM_DESIGN.md Section 2.

Create worker/reportWorker.js — the 5-step report generation pipeline.

The worker processes jobs from the reportQueue.

Steps (in exact order):
1. Update Report status → "collecting"
   Fetch rawData = await collectVendorData(cin, gstin)
   Update Report: { raw_data, confidence, partial_report }

2. Update Report status → "scoring"
   vhsResult = scoringEngine.calculateVHS(rawData, sectorConfig)
   Update Report: { vhs_score, risk_level, recommendation, vhs_breakdown, hard_flags }

3. Update Report status → "generating"
   POST to FASTAPI_URL/generate-report (with FASTAPI_SECRET header)
   Retry up to 3× on failure (Gemini rate limits)
   Update Report: { narrative, key_flags, similar_cases }

4. Update Report status → "generating" (PDF)
   pdfBuffer = pdfGenerator.generate(fullReportData)
   s3Result = s3Service.upload(pdfBuffer, `reports/${reportId}.pdf`)
   Update Report: { pdf_url, pdf_s3_key, pdf_expires_at }

5. Update Report status → "complete"
   Update: { completed_at, status: "complete" }
   Log total duration

Error handling:
- Wrap entire pipeline in try/catch
- On any error: Update Report { status: "failed", error_message }
- Log with Winston + Sentry
- DO NOT rethrow (Bull handles retries separately)

Also create worker/index.js:
- Create reportQueue from redis config
- Register reportWorker as processor
- Import + start refreshLocalDBs crons
- Log: "Workers started. Crons registered."

Acceptance: Manually add job to queue → report status transitions through all 5 steps
```

---

### PROMPT 2.3 — PDF Generator + S3 + Report Template

```
Read CONTEXT.md.

Create 3 files:

1. api/services/pdfGenerator.js:
   - Uses Puppeteer to render report.html template to PDF
   - Inject all report data via template variables
   - PDF settings: A4, landscape=false, margins: 15mm each side
   - Returns Buffer
   - Error: log + throw (caller handles)

2. api/services/s3Service.js:
   - uploadReport(buffer, reportId): upload to S3 with key reports/{reportId}.pdf
   - getSignedUrl(s3Key, expiresIn=48*3600): generate pre-signed download URL
   - Uses AWS SDK v3 (not v2): @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner
   - Region: eu-north-1, Bucket: vendoriq-reports

3. api/templates/report.html:
   Professional PDF template including:
   - VHS gauge: SVG arc in the correct risk color (red/amber/green)
   - APPROVE/INVESTIGATE/REJECT banner (large, colored header)
   - Score breakdown: 5 horizontal bars
   - Key flags section with severity icons
   - AI Narrative: formatted text sections
   - GST filing grid: 12-month colored squares
   - Court cases table (if any)
   - Director table (DIN, name, designation, status)
   - Footer: "Generated by VendorIQ · Confidential · Report ID: {report_id}"
   - Style: professional, dark header, white body, brand blue accents
   - MUST be self-contained (inline CSS only — no external stylesheets)

Acceptance: node -e "
  const pg = require('./services/pdfGenerator');
  const testData = { vendor_name: 'Test Co', vhs_score: 72, risk_level: 'LOW', narrative: 'Test' };
  pg.generate(testData).then(buf => { require('fs').writeFileSync('/tmp/test.pdf', buf); console.log('PDF OK'); });
"
```

---

### PROMPT 2.4 — Express API Routes (Reports + Payments)

```
Read CONTEXT.md and ARCHITECTURE.md Section 6.

Create the core API routes:

1. api/routes/payments.js:
   POST /api/payments/create-order:
   - HARDCODE amount = 200000 (₹2,000) — never read from request body
   - Validate cin format (CIN regex from CONTEXT.md)
   - Create Razorpay order: { amount: 200000, currency: "INR", receipt: "rpt_{nanoid}" }
   - Return { order_id, amount: 200000, currency: "INR", key: RAZORPAY_KEY_ID }

   POST /api/payments/webhook:
   - CRITICAL: Use express.raw() body parser for this route only
   - Verify HMAC-SHA256 signature FIRST (see ARCHITECTURE.md Section 9.3)
   - Return 200 IMMEDIATELY before any DB ops
   - Handle payment.captured: create Report + enqueue reportWorker job
   - Handle subscription.charged, subscription.cancelled, payment.failed

   POST /api/payments/verify:
   - Verify Razorpay payment signature for client-side verification
   - Return { verified: true/false }

2. api/routes/reports.js:
   POST /api/reports/search:
   - Query param: q (company name or CIN)
   - Call Sandbox.co.in company search
   - Return top 5 matches with { cin, company_name, status, incorporation_date }

   GET /api/reports/:id:
   - Include client_id in query (tenant isolation!)
   - Return full report data
   - If partial_report=true: include warning in response

   GET /api/reports:
   - Auth required
   - Query params: page, limit (max 20), risk_level, date_from, date_to
   - Always filter by client_id
   - Return paginated list with total count

   GET /api/reports/shared/:token:
   - NO auth required — public shareable link
   - Query by shareable_token only (no client_id needed here)
   - Return report data (redact payment info)

All routes: Use standard success/error format from CONTEXT.md.
All authenticated routes: use authMiddleware from middleware/auth.js.

Acceptance:
  curl -X POST localhost:4000/api/payments/create-order -H "Content-Type: application/json" -d '{"cin":"L17110MH1973PLC019786"}'
  → Returns { order_id, amount: 200000, ... }
```

---

### PROMPT 2.5 — Next.js Frontend (F-0 through F-5)

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build frontend prompts F-0 through F-5 in sequence:

F-0: Global tokens, TopNav, SideNav, layout shell
  - globals.css: ALL design tokens from CONTEXT.md Design System section
  - TopNav: glassmorphic, sticky, links to /search and /login
  - SideNav: 240px sidebar, collapsible to icon-only on mobile
  - Root layout.tsx: cursor glow, Toaster (sonner), font imports (bunny.net CDN)

F-1: Hero section + animated search bar
  - Full-width dark background (#060910)
  - Animated gradient mesh (blue + purple, 8s slow movement)
  - Headline: "Vendor Risk Intelligence. In 5 Minutes."
  - Subheadline: "AI-powered due diligence. ₹2,000/report."
  - Search bar: glass-morphism, debounced, shows MCA21 typeahead
  - CTA: "Check a Vendor →" (brand blue, large)

F-2: Stats, features, pricing section, footer
  - Stats: "₹5,545 Cr Market | 0 AI Competitors | 85-88% Accuracy | 5 Minutes"
  - Pricing:
    * Starter: ₹2,000/report (pay-per-use)
    * Professional: ₹9,999/month (50 reports, 20 monitors) — "Most Popular" badge
    * Enterprise: ₹34,999/month (unlimited) — Annual = ₹27,999/mo shown with "20% off" tag
  - Competitor table: VendorIQ vs AuthBridge vs Manual

F-3: Search page (/search) + CompanyDetailCard + Razorpay payment
  - Full search interface
  - Company card: CIN, status, incorporation date
  - Payment: Razorpay checkout for ₹2,000 (200000 paise)
  - After payment: redirect to /processing/{reportId}

F-4: Processing page (/processing/[id])
  - 12-step animated loading (from MVP_TECH_DOC.md Section 9.2)
  - Blurred VHS preview that sharpens on complete
  - Poll every 3s, redirect to /report/{id} on complete

F-5: Report viewer (/report/[id])
  - VHS Gauge (GSAP animated, from MVP_TECH_DOC.md Section 9.1)
  - APPROVE/INVESTIGATE/REJECT banner
  - Score breakdown: 5 animated bars
  - AI Narrative sections
  - GST 12-month grid
  - Court cases accordion
  - Director table

All pages: Obsidian Terminal aesthetic — dark, glass cards, no light mode.
```

---

### PROMPT 2.6 — Deployment (render.yaml + vercel.json + GitHub Actions)

```
Read CONTEXT.md and SYSTEM_DESIGN.md Section 8.

Create deployment configuration:

1. render.yaml (from SYSTEM_DESIGN.md Section 8.1) — exact copy

2. vercel.json (from SYSTEM_DESIGN.md Section 8.2) — exact copy

3. .github/workflows/deploy.yml:
   - Trigger: push to main branch
   - Frontend: runs npm run build, deploys to Vercel
   - API + AI + Worker: push triggers auto-deploy via render.yaml
   - Steps: lint → type-check → test → deploy

4. ai-service/Dockerfile:
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   EXPOSE 8000
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

5. README.md — Quick start:
   git clone + docker-compose up + npm install + node seedLocalDBs.js + npm dev

Acceptance:
  npm run build → no errors
  docker build ai-service/ → builds successfully
```

---

## PHASE 3 — SUBSCRIPTIONS & MONITORING

### PROMPT 3.1 — Auth System (JWT + NextAuth + Google OAuth)
```
Build complete authentication:
- api/routes/auth.js: register + login + refresh (JWT)
- api/middleware/auth.js: JWT validation + requireTier() (from ARCHITECTURE.md Section 9.1)
- Frontend: login + register pages with Google OAuth
- NextAuth config: Google provider + credentials provider
- Subscription tier: starter (default), pro, enterprise
Note: GOOGLE_CLIENT_ID is MISSING — add placeholder with TODO note.
```

### PROMPT 3.2 — Razorpay Subscriptions

```
Create subscription billing for Professional and Enterprise plans:

Plan amounts (EXACT — use these constants from CONTEXT.md):
  PROFESSIONAL_PRICE_PAISE = 999900   // ₹9,999/month
  ENTERPRISE_PRICE_PAISE   = 3499900  // ₹34,999/month
  ENTERPRISE_ANNUAL_PAISE  = 2799900  // ₹27,999/month (billed annually)

1. api/scripts/createRazorpayPlans.js: Create the 3 Razorpay subscription plans
2. api/routes/subscriptions.js: CRUD for subscriptions + usage tracking
3. Frontend billing page: plan cards with current usage indicators
   - Professional: ₹9,999/month — 50 reports, 20 monitors
   - Enterprise: ₹34,999/month (or ₹27,999/mo annual) — unlimited
4. Webhook: subscription.charged → reports_used_this_month reset → 0

Acceptance:
  Razorpay TEST subscription created for ₹9,999/month (999900 paise)
  subscription.charged webhook → user.subscription_status = "active"
```

### PROMPT 3.3 — Vendor Monitoring + WhatsApp Alerts

```
Build real-time vendor monitoring:
1. worker/monitoringWorker.js: nightly cron (SYSTEM_DESIGN.md Section 4.3)
2. api/services/alertService.js: WhatsApp (360dialog) + email (SendGrid)
3. api/routes/monitors.js: CRUD for vendor monitors
4. Frontend monitoring page: vendor cards with mini VHS gauge

WhatsApp template (vendor_alert_v1):
  "⚠️ Vendor Alert: {vendor_name}
   Risk change detected: VHS {vhs_old} → {vhs_new}
   Change: {change_description}
   View report: {report_url}"

Note: WHATSAPP_API_KEY is MISSING — add graceful fallback (email only if WhatsApp not configured).
```

### PROMPT 3.4 — Client Dashboard

```
Build the full authenticated dashboard:
1. /dashboard — Overview: 4 stat cards + activity chart + alert feed
2. /reports — Reports list: sortable, filterable, paginated
3. /monitoring — Vendor monitoring grid
4. /bulk-audit — CSV upload (Phase 4 preview — show "coming soon" state)
5. /billing — Plan + usage + upgrade cards
6. /settings — Profile, notification preferences, API keys (Phase 4)

All pages: skeleton loading (no blank screens), Framer Motion stagger animations.
```

---

## PHASE 4 — ENTERPRISE FEATURES

### PROMPT 4.1 — Bulk Vendor Audit

```
Build bulk audit feature (Enterprise plan only):

1. api/routes/bulkAudit.js: CSV upload → validate CINs → queue N jobs
2. worker/bulkAuditWorker.js: 10 concurrent jobs, emit progress via Socket.io
3. api/services/excelGenerator.js: generate ranked Excel with all VHS scores
4. Frontend /bulk-audit: DropZone + progress feed + download link

Pricing: ₹2,000/vendor, minimum 50 vendors = ₹1,00,000 minimum
Validate: CSV must have CIN column, max 500 vendors per batch
```

### PROMPT 4.2 — CA Partner White-Label API

```
Build CA Partner program:

1. api/routes/apiKeys.js: generate/revoke API keys (Enterprise only)
2. api/routes/v1/report.js: POST /api/v1/report — public API for partners
3. api/middleware/apiKeyAuth.js: key lookup + rate limiting
4. White-label config: logo_url, primary_color, hide_vendoriq_branding
5. Frontend /settings → API Keys section

Pricing constants (EXACT):
  CA_SETUP_PAISE = 6900000    // ₹69,000 one-time
  CA_PER_REPORT_PAISE = 900   // ₹9/report (deducted from partner balance)
```

### PROMPT 4.3 — Director Network D3.js Graph

```
Build Phase 4: Director network visualization

1. api/services/directorGraph.js: build graph data from director_data
   - Nodes: company (this company + all companies where directors sit)
   - Edges: director connections
   - Risk coloring: struck-off companies = red nodes
2. Frontend DirectorNetworkGraph.tsx: D3.js force simulation
   - Lazy-loaded (only on expand)
   - Risk-colored nodes, spring physics
   - Tooltip on hover: company name + VHS score (if available)
   - Zoom + pan
```

---

## PHASE 5 — PRODUCTION HARDENING

### PROMPT 5.1 — Security Audit

```
Perform comprehensive security audit:

1. Verify ALL authenticated MongoDB queries include client_id (grep codebase)
2. Verify REPORT_PRICE_PAISE = 200000 is NEVER read from user input
3. Verify Razorpay webhook HMAC verified before ANY processing
4. Verify all API keys hashed (bcrypt) — never stored plaintext
5. Verify rate limiting on all public endpoints
6. Verify input validation (Zod schemas) on all POST endpoints
7. Check for SQL injection equivalent (NoSQL injection in MongoDB queries)
8. Verify Sentry scrubs API keys + secrets before sending
9. Generate 3 separate production secrets: JWT_SECRET, NEXTAUTH_SECRET, FASTAPI_SECRET

Output: security_audit_report.md with all findings + fixes applied
```

### PROMPT 5.2 — Performance + Load Testing

```
Optimize and load test:

1. Verify all 13 sources use Redis cache (no duplicate API calls)
2. Verify database indexes are created (run setupIndexes.js)
3. Add compression middleware to Express
4. Create k6 load test: 50 concurrent users, each generating a report
   Target: P95 < 5 minutes end-to-end

Performance requirements:
  VHS calculation: < 50ms
  API response (non-report): P95 < 500ms
  Report generation: P95 < 5 minutes
  Dashboard load: P95 < 2 seconds
```

### PROMPT 5.3 — Final Deployment Checklist

```
Production deployment:

1. node api/scripts/setupIndexes.js (MongoDB indexes)
2. node api/scripts/seedLocalDBs.js (all 5 local DBs populated)
3. node api/scripts/createRazorpayPlans.js (Pro + Enterprise plans created)
4. Run smoke test: node tests/smoke/smokeTest.js
5. Switch Razorpay from TEST mode to LIVE keys
6. Update NEXTAUTH_URL to production domain
7. Verify REPORT_PRICE_PAISE=200000 in production env
8. Switch Sentry to production environment
9. Run final testReport.js with a real company
10. Post on LinkedIn!
```

---

## 🔧 DEBUGGING PROMPTS

### When Something Breaks
```
Read CONTEXT.md.

Error in [file]:
[paste full error + stack trace]

1. Identify root cause in 2 sentences
2. Fix ONLY the broken code — don't refactor
3. Explain the cause + fix
4. List all files to change before touching any

NEVER change: VHS weights, REPORT_PRICE_PAISE, API contracts, DB schemas
```

### When a Scraper Fails
```
Read CONTEXT.md.

[scraper_name].js is returning null / failing.

1. Check if the government website URL has changed
2. Check if CAPTCHA is now blocking (try switching to ScrapingBee)
3. Check ScrapingBee credit balance (should have ~1000/month)
4. Check Redis cache — may be serving stale null
5. Fix the scraper — but DO NOT fail the entire report if this scraper fails
   (scrapers are non-required sources — return null gracefully)
```

### When Gemini Rate Limits
```
Read CONTEXT.md.

AI service is hitting rate limits.

Gemini free tier: 15 requests/minute.
With 13 reports/minute = 1 Gemini call each → already at limit.

Solutions:
1. Add 4-second delay between Gemini calls in narrate.py
2. Add retry logic: wait 60s on 429, retry 3×
3. Consider: LLM_PROVIDER=openai as fallback if OPENAI_API_KEY available
4. Check if LangGraph nodes are making multiple Gemini calls (analyze + narrate = 2 calls)

Do NOT change the pipeline architecture — only add delays/retries.
```

---

## 📅 WEEK-BY-WEEK EXECUTION SCHEDULE

| Week | Prompts | Milestone | Revenue |
|------|---------|-----------|---------|
| 1 | 0.1, 0.2, 1.1, 1.2 | Monorepo set up, DB connected | ₹0 |
| 2 | 1.3, 1.4, 1.5 | 13-source data pipeline + VHS working | ₹0 |
| 2b | 1.6, 1.7, 1.8, 1.9, 1.10 | All scrapers + crons + local DBs live | ₹0 |
| 3 | — | Validate accuracy: test 20 real companies, compare VHS to known outcomes | ₹0 |
| 4 | 2.1, 2.2 | AI service (Gemini) + report worker | ₹0 |
| 5 | 2.3, 2.4 | PDF generation + API routes live | ₹0 |
| 6 | 2.5, 2.6 | Frontend live + **first paid report** | **₹2,000** |
| 7 | 3.1, 3.2 | Auth + Pro/Enterprise subscriptions | ₹9,999 |
| 8 | 3.3 | Vendor monitoring + WhatsApp alerts | ₹25,000 |
| 9 | 3.4 | Full dashboard live | **₹75,000** |
| 10 | 4.1 | Bulk audit (min ₹1,00,000/batch) | ₹1,50,000 |
| 11 | 4.2, 4.3 | CA API (₹69K setup) + D3 graph | ₹2,50,000 |
| 12 | 5.1, 5.2, 5.3 | Production hardened + live | **₹3,00,000** |

---

*₹2,000/report · Pro ₹9,999/mo · Enterprise ₹34,999/mo · CA API ₹69K + ₹9/report*
*Gemini (GPT-ready) · 13 sources · 85-88% accuracy · Ship it.*

---
*End of Antigravity Prompt Guide v2.1*
