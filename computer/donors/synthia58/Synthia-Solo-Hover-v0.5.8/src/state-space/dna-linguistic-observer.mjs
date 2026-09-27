import { safe } from '../util.mjs';

const ROLE_NAMES = Object.freeze(['alphabet','lexicon','sentence','grammar','phonetics','semantics','first-articulation','second-articulation']);

function changed(before, after, key) {
  return JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null);
}

/**
 * Read-only linguistic instrumentation over resolved SemanticGenome state.
 */
export class DnaLinguisticObserver {
  constructor({ maxHistory = 512 } = {}) {
    this.maxHistory = maxHistory;
    this.history = [];
    this.previousByAgent = new Map();
  }

  observeActivation(activation) {
    if (!activation?.address || !activation?.codon) throw new TypeError('resolved semantic-genome activation required');
    const agentId = activation.agentId ?? 'synthia';
    const previous = this.previousByAgent.get(agentId) ?? null;
    const address = activation.address;
    const vector = activation.codon.sparseSemanticVector ?? [];
    const activeIndices = vector.map((value, index) => ({ index, value })).filter((entry) => Math.abs(entry.value) > 1e-12);

    const record = Object.freeze({
      id: `dna-linguistic-observation:${this.history.length + 1}`,
      sequence: this.history.length + 1,
      agentId,
      sourceActivationId: activation.id,
      roles: Object.freeze({
        alphabet: Object.freeze({ evidence: safe(activation.translation?.genotype?.DNA?.nucleotides ?? activation.codon.resolvedBits ?? []), status: 'OBSERVED_PRIMITIVES' }),
        lexicon: Object.freeze({ evidence: safe({ aminoAcid: activation.translation?.aminoAcid ?? null, semanticAspectIds: activation.codon.semanticAspectIds ?? [] }), status: 'OBSERVED_COMPOSITION' }),
        sentence: Object.freeze({ evidence: safe({ dimensionalField: activation.fiveDimensionalField ?? [], protein: activation.translation?.protein ?? null }), status: 'OBSERVED_COORDINATED_EXPRESSION' }),
        grammar: Object.freeze({ evidence: safe({ address, gateArchitecture: activation.gateArchitecture, lineArchitecture: activation.lineArchitecture }), status: 'OBSERVED_CONSTRAINT_CONTEXT' }),
        phonetics: Object.freeze({ evidence: safe({ sensory: activation.sensoryExpression ?? null, RNA: activation.translation?.RNA ?? null }), status: 'OBSERVED_EXPRESSION_MECHANISM' }),
        semantics: Object.freeze({ evidence: safe({ manifestationClass: activation.manifestationClass, scores: activation.manifestationScores, capabilities: activation.agentCapabilities }), status: 'OBSERVED_EFFECT' }),
        'first-articulation': Object.freeze({ evidence: safe({ dimensions: activation.fiveDimensionalField?.map((entry) => entry.dimension) ?? [], manifestationClass: activation.manifestationClass, phenotype: activation.phenotype ?? null }), status: 'OBSERVED_EXPRESSION' }),
        'second-articulation': Object.freeze({ evidence: safe({ gate: address.gate, line: address.line, color: address.color, tone: address.tone, base: address.base, genotype: activation.genotype ?? null }), status: 'OBSERVED_RESOLUTION' }),
      }),
      sparseState: Object.freeze({ length: vector.length, active: activeIndices.length, values: safe(vector) }),
      transition: previous ? Object.freeze({
        fromActivationId: previous.id,
        changedAddressLayers: Object.freeze(['planetary','dimension','gate','line','color','tone','base','degree','minute','second','arc','zodiac','house'].filter((key) => changed(previous.address, address, key))),
        manifestationChanged: previous.manifestationClass !== activation.manifestationClass,
        semanticVectorL1: Number(vector.reduce((sum, value, index) => sum + Math.abs(value - (previous.codon?.sparseSemanticVector?.[index] ?? 0)), 0).toFixed(6)),
      }) : null,
      provenance: Object.freeze({
        mode: 'read-only-observer',
        source: 'Synthia SemanticGenome runtime activation',
        inspiration: 'Ji linguistic categories',
      }),
    });
    this.history.push(record);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.previousByAgent.set(agentId, activation);
    return record;
  }

  latest(agentId = null) {
    return [...this.history].reverse().find((entry) => !agentId || entry.agentId === agentId) ?? null;
  }

  snapshot() {
    return Object.freeze({
      roles: ROLE_NAMES,
      observations: this.history.length,
      latest: this.latest(),
      status: this.history.length ? 'WIRED' : 'PRESENT',
    });
  }
}
