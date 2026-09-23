import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

const ADDRESS_FIELDS = ['planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base', 'degree', 'minute', 'second', 'arc', 'zodiac', 'house'];

async function bootWithTmpLog() {
  const dir = await mkdtemp(join(tmpdir(), 'computer-stage4a-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  return { runtime, logPath, dir };
}

test('(a) resolveAddress for real birth datum returns 13-field address from the REAL donor provider', async () => {
  const { runtime, dir } = await bootWithTmpLog();
  try {
    const result = await runtime.resolveAddress({ birthDate: '1990-01-01', birthTime: '12:00' });
    assert.equal(Object.keys(result.address).length, 13, 'exactly 13 canonical fields');
    for (const f of ADDRESS_FIELDS) assert.ok(f in result.address, `missing field ${f}`);
    assert.match(result.provider, /back-up-/, 'provider names the donor');
    assert.equal(result.address.planetary, 'Sun');
    assert.equal(result.address.gate, 64, 'Sun gate for 1990-01-01 12:00 UTC per donor HD engine');
    assert.equal(result.address.line, 5);
    assert.equal(result.address.zodiac, 'Capricorn');
    assert.ok(Number.isInteger(result.address.arc) && result.address.arc > 0, 'arc resolved by donor DMS codec');
    assert.ok(Number.isInteger(result.address.house), 'trigram house resolved');
    assert.equal(result.address.dimension, null, 'unknown stays null, never fabricated');
    // real wheel-decode path too
    const fromArc = await runtime.resolveAddress({ arcSecond: 123456 });
    assert.deepEqual(
      [fromArc.address.gate, fromArc.address.line, fromArc.address.color, fromArc.address.tone, fromArc.address.base],
      [7, 1, 4, 3, 5],
    );
    console.log('[a] resolveAddress(1990-01-01 12:00 UTC) =', JSON.stringify(result.address));
    console.log('[a] provider =', result.provider);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('(b) resolveState returns address+state with source_provider naming the donor module', async () => {
  const { runtime, dir } = await bootWithTmpLog();
  try {
    const state = await runtime.resolveState(
      { identity: 'person:test', birthDate: '1990-01-01', birthTime: '12:00' },
      null,
      { stage: '4a-test' },
    );
    assert.equal(state.identity, 'person:test');
    assert.equal(state.address.gate, 64);
    assert.ok(state.active_structures.five_level_state_space, 'five-level state-space mounted');
    assert.equal(Object.keys(state.active_structures.five_level_state_space.dimensions).length, 5);
    assert.equal(state.active_structures.five_level_state_space.dimensions.Being.gate, 64);
    assert.equal(state.active_structures.human_design.type, 'Manifesting Generator');
    assert.match(state.source_provider, /kimi-mesh-state-space/);
    assert.match(state.source_provider, /kimi-human-design/);
    assert.ok(state.confidence.resolved_fields >= 10);
    // unknown path: no datum at all
    const unknown = await runtime.resolveState({ identity: 'person:nodata' });
    assert.equal(unknown.address.gate, null);
    assert.equal(unknown.confidence.level, 'unknown');
    assert.equal(unknown.active_structures, null, 'no fabricated structures');
    console.log('[b] resolveState source_provider =', state.source_provider);
    console.log('[b] confidence =', JSON.stringify(state.confidence));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('(c) emitEvent persists to events.jsonl and survives simulated restart', async () => {
  const { runtime, logPath, dir } = await bootWithTmpLog();
  try {
    const address = (await runtime.resolveAddress({ birthDate: '1990-01-01', birthTime: '12:00' })).address;
    const event = await runtime.emitEvent({
      actor_id: 'person:test',
      actor_type: 'user',
      event_type: 'observation',
      actor_address: address,
      input: { birthDate: '1990-01-01', birthTime: '12:00' },
      address_provider: 'back-up-:kimi-human-design',
      state_provider: 'back-up-:kimi-mesh-state-space',
      result_status: 'success',
      observable_effect: 'address resolved from real birth datum',
      evidence: { kind: 'test_run', ref: 'computer/tests/address-state-mount.test.mjs', summary: 'stage4a emitEvent persistence' },
    });
    assert.ok(event.event_id && event.timestamp && event.trajectory_id);
    // Simulated restart: brand-new runtime over the same log file.
    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    const log = await restarted.eventEmitter.readAll();
    assert.equal(log.length, 1);
    assert.equal(log[0].event_id, event.event_id);
    assert.equal(log[0].actor_address.gate, 64);
    const trace = await restarted.addressService.traceAddressHistory('person:test', { events: log });
    assert.equal(trace.history.length, 1);
    assert.equal(trace.history[0].address.gate, 64);
    console.log('[c] persisted + re-read event', event.event_id, 'trajectory', event.trajectory_id);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('(d) queryCapability lists the donor providers with statuses', async () => {
  const { runtime, dir } = await bootWithTmpLog();
  try {
    const q = runtime.queryCapability('resolve_address');
    assert.equal(q.found, true);
    const ids = q.providers.map((p) => p.provider_id);
    assert.ok(ids.includes('back-up-:execution-spine-canonical-address'));
    assert.ok(ids.includes('back-up-:kimi-dms-codec'));
    assert.ok(['WIRED', 'VERIFIED'].includes(q.providers.find((p) => p.provider_id === 'back-up-:kimi-dms-codec').status));
    const qs = runtime.queryCapability('resolve_state');
    assert.ok(qs.providers.some((p) => p.provider_id === 'back-up-:kimi-mesh-state-space' && ['WIRED', 'VERIFIED'].includes(p.status)));
    const route = runtime.route('resolve_address');
    assert.equal(route.selected_provider, 'back-up-:kimi-dms-codec');
    // evidence enforcement: WIRED/VERIFIED promotions require evidence
    assert.throws(() => runtime.capabilityRegistryService.markStatus('living_loop', 'back-up-:kimi-living-loop', 'WIRED'), /requires verification_evidence/);
    console.log('[d] resolve_address providers =', JSON.stringify(ids));
    console.log('[d] route(resolve_address) ->', route.selected_provider);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
