from __future__ import annotations

import pytest

from human_design.dimensional import (
    DimensionalOntology,
    PerspectiveEngine,
)


def test_ontology_preserves_dimension_and_base_correspondence() -> None:
    ontology = DimensionalOntology.load_default()

    assert ontology.dimension("Being")["base"] == 3
    assert ontology.dimension("Being")["question"] == "When?"
    assert ontology.dimension("Movement")["base"] == 1
    assert ontology.dimension("Space")["keynote_variants"] == ["I Think", "I Communicate"]


def test_locate_uses_only_active_five_coordinate_expressions() -> None:
    state = PerspectiveEngine().locate(
        {"Who": "I think", "Where": "I define"},
        {"who": 3, "where": 1},
    )

    assert state.status == "pre-clarity-probabilistic"
    assert state.active_dimensions == ("Space", "Movement")
    assert state.proportions["Space"] == pytest.approx(0.75)
    assert state.proportions["Movement"] == pytest.approx(0.25)
    assert state.proportions["Being"] == 0


def test_clarity_is_explicit_and_deterministic_for_the_state() -> None:
    engine = PerspectiveEngine()
    probable = engine.locate({"What": "I remember", "Why": "I design"})
    clear = engine.clarify(probable, "Design")

    assert clear.status == "post-clarity-deterministic"
    assert clear.state_id == probable.state_id
    assert clear.clarified_dimension == "Design"
    assert clear.proportions["Design"] == 1
    assert sum(clear.proportions.values()) == 1


def test_emergence_requires_and_preserves_lineage() -> None:
    lineage = PerspectiveEngine().emerge(
        present_identity="New expression",
        contributing_primitives=["Being", "Movement", "Design"],
        parent_states=["state-a", "state-b"],
        inherited_relations=["Being is Matter"],
        transformation_path=["contact", "changed proportion", "expression"],
        changed_proportions={"Being": 0.4, "Movement": 0.35, "Design": 0.25},
        contact_event="The existing states met.",
    )

    assert lineage.present_identity == "New expression"
    assert lineage.contributing_primitives == ("Being", "Movement", "Design")
    assert lineage.parent_states == ("state-a", "state-b")
    assert lineage.emergence_time
    assert lineage.recognition_time


def test_unknown_question_is_not_silently_added_as_a_coordinate() -> None:
    with pytest.raises(ValueError, match="Who, What, Where, When, or Why"):
        PerspectiveEngine().locate({"How": "By trying"})
