"""
Collective outcome learning.

Two tables, two different privacy properties:

  - `mission_tracking` (private): has user_id. This is just "what did we
    tell this person yesterday, and what was their field coherence at the
    time" -- needed to compute a delta the next day. Same access rules as
    the rest of their profile.

  - `collective_outcomes` (public/anonymized): NO user_id column at all --
    not blanked, not hashed, structurally absent. Keyed on
    Gate.Line.Color.Tone.Base (hd_engine.Placement.lattice_address), which
    many different people will share over time, unlike raw degree/minute/
    second/arcsecond. This is the table mission_advisor.py can eventually
    learn from.

K-anonymity floor: get_pattern_stats() will not return a statistic unless
at least MIN_SAMPLE_SIZE distinct outcome rows contributed to it. A rare
lattice address with only 1-2 outcomes ever logged is still identifying
even with no user_id column, because the row's rarity alone re-identifies
whoever it came from. The floor is enforced here, not left to callers to
remember.
"""

from __future__ import annotations
from dataclasses import dataclass
from datetime import date, datetime
from typing import Dict, List, Optional
import sqlite3

MIN_SAMPLE_SIZE = 5
INTERNAL_MIN_SAMPLE_SIZE = 2  # system-only floor -- see get_pattern_stats_internal()


def init_outcome_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS mission_tracking (
        user_id TEXT, tracked_date TEXT, target_field TEXT, variant_index INTEGER,
        field_coherence REAL, overall_coherence REAL,
        PRIMARY KEY (user_id, tracked_date)
    );
    CREATE TABLE IF NOT EXISTS collective_outcomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lattice_address TEXT NOT NULL,
        field_type TEXT NOT NULL,
        action_type TEXT NOT NULL,
        coherence_before REAL NOT NULL,
        coherence_after REAL NOT NULL,
        delta REAL NOT NULL,
        recorded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outcomes_lookup
        ON collective_outcomes (lattice_address, field_type, action_type);
    """)
    conn.commit()


@dataclass
class PatternStats:
    n: int
    mean_delta: float
    success_rate: float  # fraction of outcomes where coherence improved


def record_mission_given(conn: sqlite3.Connection, user_id: str, target_field: str,
                          field_coherence: float, overall_coherence: float,
                          variant_index: int = 0, for_date: Optional[date] = None) -> None:
    """Called every time a mission is generated. Private table, has user_id.
    variant_index is which OPTIMAL_VECTORS text was shown -- needed so
    tomorrow's outcome can be attributed to that specific variant, which is
    what lets mission_advisor's post-deterministic picker actually learn
    which variant performs best (see mission_advisor._evidence_weighted_pick)."""
    d = (for_date or date.today()).isoformat()
    conn.execute(
        "INSERT INTO mission_tracking (user_id, tracked_date, target_field, variant_index, field_coherence, overall_coherence) "
        "VALUES (?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(user_id, tracked_date) DO UPDATE SET target_field=excluded.target_field, "
        "variant_index=excluded.variant_index, "
        "field_coherence=excluded.field_coherence, overall_coherence=excluded.overall_coherence",
        (user_id, d, target_field, variant_index, field_coherence, overall_coherence),
    )
    conn.commit()


def close_the_loop(conn: sqlite3.Connection, user_id: str, feeder_gate_addresses: List[str],
                    current_field_coherences: Dict[str, float], for_date: Optional[date] = None) -> int:
    """Called when a NEW mission is about to be generated. Looks up
    yesterday's tracked mission for this user; if one exists, computes the
    real coherence delta for the field that was targeted, and logs one
    anonymized outcome row per feeder gate active in that field (real gates
    from the user's actual chart, not synthetic). The action_type encodes
    WHICH variant was shown (optimal_vector_variant_N), so future picks can
    be informed per-variant, not just per-field. Returns how many rows
    were logged (0 if there was nothing to close out, e.g. first-ever
    mission for this user).
    """
    today = for_date or date.today()
    yesterday = today.toordinal() - 1
    from datetime import date as _date
    yesterday_str = _date.fromordinal(yesterday).isoformat()

    row = conn.execute(
        "SELECT * FROM mission_tracking WHERE user_id = ? AND tracked_date = ?",
        (user_id, yesterday_str),
    ).fetchone()
    if not row:
        return 0

    target_field = row["target_field"]
    variant_index = row["variant_index"] if "variant_index" in row.keys() else 0
    before = row["field_coherence"]
    after = current_field_coherences.get(target_field)
    if after is None:
        return 0

    delta = round(after - before, 4)
    now_iso = datetime.utcnow().isoformat()
    action_type = f"optimal_vector_variant_{variant_index}"
    logged = 0
    for addr in feeder_gate_addresses:
        conn.execute(
            "INSERT INTO collective_outcomes "
            "(lattice_address, field_type, action_type, coherence_before, coherence_after, delta, recorded_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (addr, target_field, action_type, before, after, delta, now_iso),
        )
        logged += 1
    conn.commit()
    return logged


def record_anonymized_outcome(conn: sqlite3.Connection, lattice_address: str, field_type: str,
                               action_type: str, coherence_before: float, coherence_after: float) -> None:
    """For outcomes reported IN from a sovereign edge instance that already
    computed its own before/after delta locally and is sending only the
    anonymized result. Unlike close_the_loop(), this doesn't look up any
    user_id -- there's no user_id to look up, by construction. This is the
    hub-side landing function for /api/outcomes/report."""
    delta = round(coherence_after - coherence_before, 4)
    conn.execute(
        "INSERT INTO collective_outcomes "
        "(lattice_address, field_type, action_type, coherence_before, coherence_after, delta, recorded_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (lattice_address, field_type, action_type, coherence_before, coherence_after, delta,
         datetime.utcnow().isoformat()),
    )
    conn.commit()


def get_pattern_stats(conn: sqlite3.Connection, field_type: Optional[str] = None,
                       lattice_address: Optional[str] = None,
                       action_type: str = "mission_prescribed") -> Optional[PatternStats]:
    """Public tier. Safe to expose anywhere -- API responses, UI copy,
    explanations of why the system did something."""
    return _query_pattern_stats(conn, MIN_SAMPLE_SIZE, field_type, lattice_address, action_type)


def get_pattern_stats_internal(conn: sqlite3.Connection, field_type: Optional[str] = None,
                                lattice_address: Optional[str] = None,
                                action_type: str = "mission_prescribed") -> Optional[PatternStats]:
    """System-only tier (n>=2 instead of n>=5). NEVER return this in an API
    response or any user-facing copy -- see the module-level comment in
    neo4j_outcomes.py (the canonical version of this split) for the actual
    rule: safe for aggregate model behavior, not safe for shaping what the
    1-2 contributing people themselves experience."""
    return _query_pattern_stats(conn, INTERNAL_MIN_SAMPLE_SIZE, field_type, lattice_address, action_type)


def _query_pattern_stats(conn: sqlite3.Connection, min_n: int, field_type: Optional[str],
                          lattice_address: Optional[str], action_type: str) -> Optional[PatternStats]:
    query = "SELECT delta FROM collective_outcomes WHERE action_type = ?"
    params: List = [action_type]
    if field_type:
        query += " AND field_type = ?"
        params.append(field_type)
    if lattice_address:
        query += " AND lattice_address = ?"
        params.append(lattice_address)

    rows = conn.execute(query, params).fetchall()
    if len(rows) < min_n:
        return None

    deltas = [r["delta"] for r in rows]
    return PatternStats(
        n=len(deltas),
        mean_delta=round(sum(deltas) / len(deltas), 4),
        success_rate=round(sum(1 for d in deltas if d > 0) / len(deltas), 4),
    )
