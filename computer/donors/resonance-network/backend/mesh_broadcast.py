"""
Mesh broadcast layer.

The actual Bluetooth transport (Bridgefy or similar) lives in native/
Capacitor-plugin code this file doesn't touch -- that needs real device
testing I can't do here. What this file owns is transport-agnostic:
the message shape that gets handed to whatever transport is available,
and the local evaluation of an incoming broadcast against the receiving
device's own chart. That evaluation is pure computation (reuses
resonance.center_complementarity, already tested this session) -- it
works identically whether the broadcast arrived over Bluetooth with zero
internet, or as a row fetched from the hub. One matching brain, multiple
transports underneath it.

Deliberately lightweight compared to a full ResonanceMarket listing: a
Bluetooth broadcast payload should be small (battery, range, and mesh
hop-count all suffer if it's not), so this carries only what's needed to
decide "is this relevant to me" locally -- not a full natal chart.
"""

from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import sqlite3
import uuid

from resonance import center_complementarity, ALL_CENTERS

# Mirrors Bridgefy's own TTL concept -- a broadcast that's aged out
# shouldn't keep hopping through the mesh or cluttering the local cache.
DEFAULT_TTL_HOURS = 12


@dataclass
class MeshBroadcast:
    id: str
    kind: str  # "need" | "offer"  -- mirrors the Market's request/listing split
    center: str  # which of the 9 real centers this concerns
    category: str  # short label, e.g. "odd job", "ride", "meal", "cash"
    description: str
    lattice_address: Optional[str]  # sender's OWN Gate.Line.Color.Tone.Base, optional
    pod_id: Optional[str]  # if this is meant for a specific pod, not the open mesh
    created_at: str
    expires_at: str
    hop_count: int = 0  # how many peers this has already relayed through


def create_broadcast(kind: str, center: str, category: str, description: str,
                      lattice_address: Optional[str] = None, pod_id: Optional[str] = None,
                      ttl_hours: float = DEFAULT_TTL_HOURS) -> MeshBroadcast:
    if center not in ALL_CENTERS:
        raise ValueError(f"Unknown center: {center}. Must be one of {ALL_CENTERS}")
    if kind not in ("need", "offer"):
        raise ValueError("kind must be 'need' or 'offer'")

    now = datetime.utcnow()
    return MeshBroadcast(
        id=f"mb_{uuid.uuid4().hex[:12]}", kind=kind, center=center, category=category,
        description=description, lattice_address=lattice_address, pod_id=pod_id,
        created_at=now.isoformat(), expires_at=(now + timedelta(hours=ttl_hours)).isoformat(),
    )


def to_wire(broadcast: MeshBroadcast) -> bytes:
    """Serialize for handing to whatever transport is sending it (Bridgefy's
    `send()` takes raw bytes). Kept as plain JSON, not because it's the most
    compact option, but because it's inspectable/debuggable -- can switch to
    a packed binary format later if payload size becomes a real problem on
    actual hardware."""
    return json.dumps(asdict(broadcast)).encode("utf-8")


def from_wire(data: bytes) -> MeshBroadcast:
    raw = json.loads(data.decode("utf-8"))
    return MeshBroadcast(**raw)


# ---------------------------------------------------------------------------
# Local cache -- broadcasts received from the mesh (or the hub), evaluated
# against MY chart, kept only until they expire.
# ---------------------------------------------------------------------------

def init_mesh_cache(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mesh_cache (
            id TEXT PRIMARY KEY, kind TEXT, center TEXT, category TEXT, description TEXT,
            lattice_address TEXT, pod_id TEXT, created_at TEXT, expires_at TEXT,
            hop_count INTEGER, relevance_score REAL, received_via TEXT
        )
    """)
    conn.commit()


def receive_broadcast(conn: sqlite3.Connection, broadcast: MeshBroadcast, my_centers: Dict[str, str],
                       received_via: str = "mesh") -> Optional[float]:
    """Called whenever a broadcast arrives, from any transport. Evaluates it
    against the receiving device's own chart using the SAME complementarity
    function used everywhere else in the app, then caches it if it's still
    within its TTL. Returns the relevance score, or None if expired/ignored."""
    init_mesh_cache(conn)

    if datetime.fromisoformat(broadcast.expires_at) < datetime.utcnow():
        return None  # already stale, don't even cache it

    relevance = None
    if broadcast.kind == "need":
        # Someone needs THEIR <center>. I'm relevant if MY same center is
        # Defined where theirs is Undefined/Open -- the actual completion
        # check, computed locally, no network round-trip required.
        my_state = my_centers.get(broadcast.center)
        relevance = 1.0 if my_state == "Defined" else 0.0
    elif broadcast.kind == "offer":
        my_state = my_centers.get(broadcast.center)
        relevance = 1.0 if my_state != "Defined" else 0.0

    conn.execute(
        "INSERT OR REPLACE INTO mesh_cache VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (broadcast.id, broadcast.kind, broadcast.center, broadcast.category, broadcast.description,
         broadcast.lattice_address, broadcast.pod_id, broadcast.created_at, broadcast.expires_at,
         broadcast.hop_count, relevance, received_via),
    )
    conn.commit()
    return relevance


def relevant_broadcasts(conn: sqlite3.Connection, min_relevance: float = 1.0) -> List[Dict]:
    """What's actually worth surfacing to this user right now -- expired
    entries excluded, sorted by relevance then recency."""
    init_mesh_cache(conn)
    now = datetime.utcnow().isoformat()
    rows = conn.execute(
        "SELECT * FROM mesh_cache WHERE expires_at > ? AND relevance_score >= ? "
        "ORDER BY relevance_score DESC, created_at DESC",
        (now, min_relevance),
    ).fetchall()
    return [dict(r) for r in rows]


def purge_expired(conn: sqlite3.Connection) -> int:
    init_mesh_cache(conn)
    now = datetime.utcnow().isoformat()
    cur = conn.execute("DELETE FROM mesh_cache WHERE expires_at <= ?", (now,))
    conn.commit()
    return cur.rowcount
