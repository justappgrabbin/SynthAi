const clone = value => value === undefined ? undefined : structuredClone(value);
const safeKey = value => String(value ?? 'module').replace(/[^A-Za-z0-9_-]/g, c => `_${c.charCodeAt(0).toString(16)}`);

export class DormantCompilerBroker {
  constructor({ state, bus = null, clock = () => Date.now() } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('DormantCompilerBroker requires a StateStore-like state service');
    Object.assign(this, { state, bus, clock });
    this.adapter = null;
  }

  get lifecycle() { return this.state.get('compiler.lifecycle', { state: 'dormant' })?.state ?? 'dormant'; }

  attachCompiler(adapter) {
    if (!adapter?.compile) throw new TypeError('compiler adapter must expose compile(spec)');
    this.adapter = adapter;
    this.bus?.emit('compiler:bound', { id: adapter.id ?? 'compiler-adapter' });
    return this;
  }

  detachCompiler() {
    const id = this.adapter?.id ?? null;
    this.adapter = null;
    this.bus?.emit('compiler:unbound', { id });
  }

  module(id) { return this.state.get(`compiler.modules.${safeKey(id)}`, null); }

  async ensure(spec = {}) {
    if (!spec.id || !spec.sourceHash) throw new Error('compile spec requires id and sourceHash');
    const target = spec.target ?? 'auto';
    const previous = this.module(spec.id);
    if (previous?.status === 'ready' && previous.sourceHash === spec.sourceHash && previous.target === target) {
      this.bus?.emit('compiler:cache-hit', { id: spec.id, artifactHash: previous.artifactHash });
      return { ...clone(previous), reused: true };
    }
    if (!this.adapter) {
      const error = new Error(`compiler required for ${spec.id}, but no compiler adapter is bound`);
      error.code = 'NO_COMPILER_BOUND';
      throw error;
    }

    await this.state.set('compiler.lifecycle', { state: 'active', moduleId: spec.id, startedAt: this.clock() }, { source: 'dormant-compiler' });
    this.bus?.emit('compiler:wake', { id: spec.id, target });
    try {
      const result = await this.adapter.compile(clone(spec));
      if (!result?.artifactHash) throw new Error('compiler adapter returned no artifactHash');
      const record = {
        id: spec.id, sourceHash: spec.sourceHash, artifactHash: result.artifactHash,
        target: result.target ?? target, artifactRef: result.artifactRef ?? result.location ?? null,
        compiler: this.adapter.id ?? 'compiler-adapter', status: 'ready',
        compiledAt: this.clock(), metadata: clone(result.metadata ?? {}),
      };
      await this.state.set(`compiler.modules.${safeKey(spec.id)}`, record, { source: 'dormant-compiler' });
      this.bus?.emit('compiler:complete', clone(record));
      return { ...clone(record), reused: false };
    } finally {
      await this.state.set('compiler.lifecycle', { state: 'dormant', moduleId: null, sleptAt: this.clock() }, { source: 'dormant-compiler' });
      this.bus?.emit('compiler:sleep', { id: spec.id });
    }
  }

  snapshot() {
    return {
      lifecycle: this.state.get('compiler.lifecycle', { state: 'dormant' }),
      boundCompiler: this.adapter?.id ?? null,
      modules: Object.values(this.state.get('compiler.modules', {}) ?? {}).filter(Boolean),
    };
  }
}

// Compatibility surface retained for the first compiler-spine cut and its tests.
export class DormantCompiler {
  constructor({bus,state,backends}={}){Object.assign(this,{bus,state,backends});this.lifecycle='dormant'}
  async ensure(spec){
    if(!spec?.id||!spec?.sourceHash) throw new Error('compiler spec id/sourceHash required');
    const cached=this.state.get('compiler.artifacts.'+spec.id);
    if(cached?.sourceHash===spec.sourceHash){this.bus?.emit('compiler:cache-hit',{id:spec.id});return {...cached,reused:true}}
    return this.compile(spec);
  }
  async compile(spec){
    this.lifecycle='active'; this.bus?.emit('compiler:woke',{id:spec.id,target:spec.target});
    try{
      const backend=this.backends.get(spec.target);
      if(!backend) throw new Error('compiler backend unavailable: '+spec.target);
      const artifact=await backend.compile(spec);
      const record={id:spec.id,target:spec.target,sourceHash:spec.sourceHash,artifactHash:artifact.artifactHash,location:artifact.location,compiledAt:Date.now()};
      await this.state.set('compiler.artifacts.'+spec.id,record,{source:'dormant-compiler'});
      this.bus?.emit('compiler:complete',record); return {...record,reused:false};
    } finally {
      this.lifecycle='dormant'; this.bus?.emit('compiler:slept',{id:spec.id});
    }
  }
}
export class CompilerBackends {
  constructor(){this.items=new Map()}
  register(target,adapter){if(typeof adapter?.compile!=='function')throw new Error('compile adapter required');this.items.set(target,adapter);return adapter}
  get(target){return this.items.get(target)??null}
}

