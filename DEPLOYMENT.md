# VendorIQ — Production Deployment Runbook

> **Tech stack recap:** Node 20 API · Next.js 14 frontend · Python 3.11 FastAPI AI service ·
> Bull workers · MongoDB Atlas · Upstash Redis · AWS S3 · Nginx · Docker Compose

---

## Prerequisites

| Requirement | Minimum spec |
|---|---|
| VPS | 4 vCPU · 8 GB RAM · 80 GB SSD (Ubuntu 22.04) |
| Domain | `vendoriq.in` pointing to VPS IP (A record) |
| MongoDB | Atlas M10+ cluster (not M0 free — needs oplog for monitoring) |
| Redis | Upstash paid plan (TLS, `rediss://`) |
| S3 | `vendoriq-reports` bucket, `eu-north-1`, versioning on |
| Docker | 24+ · Docker Compose v2 |

---

## 1. Server Setup

```bash
# 1.1 — Create a deploy user (never run app as root)
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# 1.2 — Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 1.3 — Install Docker Compose v2
apt-get install -y docker-compose-plugin

# 1.4 — Install Nginx (host-level, for Let's Encrypt)
apt-get install -y nginx certbot python3-certbot-nginx

# 1.5 — Set up application directory
mkdir -p /opt/vendoriq
chown deploy:deploy /opt/vendoriq
```

---

## 2. SSL Certificates (Let's Encrypt)

```bash
# Obtain cert — run as root
certbot certonly --nginx -d vendoriq.in -d www.vendoriq.in

# Certs land at:
#   /etc/letsencrypt/live/vendoriq.in/fullchain.pem
#   /etc/letsencrypt/live/vendoriq.in/privkey.pem

# Mount them into the nginx container
mkdir -p /opt/vendoriq/nginx/ssl
ln -s /etc/letsencrypt/live/vendoriq.in/fullchain.pem /opt/vendoriq/nginx/ssl/fullchain.pem
ln -s /etc/letsencrypt/live/vendoriq.in/privkey.pem   /opt/vendoriq/nginx/ssl/privkey.pem

# Auto-renew cron (Let's Encrypt certs expire every 90 days)
echo "0 3 * * * root certbot renew --quiet && docker compose -f /opt/vendoriq/docker-compose.prod.yml restart nginx" \
  >> /etc/crontab
```

---

## 3. Environment Variables

```bash
# On your local machine — fill every value in api/.env.example
cp api/.env.example api/.env
nano api/.env

# Critical values to set before first deploy:
#   MONGODB_URI           — Atlas connection string
#   REDIS_URL             — Upstash TLS URL
#   JWT_SECRET            — openssl rand -base64 48
#   NEXTAUTH_SECRET       — openssl rand -base64 48  (different from JWT_SECRET)
#   FASTAPI_SECRET        — openssl rand -hex 32
#   ADMIN_SECRET          — openssl rand -hex 32  (guards /api/admin/*)
#   SANDBOX_API_KEY       — From sandbox.co.in
#   RAZORPAY_KEY_ID/SECRET
#   RAZORPAY_WEBHOOK_SECRET
#   REPORT_PRICE_PAISE=200000  ← NEVER change this
#   AWS_ACCESS_KEY_ID/SECRET
#   SENDGRID_API_KEY
#   SENTRY_DSN
#   GEMINI_API_KEY

# Encode .env for GitHub secret (CI/CD job 4)
base64 -w0 api/.env | xclip   # Linux
base64 -i api/.env | pbcopy    # macOS
# Paste into GitHub → Settings → Secrets → DEPLOY_ENV_FILE
```

---

## 4. First Deploy

```bash
# Switch to deploy user on the VPS
su - deploy
cd /opt/vendoriq

# Clone the repo
git clone https://github.com/YOUR_ORG/vendoriq.git .

# Copy in the .env (scp from local or paste directly)
scp api/.env deploy@YOUR_VPS_IP:/opt/vendoriq/api/.env

# Pull Docker Hub images (built by CI) OR build locally
docker compose -f docker-compose.prod.yml pull
# - or - 
docker compose -f docker-compose.prod.yml up -d --build

# Verify all services healthy
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                 STATUS          PORTS
vendoriq-nginx       Up (healthy)    0.0.0.0:80->80, 0.0.0.0:443->443
vendoriq-api         Up (healthy)    4000/tcp
vendoriq-worker      Up              
vendoriq-ai          Up (healthy)    8000/tcp
vendoriq-frontend    Up              3000/tcp
vendoriq-mongo       Up (healthy)    27017/tcp
vendoriq-redis       Up (healthy)    6379/tcp
```

---

## 5. Post-Deploy: Seed and Indexes

```bash
# Run once after first deploy
docker compose -f docker-compose.prod.yml exec api node scripts/setupIndexes.js
docker compose -f docker-compose.prod.yml exec api node scripts/seedLocalDBs.js

# Create Razorpay subscription plans (run once)
docker compose -f docker-compose.prod.yml exec api node scripts/createRazorpayPlans.js

# Verify indexes created
docker compose -f docker-compose.prod.yml exec api node -e "
  require('dotenv').config();
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const cols = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', cols.map(c => c.name));
    process.exit(0);
  });
"
```

---

## 6. GitHub Actions Setup

Add these secrets in **GitHub → Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `DOCKER_HUB_USERNAME` | Your Docker Hub username |
| `DOCKER_HUB_TOKEN` | Docker Hub access token |
| `DEPLOY_HOST` | VPS IP or hostname |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Private key matching deploy user's `~/.ssh/authorized_keys` |
| `DEPLOY_ENV_FILE` | `base64 -w0 api/.env` output |

