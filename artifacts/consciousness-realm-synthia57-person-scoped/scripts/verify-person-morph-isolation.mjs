import assert from 'node:assert/strict';
import { FederatedSynthia } from '../vendor/synthia-v0.5.7/src/index.mjs';

function adapterFor(personId, snapshot, actions) {
  return {
    id: `consciousness-realm:${personId}`,
    async snapshot() { return structuredClone(snapshot); },
    async applyAction(action) {
      actions.push({ personId, action: structuredClone(action) });
      return { accepted: true, personId, sequence: actions.length };
    },
  };
}

const people = [
  {
    personId: 'person-alice',
    message: 'Explore how creativity can reshape this world today.',
    snapshot: {
      sceneId: 'consciousness-realm',
      viewer: { personId: 'person-alice', name: 'Alice', intentions: ['creativity'] },
      kernel: { consciousnessLevel: 2, activeGates: [10, 20] },
      agents: [{ id: 'alice-agent', name: 'Alice' }],
      places: [{ id: 'integration', name: 'Integration Core' }],
    },
  },
  {
    personId: 'person-bob',
    message: 'Explore how connection can reshape this world today.',
    snapshot: {
      sceneId: 'consciousness-realm',
      viewer: { personId: 'person-bob', name: 'Bob', intentions: ['connection'] },
      kernel: { consciousnessLevel: 3, activeGates: [34, 57] },
      agents: [{ id: 'bob-agent', name: 'Bob' }],
      places: [{ id: 'integration', name: 'Integration Core' }],
    },
  },
];

const results = [];
for (const person of people) {
  const actions = [];
  const synthia = await FederatedSynthia.create({ requireBirthConfiguration: false });
  synthia.worldPort.attach(adapterFor(person.personId, person.snapshot, actions));
  synthia.worldPort.observe({
    type: 'realm_attached',
    source: 'consciousness-realm',
    personId: person.personId,
    summary: `${person.personId} realm attached`,
    payload: person.snapshot,
    gate: person.snapshot.kernel.activeGates.at(-1),
  });
  await synthia.worldPort.pull();

  const morph = await synthia.morph(person.message, {
    personId: person.personId,
    agentId: 'synthia',
    purpose: `Support ${person.snapshot.viewer.intentions.join(', ')}`,
    relationalContext: person.snapshot.viewer,
  });
  assert.equal(morph.identity, 'Synthia');

  const packet = synthia.morphState({
    environment: person.snapshot,
    sourceSurface: { name: 'synthia-current', landmarks: { head: [0, 1.6, 0], torso: [0, 0.9, 0] } },
    targetSurface: { name: 'realm-expression', landmarks: { head: [0, 1.63, 0], torso: [0, 0.93, 0] } },
    context: { worldAdapter: 'consciousness-realm', personId: person.personId },
  }, { personId: person.personId, agentId: 'synthia' });

  const action = await synthia.worldPort.act({ type: 'person-isolation-check', target: person.personId });
  assert.equal(action.result.accepted, true);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].personId, person.personId);

  results.push({
    personId: person.personId,
    packetId: packet.id,
    stateId: packet.current.stateId,
    address: packet.current.address,
    role: morph.roleResolution?.primary ?? null,
    actionCount: actions.length,
  });
}

assert.notEqual(results[0].personId, results[1].personId);
assert.notEqual(results[0].packetId, results[1].packetId, 'each person must receive a distinct canonical morph packet');
assert.notEqual(results[0].stateId, results[1].stateId, 'each person must receive a distinct resolved state');

console.log(JSON.stringify({
  status: 'PASS',
  invariant: 'person-scoped-synthia-and-world-morph',
  people: results,
  checks: {
    separateRuntimeInstances: true,
    separateWorldPorts: true,
    separateActionQueues: true,
    distinctMorphPackets: true,
    distinctResolvedStates: true,
  },
}, null, 2));
