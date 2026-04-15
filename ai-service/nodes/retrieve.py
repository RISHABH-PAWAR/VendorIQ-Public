"""
Node 2: Retrieve
=================
Searches FAISS index for similar past fraud/risk cases.
Falls back to keyword-based matching if FAISS index not built yet.

The index is built from ai-service/data/case_studies/*.json
(500 Indian corporate fraud/risk cases pre-loaded).
"""

import os
import json
import logging
from pathlib import Path

logger = logging.getLogger("vendoriq.node.retrieve")

# ── FAISS index paths ──────────────────────────────────────────
INDEX_DIR   = Path(__file__).parent.parent / "indexes"
CASES_DIR   = Path(__file__).parent.parent / "data" / "case_studies"
INDEX_FILE  = INDEX_DIR / "cases.faiss"
META_FILE   = INDEX_DIR / "cases_meta.json"

# ── Pre-loaded case studies (keyword fallback) ─────────────────
SAMPLE_CASES = [
    {
        "company_type":  "manufacturing",
        "risk_pattern":  "high_debt_charges",
        "summary":       "A manufacturing company with 15+ open charges defaulted on bank loans after rapid expansion, leading to NCLT CIRP proceedings.",
        "outcome":       "Banks recovered 34% via insolvency resolution. Vendor payments stopped 8 months before CIRP filing.",
        "lesson":        "Open charges >10 combined with low paid-up capital is a strong predictor of liquidity distress.",
        "source":        "IBBI Case Study 2022",
    },
    {
        "company_type":  "pharma",
        "risk_pattern":  "gst_non_compliance",
        "summary":       "A pharmaceutical distributor with <60% GST compliance was found to be routing transactions through shell companies.",
        "outcome":       "GST department arrested promoters. Company struck off MCA. Vendor payments of ₹4.2 crore unpaid.",
        "lesson":        "GST compliance below 60% in a B2B company often indicates transaction routing for tax evasion.",
        "source":        "GST Intelligence Report 2023",
    },
    {
        "company_type":  "construction",
        "risk_pattern":  "disqualified_directors",
        "summary":       "A construction company's two key directors were disqualified under Section 164(2) after a related entity defaulted. The company continued operations and won government contracts.",
        "outcome":       "Contracts cancelled when disqualification discovered. Pending dues of ₹12 crore to sub-contractors.",
        "lesson":        "Disqualified DIN check is critical — disqualification in one entity spreads to all entities where the director holds position.",
        "source":        "MCA Enforcement Action 2022",
    },
    {
        "company_type":  "fintech",
        "risk_pattern":  "sebi_enforcement",
        "summary":       "A fintech company's promoter was debarred by SEBI for market manipulation. The operating subsidiary continued normal business.",
        "outcome":       "RBI cancelled NBFC license of subsidiary after SEBI order. Business ceased within 60 days.",
        "lesson":        "SEBI debarment on promoters often triggers cascading regulatory action across group entities.",
        "source":        "SEBI Enforcement Order 2023",
    },
    {
        "company_type":  "trading",
        "risk_pattern":  "negative_news_fraud",
        "summary":       "Multiple news articles about CBI raids on a trading company were published 3 months before formal chargesheet. Company continued invoicing.",
        "outcome":       "Accounts frozen by ED. Outstanding invoices of ₹8.5 crore never paid.",
        "lesson":        "Negative news about ED/CBI raids is a leading indicator — formal legal action follows 2-4 months later.",
        "source":        "ED Case Analysis 2023",
    },
    {
        "company_type":  "infrastructure",
        "risk_pattern":  "nclt_cirp",
        "summary":       "IL&FS group companies had CIRP admitted across multiple subsidiaries. Vendors were unaware until payment default.",
        "outcome":       "Resolution value was 28% of total claims. Most operational vendors received 0-15% of outstanding dues.",
        "lesson":        "NCLT CIRP filing is the point of no return — proactive monitoring would have triggered early exit.",
        "source":        "IBBI Resolution Professional Report 2019",
    },
    {
        "company_type":  "diamond_gems",
        "risk_pattern":  "rbi_wilful_defaulter",
        "summary":       "Gitanjali Gems was declared RBI wilful defaulter 18 months before Nirav Modi fraud became public.",
        "outcome":       "Vendors lost ₹4,200+ crore in unpaid dues. Most had no credit insurance.",
        "lesson":        "RBI wilful defaulter status on a promoter's other entity is a hard stop — exit immediately.",
        "source":        "CBI Chargesheet Analysis 2018",
    },
    {
        "company_type":  "it_services",
        "risk_pattern":  "multiple_director_resignations",
        "summary":       "3 independent directors resigned from an IT services company within 6 months citing governance concerns. Company issued no disclosure.",
        "outcome":       "Promoter arrested for financial fraud 4 months after last resignation. All receivables frozen.",
        "lesson":        "Multiple director resignations in short period is a strong governance red flag — often precedes fraud disclosure.",
        "source":        "SEBI Forensic Audit 2022",
    },
]


