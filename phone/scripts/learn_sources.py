from __future__ import annotations

import argparse
import json
from pathlib import Path

from human_design.source_learning import SourceNotebook, export_learning_jsonl, write_report


DEFAULT_SOURCES = {
    "ra-uru-hu-human-design-black-book-1991": "black-book.txt",
    "ra-uru-hu-rave-bodygraph-circuitry-2001": "circuitry.txt",
    "hatcher-yijing-word-by-word-2009": "hatcher.txt",
    "hua-ching-ni-book-changes-unchanging-truth": "hua-ching-ni.txt",
    "michael-servetus-gnostic-book-of-changes": "gnostic.txt",
    "ra-uru-hu-rave-iching-line-companion": "line-companion.txt",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Learn page-grounded notes from extracted books.")
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--source-id", choices=tuple(DEFAULT_SOURCES))
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.database.parent.mkdir(parents=True, exist_ok=True)
    notebook = SourceNotebook(args.database)
    selected = (
        {args.source_id: DEFAULT_SOURCES[args.source_id]}
        if args.source_id
        else DEFAULT_SOURCES
    )
    index = []
    for source_id, filename in selected.items():
        report = notebook.learn_file(source_id, args.source_dir / filename)
        report_path = args.output_dir / f"{source_id}.notes.json"
        write_report(report, report_path)
        dataset_path = args.output_dir / f"{source_id}.learning.jsonl"
        splits = export_learning_jsonl(report.notes, dataset_path)
        index.append(
            {
                "source_id": source_id,
                "pages_seen": report.pages_seen,
                "nonblank_pages": report.nonblank_pages,
                "notes_created": report.notes_created,
                "report": str(report_path),
                "dataset": str(dataset_path),
                "splits": splits,
            }
        )
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
