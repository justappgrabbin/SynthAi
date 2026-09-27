// Pure Synthia Automata — narrative demo (node demo.mjs)
//
// Boots the shared mesh with all 16 tool automata, walks a small story of
// tool calls (including a two-call and a three-call chain), renders the
// derivation ledger and the sound/color trace of one run, shows mesh
// metrics, and finishes with a deterministic replay check.

import { SynthiaAutomata } from './src/engine/synthia.js';

const line = (char = '─', n = 72) => char.repeat(n);
const heading = (title) => console.log(`\n${line()}\n${title}\n${line()}`);
const hex8 = (h) => h;

heading('PURE SYNTHIA AUTOMATA — booting the shared mesh (L8)');
const engine = new SynthiaAutomata();
console.log('16 tool automata mounted on one AutomataMesh; default ring wired output→input.\n');
console.log(`${'tool'.padEnd(30)}${'gate'.padStart(5)}  ${'dimension'.padEnd(10)}automaton form`);
console.log(line('·'));
for (const t of engine.listTools()) {
  console.log(`${t.id.padEnd(30)}${String(t.gate).padStart(5)}  ${t.dimension.padEnd(10)}${t.automatonForm}`);
}

// The first call on this engine is kept for the deterministic replay at the
// end: replay re-runs this engine's input history prefix on a fresh engine,
// so the derivation must reproduce hash-identically (spec §12).
heading('CALL 1 · two-call chain — define a purpose, then weave it into conversation');
const chainInput = 'success \'{"operation":"define","personId":"ada","purpose":{"statement":"practice the grammar daily","indicators":[{"id":"practice","name":"practice"}]}}\' then conversation "summarize"';
console.log(`> ${chainInput}\n`);
const chain = engine.call(chainInput);
for (const r of chain.chainResults) {
  console.log(`  [${r.tool}] final=${r.finalState} accepted=${r.accepted}`);
}
console.log(`\nconversation utters:\n${chain.output.utterance.split('\n').map((s) => `  ${s}`).join('\n')}`);
console.log(`\nderivation ${chain.id} · hash ${hex8(chain.hash)}`);

heading('CALL 2 · grammar coding — Klein & Simmons 1963 per-word syntactic codes');
const coding = engine.call('coder "the dogs bark" at 41.2.3 --mode=exact');
for (const w of coding.output.words) {
  console.log(`  ${w.word.padEnd(8)} codes: ${w.codes.join(', ')}${w.ambiguous ? '  (ambiguous)' : ''}`);
}
console.log(`address parsed: ${JSON.stringify(coding.chainResults[0].address)} · flags: ${JSON.stringify(coding.chainResults[0].flags)}`);
console.log(`derivation ${coding.id} · hash ${coding.hash}`);

heading('CALL 3 · canonical AUTOLING pipeline — morphology → rules');
const ling = engine.call('autoling "the dogs bark loudly"');
console.log(`  morphemes: ${ling.output.pipeline.morphology.morphemes.map((m) => `${m.segment}/${m.gloss}`).join(' · ')}`);
console.log(`  rules in grammar: ${ling.output.rules.length} · stats: ${JSON.stringify(ling.output.stats)}`);
console.log(`derivation ${ling.id} · hash ${ling.hash}`);

heading('CALL 4 · three-call chain — autoling → diseminer → conversation');
const threeInput = 'autoling "the dogs bark" then diseminer "the dogs bark" then conversation "summarize"';
console.log(`> ${threeInput}\n`);
const three = engine.call(threeInput);
for (const r of three.chainResults) {
  const via = r.routed ? `──packet──▸ ${three.chainResults[three.chainResults.indexOf(r) + 1].tool}` : '(terminal — no packet)';
  console.log(`  [${r.tool}] final=${r.finalState} accepted=${r.accepted} ${via}`);
}
console.log(`\nconversation utters:\n${three.output.utterance.split('\n').map((s) => `  ${s}`).join('\n')}`);
console.log(`\nderivation ${three.id} · hash ${three.hash} · DI=${three.evaluation.derivationIntegrity}`);

heading('CALL 5 · distributional memory — diseminer observes, iching transforms a gate');
engine.call('diseminer "the quick brown fox jumps over the lazy dog"');
const iching = engine.toolsById.get('iching-grammar');
const cast = iching.run({ lines: [1, 0, 0, 0, 1, 0], transform: 'rotation' });
console.log(`  gate 41 bits [1,0,0,0,1,0] --rotation--> [${cast.output.transformed.lines.join(',')}] = value ${cast.output.transformed.binaryValue} (${cast.output.transformed.lower.name} below, ${cast.output.transformed.upper.name} above)`);

