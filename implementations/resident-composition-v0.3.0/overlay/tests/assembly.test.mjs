import test from 'node:test';
import assert from 'node:assert/strict';
import { ScientificSynthiaAssembly } from '../src/index.mjs';

const organismAddress = Object.freeze({
  planetary: 'Sun',
  dimension: 'Movement',
  gate: 1,
  line: 1,
  color: 1,
  tone: 1,
  base: 1,
  degree: 0,
  minute: 0,
  second: 0,
  arc: 0,
  zodiac: 1,
  house: 1,
});

test('assembly boots supplied systems without collapsing dimensions/views/address schemas', async (t) => {
  const system = new ScientificSynthiaAssembly({ autoStart: false });
  t.after(async () => system.close());

  assert.deepEqual(system.dimensions, ['Movement','Evolution','Being','Design','Space']);
  assert.deepEqual(system.graphProjections, ['knowledge','causal','phase','temporal','dependency']);
  assert.equal(system.organism.stateSpace.coordinates.size(), 6987202560000000);
  assert.equal(system.stateMath.listTools().length, 16);

  const audit = system.addressAudit(organismAddress);
  assert.equal(audit.organismCanonical.ok, true);
  assert.equal(audit.organismFull.ok, true);
  assert.equal(audit.organismFull.numeric.degree, 0);
  assert.equal(audit.executionCanonical.ok, false);
  assert.ok(audit.unresolvedInterop.some((x) => x.includes('arcAxis')));

  const views = system.projectAcrossDimensions({ identity: 'same-state', dimension: 'Movement', value: 42 });
  assert.equal(Object.keys(views).length, 5);
  for (const projection of Object.values(views)) assert.equal(projection.identity, 'same-state');
});

test('organism route feeds evidence into supplied process physics', async (t) => {
  const system = new ScientificSynthiaAssembly({ autoStart: false });
  t.after(async () => system.close());

  const result = await system.ask('research resonance science', { address: { canonical: organismAddress } });
  assert.equal(result.ok, true);
  assert.ok(result.route.includes('resonance'));
  assert.ok(result.route.includes('research'));
  assert.ok(system.processPhysics.hypothesisStatus().length >= 1);
  assert.ok(system.execution.mesh.metrics().projections.knowledge.edges >= 1);
});

test('artifact work remains transient until a complete organism address is accepted', async (t) => {
  const system = new ScientificSynthiaAssembly({ autoStart: false });
  t.after(async () => system.close());

  const artifact = {
    name: 'proof.json',
    type: 'application/json',
    content: JSON.stringify({ hello: 'state-space', gates: 64, dimensions: 5 }),
  };

  const transient = await system.executeArtifact(artifact);
  assert.equal(transient.execution.ok, false);
  assert.equal(transient.execution.path, 'address-held');
  assert.equal(transient.execution.executed, false);
  assert.equal(transient.status, 'unresolved-address');
  assert.equal(transient.stored, false);
  assert.equal(system.ingestion.history.length, 0);
  assert.equal(await system.recallArtifact(transient.fingerprint), null);

  const record = await system.executeArtifact(artifact, { organismAddress });
  assert.equal(record.execution.ok, true);
  assert.equal(record.execution.path, 'direct-probe-complete');
  assert.equal(record.admitted, true);
  assert.equal(record.stored, true);
  assert.ok(record.address?.id);
  assert.equal(record.fields?.order?.length, 5);
  assert.deepEqual(record.organismAddress, organismAddress);
  assert.equal(system.ingestion.history.length, 1);
  assert.ok(await system.recallArtifact(record.fingerprint));
  assert.ok(system.processPhysics.hypothesisStatus().some((h) => h.members.includes('assembly:automata-ingestion') && h.members.includes('assembly:execution-spine')));

  const reassembled = await system.reassembleArtifact(record.fingerprint);
  assert.equal(reassembled.byteExact, true);
  assert.equal(new TextDecoder().decode(reassembled.bytes), artifact.content);
});

test('cleaned peer process field remains callable as an independent process-of-processes layer', async (t) => {
  const system = new ScientificSynthiaAssembly({ autoStart: false });
  t.after(async () => system.close());

  const coverage = await system.processRequest('codon', 'codon.coverage');
  assert.equal(typeof coverage, 'object');
  assert.ok('mappedCount' in coverage);
  assert.ok(Array.isArray(coverage.missing));
});

test('full organism coordinates are sign-local, not flattened to 360 degrees', async () => {
  const local = {
    planetary: 'Sun', dimension: 'Being', gate: 6, line: 4, color: 4, tone: 4, base: 2,
    degree: 25, minute: 59, second: 31, arc: 92, zodiac: 6, house: 5,
  };
  const system = new ScientificSynthiaAssembly({ autoStart: false });
  try {
    const audit = system.addressAudit(local);
    assert.equal(audit.organismFull.ok, true);
    assert.equal(audit.organismFull.numeric.degree, 25);
    const invalid = system.addressAudit({ ...local, degree: 175 });
    assert.equal(invalid.organismFull.ok, false);
  } finally {
    await system.close();
  }
});
