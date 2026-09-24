const clone = value => {
  if (value === undefined) return undefined;
  try { return structuredClone(value); }
  catch { try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); } }
};

export const SYNTHIA57_ORGANS = Object.freeze({
  ATO: 'synthia:ato',
  TOOL_FACTORY: 'synthia:tool-factory',
  KLEIN: 'synthia:klein',
  EXECUTION: 'synthia:execution',
  STATE_SPACE: 'synthia:state-space',
  BODY: 'synthia:body',
  PHYSIOLOGY: 'synthia:physiology',
  WORLD_PORT: 'synthia:world-port',
  MORPH: 'synthia:morph',
});

export class Synthia57OrganBridge {
  constructor({ runtime, embodiment = null, mesh, bus = null, residentId = 'synthia' } = {}) {
    if (!runtime) throw new TypeError('Synthia57OrganBridge requires the mounted FederatedSynthia runtime');
    if (!mesh?.registerParticipant || !mesh?.bindHandler) throw new TypeError('Synthia57OrganBridge requires the Computer relational mesh');
    Object.assign(this, { runtime, embodiment, mesh, bus, residentId: String(residentId) });
    this.unbind = [];
    this.mounted = false;
  }

  #surfaces() {
    const system = this.runtime.system;
    const engine = system?.engine;
    const atoMesh = engine?.mesh;
    const klein = atoMesh?.get?.('klein-analogy') ?? null;
    const stateSpace = this.runtime.stateSpaceRuntime;
    const swarm = this.runtime.swarm;
    const body = this.embodiment?.body ?? null;
    const physiology = this.runtime.physiology ?? null;
    const worldPort = this.runtime.worldPort ?? null;
    const missing = [];
    if (!atoMesh?.get || !(atoMesh.automata instanceof Map)) missing.push('ATO mesh');
    if (!swarm?.submit) missing.push('swarm submit');
    if (!klein?.run) missing.push('klein-analogy');
    if (!system?.executeArtifact) missing.push('integrated execution');
    if (!stateSpace?.execute || !stateSpace?.runInstrument) missing.push('state-space runtime');
    if (missing.length) throw new Error(`Synthia 5.7 organ contract incomplete: ${missing.join(', ')}`);
    return { system, engine, atoMesh, klein, stateSpace, swarm, body, physiology, worldPort };
  }

  async mount() {
    if (this.mounted) return this.snapshot();
    const { system, atoMesh, klein, stateSpace, swarm, body, physiology, worldPort } = this.#surfaces();
    const definitions = [
      { id: SYNTHIA57_ORGANS.ATO, capabilities: ['ato.mesh','automata.run','automata.coordinate','automata.catalog'] },
      { id: SYNTHIA57_ORGANS.TOOL_FACTORY, capabilities: ['tool.synthesize','tool.run','tool.grow'] },
      { id: SYNTHIA57_ORGANS.KLEIN, capabilities: ['klein.invoke','klein.analogy','relation.interpret'] },
      { id: SYNTHIA57_ORGANS.EXECUTION, capabilities: ['execution.route','execution.artifact','execution.internal','execution.hybrid','execution.external'] },
      { id: SYNTHIA57_ORGANS.STATE_SPACE, capabilities: ['state-space.execute','state-space.instrument','state-space.catalog'] },
      ...(body ? [{ id: SYNTHIA57_ORGANS.BODY, capabilities: ['body.snapshot','body.activate','body.deactivate','body.resonance','body.request'] }] : []),
      ...(physiology ? [{ id: SYNTHIA57_ORGANS.PHYSIOLOGY, capabilities: ['physiology.context','physiology.tick','physiology.observe-outcome','physiology.snapshot'], visibility: 'private' }] : []),
      ...(worldPort ? [{ id: SYNTHIA57_ORGANS.WORLD_PORT, capabilities: ['world.port.snapshot','world.port.observe','world.port.act','world.port.pull'] }] : []),
      ...(typeof this.runtime.morphState === 'function' ? [{ id: SYNTHIA57_ORGANS.MORPH, capabilities: ['morph.state','morph.embodiment'] }] : []),
    ];
    for (const def of definitions) {
      await this.mesh.registerParticipant(def.id, {
        kind: 'synthia-organ',
        residency: 'active',
        capabilities: def.capabilities,
        publicState: { residentId: this.residentId, runtime: 'synthia-5.7', organ: def.id.split(':')[1] },
        metadata: { owner: this.residentId, version: '0.5.7' },
        visibility: def.visibility ?? 'mesh',
      });
      await this.mesh.connect(def.id, this.residentId, { type: 'organ-of', evidence: { runtime: 'synthia-5.7' } });
    }

    this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.ATO, async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'catalog') return [...atoMesh.automata.keys()];
      if (envelope.operation === 'coordinate') return system.coordinatePopulation(p.input, p.options ?? {});
      if (envelope.operation === 'run') {
        const automaton = atoMesh.get(String(p.id));
        if (!automaton?.run) throw new Error(`unknown Synthia ATO automaton: ${p.id}`);
        return automaton.run(clone(p.input), clone(p.context ?? {}));
      }
      throw new Error(`unsupported Synthia ATO operation: ${envelope.operation}`);
    }));

    this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.TOOL_FACTORY, async envelope => {
      const p = envelope.payload ?? {};
      const operation = envelope.operation ?? 'synthesize';
      if (!['synthesize','run'].includes(operation)) throw new Error(`unsupported Synthia Tool Factory operation: ${operation}`);
      const capability = operation === 'run' ? 'tool.run' : 'tool.synthesize';
      const input = operation === 'run'
        ? { op: 'run', id: p.id, input: clone(p.input) }
        : { op: 'synthesize', ...clone(p) };
      const result = await swarm.submit([{
        id: p.taskId ?? `computer-${operation}-${Date.now()}`,
        capability,
        input,
        meta: { replaySafe: true, source: 'computer-relational-mesh' },
      }]);
      return clone(result);
    }));

    this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.KLEIN, async envelope => {
      const p = envelope.payload ?? {};
      if (!['run','invoke','analogy'].includes(envelope.operation ?? 'run')) {
        throw new Error(`unsupported Synthia Klein operation: ${envelope.operation}`);
      }
      return klein.run(clone(p.input ?? p), clone(p.context ?? {}));
    }));

    this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.EXECUTION, async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'execute-artifact') return system.executeArtifact(clone(p.artifact ?? p.input ?? p), clone(p.context ?? {}));
      if (envelope.operation === 'route') return system.route(clone(p.task ?? p.input ?? p), clone(p.context ?? {}));
      throw new Error(`unsupported Synthia execution operation: ${envelope.operation}`);
    }));

    this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.STATE_SPACE, async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'execute') return stateSpace.execute(clone(p.input ?? p), clone(p.context ?? {}));
      if (envelope.operation === 'instrument') return stateSpace.runInstrument(String(p.id), clone(p.input), clone(p.context ?? {}));
      if (envelope.operation === 'catalog') return stateSpace.catalog();
      throw new Error(`unsupported Synthia state-space operation: ${envelope.operation}`);
    }));

    if (body) this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.BODY, async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'snapshot') return body.snapshot();
      if (envelope.operation === 'activate') return body.activate(String(p.id));
      if (envelope.operation === 'deactivate') return body.deactivate(String(p.id));
      if (envelope.operation === 'resonance') return body.selectByResonance(clone(p.field ?? p.input ?? []));
      if (envelope.operation === 'request') return body.request(String(p.id), clone(p.task), clone(p.context ?? {}));
      throw new Error(`unsupported Synthia body operation: ${envelope.operation}`);
    }));

    if (physiology) this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.PHYSIOLOGY, async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'context') return physiology.context();
      if (envelope.operation === 'tick') return physiology.tick();
      if (envelope.operation === 'observe-outcome') return physiology.observeOutcome(clone(p.outcome ?? p));
      if (envelope.operation === 'snapshot') return physiology.snapshot();
      throw new Error(`unsupported Synthia physiology operation: ${envelope.operation}`);
    }));

    if (worldPort) this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.WORLD_PORT, async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'snapshot') return worldPort.snapshot();
      if (envelope.operation === 'pull') return worldPort.pull();
      if (envelope.operation === 'observe') return worldPort.observe(clone(p.event ?? p));
      if (envelope.operation === 'act') return worldPort.act(clone(p.action ?? p));
      throw new Error(`unsupported Synthia world-port operation: ${envelope.operation}`);
    }));

    if (typeof this.runtime.morphState === 'function') this.unbind.push(this.mesh.bindHandler(SYNTHIA57_ORGANS.MORPH, async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'state') return this.runtime.morphState(clone(p.spec ?? p.input ?? p), clone(p.context ?? {}));
      if (envelope.operation === 'embodiment') return this.runtime.embodimentMorph(clone(p.spec ?? p.input ?? p), clone(p.context ?? {}));
      throw new Error(`unsupported Synthia morph operation: ${envelope.operation}`);
    }));

    this.mounted = true;
    this.bus?.emit('synthia57:organs-mounted', this.snapshot());
    return this.snapshot();
  }

  async unmount() {
    for (const fn of this.unbind.splice(0)) fn();
    for (const id of Object.values(SYNTHIA57_ORGANS)) {
      if (this.mesh.participant(id)) await this.mesh.setResidency(id, 'offline');
    }
    this.mounted = false;
    this.bus?.emit('synthia57:organs-unmounted', { residentId: this.residentId });
    return true;
  }

  snapshot() {
    return {
      mounted: this.mounted,
      residentId: this.residentId,
      organs: Object.values(SYNTHIA57_ORGANS)
        .map(id => this.mesh.resolvePresence(id))
        .filter(Boolean),
    };
  }
}

export default Synthia57OrganBridge;
