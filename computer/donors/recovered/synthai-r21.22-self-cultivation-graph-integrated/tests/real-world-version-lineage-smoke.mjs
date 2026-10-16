import assert from 'node:assert/strict';
import WorldOrgan from '../organs/WorldOrgan.js';
import VersionLineageRegistry from '../runtime/VersionLineageRegistry.js';
import fs from 'node:fs';

const world=new WorldOrgan();
const obs=world.observe({kind:'place',id:'shop-1',label:'Example Shop',geo:{lat:36.765,lon:-121.758},url:'https://example.test/shop'},{source:'user-observation',evidence:[{type:'location-report'}]});
assert.equal(obs.observation.status,'observed');
assert.equal(world.address('place:shop-1').scheme,'https');
assert.equal(world.address('place:shop-1').geo.lat,36.765);
assert.throws(()=>world.observe({kind:'thing',id:'unverified'}),/source or evidence/);

const versions=new VersionLineageRegistry();
versions.register({name:'Thing.js',version:'1.0.0',hash:'aaa',status:'candidate'});
versions.verify('Thing.js','aaa',{ok:true,tests:['smoke']});
versions.promote('Thing.js','aaa',{reason:'baseline verified'});
versions.register({name:'Thing.js',version:'2.0.0',hash:'bbb'});
assert.equal(versions.active('Thing.js').hash,'aaa','new version must NOT auto-resolve/promote');
versions.verify('Thing.js','bbb',{ok:true,tests:['smoke','regression']});
assert.equal(versions.active('Thing.js').hash,'aaa','verified candidate still requires explicit promotion');
versions.promote('Thing.js','bbb',{reason:'explicit verified upgrade'});
assert.equal(versions.active('Thing.js').hash,'bbb');
assert.equal(versions.versions('Thing.js').length,2,'old version must remain preserved');

assert.ok(fs.existsSync(new URL('../lineage/legacy-resolver/resolver/Resolver.mjs',import.meta.url)));
const legacyManifest=JSON.parse(fs.readFileSync(new URL('../lineage/legacy-resolver/manifest/synthia-manifest.json',import.meta.url),'utf8'));
assert.equal(legacyManifest.modules.length,218);
assert.ok(legacyManifest.modules.some(m=>(m.variants||[]).length>0),'resolved variant history must be preserved');
console.log('REAL WORLD + VERSION LINEAGE PASS: external referents/provenance → observed world; candidate → verify → explicit promote; legacy resolver variants preserved');
