# VendorIQ — System Architecture Document
**Version:** 1.1 | **Principles:** SOLID + Clean Architecture
**Author:** Rishabh Pawar | **Date:** March 2026
**Changes from v1.0:** 13 data sources · Gemini LLM (GPT-swappable) · scrapers/ + cron/ layers · 5 new local DB models · ScrapingBee integration · Updated pricing

---

## 1. ARCHITECTURAL OVERVIEW

VendorIQ follows **Clean Architecture** with a **microservice-inspired monorepo**. Each layer has exactly one responsibility and communicates through defined interfaces only.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                 │
│   Next.js 14 (App Router) + Framer Motion + D3.js + Chart.js    │
│                     Vercel CDN                                   │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                            │
│             Express.js REST API (Node.js 20)                     │
│         Auth Middleware → Rate Limiter → Route Handler           │
│                       Render.com                                 │
└─────────────────────────────────────────────────────────────────┘
              │                              │
    ┌─────────▼──────────┐      ┌────────────▼──────────┐
    │   QUEUE LAYER       │      │    AI SERVICE LAYER    │
    │   Bull.js + Redis   │      │   FastAPI (Python)     │
    │   Background Jobs   │      │  LangGraph + Gemini    │
    │   Render.com Worker │      │  (GPT-swappable)       │
    └─────────┬──────────┘      └────────────┬──────────┘
              │                              │
              └──────────────┬───────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│  MongoDB Atlas (primary) │ Redis (cache/queue) │ AWS S3 (files)  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL DATA SOURCES (13 total)                    │
│  Sandbox.co.in (MCA/GST/Directors/Charges/PAN) ← PAID           │
│  GST Portal API │ Google News RSS │ GDELT │ BSE/NSE ← FREE API  │
│  eCourts │ NCLT │ SEBI │ SFIO ← FREE SCRAPERS (ScrapingBee)     │
│  Local MongoDB: DIN list │ RBI defaulters │ SEBI debarred │ GeM  │
│  Razorpay │ 360dialog (WhatsApp) │ SendGrid │ Gemini (AI)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. MONOREPO STRUCTURE

