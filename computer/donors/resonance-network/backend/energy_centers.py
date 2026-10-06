"""
energy_centers.py -- the ISO-organism spine.

Maps the 9 real Human Design centers (already computed per-user by
hd_engine.py from actual gate/channel activation -- not invented here) to
9 real subsystems ("hubs") that already exist in this project:

    Head    -> AUTOLING    (backend/autoling.py)       -- language/tagging
    Ajna    -> SYNTHESIST  (backend/synthesist_engine.py) -- claim verification
    Throat  -> MESSI       (hub-services/src/messi.ts)  -- expression/interface
    G       -> AUTONOVEL   (hub-services/src/autonovel.ts) -- identity/narrative
    Ego     -> DEVCORE     (hub-services/src/devcore.ts) -- willpower to actually build
    Spleen  -> DISEMINER   (backend/diseminer_engine.py) -- pattern/instinct sensing
    Solar   -> VALORA      (hub-services/src/valora.ts)  -- emotional/value flow
    Sacral  -> MESHWEAVE   (hub-services/src/meshweave.ts) -- generative connection
    Root    -> MCP-HUB     (hub-services/src/mcp-hub.ts) -- the only bridge outward

This mapping is a design decision made explicit here, not a claim of
"the one true" original mapping -- the source files disagreed with each
other about hub numbering (see docs), so this reconciles them by matching
each hub's real function to the HD center it fits best, and documents
that choice instead of hiding it.

Core rule this module enforces (per spec): a Defined center is a stable,
always-on trait -- that hub runs eagerly. An Undefined/Open center is
adaptive -- that hub runs in a passive/listen-only mode, taking cues
from other centers' output rather than initiating on its own.

Root/MCP-HUB gets one additional, harder rule on top of Defined/Open:
regardless of whether Root is defined for a given user, the MCP-Hub hub
never contacts an external LLM/service for that user until
mark_coherent_output_ready() has been called for them. Before that, it
stays fully local -- observing, not reaching out. This is enforced here
in Python (the one place all API calls pass through), not left to the
TS hub to self-police.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Literal
import sqlite3
import time

from hd_engine import CENTERS

CenterState = Literal["Defined", "Undefined", "Open"]
HubMode = Literal["active", "receptive", "dormant"]

# The one explicit, documented mapping. Order matches CENTERS' natural
# head-to-root reading order, not hub-number order (those numbers
# conflicted across source files).
CENTER_TO_HUB: Dict[str, Dict[str, str]] = {
    "Head":   {"hub": "AUTOLING",   "runtime": "python", "module": "autoling.py"},
    "Ajna":   {"hub": "SYNTHESIST", "runtime": "python", "module": "synthesist_engine.py"},
    "Throat": {"hub": "MESSI",      "runtime": "node",   "module": "messi.ts"},
    "G":      {"hub": "AUTONOVEL",  "runtime": "node",   "module": "autonovel.ts"},
    "Ego":    {"hub": "DEVCORE",    "runtime": "node",   "module": "devcore.ts"},
    "Spleen": {"hub": "DISEMINER",  "runtime": "python", "module": "diseminer_engine.py"},
    "Solar":  {"hub": "VALORA",     "runtime": "node",   "module": "valora.ts"},
    "Sacral": {"hub": "MESHWEAVE",  "runtime": "node",   "module": "meshweave.ts"},
    "Root":   {"hub": "MCP-HUB",    "runtime": "node",   "module": "mcp-hub.ts"},
}

assert set(CENTER_TO_HUB.keys()) == set(CENTERS.keys()), \
    "energy_centers.py's mapping has drifted from hd_engine.py's real CENTERS table"


@dataclass
class HubStatus:
    center: str
    hub: str
    center_state: CenterState
    mode: HubMode
    external_reach_allowed: bool = False  # only ever True for MCP-HUB, and only post-gate


def _mode_for_state(state: CenterState) -> HubMode:
    return "active" if state == "Defined" else "receptive"


def compute_organism_status(center_states: Dict[str, CenterState], user_id: str, conn: sqlite3.Connection) -> List[HubStatus]:
    """Real per-user computation, not a static table: reads this user's
    actual defined/open centers (from their real chart) and this user's
    actual finalize-flag row (see mark_coherent_output_ready) to decide
    whether MCP-HUB may reach outward for them specifically."""
    ready = _is_coherent_output_ready(conn, user_id)
    statuses = []
    for center, meta in CENTER_TO_HUB.items():
        state = center_states.get(center, "Open")
        mode = _mode_for_state(state)
        if meta["hub"] == "MCP-HUB":
            external_reach_allowed = ready
            if not ready:
                mode = "dormant"  # Root/MCP-HUB stays dormant regardless of definition until gated open
        else:
            external_reach_allowed = False
        statuses.append(HubStatus(
            center=center,
            hub=meta["hub"],
            center_state=state,
            mode=mode,
            external_reach_allowed=external_reach_allowed,
        ))
    return statuses


# ---------------------------------------------------------------------------
# Persistence for the finalize gate -- one row per user, real SQLite, not
# an in-memory flag that would reset on every restart.
# ---------------------------------------------------------------------------

def init_organism_tables(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS organism_gate (
            user_id TEXT PRIMARY KEY,
            coherent_output_ready INTEGER NOT NULL DEFAULT 0,
            ready_summary TEXT,
            marked_at REAL
        )
    """)
    conn.commit()


def _is_coherent_output_ready(conn: sqlite3.Connection, user_id: str) -> bool:
    row = conn.execute(
        "SELECT coherent_output_ready FROM organism_gate WHERE user_id = ?", (user_id,)
    ).fetchone()
    return bool(row[0]) if row else False


def mark_coherent_output_ready(conn: sqlite3.Connection, user_id: str, summary: str) -> None:
    """Called only when the other 8 centers have produced something the
    user has actually reviewed and confirmed -- this is the one function
    that unlocks Root/MCP-HUB's external_reach_allowed for that user.
    Never called automatically from inside this module."""
    conn.execute(
        """INSERT INTO organism_gate (user_id, coherent_output_ready, ready_summary, marked_at)
           VALUES (?, 1, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             coherent_output_ready = 1, ready_summary = excluded.ready_summary, marked_at = excluded.marked_at""",
        (user_id, summary, time.time()),
    )
    conn.commit()


def revoke_coherent_output_ready(conn: sqlite3.Connection, user_id: str) -> None:
    conn.execute(
        "UPDATE organism_gate SET coherent_output_ready = 0 WHERE user_id = ?", (user_id,)
    )
    conn.commit()
