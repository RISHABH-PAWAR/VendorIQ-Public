# VendorIQ — System Design Document
**Version:** 1.1 | **Author:** Rishabh Pawar | **Date:** March 2026
**Changes from v1.0:** 13 data sources · ScrapingBee scrapers · local DB cron refresh layer · Gemini AI · ₹2,000 pricing

---

## 1. HIGH-LEVEL SYSTEM DESIGN

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DNS: vendoriq.in                              │
│                    (Cloudflare — CDN + DDoS protection)               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
    │  vendoriq.in     │  │ api.vendoriq.in │  │ ai.vendoriq.in   │
    │  Next.js 14      │  │ Express.js API  │  │ Python FastAPI   │
    │  Vercel          │  │ Render.com      │  │ Render.com       │
    │  (Auto CDN)      │  │ (Auto-scale)    │  │ Gemini LLM       │
    └──────────────────┘  └────────┬────────┘  └──────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
         ┌──────────────┐  ┌───────────┐  ┌──────────────┐
         │ MongoDB Atlas │  │   Redis   │  │   AWS S3     │
         │   Primary DB  │  │  Cache +  │  │ Report PDFs  │
         │ + 5 Local DBs │  │   Queue   │  │   Exports    │
         └──────────────┘  └───────────┘  └──────────────┘
                    │
         ┌──────────────────┐   ┌─────────────────────┐
         │  Bull Worker      │   │  Cron Jobs (5)       │
         │  Render.com       │   │  DIN/RBI/SEBI/SFIO  │
         │  Background Jobs  │   │  GeM local DB sync   │
         └──────────────────┘   └─────────────────────┘
```

---

## 2. REQUEST LIFECYCLE — SINGLE VENDOR REPORT

### Step-by-Step Trace

```
Time 0ms:
User types "Tata Motors" in search box
  → Frontend: GET /api/reports/search?q=Tata+Motors
  → Express API → Sandbox.co.in company search
  → Returns top 5 CIN matches as typeahead dropdown
  → User selects: L28920MH1945PLC004520 (Tata Motors)
  → User clicks "Generate Report →"

Time 100ms:
Frontend: POST /api/payments/create-order
  Body: { cin: "L28920MH1945PLC004520", amount: 200000 }  ← ₹2,000
  → Express creates Razorpay order_id
  → Returns { order_id, amount: 200000, currency: "INR", key: "rzp_test_..." }
  → Frontend opens Razorpay checkout modal

Time ~5000ms (user completes payment):
Razorpay calls: POST /api/payments/webhook
  Body: { event: "payment.captured", payload: { ... } }
  → Verify HMAC-SHA256 with RAZORPAY_WEBHOOK_SECRET (IMMEDIATELY, before DB ops)
  → Create Report in MongoDB: { status: "pending", payment_id: "pay_xxx" }
  → reportQueue.add({ reportId, cin, gstin, clientId })
  → Return 200 to Razorpay (CRITICAL: must respond in 20s)

Time ~5500ms:
Frontend polls: GET /api/reports/{reportId} every 3 seconds
  → Returns { status: "pending" } → show 12-step animated loading screen

