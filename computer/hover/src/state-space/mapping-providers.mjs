import {
  gateBits,
  gateFromBits,
} from '../../vendor/trainable-assembly-v0.4.2/src/core/state-space/addressing.js';

const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

function fuxiValueForGate(gate) {
  return gateBits(gate).reduce((value, bit, index) => value | (bit << index), 0);
}

function bitsForFuxi(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 63) {
    throw new RangeError(`Fu Xi value must be 0..63, got ${value}`);
  }
  return [0, 1, 2, 3, 4, 5].map((index) => (normalized >> index) & 1);
}

const KING_WEN_SEQUENCE = Object.freeze(
  Array.from({ length: 64 }, (_, index) => fuxiValueForGate(index + 1)),
);
const FU_XI_SEQUENCE = Object.freeze(Array.from({ length: 64 }, (_, index) => index));

// Preserved from the user's Stellar Proximology resonance-engine sequence
// provider. It is deliberately a provider beside King Wen and Fu Xi, not a
// replacement for either one.
export const MAWANGDUI_TRIGRAM_ORDER = Object.freeze([7, 0, 1, 4, 2, 5, 3, 6]);

function mawangduiRank(fuxi) {
  const upperBits = (fuxi >> 3) & 0b111;
  const lowerBits = fuxi & 0b111;
  const upperRank = MAWANGDUI_TRIGRAM_ORDER.indexOf(upperBits);
  const lowerRank = MAWANGDUI_TRIGRAM_ORDER.indexOf(lowerBits);
  return upperRank * 8 + lowerRank;
}

const MAWANGDUI_SEQUENCE = Object.freeze(
  Array.from({ length: 64 }, (_, index) => index)
    .sort((left, right) => mawangduiRank(left) - mawangduiRank(right)),
);

function makeSequenceProvider({ id, name, description, sequence, provenance }) {
  const rankByFuxi = new Map(sequence.map((fuxi, rank) => [fuxi, rank]));
  return Object.freeze({
    id,
    name,
    description,
    provenance: Object.freeze(provenance),
    sequence,
    // These two directions are retained explicitly. In particular, the
    // Mawangdui provider never loses either manuscript-rank -> pattern or
    // pattern -> manuscript-rank information.
    fuxiAtRank(rank) {
      const normalized = Number(rank);
      if (!Number.isInteger(normalized) || normalized < 0 || normalized > 63) {
        throw new RangeError(`${id} rank must be 0..63, got ${rank}`);
      }
      return sequence[normalized];
    },
    rankForFuxi(fuxi) {
      const normalized = Number(fuxi);
      if (!rankByFuxi.has(normalized)) throw new RangeError(`${id} has no Fu Xi value ${fuxi}`);
      return rankByFuxi.get(normalized);
    },
    gateAtRank(rank) {
      return gateFromBits(bitsForFuxi(this.fuxiAtRank(rank)));
    },
    rankForGate(gate) {
      return this.rankForFuxi(fuxiValueForGate(Number(gate)));
    },
  });
}

export const SEQUENCE_PROVIDERS = Object.freeze({
  kingWen: makeSequenceProvider({
    id: 'king-wen',
    name: 'King Wen',
    description: 'Received 1..64 sequence represented without changing the six-line pattern.',
    sequence: KING_WEN_SEQUENCE,
    provenance: {
      status: 'PRESERVED_SOURCE_PROVIDER',
      source: 'stellar-proximology-full-v0.1.0/assets/web/extensions/ato-klein-browser-v040/src/king-wen.mjs',
      url: 'https://github.com/justappgrabbin/stellar-proximology-full-v0.1.0/blob/main/assets/web/extensions/ato-klein-browser-v040/src/king-wen.mjs',
    },
  }),
  fuXi: makeSequenceProvider({
    id: 'fu-xi',
    name: 'Fu Xi',
    description: 'Natural binary order, line one stored as the least-significant bit.',
    sequence: FU_XI_SEQUENCE,
    provenance: {
      status: 'PRESERVED_SOURCE_PROVIDER',
      source: 'stellar-proximology-full-v0.1.0/assets/web/knowledge/biverse/runtimes/isohuman/dist/topology/FuxiEncoder.js',
      url: 'https://github.com/justappgrabbin/stellar-proximology-full-v0.1.0/blob/main/assets/web/knowledge/biverse/runtimes/isohuman/dist/topology/FuxiEncoder.js',
    },
  }),
  mawangdui: makeSequenceProvider({
    id: 'mawangdui',
    name: 'Mawangdui',
    description: 'Silk-manuscript upper-trigram grouping retained as its own ordering.',
    sequence: MAWANGDUI_SEQUENCE,
    provenance: {
      status: 'PRESERVED_SOURCE_PROVIDER',
      source: 'stellar-proximology-full-v0.1.0/assets/web/vendor/resonance-engine/data/sequences.js',
      reconstruction: 'Shaughnessy-1997-labelled upper-trigram grouping in the supplied source',
      url: 'https://github.com/justappgrabbin/stellar-proximology-full-v0.1.0/blob/main/assets/web/vendor/resonance-engine/data/sequences.js',
    },
  }),
});

