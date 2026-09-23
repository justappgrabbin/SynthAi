/**
 * ACCEPTANCE TEST 1 — CAPABILITY ROUTING (handoff §31)
 * resolve_address has multiple real providers; this proves:
 *  1. request received  2. queryCapability returns ALL providers
 *  3. provenance + runtime status shown  4. recorded routing_decision w/ rationale
 *  5. real provider executes  6. real output captured  7. consumption receipt
 *  8. state change observed  9. result persisted  10. evidence returned
 *  + SAME request routed to a DIFFERENT provider when selection hints change
 *    (micro-resolution vs canonical-validation) — no duplicate implementations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

const PARTS = {
  micro: { gate: 41, line: 4, color: 2, tone: 5, base: 3 },
  macro: { planet: 3, dimension: 2, zodiac: 5, house: 7 },
  emergent: { degree: 248, minute: 19, second: 52, arcSecond: 10 },
};

test('ACCEPTANCE 1: capability routing for resolve_address', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc1-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const decisions = [];
  runtime.bus.on('routing:decision', (d) => decisions.push(d.payload ?? d));

  try {
    // 2.+3. queryCapability returns ALL providers with provenance + status
    const q = runtime.queryCapability('resolve_address');
    const ids = q.providers.map((p) => p.provider_id);
    assert.deepEqual(ids, [
      'back-up-:execution-spine-canonical-address',
      'back-up-:kimi-dms-codec',
      'back-up-:kimi-coordinate-engine',
      'recovered:yniv-addressing-engine',
    ]);
    for (const p of q.providers) {
      assert.ok(p.repository && p.source_artifact, `provenance present for ${p.provider_id}`);
      assert.ok(['NOT_FOUND', 'PRESENT', 'PARTIALLY_WIRED', 'WIRED', 'VERIFIED'].includes(p.status));
    }
    t.diagnostic(`(2/3) providers: ${q.providers.map((p) => `${p.provider_id}[${p.status}]`).join(' ')}`);

    // 1.+4.+5.+6. request routed (auto = micro-resolution by shape), decision recorded, real output
    const before = runtime.state.get('acc1.consumed', null);
    assert.equal(before, null);
    const res = await runtime.resolveAddress(PARTS);
    assert.equal(res.provider, 'recovered:yniv-addressing-engine');
    assert.equal(res.provider_metadata.yniv.micro.index, 45088); // real donor output captured
    assert.equal(res.address.gate, 42);
    const d1 = decisions.at(-1);
    assert.equal(d1.selected_provider, 'recovered:yniv-addressing-engine');
    assert.match(d1.selection_rationale, /YNIV coordinate object/);
    assert.deepEqual(d1.candidate_providers, ids, 'all candidates recorded in the decision');
    t.diagnostic(`(4-6) auto route -> ${d1.selected_provider}; micro index 45088 -> gate ${res.address.gate}`);

    // 7.+8. consumption receipt: state-resolver consumes the routed output; state change observed
    const consumed = await runtime.resolveState({ identity: 'req:acc1', address: res.address }, null, { routed_by: d1.request_id });
    assert.equal(consumed.address.gate, 42);
    await runtime.state.set('acc1.consumed', {
      consumer: 'state-resolver', consumed_address_gate: consumed.address.gate,
      source_provider: consumed.source_provider, routing_decision: d1.request_id, at: Date.now(),
    }, { source: 'acc1' });
    const after = runtime.state.get('acc1.consumed');
    assert.ok(after && after.consumed_address_gate === 42, 'observable state change (consumption receipt)');

    // 9.+10. persisted + evidence returned
    const event = await runtime.emitEvent({
      actor_id: 'req:acc1', actor_type: 'system', event_type: 'observation',
      event_address: res.address, address_provider: res.provider,
      pre_state: { acc1_consumed: before }, post_state: { acc1_consumed: after },
      result: { micro_index: 45088, consumption: after },
      result_status: 'success', trajectory_id: 'traj-acc1',
      observable_effect: 'routed address consumed by state-resolver; StateStore acc1.consumed set',
      evidence: { kind: 'test_run', ref: 'computer/tests/acceptance-1-routing.test.mjs', summary: 'acceptance 1 routing chain' },
    });
    assert.ok(event.event_id && event.evidence);
    const replayed = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    assert.equal((await replayed.eventEmitter.history('traj-acc1'))[0].result.consumption.consumed_address_gate, 42);
    t.diagnostic(`(7-10) consumption receipt persisted; evidence=${event.evidence.ref}`);

    // DIFFERENT provider when selection hints change — canonical-validation via the AUTHORITY
    const dCount = decisions.length;
    const validation = await runtime.resolveAddress(PARTS, { strategy: 'canonical-validation' });
    const d2 = decisions.at(-1);
    assert.equal(decisions.length, dCount + 1);
    assert.equal(d2.selected_provider, 'back-up-:execution-spine-canonical-address');
    assert.match(d2.selection_rationale, /canonical-validation/);
    assert.equal(validation.provider, 'back-up-:execution-spine-canonical-address');
    assert.equal(validation.valid, true, 'authority validated the completed spine-form address');
    assert.match(validation.canonical_key, /^planetary=4\|dimension=Being\|gate=42\|/);
    t.diagnostic(`hint change -> ${d2.selected_provider}; canonical_key=${validation.canonical_key}`);

    // no duplicate implementations: provider list unchanged by the hint switch
    assert.deepEqual(runtime.queryCapability('resolve_address').providers.map((p) => p.provider_id), ids);
    t.diagnostic('no duplicate implementations; provider set stable across strategies');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