Time ~6000ms (Bull.js Worker picks up job):
Worker: reportWorker.js

  STEP 1 — DATA COLLECTION (parallel, ~20-45s)
  ┌─────────────────────────────────────────────────────────────┐
  │  Promise.allSettled([...all 13 sources])                    │
  │                                                             │
  │  Paid (Sandbox.co.in):          Free APIs (no key):         │
  │  ├─ MCA company master (3-8s)   ├─ GST portal API (1-3s)   │
  │  ├─ MCA directors (3-8s)        ├─ Google News RSS (2-5s)  │
  │  ├─ MCA GST history (3-8s)      ├─ GDELT API (2-5s)        │
  │  ├─ MCA charges (3-8s)          └─ BSE/NSE data (1-3s)     │
  │  └─ PAN verify (2-5s)                                       │
  │                                                             │
  │  Scrapers (Puppeteer+ScrapingBee):                          │
  │  ├─ eCourts India (5-20s)                                   │
  │  ├─ NCLT portal (5-15s)                                     │
  │  ├─ SEBI enforcement (5-15s)                                │
  │  └─ SFIO watchlist (5-15s)                                  │
  │                                                             │
  │  Local DB (instant, <10ms each):                            │
  │  ├─ DisqualifiedDIN check                                   │
  │  ├─ RBI Wilful Defaulter check                              │
  │  ├─ SFIO watchlist check                                    │
  │  ├─ SEBI debarred check                                     │
  │  └─ GeM blacklist check                                     │
  └─────────────────────────────────────────────────────────────┘
  UPDATE MongoDB: { status: "collecting", confidence: X% }
  
  Validation: If sources_available < 7 → mark partial_report = true
  Validation: If required sources (MCA, Directors) unavailable → fail job

  STEP 2 — VHS CALCULATION (in-memory, <50ms)
  scoringEngine.calculateVHS(rawData, sectorConfig)
  → { vhs: 72, breakdown: { financial:80, legal:90, gst:65, directors:100, market:60 },
      risk_level: "LOW", hard_flags: [] }
  UPDATE MongoDB: { status: "scoring", vhs_score: 72 }

  STEP 3 — AI NARRATIVE (POST to FastAPI, ~20-40s)
  POST http://ai-service:8000/generate-report
  Body: { cin, raw_data, vhs_score: 72 }

    FastAPI — LangGraph Pipeline:
    Node 1 (extract): Parse rawData → clean structured fields (~0.1s)
    Node 2 (retrieve): FAISS search → 3 similar Indian fraud cases (~0.5s)
    Node 3 (analyze): Gemini 1.5 Flash → top 5 risk patterns (~8s)
    Node 4 (narrate): Gemini 1.5 Flash → 800-word board-ready narrative (~15s)

    Returns: { narrative, key_flags, recommendation, similar_cases, conditions }
  UPDATE MongoDB: { status: "generating" }

  STEP 4 — PDF GENERATION (Puppeteer, ~10-20s)
  pdfGenerator.generate(reportData)
  → Load report.html template + inject all data + render in Puppeteer
  → PDF Buffer → s3Service.upload(buffer, `reports/${reportId}.pdf`)
  → Get signed URL (48h expiry for Starter, 7d for Pro/Enterprise)

  STEP 5 — FINALIZE (~100ms)
  UPDATE MongoDB: {
    status: "complete",
    vhs_score: 72, risk_level: "LOW",
    narrative: "...", key_flags: [...],
    pdf_url: "https://s3...", pdf_expires_at,
    completed_at: Date.now()
  }

Time ~120s (P50), ~5min (P95):
Frontend poll returns: { status: "complete" }
  → Redirect to /report/{reportId}
  → VHS gauge animates with GSAP (1.2s arc + color transition)
  → PDF download button appears
```

---

## 3. DATABASE SCHEMA — FULL DETAIL

### 3.1 MongoDB Index Strategy

```javascript
// Run once: node api/scripts/setupIndexes.js

// ── Core collections ──────────────────────────────────────
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ razorpay_subscription_id: 1 })
db.users.createIndex({ created_at: -1 })

db.reports.createIndex({ report_id: 1 }, { unique: true })
db.reports.createIndex({ client_id: 1, created_at: -1 })   // compound — most common query
db.reports.createIndex({ vendor_cin: 1 })
db.reports.createIndex({ shareable_token: 1 })
db.reports.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }) // Auto-delete after 90 days

db.vendor_monitors.createIndex({ client_id: 1, active: 1 })
db.vendor_monitors.createIndex({ active: 1, last_checked: 1 })
db.vendor_monitors.createIndex({ vendor_cin: 1 })

db.bulk_audits.createIndex({ audit_id: 1 }, { unique: true })
db.bulk_audits.createIndex({ client_id: 1, created_at: -1 })

db.audit_results.createIndex({ audit_id: 1, vhs_score: 1 })  // for sorting by risk
db.audit_results.createIndex({ client_id: 1 })

db.api_keys.createIndex({ key_prefix: 1 })
db.api_keys.createIndex({ partner_id: 1 })

