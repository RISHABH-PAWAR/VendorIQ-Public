# VendorIQ — MVP Technical Documentation
**Version:** 1.1 | **Phase:** MVP (Weeks 1–6) + Phase 1.5 (New data sources, Week 2)
**Author:** Rishabh Pawar | **Date:** March 2026
**Changes from v1.0:** ₹2,000 price · Gemini LLM · 13 data sources · ScrapingBee · new packages

---

## 1. MVP SCOPE (WEEKS 1–6)

The MVP delivers one complete, sellable product:
**"Enter any Indian company CIN → Pay ₹2,000 → Get an AI risk report PDF in 5 minutes"**

### MVP Included
- [ ] Data collection pipeline — **13 sources** (parallel, Promise.allSettled)
- [ ] VHS Score engine v1 — 5 sub-scores + 6 hard disqualifiers
- [ ] Local DB checks — DIN disqualified, RBI defaulters, SEBI debarred, SFIO, GeM
- [ ] LangGraph AI narrative generation — **Google Gemini 1.5 Flash** (GPT-swappable)
- [ ] PDF report generation (Puppeteer)
- [ ] Next.js frontend (landing + search + report view)
- [ ] Razorpay ₹2,000 payment gate (200,000 paise)
- [ ] Vercel + Render deployment
- [ ] MongoDB Atlas free tier

### MVP Excluded (Phase 3+)
- User accounts / subscriptions
- Monitoring / WhatsApp alerts
- Client dashboard
- Director network graph
- Bulk audit
- White-label API

---

## 2. COMPLETE TECH STACK

### 2.1 Frontend
| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| Framework | Next.js | 14.2.x | App Router + SSR |
| Language | TypeScript | 5.x | Type safety |
| UI Components | shadcn/ui | latest | Professional, customizable |
| Styling | Tailwind CSS | 3.x | Utility-first |
| Animations | Framer Motion | 11.x | Page transitions, lists |
| Additional Animations | GSAP | 3.x | VHS gauge arc animation |
| Charts | Recharts | 2.x | VHS trend, filing timeline |
| VHS Gauge | Custom SVG + GSAP | — | Animated arc gauge |
| Network Graph | D3.js | 7.x | Phase 4: director graph |
| State | Zustand | 4.x | Lightweight global state |
| PDF Preview | react-pdf | 7.x | In-browser PDF render |
| File Upload | react-dropzone | 14.x | Phase 4: CSV upload |
| Real-time | Socket.io-client | 4.x | Phase 4: bulk audit progress |
| Auth | NextAuth.js | 4.x | Phase 3: user accounts |
| HTTP Client | Axios | 1.x | API calls with interceptors |
| Forms | React Hook Form + Zod | — | Validated forms |
| Fonts | Cabinet Grotesk + Satoshi | CDN (bunny.net) | Premium typography |
| Icons | Lucide React | 0.371 | Consistent icon set |

### 2.2 Backend (Node.js API)
| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| Runtime | Node.js | 20 LTS | Modern APIs + performance |
| Framework | Express.js | 4.x | Familiar, fast |
| Validation | Zod | 3.x | Runtime validation |
| Auth | jsonwebtoken | 9.x | JWT generation/validation |
| Password | bcrypt | 5.x | API key hashing |
| Job Queue | Bull.js | 4.x | Redis-backed async jobs |
| Scheduling | node-cron | 3.x | Local DB refresh crons |
| PDF | Puppeteer | 22.x | Headless Chrome → PDF |
| Excel | ExcelJS | 4.x | Bulk audit output |
| Email | Nodemailer | 6.x | SMTP via SendGrid |
| HTTP | Axios | 1.x | External API calls |
| XML Parsing | fast-xml-parser | 4.x | **NEW: Google News RSS parsing** |
| PDF Parsing | pdf-parse | 1.x | **NEW: RBI defaulter PDF extraction** |
| HTML Scraping | cheerio | 1.x | **NEW: Structured HTML extraction** |
| Scraping | scrapingbee | 1.x | **NEW: CAPTCHA bypass for govt portals** |
| Logging | Winston | 3.x | Structured JSON logs |
| Monitoring | Sentry | 7.x | Error tracking |
| Security | Helmet.js | 7.x | HTTP security headers |
| Rate Limiting | express-rate-limit | 7.x | API throttling |
| ID Generation | nanoid | 5.x | Unique IDs (rpt_xxx, ba_xxx) |
| Testing | Jest + Supertest | — | Unit + integration tests |

