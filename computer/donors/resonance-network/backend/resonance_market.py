"""
Resonance Market -- Energy Exchange economy.

Ported from LivingOrganism/ResonanceMarket.ts (original design: fee splits,
matching algorithm, subscription tiers -- kept as-is, that was a design
decision not something to silently change).

Two things changed in the port:
  1. Listings/requests are validated against REAL bodygraph center
     definition (from hd_engine.build_bodygraph via main.py's stored
     natal_report), not an abstract PersonalGraph stub.
  2. State is persisted in the same SQLite file main.py already uses,
     instead of living only in memory -- so it survives a server restart
     on Render/Termux.

Centers here use hd_engine.py's 9-center names (Head, Ajna, Throat, G, Ego,
Spleen, Solar, Sacral, Root) rather than the TS version's slightly
different naming (Heart/SolarPlexus), to stay consistent with one source
of truth for the bodygraph.
"""

from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional, Literal
import sqlite3
import uuid
import random

CenterName = Literal["Head", "Ajna", "Throat", "G", "Ego", "Spleen", "Solar", "Sacral", "Root"]
Dimension = Literal["D1", "D2", "D3", "D4", "D5", "D6", "D7"]

TransactionType = Literal[
    "ENERGY_LENDING", "INSIGHT_BROKERAGE", "DIRECTIONAL_GUIDANCE",
    "EMOTIONAL_SUPPORT", "INTUITIVE_READING", "LIFE_FORCE_BOOST",
    "WILL_POWER_TRANSFER", "IDENTITY_MIRRORING", "KLEIN_TUNING", "MCP_BROKERAGE",
]

# Center -> the transaction type it naturally provides (preserved from the
# original design's mapping table).
_CENTER_TRANSACTION_TYPE: Dict[str, TransactionType] = {
    "Head": "INSIGHT_BROKERAGE",
    "Ajna": "INSIGHT_BROKERAGE",
    "Throat": "DIRECTIONAL_GUIDANCE",
    "G": "IDENTITY_MIRRORING",
    "Ego": "WILL_POWER_TRANSFER",
    "Solar": "EMOTIONAL_SUPPORT",
    "Sacral": "LIFE_FORCE_BOOST",
    "Spleen": "INTUITIVE_READING",
    "Root": "ENERGY_LENDING",
}

MCP_FEE_RATE = 0.10       # 10% to the brokering MCP/agent
PLATFORM_FEE_RATE = 0.05  # 5% to the platform


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class EnergyListing:
    id: str
    seller_id: str
    seller_name: str
    center: str
    dimension: str
    energy_type: str
    description: str
    price: float
    availability: Literal["immediate", "scheduled", "queued"]
    resonance_depth: float
    klein_tool_tuned: bool
    rating: float
    transaction_count: int
    created_at: str


@dataclass
class EnergyRequest:
    id: str
    buyer_id: str
    buyer_name: str
    center: str
    dimension: str
    energy_type: str
    description: str
    max_price: float
    urgency: Literal["low", "medium", "high", "critical"]
    preferred_sellers: List[str]
    created_at: str


