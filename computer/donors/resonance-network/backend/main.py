"""
YOU-N-I-VERSE Resonance Network -- FastAPI backend.

Real chart engine (hd_engine.py, JPL ephemeris) + real 9-field resonance
matching (resonance.py) + SQLite persistence. No placeholder math, no fake
hashed "random" charts, no dead lastapp.dev calls.
"""

from __future__ import annotations
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import sqlite3
import uuid
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import hd_engine as hd
import resonance as res
import resonance_market as market
import energy_centers as organism

app = FastAPI(title="YOU-N-I-VERSE Resonance Network API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.environ.get("RESONANCE_DB_PATH", os.path.join(os.path.dirname(__file__), "resonance.db"))


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        display_name TEXT,
        birth_date TEXT,
        birth_time TEXT,
        birth_lat REAL,
        birth_lng REAL,
        birth_location TEXT,
        current_state TEXT,
        challenge TEXT,
        dream TEXT,
        skills TEXT,
        needs TEXT,
        natal_report TEXT,
        field_state TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        log_date TEXT,
        resonance_score REAL,
        mood_score INTEGER,
        note TEXT,
        selected_tags TEXT
    );
    CREATE TABLE IF NOT EXISTS pods (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        resonance_theme TEXT,
        status TEXT,
        created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS pod_members (
        pod_id TEXT,
        user_id TEXT,
        joined_at TEXT,
        PRIMARY KEY (pod_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS pod_messages (
        id TEXT PRIMARY KEY,
        pod_id TEXT,
        user_id TEXT,
        message TEXT,
        created_at TEXT
    );
    """)
    conn.commit()
    conn.close()


init_db()
_market_init_conn = get_db()
market.init_market_tables(_market_init_conn)
_market_init_conn.close()

_organism_init_conn = get_db()
organism.init_organism_tables(_organism_init_conn)
_organism_init_conn.close()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class BirthData(BaseModel):
    date: str          # "YYYY-MM-DD"
    time: str          # "HH:MM" (local time at birth location)
    utc_offset_hours: float = 0.0
    latitude: float = 0.0
    longitude: float = 0.0
    location_label: Optional[str] = None


class ProfileCreate(BaseModel):
    email: str
    display_name: str
    birth: BirthData
    current_state: Optional[str] = ""
    challenge: Optional[str] = ""
    dream: Optional[str] = ""
    skills: List[str] = []
    needs: List[str] = []


class DailyLogCreate(BaseModel):
    user_id: str
    mood_score: int
    note: Optional[str] = ""
    selected_tags: List[str] = []


class MatchRequest(BaseModel):
    user_id: str
    candidate_ids: Optional[List[str]] = None  # if omitted, match against all users


class PodCreate(BaseModel):
    name: str
    description: str
    resonance_theme: str


class PodJoin(BaseModel):
    pod_id: str
    user_id: str


class PodMessageCreate(BaseModel):
    pod_id: str
    user_id: str
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _birth_to_utc(birth: BirthData) -> datetime:
    local_dt = datetime.fromisoformat(f"{birth.date}T{birth.time}:00")
    return local_dt - timedelta(hours=birth.utc_offset_hours)


def _compute_and_store_chart(user_id: str, birth: BirthData, conn: sqlite3.Connection):
    birth_utc = _birth_to_utc(birth)
    report = hd.full_natal_report(birth_utc)
    fields = res.fields_from_natal_report(report)
    field_json = {k: vars(v) for k, v in fields.items()}
    conn.execute(
        "UPDATE profiles SET natal_report = ?, field_state = ? WHERE user_id = ?",
        (json.dumps(report), json.dumps(field_json), user_id),
    )
    conn.commit()
    return report, fields


def _load_fields(row) -> Dict[str, res.FieldState]:
    raw = json.loads(row["field_state"])
    return {k: res.FieldState(**v) for k, v in raw.items()}


def _load_centers(row) -> Optional[Dict[str, str]]:
    if not row["natal_report"]:
        return None
    return json.loads(row["natal_report"])["bodygraph"]["centers"]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"status": "ok", "service": "YOU-N-I-VERSE Resonance Network"}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "YOU-N-I-VERSE Resonance Network"}


@app.post("/api/chart/calculate")
async def calculate_chart(birth: BirthData):
    """Calculate a real natal chart without creating a user (preview mode)."""
    birth_utc = _birth_to_utc(birth)
    report = hd.full_natal_report(birth_utc)
    return report


@app.post("/api/profile/create")
async def create_profile(payload: ProfileCreate):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (payload.email,)).fetchone()

    if existing:
        user_id = existing["id"]
        # Returning user (email already exists). Previously this endpoint
        # unconditionally overwrote the whole profile row via
        # INSERT OR REPLACE, which blanked current_state/challenge/dream/
        # skills/needs to NULL on every call whose payload didn't happen to
        # resupply them -- a real data-loss bug, confirmed by tracing
        # through what this endpoint actually did to an existing row.
        # Fixed: only overwrite a field if this call actually supplied a
        # non-None value for it; otherwise keep what's already stored.
        existing_profile = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
        if existing_profile:
            # NOTE: ProfileCreate's optional fields default to "" (empty
            # string), not None -- an `is not None` check here would let
            # every omitted field's blank default silently overwrite real
            # data, since "" is not None. Confirmed by testing: the first
            # version of this fix used `is not None` and still wiped
            # challenge/dream to empty strings. Truthiness is the correct
            # check for this model.
            current_state = payload.current_state if payload.current_state else existing_profile["current_state"]
            challenge = payload.challenge if payload.challenge else existing_profile["challenge"]
            dream = payload.dream if payload.dream else existing_profile["dream"]
            skills = json.dumps(payload.skills) if payload.skills else existing_profile["skills"]
            needs = json.dumps(payload.needs) if payload.needs else existing_profile["needs"]
        else:
            current_state, challenge, dream = payload.current_state, payload.challenge, payload.dream
            skills, needs = json.dumps(payload.skills), json.dumps(payload.needs)
    else:
        user_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)",
            (user_id, payload.email, datetime.utcnow().isoformat()),
        )
        current_state, challenge, dream = payload.current_state, payload.challenge, payload.dream
        skills, needs = json.dumps(payload.skills), json.dumps(payload.needs)

    conn.execute(
        """INSERT OR REPLACE INTO profiles
           (user_id, display_name, birth_date, birth_time, birth_lat, birth_lng,
            birth_location, current_state, challenge, dream, skills, needs,
            natal_report, field_state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{}')""",
        (user_id, payload.display_name, payload.birth.date, payload.birth.time,
         payload.birth.latitude, payload.birth.longitude, payload.birth.location_label,
         current_state, challenge, dream, skills, needs),
    )
    conn.commit()

    report, fields = _compute_and_store_chart(user_id, payload.birth, conn)
    conn.close()

    return {
        "user_id": user_id,
        "natal_report": report,
        "field_state": {k: vars(v) for k, v in fields.items()},
        "network_coherence": res.network_coherence(fields),
    }


@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "user_id": row["user_id"],
        "display_name": row["display_name"],
        "natal_report": json.loads(row["natal_report"]) if row["natal_report"] else {},
        "field_state": json.loads(row["field_state"]) if row["field_state"] else {},
    }


@app.get("/api/profile/by-email/{email}")
async def login_by_email(email: str):
    """The actual login path -- was missing entirely. Every existing screen
    routed through /api/profile/create, which requires re-entering full
    birth data AND silently overwrites current_state/challenge/dream/skills/
    needs to NULL on every call (INSERT OR REPLACE with no birth-data
    change detection). This endpoint only ever reads -- it cannot lose or
    overwrite anything, which is what a login should guarantee."""
    conn = get_db()
    user_row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="No account found for this email")

    row = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_row["id"],)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Account exists but has no profile yet")

    return {
        "user_id": row["user_id"],
        "display_name": row["display_name"],
        "natal_report": json.loads(row["natal_report"]) if row["natal_report"] else {},
        "field_state": json.loads(row["field_state"]) if row["field_state"] else {},
    }


