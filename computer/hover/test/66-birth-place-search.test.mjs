import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces } from '../src/identity/place-search.mjs';
import { resolveZonedBirthInstant, validateBirthRecord } from '../src/identity/birth-location-provider.mjs';

test('offline places include correct coordinates/timezone and distinguish namesakes', () => {
  const la = searchPlaces('Los Angeles')[0];
  assert.equal(la.timeZone,'America/Los_Angeles');
  assert.ok(la.latitude > 33 && la.latitude < 35);
  assert.ok(searchPlaces('Springfield').length > 1);
  assert.equal(searchPlaces('São Paulo')[0].timeZone,'America/Sao_Paulo');
  assert.deepEqual(searchPlaces('a'),[]);
});
test('minute times resolve with historical DST and preserve their precision', () => {
  const place=searchPlaces('Los Angeles')[0];
  const record=validateBirthRecord({birthDate:'2000-07-01',birthTime:'12:34',place});
  const resolved=resolveZonedBirthInstant({...record,timeZone:place.timeZone});
  assert.equal(resolved.utcIso,'2000-07-01T19:34:00.000Z');
  assert.equal(resolved.timePrecision,'minute');
  assert.equal(resolved.exactSecondsPreserved,false);
  const exact=resolveZonedBirthInstant({...record,birthTime:'12:34:56',timeZone:place.timeZone});
  assert.equal(exact.exactSecondsPreserved,true);
  assert.equal(exact.utcIso,'2000-07-01T19:34:56.000Z');
});

test('minute precision passes through the actual birth-mirror configuration', async t => {
  const { FederatedSynthia } = await import('../src/index.mjs');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const dir=await mkdtemp(tmpdir()+'/synthia-minute-');
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const synthia=await FederatedSynthia.create({persistenceDir:dir});
  const configured=await synthia.configureBirthMirror({birthDate:'2000-07-01',birthTime:'12:34',place:searchPlaces('Los Angeles')[0]});
  assert.equal(configured.identity.configured,true);
  assert.equal(configured.identity.exactSecondsPreserved,false);
  assert.equal(synthia.birthMirror.configuration.resolvedTime.timePrecision,'minute');
});
