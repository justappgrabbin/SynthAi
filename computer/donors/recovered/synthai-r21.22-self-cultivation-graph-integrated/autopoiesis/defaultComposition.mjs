const part=(id,kind,path,capabilities=[],dependencies=[],extra={})=>Object.freeze({id,kind,path,capabilities:Object.freeze(capabilities),dependencies:Object.freeze(dependencies),required:false,mutable:true,...extra});
export const DEFAULT_COMPOSITION=Object.freeze({
 version:1,
 organism:'synthia',
 parts:Object.freeze([
  part('seed.constitution','seed','autopoiesis/ConstitutionalSeed.mjs',['identity','invariants'],[],{required:true,mutable:false,address:'planetary/system/core/constitution'}),
  part('process.fabric','process','processes/ProcessFabric.mjs',['process-orchestration'],['seed.constitution'],{required:true,address:'planetary/system/core/process-fabric'}),
  part('memory.local','memory','organs/LocalMemory.js',['persistent-memory'],['seed.constitution'],{required:true,address:'planetary/system/core/memory'}),
  part('builder.autocoder','process','processes/AutoCoder.mjs',['inspect-code','plan-code','synthesize-code','emit-tests'],['process.fabric'],{required:true,address:'planetary/design/core/autocoder'}),
  part('builder.mutation','process','processes/SourceMutationProcess.mjs',['stage-source-change'],['builder.autocoder'],{required:true,address:'planetary/design/core/source-mutation'}),
  part('builder.verify','organ','organism/CodeImmuneSystem.mjs',['inspect-source','diagnose-source','propose-repair'],['builder.autocoder'],{required:true,address:'planetary/design/core/code-immune'}),
  part('builder.build','process','processes/BuildProcess.mjs',['run-build-pipeline','verify-build-lineage'],['builder.mutation','builder.verify'],{required:true,address:'planetary/design/core/build'}),
  part('organism.unit','organism','core/SynthiaUnit.mjs',['organism-runtime','autonomous-cycle','morph'],['process.fabric','memory.local','builder.autocoder','builder.mutation','builder.verify','builder.build'],{required:true,address:'planetary/being/core/unit'}),
  part('field.pathways','process','resonance/PathwaysCycle.mjs',['discovery','assessment','placement','activation','optimization','sustain'],['memory.local','process.fabric'],{required:true,address:'planetary/evolution/core/pathways'}),
  part('field.resonance','network','resonance/ResonanceNetwork.mjs',['relationship-feedback','consequence-learning'],['memory.local','process.fabric'],{required:true,address:'planetary/evolution/core/resonance-network'}),
  part('world.semantic','world','world/SemanticWorld.mjs',['semantic-triples','rules','scheduled-groups'],['memory.local','process.fabric'],{required:true,address:'planetary/being/core/semantic-world'}),
  part('movement.knowledge','knowledge','movement/MovementStateKnowledge.mjs',['state-recognition','movement-meaning-reference'],['memory.local'],{required:true,address:'planetary/movement/core/state-knowledge'}),
  part('memory.persistence-triad','memory','organism/PersistenceTriad.mjs',['structural-persistence','episodic-persistence','learned-persistence'],['memory.local'],{required:true,address:'planetary/evolution/core/persistence-triad'}),
  part('autopoiesis.resonant-runtime','process','autopoiesis/ResonantAutopoieticRuntime.mjs',['pathways-cycle','resonance-feedback','semantic-world','self-build-orchestration'],['field.pathways','field.resonance','world.semantic','movement.knowledge','memory.persistence-triad','organism.unit'],{required:true,address:'planetary/design/core/resonant-autopoiesis'}),
  part('residence.acode','residence','distribution/Synthia-Acode-Residence-r21.17.zip',['editor','linux','plugin-host','local-build'],['organism.unit'],{mutable:false,address:'planetary/space/residence/acode'}),
  part('interface.phone','interface','index.html',['phone-shell'],['organism.unit'],{address:'planetary/space/interface/phone'}),
  part('interface.universe','interface','index.html',['universe-widget'],['organism.unit'],{address:'planetary/space/interface/universe'}),
  part('knowledge.seed','knowledge','knowledge/seed/',['knowledge-corpus'],['memory.local'],{address:'planetary/movement/knowledge/seed'}),
  part('knowledge.preload','knowledge','knowledge/preload/',['extended-knowledge'],['memory.local'],{address:'planetary/movement/knowledge/preload'}),
  part('visual.assets','assets','assets/',['visual-assets'],['interface.phone'],{address:'planetary/space/assets/visual'})
 ])
});
export default DEFAULT_COMPOSITION;
