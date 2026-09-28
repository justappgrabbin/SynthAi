function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function stableId(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `geo-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export class GeometryOperatorRegistry {
  constructor() {
    this.candidates = new Map();
    this.retained = new Map();
    this.sequence = 0;
  }

  propose(contract, implementation, evidence = {}) {
    if (!contract?.name || !Array.isArray(contract.inputs) || !Array.isArray(contract.outputs)) {
      throw new TypeError('Operator contract requires name, inputs, and outputs');
    }
    if (typeof implementation !== 'function') throw new TypeError('Operator implementation must be callable');
    const id = stableId(contract);
    const candidate = Object.freeze({ id, contract: Object.freeze({ ...contract }), implementation, evidence: Object.freeze({ ...evidence }), seq: ++this.sequence });
    this.candidates.set(id, candidate);
    return candidate;
  }

  evaluate(id, inputs, verifier) {
    const candidate = this.candidates.get(id) || this.retained.get(id);
    if (!candidate) throw new Error(`Unknown geometry operator: ${id}`);
    const output = candidate.implementation(...inputs);
    const verification = verifier(output);
    const report = Object.freeze({ id, output, verification, retained: Boolean(verification?.passed), seq: ++this.sequence });
    if (verification?.passed) this.retained.set(id, Object.freeze({ ...candidate, acceptedBy: report }));
    return report;
  }

  get(id) { return this.retained.get(id) || null; }
  list() { return [...this.retained.values()].map(({ implementation, ...record }) => Object.freeze(record)); }
}