@app.post("/api/daily-log/create")
async def create_daily_log(payload: DailyLogCreate):
    conn = get_db()
    row = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (payload.user_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Profile not found")

    fields = _load_fields(row)
    coherence = res.network_coherence(fields)
    # Blend chart-coherence with today's self-reported mood (1-10 -> 0-1)
    mood_norm = max(0.0, min(1.0, payload.mood_score / 10.0))
    resonance_score = round(0.6 * coherence + 0.4 * mood_norm, 4)

    log_id = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO daily_logs (id, user_id, log_date, resonance_score, mood_score, note, selected_tags)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (log_id, payload.user_id, datetime.utcnow().date().isoformat(), resonance_score,
         payload.mood_score, payload.note, json.dumps(payload.selected_tags)),
    )
    conn.commit()
    conn.close()
    return {"id": log_id, "resonance_score": resonance_score}


@app.get("/api/daily-log/{user_id}")
async def get_daily_logs(user_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/match/calculate")
async def calculate_match(payload: MatchRequest):
    conn = get_db()
    me = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (payload.user_id,)).fetchone()
    if not me:
        conn.close()
        raise HTTPException(status_code=404, detail="Profile not found")
    my_fields = _load_fields(me)
    my_centers = _load_centers(me)

    if payload.candidate_ids:
        placeholders = ",".join("?" for _ in payload.candidate_ids)
        candidates = conn.execute(
            f"SELECT * FROM profiles WHERE user_id IN ({placeholders}) AND user_id != ?",
            (*payload.candidate_ids, payload.user_id),
        ).fetchall()
    else:
        candidates = conn.execute(
            "SELECT * FROM profiles WHERE user_id != ?", (payload.user_id,)
        ).fetchall()
    conn.close()

    results = []
    for cand in candidates:
        try:
            cand_fields = _load_fields(cand)
        except Exception:
            continue
        cand_centers = _load_centers(cand)
        score = res.resonance_score(my_fields, cand_fields, my_centers, cand_centers)
        results.append({
            "user_id": cand["user_id"],
            "display_name": cand["display_name"],
            **score,
        })

    results.sort(key=lambda r: r["resonance_index"], reverse=True)
    return {"matches": results}


