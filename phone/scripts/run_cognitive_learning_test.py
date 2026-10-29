from __future__ import annotations

import argparse
from html import escape
import json
from pathlib import Path

from human_design.shared_cognition import SynthiaCognitiveRuntime
from human_design.source_learning import parse_page_marked_text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-text", type=Path, required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--output-json", type=Path, required=True)
    parser.add_argument("--output-html", type=Path, required=True)
    parser.add_argument("--topic", default="Movement")
    args = parser.parse_args()
    args.database.parent.mkdir(parents=True, exist_ok=True)
    runtime = SynthiaCognitiveRuntime(args.database)
    pages = parse_page_marked_text(
        "ra-uru-hu-human-design-black-book-1991",
        args.source_text.read_text(encoding="utf-8"),
    )
    readings = runtime.diseminer.ingest_pages(
        "ra-uru-hu-human-design-black-book-1991",
        ((page.pdf_page, page.text) for page in pages),
    )
    report = runtime.write_report(args.topic)
    connection = runtime.network.connection
    result = {
        "source": "The Human Design System: An Introduction",
        "pages_read": len(readings),
        "relations_learned_this_run": sum(item.learned_relations for item in readings),
        "network": {
            "units": connection.execute("SELECT COUNT(*) FROM units").fetchone()[0],
            "links": connection.execute("SELECT COUNT(*) FROM links").fetchone()[0],
            "observations": connection.execute("SELECT COUNT(*) FROM observations").fetchone()[0],
            "grammar_patterns": connection.execute("SELECT COUNT(*) FROM grammar_patterns").fetchone()[0],
            "tool_events": connection.execute("SELECT COUNT(*) FROM tool_events").fetchone()[0],
        },
        "axis_clues": {
            axis: sum(len(reading.axes[axis]) for reading in readings)
            for axis in ("who", "what", "where", "when", "why")
        },
        "report": report.to_dict(),
    }
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    args.output_html.write_text(render(result), encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("pages_read", "relations_learned_this_run", "network", "axis_clues")}, indent=2))


def render(result: dict) -> str:
    evidence = result["report"]["evidence"]
    evidence_html = "".join(
        f"<article><div>PDF page {item['page']} · {escape(item['source_ref'])}</div>"
        f"<p>{escape(item['text'])}</p></article>"
        for item in evidence
    )
    metrics = {
        "Pages read": result["pages_read"],
        "Relations learned": result["relations_learned_this_run"],
        **{key.replace("_", " ").title(): value for key, value in result["network"].items()},
    }
    cards = "".join(f"<div class=metric><b>{value}</b><span>{escape(label)}</span></div>" for label, value in metrics.items())
    axes = "".join(f"<li><b>{axis.title()}</b><span>{count}</span></li>" for axis, count in result["axis_clues"].items())
    return f"""<!doctype html><html><meta charset=utf-8><meta name=viewport content="width=device-width">
<title>Synthia Learning Test</title><style>
body{{margin:0;background:#eee9df;color:#1b1a17;font:15px/1.55 Arial,sans-serif}}header{{background:#20211d;color:white;padding:28px 6vw}}main{{max-width:1100px;margin:auto;padding:30px}}
.metrics{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}}.metric,article,.panel{{background:#fffdf8;border:1px solid #d6cebf;border-radius:9px;padding:16px}}
.metric b{{display:block;font:28px Georgia,serif}}.metric span,article div{{color:#716d63}}.grid{{display:grid;grid-template-columns:1fr 2fr;gap:18px;margin-top:20px}}
li{{display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #ddd}}article{{margin:10px 0}}@media(max-width:750px){{.grid{{grid-template-columns:1fr}}}}
</style><header><h1>Synthia shared-network learning test</h1><p>{escape(result['source'])}</p></header><main>
<div class=metrics>{cards}</div><div class=grid><section class=panel><h2>AUTOLING reading axes</h2><ul>{axes}</ul>
<p>Status: <b>{escape(result['report']['status'])}</b></p></section><section><h2>AutoNovel report evidence</h2>
<p>This panel shows the passages retrieved for the report. Generated prose remains separate from source evidence.</p>{evidence_html or '<article>No evidence found for this topic.</article>'}</section></div></main></html>"""


if __name__ == "__main__":
    main()