def retrieve_node(state: dict) -> dict:
    """Find similar cases for the company's risk profile."""
    facts = state.get("extracted_facts", {})
    if not facts:
        return {"similar_cases": []}

    similar = []

    # ── Try FAISS first ─────────────────────────────────────────
    if INDEX_FILE.exists() and META_FILE.exists():
        try:
            similar = _faiss_search(facts)
            logger.info(f"FAISS search | CIN={facts.get('cin')} | found={len(similar)}")
        except Exception as e:
            logger.warning(f"FAISS search failed, using keyword fallback: {e}")

    # ── Keyword fallback ────────────────────────────────────────
    if not similar:
        similar = _keyword_match(facts)
        logger.info(f"Keyword match | CIN={facts.get('cin')} | found={len(similar)}")

    return {"similar_cases": similar[:3]}  # Max 3 cases in report


def _keyword_match(facts: dict) -> list:
    """Score each case by relevance to this company's risk profile."""
    scored = []

    for case in SAMPLE_CASES:
        score = 0
        pattern = case["risk_pattern"]

        if pattern == "high_debt_charges"       and facts.get("open_charges", 0) > 5:   score += 3
        if pattern == "gst_non_compliance"      and (facts.get("gst_compliance_pct") or 100) < 70: score += 3
        if pattern == "disqualified_directors"  and facts.get("disqualified_dins"):       score += 5
        if pattern == "sebi_enforcement"        and facts.get("sebi_debarred"):           score += 5
        if pattern == "negative_news_fraud"     and facts.get("negative_news_count", 0) >= 2: score += 3
        if pattern == "nclt_cirp"               and facts.get("nclt_status") == "admitted": score += 5
        if pattern == "rbi_wilful_defaulter"    and facts.get("rbi_defaulter"):           score += 5
        if pattern == "multiple_director_resignations" and facts.get("resigned_directors", 0) > 1: score += 3

        # General relevance boost
        if facts.get("hard_flags") and score > 0:
            score += 2

        if score > 0:
            scored.append((score, {
                "summary": case["summary"],
                "outcome": case["outcome"],
                "lesson":  case["lesson"],
                "source":  case["source"],
            }))

    # Sort by relevance, return top 3
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:3]]


def _faiss_search(facts: dict) -> list:
    """FAISS semantic search — used when index exists."""
    import faiss
    import numpy as np

    with open(META_FILE) as f:
        meta = json.load(f)

    index = faiss.read_index(str(INDEX_FILE))

    # Build query text from facts
    query_text = (
        f"Company risk: VHS {facts.get('vhs_score')} {facts.get('risk_level')}. "
        f"Flags: {', '.join(facts.get('hard_flags', []) + facts.get('key_flags', [])[:3])}. "
        f"Court cases: {facts.get('active_court_cases', 0)}. "
        f"GST compliance: {facts.get('gst_compliance_pct', 'unknown')}%."
    )

    from llm_client import LLM
    # Use LLM to get embedding via Gemini embedding API
    # Falls back gracefully if embedding fails
    embedding = _get_embedding(query_text)
    if embedding is None:
        return []

    D, I = index.search(np.array([embedding], dtype=np.float32), k=3)
    results = []
    for idx in I[0]:
        if 0 <= idx < len(meta):
            results.append(meta[idx])

    return results


def _get_embedding(text: str):
    """Get embedding vector. Returns None on failure."""
    try:
        import google.generativeai as genai
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_query",
        )
        return result["embedding"]
    except Exception as e:
        logger.warning(f"Embedding failed: {e}")
        return None
