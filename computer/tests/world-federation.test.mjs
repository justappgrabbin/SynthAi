import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { WorldFederation } from '../worlds/world-federation.mjs';

test('WORLD FEDERATION: canonical roles share one relational mesh without collapsing responsibilities', async () => {
  const bus = new EventBus();
  const state = new StateStore({ bus, persistence: new MemoryPersistence(), namespace: 'world-federation-test' });
  await state.restore();
  const mesh = await new RelationalMeshKernel({ state, bus }).boot();
  const worlds = new WorldFederation({ state, bus, mesh });
  await worlds.seedCanonicalLayers();

  assert.equal(worlds.layer('reality:consciousness-realm').role, 'home');
  assert.equal(worlds.layer('mechanics:human-agent').role, 'mechanics');
  assert.equal(worlds.layer('lab:triform').role, 'diagnostic');
  assert.equal(worlds.layer('lab:stellar').role, 'research');
  assert.ok(mesh.relationshipsFor('reality:consciousness-realm').some(edge => edge.type === 'uses-mechanics'));
  assert.ok(mesh.relationshipsFor('lab:stellar').some(edge => edge.type === 'observes'));
});