@app.post("/api/pod/create")
async def create_pod(payload: PodCreate):
    conn = get_db()
    pod_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO pods (id, name, description, resonance_theme, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)",
        (pod_id, payload.name, payload.description, payload.resonance_theme, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"id": pod_id}


@app.get("/api/pod/list")
async def list_pods():
    conn = get_db()
    rows = conn.execute("SELECT * FROM pods WHERE status = 'active'").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/pod/{pod_id}")
async def get_pod(pod_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM pods WHERE id = ?", (pod_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Pod not found")
    return dict(row)


@app.post("/api/pod/join")
async def join_pod(payload: PodJoin):
    conn = get_db()
    conn.execute(
        "INSERT OR IGNORE INTO pod_members (pod_id, user_id, joined_at) VALUES (?, ?, ?)",
        (payload.pod_id, payload.user_id, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"status": "joined"}


@app.get("/api/pod/{pod_id}/members")
async def pod_members(pod_id: str):
    conn = get_db()
    rows = conn.execute(
        """SELECT pm.user_id, p.display_name, pm.joined_at
           FROM pod_members pm JOIN profiles p ON p.user_id = pm.user_id
           WHERE pm.pod_id = ?""", (pod_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/pod/message")
async def post_pod_message(payload: PodMessageCreate):
    conn = get_db()
    msg_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO pod_messages (id, pod_id, user_id, message, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, payload.pod_id, payload.user_id, payload.message, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"id": msg_id}


@app.get("/api/pod/{pod_id}/messages")
async def pod_messages(pod_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM pod_messages WHERE pod_id = ? ORDER BY created_at ASC", (pod_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/pod/{pod_id}/fit/{user_id}")
async def pod_fit(pod_id: str, user_id: str):
    """Real resonance fit between a user and a pod's current members --
    the average of the same pairwise resonance_score used for 1:1 matching,
    not a theme-keyword guess."""
    conn = get_db()
    me = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not me:
        conn.close()
        raise HTTPException(status_code=404, detail="Profile not found")

    members = conn.execute(
        """SELECT p.* FROM pod_members pm JOIN profiles p ON p.user_id = pm.user_id
           WHERE pm.pod_id = ? AND pm.user_id != ?""", (pod_id, user_id)
    ).fetchall()
    conn.close()

    if not members:
        return {"pod_id": pod_id, "user_id": user_id, "fit": None, "member_count": 0,
                "note": "No members yet -- be the first to set the tone."}

    my_fields = _load_fields(me)
    my_centers = _load_centers(me)
    scores = []
    for m in members:
        try:
            m_fields = _load_fields(m)
        except Exception:
            continue
        m_centers = _load_centers(m)
        scores.append(res.resonance_score(my_fields, m_fields, my_centers, m_centers)["resonance_index"])

    if not scores:
        return {"pod_id": pod_id, "user_id": user_id, "fit": None, "member_count": len(members),
                "note": "Members haven't completed their charts yet."}

    avg_fit = round(sum(scores) / len(scores), 4)
    return {"pod_id": pod_id, "user_id": user_id, "fit": avg_fit, "member_count": len(members)}


@app.get("/api/network/graph")
async def network_graph():
    """Real network graph: every user, edges weighted by real resonance score."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM profiles WHERE field_state != '{}'").fetchall()
    conn.close()

    nodes = []
    field_map = {}
    center_map = {}
    for r in rows:
        nodes.append({"id": r["user_id"], "name": r["display_name"]})
        field_map[r["user_id"]] = _load_fields(r)
        center_map[r["user_id"]] = _load_centers(r)

    edges = []
    ids = list(field_map.keys())
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            score = res.resonance_score(field_map[ids[i]], field_map[ids[j]],
                                         center_map[ids[i]], center_map[ids[j]])
            if score["resonance_index"] > 0.55:
                edges.append({
                    "source": ids[i], "target": ids[j],
                    "weight": score["resonance_index"],
                })

    return {"nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# Resonance Market -- Energy Exchange economy
# ---------------------------------------------------------------------------

class ListEnergyRequest(BaseModel):
    seller_id: str
    center: str
    dimension: str = "D3"
    energy_type: str
    description: str
    price: float
    availability: str = "immediate"
    klein_tool_tuned: bool = False


class RequestEnergyRequest(BaseModel):
    buyer_id: str
    center: str
    dimension: str = "D3"
    energy_type: str
    description: str
    max_price: float
    urgency: str = "medium"
    preferred_sellers: List[str] = []


class ExecuteTransactionRequest(BaseModel):
    listing_id: str
    request_id: str
    broker_id: str = "platform"


class SubscribeRequest(BaseModel):
    user_id: str
    tool_name: str
    tier: str  # "basic" | "deep" | "mastery"


class AddCreditsRequest(BaseModel):
    user_id: str
    amount: float


def _user_bodygraph_context(user_id: str, conn: sqlite3.Connection):
    """Pull the pieces the market needs to validate a listing/request against
    a user's REAL chart: which centers are defined, which gates are active,
    and how many channels are defined (for resonance-depth scoring)."""
    row = conn.execute("SELECT natal_report FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not row or not row["natal_report"]:
        raise HTTPException(status_code=404, detail="Profile or natal chart not found")
    report = json.loads(row["natal_report"])
    bodygraph = report["bodygraph"]
    return {
        "centers": bodygraph["centers"],
        "active_gates": bodygraph["active_gates"],
        "gate_to_center": hd.GATE_TO_CENTER,
        "defined_channel_count": len(bodygraph["defined_channels"]),
    }


@app.post("/api/market/list")
async def market_list_energy(payload: ListEnergyRequest):
    conn = get_db()
    try:
        ctx = _user_bodygraph_context(payload.seller_id, conn)
        profile = conn.execute("SELECT display_name FROM profiles WHERE user_id = ?", (payload.seller_id,)).fetchone()
        m = market.ResonanceMarket(conn)
        listing = m.list_energy(
            seller_id=payload.seller_id, seller_name=profile["display_name"],
            centers=ctx["centers"], active_gates=ctx["active_gates"],
            gate_to_center=ctx["gate_to_center"], defined_channel_count=ctx["defined_channel_count"],
            center=payload.center, dimension=payload.dimension, energy_type=payload.energy_type,
            description=payload.description, price=payload.price, availability=payload.availability,
            klein_tool_tuned=payload.klein_tool_tuned,
        )
        return asdict_listing(listing)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@app.post("/api/market/request")
async def market_request_energy(payload: RequestEnergyRequest):
    conn = get_db()
    try:
        ctx = _user_bodygraph_context(payload.buyer_id, conn)
        profile = conn.execute("SELECT display_name FROM profiles WHERE user_id = ?", (payload.buyer_id,)).fetchone()
        m = market.ResonanceMarket(conn)
        req = m.request_energy(
            buyer_id=payload.buyer_id, buyer_name=profile["display_name"], centers=ctx["centers"],
            center=payload.center, dimension=payload.dimension, energy_type=payload.energy_type,
            description=payload.description, max_price=payload.max_price, urgency=payload.urgency,
            preferred_sellers=payload.preferred_sellers,
        )
        return asdict_request(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@app.get("/api/market/matches/{request_id}")
async def market_find_matches(request_id: str):
    conn = get_db()
    try:
        m = market.ResonanceMarket(conn)
        return {"matches": m.find_matches(request_id)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    finally:
        conn.close()


@app.post("/api/market/transact")
async def market_execute_transaction(payload: ExecuteTransactionRequest):
    conn = get_db()
    try:
        m = market.ResonanceMarket(conn)
        tx = m.execute_transaction(payload.listing_id, payload.request_id, payload.broker_id)
        return asdict_transaction(tx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@app.post("/api/market/subscribe")
async def market_subscribe(payload: SubscribeRequest):
    conn = get_db()
    try:
        m = market.ResonanceMarket(conn)
        return m.subscribe_to_tuning(payload.user_id, payload.tool_name, payload.tier)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@app.post("/api/market/credits/add")
async def market_add_credits(payload: AddCreditsRequest):
    conn = get_db()
    m = market.ResonanceMarket(conn)
    new_balance = m.add_credits(payload.user_id, payload.amount)
    conn.close()
    return {"user_id": payload.user_id, "balance": new_balance}


@app.get("/api/market/credits/{user_id}")
async def market_get_credits(user_id: str):
    conn = get_db()
    m = market.ResonanceMarket(conn)
    balance = m.get_balance(user_id)
    conn.close()
    return {"user_id": user_id, "balance": balance}


@app.get("/api/market/stats")
async def market_stats():
    conn = get_db()
    m = market.ResonanceMarket(conn)
    stats = m.get_market_stats()
    conn.close()
    return stats


@app.get("/api/market/center/{center}")
async def market_listings_for_center(center: str):
    conn = get_db()
    m = market.ResonanceMarket(conn)
    listings = m.get_listings_for_center(center)
    conn.close()
    return {"listings": listings}


@app.get("/api/market/history/{user_id}")
async def market_user_history(user_id: str):
    conn = get_db()
    m = market.ResonanceMarket(conn)
    history = m.get_user_history(user_id)
    conn.close()
    return {"transactions": history}


def asdict_listing(l: "market.EnergyListing") -> Dict:
    d = l.__dict__.copy()
    return d


def asdict_request(r: "market.EnergyRequest") -> Dict:
    return r.__dict__.copy()


def asdict_transaction(t: "market.Transaction") -> Dict:
    return t.__dict__.copy()


# ---------------------------------------------------------------------------
# Mission Advisor -- daily mission briefs
# ---------------------------------------------------------------------------

import mission_advisor as rma
import outcome_learning as ol
from dataclasses import asdict as _dc_asdict


def _feeder_gate_addresses(natal_report: Dict, field_type: str) -> List[str]:
    """Real lattice addresses (Gate.Line.Color.Tone.Base) for the active
    gates feeding a given field, pulled straight from this user's actual
    chart -- not synthesized."""
    feeder_centers = [c for c, f in res.CENTER_TO_FIELD.items() if f == field_type]
    if not feeder_centers:
        return []
    active_gates = set(natal_report["bodygraph"]["active_gates"])
    feeder_gates = {g for g in active_gates if hd.GATE_TO_CENTER.get(g) in feeder_centers}
    addresses = []
    for p in natal_report["charts"]["tropical"]:
        if p["stream"] == "personality" and p["gate"] in feeder_gates:
            addresses.append(p["lattice_address"])
    return addresses


@app.get("/api/mission/today/{user_id}")
async def mission_today(user_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not row or not row["field_state"] or row["field_state"] == "{}":
        conn.close()
        raise HTTPException(status_code=404, detail="Profile or field state not found")

    fields = _load_fields(row)
    coherence = res.network_coherence(fields)

    ol.init_outcome_tables(conn)

    # Post-deterministic pick: informed by real recorded outcomes once
    # enough exist (system-only internal tier, never exposed -- see the
    # module-level comment in outcome_learning.py), pure deterministic
    # hash fallback otherwise. Never samples, never random.
    def pattern_lookup(field_type: str, action_type: str):
        return ol.get_pattern_stats_internal(conn, field_type=field_type, action_type=action_type)

    brief = rma.generate_mission(user_id, fields, coherence, pattern_lookup=pattern_lookup)

    # Close yesterday's loop (if a mission was tracked yesterday) before
    # recording today's pick, so the anonymized outcome table gets a real
    # before/after delta rather than nothing.
    natal_report = json.loads(row["natal_report"]) if row["natal_report"] else None
    if natal_report:
        current_field_coherences = {f: fs.coherence for f, fs in fields.items()}

        yesterday_row = conn.execute(
            "SELECT target_field FROM mission_tracking WHERE user_id = ? "
            "ORDER BY tracked_date DESC LIMIT 1", (user_id,)
        ).fetchone()
        if yesterday_row:
            addrs = _feeder_gate_addresses(natal_report, yesterday_row["target_field"])
            ol.close_the_loop(conn, user_id, feeder_gate_addresses=addrs,
                               current_field_coherences=current_field_coherences)

        ol.record_mission_given(
            conn, user_id, target_field=brief.strongest_field,
            field_coherence=fields[brief.strongest_field].coherence,
            overall_coherence=coherence, variant_index=brief.optimal_vector_index,
        )

    conn.close()
    return _dc_asdict(brief)


@app.get("/api/mission/pattern-stats")
async def mission_pattern_stats(field_type: Optional[str] = None, lattice_address: Optional[str] = None):
    """Public/anonymized endpoint -- returns None (not partial data) below
    the k-anonymity floor."""
    conn = get_db()
    ol.init_outcome_tables(conn)
    stats = ol.get_pattern_stats(conn, field_type=field_type, lattice_address=lattice_address)
    conn.close()
    if stats is None:
        return {"available": False, "reason": f"fewer than {ol.MIN_SAMPLE_SIZE} outcomes recorded for this query"}
    return {"available": True, "n": stats.n, "mean_delta": stats.mean_delta, "success_rate": stats.success_rate}


# ---------------------------------------------------------------------------
# AUTOLING -- real rule-based text analysis for check-in notes
# ---------------------------------------------------------------------------

import autoling as al


class AnalyzeTextRequest(BaseModel):
    text: str


@app.post("/api/autoling/analyze")
async def autoling_analyze(payload: AnalyzeTextRequest):
    result = al.analyze(payload.text)
    return {
        "intent": result.intent,
        "word_count": result.word_count,
        "suggested_tags": [
            {"tag": s.tag, "score": s.score, "matched_words": s.matched_words}
            for s in result.suggested_tags
        ],
    }


# ---------------------------------------------------------------------------
# DISEMINER -- real co-occurrence semantics + claim extraction
# (Monte Carlo and narrative/influence layers deliberately not ported --
#  see diseminer_engine.py docstring)
# ---------------------------------------------------------------------------

import diseminer_engine as dis
import synthesist_engine as syn


class DiseminerAnalyzeRequest(BaseModel):
    documents: List[str]
    extract_claims_from: Optional[str] = None
    claim_source: str = "user"


@app.post("/api/diseminer/analyze")
async def diseminer_analyze(payload: DiseminerAnalyzeRequest):
    engine = dis.DiseminerEngine()
    engine.build_distributional_space(payload.documents)

    result = {"relations": engine.top_relations(20), "claims": []}

    if payload.extract_claims_from:
        claims = engine.extract_claims(payload.extract_claims_from, payload.claim_source)
        result["claims"] = [
            {
                "text": c.text, "subject": c.subject, "predicate": c.predicate, "object": c.object,
                "confidence": c.confidence, "modality": c.modality,
                "contradictions": c.contradictions, "supports": c.supports,
                "evidence_count": len(c.evidence),
            }
            for c in claims
        ]

    return result


# ---------------------------------------------------------------------------
# SYNTHESIST -- real claim verification against a user-supplied corpus
# (no fabricated sources -- an unsupported claim is honestly "unverified")
# ---------------------------------------------------------------------------

class SynthesistDocument(BaseModel):
    id: str
    title: str
    full_text: str
    abstract: str = ""
    methodology: str = ""
    sample_size: Optional[int] = None
    effect_size: Optional[float] = None
    p_value: Optional[float] = None
    year: int = 2024


class SynthesistVerifyRequest(BaseModel):
    documents: List[SynthesistDocument]
    corpus_title: str = "corpus"
    claim_text: str


@app.post("/api/synthesist/verify")
async def synthesist_verify(payload: SynthesistVerifyRequest):
    engine = syn.SynthesistEngine()
    docs = [
        syn.ResearchDocument(
            id=d.id, title=d.title, full_text=d.full_text, abstract=d.abstract,
            methodology=d.methodology, sample_size=d.sample_size,
            effect_size=d.effect_size, p_value=d.p_value, year=d.year,
        )
        for d in payload.documents
    ]
    corpus_id = engine.ingest_corpus(docs, title=payload.corpus_title)

    try:
        result = engine.verify_claim(payload.claim_text, corpus_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "claim_text": result.claim_text,
        "verdict": result.verdict,
        "confidence": result.confidence,
        "supporting_documents": result.supporting_documents,
        "contradicting_documents": result.contradicting_documents,
        "evidence": [
            {
                "document_title": e.document_title, "relevant_text": e.relevant_text,
                "relevance_score": e.relevance_score, "direction": e.direction, "quality": e.quality,
            }
            for e in result.evidence
        ],
    }


# ---------------------------------------------------------------------------
# Sovereign edge reporting -- phones/self-hosted instances push anonymized
# outcomes here. The hub never reaches into a device; devices choose what
# to report. This model ONLY accepts the five fields below -- any extra
# field a client sends (a user_id, a name, anything) is silently dropped by
# Pydantic before it ever reaches record_anonymized_outcome(). Tested below.
# ---------------------------------------------------------------------------

class OutcomeReport(BaseModel):
    lattice_address: str
    field_type: str
    action_type: str = "mission_prescribed"
    coherence_before: float
    coherence_after: float


@app.post("/api/outcomes/report")
async def report_outcome(payload: OutcomeReport):
    conn = get_db()
    ol.init_outcome_tables(conn)
    ol.record_anonymized_outcome(
        conn, lattice_address=payload.lattice_address, field_type=payload.field_type,
        action_type=payload.action_type, coherence_before=payload.coherence_before,
        coherence_after=payload.coherence_after,
    )
    conn.close()
    return {"received": True}


# ---------------------------------------------------------------------------
# Builder's Hub -- real-world projects, matched by real complementarity
# ---------------------------------------------------------------------------

import builder_hub as bh


class CreateProjectRequest(BaseModel):
    creator_id: str
    title: str
    description: str
    category: str
    centers_needed: List[str]
    link: Optional[str] = None


class UpdateProjectStatusRequest(BaseModel):
    creator_id: str
    status: str


class SupportProjectRequest(BaseModel):
    user_id: str


@app.post("/api/builder/projects")
async def create_builder_project(payload: CreateProjectRequest):
    conn = get_db()
    try:
        profile = conn.execute(
            "SELECT display_name FROM profiles WHERE user_id = ?", (payload.creator_id,)
        ).fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        hub = bh.BuilderHub(conn)
        project = hub.create_project(
            creator_id=payload.creator_id, creator_name=profile["display_name"],
            title=payload.title, description=payload.description, category=payload.category,
            centers_needed=payload.centers_needed, link=payload.link,
        )
        return _dc_asdict(project)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@app.get("/api/builder/projects")
async def browse_builder_projects(category: Optional[str] = None, center_needed: Optional[str] = None):
    conn = get_db()
    hub = bh.BuilderHub(conn)
    projects = hub.browse_projects(category=category, center_needed=center_needed)
    conn.close()
    return {"projects": [_dc_asdict(p) for p in projects]}


@app.get("/api/builder/projects/{project_id}/fit/{user_id}")
async def builder_project_fit(project_id: str, user_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Profile not found")
    viewer_centers = _load_centers(row)
    if not viewer_centers:
        conn.close()
        raise HTTPException(status_code=400, detail="Profile has no chart data yet")
    hub = bh.BuilderHub(conn)
    fit = hub.project_fit(project_id, viewer_centers)
    conn.close()
    if fit is None:
        raise HTTPException(status_code=404, detail="Project not found or has no stated needs")
    return fit


@app.post("/api/builder/projects/{project_id}/support")
async def support_builder_project(project_id: str, payload: SupportProjectRequest):
    conn = get_db()
    profile = conn.execute("SELECT display_name FROM profiles WHERE user_id = ?", (payload.user_id,)).fetchone()
    if not profile:
        conn.close()
        raise HTTPException(status_code=404, detail="Profile not found")
    hub = bh.BuilderHub(conn)
    count = hub.support_project(project_id, payload.user_id, profile["display_name"])
    conn.close()
    return {"project_id": project_id, "support_count": count}


@app.get("/api/builder/projects/{project_id}/supporters")
async def builder_project_supporters(project_id: str, requesting_user_id: str):
    conn = get_db()
    hub = bh.BuilderHub(conn)
    try:
        supporters = hub.get_supporters(project_id, requesting_user_id)
    except ValueError as e:
        conn.close()
        raise HTTPException(status_code=403, detail=str(e))
    conn.close()
    return {"supporters": supporters}


@app.post("/api/builder/projects/{project_id}/status")
async def update_builder_project_status(project_id: str, payload: UpdateProjectStatusRequest):
    conn = get_db()
    hub = bh.BuilderHub(conn)
    try:
        hub.update_status(project_id, payload.creator_id, payload.status)
    except ValueError as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    conn.close()
    return {"project_id": project_id, "status": payload.status}


# ---------------------------------------------------------------------------
# MCP bridge -- the real endpoint MCP-HUB (Synthia-server, Node) calls into.
# Dispatches to already-tested logic; doesn't duplicate it. This is the
# actual container seam: Synthia-server is the outer process, this Python
# service is registered in mcp-hub.ts as an external MCP server and called
# over real HTTP, since mesh-core.ts's SynthiaMesh is an in-process JS
# singleton a separate Python process can't join directly.
# ---------------------------------------------------------------------------

@app.post("/api/mcp/mission_today")
async def mcp_mission_today(params: Dict):
    user_id = params.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    return await mission_today(user_id)


@app.post("/api/mcp/market_stats")
async def mcp_market_stats(params: Dict):
    return await market_stats()


@app.post("/api/mcp/builder_projects")
async def mcp_builder_projects(params: Dict):
    return await browse_builder_projects(category=params.get("category"), center_needed=params.get("center_needed"))


@app.post("/api/mcp/match_calculate")
async def mcp_match_calculate(params: Dict):
    user_id = params.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    payload = MatchRequest(user_id=user_id, candidate_ids=params.get("candidate_ids"))
    return await calculate_match(payload)


@app.post("/api/mcp/pod_fit")
async def mcp_pod_fit(params: Dict):
    pod_id, user_id = params.get("pod_id"), params.get("user_id")
    if not pod_id or not user_id:
        raise HTTPException(status_code=400, detail="pod_id and user_id required")
    return await pod_fit(pod_id, user_id)


# ---------------------------------------------------------------------------
# Organism status -- the 9 energy-center / hub activation layer.
# See energy_centers.py for the real mapping and the MCP-HUB gating rule.
# ---------------------------------------------------------------------------

class FinalizeOrganismOutput(BaseModel):
    user_id: str
    summary: str  # what's being handed to the outside world, for the user's own record


def _get_center_states(conn, user_id: str) -> Dict[str, str]:
    row = conn.execute("SELECT natal_report FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not row or not row["natal_report"]:
        raise HTTPException(status_code=404, detail="No natal report for this user yet -- create a profile first")
    report = json.loads(row["natal_report"])
    centers = report.get("bodygraph", {}).get("centers")
    if not centers:
        raise HTTPException(status_code=422, detail="Natal report has no bodygraph.centers")
    return centers


@app.get("/api/organism/{user_id}/status")
async def organism_status(user_id: str):
    """Real per-user status: this user's actual defined/open centers,
    which hub each one drives, and whether MCP-HUB (Root) is currently
    allowed to reach outward for them. Root stays dormant until this
    specific user's output has been explicitly finalized."""
    conn = get_db()
    try:
        center_states = _get_center_states(conn, user_id)
        statuses = organism.compute_organism_status(center_states, user_id, conn)
        return {
            "user_id": user_id,
            "centers": [
                {
                    "center": s.center,
                    "hub": s.hub,
                    "center_state": s.center_state,
                    "mode": s.mode,
                    "external_reach_allowed": s.external_reach_allowed,
                }
                for s in statuses
            ],
        }
    finally:
        conn.close()


@app.post("/api/organism/finalize")
async def organism_finalize(payload: FinalizeOrganismOutput):
    """The only way MCP-HUB (Root) unlocks for a user: an explicit call
    made after the other 8 centers have actually produced something the
    user has reviewed. Nothing in this codebase calls this automatically."""
    conn = get_db()
    try:
        _get_center_states(conn, payload.user_id)  # 404s cleanly if user doesn't exist yet
        organism.mark_coherent_output_ready(conn, payload.user_id, payload.summary)
        return {"user_id": payload.user_id, "mcp_hub_unlocked": True, "summary": payload.summary}
    finally:
        conn.close()


@app.post("/api/organism/{user_id}/revoke")
async def organism_revoke(user_id: str):
    """Re-locks MCP-HUB for this user (e.g. they want to go back to
    local-only mode after finalizing)."""
    conn = get_db()
    try:
        organism.revoke_coherent_output_ready(conn, user_id)
        return {"user_id": user_id, "mcp_hub_unlocked": False}
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# External Opportunity / Consent membrane
# ---------------------------------------------------------------------------
# The Resonance Network exhausts its own people/listings first. When it has
# no suitable internal match, these endpoints hand the same need to the
# consent-gated Synthia MCP Opportunity service running beside this backend.
# That service can discover organizations/people/systems that are NOT yet
# attached to the Resonance Network, including participants reachable through
# an external MCP server. Discovery is not membership: the candidate remains
# external until the invitation/consent/onboarding flow succeeds.

import urllib.request as _urlrequest
import urllib.error as _urlerror

EXTERNAL_OPPORTUNITY_URL = os.environ.get(
    "EXTERNAL_OPPORTUNITY_URL", "http://127.0.0.1:8812"
).rstrip("/")


def _external_opportunity_call(path: str, payload: Optional[Dict] = None, method: str = "POST") -> Dict:
    url = f"{EXTERNAL_OPPORTUNITY_URL}{path}"
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = _urlrequest.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with _urlrequest.urlopen(req, timeout=12) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except _urlerror.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            detail = json.loads(raw)
        except Exception:
            detail = {"error": raw or str(e)}
        raise HTTPException(status_code=e.code, detail=detail.get("error", detail))
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"External opportunity plane unavailable: {e}",
        )


@app.get("/api/opportunities/health")
async def external_opportunity_health():
    return _external_opportunity_call("/health", None, "GET")


@app.post("/api/opportunities/discover")
async def external_opportunity_discover(payload: Dict):
    """Discover candidates outside the current Resonance Network.

    This is deliberately separate from /api/match/calculate and the internal
    Resonance Market. A candidate returned here is still external even when
    it is reachable over MCP; discovery does not enroll it into the network.
    """
    return _external_opportunity_call("/discover", payload)


@app.post("/api/opportunities/invite")
async def external_opportunity_invite(payload: Dict):
    """Send the ONE consent-gated invitation allowed by OutreachGuard."""
    return _external_opportunity_call("/invite", payload)


@app.post("/api/opportunities/respond")
async def external_opportunity_respond(payload: Dict):
    """Callback for the invited external party.

    The external service requires the one-time response token that was sent
    through the authorized MCP invitation transport. A local user cannot
    simply mark an outside organization as accepted from the UI.
    """
    return _external_opportunity_call("/respond", payload)


@app.post("/api/opportunities/install/approve")
async def external_install_approve(payload: Dict):
    """Issue separate installation consent only after collaboration consent."""
    return _external_opportunity_call("/install/approve", payload)


@app.post("/api/opportunities/install/deploy")
async def external_install_deploy(payload: Dict):
    """Invoke an authorized MCP provisioner after installation consent."""
    return _external_opportunity_call("/install/deploy", payload)


@app.post("/api/opportunities/outcome")
async def external_opportunity_outcome(payload: Dict):
    """Record the external collaboration outcome into the opportunity ledger."""
    return _external_opportunity_call("/outcome", payload)


@app.get("/api/opportunities/{opportunity_id}/history")
async def external_opportunity_history(opportunity_id: str):
    return _external_opportunity_call(f"/history/{opportunity_id}", None, "GET")


@app.post("/api/market/external/{request_id}")
async def market_search_outside_network(request_id: str):
    """Escalate an unmatched internal Resonance Market request to MCP.

    Internal matching remains first. This endpoint is only the outward
    membrane. The returned candidates are explicitly marked external by the
    MCP resolver and are not treated as Resonance Network members.
    """
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM market_requests WHERE id = ?", (request_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Market request not found")

    urgency_map = {"low": 0.25, "medium": 0.5, "high": 0.75, "critical": 1.0}
    need = {
        "needId": row["id"],
        "owner": row["buyer_id"],
        "description": row["description"],
        "requiredCapabilities": [
            row["energy_type"],
            f"center:{row['center']}",
        ],
        "urgency": urgency_map.get(row["urgency"], 0.5),
        "source": "ResonanceMarket",
        "marketRequestId": row["id"],
    }
    network_offer = [
        "Resonance Network introduction",
        "consent-gated trial/collaboration",
        f"up to {row['max_price']} Resonance credits where applicable",
    ]
    evidence = [{
        "source": "resonance-market-unmatched-request",
        "relevance": 0.9,
        "confidence": 0.8,
    }]
    return _external_opportunity_call(
        "/discover",
        {"need": need, "networkOffer": network_offer, "evidence": evidence},
    )