### 2.3 AI Service (Python)
| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| Framework | FastAPI | 0.109.x | Async, auto-docs, fast |
| Language | Python | 3.11 | LangChain compatibility |
| AI Orchestration | LangGraph | 0.1.x | State machine pipelines |
| LLM Framework | LangChain | 0.1.x | Prompt templates, chains |
| **Primary LLM** | **Google Gemini 1.5 Flash** | — | **Free tier, fast, good quality** |
| Gemini SDK | google-generativeai | 0.5.x | **NEW: Direct Gemini API** |
| Gemini LangChain | langchain-google-genai | 1.0.x | **NEW: Gemini LangChain integration** |
| Fallback LLM | Ollama Mistral 7B | — | Local, free fallback |
| Optional LLM | OpenAI GPT-4o-mini | — | Set LLM_PROVIDER=openai |
| LangChain OpenAI | langchain-openai | 0.1.x | Keep for future GPT swap |
| **LLM Abstraction** | **llm_client.py** | — | **NEW: Gemini/GPT env-var switchable** |
| Vector DB (dev) | FAISS | 1.7.x | Local, no external service |
| Vector DB (prod) | Pinecone | — | When > 50 clients |
| Embeddings | Gemini text-embedding-004 | — | Free, good quality |
| Output Parsing | LangChain StructuredOutputParser | — | Force JSON output |
| Validation | Pydantic | 2.x | Request/response schemas |
| Testing | pytest | 7.x | Unit tests |

### 2.4 Infrastructure
| Component | Service | Free Tier | Paid When |
|-----------|---------|-----------|-----------|
| Frontend | Vercel | ✓ (Hobby) | > 100GB bandwidth |
| API | Render.com | ✓ (slow cold start) | > 750 hrs/month |
| AI Service | Render.com | ✓ | Same as above |
| Worker | Render.com | ✓ | Same |
| Database | MongoDB Atlas M0 | ✓ (512MB) | > 400MB → M10 |
| Cache/Queue | Upstash Redis | ✓ (10K cmds/day) | > 10K cmds/day |
| File Storage | AWS S3 eu-north-1 | — | ~₹100–₹500/month |
| Error Tracking | Sentry | ✓ (5K errors/mo) | > 5K errors |
| Scraping | ScrapingBee | ✓ (1,000 credits/mo) | > 1,000 credits |
| AI (LLM) | Gemini free tier | ✓ (15 req/min) | Switch to paid if rate limited |
| Domain | Namecheap/GoDaddy | — | ₹800/year |
| SSL | Let's Encrypt | ✓ | Free always |

---

## 3. PACKAGE.JSON FILES (EXACT DEPENDENCIES)

### 3.1 Frontend `/frontend/package.json`
```json
{
  "name": "vendoriq-frontend",
  "version": "1.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "5.4.5",
    "@types/node": "20.12.7",
    "@types/react": "18.3.1",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.3",
    "framer-motion": "11.1.7",
    "gsap": "3.12.5",
    "recharts": "2.12.4",
    "d3": "7.9.0",
    "@types/d3": "7.4.3",
    "zustand": "4.5.2",
    "axios": "1.6.8",
    "react-hook-form": "7.51.3",
    "zod": "3.23.6",
    "@hookform/resolvers": "3.3.4",
    "react-pdf": "7.7.1",
    "react-dropzone": "14.2.3",
    "socket.io-client": "4.7.5",
    "next-auth": "4.24.7",
    "lucide-react": "0.371.0",
    "clsx": "2.1.1",
    "tailwind-merge": "2.3.0",
    "class-variance-authority": "0.7.0",
    "@radix-ui/react-dialog": "1.0.5",
    "@radix-ui/react-dropdown-menu": "2.0.6",
    "@radix-ui/react-tabs": "1.0.4",
    "@radix-ui/react-progress": "1.0.3",
    "@radix-ui/react-tooltip": "1.0.7",
    "sonner": "1.4.41",
    "date-fns": "3.6.0",
    "nanoid": "5.0.7"
  }
}
```

