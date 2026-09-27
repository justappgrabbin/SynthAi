/**
 * Layer 1 — Knowledge Graph (Fu Xi sequence)
 *
 * Quality: Semantic / ontological relationships between hexagrams.
 * Edges encode WHAT each hexagram knows about others:
 *   - complement edges (flip all lines)
 *   - nuclear edges (inner hexagram)
 *   - adjacent-in-sequence (binary neighbors)
 *   - trigram-family edges (shared upper or lower trigram)
 */

import { StateSpaceLayer } from '../StateSpaceLayer.js';
import { HEXAGRAMS } from '../../data/hexagrams.js';

export class KnowledgeGraph extends StateSpaceLayer {
  constructor() {
    super('fuxi', 0);
  }

  _buildEdges() {
    this.edges = [];

    HEXAGRAMS.forEach(hx => {
      const src = hx.fuxi;

      // 1. Complement edge (flip all 6 lines) — maximum semantic opposition
      const comp = hx.fuxi ^ 63;
      if (comp !== src) {
        this._addEdge(src, comp, 1.0, 'complement');
      }

      // 2. Nuclear hexagram edge — inner knowledge / hidden content
      if (hx.nuclearFuxi !== src) {
        this._addEdge(src, hx.nuclearFuxi, 0.7, 'nuclear');
      }

      // 3. Trigram-family: same upper trigram
      HEXAGRAMS.forEach(other => {
        if (other.fuxi === src) return;
        if (other.upper === hx.upper) {
          this._addEdge(src, other.fuxi, 0.4, 'shared_upper');
        }
        if (other.lower === hx.lower) {
          this._addEdge(src, other.fuxi, 0.4, 'shared_lower');
        }
      });

      // 4. Binary adjacent (Hamming distance 1 — single line flip)
      for (let bit = 0; bit < 6; bit++) {
        const neighbor = src ^ (1 << bit);
        if (neighbor !== src && neighbor >= 0 && neighbor < 64) {
          this._addEdge(src, neighbor, 0.6, 'line_flip');
        }
      }
    });
  }

  _addEdge(source, target, weight, type) {
    this.edges.push({ source, target, weight, type });
    const node = this.nodes.get(source);
    if (node) node.edges.push({ target, weight, type });
  }
}
