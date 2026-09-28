import { gateBits } from '../../vendor/trainable-assembly-v0.4.2/src/core/state-space/addressing.js';
import { fnv1a32, stableStringify } from '../primitives/index.mjs';
import { safe } from '../util.mjs';

export const DIMENSION_TRANSLATION_ROLES = Object.freeze({
  Design: 'DNA',
  Movement: 'RNA',
  Being: 'Ribosome',
  Evolution: 'AminoAcid',
  Space: 'Protein',
});

export const EXPRESSION_POLARITY = Object.freeze({
  Yin: 'genotype',
  Yang: 'phenotype',
});

export const DNA_DIGRAM_ALPHABET = Object.freeze({
  '00': 'T',
  '01': 'G',
  '10': 'A',
  '11': 'C',
});

export const RNA_DIGRAM_ALPHABET = Object.freeze({
  '00': 'U',
  '01': 'G',
  '10': 'A',
  '11': 'C',
});

export const NUCLEOTIDE_PHASE = Object.freeze({
  A: '+1',
  C: '+i',
  T: '-1',
  G: '-i',
});

export const NUCLEOTIDE_BINARY_PROPERTIES = Object.freeze({
  A: Object.freeze({ purinePyrimidine: 1, aminoKeto: 1, hydrogenBondClass: 0 }),
  C: Object.freeze({ purinePyrimidine: 0, aminoKeto: 1, hydrogenBondClass: 1 }),
  G: Object.freeze({ purinePyrimidine: 1, aminoKeto: 0, hydrogenBondClass: 1 }),
  T: Object.freeze({ purinePyrimidine: 0, aminoKeto: 0, hydrogenBondClass: 0 }),
});

const AMINO_ACIDS = Object.freeze({
  F: Object.freeze({ code: 'F', three: 'Phe', name: 'Phenylalanine' }),
  L: Object.freeze({ code: 'L', three: 'Leu', name: 'Leucine' }),
  I: Object.freeze({ code: 'I', three: 'Ile', name: 'Isoleucine' }),
  M: Object.freeze({ code: 'M', three: 'Met', name: 'Methionine' }),
  V: Object.freeze({ code: 'V', three: 'Val', name: 'Valine' }),
  S: Object.freeze({ code: 'S', three: 'Ser', name: 'Serine' }),
  P: Object.freeze({ code: 'P', three: 'Pro', name: 'Proline' }),
  T: Object.freeze({ code: 'T', three: 'Thr', name: 'Threonine' }),
  A: Object.freeze({ code: 'A', three: 'Ala', name: 'Alanine' }),
  Y: Object.freeze({ code: 'Y', three: 'Tyr', name: 'Tyrosine' }),
  H: Object.freeze({ code: 'H', three: 'His', name: 'Histidine' }),
  Q: Object.freeze({ code: 'Q', three: 'Gln', name: 'Glutamine' }),
  N: Object.freeze({ code: 'N', three: 'Asn', name: 'Asparagine' }),
  K: Object.freeze({ code: 'K', three: 'Lys', name: 'Lysine' }),
  D: Object.freeze({ code: 'D', three: 'Asp', name: 'Aspartic acid' }),
  E: Object.freeze({ code: 'E', three: 'Glu', name: 'Glutamic acid' }),
  C: Object.freeze({ code: 'C', three: 'Cys', name: 'Cysteine' }),
  W: Object.freeze({ code: 'W', three: 'Trp', name: 'Tryptophan' }),
  R: Object.freeze({ code: 'R', three: 'Arg', name: 'Arginine' }),
  G: Object.freeze({ code: 'G', three: 'Gly', name: 'Glycine' }),
  STOP: Object.freeze({ code: '*', three: 'Stop', name: 'Stop' }),
});