```
vendoriq/
├── CONTEXT.md                     ← ★ Read every session (agent context)
├── PRD.md
├── ARCHITECTURE.md
├── MVP_TECH_DOC.md
├── SYSTEM_DESIGN.md
├── docker-compose.yml             ← Local dev: MongoDB + Redis
├── .env.example                   ← All env vars (no real values)
├── .gitignore
├── render.yaml                    ← Production infra-as-code
└── README.md

├── frontend/                      ← Next.js 14, TypeScript, Tailwind
│   ├── app/
│   │   ├── layout.tsx             ← Root layout: fonts, providers, cursor glow
│   │   ├── globals.css            ← ALL design tokens + CSS variables
│   │   ├── page.tsx               ← Landing page (/)
│   │   ├── not-found.tsx
│   │   ├── (auth)/                ← Route group: login + register
│   │   ├── search/                ← Company search + payment initiation
│   │   ├── processing/[id]/       ← Report generation wait screen
│   │   ├── report/[id]/           ← Public report view (shareable)
│   │   └── (dashboard)/           ← Auth-protected dashboard shell
│   │       ├── dashboard/         ← Overview: stats, charts, alerts
│   │       ├── reports/           ← Reports list, filters, table
│   │       ├── monitoring/        ← Vendor monitoring grid
│   │       ├── bulk-audit/        ← CSV upload → progress → results
│   │       ├── billing/           ← Plan, usage, invoices
│   │       └── settings/          ← Profile, security, API keys
│   ├── components/
│   │   ├── ui/                    ← shadcn/ui + GlassCard, RiskBadge, Skeleton
│   │   ├── shared/                ← TopNav, SideNav, ProtectedRoute
│   │   ├── landing/               ← Hero, Stats, Features, Pricing, Footer
│   │   ├── search/                ← SearchInterface, CompanyDetailCard
│   │   ├── report/                ← VHSGauge, ScoreBreakdown, NarrativeSection, etc.
│   │   ├── processing/            ← ReportLoadingProgress (13-step animated)
│   │   ├── dashboard/             ← StatCard, AlertFeed, ReportsTable, etc.
│   │   └── bulk-audit/            ← DropZone, BulkProgress, BulkResults
│   ├── lib/
│   │   ├── api.ts                 ← Axios client with JWT interceptors
│   │   ├── auth.ts                ← NextAuth config
│   │   ├── utils.ts               ← cn(), formatDate(), formatCurrency()
│   │   └── riskStyles.ts          ← getRiskStyles(vhs) → colors, labels
│   ├── store/                     ← Zustand: reportStore, monitoringStore, authStore
│   ├── hooks/                     ← useCountUp, useReportPolling, useMousePosition
│   └── types/                     ← TypeScript interfaces (report, user, api)

├── api/                           ← Express.js REST API (Node.js 20)
│   ├── index.js                   ← Entry: Express app, middleware, routes
│   ├── routes/
│   │   ├── auth.js                ← /auth/register, /auth/login, /auth/refresh
│   │   ├── reports.js             ← /reports (CRUD + search)
│   │   ├── payments.js            ← /payments (Razorpay ₹2,000 + webhook)
│   │   ├── subscriptions.js       ← /subscriptions (₹9,999/₹34,999 plans)
│   │   ├── monitors.js            ← /monitors (CRUD + alert config)
│   │   ├── bulkAudit.js           ← /bulk-audit (CSV upload + progress)
│   │   ├── apiKeys.js             ← /keys (CA partner API key management)
│   │   └── v1/report.js           ← POST /v1/report (CA partner public API)
│   ├── services/
│   │   ├── dataCollector.js       ← ★ 13-source parallel fetcher (Promise.allSettled)
│   │   ├── scoringEngine.js       ← VHS calculation + all 6 hard disqualifiers
│   │   ├── newsCollector.js       ← Google News RSS (6 queries) + GDELT API
│   │   ├── localDBChecker.js      ← Instant local DB lookups (DIN, RBI, SEBI, SFIO, GeM)
│   │   ├── pdfGenerator.js        ← Puppeteer HTML→PDF + S3 upload
│   │   ├── s3Service.js           ← AWS S3 upload/download/signed URLs
│   │   ├── directorGraph.js       ← Director network graph data builder
│   │   ├── excelGenerator.js      ← Bulk audit Excel with ExcelJS
│   │   └── alertService.js        ← WhatsApp (360dialog) + email (SendGrid)
│   ├── scrapers/                  ← ★ Puppeteer + ScrapingBee govt portal scrapers
│   │   ├── eCourts.js             ← eCourts India: all state district courts
│   │   ├── nclt.js                ← NCLT: CIRP + liquidation proceedings
│   │   ├── sebi.js                ← SEBI: enforcement orders + SCORES complaints
│   │   └── sfio.js                ← SFIO + MCA investigation orders
│   ├── cron/                      ← ★ Scheduled local DB refresh jobs
│   │   ├── refreshLocalDBs.js     ← Master controller (registers all schedules)
│   │   ├── downloadDINCSV.js      ← Monthly 1st: MCA disqualified DINs → MongoDB
│   │   ├── downloadRBIDefaulters.js ← Quarterly: RBI wilful defaulter PDFs → MongoDB
│   │   ├── refreshSFIOWatchlist.js ← Weekly Sunday: SFIO watchlist → MongoDB
│   │   ├── refreshSEBIOrders.js   ← Daily midnight: SEBI enforcement → MongoDB
│   │   └── refreshGeMBlacklist.js ← Weekly: GeM + CPPP blacklist → MongoDB
│   ├── middleware/
│   │   ├── auth.js                ← JWT validation + subscription tier checker
│   │   ├── apiKeyAuth.js          ← API key auth for /v1/ routes
│   │   ├── rateLimiter.js         ← express-rate-limit (100 req/15min)
│   │   ├── tenantIsolation.js     ← Enforce client_id on all DB queries
│   │   └── validate.js            ← Zod request body validation
│   ├── models/
│   │   ├── User.js                ← Subscription tier, billing, usage tracking
│   │   ├── Report.js              ← Full report schema (VHS, narrative, PDF, etc.)
│   │   ├── VendorMonitor.js       ← Monitoring config + alert history
│   │   ├── BulkAudit.js           ← Bulk audit job tracking
│   │   ├── AuditResult.js         ← Individual result per CIN in bulk audit
│   │   ├── ApiKey.js              ← CA partner API keys (hashed, never plaintext)
│   │   ├── DisqualifiedDIN.js     ← ★ Local: MCA disqualified directors
│   │   ├── WilfulDefaulter.js     ← ★ Local: RBI wilful defaulters
│   │   ├── SFIOWatchlist.js       ← ★ Local: SFIO investigation companies
│   │   ├── SEBIDebarred.js        ← ★ Local: SEBI debarred entities
│   │   └── GeMBlacklist.js        ← ★ Local: GeM + CPPP blacklisted vendors
│   ├── config/
│   │   ├── database.js            ← MongoDB connection with retry + reconnect
│   │   ├── redis.js               ← Upstash Redis + Bull + cache helpers
│   │   ├── sentry.js              ← Sentry (scrubs API keys before sending)
│   │   ├── razorpayPlans.json     ← Generated by scripts/createRazorpayPlans.js
│   │   └── sectors/               ← 8 JSON sector configs + sectorRegistry.js
│   ├── templates/
│   │   └── report.html            ← Puppeteer PDF template (Handlebars vars)
│   ├── utils/
│   │   └── logger.js              ← Winston structured JSON logger
│   └── scripts/
│       ├── setupIndexes.js        ← One-time MongoDB index creation
│       ├── createRazorpayPlans.js ← One-time: create Pro + Enterprise plans
│       ├── seedLocalDBs.js        ← ★ One-time: download + seed all 5 local DBs
│       └── testReport.js          ← CLI: node testReport.js {CIN}

├── ai-service/                    ← Python FastAPI (AI/ML)
│   ├── main.py                    ← FastAPI entry: POST /generate-report, GET /health
│   ├── graph.py                   ← LangGraph: extract→retrieve→analyze→narrate
│   ├── rag.py                     ← FAISS similarity search (500 fraud case studies)
│   ├── prompts.py                 ← ALL system prompts (Gemini-tuned, GPT-compatible)
│   ├── schemas.py                 ← Pydantic: ReportRequest, ReportResponse, KeyFlag
│   ├── llm_client.py              ← ★ LLM abstraction (Gemini/GPT env-var switchable)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── nodes/
│   │   ├── extract.py             ← Parse rawData → structured fields
│   │   ├── retrieve.py            ← FAISS: find 3 similar fraud cases
│   │   ├── analyze.py             ← LLM: identify top 5 risk patterns
│   │   └── narrate.py             ← LLM: generate 800-word board-ready narrative
│   ├── data/case_studies/         ← 500 Indian fraud case study documents
│   └── indexes/                   ← FAISS vector index files

├── worker/
│   ├── index.js                   ← Worker entry: registers all Bull.js processors
│   ├── reportWorker.js            ← Single report: 5-step pipeline
│   ├── bulkAuditWorker.js         ← Bulk: N concurrent report jobs
│   ├── monitoringWorker.js        ← Nightly: re-check all monitored vendors
│   └── alertWorker.js             ← Send WhatsApp + email on vendor change

└── shared/                        ← TypeScript interfaces + constants
    ├── types/report.ts, scoring.ts, user.ts, api.ts
    └── constants/scoring.ts, errors.ts
```

