# ══════════════════════════════════════════════════════════════
# VendorIQ — API Service Dockerfile
# Stage 1: deps | Stage 2: production image
# ══════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ──────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools needed for some native deps
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: Production image ───────────────────────────────────
FROM node:20-alpine AS production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 vendoriq

WORKDIR /app

# System deps: fonts for Puppeteer PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-devanagari

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Copy deps from stage 1
COPY --from=deps --chown=vendoriq:nodejs /app/node_modules ./node_modules

# Copy source
COPY --chown=vendoriq:nodejs . .

# Drop to non-root
USER vendoriq

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health | grep -q '"status"' || exit 1

CMD ["node", "index.js"]
