# VendorIQ

AI-powered vendor due diligence for Indian companies. Enter a CIN → get a VHS score + PDF report in < 5 minutes. ₹2,000/report.

## Quick Start (Development)

```bash
# 1. Clone + env setup
git clone https://github.com/yourname/vendoriq
cd vendoriq
cp .env.example api/.env
# Fill in api/.env with real values

# 2. Start local infrastructure
docker-compose up -d
# MongoDB → localhost:27017
# Redis   → localhost:6379

# 3. Install API dependencies
cd api && npm install

# 4. Seed local DBs (run once — takes ~5-15 min)
node scripts/seedLocalDBs.js

# 5. Start API
node index.js
# → http://localhost:4000/api/health

# 6. Install + start frontend
cd ../frontend && npm install && npm run dev
# → http://localhost:3000

# 7. Start AI service
cd ../ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 8. Start worker (separate terminal)
cd ../worker && node index.js
```

## Test the pipeline

```bash
node api/scripts/testReport.js L17110MH1973PLC019786
```

## Architecture

- **Frontend:** Next.js 14 (Obsidian Terminal aesthetic — dark, glass morphism)
- **API:** Express.js + Bull.js async workers
- **AI:** Python FastAPI + LangGraph + Google Gemini 1.5 Flash
- **Data:** 13 sources — MCA, GST, eCourts, NCLT, SEBI, SFIO, RBI, GeM, news
- **Storage:** MongoDB Atlas + Upstash Redis + AWS S3

## Pricing

| Plan | Price | Reports | Monitors |
|------|-------|---------|---------|
| Starter | ₹2,000/report | Pay-per-use | — |
| Professional | ₹9,999/month | 50/month | 20 |
| Enterprise | ₹34,999/month | Unlimited | Unlimited |
| CA Partner API | ₹69,000 setup + ₹9/report | — | — |

---

*Built with ♥ in India 🇮🇳*
