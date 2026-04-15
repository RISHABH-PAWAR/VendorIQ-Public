"""
Node 3: Analyze
================
Uses Gemini to reason about the risk profile and generate:
  - Recommendation rationale (3-5 bullet reasons)
  - Conditions for approval (if MEDIUM/INVESTIGATE)
  - Risk summary for the narrate node
"""

import json
import logging
from llm_client import LLM

logger = logging.getLogger("vendoriq.node.analyze")

SYSTEM_PROMPT = """You are a senior credit risk analyst at a top Indian bank, specializing in 
vendor due diligence. You have 15+ years of experience analyzing Indian SMEs and corporates.

You analyze structured data about Indian companies and provide:
1. Clear, concise risk reasoning (not verbose)
2. Specific, actionable approval conditions
3. Honest assessment — you do not sugarcoat risks

Output ONLY valid JSON. No markdown, no explanation outside the JSON.
"""

def analyze_node(state: dict) -> dict:
    """Generate risk reasoning and conditions via LLM."""
    facts   = state.get("extracted_facts", {})
    cases   = state.get("similar_cases", [])
    vhs     = state.get("vhs_score", 0)
    risk    = state.get("risk_level", "HIGH")
    hard_flags = state.get("hard_flags", [])
    key_flags  = state.get("key_flags", [])

    # Build compact context for LLM (keep tokens minimal)
    context = _build_context(facts, vhs, risk, hard_flags, key_flags, cases)

    user_prompt = f"""Analyze this Indian company's risk profile and return JSON.

{context}

Return this exact JSON structure:
{{
  "recommendation_reasons": [
    "Specific reason 1 (max 15 words)",
    "Specific reason 2 (max 15 words)",
    "Specific reason 3 (max 15 words)"
  ],
  "conditions": [
    "Condition 1 if MEDIUM risk — what buyer should verify before proceeding",
    "Condition 2 (optional)"
  ],
  "risk_summary": "2-3 sentence technical risk summary for the narrative writer",
  "key_concern": "Single most important risk factor in one sentence"
}}

Rules:
- recommendation_reasons: 3-5 items, each under 15 words, factual not generic
- conditions: empty array [] if risk is LOW, 2-4 items if MEDIUM, 1 item ("Do not proceed") if HIGH
- risk_summary: used internally — be technical and specific
- key_concern: the #1 thing a CFO should know
"""

    try:
        raw = LLM.complete(SYSTEM_PROMPT, user_prompt, temperature=0.15)
        result = _parse_json(raw)

        logger.info(
            f"Analysis done | CIN={facts.get('cin')} | "
            f"reasons={len(result.get('recommendation_reasons', []))} | "
            f"conditions={len(result.get('conditions', []))}"
        )

        return {
            "recommendation_reasons": result.get("recommendation_reasons", []),
            "conditions":             result.get("conditions", []),
            "risk_reasoning":         result.get("risk_summary", ""),
        }

    except Exception as e:
        logger.error(f"Analyze node failed: {e}", exc_info=True)
        # Fallback — rule-based reasons
        return {
            "recommendation_reasons": _fallback_reasons(facts, vhs, risk, hard_flags),
            "conditions":             _fallback_conditions(risk),
            "risk_reasoning":         f"VHS {vhs}/100 — {risk} risk profile.",
        }


def _build_context(facts, vhs, risk, hard_flags, key_flags, cases) -> str:
    parts = [
        f"COMPANY: {facts.get('vendor_name', 'Unknown')} (CIN: {facts.get('cin', '')})",
        f"VHS SCORE: {vhs}/100 | RISK: {risk}",
        f"Company age: {facts.get('age_years', 'unknown')} years | Status: {facts.get('company_status', '')}",
        f"Paid-up capital: ₹{facts.get('paid_up_capital', 0):,}",
        f"Open charges: {facts.get('open_charges', 0)} | Active court cases: {facts.get('active_court_cases', 0)}",
        f"GST compliance: {facts.get('gst_compliance_pct', 'unknown')}% (last 12 months)",
        f"Active directors: {facts.get('active_directors', 0)} | Resigned recently: {facts.get('resigned_directors', 0)}",
        f"Negative news articles: {facts.get('negative_news_count', 0)}",
    ]

    if hard_flags:
        parts.append(f"HARD DISQUALIFIERS: {', '.join([f.get('code', f) if isinstance(f, dict) else f for f in hard_flags])}")

    if key_flags:
        parts.append(f"KEY FLAGS: {' | '.join(key_flags[:5])}")

    if cases:
        parts.append(f"SIMILAR CASE: {cases[0].get('summary', '')[:100]}...")

    return "\n".join(parts)


def _parse_json(raw: str) -> dict:
    """Extract JSON from LLM response, handling common formatting issues."""
    raw = raw.strip()
    # Strip markdown code fences
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    # Find JSON object
    start = raw.find("{")
    end   = raw.rfind("}") + 1
    if start >= 0 and end > start:
        raw = raw[start:end]
    return json.loads(raw)


def _fallback_reasons(facts, vhs, risk, hard_flags) -> list:
    reasons = []
    if vhs < 40:
        reasons.append(f"VHS score {vhs}/100 indicates HIGH risk profile")
    if hard_flags:
        reasons.append(f"Hard disqualifier triggered: {hard_flags[0].get('code', hard_flags[0]) if hard_flags else ''}")
    if facts.get("active_court_cases", 0) > 5:
        reasons.append(f"{facts['active_court_cases']} active court cases indicate legal exposure")
    if (facts.get("gst_compliance_pct") or 100) < 70:
        reasons.append(f"GST compliance at {facts.get('gst_compliance_pct')}% — below acceptable threshold")
    if facts.get("open_charges", 0) > 5:
        reasons.append(f"{facts['open_charges']} open charges suggest high debt burden")
    return reasons[:5] or [f"Risk level is {risk} based on VHS score of {vhs}"]


def _fallback_conditions(risk) -> list:
    if risk == "HIGH":
        return ["Do not proceed — hard disqualifiers present"]
    if risk == "MEDIUM":
        return [
            "Obtain bank guarantee or advance payment security",
            "Verify GST returns independently before payment",
            "Cap credit exposure to ₹10 lakhs until risk improves",
        ]
    return []