heading('DERIVATION LEDGER + HASH · the three-call chain');
console.log(JSON.stringify(three.ledger, null, 2));
console.log(`hash: ${three.hash}`);

heading('SOUND + COLOR TRACE · one rendering per trace step of the chain run');
for (const r of three.chainResults) {
  console.log(`  ${r.tool}`);
  for (const s of r.trace) {
    console.log(`    ${String(s.from).padEnd(10)} ${s.transition.padEnd(11)} ${String(s.to).padEnd(10)} ${s.sound.freq.toFixed(2).padStart(9)} Hz  ${s.color.hex}`);
  }
}

heading('MESH METRICS · five projections');
// Record the chain's causal/dependency edges into the mesh projections so the
// run leaves a graph footprint (spec §12: separate neighbor sets per state).
const mesh = engine.mesh;
const stepsOf = (r) => r.trace.map((s) => `${r.tool}:${s.to}`);
for (let k = 0; k < three.chainResults.length - 1; k++) {
  const a = three.chainResults[k];
  const b = three.chainResults[k + 1];
  mesh.addEdge('causal', `${a.tool}:${a.finalState}`, `${b.tool}:${b.trace[0].to}`, 'chain', { derivation: three.id });
  mesh.addEdge('dependency', `${b.tool}:${b.finalState}`, `${a.tool}:${a.finalState}`, 'consumes-packet', { derivation: three.id });
  mesh.addEdge('temporal', `${a.tool}:${a.finalState}`, `${b.tool}:${b.trace[0].to}`, 'before', { derivation: three.id });
  mesh.addEdge('phase', `${a.tool}:${a.finalState}`, `${b.tool}:${b.finalState}`, 'co-active', { derivation: three.id });
  mesh.addEdge('knowledge', `${a.tool}:${a.finalState}`, `${b.tool}:${b.finalState}`, 'informs', { derivation: three.id });
}
const metrics = engine.meshMetrics();
console.log(`automata: ${metrics.automata} · ring connections: ${metrics.connections}`);
for (const [name, p] of Object.entries(metrics.projections)) {
  console.log(`  ${name.padEnd(12)} nodes=${p.nodes} edges=${p.edges} avgDegree=${p.avgDegree}`);
}

heading('DETERMINISTIC REPLAY · re-run CALL 1 on a fresh engine and compare hashes');
const replay = engine.replay(chain.toJSON());
console.log(`original hash: ${replay.original}`);
console.log(`replayed hash: ${replay.replayed}`);
console.log(`status: ${replay.status}`);

// The sections below run after the replay on purpose: replay() re-runs the
// engine.call() input history, and the address-first intake keeps it exact.

heading('INTAKE · the Sensory Adapter addresses input before anything runs');
const sniff = engine.intake('the gate learns from the user');
console.log(`  id ${sniff.id} · basis ${sniff.addressBasis} · address G${sniff.address.gate}.L${sniff.address.line}.C${sniff.address.color}.T${sniff.address.tone}.B${sniff.address.base}`);
console.log(`  sound ${sniff.sound.freq.toFixed(2)} Hz (${sniff.sound.timbre}) · color ${sniff.color.hex} (${sniff.color.layer})`);
console.log(`  regime ${sniff.regime.dimension} (${sniff.regime.interrogative}/${sniff.regime.operation}) · concepts: ${sniff.analysis.concepts.join(', ')}`);
console.log(`  purpose ≈ "${sniff.analysis.purpose}"`);
console.log('  the five mechanical senses:');
console.log(`    see   (Movement)  heading ${sniff.senses.see.transitionVector.angle}° · momentum ${sniff.senses.see.momentum.toFixed(3)}`);
console.log(`    taste (Evolution) familiarity ${sniff.senses.taste.familiarity.toFixed(2)} · novelty ${sniff.senses.taste.novelty.toFixed(2)}`);
console.log(`    touch (Being)     length ${sniff.senses.touch.texture.length} · nesting ${sniff.senses.touch.texture.nestingDepth} · entropy ${sniff.senses.touch.texture.entropy.toFixed(2)} bits · pressure ${sniff.senses.touch.pressure.toFixed(2)}`);
console.log(`    smell (Design)    scent [${sniff.senses.smell.scent.map((v) => v.toFixed(2)).join(', ')}]  (${sniff.senses.smell.components.join('/')})`);
console.log(`    hear  (Space)     channels ${sniff.senses.hear.channels.map((c) => c.join('-')).join(', ') || 'none'} · resonances ${sniff.senses.hear.resonantAddresses.length}`);

