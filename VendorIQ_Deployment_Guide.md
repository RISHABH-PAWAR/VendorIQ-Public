# VendorIQ — Production Deployment Guide

> **⚠️ SECURITY WARNING:** This document contains live API keys. Never share it publicly or commit `.env` files to Git.

---

## Demo Login Credentials

| Role | Email | Password | Plan |
|------|-------|----------|------|
| **Demo User** | demo@vendoriq.in | Demo@1234 | Pro (50 reports/month) |
| **Admin** | admin@vendoriq.in | Admin@VIQ2025 | Enterprise (unlimited) |

Login at: `https://yourdomain.com/auth/login`

---

## 1. Prerequisites

### Server Requirements

| Item | Minimum |
|------|---------|
| OS | Ubuntu 22.04 LTS or 24.04 LTS |
| CPU | 2 vCPU (4 recommended) |
| RAM | 4 GB minimum — 8 GB recommended |
| Disk | 40 GB SSD |
| Ports | 22, 80, 443 open |
| Domain | Pointed at your server IP |

### Accounts & Keys Status

| Service | Status |
|---------|--------|
| MongoDB Atlas | ✅ Configured in `api/.env` |
| Upstash Redis | ✅ Configured in `api/.env` |
| Razorpay TEST | ✅ Configured — switch to LIVE when ready |
| AWS S3 | ✅ Configured — bucket: `vendoriq-reports` |
| SendGrid | ✅ Configured in `api/.env` |
| Sandbox.co.in | ✅ Configured in `api/.env` |
| Sentry | ✅ Configured in `api/.env` |
| **Google Gemini** | ❌ **ADD YOUR KEY** → aistudio.google.com |
| Google OAuth | ⚪ Optional |

---

## 2. Server Setup (One-Time)

### Step 1 — Update server & install basics

```bash
ssh root@YOUR_SERVER_IP

apt update && apt upgrade -y
apt install -y curl wget git unzip nano ufw fail2ban
```

### Step 2 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

docker --version
docker compose version
```

### Step 3 — Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # v20.x.x
```

### Step 4 — Install Python 3.11

```bash
apt install -y python3.11 python3.11-venv python3-pip
python3.11 --version
```

### Step 5 — Configure firewall

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
ufw status
```

> ⚠️ Do NOT open ports 4000, 3000, 8000 or 6379 publicly. All traffic goes through Nginx on 443.

### Step 6 — Install Nginx & Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl status nginx
```

---

## 3. Deploy the Application

### Step 7 — Upload the project zip

```bash
# From your LOCAL machine:
scp vendoriq_production.zip root@YOUR_SERVER_IP:/opt/

# On the SERVER:
cd /opt
unzip vendoriq_production.zip
mv vendoriq /opt/vendoriq
ls /opt/vendoriq
```

### Step 8 — Add your Gemini API key

```bash
nano /opt/vendoriq/ai-service/.env

# Add:
GEMINI_API_KEY=your_gemini_key_here
# Save: Ctrl+O  Enter  Ctrl+X
```

Get a free key at: https://aistudio.google.com/app/apikey

### Step 9 — Update production URLs

```bash
nano /opt/vendoriq/api/.env
```

Change these lines:
```
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com
```

```bash
nano /opt/vendoriq/frontend/.env.local
```

Change these lines:
```
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com
```

### Step 10 — Run database setup

```bash
cd /opt/vendoriq/api
npm install --omit=dev

node scripts/setupIndexes.js      # Create MongoDB indexes
node scripts/seedLocalDBs.js      # Seed SFIO, SEBI, GeM databases
node scripts/seedDemoAccount.js   # Create demo login accounts
node scripts/createRazorpayPlans.js  # Get plan IDs → paste into api/.env
```

---

## 4. Start All Services with Docker

### Step 11 — Build and start

```bash
cd /opt/vendoriq
docker compose -f docker-compose.prod.yml up -d --build

# Watch startup logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 12 — Verify containers

```bash
docker compose -f docker-compose.prod.yml ps
# All should show "Up" or "healthy"
```

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `vendoriq-api` exits | `docker logs vendoriq-api` — missing env var or MongoDB error |
| `vendoriq-ai` restarts | Check `GEMINI_API_KEY` in `ai-service/.env` |
| MongoDB fails | Check Atlas IP whitelist allows your server IP |
| Redis fails | Verify `REDIS_URL` starts with `rediss://` (double s = TLS) |

---

## 5. Configure Nginx & SSL

### Step 13 — Set up Nginx

```bash
cp /opt/vendoriq/nginx/nginx.conf /etc/nginx/sites-available/vendoriq

# Replace vendoriq.in with YOUR domain
nano /etc/nginx/sites-available/vendoriq

ln -s /etc/nginx/sites-available/vendoriq /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
```

