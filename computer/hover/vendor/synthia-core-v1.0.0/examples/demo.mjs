/**
 * SynthiaCore demo
 * Shows: boot → water → admit → contact → call tool
 */

import { SynthiaCore } from '../src/SynthiaCore.mjs';

const core = new SynthiaCore();

// 1. Boot — seeds Synthia at Gate 1 / Being
console.log('--- BOOT ---');
const boot = core.boot();
console.log('entities:', boot.entities);
console.log('tools mounted:', boot.tools.length);

// 2. Water — daily language input accumulates in Diseminer
console.log('\n--- WATER ---');
const w1 = core.water('I learn through movement and change');
const w2 = core.water('the field integrates all expressions');
const w3 = core.water('building structure from design principles');
console.log('w1 top gate:', w1.topGate, '| neighbors:', w1.neighbors.map(n => n.term));
console.log('w2 top gate:', w2.topGate);
console.log('w3 top gate:', w3.topGate);

// 3. Admit pieces — Synthia places them by resolving against her current state
console.log('\n--- ADMIT ---');
const p1 = core.admit({ id: 'heart-field', text: 'relating to others through felt presence', type: 'concept' });
const p2 = core.admit({ id: 'movement-engine', text: 'transition flow step action begin', type: 'tool' });
const p3 = core.admit({ id: 'learning-loop', text: 'adapt grow evolve transform learn', type: 'process' });
console.log('heart-field   →', p1.dimension, 'Gate', p1.gate);
console.log('movement-engine →', p2.dimension, 'Gate', p2.gate);
console.log('learning-loop  →', p3.dimension, 'Gate', p3.gate);

// 4. Contact — two pieces meet
console.log('\n--- CONTACT ---');
const c = core.contact('heart-field', 'learning-loop', { relation: 'informs' });
console.log('sentence:', c.sentence.sentence);

// 5. Call a live ATO tool
console.log('\n--- ATO TOOL: diseminer ---');
const diseminer = await core.call('diseminer', {
  operation: 'ingest',
  text: 'the heart field learns through contact',
  context: { source: 'demo' },
});
console.log('diseminer ingested:', diseminer?.id ?? diseminer);

const neighbors = await core.call('diseminer', {
  operation: 'neighbors',
  term: 'heart',
  options: { limit: 3 },
});
console.log('neighbors of "heart":', neighbors.map(n => n.term));

// 6. Klein analogy
console.log('\n--- ATO TOOL: klein-analogy ---');
const vocab = ['field', 'heart', 'mind', 'body', 'learn', 'move', 'build', 'space'];
const analogy = await core.call('klein-analogy', {
  vocab,
  A: ['field', 'heart'],
  B: ['field', 'mind'],
  C: ['learn', 'heart'],
});
console.log('analogy result:', analogy.result);

// 7. Snapshot
console.log('\n--- SNAPSHOT ---');
const snap = core.snapshot();
console.log('entities registered:', snap.entities);
console.log('water count:', snap.waterCount);
console.log('science:', snap.science);
console.log('top routes:', snap.routes.slice(0, 2));
