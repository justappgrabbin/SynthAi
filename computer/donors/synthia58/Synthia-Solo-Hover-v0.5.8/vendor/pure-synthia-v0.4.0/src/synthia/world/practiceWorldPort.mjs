const clone = (value) => {
  try { return structuredClone(value); }
  catch { try { return JSON.parse(JSON.stringify(value)); } catch { return null; } }
};

export class PracticeWorldPort extends EventTarget {
  constructor({ physiology = null } = {}) {
    super();
    this.id = 'practice-world-port';
    this.address = { dimension: 'Space' };
    this.metadata = { capabilities: [
      'world.port.snapshot', 'world.port.observe', 'world.port.act', 'world.port.pull'
    ] };
    this.physiology = physiology;
    this.adapter = null;
    this.unsubscribe = null;
    this.state = {
      connected: false,
      adapterId: null,
      worldRevision: 0,
      lastWorldEvent: null,
      lastSynthiaAction: null,
      externalSnapshot: null,
      eventCount: 0,
      actionCount: 0,
    };
  }

  manifest() { return { id: this.id, address: this.address, metadata: this.metadata }; }

  attach(adapter = null) {
    this.detach();
    if (!adapter) return this.snapshot();
    this.adapter = adapter;
    this.state.connected = true;
    this.state.adapterId = String(adapter.id || adapter.name || 'practice-world');
    if (typeof adapter.subscribe === 'function') {
      const maybeUnsub = adapter.subscribe((event) => this.observe(event));
      if (typeof maybeUnsub === 'function') this.unsubscribe = maybeUnsub;
    }
    this.dispatchEvent(new CustomEvent('world-port', { detail: { type: 'attached', adapterId: this.state.adapterId } }));
    return this.snapshot();
  }

  detach() {
    try { this.unsubscribe?.(); } catch {}
    this.unsubscribe = null;
    this.adapter = null;
    this.state.connected = false;
    this.state.adapterId = null;
  }

  observe(event = {}) {
    const normalized = {
      id: String(event.id || `world-event-${Date.now()}-${this.state.eventCount + 1}`),
      type: String(event.type || 'world_event'),
      source: String(event.source || 'practice-world'),
      summary: String(event.summary || event.text || event.description || event.type || 'world event'),
      address: clone(event.address || (event.gate ? { gate: Number(event.gate) } : null)),
      gate: event.gate == null ? event.address?.gate ?? null : Number(event.gate),
      payload: clone(event.payload ?? event.data ?? null),
      at: event.at || new Date().toISOString(),
    };
    this.state.eventCount += 1;
    this.state.worldRevision += 1;
    this.state.lastWorldEvent = normalized;

    // Preserve explicit gate identity. WorldMemory owns gate-place activation;
    // non-gate events still return through the physiology outcome loop.
    if (Number.isInteger(Number(normalized.gate)) && Number(normalized.gate) >= 1 && Number(normalized.gate) <= 64) {
      this.physiology?.world?.activate?.(Number(normalized.gate), normalized.source, Number(event.strength ?? 0.7), normalized.address);
      this.physiology?.innerLife?.progress?.(event.accepted === false ? 1 : 2);
    } else {
      this.physiology?.observeOutcome?.({ ...normalized, accepted: event.accepted });
    }
    this.dispatchEvent(new CustomEvent('world-port', { detail: { type: 'world:event', event: clone(normalized) } }));
    return clone(normalized);
  }

  async act(action = {}) {
    const normalized = {
      id: String(action.id || `synthia-world-action-${Date.now()}-${this.state.actionCount + 1}`),
      type: String(action.type || action.action || 'world_action'),
      actor: String(action.actor || 'synthia'),
      target: clone(action.target || null),
      address: clone(action.address || null),
      payload: clone(action.payload ?? action.data ?? null),
      reason: action.reason || null,
      at: new Date().toISOString(),
    };
    this.state.actionCount += 1;
    this.state.lastSynthiaAction = normalized;
    this.dispatchEvent(new CustomEvent('world-port', { detail: { type: 'synthia:action', action: clone(normalized) } }));

    let result = null;
    if (typeof this.adapter?.applyAction === 'function') result = await this.adapter.applyAction(clone(normalized));
    else if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
      globalThis.dispatchEvent(new CustomEvent('synthia:world-action', { detail: clone(normalized) }));
      result = { emitted: true, transport: 'CustomEvent' };
    } else result = { emitted: false, reason: 'NO_VISIBLE_WORLD_ATTACHED' };
    return { action: clone(normalized), result: clone(result) };
  }

  async pull() {
    if (typeof this.adapter?.snapshot === 'function') this.state.externalSnapshot = clone(await this.adapter.snapshot());
    return this.snapshot();
  }

  snapshot() { return clone(this.state); }
  exportState() { return this.snapshot(); }
  hydrate(state) {
    if (state) this.state = { ...this.state, ...clone(state), connected: false, adapterId: null };
    return this.snapshot();
  }

  async run(input = {}) {
    switch (input.op) {
      case 'snapshot': return this.snapshot();
      case 'observe': return this.observe(input.event || input);
      case 'act': return this.act(input.action || input);
      case 'pull': return this.pull();
      default: throw new RangeError(`Unknown practice-world operation: ${input.op}`);
    }
  }
}

export default PracticeWorldPort;
