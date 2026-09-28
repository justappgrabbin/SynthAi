import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CANONICAL_MORPH_CANON,
  DEEP_SURFACE_MORPH_PIPELINE,
  createDeepSurfaceMorphAdapter,
} from '../src/index.mjs';
import { configuredSynthia } from './helpers.mjs';

const canonicalFields = [
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arc', 'zodiac', 'house',
];

const surface = (name, offset = 0) => ({
  name,
  width: 256,
  height: 320,
  landmarks: {
    head: [128 + offset, 56],
    neck: [128 + offset, 92],
    torso: [128 + offset, 150],
  },
});

test('canonical morph packet preserves the complete Synthia state and carries relationship, temporal, mesh, and perception fields', async (t) => {
  const fixture = await configuredSynthia('morph-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;

  await synthia.chat('establish morph state', { personId: 'morph-person' });

  const relation = synthia.semanticGenome.relate(27, 50, 'morph relationship', {
    agentId: 'synthia',
    personId: 'morph-person',
    address: {
      planetary: 1, dimension: 'Being', line: 2,
      color: 3, tone: 4, base: 2,
      degree: 10, minute: 20, second: 30,
      arc: 3, zodiac: 6, house: 7,
    },
    leftAddress: { line: 2, color: 3, tone: 4, base: 2 },
    rightAddress: { line: 5, color: 6, tone: 1, base: 4 },
  });
  await synthia.dnaPerception.flush();

  const past = await synthia.visitPast({
    personId: 'morph-person',
    date: '1990-09-18',
    time: '21:34:00',
    place: {
      label: 'San Francisco, California',
      latitude: 37.7749,
      longitude: -122.4194,
      timeZone: 'America/Los_Angeles',
    },
    dimension: 'Being',
    planetary: 1,
  });
  const superposition = synthia.superimposePast({
    personId: 'morph-person',
    coordinates: [past.coordinate],
  });
  const meshEvidence = synthia.temporalMesh({ coordinate: past.coordinate, targetAddress: past.address });

  const packet = synthia.morphState({
    superposition,
    meshEvidence,
    environment: { world: 'cat-world' },
    sourceSurface: surface('current'),
    targetSurface: surface('target', 4),
  }, { personId: 'morph-person', agentId: 'synthia' });

  assert.deepEqual(CANONICAL_MORPH_CANON.addressOrder, canonicalFields);
  assert.deepEqual(Object.keys(packet.current.address), canonicalFields);
  const latest = synthia.semanticGenome.history.at(-1);
  assert.deepEqual(packet.current.address, latest.address);
  assert.equal(packet.current.stateId, latest.resolvedState.stateId);
  assert.equal(packet.relationship.relationshipId, relation.relationshipState.relationshipId);
  assert.equal(packet.relationship.channel.channelId, '27-50');
  assert.equal(packet.relationship.channel.operator, 'AND');
  assert.equal(packet.temporal.id, superposition.id);
  assert.equal(packet.temporal.componentsRemainDistinct, true);
  assert.equal(packet.temporal.historical.length, 1);
  assert.equal(packet.mesh.coordinateKey, meshEvidence.coordinateKey);
  assert.equal(packet.renderReady, true);
  assert.equal(packet.renderer.type, 'deep-surface-landmark-transition');
  assert.deepEqual(packet.surfaces.source.landmarkNames, ['head', 'neck', 'torso']);
  assert.deepEqual(packet.surfaces.target.landmarkNames, ['head', 'neck', 'torso']);
});

test('canonical morph execution hands the preserved packet to the attached renderer without substituting a reduced state', async (t) => {
  let seen = null;
  const renderer = {
    id: 'mock-deep-surface',
    async morph(input) {
      seen = input;
      return { adapterId: this.id, frames: [{ id: 0 }, { id: 1 }], report: { score: 1 } };
    },
  };
  const fixture = await configuredSynthia('morph-render-person', { morphRenderer: renderer });
  t.after(fixture.cleanup);
  const { synthia } = fixture;
  await synthia.chat('renderable morph state', { personId: 'morph-render-person' });

  const source = surface('source');
  const target = surface('target', 6);

  const result = await synthia.embodimentMorph({
    sourceSurface: source,
    targetSurface: target,
    environment: { sceneId: 'test-scene' },
  }, { personId: 'morph-render-person', agentId: 'synthia' });

  assert.equal(result.status, 'RENDERED');
  assert.ok(seen.packet.id);
  assert.deepEqual(Object.keys(seen.packet.current.address), canonicalFields);
  assert.equal(seen.sourceSurface, source);
  assert.equal(seen.targetSurface, target);
  assert.equal(result.renderResult.frames.length, 2);
  assert.equal(synthia.canonicalMorph.snapshot().preparedOrRendered >= 1, true);
});

test('deep surface adapter preserves the donor pipeline contract and passes the canonical packet id into the rendered transition', async () => {
  const calls = [];
  const mockEngine = {
    registerState(state) { calls.push(['register', state.name]); return state; },
    morph(a, b, options) {
      calls.push(['morph', a.name, b.name, options.frames]);
      return { frames: [1, 2, 3], edge: { from: a.name, to: b.name }, report: { score: 0.9 } };
    },
  };
  const adapter = createDeepSurfaceMorphAdapter({ engine: mockEngine });
  assert.deepEqual(adapter.pipeline, DEEP_SURFACE_MORPH_PIPELINE);
  const output = await adapter.morph({
    packet: { id: 'canonical-morph:test' },
    sourceSurface: surface('a'),
    targetSurface: surface('b'),
    options: { frames: 1 },
  });
  assert.equal(output.canonicalMorphPacketId, 'canonical-morph:test');
  assert.deepEqual(calls, [['register', 'a'], ['register', 'b'], ['morph', 'a', 'b', 1]]);

  const donor = await readFile(new URL('../src/morph/browser/vendor/deep-surface-morph.js', import.meta.url), 'utf8');
  for (const stage of DEEP_SURFACE_MORPH_PIPELINE) assert.match(donor, new RegExp(stage));
});
