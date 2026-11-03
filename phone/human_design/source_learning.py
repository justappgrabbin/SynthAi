from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
import json
from pathlib import Path
import re
import sqlite3
from typing import Any, Iterable


PAGE_MARKER = re.compile(r"^===== PDF PAGE (\d+) =====\s*$", re.MULTILINE)
SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")
RELATION = re.compile(
    r"\b([A-Z][A-Za-z -]{1,60}?)\s+(is|are|becomes?|means?|represents?|"
    r"connects?|conditions?|expresses?|exists?|moves?|creates?)\s+"
    r"([^.;:\n]{2,180})",
    re.IGNORECASE,
)
HEADING = re.compile(r"^[A-Z][A-Z0-9 &'()/.-]{3,80}$")


@dataclass(frozen=True)
class PageEvidence:
    source_id: str
    pdf_page: int
    text: str
    digest: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SourceNote:
    note_id: str
    source_id: str
    pdf_page: int
    kind: str
    subject: str
    relation: str
    content: str
    evidence: str
    confidence: float
    status: str = "observed"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class LearningReport:
    source_id: str
    pages_seen: int
    nonblank_pages: int
    notes_created: int
    headings: tuple[str, ...]
    notes: tuple[SourceNote, ...]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def parse_page_marked_text(source_id: str, text: str) -> tuple[PageEvidence, ...]:
    matches = list(PAGE_MARKER.finditer(text))
    pages: list[PageEvidence] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        page_text = _clean_ocr(text[match.end():end])
        pages.append(
            PageEvidence(
                source_id=source_id,
                pdf_page=int(match.group(1)),
                text=page_text,
                digest=sha256(page_text.encode("utf-8")).hexdigest(),
            )
        )
    if not pages:
        raise ValueError("The source has no 'PDF PAGE' markers.")
    return tuple(pages)


