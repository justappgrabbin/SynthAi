import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { DormantCompilerBroker } from '../runtime/dormant-compiler.mjs';
import { IndiVerseRuntime } from '../worlds/indiverse.mjs';
import { ResidentHost } from '../runtime/resident-host.mjs';

async function makeState(namespace='resident-mesh-test') {
  const bus = new EventBus();
  const state = new StateStore({ bus, persistence: new MemoryPersistence(), namespace });
  await state.restore();
  return { bus, state };
}

test('RESIDENT MESH: dormant agent remains publicly addressable and replays queued events', async () => {
  const { bus, state } = await makeState('mesh-dormancy');
  let now = 1000;
  const mesh = await new RelationalMeshKernel({ state, bus, clock: () => now }).boot();

  await mesh.registerParticipant('synthia', { publicState: { location: 'plaza' } });
  await mesh.sleepParticipant('synthia', { memory: 'checkpoint' });
  assert.equal(mesh.resolvePresence('synthia').residency, 'dormant');

  now = 61000;
  await mesh.queueEvent('synthia', { sourceId: 'nearby-user', type: 'conversation', payload: { text: 'hi' } });
  const wake = await mesh.wakeParticipant('synthia', {
    replay: async event => ({ accepted: event.type === 'conversation' }),
  });

  assert.equal(wake.elapsedMs, 60000);
  assert.equal(wake.receipts.length, 1);
  assert.equal(mesh.pendingEvents('synthia').length, 0);
});

test('DORMANT COMPILER: unchanged source reuses compiled artifact and changed source recompiles', async () => {
  const { bus, state } = await makeState('compiler-cache');
  let builds = 0;
  const compiler = new DormantCompilerBroker({ state, bus }).attachCompiler({
    id: 'termux-derived-test',
    async compile(spec) {
      builds += 1;
      return { artifactHash: `artifact-${spec.sourceHash}`, target: 'wasm' };
    },
  });

  const first = await compiler.ensure({ id: 'hand:file', sourceHash: 'aaa', target: 'wasm' });
  const second = await compiler.ensure({ id: 'hand:file', sourceHash: 'aaa', target: 'wasm' });
  const changed = await compiler.ensure({ id: 'hand:file', sourceHash: 'bbb', target: 'wasm' });

  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(changed.reused, false);
  assert.equal(builds, 2);
  assert.equal(compiler.snapshot().lifecycle.state, 'dormant');
});

test('INDIVERSE: canonical house stays invariant while host grammar changes expression and visitor affordance', async () => {
  const { bus, state } = await makeState('indiverse');
  const mesh = await new RelationalMeshKernel({ state, bus }).boot();
  const indiverse = new IndiVerseRuntime({ state, bus, mesh });

  await indiverse.registerCanonicalObject({
    id: 'house:1',
    kind: 'house',
    function: 'residence',
    entryPoints: [{ id: 'front' }],
    presentation: { color: 'white', material: 'wood', orientation: { roof: 'up' }, scale: 1 },
  });

  await indiverse.createWorld('host', {
    id: 'indiverse:host',
    grammar: {
      colors: { house: 'bubblegum-pink' },
      materials: { house: 'bubblegum' },
      orientation: { house: { roof: 'floor-plane' } },
      thresholds: {
        house: {
          requires: ['vertical-access'],
          alternatives: { 'vertical-access': { capability: 'grappling-hook', mode: 'tool' } },
        },
      },
    },
  });

  const shared = indiverse.renderShared('house:1');
  const host = indiverse.renderInWorld('indiverse:host', 'house:1');
  const visitor = indiverse.visitorContract({
    worldId: 'indiverse:host',
    objectId: 'house:1',
    visitor: { identity: { id: 'visitor' }, capabilities: [] },
  });

  assert.equal(shared.canonical.function, 'residence');
  assert.equal(host.canonical.function, 'residence');
  assert.equal(host.expression.orientation.roof, 'floor-plane');
  assert.equal(host.expression.material, 'bubblegum');
  assert.deepEqual(visitor.identityInvariant, { id: 'visitor' });
  assert.deepEqual(visitor.missingAffordances, ['vertical-access']);
  assert.equal(visitor.suggestedAdaptations[0].capability, 'grappling-hook');
});

test('RESIDENT HOST: 5.7-shaped world port sleeps without deleting mesh presence and reconnects on wake', async () => {
  const { bus, state } = await makeState('resident-host');
  let now = 10;
  const mesh = await new RelationalMeshKernel({ state, bus, clock: () => now }).boot();

  const port = {
    adapter: null,
    hydrated: null,
    attach(adapter) { this.adapter = adapter; return { connected: true, adapterId: adapter.id }; },
    detach() { this.adapter = null; },
    observe(event) { return event; },
    async act(action) { return this.adapter.applyAction(action); },
    async pull() { return { connected: Boolean(this.adapter), externalSnapshot: await this.adapter?.snapshot?.() }; },
    hydrate(state) { this.hydrated = state; return state; },
  };

  const host = new ResidentHost({ state, bus, mesh, clock: () => now });
  await host.registerResident('synthia', { runtime: { worldPort: port }, publicState: { name: 'Synthia' } });
  await host.registerWorld('reality:home', {
    id: 'home',
    async snapshot() { return { day: 1 }; },
    async applyAction(action) { return { ok: true, action }; },
  });

  await host.enterWorld('synthia', 'reality:home');
  await host.sleep('synthia', { physiology: { coherence: 0.8 } });

  assert.equal(mesh.resolvePresence('synthia').publicState.name, 'Synthia');
  assert.equal(mesh.resolvePresence('synthia').residency, 'dormant');

  now = 1010;
  const wake = await host.wake('synthia');
  assert.equal(wake.elapsedMs, 1000);
  assert.equal(port.adapter.id, 'home');
});