@dataclass
class Transaction:
    id: str
    type: str
    listing_id: str
    request_id: str
    seller_id: str
    buyer_id: str
    broker_id: str
    amount: float
    broker_fee: float
    platform_fee: float
    seller_receives: float
    resonance_score: float
    status: Literal["pending", "active", "completed", "disputed"]
    started_at: str
    completed_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def init_market_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS market_listings (
        id TEXT PRIMARY KEY, seller_id TEXT, seller_name TEXT, center TEXT,
        dimension TEXT, energy_type TEXT, description TEXT, price REAL,
        availability TEXT, resonance_depth REAL, klein_tool_tuned INTEGER,
        rating REAL, transaction_count INTEGER, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS market_requests (
        id TEXT PRIMARY KEY, buyer_id TEXT, buyer_name TEXT, center TEXT,
        dimension TEXT, energy_type TEXT, description TEXT, max_price REAL,
        urgency TEXT, preferred_sellers TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS market_transactions (
        id TEXT PRIMARY KEY, type TEXT, listing_id TEXT, request_id TEXT,
        seller_id TEXT, buyer_id TEXT, broker_id TEXT, amount REAL,
        broker_fee REAL, platform_fee REAL, seller_receives REAL,
        resonance_score REAL, status TEXT, started_at TEXT, completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS market_balances (
        user_id TEXT PRIMARY KEY, balance REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS market_broker_earnings (
        broker_id TEXT PRIMARY KEY, earnings REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS market_platform (
        id INTEGER PRIMARY KEY CHECK (id = 1), revenue REAL DEFAULT 0
    );
    INSERT OR IGNORE INTO market_platform (id, revenue) VALUES (1, 0);
    """)
    conn.commit()


# ---------------------------------------------------------------------------
# Core validation: does this user actually have this center defined?
# ---------------------------------------------------------------------------

def _center_defined(field_state_or_centers: Dict, center: str) -> bool:
    """Accepts the `centers` dict from a bodygraph report:
    {"Head": "Defined"|"Undefined"|"Open", ...}"""
    return field_state_or_centers.get(center) == "Defined"


def calculate_resonance_depth(active_gates: List[int], gate_to_center: Dict[int, str],
                               center: str, defined_channel_count: int) -> float:
    """How deep the tuning goes: driven by how many active gates and defined
    channels sit in this center. Same formula shape as the TS original."""
    gates_in_center = sum(1 for g in active_gates if gate_to_center.get(g) == center)
    dim_activation = min(1.0, gates_in_center / 3.0)  # proxy for TS's dimensionalState
    return min(1.0, (dim_activation + gates_in_center * 0.05 + defined_channel_count * 0.1) / 3.0)


# ---------------------------------------------------------------------------
# Market operations
# ---------------------------------------------------------------------------

class ResonanceMarket:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        init_market_tables(conn)

    # -- Listings ------------------------------------------------------

    def list_energy(self, seller_id: str, seller_name: str, centers: Dict[str, str],
                     active_gates: List[int], gate_to_center: Dict[int, str],
                     defined_channel_count: int, center: str, dimension: str,
                     energy_type: str, description: str, price: float,
                     availability: str, klein_tool_tuned: bool = False) -> EnergyListing:
        if not _center_defined(centers, center):
            raise ValueError(f"Cannot list energy from undefined center: {center}")

        listing = EnergyListing(
            id=f"list-{uuid.uuid4().hex[:12]}",
            seller_id=seller_id, seller_name=seller_name, center=center,
            dimension=dimension, energy_type=energy_type, description=description,
            price=price, availability=availability,
            resonance_depth=calculate_resonance_depth(active_gates, gate_to_center, center, defined_channel_count),
            klein_tool_tuned=klein_tool_tuned, rating=0.0, transaction_count=0,
            created_at=datetime.utcnow().isoformat(),
        )
        self.conn.execute(
            """INSERT INTO market_listings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (listing.id, listing.seller_id, listing.seller_name, listing.center,
             listing.dimension, listing.energy_type, listing.description, listing.price,
             listing.availability, listing.resonance_depth, int(listing.klein_tool_tuned),
             listing.rating, listing.transaction_count, listing.created_at),
        )
        self.conn.commit()
        return listing

    # -- Requests --------------------------------------------------------

    def request_energy(self, buyer_id: str, buyer_name: str, centers: Dict[str, str],
                        center: str, dimension: str, energy_type: str, description: str,
                        max_price: float, urgency: str,
                        preferred_sellers: Optional[List[str]] = None) -> EnergyRequest:
        if _center_defined(centers, center):
            raise ValueError(f"You already have {center} defined -- no need to request")

        req = EnergyRequest(
            id=f"req-{uuid.uuid4().hex[:12]}", buyer_id=buyer_id, buyer_name=buyer_name,
            center=center, dimension=dimension, energy_type=energy_type,
            description=description, max_price=max_price, urgency=urgency,
            preferred_sellers=preferred_sellers or [], created_at=datetime.utcnow().isoformat(),
        )
        self.conn.execute(
            """INSERT INTO market_requests VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (req.id, req.buyer_id, req.buyer_name, req.center, req.dimension,
             req.energy_type, req.description, req.max_price, req.urgency,
             ",".join(req.preferred_sellers), req.created_at),
        )
        self.conn.commit()
        return req

    # -- Matching ----------------------------------------------------------

    def find_matches(self, request_id: str) -> List[Dict]:
        req_row = self.conn.execute(
            "SELECT * FROM market_requests WHERE id = ?", (request_id,)
        ).fetchone()
        if not req_row:
            raise ValueError("Request not found")

        listing_rows = self.conn.execute(
            "SELECT * FROM market_listings WHERE center = ? AND price <= ?",
            (req_row["center"], req_row["max_price"]),
        ).fetchall()

        preferred = set((req_row["preferred_sellers"] or "").split(",")) if req_row["preferred_sellers"] else set()
        matches = []
        for l in listing_rows:
            if l["availability"] == "queued" and req_row["urgency"] == "critical":
                continue

            score = 0.0
            if l["dimension"] == req_row["dimension"]:
                score += 0.3
            elif l["dimension"] == "D3" or req_row["dimension"] == "D3":
                score += 0.1

            score += l["resonance_depth"] * 0.3
            if l["rating"] > 0:
                score += (l["rating"] / 5.0) * 0.2
            if l["availability"] == "immediate" and req_row["urgency"] == "critical":
                score += 0.2

            price_ratio = l["price"] / req_row["max_price"] if req_row["max_price"] else 1.0
            score += (1 - price_ratio) * 0.1
            if l["seller_id"] in preferred:
                score += 0.1

            matches.append({
                "listing": dict(l),
                "match_score": min(1.0, round(score, 4)),
                "estimated_resonance": round(l["resonance_depth"] * (0.85 + random.random() * 0.15), 4),
                "price": l["price"],
            })

        matches.sort(key=lambda m: m["match_score"], reverse=True)
        return matches

    # -- Transactions --------------------------------------------------

    def execute_transaction(self, listing_id: str, request_id: str, broker_id: str) -> Transaction:
        listing = self.conn.execute(
            "SELECT * FROM market_listings WHERE id = ?", (listing_id,)
        ).fetchone()
        req = self.conn.execute(
            "SELECT * FROM market_requests WHERE id = ?", (request_id,)
        ).fetchone()
        if not listing or not req:
            raise ValueError("Listing or request not found")

        buyer_balance = self._get_balance(req["buyer_id"])
        if buyer_balance < listing["price"]:
            raise ValueError("Insufficient credits")

        total = listing["price"]
        broker_fee = round(total * MCP_FEE_RATE, 4)
        platform_fee = round(total * PLATFORM_FEE_RATE, 4)
        seller_receives = round(total - broker_fee - platform_fee, 4)

        self._set_balance(req["buyer_id"], buyer_balance - total)
        self._set_balance(listing["seller_id"], self._get_balance(listing["seller_id"]) + seller_receives)
        self._add_broker_earnings(broker_id, broker_fee)
        self.conn.execute("UPDATE market_platform SET revenue = revenue + ? WHERE id = 1", (platform_fee,))

        tx = Transaction(
            id=f"tx-{uuid.uuid4().hex[:12]}",
            type=_CENTER_TRANSACTION_TYPE.get(listing["center"], "ENERGY_LENDING"),
            listing_id=listing_id, request_id=request_id,
            seller_id=listing["seller_id"], buyer_id=req["buyer_id"], broker_id=broker_id,
            amount=total, broker_fee=broker_fee, platform_fee=platform_fee,
            seller_receives=seller_receives, resonance_score=listing["resonance_depth"],
            status="active", started_at=datetime.utcnow().isoformat(),
        )
        self.conn.execute(
            """INSERT INTO market_transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (tx.id, tx.type, tx.listing_id, tx.request_id, tx.seller_id, tx.buyer_id,
             tx.broker_id, tx.amount, tx.broker_fee, tx.platform_fee, tx.seller_receives,
             tx.resonance_score, tx.status, tx.started_at, tx.completed_at),
        )
        self.conn.execute(
            "UPDATE market_listings SET transaction_count = transaction_count + 1 WHERE id = ?",
            (listing_id,),
        )
        self.conn.execute("DELETE FROM market_requests WHERE id = ?", (request_id,))
        self.conn.commit()
        return tx

    # -- Subscriptions (Klein tool tuning) ------------------------------

    _TUNING_PLANS = {
        "basic": {"cost": 10, "features": ["Weekly tuning reports", "Basic resonance analysis"]},
        "deep": {"cost": 25, "features": ["Daily tuning updates", "Dimensional depth analysis", "Transit alerts"]},
        "mastery": {"cost": 50, "features": ["Real-time tuning", "Full 5D expression map", "Priority brokerage", "Emergent channel detection"]},
    }

    def subscribe_to_tuning(self, user_id: str, tool_name: str, tier: str) -> Dict:
        if tier not in self._TUNING_PLANS:
            raise ValueError(f"Unknown tier: {tier}")
        plan = self._TUNING_PLANS[tier]
        balance = self._get_balance(user_id)
        if balance < plan["cost"]:
            raise ValueError("Insufficient credits for subscription")

        self._set_balance(user_id, balance - plan["cost"])
        self.conn.execute("UPDATE market_platform SET revenue = revenue + ? WHERE id = 1", (plan["cost"] * 0.5,))
        self.conn.commit()

        return {
            "subscription_id": f"sub-{uuid.uuid4().hex[:12]}",
            "tool_name": tool_name,
            "tier": tier,
            "monthly_cost": plan["cost"],
            "features": plan["features"],
        }

    # -- Credits -----------------------------------------------------------

    def _get_balance(self, user_id: str) -> float:
        row = self.conn.execute("SELECT balance FROM market_balances WHERE user_id = ?", (user_id,)).fetchone()
        return row["balance"] if row else 0.0

    def _set_balance(self, user_id: str, amount: float) -> None:
        self.conn.execute(
            "INSERT INTO market_balances (user_id, balance) VALUES (?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance",
            (user_id, amount),
        )
        self.conn.commit()

    def _add_broker_earnings(self, broker_id: str, amount: float) -> None:
        self.conn.execute(
            "INSERT INTO market_broker_earnings (broker_id, earnings) VALUES (?, ?) "
            "ON CONFLICT(broker_id) DO UPDATE SET earnings = earnings + ?",
            (broker_id, amount, amount),
        )
        self.conn.commit()

    def add_credits(self, user_id: str, amount: float) -> float:
        new_balance = self._get_balance(user_id) + amount
        self._set_balance(user_id, new_balance)
        return new_balance

    def get_balance(self, user_id: str) -> float:
        return self._get_balance(user_id)

    # -- Analytics ------------------------------------------------------

    def get_market_stats(self) -> Dict:
        n_listings = self.conn.execute("SELECT COUNT(*) c FROM market_listings").fetchone()["c"]
        n_requests = self.conn.execute("SELECT COUNT(*) c FROM market_requests").fetchone()["c"]
        tx_rows = self.conn.execute("SELECT amount, resonance_score, center FROM market_transactions t "
                                     "LEFT JOIN market_listings l ON l.id = t.listing_id").fetchall()
        n_tx = len(tx_rows)
        total_volume = sum(r["amount"] for r in tx_rows)
        avg_resonance = (sum(r["resonance_score"] for r in tx_rows) / n_tx) if n_tx else 0.0

        center_volumes: Dict[str, float] = {}
        for r in tx_rows:
            if r["center"]:
                center_volumes[r["center"]] = center_volumes.get(r["center"], 0.0) + r["amount"]

        platform_revenue = self.conn.execute("SELECT revenue FROM market_platform WHERE id = 1").fetchone()["revenue"]
        top_brokers = self.conn.execute(
            "SELECT broker_id, earnings FROM market_broker_earnings ORDER BY earnings DESC LIMIT 5"
        ).fetchall()

        return {
            "total_listings": n_listings,
            "total_requests": n_requests,
            "total_transactions": n_tx,
            "total_volume": round(total_volume, 4),
            "platform_revenue": round(platform_revenue, 4),
            "avg_resonance": round(avg_resonance, 4),
            "center_volumes": {k: round(v, 4) for k, v in center_volumes.items()},
            "top_brokers": [dict(r) for r in top_brokers],
        }

    def get_listings_for_center(self, center: str) -> List[Dict]:
        rows = self.conn.execute(
            "SELECT * FROM market_listings WHERE center = ? ORDER BY resonance_depth DESC", (center,)
        ).fetchall()
        return [dict(r) for r in rows]

    def get_user_history(self, user_id: str) -> List[Dict]:
        rows = self.conn.execute(
            "SELECT * FROM market_transactions WHERE seller_id = ? OR buyer_id = ? ORDER BY started_at DESC",
            (user_id, user_id),
        ).fetchall()
        return [dict(r) for r in rows]
