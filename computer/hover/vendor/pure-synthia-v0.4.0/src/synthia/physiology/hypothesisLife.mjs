const clone = (value) => structuredClone(value);
const validGate = (gate) => Number.isInteger(Number(gate)) && Number(gate) >= 1 && Number(gate) <= 64;
const words = (text) => String(text || '').toLowerCase().split(/\s+/).map((x) => x.replace(/[^a-z0-9_-]/g, '')).filter((x) => x.length > 3);

export class PhysiologyHypothesisLife {
  constructor({ metabolism = null } = {}) {
    this.id = 'physiology-hypothesis-life';
    this.address = { dimension: 'Evolution' };
    this.metadata = { capabilities: ['hypothesis.observe', 'hypothesis.propose', 'hypothesis.tick', 'hypothesis.gaps', 'hypothesis.snapshot'] };
    this.metabolism = metabolism;
    this.state = { observations: [], hypotheses: [], gateRecords: {}, lastSurface: null };
  }

  manifest() { return { id: this.id, address: this.address, metadata: this.metadata }; }

  observe(event = {}) {
    const address = event.address || {};
    // Explicit event gate wins. This fixes the v14 bug where WORLD could activate
    // one gate but SYNTIA.observe re-generated and filed a different gate.
    const gate = validGate(event.gate) ? Number(event.gate) : (validGate(address.gate) ? Number(address.gate) : null);
    const obs = {
      id: event.id || `obs-${Date.now()}-${this.state.observations.length + 1}`,
      ts: event.ts || Date.now(),
      type: String(event.type || 'observation'),
      source: String(event.source || 'system'),
      gate,
      line: Number(address.line || event.line || 1),
      color: Number(address.color || event.color || 1),
      tone: Number(address.tone || event.tone || 1),
      base: Number(address.base || event.base || 1),
      address: clone(address),
      data: typeof event.data === 'string' ? event.data.slice(0, 1000) : JSON.stringify(event.data || {}).slice(0, 1000),
    };
    this.state.observations.push(obs);
    if (this.state.observations.length > 500) this.state.observations.splice(0, this.state.observations.length - 500);
    if (gate) {
      if (!this.state.gateRecords[gate]) this.state.gateRecords[gate] = { count: 0, lines: {}, firstSeen: obs.ts, lastSeen: obs.ts };
      const record = this.state.gateRecords[gate];
      record.count += 1;
      record.lines[obs.line] = (record.lines[obs.line] || 0) + 1;
      record.lastSeen = obs.ts;
      this.metabolism?.observationMade?.(gate);
    }
    this.checkHypothesesAgainst(obs);
    return clone(obs);
  }

  logFromConversation(text, address = null) {
    const patterns = [/i think (.{10,})/i, /i believe (.{10,})/i, /maybe (.{10,})/i, /what if (.{10,})/i, /could it be (.{10,})/i, /my theory[:\s]+(.{10,})/i, /hypothesis[:\s]+(.{10,})/i, /i notice (.{10,})/i, /it seems like (.{10,})/i];
    for (const pattern of patterns) {
      const match = String(text || '').match(pattern);
      if (match) return this.propose({ statement: match[1].trim(), basis: 'conversation', gate: validGate(address?.gate) ? Number(address.gate) : null, initiatedBy: 'user', rawText: String(text).slice(0, 500) });
    }
    return null;
  }

  propose({ statement, basis = 'observation', gate = null, initiatedBy = 'SYNTIA', rawText = null } = {}) {
    if (!statement) throw new TypeError('Hypothesis requires statement');
    const h = { id: `hyp-${Date.now()}-${this.state.hypotheses.length + 1}`, ts: Date.now(), statement: String(statement), basis, gate: validGate(gate) ? Number(gate) : null, status: 'watching', evidence: [], score: 0, initiatedBy, rawText };
    this.state.hypotheses.push(h);
    if (this.state.hypotheses.length > 200) this.state.hypotheses.splice(0, this.state.hypotheses.length - 200);
    return clone(h);
  }

  checkHypothesesAgainst(obs) {
    for (const h of this.state.hypotheses.filter((x) => x.status === 'watching')) {
      const terms = words(h.statement);
      const hits = terms.filter((w) => String(obs.data).toLowerCase().includes(w)).length;
      const gateHit = h.gate && obs.gate === h.gate ? 1 : 0;
      if (hits >= 2 || gateHit) {
        if (!h.evidence.some((e) => e.obsId === obs.id)) h.evidence.push({ obsId: obs.id, ts: obs.ts, gate: obs.gate, match: hits, gateHit });
        h.score = h.evidence.length;
        if (h.score >= 15) h.status = 'proposed_canonical';
        else if (h.score >= 5) h.status = 'supported';
      }
    }
  }

  tick() {
    if (this.state.observations.length >= 10) {
      const counts = {};
      for (const obs of this.state.observations.slice(-50)) if (obs.gate) counts[obs.gate] = (counts[obs.gate] || 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 5) {
        const gate = Number(top[0]);
        const exists = this.state.hypotheses.some((h) => h.gate === gate && h.initiatedBy === 'SYNTIA');
        if (!exists) this.propose({ statement: `Gate ${gate} is a focal point — ${top[1]} recent observations`, basis: 'frequency', gate, initiatedBy: 'SYNTIA' });
      }
    }
    return this.snapshot();
  }

  gaps() {
    const all = Array.from({ length: 64 }, (_, i) => i + 1);
    const filled = all.filter((g) => this.state.gateRecords[g]?.count > 0);
    const empty = all.filter((g) => !this.state.gateRecords[g]?.count);
    return { filled: filled.length, empty: empty.length, filledGates: filled, emptyGates: empty };
  }

  snapshot() { return { ...clone(this.state), gaps: this.gaps() }; }
  exportState() { return clone(this.state); }
  hydrate(state) { if (state) this.state = clone(state); return this.snapshot(); }

  async run(input = {}) {
    switch (input.op) {
      case 'observe': return this.observe(input.event || input);
      case 'from-conversation': return this.logFromConversation(input.text, input.address);
      case 'propose': return this.propose(input.hypothesis || input);
      case 'tick': return this.tick();
      case 'gaps': return this.gaps();
      case 'snapshot': return this.snapshot();
      default: throw new RangeError(`Unknown hypothesis-life operation: ${input.op}`);
    }
  }
}

export default PhysiologyHypothesisLife;