export function faganBradleyAyanamsa(date = new Date()) {
  const instant = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instant.getTime())) throw new RangeError(`invalid date: ${date}`);
  const start = Date.UTC(instant.getUTCFullYear(), 0, 1);
  const next = Date.UTC(instant.getUTCFullYear() + 1, 0, 1);
  const yearFraction = instant.getUTCFullYear() + (instant.getTime() - start) / (next - start);
  return 24.042044 + (yearFraction - 1950) * (50.29 / 3600);
}

export const ASTROLOGY_FRAME_PROVIDERS = Object.freeze({
  tropical: Object.freeze({
    id: 'tropical',
    name: 'Tropical',
    field: 'Body',
    dimension: 'Being',
    provenance: Object.freeze({
      status: 'PRESERVED_SOURCE_PROVIDER',
      source: 'real_ephemeris-3.py body field',
      url: 'https://github.com/justappgrabbin/stellar-proximology-full-v0.1.0/blob/main/assets/web/services/precision-calculation-donor/backend/python/real_ephemeris-3.py',
    }),
    project(longitude) { return mod(Number(longitude), 360); },
  }),
  sidereal: Object.freeze({
    id: 'sidereal-fagan-bradley',
    name: 'Sidereal · Fagan-Bradley',
    field: 'Mind',
    dimension: 'Evolution',
    provenance: Object.freeze({
      status: 'PRESERVED_SOURCE_PROVIDER',
      source: 'real_ephemeris-3.py mind field',
      url: 'https://github.com/justappgrabbin/stellar-proximology-full-v0.1.0/blob/main/assets/web/services/precision-calculation-donor/backend/python/real_ephemeris-3.py',
    }),
    project(longitude, context = {}) {
      return mod(Number(longitude) - faganBradleyAyanamsa(context.date ?? new Date(0)), 360);
    },
  }),
  draconic: Object.freeze({
    id: 'draconic',
    name: 'Draconic',
    field: 'Heart',
    dimension: 'Space',
    provenance: Object.freeze({
      status: 'PRESERVED_SOURCE_PROVIDER',
      source: 'real_ephemeris-3.py heart field',
      url: 'https://github.com/justappgrabbin/stellar-proximology-full-v0.1.0/blob/main/assets/web/services/precision-calculation-donor/backend/python/real_ephemeris-3.py',
    }),
    project(longitude, context = {}) {
      const northNode = Number(context.northNodeLongitude);
      if (!Number.isFinite(northNode)) throw new TypeError('Draconic projection requires northNodeLongitude');
      return mod(Number(longitude) - northNode, 360);
    },
  }),
});

export class MappingProviderRegistry {
  constructor({ sequences = SEQUENCE_PROVIDERS, astrology = ASTROLOGY_FRAME_PROVIDERS } = {}) {
    this.sequences = sequences;
    this.astrology = astrology;
  }

  gateRecord(gate) {
    const normalized = Number(gate);
    const bits = gateBits(normalized);
    const fuxi = fuxiValueForGate(normalized);
    return Object.freeze({
      gate: normalized,
      bits: Object.freeze(bits),
      fuxi,
      ranks: Object.freeze(Object.fromEntries(
        Object.values(this.sequences).map((provider) => [provider.id, provider.rankForFuxi(fuxi)]),
      )),
    });
  }

  projectAstrology({ longitude, date = new Date(0), northNodeLongitude = null } = {}) {
    if (!Number.isFinite(Number(longitude))) throw new TypeError('astrology projection requires longitude');
    return Object.freeze(Object.fromEntries(Object.values(this.astrology).map((provider) => [
      provider.id,
      Object.freeze({
        field: provider.field,
        dimension: provider.dimension,
        longitude: provider.project(longitude, { date, northNodeLongitude }),
        provenance: provider.provenance,
      }),
    ])));
  }

  snapshot() {
    return Object.freeze({
      sequences: Object.freeze(Object.values(this.sequences).map((provider) => Object.freeze({
        id: provider.id,
        name: provider.name,
        entries: provider.sequence.length,
        bidirectional: true,
        provenance: provider.provenance,
      }))),
      astrology: Object.freeze(Object.values(this.astrology).map((provider) => Object.freeze({
        id: provider.id,
        name: provider.name,
        field: provider.field,
        dimension: provider.dimension,
        provenance: provider.provenance,
      }))),
    });
  }
}

export { fuxiValueForGate, bitsForFuxi, mawangduiRank };

export default MappingProviderRegistry;
