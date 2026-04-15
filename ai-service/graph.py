"""
VendorIQ — LangGraph Analysis Pipeline
========================================
4-node pipeline:
  extract  → Pull structured facts from raw_data
  retrieve → Find similar fraud cases from FAISS index
  analyze  → Generate risk reasoning + recommendations
  narrate  → Write the final 800-word board-ready narrative

Each node is stateless — receives full state dict, returns updates.
"""

import asyncio
import logging
from typing import TypedDict, Optional

from langgraph.graph import StateGraph, END

from nodes.extract  import extract_node
from nodes.retrieve import retrieve_node
from nodes.analyze  import analyze_node
from nodes.narrate  import narrate_node

logger = logging.getLogger("vendoriq.graph")

# ── Pipeline State ─────────────────────────────────────────────
class PipelineState(TypedDict):
    # Inputs
    cin:         str
    vendor_name: str
    raw_data:    dict
    vhs_score:   int
    risk_level:  str
    hard_flags:  list
    key_flags:   list

    # Intermediate
    extracted_facts:  Optional[dict]
    similar_cases:    Optional[list]
    risk_reasoning:   Optional[str]
    conditions:       Optional[list]
    recommendation_reasons: Optional[list]

    # Output
    narrative: Optional[str]
    error:     Optional[str]


# ── Build graph ────────────────────────────────────────────────
def build_graph() -> StateGraph:
    graph = StateGraph(PipelineState)

    graph.add_node("extract",  extract_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("analyze",  analyze_node)
    graph.add_node("narrate",  narrate_node)

    graph.set_entry_point("extract")
    graph.add_edge("extract",  "retrieve")
    graph.add_edge("retrieve", "analyze")
    graph.add_edge("analyze",  "narrate")
    graph.add_edge("narrate",  END)

    return graph.compile()


# Singleton — compiled once at module load
_COMPILED_GRAPH = build_graph()


async def run_analysis_pipeline(
    cin: str,
    vendor_name: str,
    raw_data: dict,
    vhs_score: int,
    risk_level: str,
    hard_flags: list,
    key_flags: list,
) -> dict:
    """
    Entry point called by main.py /analyze endpoint.
    Returns narrative + supporting data.
    """
    initial_state: PipelineState = {
        "cin":         cin,
        "vendor_name": vendor_name,
        "raw_data":    raw_data,
        "vhs_score":   vhs_score,
        "risk_level":  risk_level,
        "hard_flags":  hard_flags,
        "key_flags":   key_flags,
        "extracted_facts":  None,
        "similar_cases":    None,
        "risk_reasoning":   None,
        "conditions":       None,
        "recommendation_reasons": None,
        "narrative": None,
        "error":     None,
    }

    logger.info(f"Pipeline starting | CIN={cin} | nodes=extract→retrieve→analyze→narrate")

    # LangGraph is sync — run in thread pool to avoid blocking FastAPI
    loop = asyncio.get_event_loop()
    final_state = await loop.run_in_executor(
        None,
        lambda: _COMPILED_GRAPH.invoke(initial_state)
    )

    if final_state.get("error"):
        logger.error(f"Pipeline error | {final_state['error']}")
        raise RuntimeError(final_state["error"])

    return {
        "narrative":              final_state.get("narrative", ""),
        "similar_cases":          final_state.get("similar_cases", []),
        "recommendation_reasons": final_state.get("recommendation_reasons", []),
        "conditions":             final_state.get("conditions", []),
    }
