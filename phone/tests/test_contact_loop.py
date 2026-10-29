import pytest

from human_design.contact_loop import ContactLoop, GrammarController
from human_design.language_contact import SemanticGraph


def test_grammar_recognizes_dimensional_expressions_and_structure() -> None:
    result = GrammarController().analyze(
        "I AM here, and I design THIS."
    )
    assert [match.question for match in result.matches] == ["when", "why"]
    assert result.structural_words == (",", "and", ".")
    assert result.uppercase_expressions == ("AM", "THIS")


def test_contact_loop_updates_proportions_and_selects_probe() -> None:
    loop = ContactLoop(SemanticGraph())
    session = loop.start("I am here and I design the path.", source_ref="user")
    assert session.status == "pre-clarity-probabilistic"
    assert session.perspective.proportions["Being"] == pytest.approx(0.5)
    assert session.perspective.proportions["Design"] == pytest.approx(0.5)
    assert session.next_probe is not None
    assert session.next_probe.question == "when"
    assert "I am" in session.next_probe.prompt
    assert len(session.turns) == 1

    updated = loop.observe(session.session_id, "I think about it.", source_ref="user")
    assert updated.perspective.proportions["Space"] == pytest.approx(1 / 3)
    assert len(updated.turns) == 2


def test_contact_loop_requires_explicit_clarity_and_then_closes() -> None:
    loop = ContactLoop(SemanticGraph())
    session = loop.start("I create movement.")
    assert session.status == "pre-clarity-probabilistic"
    clear = loop.clarify(session.session_id, "Movement")
    assert clear.status == "post-clarity-deterministic"
    assert clear.perspective.proportions["Movement"] == 1
    assert clear.next_probe is None
    with pytest.raises(ValueError, match="explicit clarity"):
        loop.observe(session.session_id, "I remember.")


def test_contact_session_persists_across_loop_instances(tmp_path) -> None:
    path = tmp_path / "contact.sqlite3"
    first_graph = SemanticGraph(path)
    first_loop = ContactLoop(first_graph)
    created = first_loop.start("I remember this.")
    first_graph.connection.close()

    second_loop = ContactLoop(SemanticGraph(path))
    loaded = second_loop.get(created.session_id)
    assert loaded.turns[0].text == "I remember this."
    assert loaded.perspective.active_dimensions == ("Evolution",)
