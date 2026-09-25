const clone = value => value === undefined ? undefined : structuredClone(value);

function normalizeManifest(input = {}) {
  const id = String(input.id ?? '').trim();
  const capability = String(input.capability ?? '').trim();
  if (!id) throw new Error('cartridge id required');
  if (!capability) throw new Error('cartridge capability required');
  const rawAutomata = Array.isArray(input.automata) ? input.automata : [];
  if (!rawAutomata.length) throw new Error('cartridge requires at least one automaton');

  const automata = rawAutomata.map((item, index) => {
    const runner = item?.runner ?? {};
    const kind = String(runner.kind ?? 'mesh');
    if (kind !== 'mesh') throw new Error('automaton runner kind must be mesh');
    const target = String(runner.target ?? '').trim();
    const operation = String(runner.operation ?? '').trim();
    if (!target || !operation) throw new Error('mesh automaton runner requires target and operation');
    return {
      id: String(item.id ?? (id + ':automaton:' + (index + 1))),
      name: String(item.name ?? item.id ?? ('Automaton ' + (index + 1))),
      capabilities: [...new Set([...(Array.isArray(item.capabilities) ? item.capabilities : []), capability].map(String))],
      runner: {
        kind,
        target,
        operation,
        payload: clone(runner.payload ?? {}),
      },
    };
  });

  return {
    schema: 'synthia.automata-cartridge/v1',
    id,
    name: String(input.name ?? id),
    version: String(input.version ?? '1'),
    capability,
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : 0,
    dependencies: [...new Set((Array.isArray(input.dependencies) ? input.dependencies : []).map(String).filter(Boolean))],
    health: {
      maxConsecutiveFailures: Math.max(1, Number(input.health?.maxConsecutiveFailures ?? 1)),
    },
    automata,
    provenance: clone(input.provenance ?? {}),
  };
}

export class AutomataCartridgeMagazine {
  constructor({ state, bus = null, automataEngine, automataRegistry, mesh, clock = () => Date.now() } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('AutomataCartridgeMagazine requires StateStore');
    if (!automataEngine?.run) throw new TypeError('AutomataCartridgeMagazine requires AutomataEngine');
    if (!automataRegistry?.register) throw new TypeError('AutomataCartridgeMagazine requires automata Registry');
    if (!mesh?.request) throw new TypeError('AutomataCartridgeMagazine requires mesh runtime');
    Object.assign(this, { state, bus, automataEngine, automataRegistry, mesh, clock });
  }

