/**
 * Layer 4 — Temporal Graph (Reverse Fu Xi sequence)
 *
 * Quality: How states evolve through time — the trajectory layer.
 * Reverse Fu Xi reads the binary sequence backward (Heaven→Earth descending),
 * encoding the arrow of time moving from differentiation back to undifferentiated ground.
 *
 * Edges:
 *   - Temporal flow (reverse binary sequence order)
 *   - Phase-history edges (connections weighted by how recently two nodes co-activated)
 *   - Return paths (every node connects back to its Fu Xi mirror)
 *   - Decay edges (high-entropy to low-entropy direction)
 */

import { StateSpaceLayer } from '../StateSpaceLayer.js';
import { HEXAGRAMS } from '../../data/hexagrams.js';
import { SEQUENCES } from '../../data/sequences.js';

export class TemporalGraph extends StateSpaceLayer {
  constructor() {
    super('reverse', 3);
    // Co-activation matrix — updated at runtime
    this.coActivation = new Map(); // 'a:b' → count
  }

  _buildEdges() {
    this.edges = [];
    const seq = SEQUENCES.reverse.sequence;

    // 1. Temporal flow in reverse-Fu Xi order (directed: time flows from high to low binary)
    for (let i = 0; i < 63; i++) {
      this._addEdge(seq[i], seq[i + 1], 1.0, 'temporal_flow', true);
    }

    // 2. Return paths: each node → its Fu Xi counterpart (temporal mirror)
    HEXAGRAMS.forEach(hx => {
      const mirror = 63 - hx.fuxi; // reverseFuxi = 63 - fuxi
      if (mirror !== hx.fuxi) {
        this._addEdge(hx.fuxi, mirror, 0.4, 'temporal_mirror', false);
      }

      // 3. Complement = temporal shadow
      const shadow = hx.fuxi ^ 63;
      if (shadow !== hx.fuxi) {
        this._addEdge(hx.fuxi, shadow, 0.3, 'temporal_shadow', false);
      }

      // 4. Decay edges: hexagrams with more yang lines → hexagrams with fewer
      //    (entropy decrease over time)
      const yangCount = hx.lines.reduce((s, l) => s + l, 0);
      HEXAGRAMS.forEach(other => {
        if (other.fuxi === hx.fuxi) return;
        const otherYang = other.lines.reduce((s, l) => s + l, 0);
        if (otherYang === yangCount - 1) {
          this._addEdge(hx.fuxi, other.fuxi, 0.2, 'decay', true);
        }
      });
    });
  }

  /**
   * Record a co-activation event between two nodes (called by AutoLing engine).
   */
  recordCoActivation(fuxiA, fuxiB) {
    const key = `${Math.min(fuxiA, fuxiB)}:${Math.max(fuxiA, fuxiB)}`;
    this.coActivation.set(key, (this.coActivation.get(key) || 0) + 1);

    // Dynamically strengthen or add co-activation edge
    const existing = this.edges.find(
      e => (e.source === fuxiA && e.target === fuxiB) ||
           (e.source === fuxiB && e.target === fuxiA && e.type === 'co_activation')
    );
    const weight = Math.min(1, (this.coActivation.get(key) || 0) * 0.1);
    if (existing) {
      existing.weight = weight;
    } else {
      this._addEdge(fuxiA, fuxiB, weight, 'co_activation', false);
    }
  }

  _addEdge(source, target, weight, type, directed = false) {
    this.edges.push({ source, target, weight, type, directed });
    const node = this.nodes.get(source);
    if (node) node.edges.push({ target, weight, type, directed });
  }
}