---

## 3. SOLID PRINCIPLES — IMPLEMENTATION GUIDE

### 3.1 Single Responsibility Principle (SRP)

| File | Single Responsibility |
|------|-----------------------|
| `dataCollector.js` | Fetch raw data from all 13 external sources in parallel |
| `scoringEngine.js` | Calculate VHS score + sub-scores + hard disqualifiers |
| `newsCollector.js` | Fetch news via Google RSS + GDELT (never scoring) |
| `localDBChecker.js` | Instant lookups in local MongoDB collections only |
| `scrapers/eCourts.js` | Scrape eCourts India only |
| `scrapers/nclt.js` | Scrape NCLT insolvency portal only |
| `scrapers/sebi.js` | Scrape SEBI enforcement orders only |
| `scrapers/sfio.js` | Scrape SFIO watchlist only |
| `cron/downloadDINCSV.js` | Download + parse MCA DIN CSV only |
| `pdfGenerator.js` | Generate PDF from report data only |
| `alertService.js` | Send notifications via WhatsApp and email only |
| `llm_client.py` | LLM abstraction (routing to Gemini or GPT) only |

### 3.2 Open/Closed Principle (OCP)

Plugin architecture — adding a new data source requires ZERO changes to existing collector logic:

```javascript
// api/services/dataCollector.js

class DataSource {
  async fetch(cin) { throw new Error('Must implement fetch()'); }
  get name() { throw new Error('Must implement name'); }
  get required() { return false; }
}

// 13 registered sources:
const DATA_SOURCES = [
  // Paid — Sandbox.co.in
  new SandboxMCASource(),           // mca_data (required)
  new SandboxDirectorsSource(),     // director_data (required)
  new SandboxGSTSource(),           // gst_data
  new SandboxChargesSource(),       // charges_data
  new SandboxPANSource(),           // pan_data
  // Free APIs
  new GSTPortalSource(),            // gst_portal_data
  new GoogleNewsRSSSource(),        // news_rss
  new GDELTSource(),                // news_gdelt
  new BSENSESource(),               // exchange_data
  // Scrapers
  new ECourtsScraper(),             // courts_data
  new NCLTScraper(),                // nclt_data
  new SEBIScraper(),                // sebi_data
  new SFIOScraper(),                // sfio_data
  // ADD NEW SOURCE HERE: new EPFOSource() — zero other changes
];

async function collectVendorData(cin, gstin) {
  const results = await Promise.allSettled(
    DATA_SOURCES.map(source => source.fetch(cin, gstin))
  );
  const rawData = buildRawDataObject(results, DATA_SOURCES);
  rawData.sources_available = results.filter(r => r.status === 'fulfilled').length;
  if (rawData.sources_available < 7) {
    rawData.partial_report = true; // Warn user — less than 7 of 13
  }
  return rawData;
}
```

### 3.3 Liskov Substitution Principle (LSP)

All scrapers are substitutable. ScrapingBee and direct Puppeteer implement the same interface:

```javascript
class ECourtsScraper extends DataSource {
  get name() { return 'courts_data'; }
  async fetch(cin) {
    const companyName = await getNameFromCIN(cin);
    try {
      // Primary: ScrapingBee (CAPTCHA bypass)
      return await scrapeECourtsWithScrapingBee(companyName);
    } catch (err) {
      logger.warn('ScrapingBee failed, trying direct Puppeteer');
      // Fallback: direct Puppeteer (may fail on CAPTCHA)
      return await scrapeECourtsDirect(companyName);
    }
  }
}
```

### 3.4 Interface Segregation Principle (ISP)