  #ledger() {
    return this.state.get('automataCartridgeMagazine', {
      records: {},
      events: [],
      lastAssembly: null,
      lastExecution: null,
    });
  }

  async #save(ledger, source = 'automata-cartridge-magazine') {
    return this.state.set('automataCartridgeMagazine', ledger, { source });
  }

  #mount(record) {
    for (const spec of record.manifest.automata) {
      this.automataRegistry.register(spec.id, {
        cartridgeId: record.id,
        name: spec.name,
        capabilities: clone(spec.capabilities),
        execute: async ({ input, context }) => this.#invoke(record.id, spec.id, input, context),
      }, { replace: true });
    }
  }

  async #invoke(cartridgeId, automatonId, input, context) {
    const record = this.#ledger().records[cartridgeId];
    if (!record) throw new Error('cartridge unavailable: ' + cartridgeId);
    if (record.status === 'retired' || record.status === 'sidelined') {
      throw new Error('cartridge inactive: ' + cartridgeId + ' (' + record.status + ')');
    }
    const spec = record.manifest.automata.find(item => item.id === automatonId);
    if (!spec) throw new Error('automaton unavailable: ' + automatonId);
    const routed = await this.mesh.request(spec.runner.target, {
      operation: spec.runner.operation,
      payload: {
        ...clone(spec.runner.payload),
        input: clone(input),
        context: clone(context ?? {}),
        cartridge: {
          id: record.id,
          name: record.manifest.name,
          version: record.manifest.version,
          capability: record.manifest.capability,
        },
        automaton: {
          id: spec.id,
          name: spec.name,
          capabilities: clone(spec.capabilities),
        },
      },
    }, { sourceId: 'cartridge:' + record.id });
    if (!routed?.delivered) throw new Error('automaton target unavailable: ' + spec.runner.target);
    return routed.result;
  }

  async restore() {
    const ledger = this.#ledger();
    for (const record of Object.values(ledger.records ?? {})) {
      if (record?.status !== 'retired') this.#mount(record);
    }
    return this.snapshot();
  }

  async install(manifestInput, { source = 'user', replace = true } = {}) {
    const manifest = normalizeManifest(manifestInput);
    const ledger = this.#ledger();
    const previous = ledger.records[manifest.id] ?? null;
    if (previous && !replace) throw new Error('cartridge already installed: ' + manifest.id);

    const now = this.clock();
    const history = previous
      ? [...(previous.history ?? []), {
          manifest: clone(previous.manifest),
          status: previous.status,
          health: clone(previous.health),
          verification: clone(previous.verification ?? { state: 'unverified', lastPassedAt: null }),
          replacedAt: now,
        }].slice(-20)
      : [];

    const record = {
      id: manifest.id,
      manifest,
      status: 'active',
      source: String(source),
      installedAt: previous?.installedAt ?? now,
      updatedAt: now,
      verification: { state: 'unverified', lastPassedAt: null },
      health: {
        successes: previous?.health?.successes ?? 0,
        failures: previous?.health?.failures ?? 0,
        consecutiveFailures: 0,
        lastSuccessAt: previous?.health?.lastSuccessAt ?? null,
        lastFailureAt: previous?.health?.lastFailureAt ?? null,
        lastError: null,
      },
      history,
      sidelinedAt: null,
      sidelinedReason: null,
    };

    ledger.records[manifest.id] = record;
    ledger.events.push({ type: previous ? 'cartridge:replaced' : 'cartridge:installed', id: manifest.id, at: now, source: String(source) });
    ledger.events = ledger.events.slice(-500);
    await this.#save(ledger);
    this.#mount(record);
    this.bus?.emit(previous ? 'cartridge:replaced' : 'cartridge:installed', this.#public(record));
    return this.#public(record);
  }

  #public(record) {
    return {
      id: record.id,
      name: record.manifest.name,
      version: record.manifest.version,
      capability: record.manifest.capability,
      priority: record.manifest.priority,
      dependencies: clone(record.manifest.dependencies),
      automata: record.manifest.automata.map(item => ({
        id: item.id,
        name: item.name,
        capabilities: clone(item.capabilities),
        runner: { kind: item.runner.kind, target: item.runner.target, operation: item.runner.operation },
      })),
      status: record.status,
      source: record.source,
      installedAt: record.installedAt,
      updatedAt: record.updatedAt,
      health: clone(record.health),
      verification: clone(record.verification ?? { state: 'unverified', lastPassedAt: null }),
      verifiedForPromotion: record.status === 'active' && record.verification?.state === 'runtime-passed',
      historyCount: record.history?.length ?? 0,
      sidelinedAt: record.sidelinedAt,
      sidelinedReason: record.sidelinedReason,
      provenance: clone(record.manifest.provenance),
    };
  }

  list({ includeRetired = true } = {}) {
    return Object.values(this.#ledger().records ?? {})
      .filter(record => includeRetired || record.status !== 'retired')
      .map(record => this.#public(record))
      .sort((a, b) => (b.priority - a.priority) || (b.updatedAt - a.updatedAt) || a.id.localeCompare(b.id));
  }

  #candidates(ledger, capability, excluded) {
    return Object.values(ledger.records ?? {})
      .filter(record =>
        record?.manifest?.capability === capability
        && record.status === 'active'
        && !excluded.has(record.id))
      .sort((a, b) =>
        (b.manifest.priority - a.manifest.priority)
        || ((b.health.successes - b.health.failures) - (a.health.successes - a.health.failures))
        || (b.updatedAt - a.updatedAt)
        || a.id.localeCompare(b.id));
  }

  assemble(capability, { exclude = [] } = {}) {
    const requested = String(capability ?? '').trim();
    if (!requested) throw new Error('capability required');
    const ledger = this.#ledger();
    const excluded = new Set(exclude.map(String));

    const resolve = (need, visiting = new Set()) => {
      if (visiting.has(need)) throw new Error('cartridge dependency cycle at capability: ' + need);
      const nextVisiting = new Set(visiting);
      nextVisiting.add(need);

      for (const candidate of this.#candidates(ledger, need, excluded)) {
        const plan = [];
        let valid = true;
        for (const dependency of candidate.manifest.dependencies) {
          const dependencyPlan = resolve(dependency, nextVisiting);
          if (!dependencyPlan) { valid = false; break; }
          plan.push(...dependencyPlan);
        }
        if (!valid) continue;
        plan.push(candidate);
        const seen = new Set();
        return plan.filter(record => {
          if (seen.has(record.id)) return false;
          seen.add(record.id);
          return true;
        });
      }
      return null;
    };

    const resolved = resolve(requested);
    if (!resolved) throw new Error('no healthy cartridge assembly provides capability: ' + requested);
    const assembly = {
      capability: requested,
      plan: resolved.map(record => ({
        id: record.id,
        capability: record.manifest.capability,
        version: record.manifest.version,
        priority: record.manifest.priority,
        dependencies: clone(record.manifest.dependencies),
        automata: record.manifest.automata.map(item => item.id),
      })),
      automata: resolved.flatMap(record => record.manifest.automata.map(item => item.id)),
      assembledAt: this.clock(),
    };
    return clone(assembly);
  }

  async #markSuccess(id) {
    const ledger = this.#ledger();
    const record = ledger.records[id];
    if (!record) return;
    record.health.successes += 1;
    record.health.consecutiveFailures = 0;
    record.health.lastSuccessAt = this.clock();
    record.health.lastError = null;
    record.verification = { state: 'runtime-passed', lastPassedAt: record.health.lastSuccessAt };
    record.updatedAt = this.clock();
    await this.#save(ledger, 'cartridge-health-success');
  }

  async #markFailure(id, error) {
    const ledger = this.#ledger();
    const record = ledger.records[id];
    if (!record) return null;
    record.health.failures += 1;
    record.health.consecutiveFailures += 1;
    record.health.lastFailureAt = this.clock();
    record.health.lastError = String(error?.message ?? error);
    record.updatedAt = this.clock();
    const threshold = record.manifest.health.maxConsecutiveFailures;
    if (record.health.consecutiveFailures >= threshold) {
      record.status = 'sidelined';
      record.sidelinedAt = this.clock();
      record.sidelinedReason = 'AUTO_DISLODGE_AFTER_FAILURE: ' + record.health.lastError;
      ledger.events.push({ type: 'cartridge:auto-dislodged', id, at: this.clock(), error: record.health.lastError });
    }
    ledger.events = ledger.events.slice(-500);
    await this.#save(ledger, 'cartridge-health-failure');
    this.bus?.emit('cartridge:failure', { id, status: record.status, health: clone(record.health) });
    return this.#public(record);
  }

  async execute(capability, input, context = {}, { maxAttempts = 8 } = {}) {
    const requested = String(capability ?? '').trim();
    if (!requested) throw new Error('capability required');
    const excluded = new Set();
    const failures = [];
    const attempts = Math.max(1, Number(maxAttempts) || 1);

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      let assembly;
      try {
        assembly = this.assemble(requested, { exclude: [...excluded] });
      } catch (error) {
        const final = new Error('auto assembly exhausted for ' + requested + ': ' + String(error?.message ?? error));
        final.failures = clone(failures);
        throw final;
      }

      const results = {};
      let failed = null;
      for (const step of assembly.plan) {
        let current = clone(input);
        try {
          for (const automatonId of step.automata) {
            current = await this.automataEngine.run(automatonId, current, {
              ...clone(context),
              requestedCapability: requested,
              assembly: clone(assembly.plan),
              dependencyResults: clone(results),
              cartridgeId: step.id,
            });
          }
          results[step.capability] = clone(current);
          await this.#markSuccess(step.id);
        } catch (error) {
          failed = { id: step.id, capability: step.capability, error: String(error?.message ?? error) };
          failures.push({ ...failed, attempt });
          excluded.add(step.id);
          await this.#markFailure(step.id, error);
          break;
        }
      }

      if (!failed) {
        const ledger = this.#ledger();
        ledger.lastAssembly = clone(assembly);
        ledger.lastExecution = {
          capability: requested,
          output: clone(results[requested]),
          results: clone(results),
          failures: clone(failures),
          attempts: attempt,
          completedAt: this.clock(),
        };
        await this.#save(ledger, 'cartridge-auto-assembly-complete');
        this.bus?.emit('cartridge:auto-assembly-complete', clone(ledger.lastExecution));
        return {
          ok: true,
          capability: requested,
          output: clone(results[requested]),
          results: clone(results),
          assembly,
          failures,
          attempts: attempt,
        };
      }
    }

    const error = new Error('auto assembly attempt limit reached for ' + requested);
    error.failures = clone(failures);
    throw error;
  }

  async dislodge(id, reason = 'manual-dislodge') {
    const ledger = this.#ledger();
    const record = ledger.records[String(id)];
    if (!record) throw new Error('unknown cartridge: ' + id);
    record.status = 'sidelined';
    record.sidelinedAt = this.clock();
    record.sidelinedReason = String(reason);
    record.updatedAt = this.clock();
    ledger.events.push({ type: 'cartridge:dislodged', id: record.id, at: this.clock(), reason: String(reason) });
    ledger.events = ledger.events.slice(-500);
    await this.#save(ledger, 'cartridge-manual-dislodge');
    return this.#public(record);
  }

  async restoreCartridge(id) {
    const ledger = this.#ledger();
    const record = ledger.records[String(id)];
    if (!record) throw new Error('unknown cartridge: ' + id);
    record.status = 'active';
    record.sidelinedAt = null;
    record.sidelinedReason = null;
    record.health.consecutiveFailures = 0;
    record.updatedAt = this.clock();
    ledger.events.push({ type: 'cartridge:restored', id: record.id, at: this.clock() });
    ledger.events = ledger.events.slice(-500);
    await this.#save(ledger, 'cartridge-restored');
    this.#mount(record);
    return this.#public(record);
  }

  async retire(id, reason = 'retired') {
    const ledger = this.#ledger();
    const record = ledger.records[String(id)];
    if (!record) throw new Error('unknown cartridge: ' + id);
    record.status = 'retired';
    record.sidelinedAt = this.clock();
    record.sidelinedReason = String(reason);
    record.updatedAt = this.clock();
    ledger.events.push({ type: 'cartridge:retired', id: record.id, at: this.clock(), reason: String(reason) });
    ledger.events = ledger.events.slice(-500);
    await this.#save(ledger, 'cartridge-retired');
    return this.#public(record);
  }

  snapshot() {
    const ledger = this.#ledger();
    return {
      schema: 'synthia.automata-cartridge-magazine/v1',
      cartridges: this.list(),
      active: this.list({ includeRetired: false }).filter(item => item.status === 'active').length,
      sidelined: this.list().filter(item => item.status === 'sidelined').length,
      retired: this.list().filter(item => item.status === 'retired').length,
      lastAssembly: clone(ledger.lastAssembly),
      lastExecution: clone(ledger.lastExecution),
      events: clone((ledger.events ?? []).slice(-50)),
    };
  }
}

export default AutomataCartridgeMagazine;
