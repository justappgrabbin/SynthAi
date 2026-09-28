import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthiaAutomata } from '../vendor/execution-spine-v0.4.0/src/pure-synthia/engine/synthia.js';
import { IntegratedSynthiaSystem } from '../src/index.mjs';

const makeSystem = (options = {}) => new IntegratedSynthiaSystem({ engine: new SynthiaAutomata(), ...options });

test('six intent signatures select six distinct configurations and become scientist hypotheses', async () => {
  const system = makeSystem();
  const cases = [
    ['hello there', 'communicate'],
    [{ name: 'x.json', content: '{"x":1}' }, 'compute'],
    ['compose a red blue structure', 'compose_structure'],
    ['reframe this from another perspective', 'reframe'],
    ['modify this external grammar', 'modify'],
    ['recover from this failure', 'resolve_error'],
  ];
  const configurations = new Set();
  for (const [task, intentType] of cases) {
    const record = await system.route(task, { personId: 'intent-test', intentType });
    assert.equal(record.intentType, intentType);
    assert.ok(record.routingUpdate.trajectory.length > 1);
    assert.ok(record.routingUpdate.dominantVariant);
    configurations.add(record.pipeline.join('>'));
  }
  assert.equal(configurations.size, 6);
  assert.ok(system.scientist.dashboard().questions >= 6);
  assert.ok(system.intentOrchestrator.routingWeights.has('intent-test'));
});

test('success feedback drifts variants and stores reversible routing preferences', async () => {
  const system = makeSystem({ successInterval: 10 });
  let result;
  for (let index = 0; index < 10; index++) {
    result = await system.successFeedback.observe({
      personId: 'feedback-test',
      indicatorId: 'task_completion',
      score: 1 - index / 10,
      pipeline: [`pipeline-${index % 2}`],
    });
  }
  assert.equal(result.optimized.progress.direction, 'away');
  assert.ok(result.optimized.monteCarlo.trajectory.length > 1);
  assert.ok(system.editor.rules.has('o_sequence:evolved'));
  assert.ok(system.intentOrchestrator.routingWeights.has('feedback-test'));
  assert.equal(result.optimized.routingProposal.status, 'executed');
  assert.equal(system.proposals.rollback(result.optimized.routingProposal.id).rolledBack, true);
  assert.equal(system.intentOrchestrator.routingWeights.has('feedback-test'), false);
});

test('three recurring overlapping gaps synthesize, validate, and mount a real automaton', async () => {
  const system = makeSystem();
  for (let index = 1; index <= 3; index++) {
    system.intent.gaps.push({
      id: `synthetic-gap-${index}`,
      intentType: 'compute',
      gapType: 'missing_tool',
      missing: ['unmounted-capability'],
      request: `handle recurring case ${index}`,
    });
  }
  const before = system.mesh.automata.size;
  const result = await system.toolSynthesizer.checkTrigger({ intentType: 'compute' });
  assert.equal(result.triggered, true);
  assert.equal(result.validated, true);
  assert.equal(result.passed, 3);
  assert.equal(result.validationRuns.length, 3);
  assert.ok(result.validationRuns.every((run) => run.executed && run.executable));
  assert.ok(result.validationRuns.every((run) => run.capabilityCoverage.includes('unmounted-capability')));
  assert.equal(system.mesh.automata.size, before + 1);
  assert.ok(result.mounted.automaton.id.startsWith('synthesized-compute-'));
  assert.equal(result.outboxProposal.status, 'executed');
  assert.equal(system.proposals.rollback(result.outboxProposal.id).rolledBack, true);
  assert.equal(system.mesh.automata.size, before);
});

test('user proposals wait for consent; edits roll back; deletion rules are enforced', async () => {
  const system = makeSystem();
  const observation = await system.observation.watch({
    personId: 'consent-test',
    targetScope: 'user',
    chartState: { gate: 10, line: 5, definedGates: [10] },
    successSignal: { indicatorId: 'engagement', direction: 'away', rate: 0.2 },
    confidence: 0.8,
  });
  assert.equal(observation.proposal.status, 'pending');
  assert.equal(system.editor.edits.length, 0);
  assert.equal(system.proposals.accept(observation.proposal.id, { actor: 'self' }).reason, 'explicit_user_acceptance_required');
  const accepted = system.proposals.accept(observation.proposal.id, { actor: 'user' });
  assert.equal(accepted.executed, true);
  const rollback = system.proposals.rollback(observation.proposal.id);
  assert.equal(rollback.rolledBack, true);
  assert.equal(system.proposals.get(observation.proposal.id).status, 'rolled_back');
  assert.equal(system.deletionGuard.check({ target: 'conversation', flow: 'user' }).rule, 1);
  assert.equal(system.proposals.audit().deletedEntries, 0);
});

