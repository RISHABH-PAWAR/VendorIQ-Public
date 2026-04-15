"""
Node 1: Extract
================
Pulls structured, LLM-digestible facts from the raw_data blob.
Avoids passing the full raw_data to the LLM (too large, expensive).
Instead builds a compact fact sheet used by all downstream nodes.
"""

import logging
from datetime import datetime

logger = logging.getLogger("vendoriq.node.extract")


def extract_node(state: dict) -> dict:
    """Extract structured facts — no LLM call, pure Python."""
    raw    = state.get("raw_data", {})
    mca    = raw.get("mca_data") or {}
    dirs   = (raw.get("director_data") or {}).get("directors", [])
    gst    = raw.get("gst_data") or raw.get("gst_portal_data") or {}
    charges= raw.get("charges_data") or {}
    courts = raw.get("courts_data") or {}
    nclt   = raw.get("nclt_data") or {}
    news   = raw.get("news_rss") or {}
    checks = raw.get("local_checks") or {}
    exchange = raw.get("exchange_data") or {}

    # ── Company basics ──────────────────────────────────────────
    inc_date = mca.get("date_of_incorporation")
    age_years = None
    if inc_date:
        try:
            dt = datetime.strptime(str(inc_date)[:10], "%Y-%m-%d")
            age_years = round((datetime.now() - dt).days / 365.25, 1)
        except Exception:
            pass

    # ── Director summary ────────────────────────────────────────
    active_dirs = [d for d in dirs if not d.get("cessation_date")]
    resigned_dirs = [d for d in dirs if d.get("cessation_date")]
    disq_dins = checks.get("disqualified_dins", [])

    # ── Financial indicators ─────────────────────────────────────
    open_charges    = charges.get("open_charges_count", 0)
    paid_up_capital = mca.get("paid_up_capital", 0)

    # ── GST compliance ───────────────────────────────────────────
    filings = gst.get("filing_history", [])
    last12  = filings[:12] if filings else []
    gst_compliance = round(
        sum(1 for f in last12 if f.get("filed")) / len(last12) * 100
    ) if last12 else None

    # ── Legal exposure ───────────────────────────────────────────
    active_cases   = courts.get("active_cases_count", 0)
    criminal_cases = courts.get("criminal_cases_count", 0)
    nclt_status    = nclt.get("cirp_status", "none")

    # ── News signals ─────────────────────────────────────────────
    articles     = news.get("articles", [])
    neg_articles = [a for a in articles if a.get("sentiment") == "negative"]
    top_neg_news = [a.get("title", "") for a in neg_articles[:5]]

    facts = {
        # Identity
        "cin":              state.get("cin"),
        "vendor_name":      state.get("vendor_name"),
        "company_status":   mca.get("company_status", "Unknown"),
        "company_type":     mca.get("company_type", ""),
        "age_years":        age_years,
        "registered_state": mca.get("registered_state", ""),
        "industry":         mca.get("industry_activity", ""),

        # Capital
        "authorised_capital": mca.get("authorised_capital", 0),
        "paid_up_capital":    paid_up_capital,

        # Directors
        "total_directors":   len(dirs),
        "active_directors":  len(active_dirs),
        "resigned_directors":len(resigned_dirs),
        "disqualified_dins": disq_dins,
        "director_names":    [d.get("name", "") for d in active_dirs[:5]],

        # Financial
        "open_charges":          open_charges,
        "satisfied_charges":     charges.get("satisfied_charges_count", 0),

        # GST
        "gstin":             gst.get("gstin", ""),
        "gst_status":        gst.get("gstin_status", ""),
        "gst_compliance_pct":gst_compliance,
        "gst_returns_filed": sum(1 for f in last12 if f.get("filed")),
        "gst_returns_due":   len(last12),

        # Legal
        "active_court_cases":  active_cases,
        "criminal_cases":      criminal_cases,
        "nclt_status":         nclt_status,

        # Flags
        "rbi_defaulter":    checks.get("rbi_defaulter", False),
        "sfio_active":      checks.get("sfio_active", False),
        "sebi_debarred":    checks.get("sebi_debarred", False),
        "gem_blacklisted":  checks.get("gem_blacklisted", False),

        # Exchange
        "listed":           exchange.get("listed", False),
        "exchange":         exchange.get("source", ""),

        # News
        "negative_news_count": len(neg_articles),
        "top_negative_news":   top_neg_news,

        # Scoring
        "vhs_score":   state.get("vhs_score"),
        "risk_level":  state.get("risk_level"),
        "hard_flags":  [f.get("code") for f in state.get("hard_flags", [])],
        "key_flags":   [f.get("message") for f in state.get("key_flags", [])[:10]],
    }

    logger.info(f"Facts extracted | CIN={facts['cin']} | age={age_years}yr | courts={active_cases} | news_neg={len(neg_articles)}")

    return {"extracted_facts": facts}
