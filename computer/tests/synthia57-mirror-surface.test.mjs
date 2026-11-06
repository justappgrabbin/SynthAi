import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { Synthia57MirrorSurfaceStore } from '../residents/synthia57-mirror-surface.mjs';

test('SYNTHIA 5.7 MIRROR: image stays private and only metadata enters runtime state', async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'synthia-mirror-'));
  try{
    const bus=new EventBus();
    const state=new StateStore({bus,persistence:new MemoryPersistence(),namespace:'mirror-test'});
    await state.restore();
    const store=new Synthia57MirrorSurfaceStore({state,bus,root});
    const raw=Buffer.from('this-is-a-private-mirror-image'.repeat(12));
    const result=await store.ingest({dataUrl:'data:image/jpeg;base64,'+raw.toString('base64')});
    assert.equal(result.configured,true);
    assert.equal(result.visibility,'private-device');
    assert.equal(result.filePath,undefined);
    assert.equal(result.sha256.length,64);
    const saved=store.snapshot();
    assert.equal(saved.filePath,undefined);
    assert.equal(saved.surfaceRole,'mirror-identity-texture');
    assert.deepEqual(await store.bytes(),raw);
  } finally { await rm(root,{recursive:true,force:true}); }
});