```typescript
// shared/types/
interface IDataCollector  { collect(cin: string, gstin?: string): Promise<RawData>; }
interface IScorer         { calculate(data: RawData, sector?: SectorConfig): VHSScore; }
interface IPDFGenerator   { generate(report: Report, brand?: BrandConfig): Promise<Buffer>; }
interface IAlertService   { sendWhatsApp(phone: string, msg: AlertMsg): Promise<void>;
                            sendEmail(email: string, msg: AlertMsg): Promise<void>; }
interface ILocalChecker   { checkDIN(din: string): Promise<boolean>;
                            checkRBI(pan: string): Promise<boolean>;
                            checkSFIO(cin: string): Promise<boolean>;
                            checkSEBI(cin: string): Promise<boolean>;
                            checkGeM(cin: string): Promise<boolean>; }
```

### 3.5 Dependency Inversion Principle (DIP)

LLM is injected — swap Gemini for GPT with one env var change:

```python
# ai-service/llm_client.py
class LLMClient(ABC):
    @abstractmethod
    def complete(self, system: str, user: str, temperature: float = 0.2) -> str: pass

class GeminiClient(LLMClient):
    """Default. Free tier. gemini-1.5-flash."""
    def complete(self, system, user, temperature=0.2) -> str:
        import google.generativeai as genai
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        model = genai.GenerativeModel("gemini-1.5-flash")
        return model.generate_content(f"{system}\n\n{user}").text

class OpenAIClient(LLMClient):
    """Optional fallback. Requires OPENAI_API_KEY."""
    def complete(self, system, user, temperature=0.2) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        return client.chat.completions.create(
            model="gpt-4o-mini", temperature=temperature,
            messages=[{"role":"system","content":system},{"role":"user","content":user}]
        ).choices[0].message.content

def get_llm_client() -> LLMClient:
    return OpenAIClient() if os.getenv("LLM_PROVIDER") == "openai" else GeminiClient()

LLM = get_llm_client()  # Used everywhere in the pipeline — swap = change env var only
```

---

## 4. DATA FLOW DIAGRAMS

### 4.1 Single Report Generation Flow

```
User (Browser)
    │ POST /api/payments/create-order { cin, amount: 200000 }
    ▼
Express API
    │ Create Razorpay order
    │ Return { order_id, amount: 200000, currency: "INR" }
    ▼
User completes Razorpay payment → Webhook: POST /api/payments/webhook
    │ Verify HMAC-SHA256 signature
    │ Create Report { status: "pending", payment_id }
    │ Enqueue: reportQueue.add({ reportId, cin, gstin, clientId })
    │ Return 200 immediately (Razorpay timeout: 20s)

Worker (reportWorker.js)
    │
    ├─ STEP 1 — DATA COLLECTION (parallel, ~20-45s)
    │   ├─ Sandbox MCA ──────────────────┐
    │   ├─ Sandbox Directors ────────────┤
    │   ├─ Sandbox GST ─────────────────┤
    │   ├─ Sandbox Charges ─────────────┤
    │   ├─ Sandbox PAN ─────────────────┤
    │   ├─ GST Portal API ──────────────┤  Promise.allSettled()
    │   ├─ Google News RSS ─────────────┤  (all 13 in parallel)
    │   ├─ GDELT API ───────────────────┤
    │   ├─ BSE/NSE data ────────────────┤
    │   ├─ eCourts scraper ─────────────┤  (ScrapingBee CAPTCHA bypass)
    │   ├─ NCLT scraper ────────────────┤
    │   ├─ SEBI scraper ────────────────┤
    │   └─ SFIO scraper ────────────────┘
    │
    │   ├─ localDBChecker (instant — local MongoDB, <10ms)
    │   │   ├─ checkDIN(directors)     ← disqualified_dins collection
    │   │   ├─ checkRBI(pan)           ← wilful_defaulters collection
    │   │   ├─ checkSFIO(cin)          ← sfio_watchlist collection
    │   │   ├─ checkSEBI(cin)          ← sebi_debarred collection
    │   │   └─ checkGeM(cin)           ← gem_blacklist collection
    │   └─ Update: { status: "collecting" }
    │
    ├─ STEP 2 — VHS CALCULATION (<50ms, in-memory)
    │   scoringEngine.calculate(rawData, sectorConfig)
    │   → { vhs, breakdown: {financial, legal, gst, directors, market}, risk_level, hard_flags }
    │   Update: { status: "scoring", vhs_score }
    │
    ├─ STEP 3 — AI NARRATIVE (POST to FastAPI, ~20-40s)
    │   POST http://ai-service:8000/generate-report
    │   LangGraph: extract → retrieve(FAISS) → analyze(Gemini) → narrate(Gemini)
    │   → { narrative, key_flags, recommendation, similar_cases }
    │   Update: { status: "generating" }
    │
    ├─ STEP 4 — PDF GENERATION (Puppeteer, ~10-20s)
    │   pdfGenerator.generate(reportData) → Buffer
    │   s3Service.upload(buffer) → signed URL (24h expiry)
    │
    └─ STEP 5 — FINALIZE (~100ms)
        Update: { status: "complete", pdf_url, completed_at }
        Total time: P50 ~90s, P95 ~5min
```

### 4.2 Cron Schedule — Local DB Refresh

```
refreshLocalDBs.js — runs on startup and registers all schedules:

Daily midnight IST    → refreshSEBIOrders.js    → scrape SEBI enforcement orders
Weekly Sunday 1AM IST → refreshSFIOWatchlist.js  → scrape SFIO watchlist
Weekly Monday 2AM IST → refreshGeMBlacklist.js   → scrape GeM + CPPP blacklist
Monthly 1st 3AM IST   → downloadDINCSV.js        → download + parse MCA DIN CSV
Quarterly (Jan/Apr/Jul/Oct 1st) → downloadRBIDefaulters.js → parse RBI PDFs
```

