import fs from 'node:fs';import SynthiaUnit from '../core/SynthiaUnit.mjs';
const must=['../core/SynthiaUnit.mjs','../resonance/ResonanceNetwork.mjs','../organism/SelfConstructionEngine.mjs','../organism/CodeImmuneSystem.mjs','../runtime/SelfEditCoordinator.mjs','../runtime/AndroidSelfCompileCapability.mjs','../runtime/AndroidReproductionExecutor.mjs','../runtime/EventMesh.js','../organs/CultivationOrgan.js','../organs/WorldOrgan.js','../suite/index.html','../suite/graph-center.html'];
for(const p of must) if(!fs.existsSync(new URL(p,import.meta.url))) throw new Error('missing '+p);
const u=new SynthiaUnit({residence:{approved:true,address:null,addressComplete:false,provenance:[{type:'suite-acceptance',at:Date.now()}]},mode:'complement'});
const s=u.snapshot();if(s.organs.length<10)throw new Error('organ count');if(s.tools.length<10)throw new Error('tool count');
const r=await u.ask('state your current capability state');if(!r||!Array.isArray(r.route))throw new Error('chat route');
console.log(JSON.stringify({ok:true,organs:s.organs.length,tools:s.tools.length,processes:s.processFabric?.processes?.length||0,route:r.route,world:u.world.snapshot()?.entities?.length||0},null,2));
