import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { Synthia57PackageStore } from '../residents/synthia57-package-store.mjs';

test('SYNTHIA 5.7 PACKAGE: stream install preserves archive and extracted runtime and remembers mount root',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'synthia57-package-'));
  try{
    const bus=new EventBus();
    const state=new StateStore({bus,persistence:new MemoryPersistence(),namespace:'synthia57-package-test'});
    await state.restore();
    let extracts=0;
    const store=new Synthia57PackageStore({
      state,bus,root,
      extract:async(_archive,destination)=>{
        extracts++;
        const base=path.join(destination,'Synthia-Integrated-Automata-v0.5.7');
        await mkdir(path.join(base,'src'),{recursive:true});
        await mkdir(path.join(base,'vendor','pure-synthia-v0.4.0','src','synthia'),{recursive:true});
        await writeFile(path.join(base,'src','federated-synthia.mjs'),'export const FederatedSynthia = {}');
        await writeFile(path.join(base,'vendor','pure-synthia-v0.4.0','src','synthia','synthiaRuntime.mjs'),'export const embodiment = {}');
      }
    });

    const bytes=Buffer.from('canonical-synthia-5.7-package-fixture');
    const first=await store.installZipStream(Readable.from(bytes),{contentLength:bytes.length,source:'test-picker'});
    assert.equal(first.installed,true);
    assert.equal(first.version,'0.5.7');
    assert.equal(extracts,1);
    assert.match(first.base,/Synthia-Integrated-Automata-v0\.5\.7$/);
    assert.equal((await store.verify()).installed,true);
    assert.equal(store.snapshot().sha256,first.sha256);
    assert.equal(state.get('synthia57.package').base,first.base);

    const archives1=await readdir(path.join(root,'archives'));
    assert.ok(archives1.includes(first.sha256+'.zip'));

    const second=await store.installZipStream(Readable.from(bytes),{contentLength:bytes.length,source:'test-picker'});
    assert.equal(second.sha256,first.sha256);
    assert.equal(extracts,1,'same package must reuse extracted copy');
    const archives2=await readdir(path.join(root,'archives'));
    assert.ok(archives2.some(name=>name.startsWith(first.sha256+'-duplicate-')),'duplicate source ZIP must be retained');
  } finally {
    await rm(root,{recursive:true,force:true});
  }
});
