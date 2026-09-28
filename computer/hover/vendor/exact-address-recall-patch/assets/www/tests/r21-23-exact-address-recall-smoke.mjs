import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import ExactRecallRuntime, { ExactRecallError } from '../runtime/exact-recall/ExactRecallRuntime.mjs';
import ExactRecallRegistry from '../runtime/exact-recall/ExactRecallRegistry.mjs';

const address = Object.freeze({
  planetary:'Jupiter', dimension:'Being', gate:48, line:1, color:1, tone:1, base:1,
  degree:0, minute:18, second:31, arc:90, zodiac:12, house:12
});

class EmptyStore {
  constructor(){ this.saved = new Map(); }
  async get(){ return null; }
  async put(bytes){ this.last = bytes; return { sha256: await (await import('../runtime/exact-recall/ContentHash.mjs')).sha256Hex(bytes), byteLength:bytes.byteLength }; }
}

const unit = new SynthiaUnit({ autoStart:false });
assert.ok(unit.exactRecall, 'Exact Recall must be a native SynthiaUnit capability');

// ATO = tools. Commit one real generated ATO tool at one exact canonical address.
const toolCommit = await unit.exactRecall.commitTool(address, {
  purpose:'exact addressed tool recall proof',
  input:'analogy tool for exact addressed recall',
  dimension:'Being', level:3, gate:48, line:1, color:1, tone:1, base:1,
  address
}, { provenance:[{ type:'smoke-test', source:'existing IntegratedToolFactory + ATONativeBridge' }] });
assert.equal(toolCommit.commitment.materializer, 'ato');
assert.match(toolCommit.commitment.expectedSha256, /^[a-f0-9]{64}$/);

// Force a cold path with NO artifact bytes. It must regenerate through the live ATO path
// and only return after the regenerated source hashes to the address commitment.
const toolCold = new ExactRecallRuntime({
  unit,
  registry:new ExactRecallRegistry({ seed:[toolCommit.commitment] }),
  store:new EmptyStore()
});
const recalledTool = await toolCold.recall(address, { kind:'tool' });
assert.equal(recalledTool.exact, true);
assert.equal(recalledTool.source, 'ato');
assert.equal(recalledTool.sha256, toolCommit.commitment.expectedSha256);
assert.equal(recalledTool.materialized.toolId, toolCommit.materialized.toolId);

// Foundry = apps. Commit a complete exact file-set, not a similarity representation.
const appFiles = [
  { path:'index.html', type:'html', content:'<!doctype html><meta charset="utf-8"><title>Addressed App</title><main id="app">exact</main><script type="module" src="./app.mjs"></script>' },
  { path:'app.mjs', type:'javascript', content:'export const identity = "canonical-address-app"; document.querySelector("#app").dataset.identity=identity;\n' },
  { path:'synthia/app.json', type:'json', content:JSON.stringify({ address, role:'exact-foundry-proof' }) }
];
const appCommit = await unit.exactRecall.commitApp(address, { files:appFiles }, {
  provenance:[{ type:'smoke-test', source:'resident Foundry exact recipe' }]
});
assert.equal(appCommit.commitment.materializer, 'foundry');

// Again force a cold path. Foundry must reconstruct the exact canonical bundle and pass SHA-256.
const appCold = new ExactRecallRuntime({
  unit,
  registry:new ExactRecallRegistry({ seed:[appCommit.commitment] }),
  store:new EmptyStore()
});
const recalledApp = await appCold.recall(address, { kind:'app' });
assert.equal(recalledApp.exact, true);
assert.equal(recalledApp.source, 'foundry');
assert.equal(recalledApp.sha256, appCommit.commitment.expectedSha256);
assert.deepEqual(recalledApp.files.map(x=>x.path), ['app.mjs','index.html','synthia/app.json']);

// VQ is recognition only: suggesting the address does not create authority or a commitment.
const unknown = { ...address, second:32 };
appCold.recognize({ address:unknown, similarity:0.9999, code:[12,44,3] });
await assert.rejects(() => appCold.recall(unknown,{kind:'app'}), e => e instanceof ExactRecallError && e.code === 'UNKNOWN_ADDRESS');

// Fail closed: same exact address + wrong recipe must never return a "close enough" app.
const corrupt = { ...appCommit.commitment, recipe:{ files:[...appFiles, {path:'oops.txt',content:'one wrong byte'}] } };
const corruptRuntime = new ExactRecallRuntime({
  unit,
  registry:new ExactRecallRegistry({ seed:[corrupt] }),
  store:new EmptyStore()
});
await assert.rejects(() => corruptRuntime.recall(address,{kind:'app'}), e => e instanceof ExactRecallError && e.code === 'HASH_MISMATCH');

// Known address cannot silently change identity.
assert.throws(() => unit.exactRecall.registry.register({ ...appCommit.commitment, expectedSha256:'f'.repeat(64) }), /EXACT_ADDRESS_CONFLICT/);

// Exact commitments require every one of the 13 current canonical address fields.
await assert.rejects(() => unit.exactRecall.commitApp({ ...address, arc:null }, { files:appFiles }), /full exact address missing: arc/);

const snap = unit.snapshot();
assert.ok(snap.exactRecall, 'Synthia snapshot must report Exact Recall');
console.log(JSON.stringify({
  pass:true,
  tool:{sha256:toolCommit.commitment.expectedSha256,toolId:toolCommit.materialized.toolId},
  app:{sha256:appCommit.commitment.expectedSha256,files:recalledApp.files.length},
  vqAuthority:false,
  failClosed:true,
  nativeMount:true
},null,2));
unit.living?.stop?.();
