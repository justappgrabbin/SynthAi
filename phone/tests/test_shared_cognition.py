from __future__ import annotations

from human_design.shared_cognition import SynthiaCognitiveRuntime


def test_all_tools_share_one_network(tmp_path) -> None:
    runtime = SynthiaCognitiveRuntime(tmp_path / "mind.sqlite3")
    reading = runtime.autoling.read(
        "Movement is Energy because creation moves through form.",
        source_ref="book-a",
        page=9,
    )
    answer = runtime.diseminer.answer("What is Movement?")
    plan = runtime.autonovel.plan("Movement")
    report = runtime.autonovel.report("Movement")

    assert reading.learned_relations >= 1
    assert answer.status == "source_grounded"
    assert plan.status == "deep_structure"
    assert plan.claim_order
    assert report.status == "generated_report"
    assert report.evidence[0]["source_ref"] == "book-a"
    assert report.evidence[0]["page"] == 9


def test_autoling_learns_language_patterns_for_shared_use(tmp_path) -> None:
    runtime = SynthiaCognitiveRuntime(tmp_path / "mind.sqlite3")
    result = runtime.autoling.read(
        "La evolución es memoria y la memoria es una relación.",
        source_ref="spanish-note",
    )
    rows = runtime.network.connection.execute(
        "SELECT language, role FROM grammar_patterns"
    ).fetchall()

    assert result.language == "spanish"
    assert any(row["language"] == "spanish" for row in rows)


def test_chat_does_not_invent_when_network_lacks_evidence() -> None:
    runtime = SynthiaCognitiveRuntime()
    answer = runtime.chat("Explain an unlearned zebrafish theorem.")
    assert answer.status == "insufficient_evidence"
    assert not answer.evidence


def test_autoling_proofreads_without_overwriting_original() -> None:
    runtime = SynthiaCognitiveRuntime()
    original = "movement  is move-\nment movement"
    result = runtime.autoling.proofread(original, language="english")

    assert result.original == original
    assert result.revised == "Movement is movement."
    assert result.status == "revised"
    assert len(result.changes) >= 3


def test_grounded_chat_uses_local_context_and_records_evidence(tmp_path) -> None:
    runtime = SynthiaCognitiveRuntime(tmp_path / "mind.sqlite3")
    answer = runtime.grounded_chat(
        "What is Movement?",
        context="Movement is Energy. Energy is Creation.",
        source_ref="chart:test:movement",
    )

    assert answer.status == "local_lcm_grounded"
    assert answer.text == "Movement is Energy. Energy is Creation."
    assert answer.evidence[0]["source_ref"] == "chart:test:movement"
