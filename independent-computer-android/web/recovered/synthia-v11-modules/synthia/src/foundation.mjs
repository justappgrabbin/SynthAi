import { mountSwarm } from 'synthia/src/swarm-adapter.mjs';
import { SynthiaSystem } from 'synthia/vendor/spine/src/synthia-system.mjs';
import { UniversalRuntime } from 'synthia/vendor/spine/src/universal-runtime.mjs';
import { validateCanonicalAddress, canonicalAddressKey } from 'synthia/vendor/spine/src/canonical-address.mjs';
import { SynthiaAutomata } from 'synthia/vendor/browser/src/engine/synthia.js';
import { UniversalExecutionBridge } from 'synthia/vendor/browser/src/integration/universal-execution-bridge.js';
import { AutomataIngestionExecutionKernel } from 'synthia/vendor/ingestion/src/automata/ingestion-execution-kernel.mjs';
import { BrowserAutomataStore } from 'synthia/vendor/ingestion/src/automata/browser-automata-store.mjs';
import { BrowserExecutionSurface } from 'synthia/vendor/ingestion/src/automata/browser-execution-surface.mjs';
import { normalizeArtifact } from 'synthia/vendor/ingestion/src/automata/artifact-normalizer.mjs';
import { KleinEngine } from 'synthia/vendor/klein-full-toolkit.mjs';
import { AtoEngine } from 'synthia/vendor/ato-engine.mjs';
import { ExecutionPipeline, MemoryExecutionPipelineStore } from 'synthia/vendor/spine/src/execution-pipeline.mjs';
import { expressGlyph } from 'synthia/src/glyph-expression.mjs';
import { LineageAdapter } from 'synthia/src/lineage-adapter.mjs';
import { createDefaultProcessField } from 'synthia/vendor/processes-cleaned/src/processes/createDefaultProcessField.js';
import { StateSpace } from 'synthia/vendor/browser/src/state-space/mesh-state-space.js';
import { DIMENSION_CHAINS, COLOR_TABLE, TONE_TABLE, BASE_TABLE } from 'synthia/vendor/browser/src/state-space/chains.js';
import { addressPresentation } from 'synthia/src/state-space-adapter.mjs';
import { FoundationStore } from 'synthia/src/storage-adapter.mjs';
import { SourceSystems } from 'synthia/src/source-systems.mjs';
import { ModelInterface } from 'synthia/src/model-interface.mjs';

