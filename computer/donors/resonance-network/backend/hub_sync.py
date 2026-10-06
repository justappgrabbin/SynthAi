"""
Sovereign edge client.

Runs on each user's own device (Termux, or wherever their sovereign
instance lives). This is the ONLY piece of the sovereign side that talks
to the network, and it only ever pushes -- the hub never calls in. What it
sends is exactly the anonymized outcome row (lattice address + field +
before/after coherence), nothing else. Natal charts, daily logs, mission
history: none of that is in this file's vocabulary, by construction --
this module doesn't even import anything that could read them.

Offline handling matters here specifically because this runs on a phone:
if the hub is unreachable, the report gets queued in a local table and
retried on the next successful call, instead of being silently lost or
crashing the mission flow.
"""

from __future__ import annotations
import sqlite3
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Optional


def init_sync_queue(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pending_hub_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lattice_address TEXT NOT NULL,
            field_type TEXT NOT NULL,
            action_type TEXT NOT NULL,
            coherence_before REAL NOT NULL,
            coherence_after REAL NOT NULL,
            queued_at TEXT NOT NULL
        )
    """)
    conn.commit()


def _post(hub_url: str, payload: dict, timeout: float = 5.0) -> bool:
    """Real HTTP POST, no framework dependency (this needs to run standalone
    on-device). Returns True on success, False on any failure -- network
    down, hub down, timeout. Never raises up to the caller; a sovereign
    instance's own local functioning must never depend on the hub being
    reachable."""
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{hub_url.rstrip('/')}/api/outcomes/report", data=data,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def report_outcome(conn: sqlite3.Connection, hub_url: str, lattice_address: str,
                    field_type: str, coherence_before: float, coherence_after: float,
                    action_type: str = "mission_prescribed") -> bool:
    """Try to report now; if the hub's unreachable, queue it instead of
    losing it. Returns True if it made it out (now or from the queue),
    False if it's sitting queued."""
    init_sync_queue(conn)
    payload = {
        "lattice_address": lattice_address, "field_type": field_type,
        "action_type": action_type, "coherence_before": coherence_before,
        "coherence_after": coherence_after,
    }

    if _post(hub_url, payload):
        flush_pending_reports(conn, hub_url)  # while we're online, clear any backlog too
        return True

    conn.execute(
        "INSERT INTO pending_hub_reports "
        "(lattice_address, field_type, action_type, coherence_before, coherence_after, queued_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (lattice_address, field_type, action_type, coherence_before, coherence_after,
         datetime.utcnow().isoformat()),
    )
    conn.commit()
    return False


def flush_pending_reports(conn: sqlite3.Connection, hub_url: str) -> int:
    """Call this opportunistically (app foreground, network-available
    callback, etc.) to drain anything that queued while offline. Returns
    how many were successfully sent."""
    init_sync_queue(conn)
    rows = conn.execute("SELECT * FROM pending_hub_reports ORDER BY queued_at ASC").fetchall()
    sent = 0
    for row in rows:
        payload = {
            "lattice_address": row["lattice_address"], "field_type": row["field_type"],
            "action_type": row["action_type"], "coherence_before": row["coherence_before"],
            "coherence_after": row["coherence_after"],
        }
        if _post(hub_url, payload):
            conn.execute("DELETE FROM pending_hub_reports WHERE id = ?", (row["id"],))
            conn.commit()
            sent += 1
        else:
            break  # still offline, stop trying the rest this pass
    return sent


def pending_count(conn: sqlite3.Connection) -> int:
    init_sync_queue(conn)
    return conn.execute("SELECT COUNT(*) c FROM pending_hub_reports").fetchone()["c"]
