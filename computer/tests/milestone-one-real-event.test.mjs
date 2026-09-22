/**
 * MILESTONE — one real event through the full automata chain:
 *   EVENT -> ADDRESS RESOLUTION (donor HD+DMS) -> STATE-SPACE (donor 5-level mesh)
 *   -> AUTOMATA ACTIVATION (donor pure-synthia v0.4.0 swarm, REAL processes:
 *      deg-grammar-learner learn + generate) -> ROUTING (swarm capability route)
 *   -> ACTION -> OBSERVABLE RESULT -> CONSUMPTION RECEIPT (result consumed into
 *      StateStore + referenced downstream) -> VERIFICATION -> STATE TRANSITION
 *      -> TRAJECTORY -> restart replay.
 * No mocks anywhere in the chain.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('MILESTONE: one real event through the full chain', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-milestone-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const trajectoryId = 'traj-milestone-one-real-event';

  try {
    // ── EVENT (real user input) ─────────────────────────────────────────────
    const userInput = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      text: 'the event resolves the address',
      utterances: [
        'the event resolves the address',
        'the event resolves the state',
        'the event activates the automaton',
      ],
    };

    // ── ADDRESS RESOLUTION (donor provider) ─────────────────────────────────
    const resolved = await runtime.resolveAddress({ birthDate: userInput.birthDate, birthTime: userInput.birthTime });
    assert.equal(resolved.address.gate, 64);
    assert.equal(resolved.provider, 'back-up-:kimi-human-design');
    t.diagnostic(`ADDRESS: ${JSON.stringify(resolved.address)}`);

    // ── STATE-SPACE (donor 5-level mesh + HD) ───────────────────────────────
    const state0 = await runtime.resolveState(
      { identity: 'user:milestone', birthDate: userInput.birthDate, birthTime: userInput.birthTime },
      null,
      { milestone: true },
    );
    assert.equal(state0.active_structures.five_level_state_space.gate, 64);
    t.diagnostic(`STATE: source_provider=${state0.source_provider}`);

    // observable pre_state snapshot
    const preState = runtime.state.get('milestone.consumption', null);
    assert.equal(preState, null, 'no consumption record before action');

    // ── AUTOMATA ACTIVATION through the gateway (REAL donor processes) ──────
    const snap = await runtime.automataGateway.snapshot();
    assert.ok(snap.processCount >= 20, `donor swarm mounted: ${snap.processCount} processes`);
    t.diagnostic(`SWARM: processCount=${snap.processCount}`);

    // hop 1: grammar.learn — real learning from real utterances
    const learn = await runtime.executeOnSwarm('grammar.learn', { op: 'learn', examples: userInput.utterances }, { taskId: 'milestone-learn' });
    assert.equal(learn.status, 'complete');
    assert.equal(learn.workerId, 'deg-grammar-learner');
    assert.ok(learn.output.ruleCount >= 1, `donor learned ${learn.output.ruleCount} real rules`);
    t.diagnostic(`LEARN: worker=${learn.workerId} rules=${learn.output.ruleCount}`);

    // hop 2: grammar.generate — real generation from the learned grammar
    const gen = await runtime.executeOnSwarm('grammar.generate', { op: 'generate', options: { maxApplications: 3 } }, { taskId: 'milestone-generate' });
    assert.equal(gen.status, 'complete');
    assert.ok(gen.output.graph.nodes.length >= 1);
    assert.ok(gen.output.applications.length >= 1, 'real production-rule applications');
    t.diagnostic(`GENERATE: nodes=${gen.output.graph.nodes.length} applications=${gen.output.applications.length}`);

    // ── CONSUMPTION RECEIPT: the generated graph is actually consumed ───────
    // Consumer 1: append-only StateStore record (observable state change).
    await runtime.state.set('milestone.consumption', {
      consumer: 'computer:milestone-consumer',
      consumed_task: gen.taskId,
      consumed_worker: gen.workerId,
      consumed_output_kind: gen.output.graph.id,
      generated_nodes: gen.output.graph.nodes.map((n) => n.label),
      source_rules: learn.output.rules.map((r) => r.id),
      trajectory_id: trajectoryId,
      at: Date.now(),
    }, { source: 'milestone-consumer' });
    // Consumer 2: the consumed result is referenced by a downstream resolution
    // (the consumption record becomes context for a second resolveState call).
    const postState = runtime.state.get('milestone.consumption');
    assert.ok(postState && postState.consumed_task === gen.taskId, 'consumption receipt persisted');
    const state1 = await runtime.resolveState(
      { identity: 'user:milestone' },
      { event_type: 'user_action', post_state: postState },
      { consumed: postState.consumed_task },
    );
    assert.equal(state1.current_state.post_state.consumed_task, gen.taskId, 'downstream reference to consumed result');

    // ── emitEvent: full grammar-v1 record with providers + trajectory ──────
    const event = await runtime.emitEvent({
      actor_id: 'user:milestone',
      actor_type: 'user',
      target_id: 'automaton:deg-grammar-learner',
      event_type: 'user_action',
      input: userInput,
      actor_address: resolved.address,
      target_address: null, // automaton gate-address not in canonical 13-field form — unknown stays null
      event_address: resolved.address,
      pre_state: { milestone_consumption: preState },
      context: { swarm_process_count: snap.processCount, consumption: postState },
      provider: 'back-up-:pure-synthia-v0.4.0-swarm',
      address_provider: resolved.provider,
      state_provider: state0.source_provider,
      result: {
        learn: { rules: learn.output.ruleCount, worker: learn.workerId },
        generate: { nodes: gen.output.graph.nodes.length, applications: gen.output.applications.length, worker: gen.workerId },
        consumption_receipt: { consumer: postState.consumer, consumed_task: postState.consumed_task },
      },
      result_status: 'success',
      post_state: { milestone_consumption: postState },
      observable_effect: `donor deg-grammar-learner learned ${learn.output.ruleCount} rules and generated a ${gen.output.graph.nodes.length}-node graph; consumed into StateStore milestone.consumption`,
      trajectory_id: trajectoryId,
      evidence: { kind: 'test_run', ref: 'computer/tests/milestone-one-real-event.test.mjs', summary: 'one real event through the full chain with consumption receipt' },
    });
    assert.equal(event.trajectory_id, trajectoryId);
    t.diagnostic(`EVENT: ${event.event_id} persisted, trajectory=${trajectoryId}`);

    // ── RESTART RECOVERY: fresh runtime replays the trajectory ─────────────
    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    const replay = await restarted.eventEmitter.history(trajectoryId);
    assert.equal(replay.length, 1, 'trajectory replayed from append-only log');
    const e = replay[0];
    assert.equal(e.event_id, event.event_id);
    assert.equal(e.actor_address.gate, 64);
    assert.equal(e.result.generate.worker, 'deg-grammar-learner');
    assert.equal(e.result.consumption_receipt.consumed_task, gen.taskId);
    assert.equal(e.result_status, 'success');
    // trajectory is consumable downstream after restart: address history intact
    const trace = await restarted.addressService.traceAddressHistory('user:milestone', { events: replay });
    assert.equal(trace.history.length, 1);
    t.diagnostic(`REPLAY: event ${e.event_id} recovered; consumption receipt intact (task ${e.result.consumption_receipt.consumed_task})`);
    t.diagnostic('MILESTONE COMPLETE: EVENT->ADDRESS->STATE-SPACE->AUTOMATA->ROUTE->ACTION->RESULT->CONSUMPTION->VERIFY->STATE TRANSITION->TRAJECTORY->REPLAY');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