const copy = v => {
  const seen=new WeakMap();
  const snapshot=value=>{
    if(typeof value==='function')return {kind:'callable-reference',name:value.name||'anonymous',restore:'resolve through the mounted source tool registry'};
    if(value===null||typeof value!=='object')return value;
    if(value instanceof Uint8Array)return value.slice();
    if(seen.has(value))return seen.get(value);
    const result=Array.isArray(value)?[]:{};seen.set(value,result);
    for(const [key,item] of Object.entries(value))result[key]=snapshot(item);
    return result;
  };
  return structuredClone(snapshot(v));
};
// Only adapters are added here. Calculus, automata, Klein, ATO, factory,
// reduction, address signing and execution remain the supplied implementations.
export class Foundation {
  constructor({store = new FoundationStore({databaseName:'synthia-foundation-v1'})} = {}) {
    this.store = store;
    this.runtime = new UniversalRuntime();
    this.runtime.registerRealizer('state-machine',async spec=>{
      const machine=this.runtime.createMachine(spec.definition);
      for(const event of spec.events??[])await machine.send(event);
      return machine.snapshot();
    });
    this.runtime.registerRealizer('dependency-graph',async(spec,context)=>this.runtime.runGraph(spec.nodes,{context,concurrency:spec.concurrency??1}));
    this.surface = new BrowserExecutionSurface();
    const chamber = {
      executeJavaScript: async (source, options={}) => {
        const artifact = await normalizeArtifact(source, {name:'realization.js'});
        const out = await this.surface.execute(artifact, {globals:options.context});
        if (!out.ok) throw new Error(out.error);
        return {ok:true, ...out.result};
      },
      executeWasm: async (bytes, imports={}) => {
        const out = await this.surface.execute(await normalizeArtifact(bytes,{name:'realization.wasm'}),{wasmImports:imports});
        if (!out.ok) throw new Error(out.error);
        return {ok:true, ...out.result, exports:out.result.returnValue.exports};
      }
    };
    this.system = new SynthiaSystem({engine:new SynthiaAutomata(),executionBridge:new UniversalExecutionBridge({sandbox:chamber})});
    this.processField = createDefaultProcessField();
    this.sources = new SourceSystems();
    this.swarm=mountSwarm(this.sources,store);
    this.models = new ModelInterface(this);
    this.runtime.registerRealizer('source-system',spec=>this.sources.execute(spec));
    this.runtime.registerRealizer('process-request',spec=>this.processField.request(spec.to,spec.type,spec.payload??{}));
    this.stateSpace = new StateSpace();
    this.system.engine.stateSpace = this.stateSpace;
    this.canon = {dimensions:DIMENSION_CHAINS,colors:COLOR_TABLE,tones:TONE_TABLE,bases:BASE_TABLE};
    this.lineage = new LineageAdapter(this.system.engine);
    this.runtime.registerRealizer('lineage-register',spec=>this.lineage.register(spec.piece));
    this.runtime.registerRealizer('lineage-fit',spec=>this.lineage.fit(spec.contract));
    this.kernel = new AutomataIngestionExecutionKernel({store,executionSurface:this.surface});
    this.pipeline = new ExecutionPipeline({addressResolver:this.system.addressResolver,mesh:this.system.mesh,store:new MemoryExecutionPipelineStore(),executeArtifactCore:(artifact,context)=>this.executeCore(artifact,context)});
    this.klein = new KleinEngine();
    this.ato = new AtoEngine({latentResolution:[1,1],numEmbeddings:64,embeddingDim:64});
    this.ato.learnSystem('foundation','State-space foundation','custom');
    this.history = [];
    this.queue = Promise.resolve();
    this.ready = this.restore();
  }
  async restore() {
    const saved = await this.store.get('foundation:journal') ?? [];
    for (const entry of saved) {
      await this.apply(entry.input, {...entry.context,restoredOutcome:entry.result?.outcome}, entry.kind, entry.id);
      if(entry.result?.sourceState?.organism)this.sources.organism.state=copy(entry.result.sourceState.organism);
    }
    this.history = saved;
    await this.swarm.wake();
    return this;
  }
  transact(input, context, kind) {
    const operation = this.queue.then(async () => {
      await this.ready;
      if(this.storageFault)throw new Error('Reload the foundation from its landed journal after the storage failure');
      const id = `entry:${this.history.length+1}`;
      const result = await this.apply(input, context, kind, id);
      result.sourceState={organism:this.sources.organism.snapshot()};
      const entry = copy({id,kind,input,context,result});
      const next = [...this.history,entry];
      // Land the journal before acknowledging success. Existing entries survive.
      try {await this.store.put('foundation:journal',next);}catch(error){this.storageFault=error;throw error;}
      this.history = next;
      return result;
    });
    this.queue = operation.catch(()=>{});
    return operation;
  }
  chat(text, context={}) { return this.transact(String(text),context,'chat'); }
  async ingest(input, context={}) {
    const a = await normalizeArtifact(input,context);
    return this.transact({name:a.name,mime:a.mime,bytes:a.bytes,content:a.text},context,'artifact');
  }
  async apply(input, context={}, kind, id) {
    if(kind==='lineage') input={realizer:'lineage-register',piece:input};
    if(kind==='fit') input={realizer:'lineage-fit',contract:input};
    if (context.canonicalAddress) validateCanonicalAddress(context.canonicalAddress);
    const session = await this.kernel.prepare(input,context);
    // Address-first observation before the operation; execution placement follows.
    const admission = this.system.engine.intake(session.normalized.text || session.fingerprint,context);
    const outcome = await this.pipeline.execute({name:session.normalized.name,content:session.normalized.text,bytes:session.normalized.bytes,type:session.normalized.kind},{...context,foundationKind:kind});
    if(!outcome.ok&&(kind==='lineage'||kind==='fit'))throw Error(outcome.error);
    const execution = {...outcome,backendUsed:false,workerUsed:false};
    const record = await this.kernel.finalize(session,execution);
    const text = session.normalized.text;
    const symbol = text ? await this.klein.process(text,id) : null;
    const processLanguage = text ? await this.processField.request('klein-language','language.analyze',{utterance:text}) : null;
    const fiveW = symbol ? this.klein.ask5W(id) : null;
    const episode = this.ato.storeEpisode('foundation',{state:{id,fingerprint:session.fingerprint,address:record.address.id,ok:execution.ok}},1);
    const shared = this.system.shareKnowledge({kind:'ingestion',fingerprint:record.fingerprint,address:record.address,fields:record.fields,fiveW,episodeId:episode.id},{source:kind});
    const resolvedValue=outcome.result?.returnValue;
    return {id,ok:execution.ok,...(kind==='lineage'?{piece:resolvedValue}:{}),...(kind==='fit'?{consequence:resolvedValue}:{}),admission,record,outcome,fiveW,shared,atoEpisode:episode.id,processLanguage,glyph:this.sources.qualities(outcome.canonicalAddress,context.level??2,{matterOwner:context.matterOwner??null,perspective:context.perspective??null}),presentation:addressPresentation(outcome.canonicalAddress,{level:context.level??2}),stateSpace:JSON.parse(JSON.stringify(this.stateSpace.address(outcome.canonicalAddress.gate),(_,value)=>typeof value==='function'?undefined:value))};
  }
  async executeCore(artifact,context) {
    if(context.restoredOutcome) {
      // Rebuild pure internal registries, retaining landed receipts and avoiding
      // external capability execution on reload.
      if(context.foundationKind==='lineage')await this.lineage.register(JSON.parse(artifact.content).piece);
      if(context.foundationKind==='fit')this.lineage.fit(JSON.parse(artifact.content).contract);
      let spec=null;try{spec=JSON.parse(artifact.content);}catch{}
      if(spec?.realizer==='source-system'&&((spec.system==='synthesis'&&spec.op==='create')||(spec.system==='grammar'&&spec.op==='learn-and-index')))await this.sources.execute(spec);
      return copy(context.restoredOutcome);
    }
    let outcome;
    if (context.foundationKind === 'chat') {
      outcome = await this.system.chat(artifact.content,context);
      outcome = {...outcome,kind:'chat',path:'state-space-klein-chat',result:{engine:'SynthiaSystem',stdout:[],returnValue:outcome.utterance}};
    } else {
      let spec = null;
      if (artifact.type === 'json') {
        try { const parsed=JSON.parse(artifact.content); if(parsed.realizer) spec=parsed; } catch {}
      }
      if (spec) {
        // Executable state-space specs use the spine's bounded IR/search/capabilities.
        outcome = await this.runtime.execute(spec,context.environment ?? {});
        outcome = {...outcome,kind:'state-space-spec',path:'spine-realization',result:{engine:outcome.realizer,stdout:[],returnValue:outcome.value}};
        this.system.shareKnowledge({kind:'state-space-execution',outcome},{source:'execution'});
      } else {
        outcome = await this.system.executeArtifact(artifact,context);
      }
    }
    if (!outcome.canonicalAddressKey) {
      const resolved=this.system.addressResolver.resolve({artifact,execution:outcome,decomposition:this.system.addressResolver.descend(artifact)});
      outcome={...outcome,canonicalAddress:context.canonicalAddress ?? resolved.address,canonicalAddressKey:context.canonicalAddress ? canonicalAddressKey(context.canonicalAddress):resolved.key,addressBasis:context.canonicalAddress?'creator-supplied':resolved.derivation.basis,addressDerivation:resolved.derivation};
    }
    return outcome;
  }
  tools() { return this.system.engine.listTools(); }
  registerPiece(piece) {return this.transact(piece,{},'lineage');}
  fitPieces(contract) {return this.transact(contract,{},'fit');}
  audit() {
    return {system:this.system.wiringAudit(),pipeline:this.pipeline.wiringAudit(),klein:this.klein.getStats(),ato:this.ato.getStats(),processes:this.processField.listProcesses(),swarm:this.swarm.snapshot(),sourceSystems:['swarm','synthesis','grammar','organism','body','qualities'],models:this.models.snapshot(),stateSpace:{mounted:true,dimensions:Object.keys(this.stateSpace.dimensions),gatesPerDimension:64,canonMounted:true},entries:this.history.length,backendRequired:false,workerRequired:false,modelRequired:false};
  }
  export() { return copy({schema:'synthia.foundation.journal.v1',entries:this.history}); }
}
