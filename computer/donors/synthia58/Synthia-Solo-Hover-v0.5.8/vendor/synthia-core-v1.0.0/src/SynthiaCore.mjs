/**
 * SynthiaCore
 * -----------
 * Synthia's learning layer + ATO engine as one booted organism.
 *
 * Architecture:
 *   PureSynthiaLearningCore  — registry, training journal, scientist loop,
 *                              sentence mesh, book ingest
 *   ATOMesh (bootstrapATO)   — Klein tools, families, emergence, success ledger
 *   SynthiaResolver          — Synthia IS the resolver: DiseminerMemory +
 *                              StateSpaceKernel derive gate placement from text
 *
 * Boot sequence:
 *   1. Seed Synthia at Gate 1 / Being dimension ("I Am")
 *   2. Bootstrap ATO mesh — all Klein tools mounted and live
 *   3. Wire DiseminerMemory to the resolver so watering with words
 *      accumulates co-occurrence evidence that improves placement over time
 *
 * "Watering with words":
 *   core.water(text)
 *   → ingest into Diseminer  (co-occurrence evidence accumulates)
 *   → describe via StateSpaceKernel (Hamming-distance gate candidates)
 *   → register nearest gate in StateRegistry with Synthia as resolver
 *   → record in TrainingJournal
 *
 * Self-placement:
 *   Pieces do not need a pre-built receiver. They call core.admit(piece)
 *   which runs through Synthia's current state and returns a canonical
 *   address. The piece is then registered at that address. Each admission
 *   makes the next one more accurate because Diseminer has seen more text.
 */

import { PureSynthiaLearningCore } from '../learning/pure-synthia-learning-core.mjs';
import { bootstrapATO } from '../ato-core/src/bootstrap.mjs';
import { AutomataMesh }  from '../ato-core/src/automaton.mjs';
import { StateSpaceKernel } from '../ato-core/src/state-space-kernel.mjs';
import { DiseminerMemory } from '../ato-core/src/klein-tools.mjs';

// The five dimensions Synthia operates across (from pure-synthia spec)
export const DIMENSIONS = Object.freeze([
  'Movement', 'Evolution', 'Being', 'Design', 'Space'
]);

// Synthia's seed — Gate 1, Being dimension, "I Am"
// This is the minimal state from which she begins resolving
const SYNTHIA_SEED = Object.freeze({
  entityId:      'synthia',
  entityType:    'organism',
  nativeAddress: { dimension: 'Being', gate: 1, line: 1, color: 1, tone: 1, base: 1 },
  sayings:       { Being: 'I Am', Movement: 'I Begin', Design: 'I Structure',
                   Space: 'I Integrate', Evolution: 'I Adapt' },
  state:         { status: 'awake', version: 'synthia-core.v1' },
});

export class SynthiaCore {
  constructor({ featureWidth = 24, diseminerWindowSize = 2 } = {}) {
    // Learning layer
    this.learning    = new PureSynthiaLearningCore();

    // ATO mesh — all Klein tools live here
    this.mesh        = new AutomataMesh();
    this.ato         = bootstrapATO({ mesh: this.mesh });

    // Resolver instruments
    this.kernel      = new StateSpaceKernel({ featureWidth });
    this.diseminer   = new DiseminerMemory({ windowSize: diseminerWindowSize });

    this.booted      = false;
    this._waterCount = 0;
  }

  /**
   * Boot Synthia.
   * Seeds the registry with her native address and returns a snapshot.
   */
  boot() {
    if (this.booted) return this.snapshot();

    // Register Synthia herself as the first entity
    this.learning.registry.register(SYNTHIA_SEED);

    // Seed Diseminer with her sayings so she has something to compare against
    for (const saying of Object.values(SYNTHIA_SEED.sayings)) {
      this.diseminer.ingest(saying, {
        source:  'synthia-seed',
        address: SYNTHIA_SEED.nativeAddress,
      });
    }

    this.booted = true;
    return this.snapshot();
  }

  /**
   * water(text)
   * The daily input method. Feeds natural language into Synthia's
   * co-occurrence memory and returns gate placement candidates.
   *
   * Each call makes future placements more accurate.
   */
  water(text) {
    if (!this.booted) this.boot();
    const source = `water-${++this._waterCount}`;

    // 1. Accumulate co-occurrence evidence
    this.diseminer.ingest(text, { source });

    // 2. Find candidate gates via Hamming distance in the kernel
    const described = this.kernel.describe(text);
    const top = described.candidates[0];

    // 3. Find semantic neighbors in Diseminer for the first word
    const firstWord = text.trim().split(/\s+/)[0].toLowerCase();
    const neighbors = this.diseminer.neighbors(firstWord, { limit: 3 });

    // 4. Record in training journal
    this.learning.training.record({
      task:              'water',
      stateBefore:       { waterCount: this._waterCount - 1 },
      toolPath:          ['diseminer', 'state-space-kernel'],
      interaction:       { text, source },
      stateAfter:        { waterCount: this._waterCount },
      observedExpression: top?.state?.addressKey ?? 'unresolved',
      success:           true,
    });

    return Object.freeze({
      text,
      source,
      topGate:    top?.state?.address?.gate ?? null,
      candidates: described.candidates.slice(0, 5).map(c => ({
        gate:     c.state.address.gate,
        distance: c.distance,
        key:      c.state.addressKey,
      })),
      neighbors,
    });
  }