### 4.3 Monitoring Flow

```
monitoringWorker.js (cron: daily 02:00 AM IST)
    │ Fetch all VendorMonitor where active=true (paginated, 50 at a time)
    │
    └─ For each vendor (10 concurrent):
         ├─ dataCollector.collect(cin) → fresh rawData
         ├─ localDBChecker.checkAll(cin, directors) → local flags
         ├─ Compute MD5 hash of combined data
         ├─ IF hash === last_hash → update last_checked, skip
         └─ IF hash !== last_hash:
               ├─ scoringEngine.calculate(rawData)
               ├─ detectChanges(last_snapshot, rawData) → changeLog
               ├─ Classify severity (CRITICAL/HIGH/MEDIUM/LOW)
               ├─ alertService.sendWhatsApp(phone, alertMsg)
               ├─ alertService.sendEmail(email, alertMsg)
               └─ Update VendorMonitor: new hash, new VHS, changeLog
```

---

## 5. DATABASE DESIGN

### 5.1 Core Collections

#### `users`
```javascript
{
  email: String (unique),
  name: String, company: String, phone: String,
  hashed_password: String, google_id: String,
  subscription_tier: String, // "starter" | "pro" | "enterprise"
  subscription_status: String, // "active" | "past_due" | "cancelled"
  razorpay_subscription_id: String,
  razorpay_customer_id: String,
  reports_used_this_month: Number,
  billing_cycle_start: Date,
  api_calls_this_month: Number,
  onboarding_sector: String,
  created_at: Date, updated_at: Date
}
Indexes: email (unique), razorpay_subscription_id
```

#### `reports`
```javascript
{
  report_id: String,      // "rpt_" + nanoid(10) — indexed unique
  client_id: ObjectId,    // ref: users._id — ALWAYS PRESENT (tenant isolation)
  vendor_cin: String, vendor_gstin: String, vendor_name: String, sector: String,
  status: String,         // "pending"|"collecting"|"scoring"|"generating"|"complete"|"failed"
  vhs_score: Number,      // 0-100
  risk_level: String,     // "HIGH"|"MEDIUM"|"LOW"
  recommendation: String, // "APPROVE"|"APPROVE_WITH_CONDITIONS"|"INVESTIGATE"|"REJECT"
  vhs_breakdown: { financial: N, legal: N, gst: N, directors: N, market: N },
  hard_flags: [{ code: String, severity: String, message: String }],
  confidence: Number,     // data_completeness % (sources_available / 13 × 100)
  raw_data: {
    mca_data, director_data, gst_data, charges_data, pan_data,
    gst_portal_data, news_rss, news_gdelt, exchange_data,
    courts_data, nclt_data, sebi_data, sfio_data,
    local_din_check, local_rbi_check, local_sfio_check, local_sebi_check, local_gem_check,
    sources_available: Number, partial_report: Boolean
  },
  narrative: String,
  key_flags: [{ severity, message }],
  similar_cases: [{ summary, outcome }],
  pdf_url: String, pdf_s3_key: String, pdf_expires_at: Date,
  shareable_token: String,
  payment_id: String, amount_charged: Number, // in paise
  created_at: Date, completed_at: Date,
  expires_at: Date        // TTL index: 90 days
}
Indexes: report_id (unique), client_id+created_at (compound), vendor_cin, shareable_token, expires_at (TTL)
```

#### `vendor_monitors`
```javascript
{
  client_id: ObjectId, vendor_cin: String, vendor_name: String,
  active: Boolean,
  last_checked: Date, last_data_hash: String, last_vhs: Number, last_snapshot: Object,
  alert_config: { whatsapp: Boolean, email: Boolean, min_vhs_drop: Number, severity_threshold: String },
  alert_history: [{ alert_id, sent_at, severity, change_description, vhs_before, vhs_after }],
  created_at: Date
}
Indexes: client_id+active (compound), active+last_checked (compound), vendor_cin
```

#### `bulk_audits`, `audit_results`, `api_keys`
— Unchanged from v1.0. See SYSTEM_DESIGN.md Section 3 for full schemas.

### 5.2 Local DB Collections (New — 5 collections)

#### `disqualified_dins`
```javascript
{
  din: String (unique, indexed),    // 8-digit DIN
  director_name: String,
  disqualification_date: Date,
  disqualification_section: String,
  company_cin: String,              // Company where disqualification occurred
  refreshed_at: Date                // When this record was last downloaded
}
Index: din (unique), director_name (text), refreshed_at
Source: MCA21 monthly CSV download
```

#### `wilful_defaulters`
```javascript
{
  borrower_name: String (indexed),
  pan: String (indexed),
  cin: String,
  bank_name: String,
  outstanding_amount: Number,       // In lakhs
  reported_date: Date,
  refreshed_at: Date
}
Index: pan, borrower_name (text), cin
Source: RBI quarterly PDFs (parsed with pdf-parse)
```