const CODON_GROUPS = Object.freeze({
  F: ['UUU', 'UUC'],
  L: ['UUA', 'UUG', 'CUU', 'CUC', 'CUA', 'CUG'],
  I: ['AUU', 'AUC', 'AUA'],
  M: ['AUG'],
  V: ['GUU', 'GUC', 'GUA', 'GUG'],
  S: ['UCU', 'UCC', 'UCA', 'UCG', 'AGU', 'AGC'],
  P: ['CCU', 'CCC', 'CCA', 'CCG'],
  T: ['ACU', 'ACC', 'ACA', 'ACG'],
  A: ['GCU', 'GCC', 'GCA', 'GCG'],
  Y: ['UAU', 'UAC'],
  STOP: ['UAA', 'UAG', 'UGA'],
  H: ['CAU', 'CAC'],
  Q: ['CAA', 'CAG'],
  N: ['AAU', 'AAC'],
  K: ['AAA', 'AAG'],
  D: ['GAU', 'GAC'],
  E: ['GAA', 'GAG'],
  C: ['UGU', 'UGC'],
  W: ['UGG'],
  R: ['CGU', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
  G: ['GGU', 'GGC', 'GGA', 'GGG'],
});

export const STANDARD_RNA_CODON_TABLE = Object.freeze(Object.fromEntries(
  Object.entries(CODON_GROUPS).flatMap(([aminoCode, codons]) => codons.map((codon) => [codon, AMINO_ACIDS[aminoCode]])),
));

export const AMINO_ACID_ORDER = Object.freeze([
  'F', 'L', 'I', 'M', 'V', 'S', 'P', 'T', 'A', 'Y',
  'H', 'Q', 'N', 'K', 'D', 'E', 'C', 'W', 'R', 'G', 'STOP',
]);

const RNA_COMPLEMENT = Object.freeze({ A: 'U', U: 'A', C: 'G', G: 'C' });
const DNA_BASE_ORDER = Object.freeze(['A', 'C', 'G', 'T']);

function hashId(prefix, value) {
  return `${prefix}:${fnv1a32(stableStringify(value))}`;
}

function oneHot(value, values) {
  const index = values.indexOf(value);
  return Object.freeze(values.map((_entry, position) => position === index ? 1 : 0));
}

function codonAnticodon(rnaCodon) {
  const paired3to5 = [...rnaCodon].map((base) => RNA_COMPLEMENT[base]).join('');
  return Object.freeze({
    codon5to3: rnaCodon,
    pairedAnticodon3to5: paired3to5,
    anticodon5to3: [...paired3to5].reverse().join(''),
  });
}

function nucleotideState(base, digram, position) {
  const properties = NUCLEOTIDE_BINARY_PROPERTIES[base];
  return Object.freeze({
    position,
    base,
    digram,
    phase: NUCLEOTIDE_PHASE[base],
    binaryProperties: properties,
    xorClosure: properties.purinePyrimidine ^ properties.aminoKeto,
  });
}

export function gateTranslationTopology(gate) {
  const bits = Object.freeze(gateBits(Number(gate)).map(Number));
  const digrams = Object.freeze([
    `${bits[0]}${bits[1]}`,
    `${bits[2]}${bits[3]}`,
    `${bits[4]}${bits[5]}`,
  ]);
  const dnaBases = Object.freeze(digrams.map((digram) => DNA_DIGRAM_ALPHABET[digram]));
  const rnaBases = Object.freeze(digrams.map((digram) => RNA_DIGRAM_ALPHABET[digram]));
  const dnaCodon = dnaBases.join('');
  const rnaCodon = rnaBases.join('');
  const aminoAcid = STANDARD_RNA_CODON_TABLE[rnaCodon];
  if (!aminoAcid) throw new Error(`RNA codon did not resolve: ${rnaCodon}`);
  const nucleotides = Object.freeze(dnaBases.map((base, index) => nucleotideState(base, digrams[index], index + 1)));
  const aminoIndex = AMINO_ACID_ORDER.indexOf(aminoAcid.name === 'Stop' ? 'STOP' : aminoAcid.code);
  const neuralVector = Object.freeze([
    ...bits,
    ...dnaBases.flatMap((base) => oneHot(base, DNA_BASE_ORDER)),
    ...AMINO_ACID_ORDER.map((_entry, index) => index === aminoIndex ? 1 : 0),
    rnaCodon === 'AUG' ? 1 : 0,
    aminoAcid.name === 'Stop' ? 1 : 0,
  ]);
  return Object.freeze({
    gate: Number(gate),
    bits,
    digrams,
    dna: Object.freeze({ bases: dnaBases, codon: dnaCodon, nucleotides }),
    rna: Object.freeze({ bases: rnaBases, codon: rnaCodon }),
    aminoAcid,
    start: rnaCodon === 'AUG',
    stop: aminoAcid.name === 'Stop',
    neuralVector,
  });
}

export function translateGate(gate) {
  const topology = gateTranslationTopology(gate);
  const anticodon = codonAnticodon(topology.rna.codon);
  return Object.freeze({
    ...topology,
    tRNA: Object.freeze({
      ...anticodon,
      aminoAcid: topology.aminoAcid,
      adapterId: hashId('trna-adapter', { codon: topology.rna.codon, anticodon, aminoAcid: topology.aminoAcid }),
    }),
  });
}

function peptideOneLetter(aminoAcids) {
  return aminoAcids.map((entry) => entry.code).join('');
}

function peptideThreeLetter(aminoAcids) {
  return aminoAcids.map((entry) => entry.three).join('-');
}

export class BiologicalTranslationRuntime {
  constructor({ maxHistory = 1024, maxOpenChain = 256 } = {}) {
    this.maxHistory = maxHistory;
    this.maxOpenChain = maxOpenChain;
    this.history = [];
    this.streams = new Map();
    this.completedProteins = [];
  }

  #stream(agentId) {
    const key = String(agentId ?? 'synthia');
    if (!this.streams.has(key)) {
      this.streams.set(key, {
        agentId: key,
        aminoAcids: [],
        sourceStateIds: [],
        adapters: [],
        sequence: 0,
      });
    }
    return this.streams.get(key);
  }

  translateActivation({
    agentId = 'synthia',
    sourceActivationId = null,
    resolvedState,
    address,
    expression = null,
    context = {},
  } = {}) {
    if (!address || !resolvedState?.stateId) throw new TypeError('resolved state and address required');
    const unit = translateGate(address.gate);
    const stream = this.#stream(agentId);
    const previousAminoAcid = stream.aminoAcids.at(-1) ?? null;
    const previousAdapter = stream.adapters.at(-1) ?? null;
    const adapter = Object.freeze({
      ...unit.tRNA,
      sourceStateId: resolvedState.stateId,
      relation: 'mRNA-codon-to-amino-acid',
    });

    if (!unit.stop) {
      stream.aminoAcids.push(unit.aminoAcid);
      stream.sourceStateIds.push(resolvedState.stateId);
      stream.adapters.push(adapter);
      if (stream.aminoAcids.length > this.maxOpenChain) {
        stream.aminoAcids.shift();
        stream.sourceStateIds.shift();
        stream.adapters.shift();
      }
    }
    stream.sequence += 1;

    const chainAminoAcids = Object.freeze(stream.aminoAcids.map((entry) => Object.freeze({ ...entry })));
    const proteinCore = Object.freeze({
      oneLetterSequence: peptideOneLetter(chainAminoAcids),
      threeLetterSequence: peptideThreeLetter(chainAminoAcids),
      aminoAcids: chainAminoAcids,
      length: chainAminoAcids.length,
      sourceStateIds: Object.freeze([...stream.sourceStateIds]),
      terminated: unit.stop,
    });
    const proteinId = hashId('protein', { agentId, proteinCore });
    const genotype = Object.freeze({
      id: hashId('genotype', { stateId: resolvedState.stateId, dna: unit.dna, gate: address.gate }),
      polarity: 'Yin',
      expression: EXPRESSION_POLARITY.Yin,
      stateId: resolvedState.stateId,
      address: safe(address),
      DNA: unit.dna,
      gateBits: unit.bits,
    });
    const phenotype = Object.freeze({
      id: hashId('phenotype', { proteinId, stateId: resolvedState.stateId, expression: safe(expression) }),
      polarity: 'Yang',
      expression: EXPRESSION_POLARITY.Yang,
      stateId: resolvedState.stateId,
      protein: Object.freeze({ id: proteinId, ...proteinCore }),
      projections: safe(expression),
    });
    const ribosome = Object.freeze({
      id: hashId('ribosome-state', { stateId: resolvedState.stateId, codon: unit.rna.codon, sequence: stream.sequence }),
      stateId: resolvedState.stateId,
      mRNA: Object.freeze({ codon5to3: unit.rna.codon, bases: unit.rna.bases }),
      tRNA: adapter,
      rRNA: Object.freeze({ role: 'ribosomal-core', stateId: resolvedState.stateId }),
      sites: Object.freeze({
        A: adapter,
        P: previousAminoAcid ? Object.freeze({ aminoAcid: previousAminoAcid }) : null,
        E: previousAdapter ? Object.freeze({ adapterId: previousAdapter.adapterId }) : null,
      }),
    });
    const translation = Object.freeze({
      id: hashId('translation-state', {
        stateId: resolvedState.stateId,
        genotypeId: genotype.id,
        phenotypeId: phenotype.id,
        adapterId: adapter.adapterId,
      }),
      sourceActivationId,
      agentId,
      sourceStateId: resolvedState.stateId,
      dimensions: Object.freeze({
        Design: Object.freeze({ role: DIMENSION_TRANSLATION_ROLES.Design, state: genotype.DNA }),
        Movement: Object.freeze({
          role: DIMENSION_TRANSLATION_ROLES.Movement,
          state: Object.freeze({
            RNA: unit.rna,
            mRNA: ribosome.mRNA,
            tRNA: adapter,
            rRNA: ribosome.rRNA,
          }),
        }),
        Being: Object.freeze({ role: DIMENSION_TRANSLATION_ROLES.Being, state: ribosome }),
        Evolution: Object.freeze({ role: DIMENSION_TRANSLATION_ROLES.Evolution, state: unit.aminoAcid }),
        Space: Object.freeze({ role: DIMENSION_TRANSLATION_ROLES.Space, state: phenotype.protein }),
      }),
      genotype,
      RNA: Object.freeze({
        mRNA: ribosome.mRNA,
        tRNA: adapter,
        rRNA: ribosome.rRNA,
      }),
      ribosome,
      aminoAcid: unit.aminoAcid,
      protein: phenotype.protein,
      phenotype,
      yinYang: Object.freeze({
        Yin: genotype.id,
        Yang: phenotype.id,
        relation: 'encoded-to-expressed-state',
      }),
      start: unit.start,
      stop: unit.stop,
      neuralVector: unit.neuralVector,
      context: safe(context),
    });

    this.history.push(translation);
    if (this.history.length > this.maxHistory) this.history.shift();

    if (unit.stop) {
      this.completedProteins.push(Object.freeze({
        id: proteinId,
        agentId,
        completedAtTranslationId: translation.id,
        ...proteinCore,
      }));
      if (this.completedProteins.length > this.maxHistory) this.completedProteins.shift();
      stream.aminoAcids = [];
      stream.sourceStateIds = [];
      stream.adapters = [];
    }

    return translation;
  }

  relate(leftTranslation, rightTranslation, context = {}) {
    if (!leftTranslation?.id || !rightTranslation?.id) throw new TypeError('two translation states required');
    const state = Object.freeze({
      id: hashId('translation-relation', {
        left: leftTranslation.id,
        right: rightTranslation.id,
        context: safe(context),
      }),
      leftTranslationId: leftTranslation.id,
      rightTranslationId: rightTranslation.id,
      genotypePair: Object.freeze([leftTranslation.genotype.id, rightTranslation.genotype.id]),
      phenotypePair: Object.freeze([leftTranslation.phenotype.id, rightTranslation.phenotype.id]),
      aminoAcidPair: Object.freeze([safe(leftTranslation.aminoAcid), safe(rightTranslation.aminoAcid)]),
      adapterPair: Object.freeze([leftTranslation.RNA.tRNA.adapterId, rightTranslation.RNA.tRNA.adapterId]),
      proteinPossibilityId: hashId('relational-protein-state', {
        left: leftTranslation.protein.id,
        right: rightTranslation.protein.id,
        context: safe(context),
      }),
      context: safe(context),
    });
    return state;
  }

  latest(agentId = null) {
    return [...this.history].reverse().find((entry) => !agentId || entry.agentId === agentId) ?? null;
  }

  snapshot() {
    return Object.freeze({
      dimensionRoles: DIMENSION_TRANSLATION_ROLES,
      polarity: EXPRESSION_POLARITY,
      gateCodonCount: 64,
      RNAForms: Object.freeze(['mRNA', 'tRNA', 'rRNA']),
      aminoAcidStates: AMINO_ACID_ORDER.length,
      translations: this.history.length,
      openStreams: this.streams.size,
      completedProteins: this.completedProteins.length,
      latest: safe(this.latest()),
    });
  }
}

export default BiologicalTranslationRuntime;