### 3.2 API `/api/package.json`
```json
{
  "name": "vendoriq-api",
  "version": "1.1.0",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "4.19.2",
    "mongoose": "8.3.2",
    "bull": "4.12.2",
    "node-cron": "3.0.3",
    "puppeteer": "22.7.1",
    "exceljs": "4.4.0",
    "nodemailer": "6.9.13",
    "axios": "1.6.8",
    "zod": "3.23.6",
    "jsonwebtoken": "9.0.2",
    "bcrypt": "5.1.1",
    "helmet": "7.1.0",
    "express-rate-limit": "7.2.0",
    "cors": "2.8.5",
    "dotenv": "16.4.5",
    "winston": "3.13.0",
    "@sentry/node": "7.114.0",
    "nanoid": "5.0.7",
    "papaparse": "5.4.1",
    "socket.io": "4.7.5",
    "razorpay": "2.9.2",
    "sharp": "0.33.3",
    "cheerio": "1.0.0-rc.12",
    "fast-xml-parser": "4.3.6",
    "pdf-parse": "1.1.1",
    "scrapingbee": "1.6.0"
  },
  "devDependencies": {
    "nodemon": "3.1.0",
    "jest": "29.7.0",
    "supertest": "7.0.0",
    "@types/jest": "29.5.12"
  }
}
```

### 3.3 AI Service `/ai-service/requirements.txt`
```
fastapi==0.109.2
uvicorn[standard]==0.29.0
langchain==0.1.16
langchain-google-genai==1.0.3
langchain-openai==0.1.3
langchain-community==0.0.32
langgraph==0.0.55
google-generativeai==0.5.4
openai==1.23.2
faiss-cpu==1.8.0
python-dotenv==1.0.1
pydantic==2.6.4
httpx==0.27.0
pytest==8.1.1
pytest-asyncio==0.23.6
tiktoken==0.6.0
numpy==1.26.4
```

---

## 4. DATA COLLECTION SERVICE

### `/api/services/dataCollector.js` (13 sources)
```javascript
const axios = require('axios');
const { redisClient, getCached, setCached } = require('../config/redis');
const newsCollector = require('./newsCollector');
const localDBChecker = require('./localDBChecker');
const { scrapeECourts } = require('../scrapers/eCourts');
const { scrapeNCLT } = require('../scrapers/nclt');
const { scrapeSEBI } = require('../scrapers/sebi');
const { scrapeSFIO } = require('../scrapers/sfio');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════
// SOLID: Single Responsibility — ONLY fetches raw data
// SOLID: Open/Closed — Add new source by extending DATA_SOURCES array
// ═══════════════════════════════════════════════════════════

class DataSource {
  async fetch(cin, gstin) { throw new Error('Must implement fetch()'); }
  get name() { throw new Error('Must implement name'); }
  get required() { return false; }
}

// ── PAID: Sandbox.co.in ──────────────────────────────────────
class SandboxMCASource extends DataSource {
  get name() { return 'mca_data'; }
  get required() { return true; } // Required — no MCA data = can't generate report
  async fetch(cin) {
    const cached = await getCached(`sandbox:mca:${cin}`);
    if (cached) return cached;
    const res = await axios.get(`https://api.sandbox.co.in/v2/corporate/company/${cin}`, {
      headers: { 'x-api-key': process.env.SANDBOX_API_KEY }
    });
    await setCached(`sandbox:mca:${cin}`, res.data.data, 48 * 3600);
    return res.data.data;
  }
}

class SandboxDirectorsSource extends DataSource {
  get name() { return 'director_data'; }
  get required() { return true; }
  async fetch(cin) {
    const cached = await getCached(`sandbox:directors:${cin}`);
    if (cached) return cached;
    const res = await axios.get(`https://api.sandbox.co.in/v2/corporate/company/${cin}/directors`, {
      headers: { 'x-api-key': process.env.SANDBOX_API_KEY }
    });
    await setCached(`sandbox:directors:${cin}`, res.data.data, 48 * 3600);
    return res.data.data;
  }
}

class SandboxGSTSource extends DataSource {
  get name() { return 'gst_data'; }
  async fetch(cin, gstin) {
    if (!gstin) return null;
    const cached = await getCached(`sandbox:gst:${gstin}`);
    if (cached) return cached;
    const res = await axios.get(`https://api.sandbox.co.in/v2/business/gstin/${gstin}`, {
      headers: { 'x-api-key': process.env.SANDBOX_API_KEY }
    });
    await setCached(`sandbox:gst:${gstin}`, res.data.data, 48 * 3600);
    return res.data.data;
  }
}

class SandboxChargesSource extends DataSource {
  get name() { return 'charges_data'; }
  async fetch(cin) {
    const res = await axios.get(`https://api.sandbox.co.in/v2/corporate/company/${cin}/charges`, {
      headers: { 'x-api-key': process.env.SANDBOX_API_KEY }
    });
    return res.data.data;
  }
}

