import { CanonicalMorphRuntime } from 'synthia/vendor/morph-integration/canonical-morph-runtime.mjs';
import { SynthesisRuntime } from 'synthia/vendor/living-organism/synthesisRuntime.mjs';
import { GrammarSystemsRuntime } from 'synthia/vendor/living-organism/grammarSystemsRuntime.mjs';
import { EmbodimentRuntime } from 'synthia/vendor/living-organism/embodiment/embodimentRuntime.mjs';
import { LivingOrganismRuntime } from 'synthia/vendor/living-organism/organism/livingOrganismRuntime.mjs';
import { CENTER_GEOMETRY } from 'synthia/src/reference-qualities.mjs';
import { expressGlyph } from 'synthia/src/glyph-expression.mjs';

// Per-foundation instances of the supplied implementations. No swarm generator.
export class SourceSystems {
 constructor(){this.morph=new CanonicalMorphRuntime();this.synthesis=new SynthesisRuntime();this.grammar=new GrammarSystemsRuntime();this.body=new EmbodimentRuntime();this.organism=new LivingOrganismRuntime();}
 async execute(spec){
  switch(spec.system){
   case 'morph':
    if(spec.op==='prepare')return this.morph.prepare(spec);
    if(spec.op==='snapshot')return this.morph.snapshot();
    break;
   case 'swarm':
    if(spec.op==='snapshot')return this.swarm.snapshot();
    if(spec.op==='submit')return this.swarm.submit(spec.tasks);
    break;
   case 'synthesis':
    if(spec.op==='create')return this.synthesis.synthesize(spec.request);
    if(spec.op==='run')return this.synthesis.run(spec.id,spec.input);
    if(spec.op==='export')return this.synthesis.exportTool(spec.id);
    if(spec.op==='list')return this.synthesis.list();
    break;
   case 'grammar':
    if(spec.op==='learn-and-index')return this.grammar.learnAndIndex(spec.examples,spec.options);
    if(spec.op==='generate')return this.grammar.generate(spec.options);
    if(spec.op==='snapshot')return this.grammar.snapshot();
    break;
   case 'organism':return this.organism.run(spec.input??{});
   case 'body':return this.body.run(spec.input??{},spec.context??{});
   case 'qualities':return this.qualities(spec.address,spec.level??2,spec.context??{});
  }
  throw Error(`Unknown supplied system operation: ${spec.system}/${spec.op}`);
 }
 qualities(address,level,context){
  if(!Number.isInteger(level)||level<0)throw Error('Quality level must be a nonnegative integer');
  const expression=expressGlyph(address,{context,level});
  const center=CENTER_GEOMETRY.find(c=>c.gates.includes(address.gate));
  return {...expression,level,geometry:center?{shape:center.shape,center:center.name,position:[...center.position],source:'vendor/processes-cleaned/src/data/reference/hd_64_gates.json',scope:'center diagram geometry'}:null};
 }
 snapshot(){return {synthesis:this.synthesis.snapshot(),grammar:this.grammar.snapshot(),body:this.body.snapshot?.()??this.body.body.snapshot(),organism:this.organism.snapshot()};}
}
