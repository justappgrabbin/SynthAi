function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

export function stableSourceId(value) {
  const text = canonical(value);
  let one = 0xdeadbeef ^ text.length;
  let two = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    one = Math.imul(one ^ text.charCodeAt(i), 2654435761);
    two = Math.imul(two ^ text.charCodeAt(i), 1597334677);
  }
  return `source-${(two >>> 0).toString(16).padStart(8, '0')}${(one >>> 0).toString(16).padStart(8, '0')}`;
}

export class SourceMemory {
  constructor() {
    this.originals = new Map();
    this.analyses = new Map();
    this.sequence = 0;
  }

  preserve(content, metadata = {}) {
    const id = stableSourceId({ content, metadata });
    if (!this.originals.has(id)) this.originals.set(id, Object.freeze({ id, content, metadata: Object.freeze({ ...metadata }), seq: ++this.sequence }));
    return this.originals.get(id);
  }

  attachAnalysis(sourceId, analysis) {
    if (!this.originals.has(sourceId)) throw new Error(`Unknown source: ${sourceId}`);
    const record = Object.freeze({ sourceId, analysis: Object.freeze(analysis), seq: ++this.sequence });
    const history = this.analyses.get(sourceId) || [];
    this.analyses.set(sourceId, Object.freeze([...history, record]));
    return record;
  }

  source(id) { return this.originals.get(id) || null; }
  analysisHistory(id) { return this.analyses.get(id) || Object.freeze([]); }
  snapshot() { return Object.freeze({ sequence: this.sequence, originals: [...this.originals.entries()], analyses: [...this.analyses.entries()] }); }
  restore(snapshot) { this.sequence = snapshot.sequence ?? 0; this.originals = new Map(snapshot.originals ?? []); this.analyses = new Map(snapshot.analyses ?? []); return this; }
}