class SandboxPANSource extends DataSource {
  get name() { return 'pan_data'; }
  async fetch(cin) {
    // Extract PAN from company master if available
    const mcaCached = await getCached(`sandbox:mca:${cin}`);
    if (!mcaCached?.pan) return null;
    const res = await axios.get(`https://api.sandbox.co.in/v2/kyc/pan/${mcaCached.pan}`, {
      headers: { 'x-api-key': process.env.SANDBOX_API_KEY }
    });
    return res.data.data;
  }
}

// ── FREE APIs ────────────────────────────────────────────────
class GSTPortalSource extends DataSource {
  get name() { return 'gst_portal_data'; }
  async fetch(cin, gstin) {
    if (!gstin) return null;
    const cached = await getCached(`gst_portal:${gstin}`);
    if (cached) return cached;
    const res = await axios.get(`https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=${gstin}`);
    await setCached(`gst_portal:${gstin}`, res.data, 48 * 3600);
    return res.data;
  }
}

class GoogleNewsSource extends DataSource {
  get name() { return 'news_rss'; }
  async fetch(cin) {
    const name = await getCompanyNameFromCIN(cin);
    return await newsCollector.fetchGoogleNewsRSS(name);
  }
}

class GDELTSource extends DataSource {
  get name() { return 'news_gdelt'; }
  async fetch(cin) {
    const name = await getCompanyNameFromCIN(cin);
    return await newsCollector.fetchGDELT(name);
  }
}

class BSENSESource extends DataSource {
  get name() { return 'exchange_data'; }
  async fetch(cin) {
    // Check if company is listed on BSE/NSE
    return await fetchBSENSEData(cin);
  }
}

// ── FREE SCRAPERS ────────────────────────────────────────────
class ECourtsScraper extends DataSource {
  get name() { return 'courts_data'; }
  async fetch(cin) {
    const name = await getCompanyNameFromCIN(cin);
    return await scrapeECourts(name);
  }
}

class NCLTScraper extends DataSource {
  get name() { return 'nclt_data'; }
  async fetch(cin) {
    return await scrapeNCLT(cin);
  }
}

class SEBIScraper extends DataSource {
  get name() { return 'sebi_data'; }
  async fetch(cin) {
    const name = await getCompanyNameFromCIN(cin);
    return await scrapeSEBI(name, cin);
  }
}

class SFIOScraper extends DataSource {
  get name() { return 'sfio_data'; }
  async fetch(cin) {
    return await scrapeSFIO(cin);
  }
}

// ── REGISTERED SOURCES ───────────────────────────────────────
const DATA_SOURCES = [
  new SandboxMCASource(),
  new SandboxDirectorsSource(),
  new SandboxGSTSource(),
  new SandboxChargesSource(),
  new SandboxPANSource(),
  new GSTPortalSource(),
  new GoogleNewsSource(),
  new GDELTSource(),
  new BSENSESource(),
  new ECourtsScraper(),
  new NCLTScraper(),
  new SEBIScraper(),
  new SFIOScraper(),
];

// ── MAIN COLLECTOR ───────────────────────────────────────────
async function collectVendorData(cin, gstin = null) {
  logger.info('Starting data collection', { cin, gstin, sources: DATA_SOURCES.length });

  // Check full cache first (avoid re-fetching if recently done)
  const fullCache = await getCached(`vendor:${cin}:rawdata`);
  if (fullCache) {
    logger.info('Returning cached raw data', { cin });
    return fullCache;
  }

  // Fetch all 13 sources in parallel
  const results = await Promise.allSettled(
    DATA_SOURCES.map(source => {
      return source.fetch(cin, gstin).catch(err => {
        logger.error(`Source ${source.name} failed`, { cin, error: err.message });
        return null;
      });
    })
  );

  // Build rawData object
  const rawData = {};
  let availableCount = 0;
  DATA_SOURCES.forEach((source, i) => {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value !== null) {
      rawData[source.name] = result.value;
      availableCount++;
    } else {
      rawData[source.name] = null;
    }
  });

  // Add local DB checks (instant — no network call)
  const directors = rawData.director_data?.directors || [];
  rawData.local_checks = await localDBChecker.checkAll(cin, directors);

  rawData.sources_available = availableCount;
  rawData.partial_report = availableCount < 7; // Warn if < 7 of 13

  // Validate required sources
  const missingRequired = DATA_SOURCES
    .filter(s => s.required)
    .filter(s => !rawData[s.name]);
  if (missingRequired.length > 0) {
    throw new Error(`Required sources unavailable: ${missingRequired.map(s => s.name).join(', ')}`);
  }

  // Cache full result
  await setCached(`vendor:${cin}:rawdata`, rawData, 48 * 3600);
  logger.info('Data collection complete', { cin, sources: availableCount, partial: rawData.partial_report });

  return rawData;
}

