import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { TermuxCompilerAdapter } from '../adapters/termux-compiler.mjs';

globalThis.crypto ??= webcrypto;

test('TERMUX COMPILER ADAPTER: executes explicit recipe and returns content-addressed artifact', async()=>{
  const store=new Map();
  const files={
    async write(path,data){store.set(path,String(data));},
    async read(path){return new TextEncoder().encode(store.get(path)??'');},
    async setReadOnly(path,value){store.set(path+':readonly',value);}
  };
  const calls=[];
  const executor={
    async run({argv,cwd}) {
      calls.push({argv,cwd});
      const input=argv[1], output=argv[3];
      store.set(output,'compiled:'+store.get(input));
      return {ok:true,exitCode:0};
    }
  };
  const compiler=new TermuxCompilerAdapter({executor,files,workspace:'/private/compiler'});
  const result=await compiler.compile({
    id:'hand:file',
    sourceHash:'abc123',
    sourceText:'source code',
    sourceExtension:'c',
    outputExtension:'wasm',
    target:'wasm',
    steps:[{argv:['fakecc','{input}','-o','{output}']}]
  });
  assert.equal(calls.length,1);
  assert.equal(result.target,'wasm');
  assert.match(result.artifactRef,/hand_file-abc123\.wasm$/);
  assert.equal(result.artifactHash.length,64);
  assert.equal(store.get(result.artifactRef+':readonly'),true);
});
