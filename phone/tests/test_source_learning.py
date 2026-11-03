from __future__ import annotations

import json

from human_design.source_learning import (
    SourceNotebook,
    export_learning_jsonl,
    parse_page_marked_text,
)


TEXT = """
===== PDF PAGE 1 =====

THE FIRST VIEW

Movement is Energy. Energy is Creation.

===== PDF PAGE 2 =====

THE SECOND VIEW

Being is Matter. Matter is Touch.
"""


def test_page_provenance_is_preserved() -> None:
    pages = parse_page_marked_text("book", TEXT)
    assert [page.pdf_page for page in pages] == [1, 2]
    assert "Movement is Energy" in pages[0].text


def test_learning_keeps_source_assertions_separate() -> None:
    notebook = SourceNotebook()
    first = notebook.learn_text("movement-book", TEXT)
    second = notebook.learn_text("being-book", TEXT.replace("Movement is Energy", "Movement is Location"))

    assert first.pages_seen == 2
    assert second.pages_seen == 2
    compared = notebook.compare("Movement")
    assert set(compared) == {"movement-book", "being-book"}
    assert any(note["pdf_page"] == 1 for note in compared["movement-book"])


def test_relearning_is_idempotent() -> None:
    notebook = SourceNotebook()
    first = notebook.learn_text("book", TEXT)
    second = notebook.learn_text("book", TEXT)
    assert first.notes_created == second.notes_created
    assert len(notebook.notes("book")) == first.notes_created


def test_training_export_has_stable_disjoint_splits(tmp_path) -> None:
    report = SourceNotebook().learn_text("book", TEXT)
    output = tmp_path / "learning.jsonl"
    counts = export_learning_jsonl(report.notes, output, evaluation_modulus=2)
    records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]

    assert counts["train"] + counts["evaluation"] == len(report.notes)
    assert {record["split"] for record in records} <= {"train", "evaluation"}
    assert all(record["evidence"]["pdf_page"] in {1, 2} for record in records)
    assert len({record["id"] for record in records}) == len(records)