class SourceNotebook:
    """Local, evidence-first memory for books and other page-based sources."""

    def __init__(self, path: str | Path = ":memory:") -> None:
        self.path = str(path)
        self.connection = sqlite3.connect(self.path)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS source_pages (
                source_id TEXT NOT NULL,
                pdf_page INTEGER NOT NULL,
                text TEXT NOT NULL,
                digest TEXT NOT NULL,
                PRIMARY KEY (source_id, pdf_page)
            );
            CREATE TABLE IF NOT EXISTS source_notes (
                note_id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                pdf_page INTEGER NOT NULL,
                kind TEXT NOT NULL,
                subject TEXT NOT NULL,
                relation TEXT NOT NULL,
                content TEXT NOT NULL,
                evidence TEXT NOT NULL,
                confidence REAL NOT NULL,
                status TEXT NOT NULL
            );
            """
        )
        self.connection.commit()

    def learn_text(self, source_id: str, text: str) -> LearningReport:
        pages = parse_page_marked_text(source_id, text)
        notes: list[SourceNote] = []
        headings: list[str] = []
        for page in pages:
            self.connection.execute(
                """
                INSERT INTO source_pages VALUES (?, ?, ?, ?)
                ON CONFLICT(source_id, pdf_page) DO UPDATE SET
                    text=excluded.text, digest=excluded.digest
                """,
                (page.source_id, page.pdf_page, page.text, page.digest),
            )
            page_notes, page_headings = _observe_page(page)
            headings.extend(page_headings)
            for note in page_notes:
                self.connection.execute(
                    """
                    INSERT INTO source_notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(note_id) DO UPDATE SET
                        content=excluded.content, evidence=excluded.evidence,
                        confidence=excluded.confidence, status=excluded.status
                    """,
                    (
                        note.note_id, note.source_id, note.pdf_page, note.kind,
                        note.subject, note.relation, note.content, note.evidence,
                        note.confidence, note.status,
                    ),
                )
            notes.extend(page_notes)
        self.connection.commit()
        return LearningReport(
            source_id=source_id,
            pages_seen=len(pages),
            nonblank_pages=sum(bool(page.text.strip()) for page in pages),
            notes_created=len(notes),
            headings=tuple(dict.fromkeys(headings)),
            notes=tuple(notes),
        )

    def learn_file(self, source_id: str, path: str | Path) -> LearningReport:
        return self.learn_text(source_id, Path(path).read_text(encoding="utf-8"))

    def notes(
        self, source_id: str, *, page: int | None = None, limit: int = 200
    ) -> tuple[SourceNote, ...]:
        sql = "SELECT * FROM source_notes WHERE source_id = ?"
        params: list[Any] = [source_id]
        if page is not None:
            sql += " AND pdf_page = ?"
            params.append(page)
        sql += " ORDER BY pdf_page, note_id LIMIT ?"
        params.append(limit)
        return tuple(SourceNote(**dict(row)) for row in self.connection.execute(sql, params))

    def compare(self, subject: str) -> dict[str, list[dict[str, Any]]]:
        rows = self.connection.execute(
            """
            SELECT * FROM source_notes
            WHERE lower(subject) = lower(?) OR lower(content) LIKE lower(?)
            ORDER BY source_id, pdf_page
            """,
            (subject, f"%{subject}%"),
        )
        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            note = SourceNote(**dict(row))
            grouped.setdefault(note.source_id, []).append(note.to_dict())
        return grouped

    def page(self, source_id: str, pdf_page: int) -> PageEvidence:
        row = self.connection.execute(
            "SELECT * FROM source_pages WHERE source_id = ? AND pdf_page = ?",
            (source_id, pdf_page),
        ).fetchone()
        if row is None:
            raise ValueError(f"Unknown source page: {source_id} page {pdf_page}")
        return PageEvidence(**dict(row))


def write_report(report: LearningReport, path: str | Path) -> None:
    Path(path).write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def export_learning_jsonl(
    notes: Iterable[SourceNote],
    path: str | Path,
    *,
    evaluation_modulus: int = 5,
) -> dict[str, int]:
    """Export deterministic train/evaluation records without mixing the splits."""
    if evaluation_modulus < 2:
        raise ValueError("evaluation_modulus must be at least 2.")
    counts = {"train": 0, "evaluation": 0}
    lines: list[str] = []
    for note in notes:
        bucket_number = int(sha256(note.note_id.encode("utf-8")).hexdigest()[:8], 16)
        split = "evaluation" if bucket_number % evaluation_modulus == 0 else "train"
        counts[split] += 1
        record = {
            "id": note.note_id,
            "split": split,
            "task": "source_grounded_note",
            "input": {
                "source_id": note.source_id,
                "pdf_page": note.pdf_page,
                "subject": note.subject,
                "question": f"What does this source observe about {note.subject}?",
            },
            "target": {
                "relation": note.relation,
                "note": note.content,
                "status": note.status,
            },
            "evidence": {
                "source_id": note.source_id,
                "pdf_page": note.pdf_page,
                "excerpt": note.evidence,
                "ocr_confidence": note.confidence,
            },
        }
        lines.append(json.dumps(record, ensure_ascii=False))
    Path(path).write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return counts


def _observe_page(page: PageEvidence) -> tuple[list[SourceNote], list[str]]:
    headings = [
        line.strip()
        for line in page.text.splitlines()
        if HEADING.fullmatch(line.strip()) and len(line.split()) <= 10
    ]
    notes: list[SourceNote] = []
    normalized = " ".join(page.text.split())
    for match in RELATION.finditer(normalized):
            subject, relation, content = (item.strip(" ,") for item in match.groups())
            subject = _trim_heading_prefix(subject, headings)
            start = max(0, normalized.rfind(".", 0, match.start()) + 1)
            next_period = normalized.find(".", match.end())
            end = len(normalized) if next_period < 0 else next_period + 1
            evidence = normalized[start:end].strip()[:500]
            identity = f"{page.source_id}|{page.pdf_page}|{evidence}".encode("utf-8")
            notes.append(
                SourceNote(
                    note_id="note_" + sha256(identity).hexdigest()[:20],
                    source_id=page.source_id,
                    pdf_page=page.pdf_page,
                    kind="source_assertion",
                    subject=subject,
                    relation=relation.casefold(),
                    content=content,
                    evidence=evidence,
                    confidence=_ocr_confidence(evidence),
                )
            )
    return notes, headings


def _trim_heading_prefix(subject: str, headings: Iterable[str]) -> str:
    clean = subject.strip()
    for heading in sorted(headings, key=len, reverse=True):
        if clean.casefold().startswith(heading.casefold() + " "):
            return clean[len(heading):].strip()
    words = clean.split()
    while len(words) > 1 and words[0].isupper() and words[1].isupper():
        words.pop(0)
    return " ".join(words)


def _clean_ocr(text: str) -> str:
    text = text.replace("\u00ad\n", "").replace("\r\n", "\n")
    text = re.sub(r"(?<=\w)-\n(?=[a-z])", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _ocr_confidence(text: str) -> float:
    if not text:
        return 0.0
    printable = sum(character.isprintable() for character in text) / len(text)
    alpha = sum(character.isalpha() or character.isspace() for character in text) / len(text)
    return round(max(0.25, min(0.98, (printable + alpha) / 2)), 3)
