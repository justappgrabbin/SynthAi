"""
Collective outcome learning -- Neo4j (canonical) version.

Same guarantee as outcome_learning.py's SQLite version, enforced by the
graph schema instead of a table schema: no node or relationship in this
graph has a user_id property, anywhere. Not blanked, not hashed --
structurally absent, same as before.

Graph shape:
    (:Address {key, gate, line, color, tone, base})
        -[:HAD_OUTCOME]->
    (:Outcome {field_type, action_type, coherence_before, coherence_after,
               delta, recorded_at})

Why a graph over the SQLite version: the SQLite table can answer "what's
the pattern at this exact address" but not "what's the pattern across
addresses that are structurally close to this one" (same Gate, adjacent
Line, etc.) without an expensive self-join. In Neo4j that's a native
traversal -- see `similar_address_stats()` below, which the SQL version
can't do cleanly.

The k-anonymity floor (MIN_SAMPLE_SIZE) is enforced here exactly as in the
SQLite version -- ported, not weakened.
"""

from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional
from neo4j import Driver

MIN_SAMPLE_SIZE = 5          # public floor -- never shown, displayed, or disclosed below this
INTERNAL_MIN_SAMPLE_SIZE = 2  # system-only floor -- see get_pattern_stats_internal() below

# ---------------------------------------------------------------------------
# IMPORTANT: the public/internal split below is NOT just a display toggle.
#
# get_pattern_stats() enforces MIN_SAMPLE_SIZE=5 and is safe to expose in
# any API response, UI, or explanation -- "why did you suggest this" can
# safely quote these numbers.
#
# get_pattern_stats_internal() drops to n=2 so the system can act on early
# signal (steer a mission pick away from a pattern with early bad outcomes,
# for instance) WITHOUT disclosing that it's doing so. This is deliberately
# NOT n=1: a single outcome IS a specific person, full stop, no ambiguity.
# n=2 is still weak-to-nonexistent anonymity if it happens to be the same
# two people every time, so the hard rule for using this function is:
#
#   NEVER let an internal-tier stat influence the experience of a user
#   whose OWN outcome is one of the n<5 samples backing that stat. It's
#   fine to use it for aggregate model behavior (e.g. nudging which
#   mission text variant gets picked network-wide), but the moment it
#   reaches back to shape what the 1-2 people who generated the data see
#   or get, you've silently used their identifiable behavior on them
#   without telling them -- which is the exact harm the public floor
#   exists to prevent, just moved to a place nobody's watching.
#
# This isn't enforced by the function signature -- it can't be, the
# function has no way to know who's about to see the result. It's
# enforced by the caller's discipline. Flagging it here so it isn't lost.
# ---------------------------------------------------------------------------


def init_schema(driver: Driver) -> None:
    with driver.session() as session:
        session.run("CREATE CONSTRAINT address_key IF NOT EXISTS FOR (a:Address) REQUIRE a.key IS UNIQUE")


def _address_key(gate: int, line: int, color: int, tone: int, base: int) -> str:
    return f"{gate}.{line}.{color}.{tone}.{base}"


def record_outcome(driver: Driver, lattice_address: str, field_type: str, action_type: str,
                    coherence_before: float, coherence_after: float) -> None:
    """lattice_address is the 'gate.line.color.tone.base' string already
    produced by hd_engine.Placement.lattice_address -- no user_id passed in,
    none accepted, none stored."""
    gate, line, color, tone, base = (int(x) for x in lattice_address.split("."))
    delta = round(coherence_after - coherence_before, 4)

    with driver.session() as session:
        session.run(
            """
            MERGE (a:Address {key: $key})
              ON CREATE SET a.gate = $gate, a.line = $line, a.color = $color,
                             a.tone = $tone, a.base = $base
            CREATE (o:Outcome {
                field_type: $field_type, action_type: $action_type,
                coherence_before: $before, coherence_after: $after,
                delta: $delta, recorded_at: $recorded_at
            })
            CREATE (a)-[:HAD_OUTCOME]->(o)
            """,
            key=lattice_address, gate=gate, line=line, color=color, tone=tone, base=base,
            field_type=field_type, action_type=action_type,
            before=coherence_before, after=coherence_after, delta=delta,
            recorded_at=datetime.utcnow().isoformat(),
        )


@dataclass
class PatternStats:
    n: int
    mean_delta: float
    success_rate: float


def get_pattern_stats(driver: Driver, field_type: Optional[str] = None,
                       lattice_address: Optional[str] = None,
                       action_type: str = "mission_prescribed") -> Optional[PatternStats]:
    """Public tier. Safe to expose anywhere -- API responses, UI copy,
    explanations of why the system did something."""
    return _query_pattern_stats(driver, MIN_SAMPLE_SIZE, field_type, lattice_address, action_type)


def get_pattern_stats_internal(driver: Driver, field_type: Optional[str] = None,
                                lattice_address: Optional[str] = None,
                                action_type: str = "mission_prescribed") -> Optional[PatternStats]:
    """System-only tier. NEVER return this result in an API response, log
    line visible to the person it's about, or any user-facing copy. See the
    module-level comment above MIN_SAMPLE_SIZE for the actual rule: safe for
    aggregate model behavior, not safe for shaping what the 1-2
    contributing people themselves experience."""
    return _query_pattern_stats(driver, INTERNAL_MIN_SAMPLE_SIZE, field_type, lattice_address, action_type)


def _query_pattern_stats(driver: Driver, min_n: int, field_type: Optional[str],
                          lattice_address: Optional[str], action_type: str) -> Optional[PatternStats]:
    conditions = ["o.action_type = $action_type"]
    params: Dict = {"action_type": action_type}
    if field_type:
        conditions.append("o.field_type = $field_type")
        params["field_type"] = field_type
    if lattice_address:
        conditions.append("a.key = $key")
        params["key"] = lattice_address

    where = " AND ".join(conditions)
    query = f"""
        MATCH (a:Address)-[:HAD_OUTCOME]->(o:Outcome)
        WHERE {where}
        RETURN o.delta AS delta
    """

    with driver.session() as session:
        rows = list(session.run(query, **params))

    if len(rows) < min_n:
        return None

    deltas = [r["delta"] for r in rows]
    return PatternStats(
        n=len(deltas),
        mean_delta=round(sum(deltas) / len(deltas), 4),
        success_rate=round(sum(1 for d in deltas if d > 0) / len(deltas), 4),
    )


def similar_address_stats(driver: Driver, lattice_address: str, hops: int = 1,
                           action_type: str = "mission_prescribed") -> Optional[PatternStats]:
    """The query the SQLite version genuinely can't do well: outcomes from
    addresses that share the same Gate and are within `hops` Lines of this
    one -- a real graph traversal, not a table scan. Still enforces the
    same k-anonymity floor."""
    gate, line, _, _, _ = (int(x) for x in lattice_address.split("."))
    with driver.session() as session:
        rows = list(session.run(
            """
            MATCH (a:Address {gate: $gate})-[:HAD_OUTCOME]->(o:Outcome)
            WHERE abs(a.line - $line) <= $hops AND o.action_type = $action_type
            RETURN o.delta AS delta
            """,
            gate=gate, line=line, hops=hops, action_type=action_type,
        ))

    if len(rows) < MIN_SAMPLE_SIZE:
        return None

    deltas = [r["delta"] for r in rows]
    return PatternStats(
        n=len(deltas),
        mean_delta=round(sum(deltas) / len(deltas), 4),
        success_rate=round(sum(1 for d in deltas if d > 0) / len(deltas), 4),
    )