// ── Local DB collections ──────────────────────────────────
db.disqualified_dins.createIndex({ din: 1 }, { unique: true })
db.disqualified_dins.createIndex({ director_name: 'text' })
db.disqualified_dins.createIndex({ refreshed_at: -1 })

db.wilful_defaulters.createIndex({ pan: 1 })
db.wilful_defaulters.createIndex({ cin: 1 })
db.wilful_defaulters.createIndex({ borrower_name: 'text' })

db.sfio_watchlist.createIndex({ cin: 1 }, { unique: true })
db.sfio_watchlist.createIndex({ investigation_status: 1 })

db.sebi_debarred.createIndex({ cin: 1 })
db.sebi_debarred.createIndex({ pan: 1 })
db.sebi_debarred.createIndex({ expiry_date: 1 })

db.gem_blacklist.createIndex({ cin: 1 })
db.gem_blacklist.createIndex({ gstin: 1 })
```

### 3.2 Report Mongoose Model
```javascript
// api/models/Report.js
const ReportSchema = new mongoose.Schema({
  report_id: { type: String, unique: true, default: () => `rpt_${nanoid(10)}` },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor_cin: { type: String, required: true },
  vendor_gstin: String,
  vendor_name: String,
  sector: { type: String, enum: ['manufacturing','pharma','fintech','realestate','it_services','fmcg','logistics','healthcare', null] },

  status: {
    type: String,
    enum: ['pending','collecting','scoring','generating','complete','failed'],
    default: 'pending'
  },
  error_message: String,

  // VHS Score
  vhs_score: { type: Number, min: 0, max: 100 },
  risk_level: { type: String, enum: ['HIGH','MEDIUM','LOW'] },
  recommendation: { type: String, enum: ['APPROVE','APPROVE_WITH_CONDITIONS','INVESTIGATE','REJECT'] },
  vhs_breakdown: { financial: Number, legal: Number, gst: Number, directors: Number, market: Number },
  hard_flags: [{ code: String, severity: String, message: String }],
  confidence: { type: Number, min: 0, max: 100 },  // sources_available / 13 * 100

  // Raw Data (all 13 sources + local checks)
  raw_data: {
    mca_data: Object, director_data: Object, gst_data: Object,
    charges_data: Object, pan_data: Object, gst_portal_data: Object,
    news_rss: Object, news_gdelt: Object, exchange_data: Object,
    courts_data: Object, nclt_data: Object, sebi_data: Object, sfio_data: Object,
    local_checks: {
      disqualified_dins: [String], rbi_defaulter: Boolean,
      sfio_active: Boolean, sebi_debarred: Boolean, gem_blacklisted: Boolean
    },
    sources_available: Number,  // How many of 13 returned data
    partial_report: Boolean     // true if < 7 sources
  },

  // AI Output
  narrative: String,
  key_flags: [{ severity: String, message: String }],
  similar_cases: [{ summary: String, outcome: String }],
  recommendation_reasons: [String],
  conditions: [String],

  // Delivery
  pdf_url: String,
  pdf_s3_key: String,
  pdf_expires_at: Date,
  shareable_token: { type: String, default: () => nanoid(20) },

  // Billing
  payment_id: String,
  amount_charged: { type: Number, default: 200000 },  // paise — ₹2,000

  created_at: { type: Date, default: Date.now },
  completed_at: Date,
  expires_at: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
});

