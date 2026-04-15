"""
VendorIQ — AI Service (FastAPI)
================================
Internal microservice — only called by the Express API worker.
Protected by shared FASTAPI_SECRET header.

Endpoints:
  GET  /health          — liveness check
  POST /analyze         — full LangGraph pipeline (extract→retrieve→analyze→narrate)
"""

import os
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Any

from graph import run_analysis_pipeline
from llm_client import LLM

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("vendoriq.ai")

# ── Startup / shutdown ────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI service starting up")
    logger.info(f"LLM provider: {os.getenv('LLM_PROVIDER', 'gemini')}")
    # Warm up LLM client on startup
    try:
        LLM.complete("You are a helpful assistant.", "Say 'ready' in one word.")
        logger.info("LLM warmup complete")
    except Exception as e:
        logger.warning(f"LLM warmup failed (non-fatal): {e}")
    yield
    logger.info("AI service shutting down")

# ── App ────────────────────────────────────────────────────────
app = FastAPI(
    title="VendorIQ AI Service",
    version="1.1.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["GET", "POST"],
    allow_headers=["x-internal-secret", "content-type"],
)

# ── Auth middleware ────────────────────────────────────────────
FASTAPI_SECRET = os.getenv("FASTAPI_SECRET", "")

def verify_internal_secret(request: Request):
    """Every endpoint (except /health) requires x-internal-secret header."""
    secret = request.headers.get("x-internal-secret", "")
    if not FASTAPI_SECRET:
        raise HTTPException(status_code=500, detail="FASTAPI_SECRET not configured")
    if secret != FASTAPI_SECRET:
        logger.warning(f"Unauthorized AI service request from {request.client.host}")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# ── Request / Response models ──────────────────────────────────
class AnalyzeRequest(BaseModel):
    cin:         str = Field(..., description="Company CIN")
    vendor_name: str = Field(..., description="Company name")
    raw_data:    dict = Field(..., description="All 13 sources collected by data collector")
    vhs_score:   int  = Field(..., ge=0, le=100)
    risk_level:  str  = Field(..., pattern="^(HIGH|MEDIUM|LOW)$")
    hard_flags:  list = Field(default_factory=list)
    key_flags:   list = Field(default_factory=list)

class AnalyzeResponse(BaseModel):
    narrative:              str
    similar_cases:          list
    recommendation_reasons: list
    conditions:             list
    processing_time_ms:     int
    llm_provider:           str

# ── Routes ────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Liveness probe — no auth required."""
    try:
        # Quick LLM ping
        llm_ok = True
        llm_err = None
        try:
            LLM.complete("Verify connectivity", "Say 'ok'", temperature=0)
        except Exception as e:
            logger.error(f"LLM health check failed: {str(e)}")
            llm_ok = False
            llm_err = str(e)

        return {
            "status":       "healthy" if llm_ok else "degraded",
            "version":      "1.1.0",
            "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
            "llm_ok":       llm_ok,
            "error":        llm_err,
            "timestamp":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "error": str(e)})


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    payload: AnalyzeRequest,
    _auth: bool = Depends(verify_internal_secret),
):
    """
    Full LangGraph analysis pipeline.
    Called by reportWorker.js Step 3.
    """
    start = time.time()
    logger.info(f"Analysis started | CIN={payload.cin} | VHS={payload.vhs_score} | Risk={payload.risk_level}")

    try:
        result = await run_analysis_pipeline(
            cin=payload.cin,
            vendor_name=payload.vendor_name,
            raw_data=payload.raw_data,
            vhs_score=payload.vhs_score,
            risk_level=payload.risk_level,
            hard_flags=payload.hard_flags,
            key_flags=payload.key_flags,
        )

        elapsed_ms = int((time.time() - start) * 1000)
        logger.info(f"Analysis complete | CIN={payload.cin} | elapsed={elapsed_ms}ms")

        return AnalyzeResponse(
            narrative=              result.get("narrative", ""),
            similar_cases=          result.get("similar_cases", []),
            recommendation_reasons= result.get("recommendation_reasons", []),
            conditions=             result.get("conditions", []),
            processing_time_ms=     elapsed_ms,
            llm_provider=           os.getenv("LLM_PROVIDER", "gemini"),
        )

    except Exception as e:
        logger.error(f"Analysis failed | CIN={payload.cin} | error={e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis pipeline failed: {str(e)}"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )
