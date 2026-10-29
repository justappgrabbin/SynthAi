from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
from typing import Any, Iterable

from .source_learning import SourceNote


@dataclass(frozen=True)
class GeneratedPassage:
    generation_id: str
    mode: str
    text: str
    source_note_ids: tuple[str, ...]
    citations: tuple[dict[str, Any], ...]
    status: str = "generated_from_observations"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class AutoParaphraser:
    """Re-expresses a relation while retaining the source observation boundary."""

    TEMPLATES = (
        "From this source's perspective, {subject} {relation} {content}.",
        "The observed relation is that {subject} {relation} {content}.",
        "On PDF page {page}, the source presents {subject} as something that {relation} {content}.",
    )

    def paraphrase(self, note: SourceNote, *, variant: int = 0) -> GeneratedPassage:
        template = self.TEMPLATES[variant % len(self.TEMPLATES)]
        text = template.format(
            subject=note.subject,
            relation=note.relation,
            content=note.content.rstrip("."),
            page=note.pdf_page,
        )
        return _passage("paraphrase", text, (note,))


class AutoNovel:
    """Generates a coherent account from ordered observations without relabeling it as source text."""

    def compose(
        self,
        notes: Iterable[SourceNote],
        *,
        title: str = "Generated source account",
        max_notes: int = 24,
    ) -> GeneratedPassage:
        ordered = sorted(notes, key=lambda note: (note.pdf_page, note.note_id))[:max_notes]
        if not ordered:
            raise ValueError("AutoNovel requires at least one source note.")
        paragraphs = [title]
        current_page = None
        sentences: list[str] = []
        paraphraser = AutoParaphraser()
        for index, note in enumerate(ordered):
            if current_page is not None and note.pdf_page != current_page and sentences:
                paragraphs.append(" ".join(sentences))
                sentences = []
            generated = paraphraser.paraphrase(note, variant=index)
            sentences.append(generated.text + f" [PDF p. {note.pdf_page}]")
            current_page = note.pdf_page
        if sentences:
            paragraphs.append(" ".join(sentences))
        return _passage("autonovel", "\n\n".join(paragraphs), tuple(ordered))


def _passage(mode: str, text: str, notes: tuple[SourceNote, ...]) -> GeneratedPassage:
    identity = "|".join(note.note_id for note in notes) + "|" + mode + "|" + text
    citations = tuple(
        {
            "source_id": note.source_id,
            "pdf_page": note.pdf_page,
            "note_id": note.note_id,
        }
        for note in notes
    )
    return GeneratedPassage(
        generation_id="generation_" + sha256(identity.encode("utf-8")).hexdigest()[:20],
        mode=mode,
        text=text,
        source_note_ids=tuple(note.note_id for note in notes),
        citations=citations,
    )