#### `sfio_watchlist`
```javascript
{
  cin: String (unique, indexed),
  company_name: String,
  investigation_type: String,       // "SFIO" | "MCA_ROC" | "EOW"
  investigation_status: String,     // "active" | "completed" | "pending_prosecution"
  order_date: Date,
  refreshed_at: Date
}
Index: cin (unique), company_name (text), investigation_status
Source: SFIO/MCA website weekly scrape
```

#### `sebi_debarred`
```javascript
{
  entity_name: String (indexed),
  cin: String,
  pan: String,
  order_type: String,               // "debarment" | "penalty" | "disgorgement"
  order_date: Date,
  expiry_date: Date,                // null if permanent
  order_reference: String,
  refreshed_at: Date
}
Index: entity_name (text), cin, pan, expiry_date
Source: SEBI enforcement orders daily scrape
```

#### `gem_blacklist`
```javascript
{
  vendor_name: String (indexed),
  cin: String,
  gstin: String,
  blacklist_reason: String,
  portal: String,                   // "GeM" | "CPPP"
  blacklist_date: Date,
  refreshed_at: Date
}
Index: cin, gstin, vendor_name (text)
Source: GeM + CPPP portal weekly scrape
```

### 5.3 MongoDB Index Strategy

```javascript
// Run: node api/scripts/setupIndexes.js

// Core indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.reports.createIndex({ report_id: 1 }, { unique: true })
db.reports.createIndex({ client_id: 1, created_at: -1 })   // compound — most queries
db.reports.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }) // TTL auto-delete
db.vendor_monitors.createIndex({ client_id: 1, active: 1 })
db.vendor_monitors.createIndex({ active: 1, last_checked: 1 })

// Local DB indexes
db.disqualified_dins.createIndex({ din: 1 }, { unique: true })
db.wilful_defaulters.createIndex({ pan: 1 })
db.wilful_defaulters.createIndex({ cin: 1 })
db.sfio_watchlist.createIndex({ cin: 1 }, { unique: true })
db.sebi_debarred.createIndex({ cin: 1 })
db.sebi_debarred.createIndex({ pan: 1 })
db.gem_blacklist.createIndex({ cin: 1 })
db.gem_blacklist.createIndex({ gstin: 1 })
```

---

## 6. API CONTRACT SPECIFICATION

### 6.1 Authentication
```
All authenticated endpoints: Authorization: Bearer {jwt_token}
JWT payload: { sub: "user_id", email, tier: "pro", iat, exp }
Token expiry: 7 days | Refresh: POST /api/auth/refresh
```

### 6.2 Core Endpoints
```
POST   /api/payments/create-order     Create Razorpay order (amount: 200000 paise = ₹2,000)
POST   /api/payments/verify           Verify payment signature + trigger report generation
POST   /api/payments/webhook          Razorpay webhook (HMAC-SHA256 verified)

POST   /api/reports/initiate          Post-payment: create report job
GET    /api/reports/:id               Poll status (every 3s during processing)
GET    /api/reports                   List user's reports (paginated)
POST   /api/reports/search            Company name → MCA21 typeahead (top 5)

POST   /api/subscriptions/create      Create Razorpay subscription (Pro/Enterprise)
GET    /api/subscriptions/status      Get plan + usage counters
POST   /api/subscriptions/cancel      Cancel subscription → downgrade to Starter

GET    /api/monitors                  List monitored vendors
POST   /api/monitors                  Add vendor to monitoring (Pro/Enterprise only)
DELETE /api/monitors/:id              Remove from monitoring
PATCH  /api/monitors/:id/config       Update alert thresholds

POST   /api/bulk-audit/start          Upload CSV → validate → enqueue N jobs
GET    /api/bulk-audit/:id/status     Get completion progress
GET    /api/bulk-audit/:id/download   Get S3 Excel download URL
GET    /api/bulk-audit                List past audits

POST   /api/keys/generate             Generate CA partner API key (Enterprise only)
GET    /api/keys/usage                Get API usage stats

POST   /api/v1/report                 Public API for CA partners (API key auth)
GET    /api/health                    System health (MongoDB + Redis + AI + scrapers)
```

### 6.3 Standard Error Response
```json
{ "success": false, "error": { "code": "REPORT_NOT_FOUND", "message": "..." }, "request_id": "req_xyz" }
```

### 6.4 Standard Success Response
```json
{ "success": true, "data": { /* payload */ }, "meta": { "request_id": "req_xyz", "timestamp": "ISO" } }
```

---

## 7. EXTERNAL SERVICE INTEGRATION

### 7.1 Sandbox.co.in API
```
Base URL: https://api.sandbox.co.in
Auth: x-api-key header
Key: SANDBOX_API_KEY (configured, live key)

Endpoints used:
GET /v2/corporate/company/{cin}                → MCA company master
GET /v2/corporate/company/{cin}/directors      → Directors + DIN data
GET /v2/business/gstin/{gstin}                 → GST 12-month filing history
GET /v2/corporate/company/{cin}/charges        → Loan/charge register
GET /v2/kyc/pan/{pan}                          → PAN verification

Error handling: 429 → wait 1s retry ×3 | 404 → return null | 500 → log + continue
Cache: Redis 48h TTL (vendor:{cin}:rawdata)
```