After secrets are set, any push to `main` will:
1. Run tests (scoring engine)
2. TypeScript type-check + ESLint
3. Build + push 4 Docker images to Docker Hub
4. SSH into VPS, pull images, rolling restart

---

## 7. Monitoring & Logs

```bash
# Live logs — all services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.prod.yml logs -f ai-service

# Admin dashboard (requires ADMIN_SECRET)
# Navigate to: https://vendoriq.in/admin
# Enter ADMIN_SECRET from api/.env

# Via curl:
curl -H "x-admin-secret: YOUR_ADMIN_SECRET" https://vendoriq.in/api/admin/health | jq
curl -H "x-admin-secret: YOUR_ADMIN_SECRET" https://vendoriq.in/api/admin/cron   | jq

# Trigger a cron job manually (e.g. monitoring dispatch):
curl -X POST -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  https://vendoriq.in/api/admin/cron/monitoring/run | jq
```

---

## 8. Routine Operations

### Rolling restart (zero downtime)
```bash
cd /opt/vendoriq
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build --remove-orphans
```

### Emergency rollback
```bash
# Use a previous image tag (pushed by CI e.g. a1b2c3d)
DOCKER_HUB_USERNAME=yourname TAG=a1b2c3d

docker compose -f docker-compose.prod.yml stop api worker frontend
docker image tag $DOCKER_HUB_USERNAME/vendoriq-api:$TAG    vendoriq-api:latest
docker image tag $DOCKER_HUB_USERNAME/vendoriq-worker:$TAG vendoriq-worker:latest
docker image tag $DOCKER_HUB_USERNAME/vendoriq-frontend:$TAG vendoriq-frontend:latest
docker compose -f docker-compose.prod.yml up -d api worker frontend
```

### Scale workers (high load)
```bash
docker compose -f docker-compose.prod.yml up -d --scale worker=2
```

### MongoDB backup
```bash
# Dump to host
docker compose -f docker-compose.prod.yml exec mongo \
  mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)

# Or use Atlas automated backups (recommended — enable in Atlas UI)
```

---

## 9. Runbook: Common Issues

### Report stuck in `collecting` state
```bash
# Check worker logs
docker compose -f docker-compose.prod.yml logs --tail 50 worker

# Check Bull queue — failed jobs
curl -H "x-admin-secret: $ADMIN_SECRET" https://vendoriq.in/api/admin/queues | jq '.data.queues'

# Manually re-queue (use report ID from MongoDB)
docker compose -f docker-compose.prod.yml exec api node -e "
  require('dotenv').config();
  const { createQueue } = require('./config/redis');
  const q = createQueue('report');
  q.add({ report_id: 'RPT_XXXXXXXX', cin: 'UXXXXXXX', client_id: 'XXXX' });
  setTimeout(() => process.exit(0), 1000);
"
```

### High memory usage
```bash
docker stats --no-stream
# If worker is leaking — rolling restart
docker compose -f docker-compose.prod.yml restart worker
```

### Redis connection refused
```bash
# Check Redis is healthy
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD ping
# Should return: PONG

# If using Upstash — check REDIS_URL in .env starts with rediss://
```

### REPORT_PRICE_PAISE accidentally changed
```bash
# This is a critical bug — revert immediately
grep REPORT_PRICE_PAISE api/.env
# Must be 200000. If not:
sed -i 's/REPORT_PRICE_PAISE=.*/REPORT_PRICE_PAISE=200000/' api/.env
docker compose -f docker-compose.prod.yml restart api
```

---

## 10. Security Checklist (before go-live)

- [ ] `REPORT_PRICE_PAISE=200000` confirmed in api/.env
- [ ] `JWT_SECRET`, `NEXTAUTH_SECRET`, `FASTAPI_SECRET`, `ADMIN_SECRET` all different, all 32+ chars
- [ ] MongoDB has auth enabled (not open to internet)
- [ ] Redis has `requirepass` set (`REDIS_PASSWORD` in .env)
- [ ] S3 bucket has **no public access** — only signed URLs
- [ ] Razorpay webhook secret configured
- [ ] Sentry DSN set + `SENTRY_ENVIRONMENT=production`
- [ ] `/api/admin/*` tested with wrong secret → 401
- [ ] SSL certificate valid: `curl -I https://vendoriq.in`
- [ ] Rate limits tested: 11 auth attempts → 429
- [ ] `.env` NOT committed to git: `git log --all -- api/.env` returns nothing
- [ ] GitHub Actions secrets set for all 5 required secrets
- [ ] `ADMIN_SECRET` NOT shared in Slack/email — rotate after any exposure

---

## Architecture Diagram

```
Internet
    │
    ▼
 Nginx :443  (SSL termination, rate limiting)
    │
    ├── /api/*         → api:4000  (Express API)
    ├── /api/v1/*      → api:4000  (CA Partner REST API)
    └── /*             → frontend:3000  (Next.js)

api:4000
    ├── Bull queues   → Redis (report / monitoring / bulk-audit)
    └── AI calls      → ai-service:8000  (FastAPI + LangGraph)

worker (Bull consumers)
    ├── reportWorker         (concurrency: 3)
    ├── monitoringWorker     (concurrency: 5)
    └── bulkAuditWorker      (concurrency: 3)

MongoDB Atlas  ←──────── api, worker, ai-service
AWS S3         ←──────── api (PDF storage)
SendGrid       ←──────── api (email notifications)
Razorpay       ←──────── api (payments)
Sandbox.co.in  ←──────── api (MCA/GST data)
```