test('young synthesized deletion is autonomous, old deletion is consent-gated, and both remain auditable', async () => {
  const system = makeSystem();
  system.growAgent({
    purpose: 'temporary synthesized hand',
    input: 'temporary',
    dimension: 'Evolution',
    gate: 3,
    capabilities: ['temporary'],
    forcedId: 'young-synthesized-hand',
    implementation: () => ({ ok: true }),
  });
  const young = await system.observation.watch({
    targetScope: 'self',
    confidence: 0.8,
    proposedChange: {
      kind: 'deletion',
      description: 'Deactivate refuted young synthesized hand',
      target: 'young-synthesized-hand',
      editType: 'delete',
      spec: { origin: 'ToolSynthesizer', createdAt: system.proposals.sequence, scientistStatus: 'refuted' },
    },
  });
  assert.equal(young.proposal.flow, 'self');
  assert.equal(young.proposal.status, 'executed');
  assert.equal(system.instrument('young-synthesized-hand'), null);
  assert.equal(system.proposals.rollback(young.proposal.id).rolledBack, true);
  assert.ok(system.instrument('young-synthesized-hand'));

  system.growAgent({
    purpose: 'mature synthesized hand',
    input: 'mature',
    dimension: 'Evolution',
    gate: 4,
    capabilities: ['mature'],
    forcedId: 'mature-synthesized-hand',
    implementation: () => ({ ok: true }),
  });
  const mature = await system.observation.watch({
    personId: 'owner',
    targetScope: 'self',
    confidence: 0.9,
    proposedChange: {
      kind: 'deletion',
      description: 'Propose deactivating mature hand',
      target: 'mature-synthesized-hand',
      editType: 'delete',
      spec: { origin: 'ToolSynthesizer', createdAt: -100, editHistory: ['created', 'validated'] },
    },
  });
  assert.equal(mature.proposal.flow, 'user');
  assert.equal(mature.proposal.status, 'pending');
  assert.ok(system.instrument('mature-synthesized-hand'));
  assert.equal(system.proposals.accept(mature.proposal.id, { actor: 'self' }).reason, 'explicit_user_acceptance_required');
  assert.equal(system.proposals.accept(mature.proposal.id, { actor: 'user' }).executed, true);
  assert.equal(system.instrument('mature-synthesized-hand'), null);
  assert.equal(system.proposals.audit().deletedEntries, 0);
});

test('young synthesized deletion remains blocked without refuted scientist evidence', () => {
  const system = makeSystem();
  const review = system.deletionGuard.check({
    target: 'unrefuted-young-tool',
    origin: 'ToolSynthesizer',
    createdAt: 0,
    currentSequence: 1,
    flow: 'self',
  });
  assert.equal(review.rule, 2);
  assert.equal(review.permitted, false);
  assert.match(review.reason, /refuted ScientistLoop/);
});

test('canonical deletion is blocked before proposal creation and dismissals respect cooldown', async () => {
  const system = makeSystem();
  const forbidden = await system.observation.watch({
    personId: 'owner',
    targetScope: 'user',
    confidence: 1,
    proposedChange: {
      kind: 'deletion',
      description: 'Attempt canonical deletion',
      target: 'conversation',
      editType: 'delete',
      spec: { origin: 'external', createdAt: -100 },
    },
  });
  assert.equal(forbidden.generated, false);
  assert.equal(forbidden.guard.rule, 1);

  const observation = {
    personId: 'cooldown-person',
    targetScope: 'user',
    chartState: { gate: 10, line: 5, definedGates: [10] },
    successSignal: { indicatorId: 'engagement', direction: 'toward', rate: 0.4 },
    confidence: 0.8,
  };
  const first = await system.observation.watch(observation);
  assert.equal(system.proposals.dismiss(first.proposal.id, 'not wanted now', { actor: 'user' }).dismissed, true);
  const repeated = await system.observation.watch(observation);
  assert.equal(repeated.generated, false);
  assert.equal(repeated.reason, 'dismissal_cooldown');
  assert.equal(system.proposals.get(first.proposal.id).status, 'dismissed');
});

test('low-confidence conflict timing stages a proposal until chart timing clears', async () => {
  const system = makeSystem();
  const held = await system.observation.watch({
    personId: 'timing-person',
    targetScope: 'user',
    chartState: { gate: 12, line: 5, definedGates: [12], definitionConflict: true, nextClearTransitAt: 'sequence:next' },
    successSignal: { indicatorId: 'engagement', direction: 'away', rate: -0.2 },
    confidence: 0.8,
  });
  assert.equal(held.staged, true);
  assert.equal(system.proposals.pending('user', 'timing-person').length, 0);
  const flushed = await system.observation.flushStaging({ gate: 12, line: 5, definedGates: [12], definitionConflict: false });
  assert.equal(flushed.moved.length, 1);
  assert.equal(system.proposals.pending('user', 'timing-person').length, 1);
});
