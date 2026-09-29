import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionAddressResolver, SynthiaSystem, validateCanonicalAddress } from '../src/index.mjs';

test('resolver descends artifact to actual bit/state primitives', () => {
  const r = new ExecutionAddressResolver();
  const d = r.descend({ name:'x.py', content:'print(2 + 2)' });
  assert.ok(d.byteLength > 0);
  assert.equal(d.bitLength, d.byteLength * 8);
  assert.equal(d.ones + d.zeros, d.bitLength);
  assert.ok(d.sixBitStateCount > 0);
});

test('same artifact plus same first-run outcome resolves deterministically', () => {
  const r = new ExecutionAddressResolver();
  const artifact = { name:'x.py', type:'python', content:'print(2 + 2)' };
  const execution = { ok:false, path:'runtime-unavailable', kind:'python', error:'missing runtime' };
  const a = r.resolve({ artifact, execution });
  const b = r.resolve({ artifact, execution });
  assert.deepEqual(a, b);
  assert.equal(validateCanonicalAddress(a.address), true);
  assert.equal(a.derivation.basis, 'first-execution-derived');
  assert.equal(a.derivation.intrinsicSemanticClaim, false);
  assert.equal(a.address.degree.structure, '5-of-29');
});

test('different runtime outcome can move the same artifact to a different execution coordinate', () => {
  const r = new ExecutionAddressResolver();
  const artifact = { name:'x.py', type:'python', content:'print(2 + 2)' };
  const failed = r.resolve({ artifact, execution:{ ok:false, path:'runtime-unavailable', kind:'python', error:'missing runtime' } });
  const ran = r.resolve({ artifact, execution:{ ok:true, path:'registered-runtime', kind:'python', runtimeAdapter:'python', result:{engine:'python', stdout:['4']} } });
  assert.notEqual(failed.key, ran.key);
});

test('Synthia automatically assigns and appends full address after first execution attempt', async () => {
  const synthia = new SynthiaSystem();
  const result = await synthia.executeArtifact({ name:'x.rb', type:'ruby', content:'puts 1' });
  assert.equal(validateCanonicalAddress(result.canonicalAddress), true);
  assert.equal(result.addressBasis, 'first-execution-derived');
  assert.ok(result.placementRecordId.startsWith('execution-address-'));
  assert.equal(synthia.executionAddressRecords.length, 1);
  assert.deepEqual(synthia.executionAddressRecords[0].canonicalAddress, result.canonicalAddress);
  assert.equal(synthia.executionAddressRecords[0].outcome.ok, false);
});

test('explicit creator canonical address is preserved while runtime-derived placement remains visible', async () => {
  const synthia = new SynthiaSystem();
  const supplied = {
    planetary:13, dimension:'Space', gate:64, line:6, color:6, tone:6, base:5,
    degree:{band:5,subdivision:29,structure:'5-of-29'}, minute:59, second:59,
    arcAxis:{arcUnit:99,axis:'Diagonal'}, zodiac:12, house:12,
  };
  const result = await synthia.executeArtifact({ name:'a.js', type:'javascript', content:'return 7;' }, { canonicalAddress:supplied });
  assert.deepEqual(result.canonicalAddress, supplied);
  assert.equal(result.addressBasis, 'creator-supplied');
  assert.ok(result.executionDerivedAddress);
});
