from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import re
from typing import Any, Iterable, Mapping, Sequence
from uuid import uuid4

from .dimensional import PerspectiveEngine, PerspectiveState, QUESTION_DIMENSIONS, _now
from .language_contact import Autoling, Diseminer, SemanticGraph, SuggestedProbe


@dataclass(frozen=True)
class GrammarRule:
    rule_id: str
    question: str
    patterns: tuple[str, ...]
    response_frame: str
    weight: float = 1.0

    @property
    def dimension(self) -> str:
        return QUESTION_DIMENSIONS[self.question]


@dataclass(frozen=True)
class GrammarMatch:
    rule_id: str
    question: str
    dimension: str
    expression: str
    weight: float
    span: tuple[int, int]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class GrammarAnalysis:
    text: str
    matches: tuple[GrammarMatch, ...]
    structural_words: tuple[str, ...]
    uppercase_expressions: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


DEFAULT_RULES = (
    GrammarRule("who-think", "who", (r"\bi\s+think\b",), "Who is thinking: {expression}?"),
    GrammarRule(
        "who-communicate",
        "who",
        (r"\bi\s+communicat(?:e|ed|ing)\b",),
        "Who is communicating through {expression}?",
    ),
    GrammarRule(
        "what-remember",
        "what",
        (r"\bi\s+remember\b", r"\bi\s+know\b"),
        "What is being remembered in {expression}?",
    ),
    GrammarRule(
        "where-define",
        "where",
        (r"\bi\s+define\b", r"\bi\s+create\b"),
        "Where is {expression} moving from or toward?",
    ),
    GrammarRule(
        "when-am",
        "when",
        (r"\bi\s+am\b", r"\bmy\s+body\b"),
        "When is {expression} present in the body?",
    ),
    GrammarRule(
        "why-design",
        "why",
        (r"\bi\s+design\b", r"\bi\s+intend\b"),
        "Why is {expression} being designed?",
    ),
)


class GrammarController:
    """Declarative rules shared by recognition and question realization."""

    def __init__(self, rules: Sequence[GrammarRule] = DEFAULT_RULES) -> None:
        self.rules = tuple(rules)
        self._by_question = {rule.question: rule for rule in self.rules}

    def analyze(self, text: str) -> GrammarAnalysis:
        matches: list[GrammarMatch] = []
        for rule in self.rules:
            for pattern in rule.patterns:
                for found in re.finditer(pattern, text, flags=re.IGNORECASE):
                    matches.append(
                        GrammarMatch(
                            rule_id=rule.rule_id,
                            question=rule.question,
                            dimension=rule.dimension,
                            expression=found.group(0),
                            weight=rule.weight,
                            span=found.span(),
                        )
                    )
        structural = tuple(
            found.group(0)
            for found in re.finditer(r"\b(?:and|the|a|an|but|or)\b|[.!?,;:]", text, re.IGNORECASE)
        )
        uppercase = tuple(
            token
            for token in re.findall(r"\b[A-Z][A-Z0-9_-]{1,}\b", text)
            if token not in {"I"}
        )
        return GrammarAnalysis(
            text=text,
            matches=tuple(sorted(matches, key=lambda item: item.span)),
            structural_words=structural,
            uppercase_expressions=uppercase,
        )

    def realize(self, probe: SuggestedProbe, expression: str | None = None) -> str:
        rule = self._by_question.get(probe.question)
        if rule and expression:
            return rule.response_frame.format(expression=expression)
        return probe.prompt


@dataclass(frozen=True)
class ContactTurn:
    turn_id: str
    role: str
    text: str
    analysis: GrammarAnalysis | None
    created_at_utc: str

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        if self.analysis:
            payload["analysis"] = self.analysis.to_dict()
        return payload


@dataclass(frozen=True)
class ContactSession:
    session_id: str
    status: str
    perspective: PerspectiveState
    next_probe: SuggestedProbe | None
    turns: tuple[ContactTurn, ...]
    created_at_utc: str
    updated_at_utc: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "status": self.status,
            "perspective": self.perspective.to_dict(),
            "next_probe": self.next_probe.to_dict() if self.next_probe else None,
            "turns": [turn.to_dict() for turn in self.turns],
            "created_at_utc": self.created_at_utc,
            "updated_at_utc": self.updated_at_utc,
        }


