/**
 * Layer 3 — State Space (King Wen sequence)
 *
 * Quality: The LIVE layer — current state of the system.
 * King Wen's sequence is relational and narrative: hexagrams are paired
 * (1↔2, 3↔4, etc.) by inversion or complement, encoding the tension
 * of opposites that drives change. This is the layer you "read" in a reading.
 *
 * Edges:
 *   - King Wen pairs (inversion/complement pairs)
 *   - Changing-line transitions (what this state CAN become)
 *   - Nuclear relationships (the state hidden within)
 *   - Sequential King Wen flow
 */

import { StateSpaceLayer } from '../StateSpaceLayer.js';
import { HEXAGRAMS, BY_KW } from '../../data/hexagrams.js';

export class StateSpace extends StateSpaceLayer {
  constructor() {
    super('kingwen', 2);
    this._buildKWPairs();
  }

  _buildKWPairs() {
    // Map fuxi → King Wen pair partner fuxi
    this.kwPairs = new Map();
    for (let i = 0; i < HEXAGRAMS.length; i += 2) {
      const a = HEXAGRAMS.find(h => h.kw === i + 1);
      const b = HEXAGRAMS.find(h => h.kw === i + 2);
      if (a && b) {
        this.kwPairs.set(a.fuxi, b.fuxi);
        this.kwPairs.set(b.fuxi, a.fuxi);
      }
    }
  }

  _buildEdges() {
    this.edges = [];
    const seq = this.sequence; // fuxi values in King Wen order

    // 1. Sequential King Wen flow
    for (let i = 0; i < 63; i++) {
      this._addEdge(seq[i], seq[i + 1], 0.6, 'kw_flow', true);
    }

    // 2. KW pairs (built lazily, applied after _buildKWPairs in constructor)
    // Done in _buildEdgesPostPair()
  }

  _buildEdgesPostPair() {
    HEXAGRAMS.forEach(hx => {
      const src = hx.fuxi;

      // KW partner
      const partner = this.kwPairs?.get(src);
      if (partner !== undefined && partner !== src) {
        this._addEdge(src, partner, 1.0, 'kw_pair', false);
      }

      // Changing-line transitions (all 6 single-line flips = potential future states)
      for (let bit = 0; bit < 6; bit++) {
        const next = src ^ (1 << bit);
        this._addEdge(src, next, 0.7, 'line_change', true);
      }

      // Nuclear
      if (hx.nuclearFuxi !== src) {
        this._addEdge(src, hx.nuclearFuxi, 0.5, 'nuclear', false);
      }
    });
  }

  // Override constructor finalization
  _buildEdges() {
    this.edges = [];
    const seq = this.sequence;
    for (let i = 0; i < 63; i++) {
      this._addEdge(seq[i], seq[i + 1], 0.6, 'kw_flow', true);
    }
    // KW pairs and transitions added after pairs are computed
    // (called from constructor after super(), but pairs not yet built)
    // We schedule post-build:
    Promise.resolve().then(() => this._buildEdgesPostPair());
  }

  _addEdge(source, target, weight, type, directed = false) {
    this.edges.push({ source, target, weight, type, directed });
    const node = this.nodes.get(source);
    if (node) node.edges.push({ target, weight, type, directed });
  }
}
