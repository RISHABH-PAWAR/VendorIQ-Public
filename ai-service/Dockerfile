# ══════════════════════════════════════════════════════════════
# VendorIQ — AI Service Dockerfile (Python FastAPI + LangGraph)
# ══════════════════════════════════════════════════════════════

FROM python:3.11-slim AS base

# Security: non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid 1001 --ingroup appgroup appuser

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Deps ────────────────────────────────────────────────────────
FROM base AS deps

COPY ai-service/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Production ──────────────────────────────────────────────────
FROM base AS production

# Copy installed packages
COPY --from=deps /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=deps /usr/local/bin            /usr/local/bin

# Copy source
COPY --chown=appuser:appgroup ai-service/ ./

USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
