const clone = (value) => {
  try { return structuredClone(value); }
  catch { try { return JSON.parse(JSON.stringify(value)); } catch { return null; } }
};

function uniqueStrings(values = []) {
  return [...new Set(Array.from(values || []).filter((v) => v != null).map(String))].sort();
}

export function capabilitiesOf(target) {
  if (!target) return [];
  const manifest = typeof target.manifest === 'function' ? (() => { try { return target.manifest(); } catch { return null; } })() : null;
  const identityCaps = target.identity?.what?.value?.capabilities || target.identity?.what?.capabilities;
  return uniqueStrings(
    target.metadata?.capabilities ||
    target.capabilities ||
    manifest?.metadata?.capabilities ||
    identityCaps ||
    []
  );
}

export function targetAddress(target) {
  if (!target) return null;
  const manifest = typeof target.manifest === 'function' ? (() => { try { return target.manifest(); } catch { return null; } })() : null;
  return clone(target.address || manifest?.address || target.identity?.address || null);
}

function executorFor(target) {
  if (typeof target?.call === 'function') return (input, context) => target.call(input, context);
  if (typeof target?.run === 'function') return (input, context) => target.run(input, context);
  if (typeof target?.execute === 'function') return (input, context) => target.execute(input, context);
  if (typeof target?.invoke === 'function') return (input, context) => target.invoke(input, context);
  return null;
}

function captureTarget(target) {
  if (!target) return null;
  if (typeof target.exportState === 'function') {
    try { return { kind: 'exportState', value: clone(target.exportState()) }; }
    catch { /* Some coordinator-owned state contains live functions; fall through to observational snapshot. */ }
  }
  if ('ownedState' in target) {
    const value = clone(target.ownedState);
    if (value !== null || target.ownedState === null) return { kind: 'ownedState', value };
  }
  if (typeof target.snapshot === 'function') {
    try { return { kind: 'snapshot', value: clone(target.snapshot()) }; } catch { /* observational only */ }
  }
  return { kind: 'none', value: null };
}

function restoreTarget(target, captured) {
  if (!target || !captured || captured.kind === 'none') return { restored: false, reason: 'NO_RESTORABLE_STATE' };
  const state = clone(captured.value);
  const compatibleState = 'ownedState' in target ? reviveLike(target.ownedState, state) : state;
  if (typeof target.hydrate === 'function') { target.hydrate(compatibleState); return { restored: true, mechanism: 'hydrate' }; }
  if (typeof target.importState === 'function') { target.importState(compatibleState); return { restored: true, mechanism: 'importState' }; }
  if (captured.kind === 'ownedState' || captured.kind === 'exportState') {
    if ('ownedState' in target) {
      target.ownedState = compatibleState;
      return { restored: true, mechanism: 'ownedState' };
    }
  }
  return { restored: false, reason: 'SNAPSHOT_IS_OBSERVATIONAL' };
}

// Runtime snapshots written before the typed Map/Set persistence format used
// ordinary JSON objects. Reconstruct those values against the freshly booted
// organ's state shape rather than assigning a structurally incompatible object.
function reviveLike(template, value) {
  if (template instanceof Map) {
    if (value instanceof Map) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return new Map(Object.entries(value).map(([key, member]) => {
        const prior = template.get(key);
        return [key, reviveLike(prior, member)];
      }));
    }
    return new Map();
  }
  if (template instanceof Set) {
    if (value instanceof Set) return value;
    return new Set(Array.isArray(value) ? value : []);
  }
  if (Array.isArray(template)) {
    return Array.isArray(value) ? value.map((member, index) => reviveLike(template[index], member)) : [];
  }
  if (template && typeof template === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(template);
    // Engines, ledgers, and other executable class instances carry methods on
    // their prototypes. Rebuild their enumerable data over the live prototype
    // instead of replacing them with inert plain objects.
    if (prototype && prototype !== Object.prototype && prototype !== null) {
      const restored = Object.create(prototype);
      for (const key of new Set([...Object.keys(template), ...Object.keys(value)])) {
        restored[key] = Object.prototype.hasOwnProperty.call(value, key)
          ? reviveLike(template[key], value[key])
          : template[key];
      }
      return restored;
    }
    return Object.fromEntries(Object.entries(value).map(([key, member]) => [key, reviveLike(template[key], member)]));
  }
  return value;
}

export class ProcessAdapter {
  constructor({ id, target, capabilities = null, group = 'general', address = undefined, maxConcurrency = 1, location = 'local', metadata = {}, execute = null } = {}) {
    if (!id) throw new TypeError('ProcessAdapter requires id');
    this.id = String(id);
    this.target = target || null;
    this.group = String(group || 'general');
    this.capabilities = Object.freeze(uniqueStrings(capabilities ?? capabilitiesOf(target)));
    this.address = address === undefined ? targetAddress(target) : clone(address);
    this.location = location;
    this.maxConcurrency = Math.max(1, Number(maxConcurrency) || 1);
    this.metadata = Object.freeze({ ...metadata });
    this.executor = execute || executorFor(target);
    if (typeof this.executor !== 'function') throw new TypeError(`Process ${this.id} has no executable call/run/execute/invoke function`);
    this.active = 0;
    this.calls = 0;
    this.lifecycle = 'ready';
    this.waiters = [];
    this.history = [];
  }

  async #acquire() {
    if (this.active < this.maxConcurrency) { this.active += 1; return; }
    await new Promise((resolve) => this.waiters.push(resolve));
    this.active += 1;
  }

  #release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next) next();
  }

  async invoke(input, context = {}) {
    await this.#acquire();
    const sequence = ++this.calls;
    this.lifecycle = 'active';
    const startedAt = Date.now();
    try {
      const output = await this.executor(input, { ...context, workerId: this.id, process: this });
      const record = { sequence, status: 'complete', startedAt, completedAt: Date.now() };
      this.history.push(record);
      this.lifecycle = 'ready';
      return output;
    } catch (error) {
      this.history.push({ sequence, status: 'failed', startedAt, completedAt: Date.now(), error: error?.message || String(error) });
      this.lifecycle = 'error';
      throw error;
    } finally {
      this.#release();
    }
  }

  checkpoint() {
    return Object.freeze({
      id: this.id,
      group: this.group,
      address: clone(this.address),
      capabilities: this.capabilities,
      location: this.location,
      maxConcurrency: this.maxConcurrency,
      calls: this.calls,
      lifecycle: this.lifecycle,
      state: captureTarget(this.target),
      history: clone(this.history.slice(-64)),
      metadata: clone(this.metadata),
    });
  }

  restore(checkpoint) {
    if (!checkpoint || checkpoint.id !== this.id) return { restored: false, reason: 'CHECKPOINT_ID_MISMATCH' };
    this.calls = Number(checkpoint.calls || 0);
    this.lifecycle = checkpoint.lifecycle || 'ready';
    this.history = clone(checkpoint.history || []);
    return restoreTarget(this.target, checkpoint.state);
  }

  manifest() {
    return Object.freeze({
      id: this.id,
      group: this.group,
      address: clone(this.address),
      capabilities: this.capabilities,
      location: this.location,
      maxConcurrency: this.maxConcurrency,
      active: this.active,
      calls: this.calls,
      lifecycle: this.lifecycle,
      metadata: clone(this.metadata),
    });
  }
}

export default ProcessAdapter;
