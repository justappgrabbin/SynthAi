import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

test('INDIVERSE ADDRESS: creator choice and 64-gate identity survive host morph and restart', async () => {
  const persistence = new MemoryPersistence();
  const first = await new NativeSeedRuntime({
    persistence, namespace:'addressed-indiverse-test', clock:() => 1000,
  }).boot();
  await first.indiverse.registerAddressedObject({
    id:'person:visitor', kind:'person-presence',
    creatorChoice:'a winged navigator',
    stateAddress:{ dimension:'Movement', gate:16, line:2, color:4, tone:3, base:1 },
    presentation:{ color:'silver', symbol:'visitor' },
  });
  await first.createIndiVerse('host-a', { grammar:{ colors:{'person-presence':'amber'} } });
  await first.createIndiVerse('host-b', { grammar:{ colors:{'person-presence':'green'} } });

  const a=first.viewIndiVerseObject('indiverse:host-a','person:visitor');
  const b=first.viewIndiVerseObject('indiverse:host-b','person:visitor');
  assert.equal(a.expression.color,'amber');
  assert.equal(b.expression.color,'green');
  assert.equal(a.morphInput.creatorChoice,'a winged navigator');
  assert.deepEqual(a.morphInput.stateAddress,b.morphInput.stateAddress);
  assert.equal(a.morphInput.stateAddress.gate,16);
  assert.equal(a.canonical.id,b.canonical.id);

  await first.registerCanonicalWorldObject({
    id:'person:visitor',kind:'person-presence',presentation:{color:'silver'},
  });
  assert.equal(first.indiverse.canonicalObject('person:visitor').stateAddress.gate,16);
  await assert.rejects(
    first.indiverse.registerAddressedObject({
      id:'person:visitor',kind:'person-presence',creatorChoice:'a winged navigator',
      stateAddress:{ dimension:'Movement',gate:17 },
    }),
    /invariant/,
  );

  const second=await new NativeSeedRuntime({
    persistence,namespace:'addressed-indiverse-test',clock:() => 2000,
  }).boot();
  const restored=second.viewIndiVerseObject('indiverse:host-b','person:visitor');
  assert.equal(restored.morphInput.creatorChoice,'a winged navigator');
  assert.equal(restored.morphInput.stateAddress.gate,16);
  assert.equal(restored.expression.color,'green');
});

test('INDIVERSE ADDRESS: no gate is fabricated for legacy registrations', async () => {
  const runtime=await new NativeSeedRuntime({
    persistence:new MemoryPersistence(),namespace:'addressed-indiverse-legacy',
  }).boot();
  const legacy=await runtime.registerCanonicalWorldObject({
    id:'object:legacy',kind:'building',presentation:{symbol:'home'},
  });
  assert.equal(legacy.addressStatus,'unresolved');
  assert.equal(legacy.stateAddress,null);
  await assert.rejects(
    runtime.indiverse.registerAddressedObject({
      id:'object:bad',kind:'building',creatorChoice:'house',
      stateAddress:{dimension:'Space',gate:65},
    }),
    /gate must be 1\.\.64/,
  );
});
