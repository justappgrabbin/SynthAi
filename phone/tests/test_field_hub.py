from human_design.field_hub import FieldEvent, build_local_field_hub
from human_design.language_contact import SemanticGraph


def test_hub_routes_observation_with_provenance() -> None:
    graph = SemanticGraph()
    hub, _ = build_local_field_hub(graph)
    event = FieldEvent.create(
        "klein.observe",
        "user:turn-1",
        {"text": "I am present.", "dimension_weights": {"when": 1}},
    )
    result = hub.emit(event)
    assert result.event.source_ref == "user:turn-1"
    assert result.handler_results[0]["operation"] == "observe"
    edges = result.handler_results[0]["relations"]["learned_edges"]
    assert edges[0]["provenance"] == ("user:turn-1",)


def test_hub_routes_suggestive_probe() -> None:
    hub, _ = build_local_field_hub()
    event = FieldEvent.create(
        "klein.probe",
        "state:test",
        {
            "proportions": {"Being": 0.8, "Movement": 0.2},
            "expressions": {"when": "I am"},
        },
        background=True,
    )
    result = hub.emit(event)
    probe = result.handler_results[0]["probe"]
    assert result.event.background is True
    assert probe["question"] == "when"
    assert probe["dimension"] == "Being"


def test_unhandled_event_is_preserved_without_invented_output() -> None:
    hub, _ = build_local_field_hub()
    event = FieldEvent.create("transit.observed", "ephemeris:test", {"gate": 3})
    result = hub.emit(event)
    assert result.event.payload == {"gate": 3}
    assert result.handler_results == ()
