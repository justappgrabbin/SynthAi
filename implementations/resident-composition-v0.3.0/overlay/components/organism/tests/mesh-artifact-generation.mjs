import assert from 'node:assert/strict';
import { MeshArtifactGenerator } from '../processes/MeshArtifactGenerator.mjs';
import { SemanticWorld } from '../world/SemanticWorld.mjs';
const stored = new Map();
const memory = { get: (ns, key) => stored.get(`${ns}:${key}`), upsert: (ns, key, value) => stored.set(`${ns}:${key}`, { value: structuredClone(value) }) };
const world = new SemanticWorld();
const address={planetary:'Sun',dimension:'Movement',gate:1,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1};
world.assert('player', 'NEEDS', 'crossing');
let proposals = 0;
const options = {
  world, memory,
  resolve: source => ({ complete: source?.admitted === true, address, source }),
  propose: ({ facts, kind }) => {
    proposals++;
    assert.equal(facts[0].object, 'crossing');
    assert.equal(kind, 'game');
    return { files: [{ path: 'crossing.mjs', inheritAddress:true, source: 'export const cross = state => ({ ...state, location: "other-bank" });' }] };
  },
  verify: async record => {
    const module = await import(`data:text/javascript,${encodeURIComponent(record.proposal.files[0].source)}`);
    const result = module.cross({ location: 'bank', identity: 'player' });
    assert.equal(result.location, 'other-bank');
    assert.equal(result.identity, 'player');
    return { pass: true, evidence: result };
  }
};
const generator = new MeshArtifactGenerator(options);
const held = await generator.generate({ purpose: 'reach the other bank', kind: 'game', source: { admitted: false } });
assert.equal(held.status, 'held');
assert.equal(proposals, 0);
const landed = await generator.generate({ purpose: 'reach the other bank', kind: 'game', source: { admitted: true }, parentId: held.id });
assert.equal(landed.status, 'verified');
assert.equal(world.query({ relation: 'GENERATED' }).length, 1);
const restored = new MeshArtifactGenerator({ ...options, verify: () => ({ pass: true }) });
const next = await restored.generate({ purpose: 'keep crossing available', kind: 'game', source: { admitted: true }, parentId: landed.id });
assert.equal(next.status, 'unverified');
assert.deepEqual(restored.snapshot()[1], landed);
assert.equal(world.query({ relation: 'GENERATED' }).length, 1);
console.log('mesh artifact generation: resolution hold, executable behavior, evidence, and persistent descendant history passed');