module.exports = { collectVendorData };
```

---

## 5. VHS SCORING ENGINE

### `/api/services/scoringEngine.js`
Key logic — weights and disqualifiers NEVER change:

```javascript
const WEIGHTS = { financial: 0.30, legal: 0.25, gst: 0.20, directors: 0.15, market: 0.10 };

async function calculateVHS(rawData, sectorConfig = null) {
  const scores = {
    financial: calculateFinancialScore(rawData.mca_data),
    legal: calculateLegalScore(rawData.courts_data, rawData.nclt_data, rawData.sebi_data),
    gst: calculateGSTScore(rawData.gst_data || rawData.gst_portal_data),
    directors: calculateDirectorScore(rawData.director_data, rawData.local_checks),
    market: calculateMarketScore(rawData.news_rss, rawData.news_gdelt)
  };

  // Apply sector weightings if configured
  const weights = sectorConfig ? mergeSectorWeights(WEIGHTS, sectorConfig.weights) : WEIGHTS;

  // Check hard disqualifiers BEFORE calculating composite score
  const hardFlags = checkHardDisqualifiers(rawData);
  if (hardFlags.length > 0) {
    return { vhs: 0, breakdown: scores, risk_level: 'HIGH', recommendation: 'REJECT', hard_flags: hardFlags };
  }

  const vhs = Math.round(
    scores.financial * weights.financial +
    scores.legal * weights.legal +
    scores.gst * weights.gst +
    scores.directors * weights.directors +
    scores.market * weights.market
  );

  return {
    vhs: Math.min(100, Math.max(0, vhs)),
    breakdown: scores,
    risk_level: vhs >= 66 ? 'LOW' : vhs >= 41 ? 'MEDIUM' : 'HIGH',
    recommendation: vhs >= 66 ? 'APPROVE' : vhs >= 41 ? 'INVESTIGATE' : 'REJECT',
    hard_flags: []
  };
}

function checkHardDisqualifiers(rawData) {
  const flags = [];
  // 1. Company struck off
  if (rawData.mca_data?.company_status === 'STRUCK_OFF')
    flags.push({ code: 'STRUCK_OFF', severity: 'CRITICAL', message: 'Company struck off by MCA' });
  // 2. Disqualified DIN
  const disqualified = rawData.local_checks?.disqualified_dins || [];
  if (disqualified.length > 0)
    flags.push({ code: 'DISQUALIFIED_DIN', severity: 'CRITICAL', message: `Director(s) have disqualified DIN: ${disqualified.join(', ')}` });
  // 3. NCLT CIRP admitted
  if (rawData.nclt_data?.cirp_admitted === true || rawData.local_checks?.nclt_active)
    flags.push({ code: 'NCLT_CIRP', severity: 'CRITICAL', message: 'Active NCLT CIRP proceedings' });
  // 4. SFIO active investigation
  if (rawData.sfio_data?.active_investigation || rawData.local_checks?.sfio_active)
    flags.push({ code: 'SFIO_INVESTIGATION', severity: 'CRITICAL', message: 'Active SFIO investigation' });
  // 5. RBI wilful defaulter
  if (rawData.local_checks?.rbi_defaulter)
    flags.push({ code: 'RBI_DEFAULTER', severity: 'CRITICAL', message: 'Listed in RBI Wilful Defaulters' });
  // 6. SEBI debarment active
  if (rawData.local_checks?.sebi_debarred || rawData.sebi_data?.active_debarment)
    flags.push({ code: 'SEBI_DEBARRED', severity: 'CRITICAL', message: 'Active SEBI debarment order' });
  return flags;
}
```

---

## 6. LLM ABSTRACTION LAYER

### `/ai-service/llm_client.py`
```python
import os
from abc import ABC, abstractmethod

class LLMClient(ABC):
    @abstractmethod
    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        pass

class GeminiClient(LLMClient):
    """Default — Google Gemini 1.5 Flash. Free tier. 15 req/min."""
    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"temperature": 0.2, "max_output_tokens": 2048}
        )

    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        prompt = f"{system}\n\n{user}"
        response = self.model.generate_content(prompt)
        return response.text

