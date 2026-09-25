/**
 * AutolingOrgan — real 5D FieldEngine surface
 */
import {
  FieldEngine,
  ConsciousnessLayer,
  SemanticNetwork
} from './legacy/5d-autoling-engine.js';

export class AutolingOrgan {
  constructor() {
    this.id = 'autoling';
    this.capabilities = ['language', '5d', 'fieldworker', 'semantic-network', 'dimension', 'consciousness'];
    this.engine = null;
    this.consciousness = null;
    this.bootstrapped = false;
  }

  _ensure() {
    if (this.bootstrapped) return;
    this.engine = new FieldEngine();
    this.consciousness = new ConsciousnessLayer(this.engine);
    this.bootstrapped = true;
  }

  accepts(intent) {
    return /\b(autoling|5d|field|semantic network|dimension|being|design|movement|evolution|space|perceive|consciousness)\b/i.test(intent)
      || /\b(what exists|how organized|how signal|how it changes|who perceives)\b/i.test(intent);
  }

  async execute({ intent, address, mode = 'complement', graphContext = null }) {
    this._ensure();

    // Feed human input into the Space dimension
    let humanResult = null;
    try {
      humanResult = await this.engine.interactWithHuman(String(intent || ''));
    } catch (e) {
      humanResult = { error: e.message };
    }

    // Build a minimal field state from current network so monopole can route
    const triples = this.engine.network?.triples
      ? Array.from(this.engine.network.triples.values())
      : [];
    const fieldState = triples.slice(-12).map((t, i) => ({
      id: String(t.id ?? i),
      being: 0.5 + (i % 3) * 0.1,
      design: 0.4 + (i % 4) * 0.1,
      movement: 0.3 + (i % 5) * 0.1,
      evolution: 0.6 - (i % 3) * 0.05,
      space: 0.7,
      binaryState: 1,
      attractorWeight: 3 + (i % 5),
      activationHistory: [Date.now() - i * 1000],
      tension: 0.2 + (i % 7) * 0.05
    }));

    // If no triples yet, seed one synthetic node so perception still works
    if (fieldState.length === 0) {
      fieldState.push({
        id: 'seed',
        being: 0.8, design: 0.5, movement: 0.4, evolution: 0.6, space: 0.9,
        binaryState: 1, attractorWeight: 5, activationHistory: [Date.now()], tension: 0.3
      });
    }

    const monopole = this.engine.routeMonopole(fieldState);
    const perception = this.consciousness.perceive(fieldState);
    const ui = this.consciousness.generateUIConfig(perception);
    const state = this.engine.exportState();

    const dim = monopole?.activeDimension || 'space';
    const circuit = perception?.observer?.circuit || 'Integration';

    const text = [
      `5D Autoling field active.`,
      `Dominant dimension: ${dim.toUpperCase()}.`,
      `Consciousness circuit: ${circuit}.`,
      `Network holds ${state.network.triples.length} triples / ${state.network.objects.length} objects.`,
      mode === 'mirror' ? 'Mirroring your pattern through the field.' : 'Complementing through the open dimension.'
    ].join(' ');

    return {
      ok: true,
      organ: this.id,
      text,
      dimension: dim,
      circuit,
      monopole,
      perception,
      ui,
      networkSummary: {
        triples: state.network.triples.length,
        objects: state.network.objects.length,
        relations: state.network.relations.length
      },
      humanResult,
      address,
      mode,
      graphContext: graphContext ? { chartId: graphContext.chartId, nodeIds: [...(graphContext.nodeIds || [])], edgeIds: [...(graphContext.edgeIds || [])], consumedCoordinateCount: (graphContext.nodes || []).length } : null
    };
  }
}

export default AutolingOrgan;
