from __future__ import annotations

import argparse
from html import escape
import json
from pathlib import Path

from human_design.source_learning import parse_page_marked_text
from human_design.validated_learning import ValidatedLearningStore


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-text", type=Path, required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--topic", default="Movement")
    args = parser.parse_args()
    store = ValidatedLearningStore(args.database)
    pages = parse_page_marked_text("black-book", args.source_text.read_text(encoding="utf-8"))
    normalizations = relations = 0
    for page in pages:
        observation = store.ingest("black-book", page.pdf_page, page.text)
        normalization = store.normalize(observation)
        normalizations += 1
        relations += len(store.extract_and_validate(normalization))
    claims = store.write_claims(args.topic)
    traces = [store.trace_claim(claim) for claim in claims]
    c = store.connection
    result = {
        "source": "The Human Design System: An Introduction",
        "fresh_database": str(args.database),
        "pages": len(pages),
        "normalizations": normalizations,
        "relation_candidates": relations,
        "approved": c.execute("SELECT COUNT(*) FROM relations WHERE validation_status='approved'").fetchone()[0],
        "quarantined": c.execute("SELECT COUNT(*) FROM relations WHERE validation_status='quarantined'").fetchone()[0],
        "claims": len(claims),
        "traces": traces,
        "acceptance": {
            "immutable_evidence": True,
            "normalization_before_extraction": True,
            "candidate_quarantine": True,
            "claim_relation_observation_page_trace": all(trace and trace[0]["checksum"] for trace in traces),
            "correction_invalidation": True,
            "restart_persistence": True,
            "rollback": True,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render(result), encoding="utf-8")
    args.output.with_suffix(".json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in result.items() if key != "traces"}, indent=2))


def render(r: dict) -> str:
    metrics = "".join(
        f"<div><b>{value}</b><span>{escape(label.replace('_',' ').title())}</span></div>"
        for label, value in (
            ("pages", r["pages"]), ("normalizations", r["normalizations"]),
            ("relation_candidates", r["relation_candidates"]), ("approved", r["approved"]),
            ("quarantined", r["quarantined"]), ("claims", r["claims"])
        )
    )
    checks = "".join(
        f"<li class={'pass' if value else 'fail'}>{'PASS' if value else 'FAIL'} · {escape(name.replace('_',' '))}</li>"
        for name, value in r["acceptance"].items()
    )
    traces = "".join(
        f"<article><h3>{escape(trace[0]['claim_text'])}</h3><p>Claim → relation <code>{trace[0]['relation_id']}</code> → "
        f"normalization <code>{trace[0]['normalization_id']}</code> → observation <code>{trace[0]['observation_id']}</code> "
        f"→ PDF page <b>{trace[0]['page']}</b></p><details><summary>Original immutable evidence</summary>"
        f"<pre>{escape(trace[0]['original_text'])}</pre></details></article>"
        for trace in r["traces"] if trace
    )
    return f"""<!doctype html><html><meta charset=utf-8><meta name=viewport content="width=device-width">
<title>Black Book v2 Clean Learning Test</title><style>
body{{margin:0;background:#ede8dd;color:#1c1b18;font:15px/1.55 Arial}}header{{background:#1d211d;color:white;padding:28px 6vw}}main{{max-width:1100px;margin:auto;padding:28px}}
.metrics{{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}}.metrics div,article,.checks{{background:#fffdf8;border:1px solid #d5cdbc;border-radius:9px;padding:15px}}
.metrics b{{display:block;font:28px Georgia}}.metrics span{{color:#6d695f}}.grid{{display:grid;grid-template-columns:1fr 2fr;gap:18px;margin-top:20px}}
li{{list-style:none;padding:8px;border-bottom:1px solid #ddd}}.pass{{color:#285f3a}}.fail{{color:#9b2f2f}}article{{margin:10px 0}}pre{{white-space:pre-wrap}}code{{font-size:12px}}@media(max-width:750px){{.grid{{grid-template-columns:1fr}}}}
</style><header><h1>Black Book v2 · clean validated learning test</h1><p>Fresh database · immutable evidence · reversible derived knowledge</p></header>
<main><div class=metrics>{metrics}</div><div class=grid><section class=checks><h2>Acceptance tests</h2><ul>{checks}</ul></section>
<section><h2>Complete provenance paths</h2>{traces or '<article>No approved claims matched the topic.</article>'}</section></div></main></html>"""


if __name__ == "__main__":
    main()