### 7.2 Google News RSS + GDELT (Free, No Key)
```
Google News RSS: https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en
Queries per company: 6
  1. "{company_name}" fraud OR scam
  2. "{company_name}" penalty OR fine OR order
  3. "{company_name}" default OR insolvency
  4. "{company_name}" regulatory OR SEBI OR MCA
  5. "{company_name}" case OR lawsuit OR court
  6. "{company_name}" latest news
Parse: fast-xml-parser | Deduplicate by URL | Max 20 articles per company
Cache: Redis 6h TTL

GDELT Project API: https://api.gdeltproject.org/api/v2/doc/doc?query={company_name}&mode=artlist&format=json
Returns: articles with tone scores, themes, source countries
Free: no key, no auth, rate limit: 1 req/sec
```

### 7.3 ScrapingBee (CAPTCHA bypass)
```
Dashboard: https://app.scrapingbee.com
Key: SCRAPINGBEE_API_KEY (configured)
Free tier: 1,000 credits/month
Credit usage:
  eCourts search: ~5 credits → ~200 searches/month
  NCLT search: ~3 credits → ~330 searches/month
  SEBI search: ~3 credits → ~330 searches/month

Usage in scrapers:
const { ScrapingBeeClient } = require('scrapingbee');
const client = new ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
const response = await client.get({ url: targetUrl, render_js: true });

Fallback: If credits exhausted → try direct Puppeteer → if CAPTCHA fails → return null
```

### 7.4 Google Gemini AI
```
Model: gemini-1.5-flash
Temperature: 0.2 (consistent, professional)
Max output: 2048 tokens (narrative ~800 words + JSON flags)
Cost: FREE (Gemini free tier — aistudio.google.com)
Rate limits: 15 requests/min (free tier) → handled by LangGraph node delays
Key: GEMINI_API_KEY (configured)

Fallback chain:
  Primary: Gemini 1.5 Flash
  If rate limited: Wait 4s + retry up to 3×
  If 3× failed: Switch to OllamaClient (Mistral 7B local — set FASTAPI_OLLAMA=true)

GPT swap (future): Set LLM_PROVIDER=openai + OPENAI_API_KEY → zero code changes
```

### 7.5 eCourts India Scraper
```
URL: https://ecourts.gov.in/ecourts_home/
Method: ScrapingBee (primary) → Puppeteer direct (fallback)
Rate limit: max 1 request/3 seconds
Cache: Redis 48h TTL (courts:{cin}:data)

Strategy:
1. Extract company name from CIN via Sandbox MCA
2. Search eCourts by respondent/petitioner name
3. Extract: case_number, court, state, filing_year, section, status
4. Return structured array (empty array if no results — not an error)

Error handling: Site down → return null | CAPTCHA → use ScrapingBee
```

### 7.6 Razorpay
```
Orders: Razorpay Orders API
  amount: 200000 (₹2,000 per report — HARDCODED, never from user input)
  currency: "INR"
Subscriptions:
  Professional: ₹9,999/month (plan_id from razorpayPlans.json)
  Enterprise: ₹34,999/month | Annual: ₹27,999/month

Webhooks to handle:
  payment.captured       → trigger report generation
  subscription.charged   → update user subscription_status = "active"
  subscription.cancelled → downgrade user to "starter"
  payment.failed         → send retry email
  refund.created         → update report status

Security: HMAC-SHA256 verify BEFORE any DB ops | Return 200 to Razorpay IMMEDIATELY
```

### 7.7 360dialog (WhatsApp Business API)
```
Base URL: https://waba.360dialog.io/v1
Auth: Bearer WHATSAPP_API_KEY
Template: "vendor_alert_v1"
Variables: {{vendor_name}}, {{change_type}}, {{vhs_old}}, {{vhs_new}}, {{report_url}}
Cost: ~₹1,500–₹3,000/month | Rate limit: 1,000 msg/sec
STOP keyword → auto-unsubscribe
Status: ⏳ Add WHATSAPP_API_KEY when Phase 3 starts
```

---

## 8. INFRASTRUCTURE & DEPLOYMENT

### 8.1 Environment Matrix

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | localhost:3000 | vendoriq.in (Vercel, Singapore) |
| API | localhost:4000 | api.vendoriq.in (Render.com, Singapore) |
| AI Service | localhost:8000 | ai.vendoriq.in (Render.com, Singapore) |
| Worker | localhost (process) | Render.com worker |
| MongoDB | Docker local | Atlas M0 (vandoriq cluster) → M10 when > 400MB |
| Redis | Docker local | Upstash (quiet-marmoset-50005) |

### 8.2 Complete Environment Variables