heading('LEARNING · request front door — route what it knows, grow what it does not');
const requests = [
  'make a picture of gate 24',
  'make a video of gate 24 morphing into gate 41',
  'write code for a gate resonance counter',
  'invent a contraption that sings backwards',
  'invent a contraption that sings backwards',
];
for (const q of requests) {
  const r = await engine.request(q);
  console.log(`  > ${q}`);
  console.log(`    mode=${r.mode} tool=${r.toolId} score=${r.score.toFixed(2)} cr=${JSON.stringify(r.cr)}`);
  if (r.output && r.output.artifact) {
    const a = r.output.artifact;
    console.log(`    artifact: ${a.id} ${a.fileName} (${a.mime}, ${a.size} bytes, fnv1a ${a.hash}) — real ${a.format} bytes, pure JS`);
  }
  if (r.output && r.output.kind === 'video') {
    console.log(`    frames: ${r.output.frames.count} × ${r.output.frames.width}x${r.output.frames.height} RGBA · changing lines [${r.output.frames.changingLines.join(',')}] · hashes ${r.output.frames.hashes.slice(0, 3).join(',')}…`);
  }
  if (r.output && r.output.kind === 'code') {
    console.log(`    woven module "${r.output.name}" (${r.output.bytes} bytes, signature ${r.output.signature}):`);
    console.log(r.output.code.split('\n').slice(0, 8).map((s) => `      ${s}`).join('\n'));
  }
}
const cr = engine.learning.crReport();
console.log(`\n  crReport: ${cr.requests} requests · modes ${JSON.stringify(cr.byMode)} · totals ${JSON.stringify(cr.totals)}`);
console.log(`  grown tools: ${engine.grownTools().map((t) => `${t.id} (gate ${t.gate}, ${t.dimension}, L${t.level})`).join(' · ')}`);

heading('SEMANTIC TRIPLES · each tool is made of triples; every run leaves provenance');
console.log(`triple store: ${engine.tripleStore.size()} triples · predicates: ${engine.tripleStore.predicates().sort().join(', ')}`);
const onto = engine.toolTriples('autoling');
console.log(`\n  autoling is made of ${onto.length} triples, e.g.:`);
for (const t of onto.filter((x) => ['isA', 'hasGate', 'hasDimension', 'hasForm'].includes(x.predicate))) {
  console.log(`    (${t.subject}, ${t.predicate}, ${JSON.stringify(t.object)})`);
}
console.log(`    (${onto.find((t) => t.predicate === 'hasCapability').subject}, hasCapability, ${JSON.stringify(onto.find((t) => t.predicate === 'hasCapability').object)})  …`);
const transitionTriples = engine.triples({ predicate: 'transition' });
console.log(`\n  run provenance: ${transitionTriples.length} (stateFrom, transition, stateTo) trace triples, each carrying its derivation id`);
console.log(`  e.g. (${transitionTriples[0].subject}, transition, ${transitionTriples[0].object})  ← ${transitionTriples[0].derivationId} via ${transitionTriples[0].provenance}`);

heading('EMERGENT CHANNELS · a crossing used 3 times becomes a persistent channel');
for (let k = 0; k < 3; k++) {
  engine.call('klein-analogy "body is to mind as form is to shadow" then conversation "summarize"');
}
for (const c of engine.emergentChannels()) {
  console.log(`  channel:${c.a}~${c.b} — promoted after ${c.uses} crossings (packets ${c.packetKeys.join(', ')})`);
  const cap = engine.channelCapability(c.a, c.b);
  console.log(`    capability: ${cap.id} · kind ${cap.kind} · compose ${cap.compose} · tools [${cap.tools.join(', ')}]`);
}
const emergentReq = await engine.request('boolean analogy proportion, then talk and summarize the utterance');
console.log(`\n  > boolean analogy proportion, then talk and summarize the utterance`);
console.log(`    mode=${emergentReq.mode} tool=${emergentReq.toolId} score=${emergentReq.score.toFixed(2)}`);
console.log(`    ${String(emergentReq.output.utterance || '').split('\n').map((s) => `    ${s}`).join('\n')}`);

heading('EXPERIENTIAL RETURN · every result feeds back into the participating automata');
const convAut = engine.toolsById.get('conversation');
console.log(`conversation ownedState.experiences: ${convAut.ownedState.experiences.length} records; latest:`);
const lastXp = convAut.ownedState.experiences[convAut.ownedState.experiences.length - 1];
console.log(`  {derivationId: ${lastXp.derivationId ?? 'null'}, intakeId: ${lastXp.intakeId}, outputHash: ${lastXp.outputHash}, seq: ${lastXp.seq}}`);

heading('DONE');
console.log('All hypotheses (H1–H6) remain labeled, not asserted — the machinery measures them.');
