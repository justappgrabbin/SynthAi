import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { MobileComputerRuntime } from '../mobile/MobileComputerRuntime.mjs';

test('LegacyBuild TaskFit donor is a deterministic Computer mesh service', async () => {
  const runtime = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace: `task-fit-${Date.now()}`,
  }).boot();

  assert.ok(runtime.services.get('task-fit')?.provider);
  assert.equal(runtime.meshKernel.participant('system:task-fit')?.residency, 'active');
  assert.ok(runtime.capabilityRegistry.has('task-fit-matchmaking'));

  const task = {
    title: 'Build the world adapter',
    required_axes: [
      { axis: ['C'], weight: 0.7 },
      { axis: ['O'], weight: 0.3 },
    ],
    ring_bias: ['Builder'],
    gate_affinity: [16],
    sun_gate_boost: true,
  };

  const candidates = [
    { id: 'alpha', gate: 16, ring: 'Builder', level: 3, copnhfe: { C: 90, O: 85 } },
    { id: 'beta', gate: 5, ring: 'Observer', level: 3, copnhfe: { C: 45, O: 50 } },
  ];

  const first = await runtime.rankTaskFitCandidates({ task, candidates, sunGate: 16 });
  const second = await runtime.rankTaskFitCandidates({ task, candidates, sunGate: 16 });

  assert.deepEqual(second, first, 'same task and candidates must produce the same ranking');
  assert.equal(first.ranked[0].candidateId, 'alpha');
  assert.ok(first.ranked[0].fit > first.ranked[1].fit);
  assert.equal(first.ranked[0].donor.source, 'LegacyBuild/attached_assets/SynthUniverse/server/services/taskfit.ts');
});

test('TaskFit preserves the donor weighted-axis score without fabricated context', async () => {
  const runtime = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace: `task-fit-formula-${Date.now()}`,
  }).boot();

  const result = await runtime.scoreTaskFit({
    task: { required_axes: [{ axis: ['C'], weight: 1 }] },
    participants: [{ id: 'p1', copnhfe: { C: 80 } }],
    sunGate: 16,
  });

  assert.equal(result.fit, 80);
  assert.equal(result.tier, 'A');
  assert.equal(result.score.ringBonus, 0);
  assert.equal(result.score.gateBonus, 0);
  assert.equal(result.score.sunBonus, 0);
});