class OpenAIClient(LLMClient):
    """Optional. Requires LLM_PROVIDER=openai + OPENAI_API_KEY."""
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        response = self.client.chat.completions.create(
            model="gpt-4o-mini", temperature=temperature, max_tokens=1000,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}]
        )
        return response.choices[0].message.content

def get_llm_client() -> LLMClient:
    """Switch LLM by changing LLM_PROVIDER env var only. Zero code changes."""
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    if provider == "openai":
        return OpenAIClient()
    return GeminiClient()

LLM = get_llm_client()  # Import this in all nodes
```

---

## 7. LOCAL DB CHECKER

### `/api/services/localDBChecker.js`
```javascript
// ═══════════════════════════════════════════════════════════
// SOLID: Single Responsibility — ONLY queries local MongoDB collections
// These are instant (<10ms) — no network call, no API cost
// Collections are refreshed by cron jobs in api/cron/
// ═══════════════════════════════════════════════════════════

const DisqualifiedDIN = require('../models/DisqualifiedDIN');
const WilfulDefaulter = require('../models/WilfulDefaulter');
const SFIOWatchlist = require('../models/SFIOWatchlist');
const SEBIDebarred = require('../models/SEBIDebarred');
const GeMBlacklist = require('../models/GeMBlacklist');

async function checkAll(cin, directors = []) {
  const [disqualifiedDINs, rbiDefaulter, sfioActive, sebiDebarred, gemBlacklisted] =
    await Promise.all([
      checkDINs(directors.map(d => d.din)),
      checkRBI(cin),
      checkSFIO(cin),
      checkSEBI(cin),
      checkGeM(cin)
    ]);

  return {
    disqualified_dins: disqualifiedDINs,    // Array of disqualified DINs found
    rbi_defaulter: rbiDefaulter,            // Boolean
    sfio_active: sfioActive,                // Boolean
    sebi_debarred: sebiDebarred,            // Boolean
    gem_blacklisted: gemBlacklisted,        // Boolean
    // Note: NCLT check is done via scraper (nclt.js), not local DB
  };
}

async function checkDINs(dins) {
  if (!dins.length) return [];
  const found = await DisqualifiedDIN.find({ din: { $in: dins } }).select('din director_name');
  return found.map(d => d.din);
}

async function checkRBI(cin) {
  // Check by CIN and also by company name if available
  const count = await WilfulDefaulter.countDocuments({ cin });
  return count > 0;
}

async function checkSFIO(cin) {
  const record = await SFIOWatchlist.findOne({ cin, investigation_status: 'active' });
  return !!record;
}

async function checkSEBI(cin) {
  const now = new Date();
  const record = await SEBIDebarred.findOne({
    cin,
    $or: [{ expiry_date: null }, { expiry_date: { $gt: now } }]
  });
  return !!record;
}

async function checkGeM(cin) {
  const count = await GeMBlacklist.countDocuments({ cin });
  return count > 0;
}

module.exports = { checkAll, checkDINs, checkRBI, checkSFIO, checkSEBI, checkGeM };
```

---

## 8. NEWS COLLECTOR

### `/api/services/newsCollector.js`
```javascript
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const logger = require('../utils/logger');

const RSS_QUERIES = (name) => [
  `"${name}" fraud OR scam`,
  `"${name}" penalty OR fine OR enforcement order`,
  `"${name}" default OR insolvency OR bankruptcy`,
  `"${name}" SEBI OR MCA OR RBI OR NCLT`,
  `"${name}" case OR lawsuit OR court judgment`,
  `"${name}" latest news`
];

async function fetchGoogleNewsRSS(companyName) {
  const parser = new XMLParser();
  const allArticles = [];

  for (const query of RSS_QUERIES(companyName)) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
      const res = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const parsed = parser.parse(res.data);
      const items = parsed.rss?.channel?.item || [];
      const articles = (Array.isArray(items) ? items : [items]).map(item => ({
        title: item.title || '',
        description: item.description || '',
        published_at: item.pubDate || '',
        source: item.source || 'Google News',
        url: item.link || ''
      }));
      allArticles.push(...articles.slice(0, 5)); // Max 5 per query
      await new Promise(r => setTimeout(r, 500)); // Rate limit: 0.5s between queries
    } catch (err) {
      logger.warn(`Google News RSS failed for query: ${query}`, { error: err.message });
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  return { articles: unique.slice(0, 20), source: 'google_news_rss', count: unique.length };
}

