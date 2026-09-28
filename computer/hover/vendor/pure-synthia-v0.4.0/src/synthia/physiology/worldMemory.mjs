const clone = (value) => structuredClone(value);
const validGate = (gate) => Number.isInteger(Number(gate)) && Number(gate) >= 1 && Number(gate) <= 64;

export class PhysiologyWorldMemory {
  constructor({ hypotheses = null, metabolism = null } = {}) {
    this.id = 'physiology-world-memory';
    this.address = { dimension: 'Space' };
    this.metadata = { capabilities: ['world.instruct', 'world.activate', 'world.snapshot', 'world.node'] };
    this.hypotheses = hypotheses;
    this.metabolism = metabolism;
    this.state = {
      map: Array.from({ length: 64 }, (_, i) => ({ gate: i + 1, visited: false, visitCount: 0, lastVisited: null, activated: false, activatedBy: null, coherence: 0, memory: [] })),
      currentGate: null,
      activeGates: [],
      worldAge: 0,
      lastInput: null,
      lastInstruct: null,
      pose: { tonic: 0.5, phasic: 0, feltState: 'present' },
    };
  }

  manifest() { return { id: this.id, address: this.address, metadata: this.metadata }; }

  activate(gate, source = 'system', strength = 0.8, address = null) {
    const g = Number(gate);
    if (!validGate(g)) return null;
    const node = this.state.map[g - 1];
    node.activated = true;
    node.activatedBy = source;
    node.coherence = Math.min(1, node.coherence + Math.max(0, Math.min(1, Number(strength) || 0)) * 0.3);
    node.visited = true;
    node.visitCount += 1;
    node.lastVisited = new Date().toISOString();
    node.memory.push({ ts: Date.now(), source, data: `activated at strength ${Number(strength).toFixed(2)}`, coherence: node.coherence });
    if (node.memory.length > 50) node.memory.splice(0, node.memory.length - 50);
    if (!this.state.activeGates.includes(g)) this.state.activeGates.push(g);
    this.state.currentGate = g;
    this.hypotheses?.observe?.({ type: 'world_activation', source, data: `Gate ${g} activated by ${source}`, gate: g, address: address || { gate: g } });
    this.metabolism?.observationMade?.(g);
    return clone(node);
  }

  instruct({ text, address = null, source = 'conversation', metabolism = null } = {}) {
    const input = String(text || '').trim();
    if (!input) return { activeGates: [], worldAge: this.state.worldAge };
    this.state.lastInput = input;
    this.state.lastInstruct = Date.now();
    const gates = new Set();
    const explicit = input.matchAll(/\bgate\s*(\d{1,2})\b/gi);
    for (const match of explicit) if (validGate(match[1])) gates.add(Number(match[1]));
    if (validGate(address?.gate)) gates.add(Number(address.gate));
    for (const gate of gates) this.activate(gate, source, 0.8, address);
    if (metabolism) this.state.pose = { tonic: metabolism.tonic ?? this.state.pose.tonic, phasic: metabolism.phasic ?? this.state.pose.phasic, feltState: metabolism.feltState || this.state.pose.feltState };
    this.state.worldAge += 1;
    return { activeGates: [...gates], worldAge: this.state.worldAge, currentGate: this.state.currentGate, pose: clone(this.state.pose) };
  }

  node(gate) { return validGate(gate) ? clone(this.state.map[Number(gate) - 1]) : null; }
  snapshot() { return clone(this.state); }
  exportState() { return this.snapshot(); }
  hydrate(state) { if (state) this.state = clone(state); return this.snapshot(); }

  async run(input = {}) {
    switch (input.op) {
      case 'instruct': return this.instruct(input);
      case 'activate': return this.activate(input.gate, input.source, input.strength, input.address);
      case 'node': return this.node(input.gate);
      case 'snapshot': return this.snapshot();
      default: throw new RangeError(`Unknown world-memory operation: ${input.op}`);
    }
  }
}

export default PhysiologyWorldMemory;
