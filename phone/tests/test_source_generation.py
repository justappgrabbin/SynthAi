from __future__ import annotations

from human_design.source_generation import AutoNovel, AutoParaphraser
from human_design.source_learning import SourceNotebook
from tests.test_source_learning import TEXT


def test_paraphrase_remains_traceable() -> None:
    note = SourceNotebook().learn_text("book", TEXT).notes[0]
    result = AutoParaphraser().paraphrase(note)
    assert result.status == "generated_from_observations"
    assert result.source_note_ids == (note.note_id,)
    assert result.citations[0]["pdf_page"] == note.pdf_page


def test_autonovel_orders_and_cites_observations() -> None:
    notes = SourceNotebook().learn_text("book", TEXT).notes
    result = AutoNovel().compose(reversed(notes))
    cited_pages = [citation["pdf_page"] for citation in result.citations]
    assert cited_pages == sorted(cited_pages)
    assert "[PDF p." in result.text
    assert result.mode == "autonovel"