class ContactLoop:
    def __init__(
        self,
        graph: SemanticGraph,
        *,
        grammar: GrammarController | None = None,
        perspective: PerspectiveEngine | None = None,
    ) -> None:
        self.graph = graph
        self.grammar = grammar or GrammarController()
        self.perspective = perspective or PerspectiveEngine()
        self.autoling = Autoling()
        self.diseminer = Diseminer(graph)
        self._create_schema()

    def _create_schema(self) -> None:
        self.graph.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS contact_sessions (
                session_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                perspective_json TEXT NOT NULL,
                next_probe_json TEXT,
                created_at_utc TEXT NOT NULL,
                updated_at_utc TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS contact_turns (
                turn_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                sequence_number INTEGER NOT NULL,
                role TEXT NOT NULL,
                text TEXT NOT NULL,
                analysis_json TEXT,
                created_at_utc TEXT NOT NULL,
                UNIQUE(session_id, sequence_number)
            );
            """
        )
        self.graph.connection.commit()

    def start(self, opening_text: str, *, source_ref: str = "contact") -> ContactSession:
        now = _now()
        session_id = f"contact_{uuid4().hex}"
        empty = self.perspective.locate({})
        self.graph.connection.execute(
            "INSERT INTO contact_sessions VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, empty.status, json.dumps(empty.to_dict()), None, now, now),
        )
        self.graph.connection.commit()
        return self.observe(session_id, opening_text, source_ref=source_ref)

    def observe(
        self,
        session_id: str,
        text: str,
        *,
        source_ref: str = "contact",
    ) -> ContactSession:
        session = self.get(session_id)
        if session.status == "post-clarity-deterministic":
            raise ValueError("This contact session has already reached explicit clarity.")
        analysis = self.grammar.analyze(text)
        weights: dict[str, float] = {}
        expressions: dict[str, str] = {}
        for contribution in session.perspective.contributions:
            weights[contribution.question] = weights.get(contribution.question, 0.0) + contribution.weight
            expressions[contribution.question] = contribution.expression
        for match in analysis.matches:
            weights[match.question] = weights.get(match.question, 0.0) + match.weight
            expressions[match.question] = match.expression
        perspective = self.perspective.locate(expressions, weights)
        prior = tuple(
            turn.analysis.matches[0].question
            for turn in session.turns
            if turn.analysis and turn.analysis.matches
        )
        probe = self.autoling.suggest(
            proportions=perspective.proportions,
            expressions=expressions,
            prior_questions=prior,
        )
        expression = expressions.get(probe.question)
        probe = SuggestedProbe(
            question=probe.question,
            dimension=probe.dimension,
            prompt=self.grammar.realize(probe, expression),
            score=probe.score,
            evidence=probe.evidence,
        )
        self.diseminer.learn(
            text,
            source_ref=f"{source_ref}:{session_id}",
            dimension_weights={
                match.question: match.weight for match in analysis.matches
            },
        )
        turn = ContactTurn(
            turn_id=f"turn_{uuid4().hex}",
            role="informant",
            text=text,
            analysis=analysis,
            created_at_utc=_now(),
        )
        self._save_turn(session_id, turn)
        self._save_state(session_id, perspective, probe)
        return self.get(session_id)

    def clarify(self, session_id: str, dimension: str) -> ContactSession:
        session = self.get(session_id)
        clear = self.perspective.clarify(session.perspective, dimension)
        self._save_state(session_id, clear, None)
        return self.get(session_id)

    def get(self, session_id: str) -> ContactSession:
        row = self.graph.connection.execute(
            "SELECT * FROM contact_sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        if not row:
            raise ValueError(f"Unknown contact session: {session_id}")
        perspective = _perspective_from_dict(json.loads(row["perspective_json"]))
        probe_data = json.loads(row["next_probe_json"]) if row["next_probe_json"] else None
        probe = SuggestedProbe(**probe_data) if probe_data else None
        turns = tuple(self._load_turns(session_id))
        return ContactSession(
            session_id=session_id,
            status=row["status"],
            perspective=perspective,
            next_probe=probe,
            turns=turns,
            created_at_utc=row["created_at_utc"],
            updated_at_utc=row["updated_at_utc"],
        )

    def _save_turn(self, session_id: str, turn: ContactTurn) -> None:
        count = self.graph.connection.execute(
            "SELECT COUNT(*) AS count FROM contact_turns WHERE session_id = ?",
            (session_id,),
        ).fetchone()["count"]
        self.graph.connection.execute(
            "INSERT INTO contact_turns VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                turn.turn_id,
                session_id,
                count,
                turn.role,
                turn.text,
                json.dumps(turn.analysis.to_dict()) if turn.analysis else None,
                turn.created_at_utc,
            ),
        )
        self.graph.connection.commit()

    def _save_state(
        self,
        session_id: str,
        perspective: PerspectiveState,
        probe: SuggestedProbe | None,
    ) -> None:
        self.graph.connection.execute(
            """
            UPDATE contact_sessions
            SET status = ?, perspective_json = ?, next_probe_json = ?, updated_at_utc = ?
            WHERE session_id = ?
            """,
            (
                perspective.status,
                json.dumps(perspective.to_dict()),
                json.dumps(probe.to_dict()) if probe else None,
                _now(),
                session_id,
            ),
        )
        self.graph.connection.commit()

    def _load_turns(self, session_id: str) -> Iterable[ContactTurn]:
        rows = self.graph.connection.execute(
            "SELECT * FROM contact_turns WHERE session_id = ? ORDER BY sequence_number",
            (session_id,),
        )
        for row in rows:
            data = json.loads(row["analysis_json"]) if row["analysis_json"] else None
            analysis = None
            if data:
                analysis = GrammarAnalysis(
                    text=data["text"],
                    matches=tuple(GrammarMatch(**item) for item in data["matches"]),
                    structural_words=tuple(data["structural_words"]),
                    uppercase_expressions=tuple(data["uppercase_expressions"]),
                )
            yield ContactTurn(
                turn_id=row["turn_id"],
                role=row["role"],
                text=row["text"],
                analysis=analysis,
                created_at_utc=row["created_at_utc"],
            )


def _perspective_from_dict(data: Mapping[str, Any]) -> PerspectiveState:
    from .dimensional import PerspectiveContribution

    return PerspectiveState(
        state_id=data["state_id"],
        status=data["status"],
        generated_at_utc=data["generated_at_utc"],
        proportions=dict(data["proportions"]),
        active_dimensions=tuple(data["active_dimensions"]),
        contributions=tuple(
            PerspectiveContribution(**item) for item in data["contributions"]
        ),
        clarified_dimension=data.get("clarified_dimension"),
    )
