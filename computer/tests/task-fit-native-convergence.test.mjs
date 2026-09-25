import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

const task = {
  title: 'Deterministic convergence fixture',
  required_axes: [{ axis: ['logic'], weight: 0.7 }],
  ring_bias: ['builder'],
  gate_affinity: [16],
  min_sprites: 1,
};

const candidates = [
  { id: 'beta', vector: { logic: 50 }, ring: 'observer', gate: 1, level: 2 },
  { id: 'alpha', vector: { logic: 100 }, ring: 'builder', gate: 16, level: 3 },
];

test('TASKFIT CONVERGENCE: native mesh exposes deterministic score and rank operations', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'task-fit-native-convergence',
    clock: () => 1000,
  }).boot();

  const participant = runtime.meshKernel.participant('system:task-fit');
  assert.equal(participant.residency, 'active');
  assert.deepEqual(participant.capabilities, ['task-fit.score', 'task-fit.rank']);

  const first = await runtime.rankTaskFitCandidates({ task, candidates });
  const second = await runtime.rankTaskFitCandidates({ task, candidates });
  assert.deepEqual(second, first);
  assert.equal(first.ranked[0].candidateId, 'alpha');
  assert.equal(first.ranked[0].fit, 88);
  assert.equal(first.ranked[0].donor.source, 'LegacyBuild/attached_assets/SynthUniverse/server/services/taskfit.ts');

  const score = await runtime.scoreTaskFit({
    task: { required_axes: [{ axis: ['logic'], weight: 1 }] },
    participants: [{ id: 'exact', vector: { logic: 80 } }],
  });
  assert.equal(score.fit, 80);
  assert.equal(score.tier, 'A');
});
