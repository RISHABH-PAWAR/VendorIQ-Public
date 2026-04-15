"""
Node 4: Narrate
================
Generates the final 700-900 word board-ready narrative.
This is what the CFO/procurement head reads.

Tone: Bloomberg Intelligence brief — factual, direct, no fluff.
Format: 4 sections — Executive Summary, Risk Deep-Dive, Director Analysis, Recommendation
"""

import logging
from llm_client import LLM

logger = logging.getLogger("vendoriq.node.narrate")

SYSTEM_PROMPT = """You are a senior due diligence analyst writing vendor risk reports for 
Indian CFOs and procurement heads. Your reports are read by board members before approving 
large vendor contracts.

Writing style:
- Bloomberg Intelligence / McKinsey brief — precise, factual, direct
- No vague statements. Every claim backed by a data point.
- Numbers matter: quote scores, counts, dates, amounts
- Indian context: reference MCA, GST, SEBI, NCLT, RBI correctly
- Paragraphs, not bullet points in the narrative body
- Active voice. Short sentences. No corporate jargon.

Length: 700-900 words total across all 4 sections.
"""

def narrate_node(state: dict) -> dict:
    """Generate the final narrative — the core product deliverable."""
    facts    = state.get("extracted_facts", {})
    cases    = state.get("similar_cases", [])
    reasoning= state.get("risk_reasoning", "")
    reasons  = state.get("recommendation_reasons", [])
    conditions = state.get("conditions", [])
    vhs      = state.get("vhs_score", 0)
    risk     = state.get("risk_level", "HIGH")

    user_prompt = _build_narrative_prompt(facts, cases, reasoning, reasons, conditions, vhs, risk)

    try:
        narrative = LLM.complete(SYSTEM_PROMPT, user_prompt, temperature=0.3)
        # Strip any accidental markdown
        narrative = _clean_narrative(narrative)

        logger.info(f"Narrative generated | CIN={facts.get('cin')} | words={len(narrative.split())}")
        return {"narrative": narrative}

    except Exception as e:
        logger.error(f"Narrate node failed: {e}", exc_info=True)
        # Fallback — structured template narrative
        return {"narrative": _template_narrative(facts, vhs, risk, reasons, conditions)}


def _build_narrative_prompt(facts, cases, reasoning, reasons, conditions, vhs, risk) -> str:
    vendor = facts.get("vendor_name", "the company")
    cin    = facts.get("cin", "")
    age    = facts.get("age_years")
    state_ = facts.get("registered_state", "")
    capital= facts.get("paid_up_capital", 0)
    dirs   = facts.get("active_directors", 0)
    courts = facts.get("active_court_cases", 0)
    charges= facts.get("open_charges", 0)
    gst    = facts.get("gst_compliance_pct")
    news   = facts.get("negative_news_count", 0)
    flags  = facts.get("hard_flags", [])
    top_news = "\n  - ".join(facts.get("top_negative_news", [])[:3])
    case_text = ""
    if cases:
        c = cases[0]
        case_text = f'\nSIMILAR CASE CONTEXT: "{c.get("summary", "")}"\nOutcome: {c.get("outcome", "")}'

    risk_color = {"HIGH": "RED (REJECT)", "MEDIUM": "AMBER (INVESTIGATE)", "LOW": "GREEN (APPROVE)"}[risk]

    return f"""Write a 4-section vendor due diligence report for:

VENDOR: {vendor} (CIN: {cin})
VHS SCORE: {vhs}/100 — {risk_color}
Registered: {state_} | Age: {age} years | Capital: ₹{capital:,}
Directors (active): {dirs} | Open charges: {charges}
Active court cases: {courts} | GST compliance: {gst if gst is not None else 'unavailable'}%
Negative news: {news} articles
Hard disqualifiers: {', '.join(flags) if flags else 'None'}
Key flags: {' | '.join(reasons[:3]) if reasons else 'See score breakdown'}
{case_text}
Risk reasoning: {reasoning}

Write exactly these 4 sections (use these exact headers):

**EXECUTIVE SUMMARY**
2 paragraphs. Lead with the VHS score and recommendation. Name the company, score, and the single most important risk factor. Second paragraph: key business context (age, capital, incorporation state).

**RISK DEEP-DIVE**
3 paragraphs covering: (1) financial health — charges, capital adequacy; (2) legal exposure — court cases, NCLT, regulatory flags; (3) GST compliance and operational credibility.

**DIRECTOR ANALYSIS**
1-2 paragraphs. Cover director count, any disqualified DINs, recent resignations, and concentration risk.

**RECOMMENDATION**
1-2 paragraphs. Clear recommendation: APPROVE / APPROVE WITH CONDITIONS / INVESTIGATE / REJECT.
If conditions exist, list them as numbered points within the paragraph.
End with a 1-sentence summary of the primary risk driver.

Top negative news headlines (if any):
  - {top_news or 'No significant negative news found.'}

Important: Write in active voice. Quote the VHS score and data points throughout. No bullet points except inside conditions. Total length: 700-900 words.
"""