async function fetchGDELT(companyName) {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(companyName)}&mode=artlist&format=json&maxrecords=10&timespan=6m`;
    const res = await axios.get(url, { timeout: 10000 });
    const articles = (res.data.articles || []).map(a => ({
      title: a.title,
      url: a.url,
      tone: a.tone, // Negative = concerning
      published_at: a.seendate,
      source: a.domain
    }));
    return { articles, source: 'gdelt', count: articles.length };
  } catch (err) {
    logger.warn('GDELT API failed', { error: err.message });
    return null;
  }
}

module.exports = { fetchGoogleNewsRSS, fetchGDELT };
```

---

## 9. FRONTEND COMPONENTS (MVP)

### VHS Gauge Component
```typescript
// components/report/VHSGauge.tsx
"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function VHSGauge({ score, animated = true, size = 200 }: { score: number; animated?: boolean; size?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  const center = size / 2;
  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);

  const getColor = (s: number) => s >= 66 ? '#16A34A' : s >= 41 ? '#F59E0B' : '#DC2626';
  const getLabel = (s: number) => s >= 66 ? 'LOW RISK' : s >= 41 ? 'MEDIUM RISK' : 'HIGH RISK';

  useEffect(() => {
    if (!animated || !svgRef.current) return;
    const arc = svgRef.current.querySelector('.vhs-arc') as SVGCircleElement;
    const scoreDisplay = scoreRef.current;

    gsap.fromTo(arc,
      { strokeDashoffset: circumference },
      {
        strokeDashoffset: dashOffset,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: function() {
          if (scoreDisplay) {
            const progress = 1 - (gsap.getProperty(arc, "strokeDashoffset") as number) / circumference;
            scoreDisplay.textContent = Math.round(progress * score).toString();
          }
        }
      }
    );
    gsap.to(arc, { stroke: getColor(score), duration: 1.2, ease: "power2.out" });
  }, [score, animated]);

  return (
    <div className="relative flex items-center justify-center">
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#1E293B" strokeWidth={12} />
        <circle
          className="vhs-arc"
          cx={center} cy={center} r={radius}
          fill="none" stroke="#DC2626" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference : dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span ref={scoreRef} className="text-4xl font-bold text-white font-mono">
          {animated ? 0 : score}
        </span>
        <span className="text-xs text-slate-400 mt-1">out of 100</span>
        <span className="text-xs font-bold mt-2 px-2 py-0.5 rounded"
          style={{ color: getColor(score), backgroundColor: `${getColor(score)}20` }}>
          {getLabel(score)}
        </span>
      </div>
    </div>
  );
}
```

