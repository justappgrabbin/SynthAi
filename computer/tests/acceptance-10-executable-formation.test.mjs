/**
 * SWARM-OS acceptance 10:
 * Real recovered ATO graph + native Automaton/AutomataMesh + Computer
 * append-only event emitter + actual restart reconstruction.
 * No new executor, model service, server, mock donor, or LLM.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';
import { AutoLingMemory, DiseminerMemory } from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/vendor/ato-core/src/klein-tools.mjs';
import { FORMATION_PROVIDER } from '../services/executable-formations.mjs';

const ADDRESS = Object.freeze({ mode: 'macro', gate: 17, line: 1, color: 1, tone: 1, base: 1 });
const graph1 = () => ({
  nodes: [{ id: 'input' }, { id: 'result' }],
  edges: [{ from: 'input', to: 'result', functionId: 'test.double' }],
});
const graph2 = () => ({
  nodes: [{ id: 'input' }, { id: 'step' }, { id: 'result' }],
  edges: [
    { from: 'input', to: 'step', functionId: 'test.double' },
    { from: 'step', to: 'result', functionId: 'test.increment' },
  ],
});
const bindOperations = runtime => runtime
  .registerFormationOperation('test.double', n => n * 2)
  .registerFormationOperation('test.increment', n => n + 1)
  .registerFormationOperation('test.inspect-purpose', (value, context) => context.purpose);

test('ACCEPTANCE 10: persistent formation creation, graph morph, activation and restart recovery', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'synthai-formation-'));
  const eventLogPath = join(dir, 'history.jsonl');
  const persistence = () => new JsonFilePersistence(join(dir, 'state.json'));
  const boot = async () => bindOperations(await new ComputerRuntime({
    eventLogPath, persistence: persistence(), namespace: 'formation-acceptance-10',
  }).boot());
  try {
    const runtime1 = await boot();
    assert.ok(runtime1.services.has('formation-execution'));
    assert.ok(runtime1.capabilityRegistry.get('formation-execution'));
    await runtime1.createFormation({
      id: 'purpose-reader', address: ADDRESS, purpose: 'purpose-retained',
      graph: { nodes: [{ id: 'input' }, { id: 'result' }],
        edges: [{ from: 'input', to: 'result', functionId: 'test.inspect-purpose' }] },
    });
    assert.equal((await runtime1.executeFormation('purpose-reader', null)).outputs.result, 'purpose-retained');
    const created = await runtime1.createFormation({
      id: 'morphing-graph', address: ADDRESS, graph: graph1(),
      purpose: 'prove structural execution',
    });
    assert.equal(created.revisions.length, 1);
    const oldRevision = created.activeRevision;
    assert.equal((await runtime1.executeFormation('morphing-graph', 2)).outputs.result, 4);

    const transformed = await runtime1.transformFormation('morphing-graph', graph2());
    const newRevision = transformed.activeRevision;
    assert.equal(transformed.id, created.id);
    assert.equal(transformed.revisions.length, 2);
    assert.equal(transformed.revisions[1].graph.edges.length, 2);
    assert.notEqual(transformed.revisions[0].artifactId, transformed.revisions[1].artifactId);
    assert.equal((await runtime1.executeFormation('morphing-graph', 2)).outputs.result, 5);
    assert.equal((await runtime1.executeFormation('morphing-graph', 2, { revisionId: oldRevision })).outputs.result, 4);
    const projected = runtime1.formations.kernel.project(ADDRESS, 'code');
    assert.equal(projected.value.activeRevision, newRevision, 'code projection points to active version');
    assert.equal(projected.value.formations['morphing-graph'].activeRevision, newRevision);
    assert.equal(projected.value.formations['purpose-reader'].activeRevision, 'formation:purpose-reader@1');

    // Activation chooses a historical executable revision WITHOUT deleting the new one.
    await runtime1.activateFormation('morphing-graph', oldRevision);
    assert.equal((await runtime1.executeFormation('morphing-graph', 3)).outputs.result, 6);

    const originalHistory = await runtime1.formationHistory('morphing-graph');
    assert.ok(originalHistory.every(e => e.provider === FORMATION_PROVIDER));
    assert.ok(originalHistory.every(e => e.trajectory_id === 'formation:morphing-graph'));
    assert.ok(originalHistory.some(e => e.input.action === 'transform'));
    assert.ok(originalHistory.some(e => e.input.action === 'activate'));
    assert.ok(originalHistory.some(e => e.event_type === 'tool_execution'));

    // FRESH COMPUTER: event replay reconstructs current activation and BOTH graphs.
    const runtime2 = await boot();
    const recovered = runtime2.formations.describe('morphing-graph');
    assert.equal((await runtime2.executeFormation('purpose-reader', null)).outputs.result,
      'purpose-retained', 'ATO purpose passed to installed operation after fresh boot');
    assert.deepEqual(recovered.revisions, runtime1.formations.describe('morphing-graph').revisions);
    assert.equal(recovered.activeRevision, oldRevision);
    assert.equal((await runtime2.executeFormation('morphing-graph', 3)).outputs.result, 6);
    await runtime2.activateFormation('morphing-graph', newRevision);
    assert.equal((await runtime2.executeFormation('morphing-graph', 3)).outputs.result, 7);
    assert.equal((await runtime2.executeFormation('morphing-graph', 3, { revisionId: oldRevision })).outputs.result, 6);

    const continued = await runtime2.formationHistory('morphing-graph');
    assert.ok(continued.length > originalHistory.length);
    assert.deepEqual(continued.slice(0, originalHistory.length), originalHistory, 'historical events never overwritten');
    assert.equal(continued.at(-1).result.outputs.result, 6);
    t.diagnostic('real donor ATO compiled both graphs; Computer event ledger replayed both revisions; both execute after fresh boot');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ACCEPTANCE 10: native Klein grammar and lexical-memory nodes become composed formation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synthai-klein-formation-'));
  const r = await new ComputerRuntime({ eventLogPath: join(dir, 'events.jsonl') }).boot();
  try {
    const ling = new AutoLingMemory();
    ling.learn({
      id: 'has-quality.1', relation: 'HAS_QUALITY',
      pattern: ['$entity', 'is', '$quality'], template: '$entity is $quality',
    });
    const diseminer = new DiseminerMemory();
    r.registerFormationOperation('klein.autoling.recognize', input => ling.recognize(input.text));
    r.registerFormationOperation('klein.diseminer.ingest', recognized => {
      if (!recognized.ok) return { ok: false, reason: 'NO_GRAMMAR_MATCH' };
      const document = diseminer.ingest(recognized.text, { source: 'computer-formation' });
      return { relation: recognized.matches[0].relation, document };
    });
    const result = await r.createFormation({
      id: 'klein-formed-tool', address: ADDRESS,
      graph: { nodes: [{ id: 'input' }, { id: 'result' }],
        edges: [{ from: 'input', to: 'result', functionId: 'klein.autoling.recognize' }] },
    });
    assert.equal((await r.executeFormation('klein-formed-tool', { text: 'dragon is playful' }))
      .outputs.result.matches[0].relation, 'HAS_QUALITY');

    await r.transformFormation('klein-formed-tool', {
      nodes: [{ id: 'input' }, { id: 'recognized' }, { id: 'result' }],
      edges: [
        { from: 'input', to: 'recognized', functionId: 'klein.autoling.recognize' },
        { from: 'recognized', to: 'result', functionId: 'klein.diseminer.ingest' },
      ],
    });
    const output = (await r.executeFormation('klein-formed-tool', { text: 'dragon is playful' })).outputs.result;
    assert.equal(output.relation, 'HAS_QUALITY');
    assert.deepEqual(output.document.tokens, ['dragon', 'is', 'playful']);
    assert.equal(diseminer.documents.length, 1);
    assert.equal(r.formations.describe('klein-formed-tool').id, result.id);
    assert.equal(r.formations.describe('klein-formed-tool').revisions.length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ACCEPTANCE 10: invalid transforms and runtime faults preserve working revisions in history', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synthai-formation-errors-'));
  const path = join(dir, 'events.jsonl');
  try {
    const r = bindOperations(await new ComputerRuntime({ eventLogPath: path }).boot());
    const created = await r.createFormation({ id: 'safe-formation', address: ADDRESS, graph: graph1() });
    const invalid = graph2();
    invalid.edges[1].functionId = 'does-not-exist';
    await assert.rejects(() => r.transformFormation('safe-formation', invalid), /registered implementation/i);
    assert.equal(r.formations.describe('safe-formation').activeRevision, created.activeRevision);
    assert.equal(r.formations.describe('safe-formation').revisions.length, 1);
    assert.equal((await r.executeFormation('safe-formation', 7)).outputs.result, 14);
    r.registerFormationOperation('test.fault', () => { throw new Error('intentional-execution-fault'); });
    const faultGraph = {
      nodes: [{ id: 'input' }, { id: 'result' }],
      edges: [{ from: 'input', to: 'result', functionId: 'test.fault' }],
    };
    const changed = await r.transformFormation('safe-formation', faultGraph);
    await assert.rejects(() => r.executeFormation('safe-formation', 7), /intentional-execution-fault/);
    const history = await r.formationHistory('safe-formation');
    assert.ok(history.some(e => e.event_type === 'failure' && e.input.action === 'transform'));
    assert.ok(history.some(e => e.event_type === 'failure' && e.input.action === 'execute'));
    await r.activateFormation('safe-formation', created.activeRevision);
    assert.equal((await r.executeFormation('safe-formation', 2)).outputs.result, 4);
    const restarted = bindOperations(await new ComputerRuntime({ eventLogPath: path }).boot());
    assert.equal(restarted.formations.describe('safe-formation').activeRevision, created.activeRevision);
    assert.equal(restarted.formations.describe('safe-formation').revisions.length, 2);
    assert.equal((await restarted.executeFormation('safe-formation', 5)).outputs.result, 10);
    assert.equal(changed.revisions.at(-1).graph.edges[0].functionId, 'test.fault');
    assert.equal((await restarted.formationHistory('safe-formation')).filter(e => e.event_type === 'failure').length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