// Tenant isolation helper — always use this
ReportSchema.query.byClient = function(clientId) {
  return this.where({ client_id: clientId });
};
```

---

## 4. REDIS CACHE STRATEGY

### 4.1 Cache Keys and TTL

| Cache Key Pattern | Data | TTL | Invalidation |
|-------------------|------|-----|--------------|
| `vendor:{cin}:rawdata` | Full 13-source raw data | 48h | On monitoring change |
| `vendor:{cin}:vhs` | Calculated VHS score | 48h | On rawdata change |
| `sandbox:mca:{cin}` | MCA company master | 48h | Manual reset |
| `sandbox:directors:{cin}` | Director + DIN data | 48h | Manual reset |
| `sandbox:gst:{gstin}` | GST 12-month history | 48h | Manual reset |
| `gst_portal:{gstin}` | GST portal data | 48h | Manual reset |
| `courts:{cin}:data` | eCourts case list | 48h | Manual reset |
| `nclt:{cin}:data` | NCLT proceedings | 48h | Manual reset |
| `sebi:{cin}:data` | SEBI enforcement | 24h | Daily scrape |
| `news:{cin}:data` | News articles | 6h | Auto-expire |
| `report:{id}:status` | Generation status | 24h | On complete |
| `ratelimit:{ip}` | Request count | 15min | Auto-expire |
| `session:{userId}` | User session | 7d | On logout |
| `cron:din_last_run` | Last DIN CSV download | — | On cron run |
| `cron:rbi_last_run` | Last RBI defaulter refresh | — | On cron run |
| `cron:sebi_last_run` | Last SEBI scrape | — | On cron run |

---

## 5. LOCAL DB CRON SCHEDULE

### 5.1 Schedule Overview
```
api/cron/refreshLocalDBs.js — Master controller, starts on worker boot:

DAILY (midnight IST, 00:00)
  → refreshSEBIOrders.js
    - Scrapes SEBI enforcement orders page
    - Upserts into sebi_debarred collection
    - Sets refreshed_at = now on all records
    - Logs: "SEBI refresh: N new orders, M updated"

WEEKLY (Sunday 01:00 IST)
  → refreshSFIOWatchlist.js
    - Scrapes MCA/SFIO investigation list
    - Upserts into sfio_watchlist collection

WEEKLY (Monday 02:00 IST)
  → refreshGeMBlacklist.js
    - Scrapes GeM debarred vendor list
    - Scrapes CPPP suspended vendors
    - Merges into gem_blacklist collection

MONTHLY (1st of month, 03:00 IST)
  → downloadDINCSV.js
    - Downloads MCA21 disqualified DIN CSV from MCA website
    - Parses with papaparse
    - Bulk-upserts into disqualified_dins collection
    - Logs count: "DIN DB: N total records"

QUARTERLY (1st of Jan/Apr/Jul/Oct, 04:00 IST)
  → downloadRBIDefaulters.js
    - Downloads RBI wilful defaulter PDFs (4 categories: >25L, >1Cr, etc.)
    - Parses each PDF with pdf-parse
    - Regex-extracts: borrower name, PAN, outstanding amount
    - Upserts into wilful_defaulters collection
```

### 5.2 seedLocalDBs.js (One-time initial seed)
```javascript
// api/scripts/seedLocalDBs.js
// Run ONCE before first report to populate all 5 local collections

async function seedAll() {
  logger.info('Starting initial local DB seed...');
  await downloadDINCSV();       // MCA disqualified directors
  await downloadRBIDefaulters(); // RBI wilful defaulters
  await refreshSFIOWatchlist(); // SFIO investigations
  await refreshSEBIOrders();    // SEBI enforcement orders
  await refreshGeMBlacklist();  // GeM + CPPP blacklist
  logger.info('All local DBs seeded successfully');
}

seedAll().catch(console.error);
// Run: node api/scripts/seedLocalDBs.js (takes ~5-15 minutes)
```

---

## 6. SECURITY IMPLEMENTATION

### 6.1 Multi-Tenancy Auth Middleware
```javascript
// api/middleware/auth.js
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: { code: 'MISSING_TOKEN' } });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.sub).select('-hashed_password');
  if (!user) return res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND' } });

  req.user = user;
  req.clientId = user._id.toString(); // Used for ALL DB queries — tenant isolation
  next();
}

function requireTier(minTier) {
  const levels = { starter: 0, pro: 1, enterprise: 2 };
  return (req, res, next) => {
    if ((levels[req.user.subscription_tier] ?? 0) < (levels[minTier] ?? 0)) {
      return res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_PLAN', message: `Requires ${minTier} plan`, upgrade_url: '/billing' }
      });
    }
    next();
  };
}
```

### 6.2 Razorpay Webhook Security
```javascript
// api/routes/payments.js
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Step 1: Verify IMMEDIATELY before any DB ops
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.body.toString()).digest('hex');
  if (signature !== expected) return res.status(400).json({ error: 'Invalid signature' });

  // Step 2: Respond IMMEDIATELY (Razorpay timeout: 20s)
  res.json({ received: true });

  // Step 3: Process asynchronously
  const event = JSON.parse(req.body.toString());
  setImmediate(() => handleWebhookEvent(event));
});
```

---

## 7. MONITORING & ALERTING

```javascript
// api/config/sentry.js
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.data?.api_key) event.request.data.api_key = '[REDACTED]';
    if (event.request?.data?.SANDBOX_API_KEY) event.request.data.SANDBOX_API_KEY = '[REDACTED]';
    return event;
  }
});

