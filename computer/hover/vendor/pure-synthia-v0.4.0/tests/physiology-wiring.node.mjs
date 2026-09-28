import test from 'node:test';
import assert from 'node:assert/strict';

import { bootstrapCurrentSynthiaSwarm } from '../src/synthia/swarm/bootstrap.mjs';
import { MemoryCheckpointStore } from '../src/synthia/swarm/checkpointStores.mjs';

test('PHYSIOLOGY WIRING: input changes world, hypotheses, metabolism, inner life and chat through separate processes', async () => {
  const store = new MemoryCheckpointStore();
  const { swarm, synthia, physiology } = await bootstrapCurrentSynthiaSwarm({ store });

  assert.equal(swarm.snapshot().groups.physiology, 5);
  for (const id of ['physiology-metabolism','physiology-inner-life','physiology-hypothesis-life','physiology-world-memory','physiology-autonomous-cycle']) {
    assert.ok(swarm.workers.has(id), `${id} must be a separate swarm process`);
  }

  assert.deepEqual(synthia.orchestrator.broker.discover('physiology.context').map((x) => x.id), ['swarm:physiology-autonomous-cycle']);
  assert.deepEqual(synthia.orchestrator.broker.discover('world.activate').map((x) => x.id), ['swarm:physiology-world-memory']);
  assert.deepEqual(synthia.orchestrator.broker.discover('hypothesis.observe').map((x) => x.id), ['swarm:physiology-hypothesis-life']);

  const talked = await synthia.talk('I think Gate 59 connection patterns should be tested and then build from the evidence');
  const context = talked.conversation.sharedContext?.physiology;
  assert.ok(context?.felt?.feltState, 'chat must receive live felt state');
  assert.ok(context?.felt?.dominantWant, 'chat must receive dominant want');
  assert.ok(context?.innerLife?.stage, 'chat must receive inner-life stage');
  assert.match(talked.conversation.woven?.utterance || '', /physiology-felt:/);
  assert.match(talked.conversation.woven?.utterance || '', /physiology-want:/);

  const node59 = physiology.world.node(59);
  assert.equal(node59.visited, true, 'explicit Gate 59 input must change Gate 59 world memory');
  assert.ok(node59.visitCount >= 1);
  assert.ok(physiology.hypotheses.state.gateRecords[59]?.count >= 1, 'WORLD Gate 59 must remain Gate 59 when observed');
  assert.ok(physiology.hypotheses.state.hypotheses.some((h) => /gate 59 connection patterns/i.test(h.statement)), 'conversation hypothesis must enter hypothesis life');
  assert.ok(physiology.metabolism.state.steps >= 1, 'metabolism must actually step from the same input');
  assert.ok(physiology.innerLife.state.goals.some((g) => g.id === 'g_hex'), 'inner life must be active, not just mounted');

  const cycle = physiology.tick();
  assert.ok(cycle.felt?.feltState);
  assert.equal(physiology.autonomous.state.cycle, 1);

  await swarm.checkpoint('physiology-regression');
  const before = {
    worldVisits: physiology.world.node(59).visitCount,
    observations: physiology.hypotheses.state.observations.length,
    metabolismSteps: physiology.metabolism.state.steps,
    stage: physiology.innerLife.state.stage,
  };

  const second = await bootstrapCurrentSynthiaSwarm({ store });
  assert.equal(second.physiology.world.node(59).visitCount, before.worldVisits);
  assert.equal(second.physiology.hypotheses.state.observations.length, before.observations);
  assert.equal(second.physiology.metabolism.state.steps, before.metabolismSteps);
  assert.equal(second.physiology.innerLife.state.stage, before.stage);
});
