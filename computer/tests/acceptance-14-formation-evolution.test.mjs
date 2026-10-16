import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';
import {
  CONSTANT_FORMATION, GRADIENT_FORMATION, EVOLVING_FORMATION, EVOLUTION_PROVIDER,
} from '../services/fitness-morph.mjs';

const address = { mode: 'macro', gate: 17, line: 1, color: 1, tone: 1, base: 1 };
const observed = mode => {
  const out = [];
  for (let j = 0; j <= 10; j++) for (let i = 0; i <= 10; i++) {
    const x = -1 + i / 5, y = -1 + j / 5;
    const source = [112 + x * 3, 122 + y * 4, 140];
    const target = source.map((v, c) =>
      mode === 'flat' ? v :
        mode === 'constant' ? v + [12, -9, 6][c] :
          v + [9, -5, 6][c] + [20, -16, 9][c] * x + [12, 14, -9][c] * y);
    out.push({ x, y, source, target });
  }
  return out;
};

test('ACCEPTANCE 14: real PSO candidate formations compete; only measured winner changes graph and MorphEngine', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'formation-evolution-'));
  try {
    const events = join(dir, 'events.jsonl'), statePath = join(dir, 'state.json');
    const boot = async () => {
      const computer = await new ComputerRuntime({
        eventLogPath: events, namespace: 'evolution-14',
        persistence: new JsonFilePersistence(statePath),
      }).boot();
      await computer.enableFitnessMorph();
      return computer;
    };
    const a = await boot();
    await a.fitnessMorph.ensureFormations({ address });
    for (const id of [CONSTANT_FORMATION, GRADIENT_FORMATION, EVOLVING_FORMATION])
      assert.equal(a.formations.describe(id).revisions.length, 1);
    const first = await a.fitnessMorph.evolve(observed('constant'));
    assert.equal(first.accepted, true);
    assert.equal(first.selected, 'constant');
    assert.equal(first.transformed, false, 'constant is the original active graph');
    assert.equal(first.candidates.length, 2);
    assert.ok(first.candidates.every(c => Number.isFinite(c.heldOutAfter)));
    assert.ok(first.gain > 0);
    assert.equal(a.formations.describe(EVOLVING_FORMATION).revisions.length, 1);
    assert.equal(a.state.get('morph.targets.studio-lighting').fitness.strategy, 'constant');

    const second = await a.fitnessMorph.evolve(observed('gradient'));
    assert.equal(second.accepted, true);
    assert.equal(second.selected, 'gradient');
    assert.equal(second.transformed, true);
    assert.equal(a.formations.describe(EVOLVING_FORMATION).revisions.length, 2);
    const active = a.formations.describe(EVOLVING_FORMATION);
    assert.equal(active.revisions[0].graph.edges[0].functionId, 'simlish.evolution.constant');
    assert.equal(active.revisions[1].graph.edges[0].functionId, 'simlish.evolution.gradient');
    assert.equal(active.revisions[1].previousRevision, active.revisions[0].id);
    assert.equal(a.state.get('morph.targets.studio-lighting').fitness.strategy, 'gradient');

    const formerExpression = a.state.get('morph.targets.studio-lighting');
    const third = await a.fitnessMorph.evolve(observed('flat'));
    assert.equal(third.accepted, false);
    assert.equal(third.transformed, false);
    assert.equal(a.formations.describe(EVOLVING_FORMATION).activeRevision, second.revision);
    assert.deepEqual(a.state.get('morph.targets.studio-lighting'), formerExpression);
    const journal = await a.fitnessMorph.evolutionHistory();
    assert.equal(journal.length, 3);
    assert.deepEqual(journal.map(e => e.result_status), ['success', 'success', 'partial']);
    assert.ok(journal.every(e => e.provider === EVOLUTION_PROVIDER &&
      !e.input.samples && !e.result.samples && !e.result.targetImage),
    'No private image/sample arrays included in durable evolution receipts');
    assert.equal((await a.executeFormation(EVOLVING_FORMATION, {
      samples: observed('constant'), baseline: [0, 0, 0],
    }, { revisionId: active.revisions[0].id })).outputs.result.strategy, 'constant');

    const restarted = await boot();
    assert.deepEqual(restarted.formations.describe(EVOLVING_FORMATION), active);
    assert.equal(restarted.state.get('morph.targets.studio-lighting').fitness.strategy, 'gradient');
    assert.equal((await restarted.fitnessMorph.evolutionHistory()).length, 3);
    assert.equal((await restarted.executeFormation(EVOLVING_FORMATION, {
      samples: observed('gradient'), baseline: [0, 0, 0],
    })).outputs.result.strategy, 'gradient');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('ACCEPTANCE 14: malformed and empty observations cannot mutate an existing formation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'formation-evolution-guard-'));
  try {
    const computer = await new ComputerRuntime({ eventLogPath: join(dir, 'events.jsonl') }).boot();
    await computer.enableFitnessMorph();
    await computer.fitnessMorph.ensureFormations({ address });
    const version = computer.formations.describe(EVOLVING_FORMATION).activeRevision;
    await assert.rejects(() => computer.fitnessMorph.evolve([], [0, 0, 0]), /12-1000/);
    await assert.rejects(() => computer.fitnessMorph.evolve(observed('gradient'), [0, Infinity, 0]), /bounded baseline/);
    assert.equal(computer.formations.describe(EVOLVING_FORMATION).activeRevision, version);
    assert.equal((await computer.fitnessMorph.evolutionHistory()).length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