// Alert rules (Sentry dashboard):
// Rule 1: Error rate > 5 errors/min → email + Slack
// Rule 2: Any CRITICAL severity → immediate Slack
// Rule 3: Report generation > 10 min → warn Slack
// Rule 4: Scraper fail rate > 50% → immediate alert (govt portal may be down)
// Rule 5: Cron job failure → alert (local DBs become stale)
```

### Health Check Endpoint
```javascript
// GET /api/health
{
  "status": "healthy" | "degraded" | "unhealthy",
  "version": "1.1.0",
  "checks": {
    "mongodb": { "status": "up", "latency_ms": 12 },
    "redis": { "status": "up", "latency_ms": 8 },
    "ai_service": { "status": "up", "latency_ms": 180 },
    "sandbox_api": { "status": "up" },
    "gemini_api": { "status": "up" },
    "local_dbs": {
      "disqualified_dins": { "count": 12543, "last_refreshed": "2026-03-01" },
      "wilful_defaulters": { "count": 8234, "last_refreshed": "2026-01-01" },
      "sebi_debarred": { "count": 892, "last_refreshed": "2026-03-06" },
      "sfio_watchlist": { "count": 247, "last_refreshed": "2026-03-02" },
      "gem_blacklist": { "count": 1543, "last_refreshed": "2026-03-03" }
    }
  },
  "uptime_seconds": 86400,
  "timestamp": "2026-03-06T10:30:00Z"
}
```

---

## 8. DEPLOYMENT CONFIGURATION

### 8.1 `render.yaml`
```yaml
services:
  - type: web
    name: vendoriq-api
    env: node
    region: singapore
    plan: starter
    buildCommand: npm install
    startCommand: node api/index.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
      - fromGroup: vendoriq-secrets

  - type: web
    name: vendoriq-ai
    env: docker
    region: singapore
    plan: starter
    dockerfilePath: ai-service/Dockerfile
    healthCheckPath: /health
    envVars:
      - key: LLM_PROVIDER
        value: gemini
      - key: GEMINI_API_KEY
        fromGroup: vendoriq-secrets

  - type: worker
    name: vendoriq-worker
    env: node
    region: singapore
    plan: starter
    buildCommand: npm install
    startCommand: node worker/index.js
    envVars:
      - fromGroup: vendoriq-secrets

envVarGroups:
  - name: vendoriq-secrets
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: NEXTAUTH_SECRET
        sync: false
      - key: FASTAPI_SECRET
        sync: false
      - key: SANDBOX_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: SCRAPINGBEE_API_KEY
        sync: false
      - key: RAZORPAY_KEY_ID
        sync: false
      - key: RAZORPAY_KEY_SECRET
        sync: false
      - key: RAZORPAY_WEBHOOK_SECRET
        sync: false
      - key: REPORT_PRICE_PAISE
        value: "200000"
      - key: SENDGRID_API_KEY
        sync: false
      - key: AWS_ACCESS_KEY_ID
        sync: false
      - key: AWS_SECRET_ACCESS_KEY
        sync: false
      - key: AWS_S3_BUCKET
        value: vendoriq-reports
      - key: AWS_REGION
        value: eu-north-1
      - key: FASTAPI_URL
        value: https://vendoriq-ai.onrender.com
      - key: SENTRY_DSN
        sync: false
```

### 8.2 `vercel.json`
```json
{
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.vendoriq.in",
    "NEXT_PUBLIC_SOCKET_URL": "https://api.vendoriq.in"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

*End of System Design Document v1.1*
*13 sources · Gemini · ScrapingBee · ₹2,000/report*
