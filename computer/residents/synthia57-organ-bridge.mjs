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
});

export class Synthia57OrganBridge {
  constructor({ runtime, mesh, bus = null, residentId = 'synthia' } = {}) {
    if (!runtime) throw new TypeError('Synthia57OrganBridge requires the mounted FederatedSynthia runtime');
    if (!mesh?.registerParticipant || !mesh?.bindHandler) throw new TypeError('Synthia57OrganBridge requires the Computer relational mesh');
    Object.assign(this, { runtime, mesh, bus, residentId: String(residentId) });
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
    const missing = [];
    if (!atoMesh?.get || !(atoMesh.automata instanceof Map)) missing.push('ATO mesh');
    if (!swarm?.submit) missing.push('swarm submit');
    if (!klein?.run) missing.push('klein-analogy');
    if (!system?.executeArtifact) missing.push('integrated execution');
    if (!stateSpace?.execute || !stateSpace?.runInstrument) missing.push('state-space runtime');
    if (missing.length) throw new Error(`Synthia 5.7 organ contract incomplete: ${missing.join(', ')}`);
    return { system, engine, atoMesh, klein, stateSpace, swarm };
  }

  async mount() {
    if (this.mounted) return this.snapshot();
    const { system, atoMesh, klein, stateSpace, swarm } = this.#surfaces();
    const definitions = [
      { id: SYNTHIA57_ORGANS.ATO, capabilities: ['ato.mesh','automata.run','automata.coordinate','automata.catalog'] },
      { id: SYNTHIA57_ORGANS.TOOL_FACTORY, capabilities: ['tool.synthesize','tool.run','tool.grow'] },
      { id: SYNTHIA57_ORGANS.KLEIN, capabilities: ['klein.invoke','klein.analogy','relation.interpret'] },
      { id: SYNTHIA57_ORGANS.EXECUTION, capabilities: ['execution.route','execution.artifact','execution.internal','execution.hybrid','execution.external'] },
      { id: SYNTHIA57_ORGANS.STATE_SPACE, capabilities: ['state-space.execute','state-space.instrument','state-space.catalog'] },
    ];
    for (const def of definitions) {
      await this.mesh.registerParticipant(def.id, {
        kind: 'synthia-organ',
        residency: 'active',
        capabilities: def.capabilities,
        publicState: { residentId: this.residentId, runtime: 'synthia-5.7', organ: def.id.split(':')[1] },
        metadata: { owner: this.residentId, version: '0.5.7' },
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
