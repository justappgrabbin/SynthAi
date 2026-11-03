from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence
from uuid import uuid4

from .dimensional import QUESTION_DIMENSIONS


TOKEN_PATTERN = re.compile(r"[^\W_]+(?:['’-][^\W_]+)*", re.UNICODE)
QUESTION_PROMPTS = {
    "who": "Who is present in this expression or seeing it from this perspective?",
    "what": "What is being recognized, remembered, or changed here?",
    "where": "Where is the movement coming from or going toward?",
    "when": "When does this become tangible in the body or the moment?",
    "why": "Why is this being designed, shaped, or brought forward?",
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass(frozen=True)
class SemanticNode:
    node_id: str
    kind: str
    label: str
    features: dict[str, float]
    created_at_utc: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SemanticEdge:
    edge_id: str
    source_id: str
    relation: str
    target_id: str
    weight: float
    observations: int
    provenance: tuple[str, ...]
    updated_at_utc: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class LearningResult:
    source_ref: str
    tokens: tuple[str, ...]
    node_ids: tuple[str, ...]
    learned_edges: tuple[SemanticEdge, ...]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SuggestedProbe:
    question: str
    dimension: str
    prompt: str
    score: float
    evidence: tuple[str, ...]
    status: str = "suggestive"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SemanticGraph:
    """Small SQLite relation graph shared by all local language services."""

    def __init__(self, path: str | Path = ":memory:") -> None:
        self.path = str(path)
        self.connection = sqlite3.connect(self.path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self._create_schema()

    def _create_schema(self) -> None:
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS semantic_nodes (
                node_id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                label TEXT NOT NULL,
                normalized_label TEXT NOT NULL,
                features_json TEXT NOT NULL,
                created_at_utc TEXT NOT NULL,
                UNIQUE(kind, normalized_label)
            );
            CREATE TABLE IF NOT EXISTS semantic_edges (
                edge_id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                relation TEXT NOT NULL,
                target_id TEXT NOT NULL,
                weight REAL NOT NULL,
                observations INTEGER NOT NULL,
                updated_at_utc TEXT NOT NULL,
                UNIQUE(source_id, relation, target_id)
            );
            CREATE TABLE IF NOT EXISTS edge_provenance (
                edge_id TEXT NOT NULL,
                source_ref TEXT NOT NULL,
                observed_at_utc TEXT NOT NULL,
                PRIMARY KEY(edge_id, source_ref)
            );
            """
        )
        self.connection.commit()

    def upsert_node(
        self,
        label: str,
        *,
        kind: str = "expression",
        features: Mapping[str, float] | None = None,
    ) -> SemanticNode:
        clean = label.strip()
        if not clean:
            raise ValueError("A semantic node requires a label.")
        normalized = clean.casefold()
        row = self.connection.execute(
            "SELECT * FROM semantic_nodes WHERE kind = ? AND normalized_label = ?",
            (kind, normalized),
        ).fetchone()
        if row:
            current = json.loads(row["features_json"])
            for key, value in (features or {}).items():
                current[key] = max(float(value), float(current.get(key, 0.0)))
            self.connection.execute(
                "UPDATE semantic_nodes SET features_json = ? WHERE node_id = ?",
                (json.dumps(current, sort_keys=True), row["node_id"]),
            )
            self.connection.commit()
            return self.get_node(row["node_id"])
        node = SemanticNode(
            node_id=f"node_{uuid4().hex}",
            kind=kind,
            label=clean,
            features={key: float(value) for key, value in (features or {}).items()},
            created_at_utc=_now(),
        )
        self.connection.execute(
            "INSERT INTO semantic_nodes VALUES (?, ?, ?, ?, ?, ?)",
            (
                node.node_id,
                node.kind,
                node.label,
                normalized,
                json.dumps(node.features, sort_keys=True),
                node.created_at_utc,
            ),
        )
        self.connection.commit()
        return node

    def get_node(self, node_id: str) -> SemanticNode:
        row = self.connection.execute(
            "SELECT * FROM semantic_nodes WHERE node_id = ?", (node_id,)
        ).fetchone()
        if not row:
            raise ValueError(f"Unknown semantic node: {node_id}")
        return SemanticNode(
            node_id=row["node_id"],
            kind=row["kind"],
            label=row["label"],
            features=json.loads(row["features_json"]),
            created_at_utc=row["created_at_utc"],
        )

    def observe_edge(
        self,
        source_id: str,
        relation: str,
        target_id: str,
        *,
        source_ref: str,
        strength: float = 1.0,
    ) -> SemanticEdge:
        if strength <= 0:
            raise ValueError("Observed relation strength must be positive.")
        self.get_node(source_id)
        self.get_node(target_id)
        relation = relation.strip().casefold()
        source_ref = source_ref.strip()
        if not relation or not source_ref:
            raise ValueError("Relation and source provenance are required.")
        row = self.connection.execute(
            """
            SELECT * FROM semantic_edges
            WHERE source_id = ? AND relation = ? AND target_id = ?
            """,
            (source_id, relation, target_id),
        ).fetchone()
        now = _now()
        if row:
            observations = row["observations"] + 1
            weight = row["weight"] + ((strength - row["weight"]) / observations)
            edge_id = row["edge_id"]
            self.connection.execute(
                """
                UPDATE semantic_edges
                SET weight = ?, observations = ?, updated_at_utc = ?
                WHERE edge_id = ?
                """,
                (weight, observations, now, edge_id),
            )
        else:
            edge_id = f"edge_{uuid4().hex}"
            self.connection.execute(
                "INSERT INTO semantic_edges VALUES (?, ?, ?, ?, ?, ?, ?)",
                (edge_id, source_id, relation, target_id, strength, 1, now),
            )
        self.connection.execute(
            "INSERT OR IGNORE INTO edge_provenance VALUES (?, ?, ?)",
            (edge_id, source_ref, now),
        )
        self.connection.commit()
        return self.get_edge(edge_id)

    def get_edge(self, edge_id: str) -> SemanticEdge:
        row = self.connection.execute(
            "SELECT * FROM semantic_edges WHERE edge_id = ?", (edge_id,)
        ).fetchone()
        if not row:
            raise ValueError(f"Unknown semantic edge: {edge_id}")
        provenance = tuple(
            item["source_ref"]
            for item in self.connection.execute(
                "SELECT source_ref FROM edge_provenance WHERE edge_id = ? ORDER BY source_ref",
                (edge_id,),
            )
        )
        return SemanticEdge(
            edge_id=row["edge_id"],
            source_id=row["source_id"],
            relation=row["relation"],
            target_id=row["target_id"],
            weight=row["weight"],
            observations=row["observations"],
            provenance=provenance,
            updated_at_utc=row["updated_at_utc"],
        )

    def neighbors(self, node_id: str, *, relation: str | None = None) -> tuple[SemanticEdge, ...]:
        sql = "SELECT edge_id FROM semantic_edges WHERE source_id = ?"
        params: list[Any] = [node_id]
        if relation:
            sql += " AND relation = ?"
            params.append(relation.casefold())
        sql += " ORDER BY weight DESC, edge_id"
        return tuple(self.get_edge(row["edge_id"]) for row in self.connection.execute(sql, params))


class Diseminer:
    """Sparse distributional learner modeled on DISEMINER's relation matrix."""

    def __init__(self, graph: SemanticGraph) -> None:
        self.graph = graph

    def learn(
        self,
        text: str,
        *,
        source_ref: str,
        dimension_weights: Mapping[str, float] | None = None,
    ) -> LearningResult:
        tokens = tuple(match.group(0).casefold() for match in TOKEN_PATTERN.finditer(text))
        if not tokens:
            raise ValueError("Learning input must contain at least one lexical item.")
        features = {
            key.casefold().rstrip("?"): float(value)
            for key, value in (dimension_weights or {}).items()
            if float(value) > 0
        }
        nodes = [self.graph.upsert_node(token, features=features) for token in tokens]
        learned: list[SemanticEdge] = []
        for left, right in zip(nodes, nodes[1:]):
            learned.append(
                self.graph.observe_edge(
                    left.node_id,
                    "precedes",
                    right.node_id,
                    source_ref=source_ref,
                )
            )
        return LearningResult(
            source_ref=source_ref,
            tokens=tokens,
            node_ids=tuple(node.node_id for node in nodes),
            learned_edges=tuple(learned),
        )

    def paths(self, start_node_id: str, *, max_depth: int = 3) -> tuple[tuple[str, ...], ...]:
        if max_depth < 1:
            return ()
        paths: list[tuple[str, ...]] = []
        frontier = [(start_node_id, (start_node_id,))]
        while frontier:
            current, path = frontier.pop(0)
            if len(path) > max_depth:
                continue
            for edge in self.graph.neighbors(current):
                if edge.target_id in path:
                    continue
                next_path = (*path, edge.target_id)
                paths.append(next_path)
                frontier.append((edge.target_id, next_path))
        return tuple(paths)


class Autoling:
    """Chooses a positive, discriminating five-coordinate informant probe."""

    def suggest(
        self,
        *,
        proportions: Mapping[str, float],
        expressions: Mapping[str, str] | None = None,
        prior_questions: Iterable[str] = (),
    ) -> SuggestedProbe:
        expressions = expressions or {}
        asked = {item.casefold().rstrip("?") for item in prior_questions}
        scored: list[tuple[float, str, tuple[str, ...]]] = []
        for question, dimension in QUESTION_DIMENSIONS.items():
            proportion = float(proportions.get(dimension, 0.0))
            expression = expressions.get(question, "").strip()
            evidence = []
            if proportion > 0:
                evidence.append(f"{dimension} is active at {proportion:.3f}")
            if expression:
                evidence.append(f"expression: {expression}")
            novelty = 0.0 if question in asked else 1.0
            # Active evidence leads the probe; novelty prevents repetitive questioning.
            score = (proportion * 2.0) + novelty + (0.25 if expression else 0.0)
            scored.append((score, question, tuple(evidence)))
        score, question, evidence = max(scored, key=lambda item: (item[0], -list(QUESTION_DIMENSIONS).index(item[1])))
        return SuggestedProbe(
            question=question,
            dimension=QUESTION_DIMENSIONS[question],
            prompt=QUESTION_PROMPTS[question],
            score=score,
            evidence=evidence,
        )
