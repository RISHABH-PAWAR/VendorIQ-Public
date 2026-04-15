# ══════════════════════════════════════════════════════════════
# VendorIQ — Worker Service Dockerfile
# Runs reportWorker + monitoringWorker + bulkAuditWorker
# ══════════════════════════════════════════════════════════════

FROM node:20-alpine AS deps

WORKDIR /app
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev
COPY api/package.json api/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# ── Production ──────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 vendoriq

WORKDIR /app

# Chromium for Puppeteer (PDF generation in reportWorker)
RUN apk add --no-cache \
    chromium nss freetype harfbuzz ca-certificates \
    ttf-freefont font-noto-devanagari

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Copy node_modules to root
COPY --from=deps --chown=vendoriq:nodejs /app/node_modules ./node_modules
COPY --chown=vendoriq:nodejs api/   ./api/
COPY --chown=vendoriq:nodejs worker/ ./worker/

USER vendoriq

WORKDIR /app/worker

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD pgrep -f "node index.js" || exit 1

CMD ["node", "index.js"]
