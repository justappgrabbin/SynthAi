/**
 * Layer 2 — Causal Graph (Mawangdui sequence)
 *
 * Quality: Cause-effect relationships between hexagrams.
 * The Mawangdui ordering groups by upper trigram, revealing how one state
 * produces or is produced by another — directional causation.
 *
 * Edge types:
 *   - sequential causation (A causes B in Mawangdui order)
 *   - inversion (rotating hexagram 180° — upper/lower swap → causal reversal)
 *   - single-line change (one step of causation)
 *   - within-group (same upper trigram family → shared causal origin)
 */

import { StateSpaceLayer } from '../StateSpaceLayer.js';
import { HEXAGRAMS } from '../../data/hexagrams.js';
import { SEQUENCES } from '../../data/sequences.js';

export class CausalGraph extends StateSpaceLayer {
  constructor() {
    super('mawangdui', 1);
  }

  _buildEdges() {
    this.edges = [];
    const seq = SEQUENCES.mawangdui.sequence;

    // 1. Sequential causal flow in Mawangdui order
    for (let i = 0; i < 63; i++) {
      this._addEdge(seq[i], seq[i + 1], 1.0, 'causal_sequential', true);
    }

    HEXAGRAMS.forEach(hx => {
      const src = hx.fuxi;

      // 2. Inversion (rotate hexagram — upper becomes lower, lower becomes upper)
      //    = swap bits 0-2 with bits 3-5
      const lowerBits = hx.fuxi & 0b000111;
      const upperBits = (hx.fuxi >> 3) & 0b000111;
      const inverted = (lowerBits << 3) | upperBits;
      if (inverted !== src) {
        this._addEdge(src, inverted, 0.8, 'inversion', true); // directional causation
      }

      // 3. Complement (reverse all lines) — total causal opposition
      const comp = src ^ 63;
      if (comp !== src) {
        this._addEdge(src, comp, 0.5, 'causal_complement', false);
      }

      // 4. Within-group edges (same upper trigram → shared causal origin)
      const upperBitsHx = (src >> 3) & 0b111;
      HEXAGRAMS.forEach(other => {
        if (other.fuxi === src) return;
        const upperBitsOther = (other.fuxi >> 3) & 0b111;
        if (upperBitsOther === upperBitsHx) {
          this._addEdge(src, other.fuxi, 0.3, 'same_cause_family', false);
        }
      });
    });
  }

  _addEdge(source, target, weight, type, directed = false) {
    this.edges.push({ source, target, weight, type, directed });
    const node = this.nodes.get(source);
    if (node) node.edges.push({ target, weight, type, directed });
  }
}
