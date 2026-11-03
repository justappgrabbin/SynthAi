import { useState } from "react";
import protocols from "./researchTests.json";
export default function ResearchTests() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(protocols[0].id);
  const test = protocols.find(p => p.id === selected)!;
  return <section className="panel" aria-label="Research protocols">
    <button onClick={() => setOpen(!open)} aria-expanded={open}>Research lab · Six ways to challenge the claims {open ? "−" : "+"}</button>
    {open && <><p>Proposed tests · No empirical validation claimed. Chart calculations and personal interpretations are different evidence.</p>
      <nav aria-label="Test types" style={{display:"flex",flexWrap:"wrap",gap:8}}>{protocols.map(p => <button key={p.id} aria-pressed={selected===p.id} onClick={() => setSelected(p.id)}>{p.title}</button>)}</nav>
      <article><h2>{test.title}</h2><p>{test.question}</p>{[["Method",test.method],["What it expects",test.expected],["What it does not establish",test.notExpected],["What would contradict it",test.falsification],["Comparison",test.baseline]].map(([label,value]) => <div key={label}><h3>{label}</h3><p>{value}</p></div>)}
      <p>Before collecting data: freeze outcomes, effect threshold, sample size, scoring, exclusions, stopping rule, and model version. Report uncertainty and failed predictions. A small inconclusive study cannot prove or disprove the claim.</p></article></>}
  </section>;
}
