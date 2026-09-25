/**
 * Layer 5 — Dependency Graph (Complement Fu Xi sequence)
 *
 * Quality: What depends on what — prerequisite / enabling relationships.
 * Complement Fu Xi maps each hexagram to its line-opposite, revealing
 * the shadow dependencies: what must exist for something else to exist.
 *
 * Edges:
 *   - Complement pairs (A depends on its shadow to define itself)
 *   - Shared-trigram dependencies (same family = prerequisite lineage)
 *   - Yang-count dependencies (more complex depends on simpler)
 *   - Cross-layer nuclear dependencies
 */

import { StateSpaceLayer } from '../StateSpaceLayer.js';
import { HEXAGRAMS } from '../../data/hexagrams.js';
import { SEQUENCES } from '../../data/sequences.js';

export class DependencyGraph extends StateSpaceLayer {
  constructor() {
    super('complement', 4);
  }

  _buildEdges() {
    this.edges = [];
    const seq = SEQUENCES.complement.sequence;

    // 1. Sequential dependency in complement order
    for (let i = 0; i < 63; i++) {
      this._addEdge(seq[i], seq[i + 1], 0.5, 'complement_flow', true);
    }

    HEXAGRAMS.forEach(hx => {
      const src = hx.fuxi;

      // 2. Complement dependency: A and its complement are co-dependent
      const comp = src ^ 63;
      if (comp !== src) {
        this._addEdge(src, comp, 1.0, 'complement_pair', false);
      }

      // 3. Yang-count dependency: higher yang-count depends on lower
      //    (complexity emerges from simplicity)
      const yangCount = hx.lines.reduce((s, l) => s + l, 0);
      HEXAGRAMS.forEach(other => {
        if (other.fuxi === src) return;
        const otherYang = other.lines.reduce((s, l) => s + l, 0);
        if (otherYang === yangCount - 1) {
          // src depends on other (simpler precedes complex)
          this._addEdge(src, other.fuxi, 0.6, 'yang_dependency', true);
        }
      });

      // 4. Shared lower trigram dependency (same ground = shared dependency)
      HEXAGRAMS.forEach(other => {
        if (other.fuxi === src) return;
        if (other.lower === hx.lower) {
          this._addEdge(src, other.fuxi, 0.35, 'shared_ground', false);
        }
      });

      // 5. Nuclear dependency (every hexagram depends on what's hidden inside it)
      if (hx.nuclearFuxi !== src) {
        this._addEdge(src, hx.nuclearFuxi, 0.8, 'nuclear_dependency', true);
      }
    });
  }

  /**
   * Compute dependency depth from a given node (BFS).
   * Returns map of fuxi → depth.
   */
  getDependencyDepth(startFuxi) {
    const depths = new Map([[startFuxi, 0]]);
    const queue = [startFuxi];
    while (queue.length > 0) {
      const current = queue.shift();
      const node = this.nodes.get(current);
      if (!node) continue;
      node.edges
        .filter(e => e.directed)
        .forEach(e => {
          if (!depths.has(e.target)) {
            depths.set(e.target, depths.get(current) + 1);
            queue.push(e.target);
          }
        });
    }
    return depths;
  }

  _addEdge(source, target, weight, type, directed = false) {
    this.edges.push({ source, target, weight, type, directed });
    const node = this.nodes.get(source);
    if (node) node.edges.push({ target, weight, type, directed });
  }
}
