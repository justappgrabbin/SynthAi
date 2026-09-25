/**
 * DisseminerOrgan — real DISEMINER semantic field engine
 */
import { DISEMINER } from './legacy/disseminer.js';

export class DisseminerOrgan {
  constructor() {
    this.id = 'disseminer';
    this.capabilities = ['disseminer', 'semantic-fields', 'cooccurrence', 'inference', 'corpus'];
    this.engine = null;
  }

  _ensure() {
    if (!this.engine) {
      this.engine = new DISEMINER({ contextWindow: 7, vectorDimension: 128 });
      // Seed a small bootstrap corpus so inference has something to work with
      const seed = [
        'being exists as persistent form',
        'design organizes topology and edges',
        'movement carries signal through channels',
        'evolution remembers change across time',
        'space perceives the observer and the field',
        'resonance binds gate line color tone base',
        'synthia routes intent through organs and address',
        'autonomous automata step the graph and learn'
      ];
      for (const line of seed) {
        try { this.engine.ingest(line, 'bootstrap'); } catch (e) { console.warn('disseminer seed', e); }
      }
    }
    return this.engine;
  }

  accepts(intent) {
    return /\b(disseminer|diseminer|semantic field|cooccurrence|infer|corpus|vocabulary)\b/i.test(intent);
  }

  async execute({ intent, address, mode = 'complement', graphContext = null }) {
    const engine = this._ensure();
    const input = String(intent || '').trim() || 'resonance field';

    let result = null;
    try {
      if (typeof engine.infer === 'function') {
        result = engine.infer(input);
      } else if (typeof engine.process === 'function') {
        result = engine.process(input);
      } else {
        result = { text: input, note: 'DISEMINER loaded but no infer/process method found' };
      }
    } catch (e) {
      return { ok: false, organ: this.id, error: e.message, address };
    }

    let stats = null;
    try {
      stats = typeof engine.getStats === 'function' ? engine.getStats()
            : typeof engine.getCorpusStats === 'function' ? engine.getCorpusStats()
            : null;
    } catch {}

    const reconstructed = result?.finalText || result?.text || result?.reconstructed || null;
    const path = result?.semanticPath || result?.path || [];

    return {
      ok: true,
      organ: this.id,
      text: reconstructed
        || (Array.isArray(path) && path.length ? path.join(' → ') : null)
        || `DISEMINER processed: ${input}`,
      inference: result,
      stats,
      address,
      mode,
      graphContext: graphContext ? { chartId: graphContext.chartId, nodeIds: [...(graphContext.nodeIds || [])], edgeIds: [...(graphContext.edgeIds || [])], consumedCoordinateCount: (graphContext.nodes || []).length } : null
    };
  }
}

export default DisseminerOrgan;
