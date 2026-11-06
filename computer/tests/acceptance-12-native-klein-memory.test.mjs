/**
 * SWARM-OS acceptance 12: native Klein tools retain actual lexical memory
 * over Computer restart, not merely the graph revision/identity metadata.
 * Uses real recovered AUTOLING and Diseminer automata, and real EventEmitter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { KLEIN_MEMORY_PROVIDER } from '../services/native-klein-memory.mjs';

const graph = op => ({
  nodes: [{ id: 'input' }, { id: 'result' }],
  edges: [{ from: 'input', to: 'result', functionId: op }],
});

test('ACCEPTANCE 12: real native AUTOLING→Diseminer documents and vectors survive Computer restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'klein-memory-'));
  const log = join(dir, 'events.jsonl');
  const boot = async () => {
    const r = await new ComputerRuntime({ eventLogPath: log }).boot();
    await r.enableNativeKlein();
    return r;
  };
  try {
    const first = await boot();
    assert.equal(first.nativeKlein.autoLing.id, 'autoling');
    assert.equal(first.nativeKlein.diseminer.id, 'diseminer');
    await first.nativeKlein.learnRule({
      id: 'admires.v1', relation: 'ADMIRES',
      pattern: ['$entity', 'admires', '$quality'],
      template: '$entity admires $quality',
    });
    assert.equal((await first.nativeKlein.snapshot()).rules.length, 3);
    await assert.rejects(() => first.nativeKlein.learnRule({
      id: 'admires.v1', relation: 'ADMIRES',
      pattern: ['$entity', 'admires', '$quality'], template: '$entity admires $quality',
    }), /already exists/);

    await first.createFormation({
      id: 'ling-node', address: first.nativeKlein.autoLing.address,
      graph: graph('klein.autoling.recognize'),
    });
    await first.createFormation({
      id: 'memory-node', address: first.nativeKlein.diseminer.address,
      graph: graph('klein.diseminer.ingest-recognized'),
    });
    const composed = await first.composeFormations({
      id: 'klein-language-memory', sourceId: 'ling-node', targetId: 'memory-node',
    });
    assert.equal(composed.revisions[0].lineage.generation, 1);
    const output = await first.executeFormation('klein-language-memory', { text: 'fox is curious' });
    assert.equal(Object.values(output.outputs)[0].relation, 'HAS_PROPERTY');
    const learnedOutput = await first.executeFormation('ling-node', { text: 'fox admires moon' });
    assert.equal(learnedOutput.outputs.result.matches[0].relation, 'ADMIRES');
    const before = await first.nativeKlein.snapshot();
    assert.equal(before.documentCount, 1);
    assert.deepEqual(before.documents[0].tokens, ['fox', 'is', 'curious']);
    assert.ok(before.terms.includes('fox'));
    const priorEvents = await first.eventEmitter.history('klein:diseminer-memory');
    assert.equal(priorEvents.length, 1);
    assert.equal(priorEvents[0].provider, KLEIN_MEMORY_PROVIDER);

    const restarted = await boot();
    const memory = await restarted.nativeKlein.snapshot();
    assert.deepEqual(memory.documents, before.documents);
    assert.deepEqual(memory.rules, before.rules);
    const postRestartRule = await restarted.executeFormation('ling-node', { text: 'owl admires moon' });
    assert.equal(postRestartRule.outputs.result.matches[0].relation, 'ADMIRES');
    assert.equal((await restarted.eventEmitter.history('klein:autoling-memory')).length, 1);
    assert.deepEqual(memory.terms, before.terms);
    assert.equal(restarted.formations.describe('klein-language-memory').revisions.length, 1);
    const second = await restarted.executeFormation('klein-language-memory', { text: 'owl is patient' });
    assert.equal(Object.values(second.outputs)[0].relation, 'HAS_PROPERTY');
    const continued = await restarted.nativeKlein.snapshot();
    assert.equal(continued.documentCount, 2);
    assert.ok(continued.terms.includes('owl'));
    const nativeVectors = restarted.nativeKlein.diseminer.ownedState.vectors;
    assert.ok(nativeVectors.get('fox').get('is') > 0);
    assert.ok(nativeVectors.get('owl').get('patient') > 0);
    assert.equal((await restarted.eventEmitter.history('klein:diseminer-memory')).length, 2);
    assert.deepEqual(await first.eventEmitter.history('klein:diseminer-memory'), priorEvents.concat(
      (await restarted.eventEmitter.history('klein:diseminer-memory')).slice(1)
    ));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
