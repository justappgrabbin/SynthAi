"""Opt-in member discovery using the supplied resonance and opportunity/consent engines."""
from datetime import datetime, timezone
import json
from pathlib import Path
import secrets
import sqlite3
import subprocess


class NetworkConflict(ValueError):
    pass


def run_resonance_engine(payload):
    entry = Path(__file__).resolve().parents[1] / "runtimes" / "resonance" / "network-bridge.mjs"
    try:
        result = subprocess.run(["node", str(entry)], input=json.dumps(payload),
                                text=True, capture_output=True, timeout=20, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError("The supplied resonance engine is unavailable.") from exc
    if result.returncode:
        raise RuntimeError("The resonance or consent engine could not complete this operation.")
    return json.loads(result.stdout)


class ResonanceNetwork:
    def __init__(self, path, engine=run_resonance_engine):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.engine = engine
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS resonance_chart_owners(chart_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS resonance_profiles(
                    user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, chart_id TEXT NOT NULL,
                    configuration_id TEXT NOT NULL, discoverable INTEGER NOT NULL DEFAULT 0,
                    intents TEXT NOT NULL, interests TEXT NOT NULL, model_profile TEXT,
                    updated_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS resonance_opportunities(
                    id TEXT PRIMARY KEY, sender_id INTEGER NOT NULL, recipient_id INTEGER NOT NULL,
                    sender_name TEXT NOT NULL, recipient_name TEXT NOT NULL,
                    status TEXT NOT NULL, match_json TEXT NOT NULL, ledger_json TEXT NOT NULL,
                    consent_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS resonance_private_config(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """)
            db.execute("INSERT OR IGNORE INTO resonance_private_config VALUES ('consent_key',?)", (secrets.token_hex(32),))

    def connect(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        return db

    @staticmethod
    def _at():
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _id(left, right):
        return "resonance:" + ":".join(str(i) for i in sorted([left, right]))

    def publish(self, member, master, discoverable, intents, interests):
        allowed = {"conversation", "collaboration", "shared_practice", "research"}
        if set(intents) - allowed or (discoverable and not intents):
            raise ValueError("Choose at least one connection purpose when joining discovery.")
        if len(interests) > 20 or any(not isinstance(v, str) or len(v) > 80 for v in interests):
            raise ValueError("Use up to 20 short interests.")
        profile = self.engine({"op": "profile", "master": master}) if discoverable else None
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            owner = db.execute("SELECT user_id FROM resonance_chart_owners WHERE chart_id=?", (master["chart_id"],)).fetchone()
            if owner and owner["user_id"] != member["id"]:
                raise NetworkConflict("This chart is already linked to another member.")
            previous = db.execute("SELECT configuration_id,intents FROM resonance_profiles WHERE user_id=?", (member["id"],)).fetchone()
            db.execute("INSERT OR IGNORE INTO resonance_chart_owners VALUES (?,?)", (master["chart_id"], member["id"]))
            db.execute("""INSERT INTO resonance_profiles VALUES (?,?,?,?,?,?,?,?,?)
                ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, chart_id=excluded.chart_id,
                configuration_id=excluded.configuration_id,discoverable=excluded.discoverable,
                intents=excluded.intents,interests=excluded.interests,model_profile=excluded.model_profile,updated_at=excluded.updated_at""",
                (member["id"], member["name"], master["chart_id"], master["birth_anchor"]["configuration_id"],
                 int(discoverable), json.dumps(sorted(set(intents))), json.dumps([s.strip() for s in interests if s.strip()]),
                 json.dumps(profile) if profile else None, self._at()))
            if not discoverable or (previous and (previous["configuration_id"] != master["birth_anchor"]["configuration_id"] or set(json.loads(previous["intents"])) != set(intents))):
                db.execute("UPDATE resonance_opportunities SET status='expired',updated_at=? WHERE status='pending' AND (sender_id=? OR recipient_id=?)",
                           (self._at(), member["id"], member["id"]))
        return self.settings(member["id"])

    def withdraw(self, user_id):
        """Withdrawing does not require a surviving chart or a running calculation engine."""
        with self.connect() as db:
            db.execute("UPDATE resonance_profiles SET discoverable=0,model_profile=NULL,updated_at=? WHERE user_id=?", (self._at(), user_id))
            db.execute("UPDATE resonance_opportunities SET status='expired',updated_at=? WHERE status='pending' AND (sender_id=? OR recipient_id=?)", (self._at(), user_id, user_id))
        return self.settings(user_id)

    def settings(self, user_id):
        with self.connect() as db:
            row = db.execute("SELECT * FROM resonance_profiles WHERE user_id=?", (user_id,)).fetchone()
        if not row:
            return {"discoverable": False, "intents": [], "interests": [], "chart_id": None}
        return {"discoverable": bool(row["discoverable"]), "intents": json.loads(row["intents"]),
                "interests": json.loads(row["interests"]), "chart_id": row["chart_id"],
                "configuration_id": row["configuration_id"]}

    def matches(self, user_id):
        with self.connect() as db:
            viewer = db.execute("SELECT * FROM resonance_profiles WHERE user_id=? AND discoverable=1", (user_id,)).fetchone()
            if not viewer:
                return []
            others = db.execute("SELECT * FROM resonance_profiles WHERE user_id!=? AND discoverable=1 ORDER BY user_id LIMIT 100", (user_id,)).fetchall()
            existing = {r["id"]: r["status"] for r in db.execute("SELECT id,status FROM resonance_opportunities WHERE sender_id=? OR recipient_id=?", (user_id, user_id))}
        own_intents = set(json.loads(viewer["intents"]))
        candidates = [r for r in others if own_intents.intersection(json.loads(r["intents"]))]
        if not candidates:
            return []
        computed = self.engine({"op": "compare", "viewer": json.loads(viewer["model_profile"]),
                               "candidates": [{"id": r["user_id"], "profile": json.loads(r["model_profile"])} for r in candidates]})["matches"]
        by_id = {r["user_id"]: r for r in candidates}
        output = []
        for score in computed:
            other = by_id[score["id"]]
            common = sorted(own_intents.intersection(json.loads(other["intents"])))
            shared_interests = sorted(set(json.loads(viewer["interests"])).intersection(json.loads(other["interests"])))
            opportunity = self._opportunity(viewer, other, score, common, False)
            status = existing.get(self._id(user_id, other["user_id"]))
            output.append({"member_id": other["user_id"], "name": other["name"], "shared_intents": common,
                           "shared_interests": shared_interests, "true_node": score["true_node"], "mean_node": score["mean_node"],
                           "invitation_status": status, "can_invite": opportunity["guard"]["permitted"] and status is None,
                           "reason": opportunity["guard"]["reason"] if status is None else "An invitation already exists for this pair.",
                           "model_version": "supplied-nine-field-v1", "evidence_status": "experimental_chart_similarity"})
        return sorted(output, key=lambda r: (-r["true_node"]["overall"], r["member_id"]))

    def _opportunity(self, viewer, other, score, common, record, history=None):
        return self.engine({"op": "opportunity", "record_invitation": record,
            "opportunity_id": self._id(viewer["user_id"], other["user_id"]), "history": history or [],
            "actor": {"id": viewer["user_id"]}, "subject": {"id": other["user_id"]},
            "value": {"need": {"description": "A mutually chosen resonance connection", "requiredCapabilities": ["connection:" + s for s in common]},
                      "candidate": {"id": other["user_id"], "source": "opt_in_member_directory", "publicOrAuthorizedContext": bool(other["discoverable"]),
                                    "availableCapabilities": ["connection:" + s for s in json.loads(other["intents"])]},
                      "networkOffer": ["connection:" + s for s in common],
                      "evidence": [{"kind": "mutual_connection_intent", "relevance": 1, "intents": common},
                                   {"kind": "experimental_chart_model", "relevance": score["true_node"]["overall"]}]}})

    def invite(self, user_id, recipient_id):
        if user_id == recipient_id:
            raise ValueError("Choose another member.")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            rows = db.execute("SELECT * FROM resonance_profiles WHERE user_id IN (?,?) AND discoverable=1", (user_id, recipient_id)).fetchall()
            by_id = {r["user_id"]: r for r in rows}
            if set(by_id) != {user_id, recipient_id}:
                raise ValueError("Both members must currently opt in to discovery.")
            opportunity_id = self._id(user_id, recipient_id)
            if db.execute("SELECT 1 FROM resonance_opportunities WHERE id=?", (opportunity_id,)).fetchone():
                raise NetworkConflict("The single-invitation rule has already been used for this pair.")
            viewer, other = by_id[user_id], by_id[recipient_id]
            common = sorted(set(json.loads(viewer["intents"])).intersection(json.loads(other["intents"])))
            score = self.engine({"op": "compare", "viewer": json.loads(viewer["model_profile"]),
                                 "candidates": [{"id": recipient_id, "profile": json.loads(other["model_profile"])}]})["matches"][0]
            evaluated = self._opportunity(viewer, other, score, common, True)
            if not evaluated["guard"]["permitted"]:
                raise ValueError(evaluated["guard"]["reason"])
            at = self._at()
            score["chart_references"] = {"sender_configuration_id": viewer["configuration_id"],
                                          "recipient_configuration_id": other["configuration_id"],
                                          "model_version": "supplied-nine-field-v1"}
            db.execute("INSERT INTO resonance_opportunities VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                       (opportunity_id, user_id, recipient_id, viewer["name"], other["name"], "pending",
                        json.dumps(score), json.dumps(evaluated["ledger"]), None, at, at))
        return {"id": opportunity_id, "status": "pending"}

    def respond(self, user_id, opportunity_id, response):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM resonance_opportunities WHERE id=?", (opportunity_id,)).fetchone()
            if not row or user_id not in {row["sender_id"], row["recipient_id"]}:
                raise ValueError("This invitation does not belong to you.")
            if response in {"accepted", "declined"} and (row["recipient_id"] != user_id or row["status"] != "pending"):
                raise NetworkConflict("Only the recipient can answer a pending invitation.")
            if response == "revoked" and row["status"] != "accepted":
                raise NetworkConflict("Only an accepted connection can be disconnected.")
            if response not in {"accepted", "declined", "revoked"}:
                raise ValueError("Choose accept, decline, or disconnect.")
            if response == "accepted":
                active = db.execute("SELECT count(*) FROM resonance_profiles WHERE user_id IN (?,?) AND discoverable=1", (row["sender_id"], row["recipient_id"])).fetchone()[0]
                if active != 2:
                    raise NetworkConflict("Discovery consent has changed; this invitation cannot be accepted.")
            secret = db.execute("SELECT value FROM resonance_private_config WHERE key='consent_key'").fetchone()[0]
            result = self.engine({"op": "respond", "opportunity_id": opportunity_id, "response": response,
                                  "subject_id": row["recipient_id"], "actor_id": user_id, "secret": secret,
                                  "history": json.loads(row["ledger_json"]),
                                  "consent": json.loads(row["consent_json"]) if row["consent_json"] else None})
            db.execute("UPDATE resonance_opportunities SET status=?,ledger_json=?,consent_json=?,updated_at=? WHERE id=?",
                       (response, json.dumps(result["ledger"]), json.dumps(result["consent"]), self._at(), opportunity_id))
        return {"id": opportunity_id, "status": response}

    def invitations(self, user_id):
        with self.connect() as db:
            rows = db.execute("SELECT * FROM resonance_opportunities WHERE sender_id=? OR recipient_id=? ORDER BY created_at DESC", (user_id, user_id)).fetchall()
        return [{"id": r["id"], "status": r["status"], "direction": "incoming" if r["recipient_id"] == user_id else "outgoing",
                 "other_member_id": r["sender_id"] if r["recipient_id"] == user_id else r["recipient_id"],
                 "other_name": r["sender_name"] if r["recipient_id"] == user_id else r["recipient_name"],
                 "created_at": r["created_at"], "consent_kind": "collaboration" if r["consent_json"] else None}
                for r in rows]
