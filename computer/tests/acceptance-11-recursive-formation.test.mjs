/**
 * SWARM-OS acceptance 11:
 * Recover native ATO Automata, form new executable code by native
 * GenerativeEmergence association, compose it recursively and replay on restart.
 * This is bounded graph synthesis, NOT unrestricted code generation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

const address = gate => ({ mode: 'macro', gate, line: 1, color: 1, tone: 1, base: 1 });
const graph = functionId => ({
  nodes: [{ id: 'input' }, { id: 'result' }],
  edges: [{ from: 'input', to: 'result', functionId }],
});
const boot = async logPath => (await new ComputerRuntime({ eventLogPath: logPath }).boot())
  .registerFormationOperation('numbers.double', x => x * 2)
  .registerFormationOperation('numbers.increment', x => x + 1);

test('ACCEPTANCE 11: native emergence composes executable child and grandchild with persisted lineage', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'synthai-recursive-'));
  const path = join(dir, 'events.jsonl');
  try {
    const r1 = await boot(path);
    const double = await r1.createFormation({
      id: 'double', address: address(17),
      graph: graph('numbers.double'),
    });
    const increment = await r1.createFormation({
      id: 'increment', address: address(48),
      graph: graph('numbers.increment'),
    });
    const child = await r1.composeFormations({
      id: 'emergent-child', sourceId: 'double', targetId: 'increment',
      context: { purpose: 'deterministic-probe' },
    });
    assert.equal(child.revisions.length, 1);
    assert.equal(child.revisions[0].lineage.generator, 'recovered:ato-core/GenerativeEmergence');
    assert.equal(child.revisions[0].lineage.sourceRevision, double.activeRevision);
    assert.equal(child.revisions[0].lineage.targetRevision, increment.activeRevision);
    assert.match(child.revisions[0].lineage.mappingVersion, /state-space-association/);
    assert.equal(child.revisions[0].graph.edges.length, 2);
    assert.deepEqual(child.revisions[0].graph.edges.map(e => e.functionId), [
      'formation.revision:' + double.activeRevision,
      'formation.revision:' + increment.activeRevision,
    ]);
    assert.equal((await r1.executeFormation('emergent-child', 3)).outputs.output, 7);
    const grandchild = await r1.composeFormations({
      id: 'emergent-grandchild', sourceId: 'emergent-child', targetId: 'double',
    });
    assert.equal(grandchild.revisions.length, 1);
    assert.equal((await r1.executeFormation('emergent-grandchild', 3)).outputs.output, 14);
    assert.equal(r1.formations.list().length, 4);
    const nested = await r1.formationHistory('double');
    assert.ok(nested.some(e => e.input.action === 'execute'), 'child invoked source formation via real ATO');

    // All four formations survive restart as graph and lineage, not serialized closures.
    const r2 = await boot(path);
    assert.deepEqual(r2.formations.describe('emergent-child'), child);
    assert.deepEqual(r2.formations.describe('emergent-grandchild'), grandchild);
    assert.equal((await r2.executeFormation('emergent-child', 3)).outputs.output, 7);
    assert.equal((await r2.executeFormation('emergent-grandchild', 3)).outputs.output, 14);
    const events = await r2.formationHistory('emergent-grandchild');
    assert.ok(events.filter(e => e.input.action === 'execute').length === 2);
    t.diagnostic('two donor-resolved graph compositions execute and remain callable after fresh Computer boot');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ACCEPTANCE 11: unknown and self-referential revision graphs cannot silently execute', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synthai-recursive-guard-'));
  const path = join(dir, 'events.jsonl');
  try {
    const r = await boot(path);
    await assert.rejects(() => r.createFormation({
      id: 'invalid-child', address: address(17),
      graph: graph('formation.revision:nonexistent@1'),
    }), /Unknown executable formation dependency/);
    assert.equal(r.formations.list().length, 0);
    await r.createFormation({ id: 'safe', address: address(17), graph: graph('numbers.double') });
    await assert.rejects(() => r.transformFormation('safe', graph('formation.revision:formation:safe@2')),
      /Unknown executable formation dependency|Recursive formation dependency cycle/);
    assert.equal(r.formations.describe('safe').revisions.length, 1);
    assert.equal((await r.executeFormation('safe', 2)).outputs.result, 4);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
