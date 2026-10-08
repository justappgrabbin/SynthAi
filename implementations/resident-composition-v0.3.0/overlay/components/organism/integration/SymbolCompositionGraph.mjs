import { sequence } from './SymbolSequence.mjs';

const copy = value => structuredClone(value);
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Shared occurrence membership. No inference from qualities to glyphs. */
export class SymbolCompositionGraph {
  #nodes = new Map();
  #events = [];
  constructor({ memory = null } = {}) {
    this.memory = memory;
    const saved = memory?.get?.('symbol-composition', 'graph')?.value;
    for (const row of saved?.nodes || []) {
      if (row.kind === 'occurrence') this.#nodes.set(row.id, freeze(copy(row)));
      else {
        const members = row.members.map(({ position, id }) => {
          const member = this.#nodes.get(id);
          if (!member) throw new Error(`Missing persisted constituent ${id}`);
          return { position, member };
        });
        this.#nodes.set(row.id, freeze({ ...copy(row), members }));
      }
    }
    this.#events = copy(saved?.events || []);
  }
  #record(type, node) {
    this.#events.push(freeze({ sequence: this.#events.length + 1, type, id: node.id,
      operator: node.operator || null, dependencies: node.members?.map(x => x.member.id) || [],
      provenance: copy(node.provenance || []) }));
    this.memory?.upsert?.('symbol-composition', 'graph', this.snapshot());
    return node;
  }
  occurrence({ id, symbol, address = {}, provenance = [] }) {
    if (typeof id !== 'string' || !id || this.#nodes.has(id)) throw new Error('A new occurrence requires a unique id');
    if (typeof symbol !== 'string' || !symbol) throw new TypeError('An occurrence requires an explicit symbol');
    const node = freeze({ id, kind: 'occurrence', scale: 'grapheme', symbol,
      address: copy(address), provenance: copy(provenance) });
    this.#nodes.set(id, node);
    return this.#record('occurrence-created', node);
  }
  compose(memberIds, { provenance = [] } = {}) {
    if (!Array.isArray(memberIds) || !memberIds.length) throw new TypeError('Composition requires constituents');
    const members = memberIds.map(id => {
      const node = this.#nodes.get(id);
      if (!node) throw new Error(`Unknown constituent ${id}`);
      return node;
    });
    const result = sequence(members);
    if (this.#nodes.has(result.id)) return this.#nodes.get(result.id);
    const node = freeze({ ...result, kind: 'composition', provenance: copy(provenance) });
    this.#nodes.set(node.id, node);
    return this.#record('composition-created', node);
  }
  get(id) { return this.#nodes.get(id) || null; }
  compositions() { return [...this.#nodes.values()].filter(node => node.kind === 'composition'); }
  parents(id) { return this.compositions().filter(node => node.members.some(x => x.member.id === id)); }
  snapshot() {
    return { nodes: [...this.#nodes.values()].map(node => node.kind === 'occurrence' ? copy(node)
      : { ...copy(node), members: node.members.map(x => ({ position: x.position, id: x.member.id })) }),
      events: copy(this.#events) };
  }
}

export default SymbolCompositionGraph;
