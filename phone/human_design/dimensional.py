from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
import json
from pathlib import Path
from typing import Any, Mapping, Sequence
from uuid import uuid4


QUESTION_DIMENSIONS = {
    "who": "Space",
    "what": "Evolution",
    "where": "Movement",
    "when": "Being",
    "why": "Design",
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass(frozen=True)
class PerspectiveContribution:
    question: str
    dimension: str
    expression: str
    weight: float


@dataclass(frozen=True)
class PerspectiveState:
    state_id: str
    status: str
    generated_at_utc: str
    proportions: dict[str, float]
    active_dimensions: tuple[str, ...]
    contributions: tuple[PerspectiveContribution, ...]
    clarified_dimension: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class EmergenceLineage:
    emergence_id: str
    present_identity: str
    contributing_primitives: tuple[str, ...]
    parent_states: tuple[str, ...]
    inherited_relations: tuple[str, ...]
    transformation_path: tuple[str, ...]
    changed_proportions: dict[str, float]
    contact_event: str
    emergence_time: str
    recognition_time: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class DimensionalOntology:
    def __init__(self, data: Mapping[str, Any]) -> None:
        self._data = dict(data)
        self._dimensions = {
            item["macro"].casefold(): dict(item) for item in self._data["dimensions"]
        }

    @classmethod
    def load_default(cls) -> "DimensionalOntology":
        path = Path(__file__).with_name("assets") / "dimensions-v1.json"
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def dimension(self, name: str) -> dict[str, Any]:
        try:
            return dict(self._dimensions[name.casefold()])
        except KeyError as exc:
            raise ValueError(f"Unknown dimension: {name}") from exc

    def to_dict(self) -> dict[str, Any]:
        return dict(self._data)


class PerspectiveEngine:
    """Sparse, affirmative five-coordinate perspective engine.

    Observation produces a proportional pre-clarity state. Clarity is an
    explicit event supplied by the consuming application or user; the engine
    does not invent a confidence threshold and call it clarity.
    """

    def __init__(self, ontology: DimensionalOntology | None = None) -> None:
        self.ontology = ontology or DimensionalOntology.load_default()

    def locate(
        self,
        expressions: Mapping[str, str],
        weights: Mapping[str, float] | None = None,
    ) -> PerspectiveState:
        weights = weights or {}
        contributions: list[PerspectiveContribution] = []
        totals = {dimension: 0.0 for dimension in QUESTION_DIMENSIONS.values()}

        for raw_question, raw_expression in expressions.items():
            question = raw_question.strip().casefold().rstrip("?")
            if question not in QUESTION_DIMENSIONS:
                raise ValueError(
                    f"Unknown coordinate {raw_question!r}; use Who, What, Where, When, or Why."
                )
            expression = raw_expression.strip()
            if not expression:
                continue
            weight = float(weights.get(question, 1.0))
            if weight <= 0:
                raise ValueError("Active contribution weights must be greater than zero.")
            dimension = QUESTION_DIMENSIONS[question]
            totals[dimension] += weight
            contributions.append(
                PerspectiveContribution(question, dimension, expression, weight)
            )

        total = sum(totals.values())
        proportions = {
            dimension: (value / total if total else 0.0)
            for dimension, value in totals.items()
        }
        active = tuple(
            dimension for dimension, value in proportions.items() if value > 0
        )
        return PerspectiveState(
            state_id=f"perspective_{uuid4().hex}",
            status="pre-clarity-probabilistic",
            generated_at_utc=_now(),
            proportions=proportions,
            active_dimensions=active,
            contributions=tuple(contributions),
        )

    def clarify(
        self,
        state: PerspectiveState,
        dimension: str,
    ) -> PerspectiveState:
        canonical = self.ontology.dimension(dimension)["macro"]
        if canonical not in state.active_dimensions:
            raise ValueError(
                f"{canonical} is not active in this perspective state."
            )
        proportions = {
            name: 1.0 if name == canonical else 0.0
            for name in QUESTION_DIMENSIONS.values()
        }
        return PerspectiveState(
            state_id=state.state_id,
            status="post-clarity-deterministic",
            generated_at_utc=_now(),
            proportions=proportions,
            active_dimensions=(canonical,),
            contributions=state.contributions,
            clarified_dimension=canonical,
        )

    def emerge(
        self,
        *,
        present_identity: str,
        contributing_primitives: Sequence[str],
        parent_states: Sequence[str] = (),
        inherited_relations: Sequence[str] = (),
        transformation_path: Sequence[str] = (),
        changed_proportions: Mapping[str, float] | None = None,
        contact_event: str,
        emergence_time: str | None = None,
        recognition_time: str | None = None,
    ) -> EmergenceLineage:
        identity = present_identity.strip()
        contact = contact_event.strip()
        primitives = tuple(item.strip() for item in contributing_primitives if item.strip())
        if not identity:
            raise ValueError("Present identity is required.")
        if not primitives:
            raise ValueError("At least one contributing primitive is required.")
        if not contact:
            raise ValueError("A contact event is required.")
        known = {item["dimension"] for item in self.ontology.to_dict()["dimension_number_map"]}
        unknown = sorted(set(primitives) - known)
        if unknown:
            raise ValueError(f"Unknown primitives: {', '.join(unknown)}")
        proportions = dict(changed_proportions or {})
        if any(value < 0 for value in proportions.values()):
            raise ValueError("Proportions must be affirmative values.")
        now = _now()
        return EmergenceLineage(
            emergence_id=f"emergence_{uuid4().hex}",
            present_identity=identity,
            contributing_primitives=primitives,
            parent_states=tuple(parent_states),
            inherited_relations=tuple(inherited_relations),
            transformation_path=tuple(transformation_path),
            changed_proportions=proportions,
            contact_event=contact,
            emergence_time=emergence_time or now,
            recognition_time=recognition_time or now,
        )
