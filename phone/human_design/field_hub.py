from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any, Callable, Mapping
from uuid import uuid4

from .contact_loop import GrammarController
from .language_contact import Autoling, Diseminer, SemanticGraph


def _now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass(frozen=True)
class FieldEvent:
    event_id: str
    event_type: str
    source_ref: str
    payload: dict[str, Any]
    created_at_utc: str
    parent_event_id: str | None = None
    background: bool = False

    @classmethod
    def create(
        cls,
        event_type: str,
        source_ref: str,
        payload: Mapping[str, Any],
        *,
        parent_event_id: str | None = None,
        background: bool = False,
    ) -> "FieldEvent":
        if not event_type.strip() or not source_ref.strip():
            raise ValueError("Event type and source reference are required.")
        return cls(
            event_id=f"event_{uuid4().hex}",
            event_type=event_type.strip(),
            source_ref=source_ref.strip(),
            payload=dict(payload),
            created_at_utc=_now(),
            parent_event_id=parent_event_id,
            background=background,
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class FieldEventResult:
    event: FieldEvent
    handler_results: tuple[dict[str, Any], ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "event": self.event.to_dict(),
            "handler_results": list(self.handler_results),
        }


EventHandler = Callable[[FieldEvent], Mapping[str, Any]]


class MCPHub:
    """Local typed event hub that can sit behind an MCP transport."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}

    def register(self, event_type: str, handler: EventHandler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def emit(self, event: FieldEvent) -> FieldEventResult:
        results = tuple(
            dict(handler(event))
            for handler in self._handlers.get(event.event_type, ())
        )
        return FieldEventResult(event=event, handler_results=results)


class KleinToolLayer:
    """Routes hub language events through the shared Klein-inspired services."""

    OBSERVE = "klein.observe"
    PROBE = "klein.probe"

    def __init__(self, graph: SemanticGraph) -> None:
        self.graph = graph
        self.grammar = GrammarController()
        self.diseminer = Diseminer(graph)
        self.autoling = Autoling()

    def connect(self, hub: MCPHub) -> None:
        hub.register(self.OBSERVE, self.observe)
        hub.register(self.PROBE, self.probe)

    def observe(self, event: FieldEvent) -> Mapping[str, Any]:
        text = str(event.payload.get("text", "")).strip()
        if not text:
            raise ValueError("A Klein observation event requires text.")
        dimension_weights = event.payload.get("dimension_weights", {})
        analysis = self.grammar.analyze(text)
        learned = self.diseminer.learn(
            text,
            source_ref=event.source_ref,
            dimension_weights=dimension_weights,
        )
        return {
            "tool_layer": "sheldon-klein",
            "operation": "observe",
            "grammar": analysis.to_dict(),
            "relations": learned.to_dict(),
        }

    def probe(self, event: FieldEvent) -> Mapping[str, Any]:
        return {
            "tool_layer": "sheldon-klein",
            "operation": "probe",
            "probe": self.autoling.suggest(
                proportions=event.payload.get("proportions", {}),
                expressions=event.payload.get("expressions", {}),
                prior_questions=event.payload.get("prior_questions", ()),
            ).to_dict(),
        }


def build_local_field_hub(
    graph: SemanticGraph | None = None,
) -> tuple[MCPHub, KleinToolLayer]:
    shared_graph = graph or SemanticGraph()
    hub = MCPHub()
    klein = KleinToolLayer(shared_graph)
    klein.connect(hub)
    return hub, klein
