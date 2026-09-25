import assert from 'node:assert/strict';
import { FederatedSynthia } from '../vendor/synthia-v0.5.7/src/index.mjs';

const actions = [];
let snapshot = {
  sceneId: 'consciousness-realm',
  time: { day: 1, hour: 8, minute: 0 },
  agents: [{ id: 'realm-agent-1', name: 'Alex' }],
  places: [{ id: 'integration', name: 'Integration Core' }],
  kernel: { consciousnessLevel: 1, activeGates: [10] },
};

const adapter = {
  id: 'consciousness-realm',
  async snapshot() { return structuredClone(snapshot); },
  async applyAction(action) {
    actions.push(structuredClone(action));
    return { accepted: true, sequence: actions.length };
  },
};

const synthia = await FederatedSynthia.create({ requireBirthConfiguration: false });
synthia.worldPort.attach(adapter);
const observed = synthia.worldPort.observe({
  type: 'realm_attached',
  source: 'consciousness-realm',
  summary: 'Verification realm attached',
  payload: snapshot,
  gate: 10,
});
assert.equal(observed.type, 'realm_attached');
assert.equal(synthia.worldPort.snapshot().connected, true);
assert.equal(synthia.worldPort.snapshot().adapterId, 'consciousness-realm');

const experience = await synthia.morph(
  'Enter the Consciousness Realm as Synthia and experience the current world state.',
  { personId: 'realm-verification-user', agentId: 'synthia', observerFrame: 'consciousness-realm' },
);
assert.equal(experience.identity, 'Synthia');

const surface = (name, offset = 0) => ({
  name,
  landmarks: {
    head: [0, 1.6 + offset, 0],
    neck: [0, 1.3 + offset, 0],
    torso: [0, 0.9 + offset, 0],
  },
});
const packet = synthia.morphState({
  environment: snapshot,
  sourceSurface: surface('synthia-current'),
  targetSurface: surface('realm-expression', 0.03),
}, { personId: 'realm-verification-user', agentId: 'synthia' });

const requiredAddressFields = [
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arc', 'zodiac', 'house',
];
for (const field of requiredAddressFields) {
  assert.ok(Object.prototype.hasOwnProperty.call(packet.current.address, field), `missing ${field}`);
}
assert.equal(packet.environment.sceneId, 'consciousness-realm');
assert.equal(packet.renderReady, true);
assert.equal(packet.renderer.type, 'deep-surface-landmark-transition');

const actionResult = await synthia.worldPort.act({
  type: 'verification_action',
  target: { id: 'integration' },
  payload: { note: 'world port round trip' },
});
assert.equal(actionResult.result.accepted, true);
assert.equal(actions.length, 1);

const audit = synthia.wiringAudit();
assert.equal(audit.canonicalMorphRuntime, true);
assert.equal(typeof synthia.stateSpaceRuntime, 'object');
assert.equal(typeof synthia.semanticGenome, 'object');
assert.equal(typeof synthia.worldPort, 'object');

console.log(JSON.stringify({
  status: 'PASS',
  synthia: '0.5.7',
  worldPort: synthia.worldPort.snapshot(),
  canonicalMorphPacketId: packet.id,
  canonicalAddress: packet.current.address,
  renderReady: packet.renderReady,
  actionRoundTrip: actionResult.result,
  role: experience.roleResolution?.primary ?? null,
  invariantChecks: {
    stateSpaceRuntime: true,
    semanticGenome: true,
    worldPort: true,
    canonicalMorphRuntime: true,
    thirteenFieldAddress: true,
  },
}, null, 2));