def _clean_narrative(text: str) -> str:
    """Remove accidental markdown artifacts."""
    text = text.strip()
    # Remove any JSON wrapping
    if text.startswith("{") or text.startswith("```"):
        return text
    # Normalize excessive blank lines
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text


def _template_narrative(facts, vhs, risk, reasons, conditions) -> str:
    """Fallback template if LLM fails."""
    vendor = facts.get("vendor_name", "The company")
    rec_map = {"HIGH": "REJECT", "MEDIUM": "INVESTIGATE", "LOW": "APPROVE"}
    recommendation = rec_map.get(risk, "INVESTIGATE")

    cond_text = ""
    if conditions:
        cond_text = "The following conditions must be satisfied before proceeding:\n"
        cond_text += "\n".join(f"{i+1}. {c}" for i, c in enumerate(conditions))

    return f"""**EXECUTIVE SUMMARY**

{vendor} has been assigned a Vendor Health Score (VHS) of {vhs}/100, placing it in the {risk} risk category. Our analysis recommends: {recommendation}. {"The company has triggered one or more hard disqualifiers that prevent approval." if risk == "HIGH" else "The company presents risk factors that require further investigation before onboarding."}

**RISK DEEP-DIVE**

Financial analysis indicates {facts.get("open_charges", 0)} open charge(s) registered against the company with a paid-up capital of ₹{facts.get("paid_up_capital", 0):,}. {"This capital base is insufficient relative to the debt burden." if facts.get("open_charges", 0) > 5 else "The financial structure is within acceptable parameters."}

Legal exposure assessment found {facts.get("active_court_cases", 0)} active court case(s). {"Criminal cases have been identified, which significantly elevates risk." if facts.get("criminal_cases", 0) > 0 else "No criminal proceedings are active at this time."}

GST compliance stands at {"{}% over the last 12 months, which is below the 80% threshold for reliable B2B counterparties.".format(facts.get("gst_compliance_pct")) if facts.get("gst_compliance_pct") and facts.get("gst_compliance_pct") < 80 else "acceptable levels based on available data."}

**DIRECTOR ANALYSIS**

The company has {facts.get("active_directors", 0)} active director(s). {"One or more directors have disqualified DINs under Section 164(2) of the Companies Act — this is a hard disqualifier." if facts.get("disqualified_dins") else "No director disqualifications were identified in the MCA database."} {"Recent director resignations have been noted, which may indicate internal governance concerns." if facts.get("resigned_directors", 0) > 1 else ""}

**RECOMMENDATION**

Based on the comprehensive analysis, VendorIQ recommends: **{recommendation}** for {vendor}.

{cond_text}

Primary risk driver: {"Hard disqualifier — " + facts.get("hard_flags", ["unknown"])[0] if facts.get("hard_flags") else reasons[0] if reasons else f"VHS score of {vhs}/100 indicates elevated risk."}
"""