```bash
# ── SERVER ──────────────────────────────────────────────────
NODE_ENV=development
PORT=4000

# ── DATABASE ────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...
UPSTASH_REDIS_HOST=quiet-marmoset-50005.upstash.io
UPSTASH_REDIS_PASSWORD=...
UPSTASH_REDIS_REST_URL=https://quiet-marmoset-50005.upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# ── AUTHENTICATION ───────────────────────────────────────────
JWT_SECRET=...                    # 32+ chars, unique
NEXTAUTH_SECRET=...               # 32+ chars, different from JWT_SECRET
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...              # Phase 3
GOOGLE_CLIENT_SECRET=...          # Phase 3

# ── AI SERVICE ────────────────────────────────────────────────
LLM_PROVIDER=gemini               # "gemini" (default) or "openai" (optional)
GEMINI_API_KEY=...                # Free from aistudio.google.com
OPENAI_API_KEY=...                # Optional — only if LLM_PROVIDER=openai
FASTAPI_URL=http://localhost:8000
FASTAPI_SECRET=...                # 32+ chars, shared with ai-service

# ── EXTERNAL DATA APIS ────────────────────────────────────────
SANDBOX_API_KEY=...               # Sandbox.co.in (configured, live key)
NEWSAPI_KEY=...                   # Backup news source (optional)
SCRAPINGBEE_API_KEY=...           # ScrapingBee (configured — eCourts/NCLT/SEBI)

# ── PAYMENTS ─────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
REPORT_PRICE_PAISE=200000         # ₹2,000 — DO NOT CHANGE

# ── NOTIFICATIONS ────────────────────────────────────────────
WHATSAPP_API_KEY=...              # Phase 3 — 360dialog
WHATSAPP_SENDER_NUMBER=+91...     # Phase 3
SENDGRID_API_KEY=SG....           # Configured
EMAIL_FROM=reports@vendoriq.in    # Verify in SendGrid dashboard

# ── STORAGE (AWS S3) ─────────────────────────────────────────
AWS_ACCESS_KEY_ID=...             # Configured
AWS_SECRET_ACCESS_KEY=...        # Configured
AWS_S3_BUCKET=vendoriq-reports    # eu-north-1 (Stockholm — slightly higher latency for India)
AWS_REGION=eu-north-1             # Note: consider migrating to ap-south-1 before prod

# ── ERROR TRACKING ───────────────────────────────────────────
SENTRY_DSN=...                    # Configured

# ── FRONTEND (browser-exposed) ───────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 8.3 Redis Key Schema

```
vendor:{cin}:rawdata        → Cached full raw data (TTL: 48h)
vendor:{cin}:vhs            → Cached VHS score (TTL: 48h)
courts:{cin}:data           → Cached court cases (TTL: 48h)
nclt:{cin}:data             → Cached NCLT data (TTL: 48h)
sebi:{cin}:data             → Cached SEBI data (TTL: 48h)
news:{cin}:data             → Cached news (TTL: 6h — news changes faster)
director:{din}:companies    → Director cross-company data (TTL: 7d)
report:{id}:status          → Generation progress (TTL: 24h)
ratelimit:{ip}              → Request count (TTL: 15min)
session:{userId}            → User session (TTL: 7d)
cron:din_last_run           → Last DIN CSV download timestamp
cron:rbi_last_run           → Last RBI defaulter refresh timestamp
cron:sebi_last_run          → Last SEBI scrape timestamp
```

---

## 9. SECURITY ARCHITECTURE

### 9.1 Multi-Tenancy — NON-NEGOTIABLE RULE

```javascript
// EVERY route that returns user data must use:
const report = await Report.findOne({
  report_id: req.params.id,
  client_id: req.clientId  // ← ALWAYS include this
});
if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
```

### 9.2 API Key Security

```javascript
// Generate: hash + store prefix only
const rawKey = `viq_live_${nanoid(32)}`;
const hashedKey = await bcrypt.hash(rawKey, 12);
await ApiKey.create({ key_hash: hashedKey, key_prefix: rawKey.substring(0, 12) });
return rawKey; // Show ONCE only

// Verify: lookup prefix → compare hash
const apiKey = req.headers.authorization?.replace('Bearer ', '');
const keyRecord = await ApiKey.findOne({ key_prefix: apiKey.substring(0, 12) });
const isValid = await bcrypt.compare(apiKey, keyRecord.key_hash);
```

### 9.3 Razorpay Webhook Security

```javascript
// Always verify before processing — never trust raw body
const signature = req.headers['x-razorpay-signature'];
const body = req.body.toString();
const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(body).digest('hex');
if (signature !== expected) return res.status(400).json({ error: 'Invalid signature' });
res.json({ received: true }); // Respond IMMEDIATELY — Razorpay timeout is 20s
setImmediate(() => handleWebhookEvent(JSON.parse(body)));
```

---

## 10. PRE-PRODUCTION CHECKLIST

```
⚠️ Before switching Razorpay to LIVE mode:
□ Generate 3 separate secrets (JWT_SECRET, NEXTAUTH_SECRET, FASTAPI_SECRET)
   Current: all same value — INSECURE for production
□ Consider moving AWS S3 bucket from eu-north-1 to ap-south-1 (Mumbai)
   for lower latency for Indian users
□ Verify SendGrid sender email (reports@vendoriq.in)
□ Test all 5 cron jobs with seedLocalDBs.js first
□ Run security audit (PROMPT 5.1)
□ Run k6 load tests (PROMPT 5.2)
□ Monitor free tier limits: Gemini (15 req/min), ScrapingBee (1,000 credits/month)
□ Switch NEXTAUTH_URL from localhost to production domain
```

---

*End of Architecture Document v1.1*
*13 data sources · Gemini (GPT-ready) · SOLID throughout · Price: ₹2,000/report*