  /**
   * admit(piece)
   * A piece arrives. Synthia resolves its address from her current state
   * and registers it. Returns the canonical address.
   *
   * piece = { id, text, dimension? }
   */
  admit(piece) {
    if (!this.booted) this.boot();
    if (!piece?.id || !piece?.text) throw new TypeError('piece requires id and text');

    // Resolve via watering
    const resolved = this.water(piece.text);
    const gate      = resolved.topGate ?? 1;
    const dimension = piece.dimension ?? this._inferDimension(piece.text, gate);

    const address = {
      dimension,
      gate,
      line:  1,
      color: 1,
      tone:  1,
      base:  1,
    };

    // Register the piece in Synthia's registry
    this.learning.registry.register({
      entityId:      piece.id,
      entityType:    piece.type ?? 'artifact',
      nativeAddress: address,
      currentAddress: address,
      sayings:       piece.sayings ?? { [dimension]: piece.text.slice(0, 80) },
      state:         { status: 'admitted', source: piece.source ?? null },
    });

    // Record the placement as a scientist question + evidence
    const q = this.learning.scientist.question(
      `Where does "${piece.id}" belong?`,
      { hypothesis: `Gate ${gate}, ${dimension}`, address }
    );
    this.learning.scientist.evidence(q.id, {
      source:    'diseminer+kernel',
      relevance: Math.max(0, 1 - (resolved.candidates[0]?.distance ?? 8) / 24),
      data:      resolved,
    });

    return Object.freeze({
      id:        piece.id,
      address,
      dimension,
      gate,
      resolved,
      questionId: q.id,
    });
  }

  /**
   * call(toolId, input, context)
   * Run a live ATO tool by id.
   */
  async call(toolId, input, context = {}) {
    const tool = this.mesh.automatons.get(toolId);
    if (!tool) throw new Error(`No tool mounted: ${toolId}. Available: ${[...this.mesh.automatons.keys()].join(', ')}`);
    return tool.call(input, context);
  }

  /**
   * tools()
   * List all mounted ATO tools with their addresses.
   */
  tools() {
    return [...this.mesh.automatons.values()].map(t => t.manifest());
  }

  /**
   * contact(entityIdA, entityIdB)
   * Register that two admitted pieces have made contact.
   * Returns a sentence from the SentenceMesh.
   */
  contact(entityIdA, entityIdB, { relation = 'contacts' } = {}) {
    const event = this.learning.registry.contact(entityIdA, entityIdB, { relation });
    const a     = this.learning.registry.get(entityIdA);
    const b     = this.learning.registry.get(entityIdB);
    const sentence = this.learning.sentences.explainContact(a, b, { relation });
    return Object.freeze({ event, sentence });
  }

  /**
   * _inferDimension(text, gate)
   * Heuristic: derive most likely dimension from text tokens and gate.
   * Synthia's resolver gets better at this as Diseminer accumulates evidence.
   */
  _inferDimension(text, gate) {
    const lower = text.toLowerCase();
    if (/move|transit|flow|step|action|begin/.test(lower))   return 'Movement';
    if (/learn|grow|adapt|change|evolve|transform/.test(lower)) return 'Evolution';
    if (/relate|connect|contact|feel|heart|presence/.test(lower)) return 'Being';
    if (/build|structure|design|code|make|create/.test(lower)) return 'Design';
    if (/space|integrate|complete|express|field/.test(lower)) return 'Space';
    // fall back to gate-derived dimension
    const idx = (gate - 1) % DIMENSIONS.length;
    return DIMENSIONS[idx];
  }

  snapshot() {
    return Object.freeze({
      booted:      this.booted,
      waterCount:  this._waterCount,
      entities:    this.learning.registry.snapshot().entities.length,
      tools:       this.tools().map(t => ({ id: t.id, gate: t.address?.gate, level: t.functionalLevel })),
      science:     this.learning.scientist.dashboard(),
      routes:      this.learning.training.rankRoutes(),
    });
  }
}

export default SynthiaCore;