### Report Loading Progress (13-step)
```typescript
// components/processing/ReportLoadingProgress.tsx
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  { id: "mca",       label: "Fetching company registry (MCA21)" },
  { id: "directors", label: "Verifying director profiles + DINs" },
  { id: "gst",       label: "Checking GST compliance history" },
  { id: "charges",   label: "Reviewing loan + charge register" },
  { id: "local",     label: "Checking RBI, SEBI, SFIO blacklists" },
  { id: "courts",    label: "Scanning eCourts district records" },
  { id: "nclt",      label: "Checking NCLT insolvency portal" },
  { id: "sebi",      label: "Reviewing SEBI enforcement orders" },
  { id: "news",      label: "Analyzing media coverage + GDELT" },
  { id: "scoring",   label: "Calculating Vendor Health Score" },
  { id: "ai",        label: "Running AI risk assessment (Gemini)" },
  { id: "pdf",       label: "Generating board-ready PDF report" },
];

// Status → step mapping (matches reportWorker.js status updates)
const STATUS_TO_STEP = {
  pending: 0, collecting: 1, scoring: 9, generating: 10, complete: 12
};

export function ReportLoadingProgress({ reportId }: { reportId: string }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await fetch(`/api/reports/${reportId}`);
      const data = await res.json();
      setCurrentStep(STATUS_TO_STEP[data.data.status] ?? 0);
      if (data.data.status === 'complete') {
        clearInterval(poll);
        window.location.href = `/report/${reportId}`;
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [reportId]);

  return (
    <div className="min-h-screen bg-[#060910] flex items-center justify-center">
      <div className="max-w-lg w-full px-6">
        <motion.div className="w-32 h-32 rounded-full border-4 border-blue-500/30 mx-auto mb-8 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <span className="text-4xl font-mono text-blue-500/50">??</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Analyzing Vendor Risk</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          AI is processing 13 data sources. Usually takes 3–5 minutes.
        </p>
        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const isComplete = i < currentStep;
            const isActive = i === currentStep;
            return (
              <motion.div key={step.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  isActive ? 'bg-blue-500/10 border border-blue-500/30' :
                  isComplete ? 'bg-green-500/10' : 'bg-slate-800/30'}`}>
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {isComplete ? <Check className="w-4 h-4 text-green-400" /> :
                   isActive ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> :
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                </div>
                <span className={`text-sm ${isComplete ? 'text-green-400' : isActive ? 'text-blue-300' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## 10. ENVIRONMENT SETUP COMMANDS

```bash
# 1. Create monorepo
mkdir vendoriq && cd vendoriq && git init -b main
cp /path/to/CONTEXT.md .
cp /path/to/PRD.md .

# 2. Frontend setup
npx create-next-app@14.2.3 frontend --typescript --tailwind --app --src-dir --no-git
cd frontend
npx shadcn-ui@latest init  # Choose: Dark theme, CSS variables, slate base
npx shadcn-ui@latest add button card badge dialog table tabs progress tooltip dropdown-menu
npm install framer-motion@11.1.7 gsap@3.12.5 recharts@2.12.4 d3@7.9.0 @types/d3@7.4.3 \
  zustand@4.5.2 axios@1.6.8 react-hook-form@7.51.3 zod@3.23.6 @hookform/resolvers@3.3.4 \
  socket.io-client@4.7.5 next-auth@4.24.7 lucide-react@0.371.0 clsx@2.1.1 \
  tailwind-merge@2.3.0 sonner@1.4.41 date-fns@3.6.0 nanoid@5.0.7

# 3. API setup
mkdir api && cd api && npm init -y
npm install express@4.19.2 mongoose@8.3.2 bull@4.12.2 node-cron@3.0.3 puppeteer@22.7.1 \
  exceljs@4.4.0 nodemailer@6.9.13 axios@1.6.8 zod@3.23.6 jsonwebtoken@9.0.2 bcrypt@5.1.1 \
  helmet@7.1.0 express-rate-limit@7.2.0 cors@2.8.5 dotenv@16.4.5 winston@3.13.0 \
  @sentry/node@7.114.0 nanoid@5.0.7 papaparse@5.4.1 socket.io@4.7.5 razorpay@2.9.2 \
  cheerio@1.0.0-rc.12 fast-xml-parser@4.3.6 pdf-parse@1.1.1 scrapingbee@1.6.0
npm install -D nodemon@3.1.0 jest@29.7.0 supertest@7.0.0

# 4. AI Service setup
mkdir ai-service && cd ai-service
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn langchain langchain-google-genai langchain-openai \
  langchain-community langgraph google-generativeai openai faiss-cpu \
  python-dotenv pydantic httpx pytest pytest-asyncio tiktoken numpy

# 5. Local dev infrastructure
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo_data:/data/db"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  mongo_data:
EOF
docker-compose up -d

# 6. Seed local DBs (run once after Phase 1.5)
node api/scripts/seedLocalDBs.js

# 7. Verify
curl http://localhost:4000/api/health
node api/scripts/testReport.js L17110MH1973PLC019786
```

---

## 11. ACCEPTANCE TESTS BY PHASE

### Phase 0 Complete When:
```
□ docker-compose up → MongoDB (27017) + Redis (6379) running
□ node api/index.js → GET localhost:4000/api/health → { status: "healthy" }
□ All directory trees created correctly
```

### Phase 1 Complete When:
```
□ node scripts/testReport.js L17110MH1973PLC019786 → runs without error
□ Real MCA + Director data returns from Sandbox.co.in
□ VHS score calculated and displayed in terminal
□ npm test -- scoringEngine.test.js → all tests pass
```

### Phase 1.5 Complete When:
```
□ node scripts/testReport.js L17110MH1973PLC019786 → shows court cases from eCourts
□ Google News RSS returns articles for known companies
□ GDELT returns data
□ seedLocalDBs.js runs → all 5 local collections populated
□ localDBChecker returns results for known disqualified companies
□ All 13 sources returning data (or graceful null on unavailable)
```

### Phase 2 Complete When:
```
□ Landing page live at localhost:3000
□ Search finds real Indian companies (Sandbox.co.in typeahead)
□ Razorpay TEST payment of ₹2,000 (200,000 paise) processes successfully
□ Report generates with real AI narrative (Gemini 1.5 Flash)
□ PDF downloads and is readable
□ All 4 services running simultaneously without errors
□ First ₹2,000 report generated
```

---

*End of MVP Technical Documentation v1.1*
*₹2,000/report · Gemini (GPT-ready) · 13 sources · 85-88% accuracy*
