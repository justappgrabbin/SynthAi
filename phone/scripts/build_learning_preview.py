from __future__ import annotations

import argparse
import json
from pathlib import Path

from human_design.source_learning import parse_page_marked_text


SOURCE_ID = "ra-uru-hu-human-design-black-book-1991"
SECTIONS = (
    ("Foreword", 2, 4),
    ("The Human Design System - Introduction", 5, 14),
    ("The Rave Charts", 15, 36),
    ("The Rave I Ching Astrological Index", 37, 44),
    ("The Rave I Ching", 45, 110),
    ("The Juxtaposition Unified Theory", 111, 126),
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--notes-dir", type=Path, required=True)
    parser.add_argument("--source-text", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = json.loads(
        (args.notes_dir / f"{SOURCE_ID}.notes.json").read_text(encoding="utf-8")
    )
    pages = parse_page_marked_text(
        SOURCE_ID, args.source_text.read_text(encoding="utf-8")
    )
    split_by_id = {}
    dataset = args.notes_dir / f"{SOURCE_ID}.learning.jsonl"
    for line in dataset.read_text(encoding="utf-8").splitlines():
        record = json.loads(line)
        split_by_id[record["id"]] = record["split"]
    payload = {
        "source_id": SOURCE_ID,
        "title": "The Human Design System: An Introduction",
        "pages": [{"page": page.pdf_page, "text": page.text} for page in pages],
        "notes": [
            {**note, "split": split_by_id.get(note["note_id"], "unassigned")}
            for note in report["notes"]
        ],
        "sections": [
            {"title": title, "start": start, "end": end}
            for title, start, end in SECTIONS
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(_html(json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")), encoding="utf-8")
    print(args.output.resolve())


def _html(payload: str) -> str:
    return f"""<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Synthia Book Learning Lab</title>
<style>
:root{{--bg:#ebe7dd;--paper:#fffdf8;--ink:#1b1a17;--muted:#716d63;--line:#d5cdbd;--accent:#7b3f2d;--dark:#20211d}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Inter,Arial,sans-serif}}
header{{height:68px;background:var(--dark);color:white;display:flex;align-items:center;padding:0 24px;gap:18px}}
header h1{{font:600 18px Georgia,serif;margin:0}}header small{{color:#bbb9af}}.status{{margin-left:auto;color:#d5cdbd}}
.layout{{display:grid;grid-template-columns:230px minmax(360px,1fr) minmax(360px,1fr);height:calc(100vh - 68px)}}
nav{{border-right:1px solid var(--line);padding:22px 14px;overflow:auto}}nav h2{{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);padding:0 10px}}
button{{font:inherit}}.section{{width:100%;text-align:left;border:0;background:transparent;padding:10px;border-radius:7px;cursor:pointer;color:var(--ink)}}.section:hover,.section.active{{background:#ddd4c4}}
.reader,.work{{overflow:auto;padding:28px}}.reader{{background:var(--paper);border-right:1px solid var(--line)}}.reader h2{{font:26px Georgia,serif;margin:0 0 6px}}.reader pre{{white-space:pre-wrap;font:15px/1.65 Georgia,serif}}
.toolbar{{display:flex;gap:8px;align-items:center;margin:16px 0}}.toolbar button,.tabs button{{border:1px solid var(--line);background:var(--paper);padding:8px 11px;border-radius:6px;cursor:pointer}}.toolbar span{{min-width:82px;text-align:center}}
.tabs{{display:flex;gap:8px;margin-bottom:16px;position:sticky;top:0;background:var(--bg);padding:4px 0 12px}}.tabs button.active{{background:var(--dark);color:#fff}}
.card{{background:var(--paper);border:1px solid var(--line);border-radius:9px;padding:15px;margin:10px 0}}.meta{{color:var(--muted);font-size:12px;display:flex;gap:10px;flex-wrap:wrap}}.evidence{{border-left:3px solid var(--accent);padding-left:10px;color:#4e4a43}}
.draft{{font:16px/1.7 Georgia,serif}}.warning{{background:#f2e6ca;border:1px solid #dcc28a;padding:12px;border-radius:8px}}.empty{{color:var(--muted);padding:24px}}
@media(max-width:900px){{.layout{{display:block;height:auto}}nav{{border:0}}.reader,.work{{min-height:70vh}}}}
</style>
<header><h1>Synthia Book Learning Lab</h1><small>The Human Design System: An Introduction</small><span class="status">Local · page-grounded · review required</span></header>
<div class="layout"><nav><h2>Book sections</h2><div id="sections"></div></nav>
<main class="reader"><h2 id="sectionTitle"></h2><div id="range"></div><div class="toolbar"><button id="prev">←</button><span id="pageNo"></span><button id="next">→</button></div><pre id="pageText"></pre></main>
<aside class="work"><div class="tabs"><button data-tab="notes" class="active">Observed notes</button><button data-tab="novel">AutoNovel draft</button><button data-tab="training">Training view</button></div><div id="panel"></div></aside></div>
<script>
const book={payload};let section=book.sections[0],page=section.start,tab='notes';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));
const inSection=n=>n.pdf_page>=section.start&&n.pdf_page<=section.end;
function renderSections(){{document.querySelector('#sections').innerHTML=book.sections.map((s,i)=>`<button class="section ${{s.title===section.title?'active':''}}" data-i="${{i}}"><b>${{esc(s.title)}}</b><br><small>PDF ${{s.start}}–${{s.end}}</small></button>`).join('');document.querySelectorAll('.section').forEach(b=>b.onclick=()=>{{section=book.sections[+b.dataset.i];page=section.start;render()}})}}
function renderReader(){{const p=book.pages.find(x=>x.page===page);document.querySelector('#sectionTitle').textContent=section.title;document.querySelector('#range').textContent=`PDF pages ${{section.start}}–${{section.end}}`;document.querySelector('#pageNo').textContent=`Page ${{page}}`;document.querySelector('#pageText').textContent=p?.text||'[No extracted text on this page]';}}
function selectedNotes(){{return book.notes.filter(inSection).sort((a,b)=>a.pdf_page-b.pdf_page).slice(0,80)}}
function renderPanel(){{const panel=document.querySelector('#panel'),notes=selectedNotes();if(tab==='notes'){{panel.innerHTML=`<p class="warning">Machine observations are candidates, not approved truth. Compare each one with the page at left.</p>`+notes.map(n=>`<article class="card"><div class="meta"><span>PDF p. ${{n.pdf_page}}</span><span>${{esc(n.status)}}</span><span>OCR confidence ${{n.confidence}}</span></div><h3>${{esc(n.subject)}} ${{esc(n.relation)}}</h3><p>${{esc(n.content)}}</p><p class="evidence">${{esc(n.evidence)}}</p></article>`).join('');return}}
if(tab==='novel'){{const chosen=notes.filter(n=>n.confidence>=.75).slice(0,18);panel.innerHTML=`<p class="warning">Generated account—not the author’s wording. Every sentence retains its source page.</p><article class="card draft"><h2>${{esc(section.title)}} · AutoNovel draft</h2>`+(chosen.length?chosen.map((n,i)=>`<p>${{i%2?'The observed relation is that':'From this section’s perspective,'}} ${{esc(n.subject)}} ${{esc(n.relation)}} ${{esc(n.content)}} <b>[PDF p. ${{n.pdf_page}}]</b></p>`).join(''):'<div class="empty">No eligible observations yet.</div>')+'</article>';return}}
panel.innerHTML=`<p class="warning">Evaluation records stay out of training. Evidence remains attached to both.</p>`+notes.map(n=>`<article class="card"><div class="meta"><b>${{n.split.toUpperCase()}}</b><span>${{esc(n.note_id)}}</span><span>PDF p. ${{n.pdf_page}}</span></div><p><b>Prompt:</b> What does this source observe about ${{esc(n.subject)}}?</p><p><b>Target:</b> ${{esc(n.subject)}} ${{esc(n.relation)}} ${{esc(n.content)}}</p></article>`).join('')}}
function render(){{renderSections();renderReader();renderPanel()}}document.querySelector('#prev').onclick=()=>{{if(page>section.start)page--;renderReader()}};document.querySelector('#next').onclick=()=>{{if(page<section.end)page++;renderReader()}};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{{tab=b.dataset.tab;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));renderPanel()}});render();
</script></html>"""


if __name__ == "__main__":
    main()
