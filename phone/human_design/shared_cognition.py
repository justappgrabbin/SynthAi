from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
import json
from pathlib import Path
import re
import sqlite3
from typing import Any, Iterable
from uuid import uuid4


TOKEN = re.compile(r"[^\W_]+(?:['’-][^\W_]+)*", re.UNICODE)
CLAUSE = re.compile(
    r"\b(?P<subject>[^\s,.;:!?]+(?:\s+[^\s,.;:!?]+){0,4})\s+"
    r"(?P<relation>is|are|was|were|has|have|becomes?|means?|"
    r"creates?|connects?|expresses?|moves?|changes?|contains?)\s+"
    r"(?P<object>[^.;!?]{1,220})",
    re.IGNORECASE,
)
QUESTION_AXES = ("who", "what", "where", "when", "why")


def _now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass(frozen=True)
class Observation:
    observation_id: str
    source_ref: str
    source_kind: str
    language: str
    text: str
    page: int | None
    created_at_utc: str


@dataclass(frozen=True)
class Reading:
    observation_id: str
    language: str
    axes: dict[str, tuple[str, ...]]
    learned_relations: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ProofreadResult:
    original: str
    revised: str
    language: str
    changes: tuple[dict[str, str], ...]
    status: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class NetworkAnswer:
    question: str
    text: str
    evidence: tuple[dict[str, Any], ...]
    status: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ReportPlan:
    topic: str
    claim_order: tuple[str, ...]
    evidence: tuple[dict[str, Any], ...]
    status: str = "deep_structure"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SharedCognitiveNetwork:
    """Persistent weighted network shared by every Klein-derived service."""

    def __init__(self, path: str | Path = ":memory:") -> None:
        self.path = str(path)
        self.connection = sqlite3.connect(self.path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS units (
              unit_id TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL,
              normalized TEXT NOT NULL, language TEXT NOT NULL,
              activation REAL NOT NULL, observations INTEGER NOT NULL,
              UNIQUE(kind, normalized, language)
            );
            CREATE TABLE IF NOT EXISTS links (
              link_id TEXT PRIMARY KEY, source_id TEXT NOT NULL,
              relation TEXT NOT NULL, target_id TEXT NOT NULL,
              weight REAL NOT NULL, observations INTEGER NOT NULL,
              UNIQUE(source_id, relation, target_id)
            );
            CREATE TABLE IF NOT EXISTS observations (
              observation_id TEXT PRIMARY KEY, source_ref TEXT NOT NULL,
              source_kind TEXT NOT NULL, language TEXT NOT NULL,
              text TEXT NOT NULL, page INTEGER, created_at_utc TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS link_evidence (
              link_id TEXT NOT NULL, observation_id TEXT NOT NULL,
              PRIMARY KEY(link_id, observation_id)
            );
            CREATE TABLE IF NOT EXISTS grammar_patterns (
              pattern_id TEXT PRIMARY KEY, language TEXT NOT NULL,
              pattern TEXT NOT NULL, role TEXT NOT NULL, weight REAL NOT NULL,
              observations INTEGER NOT NULL, UNIQUE(language, pattern, role)
            );
            CREATE TABLE IF NOT EXISTS tool_events (
              event_id TEXT PRIMARY KEY, tool TEXT NOT NULL, operation TEXT NOT NULL,
              payload_json TEXT NOT NULL, created_at_utc TEXT NOT NULL
            );
            """
        )
        self.connection.commit()

    def observe(
        self,
        text: str,
        *,
        source_ref: str,
        source_kind: str,
        language: str,
        page: int | None = None,
    ) -> Observation:
        if not text.strip() or not source_ref.strip():
            raise ValueError("Observation text and source reference are required.")
        item = Observation(
            observation_id=f"observation_{uuid4().hex}",
            source_ref=source_ref.strip(),
            source_kind=source_kind.strip(),
            language=language.casefold(),
            text=text.strip(),
            page=page,
            created_at_utc=_now(),
        )
        self.connection.execute(
            "INSERT INTO observations VALUES (?, ?, ?, ?, ?, ?, ?)",
            tuple(asdict(item).values()),
        )
        self.connection.commit()
        return item

    def unit(self, label: str, *, kind: str, language: str) -> str:
        normalized = label.casefold().strip()
        row = self.connection.execute(
            "SELECT unit_id, activation, observations FROM units WHERE kind=? AND normalized=? AND language=?",
            (kind, normalized, language),
        ).fetchone()
        if row:
            count = row["observations"] + 1
            activation = row["activation"] + (1.0 - row["activation"]) / count
            self.connection.execute(
                "UPDATE units SET activation=?, observations=? WHERE unit_id=?",
                (activation, count, row["unit_id"]),
            )
            return str(row["unit_id"])
        unit_id = f"unit_{uuid4().hex}"
        self.connection.execute(
            "INSERT INTO units VALUES (?, ?, ?, ?, ?, ?, ?)",
            (unit_id, kind, label.strip(), normalized, language, 1.0, 1),
        )
        return unit_id

    def connect(
        self,
        source_id: str,
        relation: str,
        target_id: str,
        *,
        observation_id: str,
        strength: float = 1.0,
    ) -> None:
        relation = relation.casefold().strip()
        row = self.connection.execute(
            "SELECT * FROM links WHERE source_id=? AND relation=? AND target_id=?",
            (source_id, relation, target_id),
        ).fetchone()
        if row:
            count = row["observations"] + 1
            weight = row["weight"] + (strength - row["weight"]) / count
            link_id = row["link_id"]
            self.connection.execute(
                "UPDATE links SET weight=?, observations=? WHERE link_id=?",
                (weight, count, link_id),
            )
        else:
            link_id = f"link_{uuid4().hex}"
            self.connection.execute(
                "INSERT INTO links VALUES (?, ?, ?, ?, ?, ?)",
                (link_id, source_id, relation, target_id, strength, 1),
            )
        self.connection.execute(
            "INSERT OR IGNORE INTO link_evidence VALUES (?, ?)",
            (link_id, observation_id),
        )
        self.connection.commit()

    def learn_grammar(self, language: str, pattern: str, role: str) -> None:
        row = self.connection.execute(
            "SELECT * FROM grammar_patterns WHERE language=? AND pattern=? AND role=?",
            (language, pattern, role),
        ).fetchone()
        if row:
            count = row["observations"] + 1
            weight = row["weight"] + (1.0 - row["weight"]) / count
            self.connection.execute(
                "UPDATE grammar_patterns SET weight=?, observations=? WHERE pattern_id=?",
                (weight, count, row["pattern_id"]),
            )
        else:
            self.connection.execute(
                "INSERT INTO grammar_patterns VALUES (?, ?, ?, ?, ?, ?)",
                (f"grammar_{uuid4().hex}", language, pattern, role, 0.5, 1),
            )
        self.connection.commit()

    def record_tool_event(self, tool: str, operation: str, payload: dict[str, Any]) -> None:
        self.connection.execute(
            "INSERT INTO tool_events VALUES (?, ?, ?, ?, ?)",
            (f"event_{uuid4().hex}", tool, operation, json.dumps(payload), _now()),
        )
        self.connection.commit()

    def evidence_for(
        self,
        terms: Iterable[str],
        limit: int = 12,
        *,
        exclude_kinds: tuple[str, ...] = (),
    ) -> tuple[dict[str, Any], ...]:
        needles = [term.casefold() for term in terms if term.strip()]
        if not needles:
            return ()
        rows = self.connection.execute(
            "SELECT * FROM observations ORDER BY created_at_utc DESC"
        )
        found = []
        for row in rows:
            if row["source_kind"] in exclude_kinds:
                continue
            if any(needle in row["text"].casefold() for needle in needles):
                found.append(dict(row))
            if len(found) >= limit:
                break
        return tuple(found)


class AdaptiveAUTOLING:
    """Learns language patterns and reads observations over five interrogative axes."""

    MARKERS = {
        "who": {"i", "we", "you", "they", "he", "she", "person", "people", "who"},
        "what": {"is", "are", "means", "thing", "system", "what", "es", "son", "est", "sont"},
        "where": {"in", "at", "from", "toward", "through", "where"},
        "when": {"when", "before", "after", "during", "now", "then", "time"},
        "why": {"why", "because", "therefore", "purpose", "so", "reason"},
    }

    def __init__(self, network: SharedCognitiveNetwork) -> None:
        self.network = network

    def read(
        self,
        text: str,
        *,
        source_ref: str,
        language: str = "auto",
        page: int | None = None,
        source_kind: str = "book",
    ) -> Reading:
        detected = self.detect_language(text) if language == "auto" else language.casefold()
        proofread = self.proofread(text, language=detected, mode="source")
        observation = self.network.observe(
            proofread.revised,
            source_ref=source_ref,
            source_kind=source_kind,
            language=detected,
            page=page,
        )
        tokens = tuple(match.group(0).casefold() for match in TOKEN.finditer(text))
        axes: dict[str, list[str]] = {axis: [] for axis in QUESTION_AXES}
        for index, token in enumerate(tokens):
            for axis, markers in self.MARKERS.items():
                if token in markers:
                    clue = " ".join(tokens[max(0, index - 3): index + 5])
                    if clue and clue not in axes[axis]:
                        axes[axis].append(clue)
                    self.network.learn_grammar(detected, token, axis)
        relations = 0
        for match in CLAUSE.finditer(" ".join(text.split())):
            left = self.network.unit(match["subject"], kind="object", language=detected)
            right = self.network.unit(match["object"], kind="object", language=detected)
            self.network.connect(
                left,
                match["relation"],
                right,
                observation_id=observation.observation_id,
            )
            relations += 1
        result = Reading(
            observation_id=observation.observation_id,
            language=detected,
            axes={key: tuple(value) for key, value in axes.items()},
            learned_relations=relations,
        )
        self.network.record_tool_event("AUTOLING", "read_and_learn", result.to_dict())
        return result

    def proofread(
        self,
        text: str,
        *,
        language: str = "auto",
        mode: str = "generated",
    ) -> ProofreadResult:
        detected = self.detect_language(text) if language == "auto" else language.casefold()
        revised = text
        changes: list[dict[str, str]] = []

        def apply(pattern: str, replacement: str, label: str, flags: int = 0) -> None:
            nonlocal revised
            updated = re.sub(pattern, replacement, revised, flags=flags)
            if updated != revised:
                changes.append({"operation": label, "before": revised, "after": updated})
                revised = updated

        apply(r"\u00ad\s*", "", "remove_soft_hyphen")
        apply(r"(?<=\w)-\s*\n\s*(?=[a-z])", "", "join_hyphenated_ocr_word")
        apply(r"[ \t]{2,}", " ", "normalize_spacing")
        apply(r" *([,.;:!?])", r"\1", "normalize_punctuation_spacing")
        apply(r"([,.;:!?])(?=[A-Za-z])", r"\1 ", "restore_punctuation_spacing")
        apply(r"\b(\w+)(\s+\1\b)+", r"\1", "remove_accidental_repetition", re.IGNORECASE)
        if mode == "generated":
            apply(r"^\s*([a-z])", lambda match: match.group(1).upper(), "capitalize_opening")
            if revised.strip() and revised.rstrip()[-1] not in ".!?":
                before = revised
                revised = revised.rstrip() + "."
                changes.append({"operation": "close_sentence", "before": before, "after": revised})
        result = ProofreadResult(
            original=text,
            revised=revised,
            language=detected,
            changes=tuple(changes),
            status="revised" if changes else "unchanged",
        )
        self.network.record_tool_event("AUTOLING", "proofread", result.to_dict())
        return result

    def detect_language(self, text: str) -> str:
        sample = text.casefold()
        scores = {
            "english": sum(f" {word} " in f" {sample} " for word in ("the", "and", "is", "of")),
            "spanish": sum(f" {word} " in f" {sample} " for word in ("el", "la", "y", "de")),
            "french": sum(f" {word} " in f" {sample} " for word in ("le", "la", "et", "de")),
        }
        language, score = max(scores.items(), key=lambda item: item[1])
        return language if score else "undetermined"


class NetworkDISEMINER:
    def __init__(self, network: SharedCognitiveNetwork, autoling: AdaptiveAUTOLING) -> None:
        self.network = network
        self.autoling = autoling

    def ingest_pages(
        self,
        source_ref: str,
        pages: Iterable[tuple[int, str]],
        *,
        language: str = "auto",
    ) -> tuple[Reading, ...]:
        readings = tuple(
            self.autoling.read(text, source_ref=source_ref, language=language, page=page)
            for page, text in pages
            if text.strip()
        )
        self.network.record_tool_event(
            "DISEMINER", "ingest_pages", {"source_ref": source_ref, "pages": len(readings)}
        )
        return readings

    def research(self, text: str, *, source_ref: str, language: str = "auto") -> Reading:
        result = self.autoling.read(
            text, source_ref=source_ref, source_kind="research", language=language
        )
        self.network.record_tool_event("DISEMINER", "research", result.to_dict())
        return result

    def answer(self, question: str) -> NetworkAnswer:
        terms = [match.group(0) for match in TOKEN.finditer(question) if len(match.group(0)) > 3]
        evidence = self.network.evidence_for(terms, exclude_kinds=("chat",))
        if not evidence:
            return NetworkAnswer(question, "The shared network has not learned enough evidence to answer yet.", (), "insufficient_evidence")
        text = " ".join(item["text"] for item in evidence[:3])
        return NetworkAnswer(question, text, evidence, "source_grounded")


class ReportAutoNovel:
    """Writes complete reports through deep structure and surface realization."""

    def __init__(
        self,
        network: SharedCognitiveNetwork,
        diseminer: NetworkDISEMINER,
        paraphraser: AdaptiveParaphraser,
        autoling: AdaptiveAUTOLING,
    ) -> None:
        self.network = network
        self.diseminer = diseminer
        self.paraphraser = paraphraser
        self.autoling = autoling

    def plan(self, topic: str) -> ReportPlan:
        answer = self.diseminer.answer(topic)
        if answer.status != "source_grounded":
            return ReportPlan(topic, (), (), "insufficient_evidence")
        result = ReportPlan(
            topic=topic,
            claim_order=tuple(item["observation_id"] for item in answer.evidence),
            evidence=answer.evidence,
        )
        self.network.record_tool_event("AutoNovel", "plan_report", result.to_dict())
        return result

    def report(self, topic: str) -> NetworkAnswer:
        """Public AutoNovel skill: return the finished, cited report."""
        plan = self.plan(topic)
        surface = self.paraphraser.realize(plan)
        if surface.status != "surface_realization":
            return surface
        proofread = self.autoling.proofread(surface.text, mode="generated")
        result = NetworkAnswer(topic, proofread.revised, surface.evidence, "generated_report")
        self.network.record_tool_event(
            "AutoNovel",
            "write_complete_report",
            {"plan": plan.to_dict(), "report": result.to_dict()},
        )
        return result


class AdaptiveParaphraser:
    """Realizes an AutoNovel deep structure as surface language."""

    def __init__(self, network: SharedCognitiveNetwork) -> None:
        self.network = network

    def realize(self, plan: ReportPlan) -> NetworkAnswer:
        if plan.status != "deep_structure":
            return NetworkAnswer(plan.topic, "There is not enough approved evidence for a report.", (), plan.status)
        by_id = {item["observation_id"]: item for item in plan.evidence}
        paragraphs = []
        for observation_id in plan.claim_order:
            item = by_id[observation_id]
            page = f", PDF page {item['page']}" if item["page"] is not None else ""
            paragraphs.append(f"From {item['source_ref']}{page}: {item['text']}")
        result = NetworkAnswer(plan.topic, "\n\n".join(paragraphs), plan.evidence, "surface_realization")
        self.network.record_tool_event("Paraphraser", "realize_report", result.to_dict())
        return result


class SynthiaCognitiveRuntime:
    def __init__(self, database: str | Path = ":memory:") -> None:
        self.network = SharedCognitiveNetwork(database)
        self.autoling = AdaptiveAUTOLING(self.network)
        self.diseminer = NetworkDISEMINER(self.network, self.autoling)
        self.paraphraser = AdaptiveParaphraser(self.network)
        self.autonovel = ReportAutoNovel(
            self.network,
            self.diseminer,
            self.paraphraser,
            self.autoling,
        )

    def chat(self, message: str) -> NetworkAnswer:
        self.autoling.read(message, source_ref="conversation", source_kind="chat")
        return self.diseminer.answer(message)

    def grounded_chat(
        self,
        message: str,
        *,
        context: str,
        source_ref: str,
        language: str = "auto",
    ) -> NetworkAnswer:
        """Realize a chart-grounded answer through the shared local LCM."""
        reading = self.autoling.read(
            context,
            source_ref=source_ref,
            source_kind="chart_context",
            language=language,
        )
        self.autoling.read(
            message,
            source_ref="conversation",
            source_kind="chat",
            language=language,
        )
        row = self.network.connection.execute(
            "SELECT * FROM observations WHERE observation_id=?",
            (reading.observation_id,),
        ).fetchone()
        evidence = (dict(row),) if row is not None else ()
        proofread = self.autoling.proofread(context, language=language, mode="generated")
        result = NetworkAnswer(
            question=message,
            text=proofread.revised,
            evidence=evidence,
            status="local_lcm_grounded",
        )
        self.network.record_tool_event(
            "LCM",
            "grounded_chat",
            {
                "question": message,
                "source_ref": source_ref,
                "reading": reading.to_dict(),
                "proofread": proofread.to_dict(),
            },
        )
        return result

    def write_report(self, topic: str) -> NetworkAnswer:
        return self.autonovel.report(topic)
