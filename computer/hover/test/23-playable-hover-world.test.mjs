import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  cameraStep, direction, worldToScreen, screenToWorld,
  nearestReachable, nextForm, FORM_NAMES, recordSnapshot, restoreSnapshot
} from '../ui/you-n-i-verse/character-world.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const world = () => ({
  selectedId: 'chair',
  agents: [{ id: 'agent-a', player: true, position: { x: -2, z: 1 }, target: { x: -2, z: 1 } }],
  objects: [{ id: 'chair', x: -1, z: 1, morphState: 1, sy: 1, removed: false }],
  visibleObjects() { return this.objects.filter(object => !object.removed); },
  entity(id) { return this.objects.find(o => o.id === id); },
  select(id) { this.selectedId = id; },
  worldLedger: [{ type: 'MORPH', text: 'Chair morphed' }]
});

test('camera follows character smoothly and can remain fixed', () => {
  let camera = { x: 0, z: 0 };
  for (let i = 0; i < 100; i++) camera = cameraStep(camera, { x: 3, z: -2 }, true, 1 / 60);
  assert.ok(Math.abs(camera.x - 3) < .01);
  assert.ok(Math.abs(camera.z + 2) < .01);
  const fixed = cameraStep(camera, { x: 3, z: -2 }, false, 1 / 60);
  assert.ok(fixed.x < camera.x);
  const pos = worldToScreen(2, -1, camera, 400, 700, 50);
  const inverse = screenToWorld(pos.x, pos.y, camera, 400, 700, 50);
  assert.ok(Math.abs(inverse.x - 2) < 1e-9);
  assert.ok(Math.abs(inverse.z + 1) < 1e-9);
});

test('touch and keyboard directions are normalized, forms cycle', () => {
  const diagonal = direction({ up: true, right: true });
  assert.ok(Math.abs(Math.hypot(diagonal.dx, diagonal.dz) - 1) < 1e-12);
  assert.deepEqual(direction({}), { dx: 0, dz: 0 });
  assert.equal(nextForm(FORM_NAMES.length - 1), 0);
});

test('object interaction is proximity gated', () => {
  const w = world();
  assert.equal(nearestReachable(w)?.id, 'chair');
  w.agents[0].position.x = 3;
  assert.equal(nearestReachable(w), null);
});

test('world position, morph state and avatar form survive a local checkpoint', () => {
  const w = world();
  const snapshot = recordSnapshot(w, 2, true, true);
  const restoredWorld = world();
  restoredWorld.agents[0].position.x = 0;
  restoredWorld.objects[0].morphState = 0;
  const ui = restoreSnapshot(restoredWorld, snapshot);
  assert.equal(ui.formIndex, 2);
  assert.equal(restoredWorld.agents[0].position.x, -2);
  assert.equal(restoredWorld.objects[0].morphState, 1);
  assert.equal(restoreSnapshot(restoredWorld, { version: 1, player: { x: NaN, z: 0 } }), null);
});

test('Hover World screen has all live controls and no blocking static guide', async () => {
  const html = await readFile(join(root, 'ui/you-n-i-verse/world.html'), 'utf8');
  const css = await readFile(join(root, 'ui/you-n-i-verse/world.css'), 'utf8');
  const play = await readFile(join(root, 'ui/you-n-i-verse/world-play.mjs'), 'utf8');
  const ui = await readFile(join(root, 'ui/you-n-i-verse/world-ui.mjs'), 'utf8');
  assert.match(html, /id="play-world"/);
  for (const id of ['btn-form', 'btn-interact', 'btn-morph-prop', 'btn-follow', 'btn-companion', 'btn-save', 'export']) assert.ok(html.includes('id="' + id + '"'), id);
  assert.match(play, /new Simulator\(/);
  assert.match(play, /world\.movePlayer\(/);
  assert.match(play, /world\.morphSelected\(/);
  assert.match(play, /requestAnimationFrame\(/);
  assert.match(css, /touch-action:none/);
  assert.match(ui, /runSlice\(world\)/);
});
