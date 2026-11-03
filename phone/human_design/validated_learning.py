from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
import json
from pathlib import Path
import re
import sqlite3
from typing import Any
from uuid import uuid4


CLAUSE = re.compile(
    r"\b(?P<subject>[A-Za-z][A-Za-z '-]{0,70}?)\s+"
    r"(?P<predicate>is|are|was|were|means?|becomes?|creates?|connects?|expresses?)\s+"
    r"(?P<object>[^.;!?]{2,220})",
    re.IGNORECASE,
)
OCR_WORD = re.compile(r"\b[A-Za-z0-9!|]{2,}\b")
KNOWN_OCR = {
    "l1iould": "would",
    "l1ould": "would",
    "!dusic": "music",
    "idus ic": "music",
    "hullleln": "human",
    "huinan": "human",
    "des1gn": "design",
}


@dataclass(frozen=True)
class ValidationResult:
    source_id: str
    observations: int
    normalizations: int
    candidates: int
    approved: int
    quarantined: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ValidatedLearningStore:
    """Audited learning store: immutable evidence, reversible derived state."""

    def __init__(self, path: str | Path) -> None:
        self.path = str(path)
        self.connection = sqlite3.connect(self.path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(
            """
            PRAGMA foreign_keys=ON;
            CREATE TABLE IF NOT EXISTS source_observations(
              observation_id TEXT PRIMARY KEY, source_id TEXT NOT NULL,
              page INTEGER NOT NULL, original_text TEXT NOT NULL,
              checksum TEXT NOT NULL, UNIQUE(source_id,page,checksum)
            );
            CREATE TRIGGER IF NOT EXISTS source_observations_no_update
              BEFORE UPDATE ON source_observations BEGIN
                SELECT RAISE(ABORT,'source observations are immutable');
              END;
            CREATE TRIGGER IF NOT EXISTS source_observations_no_delete
              BEFORE DELETE ON source_observations BEGIN
                SELECT RAISE(ABORT,'source observations are immutable');
              END;
            CREATE TABLE IF NOT EXISTS normalizations(
              normalization_id TEXT PRIMARY KEY, observation_id TEXT NOT NULL,
              version INTEGER NOT NULL, normalized_text TEXT NOT NULL,
              confidence REAL NOT NULL, reason TEXT NOT NULL,
              status TEXT NOT NULL, supersedes TEXT,
              FOREIGN KEY(observation_id) REFERENCES source_observations(observation_id)
            );
            CREATE TABLE IF NOT EXISTS relations(
              relation_id TEXT PRIMARY KEY, normalization_id TEXT NOT NULL,
              subject TEXT NOT NULL, predicate TEXT NOT NULL, object TEXT NOT NULL,
              confidence REAL NOT NULL, validation_status TEXT NOT NULL,
              active INTEGER NOT NULL DEFAULT 1,
              FOREIGN KEY(normalization_id) REFERENCES normalizations(normalization_id)
            );
            CREATE TABLE IF NOT EXISTS claims(
              claim_id TEXT PRIMARY KEY, topic TEXT NOT NULL, text TEXT NOT NULL,
              active INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS claim_relations(
              claim_id TEXT NOT NULL, relation_id TEXT NOT NULL,
              PRIMARY KEY(claim_id,relation_id)
            );
            CREATE TABLE IF NOT EXISTS corrections(
              correction_id TEXT PRIMARY KEY, target_kind TEXT NOT NULL,
              target_id TEXT NOT NULL, before_json TEXT NOT NULL,
              after_json TEXT NOT NULL, active INTEGER NOT NULL,
              created_order INTEGER
            );
            """
        )
        self.connection.commit()

    def ingest(self, source_id: str, page: int, text: str) -> str:
        checksum = sha256(text.encode("utf-8")).hexdigest()
        row = self.connection.execute(
            "SELECT observation_id FROM source_observations WHERE source_id=? AND page=? AND checksum=?",
            (source_id, page, checksum),
        ).fetchone()
        if row:
            return str(row["observation_id"])
        observation_id = f"obs_{uuid4().hex}"
        self.connection.execute(
            "INSERT INTO source_observations VALUES(?,?,?,?,?)",
            (observation_id, source_id, page, text, checksum),
        )
        self.connection.commit()
        return observation_id

    def normalize(self, observation_id: str, *, engine_version: str = "AUTOLING-v2") -> str:
        row = self.connection.execute(
            "SELECT original_text FROM source_observations WHERE observation_id=?",
            (observation_id,),
        ).fetchone()
        if not row:
            raise ValueError("Unknown observation.")
        original = row["original_text"]
        normalized, repairs = normalize_ocr(original)
        confidence = normalization_confidence(original, normalized, repairs)
        status = "accepted" if confidence >= 0.72 else "pending"
        version = self.connection.execute(
            "SELECT COALESCE(MAX(version),0)+1 FROM normalizations WHERE observation_id=?",
            (observation_id,),
        ).fetchone()[0]
        normalization_id = f"norm_{uuid4().hex}"
        self.connection.execute(
            "INSERT INTO normalizations VALUES(?,?,?,?,?,?,?,NULL)",
            (
                normalization_id, observation_id, version, normalized, confidence,
                f"{engine_version}: " + (", ".join(repairs) or "no repair"), status,
            ),
        )
        self.connection.commit()
        return normalization_id

    def extract_and_validate(self, normalization_id: str) -> tuple[str, ...]:
        row = self.connection.execute(
            "SELECT * FROM normalizations WHERE normalization_id=?",
            (normalization_id,),
        ).fetchone()
        if not row:
            raise ValueError("Unknown normalization.")
        ids = []
        for match in CLAUSE.finditer(" ".join(row["normalized_text"].split())):
            subject, predicate, obj = (match[key].strip() for key in ("subject", "predicate", "object"))
            malformed = any(character.isdigit() or character in "!|" for character in subject + obj)
            confidence = float(row["confidence"]) * (0.55 if malformed else 0.94)
            status = "approved" if row["status"] == "accepted" and confidence >= 0.68 else "quarantined"
            relation_id = f"rel_{uuid4().hex}"
            self.connection.execute(
                "INSERT INTO relations VALUES(?,?,?,?,?,?,?,1)",
                (relation_id, normalization_id, subject, predicate.casefold(), obj, confidence, status),
            )
            ids.append(relation_id)
        self.connection.commit()
        return tuple(ids)

    def correct_normalization(self, normalization_id: str, corrected_text: str) -> str:
        before = dict(self.connection.execute(
            "SELECT * FROM normalizations WHERE normalization_id=?", (normalization_id,)
        ).fetchone())
        new_id = f"norm_{uuid4().hex}"
        self.connection.execute(
            "UPDATE relations SET active=0 WHERE normalization_id=?", (normalization_id,)
        )
        self.connection.execute(
            "UPDATE normalizations SET status='superseded' WHERE normalization_id=?", (normalization_id,)
        )
        new_version = int(before["version"]) + 1
        self.connection.execute(
            "INSERT INTO normalizations VALUES(?,?,?,?,?,?,?,?)",
            (new_id, before["observation_id"], new_version, corrected_text, 1.0,
             "user correction", "accepted", normalization_id),
        )
        after = dict(self.connection.execute(
            "SELECT * FROM normalizations WHERE normalization_id=?", (new_id,)
        ).fetchone())
        correction_id = f"correction_{uuid4().hex}"
        self.connection.execute(
            """INSERT INTO corrections(correction_id,target_kind,target_id,before_json,after_json,active)
               VALUES(?,?,?,?,?,1)""",
            (correction_id, "normalization", normalization_id, json.dumps(before), json.dumps(after)),
        )
        self._invalidate_unsupported_claims()
        self.connection.commit()
        self.extract_and_validate(new_id)
        return correction_id

    def rollback(self, correction_id: str) -> None:
        correction = self.connection.execute(
            "SELECT * FROM corrections WHERE correction_id=? AND active=1", (correction_id,)
        ).fetchone()
        if not correction:
            raise ValueError("Unknown or inactive correction.")
        before, after = json.loads(correction["before_json"]), json.loads(correction["after_json"])
        self.connection.execute(
            "UPDATE normalizations SET status=? WHERE normalization_id=?",
            (before["status"], before["normalization_id"]),
        )
        self.connection.execute(
            "UPDATE relations SET active=1 WHERE normalization_id=?",
            (before["normalization_id"],),
        )
        self.connection.execute(
            "UPDATE normalizations SET status='rolled_back' WHERE normalization_id=?",
            (after["normalization_id"],),
        )
        self.connection.execute(
            "UPDATE relations SET active=0 WHERE normalization_id=?",
            (after["normalization_id"],),
        )
        self.connection.execute("UPDATE corrections SET active=0 WHERE correction_id=?", (correction_id,))
        self._restore_supported_claims()
        self.connection.commit()

    def write_claims(self, topic: str, limit: int = 20) -> tuple[str, ...]:
        rows = self.connection.execute(
            """SELECT * FROM relations WHERE active=1 AND validation_status='approved'
               AND (lower(subject) LIKE lower(?) OR lower(object) LIKE lower(?))
               ORDER BY confidence DESC LIMIT ?""",
            (f"%{topic}%", f"%{topic}%", limit),
        )
        claim_ids = []
        for relation in rows:
            claim_id = f"claim_{uuid4().hex}"
            text = f"{relation['subject']} {relation['predicate']} {relation['object']}"
            self.connection.execute("INSERT INTO claims VALUES(?,?,?,1)", (claim_id, topic, text))
            self.connection.execute(
                "INSERT INTO claim_relations VALUES(?,?)", (claim_id, relation["relation_id"])
            )
            claim_ids.append(claim_id)
        self.connection.commit()
        return tuple(claim_ids)

    def trace_claim(self, claim_id: str) -> tuple[dict[str, Any], ...]:
        rows = self.connection.execute(
            """SELECT c.claim_id,c.text AS claim_text,r.*,n.normalization_id,n.normalized_text,
                      o.observation_id,o.source_id,o.page,o.original_text,o.checksum
               FROM claims c JOIN claim_relations cr ON c.claim_id=cr.claim_id
               JOIN relations r ON r.relation_id=cr.relation_id
               JOIN normalizations n ON n.normalization_id=r.normalization_id
               JOIN source_observations o ON o.observation_id=n.observation_id
               WHERE c.claim_id=?""",
            (claim_id,),
        )
        return tuple(dict(row) for row in rows)

    def status(self) -> dict[str, Any]:
        counts = {}
        for table in (
            "source_observations", "normalizations", "relations", "claims", "corrections"
        ):
            counts[table] = self.connection.execute(
                f"SELECT COUNT(*) FROM {table}"
            ).fetchone()[0]
        counts["approved_relations"] = self.connection.execute(
            "SELECT COUNT(*) FROM relations WHERE active=1 AND validation_status='approved'"
        ).fetchone()[0]
        counts["quarantined_relations"] = self.connection.execute(
            "SELECT COUNT(*) FROM relations WHERE active=1 AND validation_status='quarantined'"
        ).fetchone()[0]
        counts["active_claims"] = self.connection.execute(
            "SELECT COUNT(*) FROM claims WHERE active=1"
        ).fetchone()[0]
        return counts

    def _invalidate_unsupported_claims(self) -> None:
        self.connection.execute(
            """UPDATE claims SET active=0 WHERE claim_id IN (
                 SELECT cr.claim_id FROM claim_relations cr
                 JOIN relations r ON r.relation_id=cr.relation_id
                 WHERE r.active=0 OR r.validation_status!='approved')"""
        )

    def _restore_supported_claims(self) -> None:
        self.connection.execute(
            """UPDATE claims SET active=1 WHERE NOT EXISTS (
                 SELECT 1 FROM claim_relations cr JOIN relations r ON r.relation_id=cr.relation_id
                 WHERE cr.claim_id=claims.claim_id
                 AND (r.active=0 OR r.validation_status!='approved'))"""
        )


def normalize_ocr(text: str) -> tuple[str, list[str]]:
    revised = text.replace("\u00ad", "")
    repairs: list[str] = []
    joined = re.sub(r"(?<=\w)-\s*\n\s*(?=[a-z])", "", revised)
    if joined != revised:
        repairs.append("joined line-break hyphenation")
        revised = joined
    for corrupted, replacement in KNOWN_OCR.items():
        pattern = re.compile(re.escape(corrupted), re.IGNORECASE)
        match = pattern.search(revised)
        if match:
            raw = match.group(0)
            revised = pattern.sub(replacement, revised)
            repairs.append(f"{raw}->{replacement}")
    spaced = re.sub(r"[ \t]{2,}", " ", revised)
    if spaced != revised:
        repairs.append("normalized spacing")
        revised = spaced
    return revised, repairs


def normalization_confidence(original: str, normalized: str, repairs: list[str]) -> float:
    suspicious = sum(character.isdigit() or character in "!|" for character in normalized)
    ratio = suspicious / max(1, len(normalized))
    change_ratio = abs(len(original) - len(normalized)) / max(1, len(original))
    return round(max(0.3, min(0.99, 0.96 - ratio * 8 - change_ratio * 2)), 3)
