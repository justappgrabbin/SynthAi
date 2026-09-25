/**
 * HexagramNode — one of 64 nodes in each State Space layer.
 *
 * Each node IS a phase space: its 6 lines are 6 continuous axes.
 * A "changing line" occurs when a line's phase value crosses a threshold,
 * transforming this hexagram into another.
 *
 * PhaseState per line: { value [0-1], velocity, tension, changingThreshold }
 */

import { BY_FUXI } from '../data/hexagrams.js';
import { OntologicalAddress, rootAddress, addressesForNode, PLANETS } from './OntologicalAddress.js';

const CHANGING_THRESHOLD = 0.85; // line starts changing above this value
const TENSION_DECAY = 0.95;

export class HexagramNode {
  constructor(fuxi, layerId, sequenceRank) {
    const hx = BY_FUXI[fuxi];
    if (!hx) throw new Error(`No hexagram for fuxi=${fuxi}`);

    this.fuxi = fuxi;
    this.kw = hx.kw;
    this.name = hx.name;
    this.char = hx.char;
    this.keyword = hx.keyword;
    this.lower = hx.lower;
    this.upper = hx.upper;
    this.layerId = layerId;
    this.sequenceRank = sequenceRank; // position within this layer's ordering

    // 6-dimensional phase space — one axis per line
    this.phase = hx.lines.map((classical, i) => ({
      axis: i + 1,            // line number 1-6
      classical,              // 0 (yin) or 1 (yang) — resting attractor
      value: classical * 0.5 + 0.25 + (Math.random() - 0.5) * 0.05, // near classical
      velocity: 0,
      tension: 0,
      changing: false,        // true when crossing threshold
      changingType: null,     // '6yin' (old yin → yang) or '9yang' (old yang → yin)
    }));

    // Node metadata
    this.complement = fuxi ^ 63;              // fuxi value of complement hexagram
    this.reverse = 63 - fuxi;                 // fuxi value of reverse
    this.nuclear = hx.nuclearFuxi;            // nuclear hexagram
    this.createdAt = Date.now();
    this.energy = 0.5;                        // overall node energy 0-1
    this.history = [];                        // phase snapshots for temporal layer
    this.tools = [];                          // tools generated from changing lines here
    this.edges = [];                          // graph edges (set by layer)

    // Ontological address — root address for this gate (line 1, color 1, tone 1, base 1)
    try {
      this.address = OntologicalAddress.forGate(hx.kw);
    } catch(e) {
      this.address = null;
    }
  }

  /**
   * Step the phase space forward by dt.
   * Lines are attracted back to their classical values (0 or 1 mapped to 0.25/0.75).
   */
  step(dt = 0.016) {
    let anyChanging = false;

    this.phase.forEach(axis => {
      const attractor = axis.classical === 1 ? 0.75 : 0.25;
      const attraction = (attractor - axis.value) * 0.1;
      axis.velocity = (axis.velocity + attraction + axis.tension * 0.05) * 0.98;
      axis.value = Math.max(0, Math.min(1, axis.value + axis.velocity * dt * 60));
      axis.tension *= TENSION_DECAY;

      // Detect changing line
      const wasChanging = axis.changing;
      axis.changing = axis.value > CHANGING_THRESHOLD || axis.value < (1 - CHANGING_THRESHOLD);
      if (axis.changing) {
        anyChanging = true;
        // Old yin (6) = yin line that changes to yang: value was near 0, now pushed up
        // Old yang (9) = yang line that changes to yin: value was near 1, now pushed down
        axis.changingType = axis.value > CHANGING_THRESHOLD ? '9yang' : '6yin';
      } else {
        axis.changingType = null;
      }
    });

    // Snapshot for temporal layer (sampled, not every frame)
    if (Math.random() < 0.02) {
      this.history.push({
        t: Date.now(),
        phase: this.phase.map(a => ({ value: a.value, changing: a.changing })),
      });
      if (this.history.length > 50) this.history.shift();
    }

    this.energy = this.phase.reduce((s, a) => s + Math.abs(a.velocity), 0) / 6;
    return anyChanging;
  }

  /**
   * Apply an impulse to a specific line axis (external perturbation).
   * This is how the user or the AutoLing engine "activates" a line.
   */
  impulse(lineIndex, magnitude = 0.3) {
    if (lineIndex < 0 || lineIndex > 5) return;
    this.phase[lineIndex].tension += magnitude;
    this.phase[lineIndex].velocity += (Math.random() - 0.5) * magnitude;
  }

  /**
   * Compute which lines are currently changing and what hexagram they resolve to.
   * Returns null if no lines are changing.
   */
  getChangingResult() {
    const changingLines = this.phase
      .map((a, i) => ({ ...a, index: i }))
      .filter(a => a.changing);

    if (changingLines.length === 0) return null;

    // Flip the changing lines to produce the resultant hexagram
    const newLines = this.phase.map((a, i) => {
      if (a.changing) {
        return a.changingType === '9yang' ? 0 : 1; // yang→yin or yin→yang
      }
      return a.classical;
    });

    const resultFuxi = newLines.reduce((acc, l, i) => acc + l * (1 << i), 0);

    return {
      fromFuxi: this.fuxi,
      toFuxi: resultFuxi,
      changingLines: changingLines.map(a => ({
        lineNumber: a.axis,
        type: a.changingType,
        value: a.value,
      })),
      newLines,
    };
  }

  /**
   * Serialize node state for API response.
   */
  toJSON() {
    return {
      fuxi: this.fuxi,
      kw: this.kw,
      name: this.name,
      char: this.char,
      keyword: this.keyword,
      lower: this.lower,
      upper: this.upper,
      layerId: this.layerId,
      sequenceRank: this.sequenceRank,
      complement: this.complement,
      reverse: this.reverse,
      nuclear: this.nuclear,
      energy: this.energy,
      phase: this.phase,
      changingLines: this.phase
        .filter(a => a.changing)
        .map(a => ({ line: a.axis, type: a.changingType, value: a.value })),
      tools: this.tools.map(t => t.id),
      address: this.address ? this.address.toString() : null,
      addressData: this.address ? {
        gate: this.address.gate,
        ZOD: this.address.ZOD,
        H: this.address.H,
        zodiac: this.address.zodiac,
        DEG: this.address.DEG,
        MIN: this.address.MIN,
        SEC: this.address.SEC,
      } : null,
    };
  }
}
