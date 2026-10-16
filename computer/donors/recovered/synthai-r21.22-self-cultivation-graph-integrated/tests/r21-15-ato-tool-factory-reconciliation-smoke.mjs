import assert from 'node:assert/strict';
import { writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { AutomataMesh, Automaton, KLEIN_TOOL_CONTRACTS, KleinModuleRegistry } from '../vendor/ato-core/src/index.mjs';
import { IntegratedToolFactory, ATONativeBridge } from '../vendor/integrated-tool-factory/src/integrated-tool-factory.mjs';
import { AutoCoder } from '../processes/AutoCoder.mjs';

const fullAddress={mode:'micro',planetary:'Mars',dimension:'Design',gate:56,line:3,color:4,tone:2,base:5,degree:18,minute:22,second:41,arc:17,zodiac:9,house:5,scope:'resident',originContext:'private-synthia'};
const request={purpose:'AutoLing resident language architecture',toolFamily:'autoling',dimension:'Design',level:7,address:fullAddress,gate:56,targetGate:31};
const registry=new KleinModuleRegistry();
const composition=registry.compose('autoling');
assert.equal(composition.complete,true);
assert.deepEqual(composition.modules.map(x=>x.id),KLEIN_TOOL_CONTRACTS.autoling.minimumModules);

const factory=new IntegratedToolFactory({moduleRegistry:registry});
const first=factory.generate(request);
assert.equal(first.status,'generated');
assert.deepEqual(first.tool.address,fullAddress);
assert.equal(first.tool.plan.quality.house,5);
assert.equal(first.tool.plan.quality.zodiac,9);
assert.equal(first.tool.plan.quality.codeRole,'generator');
assert.equal(first.tool.plan.kleinContract.name,'AutoLing');
assert.ok(first.tool.plan.modules.includes('morphology'));
assert.ok(first.tool.plan.modules.includes('distributional-inference'));
assert.ok(first.tool.plan.modules.includes('symbolic-validation'));

const mesh=new AutomataMesh();
const bridge=new ATONativeBridge({Automaton,mesh,factory});
const mounted=bridge.mount(first.tool);
assert.equal(mounted.status,'mounted');
assert.equal(mounted.automaton.address.house,5);
assert.equal(mounted.automaton.address.planetary,'Mars');
const run=await bridge.run(first.tool.id,'quality-aware language system');
assert.ok(run.outputs[first.tool.id]);

// Regeneration must be deterministic from the same resident request.
const secondFactory=new IntegratedToolFactory({moduleRegistry:new KleinModuleRegistry()});
const second=secondFactory.generate(structuredClone(request));
assert.equal(second.tool.id,first.tool.id);
assert.equal(second.tool.addressKey,first.tool.addressKey);
assert.deepEqual(second.tool.plan.modules,first.tool.plan.modules);

// Exported automaton must run independently of Synthia, the factory, and the mesh.
const standalone='/tmp/r21-15-generated-autoling.mjs';
await writeFile(standalone,first.tool.exportModule(),'utf8');
const exported=await import(pathToFileURL(standalone).href+`?v=${Date.now()}`);
assert.equal(exported.manifest.address.house,5);
assert.equal(exported.manifest.metadata.kleinContract.name,'AutoLing');
const standaloneOut=await exported.execute('independent execution');
assert.ok(standaloneOut);
await rm(standalone,{force:true});

// AutoCoder is a sovereign multi-file construction process, not a one-function stub.
const coder=new AutoCoder();
const project=coder.inspectProject([{path:'alpha.mjs',source:"import x from 'pkg'; export function alpha(){}"},{path:'beta.mjs',source:'export const beta=1;'}]);
assert.equal(project.fileCount,2);
assert.ok(project.externalDependencies.includes('pkg'));
const moduleCandidate=coder.synthesizeModule({name:'ResidentGrammar',address:fullAddress,dependencies:['semantic-network'],operations:['recognize','generate']});
const tests=coder.synthesizeTests({modulePath:moduleCandidate.target,exportName:'ResidentGrammar',operations:['recognize','generate']});
const changeSet=coder.synthesizeChangeSet({goal:'add resident grammar process',project,modules:[{id:'grammar-induction',capabilities:['grammar']}],changes:[moduleCandidate],tests:[tests]});
assert.equal(changeSet.requiresVerification,true);
assert.equal(changeSet.files.length,2);
assert.ok(changeSet.files.every(file=>file.sha256.length===64));

console.log('r21.15 ATO Tool Factory reconciliation smoke passed');