### Step 14 — Free SSL certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
certbot renew --dry-run   # test auto-renewal
```

> ⚠️ DNS A record must point to your server IP before running certbot.

### Step 15 — Verify HTTPS

```bash
curl -I https://yourdomain.com               # Expected: HTTP/2 200
curl https://yourdomain.com/api/health       # Expected: {"status":"ok","mongo":"connected","redis":"connected"}
```

---

## 6. Switch Razorpay to LIVE Mode

> Currently in **TEST mode**. Switch only when ready for real payments.

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys → Generate Live Keys
2. Update `api/.env`: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
3. Update `frontend/.env.local`: `NEXT_PUBLIC_RAZORPAY_KEY_ID`
4. Restart: `docker compose -f docker-compose.prod.yml restart api frontend`

---

## 7. Post-Deploy Checklist

### Infrastructure
- [ ] `https://yourdomain.com` loads the landing page
- [ ] `http://` redirects to `https://`
- [ ] `/api/health` shows `mongo` and `redis` connected
- [ ] All Docker containers show `Up`

### Application Flow
- [ ] Login with `demo@vendoriq.in` / `Demo@1234`
- [ ] Search CIN: `L67120MH1994PLC080618` (HDFC Bank)
- [ ] Razorpay checkout appears
- [ ] Test card: `4111 1111 1111 1111` · any CVV · any future expiry
- [ ] Processing screen shows real-time progress
- [ ] Report completes with "Download PDF" button
- [ ] Admin panel `/admin` works for `admin@vendoriq.in`

---

## 8. Monitoring & Maintenance

### View Logs

```bash
docker compose -f docker-compose.prod.yml logs -f          # all
docker logs vendoriq-api    -f --tail 100                  # API
docker logs vendoriq-worker -f --tail 100                  # Worker
docker logs vendoriq-ai     -f --tail 100                  # AI service
```

### Rolling Restart (Zero Downtime)

```bash
cd /opt/vendoriq
docker compose -f docker-compose.prod.yml up -d --build --no-deps api
docker compose -f docker-compose.prod.yml up -d --build --no-deps worker
docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend
```

### Cron Jobs (Auto-Running)

| Job | Schedule |
|-----|----------|
| Refresh SEBI debarred orders | Daily midnight IST |
| Refresh SFIO watchlist | Every Sunday 1:00 AM |
| Refresh GeM blacklist | Every Monday 2:00 AM |
| Download DIN disqualified CSV | Monthly 1st, 3:00 AM |
| Download RBI defaulters | Quarterly, 4:00 AM |
| Vendor monitoring alerts | Nightly 2:00 AM IST |

---

## 9. Scaling

| Traffic | Server | Cost |
|---------|--------|------|
| 0–50 reports/day | 2 vCPU, 4 GB | ₹1,200/mo (Hetzner CX21) |
| 50–200 reports/day | 4 vCPU, 8 GB | ₹2,500/mo (Hetzner CX31) |
| 200–1000/day | 8 vCPU, 16 GB | Separate worker server |
| 1000+/day | Kubernetes / ECS | Multiple worker replicas |

```bash
# Scale workers horizontally
docker compose -f docker-compose.prod.yml up -d --scale worker=3
```

---

## 10. Security Hardening

> ⚠️ Do this before going live.

```bash
# Generate new secrets
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # ADMIN_SECRET

# Update api/.env then restart:
docker compose -f docker-compose.prod.yml restart api worker
```

- [ ] `JWT_SECRET` changed from default ← **REQUIRED**
- [ ] `ADMIN_SECRET` changed from default ← **REQUIRED**
- [ ] Firewall: only ports 22, 80, 443 open
- [ ] MongoDB Atlas: IP whitelist = your server IP only
- [ ] `.env` files not committed to Git

---

## 11. Quick Reference

### URLs

| URL | Purpose |
|-----|---------|
| `/` | Landing page |
| `/auth/login` | Login |
| `/dashboard` | User dashboard |
| `/search` | CIN search |
| `/admin` | Admin panel |
| `/api/health` | Health check |

### Commands

```bash
docker compose -f docker-compose.prod.yml up -d              # start
docker compose -f docker-compose.prod.yml down               # stop
docker compose -f docker-compose.prod.yml ps                 # status
docker compose -f docker-compose.prod.yml logs -f            # logs
docker compose -f docker-compose.prod.yml up -d --build      # rebuild
docker system prune -f                                        # cleanup
```

### Env Files

| File | Contains |
|------|---------|
| `api/.env` | All credentials — MongoDB, Redis, Razorpay, AWS, SendGrid, Sentry |
| `frontend/.env.local` | Public vars — API URL, Socket URL, Razorpay key |
| `ai-service/.env` | Gemini API key |

---

*VendorIQ — Keep this file private — Contains live credentials*
