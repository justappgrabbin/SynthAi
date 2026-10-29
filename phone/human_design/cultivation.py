"""Chart-bound personal cultivation, with append-only observation and interpretation records."""
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
from uuid import uuid4


CATALOGUE = json.loads((Path(__file__).with_name("assets") / "cultivation-v1.json").read_text())


class CultivationConflict(ValueError):
    pass


class CultivationStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS cultivation_events (
                    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                    id TEXT NOT NULL UNIQUE, chart_id TEXT NOT NULL,
                    configuration_id TEXT NOT NULL, kind TEXT NOT NULL,
                    parent_id TEXT, payload TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS cultivation_chart_events
                    ON cultivation_events(chart_id, sequence);
            """)

    def connect(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        return db

    @staticmethod
    def _record(row):
        return {"id": row["id"], "chart_id": row["chart_id"],
                "configuration_id": row["configuration_id"], "kind": row["kind"],
                "parent_id": row["parent_id"], "created_at": row["created_at"],
                **json.loads(row["payload"])}

    def _append(self, db, chart_id, configuration_id, kind, payload, parent_id=None):
        event_id = str(uuid4())
        at = datetime.now(timezone.utc).isoformat()
        db.execute("INSERT INTO cultivation_events(id,chart_id,configuration_id,kind,parent_id,payload,created_at) VALUES (?,?,?,?,?,?,?)",
                   (event_id, chart_id, configuration_id, kind, parent_id, json.dumps(payload), at))
        return self._record(db.execute("SELECT * FROM cultivation_events WHERE id=?", (event_id,)).fetchone())

    def _parent(self, db, chart_id, configuration_id, event_id, kind):
        row = db.execute("SELECT * FROM cultivation_events WHERE id=? AND chart_id=? AND configuration_id=? AND kind=?",
                         (event_id, chart_id, configuration_id, kind)).fetchone()
        if not row:
            raise ValueError("That record does not belong to this person's chart.")
        return self._record(row)

    def save_profile(self, chart_id, configuration_id, answers, story_path, expected_revision):
        allowed = {question["id"] for question in CATALOGUE["questions"]}
        if set(answers) - allowed:
            raise ValueError("Unknown interview question.")
        if story_path not in {"", "remember", "explore", "dream"}:
            raise ValueError("Choose one of the supplied story paths.")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            previous = db.execute("SELECT * FROM cultivation_events WHERE chart_id=? AND configuration_id=? AND kind='profile' ORDER BY sequence DESC LIMIT 1",
                                  (chart_id, configuration_id)).fetchone()
            if expected_revision != (previous["id"] if previous else None):
                raise CultivationConflict("Your profile changed in another view. Reload it before saving.")
            merged = json.loads(previous["payload"])["answers"] if previous else {}
            for key, value in answers.items():
                if not isinstance(value, str) or len(value) > 2000:
                    raise ValueError("Keep each answer within 2,000 characters.")
                merged[key] = value.strip()
            return self._append(db, chart_id, configuration_id, "profile",
                                {"answers": merged, "story_path": story_path}, previous["id"] if previous else None)

    def start_practice(self, chart_id, configuration_id, option_id, prompt, action, expected, counterevidence, deadline, anchor):
        option = next((o for o in CATALOGUE["practice_options"] if o["id"] == option_id), None)
        if not option or prompt not in option["prompts"]:
            raise ValueError("Choose a reflection from the supplied practice catalogue.")
        if any(not isinstance(v, str) or not v.strip() or len(v) > 2000 for v in [action, expected, counterevidence]):
            raise ValueError("Describe the action, expected observation, and what would contradict it.")
        try:
            due = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        except (ValueError, TypeError) as exc:
            raise ValueError("Choose a valid future deadline with a timezone.") from exc
        if due.tzinfo is None or due <= datetime.now(timezone.utc):
            raise ValueError("Choose a future observation window with a timezone.")
        with self.connect() as db:
            return self._append(db, chart_id, configuration_id, "practice", {
                "option_id": option_id, "title": option["title"], "category": option["category"],
                "prompt": prompt, "action": action.strip(), "expected": expected.strip(),
                "counterevidence": counterevidence.strip(), "deadline": due.isoformat(),
                "sun_reference": anchor["tropical_sun"], "rule_version": CATALOGUE["version"],
            })

    def observe(self, chart_id, configuration_id, practice_id, situation, action_taken, result, assessment):
        if any(not isinstance(v, str) or not v.strip() or len(v) > 4000 for v in [situation, action_taken, result]):
            raise ValueError("Record the situation, actual action, and observed result.")
        if assessment not in {"supported", "contradicted", "mixed", "unclear", "not_tested"}:
            raise ValueError("Choose a valid assessment.")
        with self.connect() as db:
            self._parent(db, chart_id, configuration_id, practice_id, "practice")
            return self._append(db, chart_id, configuration_id, "observation", {
                "situation": situation.strip(), "action_taken": action_taken.strip(),
                "result": result.strip(), "assessment": assessment,
                "evidence_class": "participant_report",
            }, practice_id)

    def interpret(self, chart_id, configuration_id, observation_id, text):
        if not isinstance(text, str) or not text.strip() or len(text) > 4000:
            raise ValueError("Write your interpretation in up to 4,000 characters.")
        with self.connect() as db:
            self._parent(db, chart_id, configuration_id, observation_id, "observation")
            return self._append(db, chart_id, configuration_id, "interpretation",
                                {"text": text.strip(), "evidence_class": "participant_interpretation"}, observation_id)

    def snapshot(self, chart_id, configuration_id):
        with self.connect() as db:
            rows = db.execute("SELECT * FROM cultivation_events WHERE chart_id=? AND configuration_id=? ORDER BY sequence",
                              (chart_id, configuration_id)).fetchall()
        records = [self._record(row) for row in rows]
        profiles = [r for r in records if r["kind"] == "profile"]
        return {"chart_id": chart_id, "configuration_id": configuration_id,
                "profile": profiles[-1] if profiles else None,
                "profile_revision_count": len(profiles),
                "practices": [r for r in records if r["kind"] == "practice"],
                "observations": [r for r in records if r["kind"] == "observation"],
                "interpretations": [r for r in records if r["kind"] == "interpretation"]}

    def companion_context(self, chart_id, configuration_id):
        state = self.snapshot(chart_id, configuration_id)
        return {**state, "practices": state["practices"][-8:],
                "observations": state["observations"][-8:], "interpretations": state["interpretations"][-8:]}


def chart_practice_options(anchor):
    """Choose from original prompts using the shared birth configuration, never randomness."""
    sun = anchor["tropical_sun"]
    seed = int(anchor["configuration_id"][:8], 16) + sun["gate"] * 6 + sun["line"]
    return [{**option, "selected_prompt": option["prompts"][seed % len(option["prompts"])]}
            for option in CATALOGUE["practice_options"]]
