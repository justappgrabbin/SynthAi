/**
 * StateSpaceLayer — base class for all 5 layers.
 *
 * Each layer holds 64 HexagramNodes arranged according to its sequence ordering.
 * The layer computes edges between nodes based on its graph-type quality.
 */

import { HexagramNode } from './HexagramNode.js';
import { SEQUENCES, fuxiAtRank } from '../data/sequences.js';
import { BY_FUXI } from '../data/hexagrams.js';

export class StateSpaceLayer {
  constructor(sequenceId, layerIndex) {
    const seq = SEQUENCES[sequenceId];
    if (!seq) throw new Error(`Unknown sequence: ${sequenceId}`);

    this.id = sequenceId;
    this.name = seq.name;
    this.description = seq.description;
    this.layerIndex = layerIndex;  // 0-4
    this.sequence = seq.sequence;  // ordered list of fuxi values

    // 64 nodes indexed by fuxi
    this.nodes = new Map();
    seq.sequence.forEach((fuxi, rank) => {
      const node = new HexagramNode(fuxi, sequenceId, rank);
      this.nodes.set(fuxi, node);
    });

    // Build graph edges (implemented by subclass)
    this.edges = [];
    this._buildEdges();
  }

  getNode(fuxi) { return this.nodes.get(fuxi); }
  getNodeByRank(rank) { return this.nodes.get(this.sequence[rank]); }

  /**
   * Override in subclasses to define edge logic.
   */
  _buildEdges() {
    // Default: sequential edges in layer order
    for (let i = 0; i < 63; i++) {
      const a = this.sequence[i];
      const b = this.sequence[i + 1];
      this.edges.push({ source: a, target: b, weight: 1, type: 'sequential' });
      this.nodes.get(a).edges.push({ target: b, type: 'sequential', weight: 1 });
    }
  }

  /**
   * Advance all nodes one simulation step. Returns list of changing-line events.
   */
  step(dt = 0.016) {
    const events = [];
    this.nodes.forEach(node => {
      const changed = node.step(dt);
      if (changed) {
        const result = node.getChangingResult();
        if (result) events.push({ layerId: this.id, ...result, ts: Date.now() });
      }
    });
    return events;
  }

  /**
   * Apply impulse to a node, used by the AutoLing engine and user interaction.
   */
  activate(fuxi, lineIndex, magnitude = 0.3) {
    const node = this.nodes.get(fuxi);
    if (node) node.impulse(lineIndex, magnitude);
  }

  /**
   * Compute layout positions for visualization (circle by sequence rank).
   */
  computeLayout(width = 800, height = 800) {
    const cx = width / 2, cy = height / 2;
    const r = Math.min(width, height) * 0.42;
    const positions = {};

    this.sequence.forEach((fuxi, rank) => {
      const angle = (rank / 64) * 2 * Math.PI - Math.PI / 2;
      positions[fuxi] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        rank,
      };
    });
    return positions;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      layerIndex: this.layerIndex,
      nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
      edges: this.edges,
    };
  }
}
