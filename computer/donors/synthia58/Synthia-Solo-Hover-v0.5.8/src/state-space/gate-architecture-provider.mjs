import {
  GATES,
  GATE_WHEEL,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/human-design.js';
import {
  CANONICAL_CHANNELS,
  channelPartners,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';

const ZODIAC = Object.freeze([
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]);

const CENTER_BIOLOGY = Object.freeze({
  Head: Object.freeze(['Pineal Gland']),
  Ajna: Object.freeze(['Pituitary Glands']),
  Throat: Object.freeze(['Thyroid', 'Parathyroid Glands']),
  G: Object.freeze(['Liver', 'Blood']),
  Heart: Object.freeze(['Thymus Gland', 'Heart', 'Stomach', 'Gall Bladder']),
  Spleen: Object.freeze(['Spleen', 'Lymphatic System']),
  Sacral: Object.freeze(['Ovaries', 'Testes']),
  Solar: Object.freeze(['Kidney', 'Pancreas', 'Nervous System']),
  Root: Object.freeze(['Adrenal Glands']),
});

// User-confirmed live center ownership. These records intentionally do not
// mutate the preserved donor files. In particular, the top Head center is
// Gate 64 (left), Gate 61 (middle), and Gate 63 (right).
export const AUTHORITATIVE_GATE_CENTERS = Object.freeze({
  1: 'G', 2: 'G', 3: 'Sacral', 4: 'Ajna', 5: 'Sacral', 6: 'Solar',
  7: 'G', 8: 'Throat', 9: 'Sacral', 10: 'G', 11: 'Ajna', 12: 'Throat',
  13: 'G', 14: 'Sacral', 15: 'G', 16: 'Throat', 17: 'Ajna', 18: 'Spleen',
  19: 'Root', 20: 'Throat', 21: 'Heart', 22: 'Solar', 23: 'Throat',
  24: 'Ajna', 25: 'G', 26: 'Heart', 27: 'Sacral', 28: 'Spleen',
  29: 'Sacral', 30: 'Solar', 31: 'Throat', 32: 'Spleen', 33: 'Throat',
  34: 'Sacral', 35: 'Throat', 36: 'Solar', 37: 'Solar', 38: 'Root',
  39: 'Root', 40: 'Heart', 41: 'Root', 42: 'Sacral', 43: 'Ajna',
  44: 'Spleen', 45: 'Throat', 46: 'G', 47: 'Ajna', 48: 'Spleen',
  49: 'Solar', 50: 'Spleen', 51: 'Heart', 52: 'Root', 53: 'Root',
  54: 'Root', 55: 'Solar', 56: 'Throat', 57: 'Spleen', 58: 'Root',
  59: 'Sacral', 60: 'Root', 61: 'Head', 62: 'Throat', 63: 'Head', 64: 'Head',
});

const T = (...values) => Object.freeze(values);

// Astrological labels and the three thematic filters supplied by the user.
// They are stored as project source data, not presented as scientific proof.
const ASTROLOGY = Object.freeze({
  1: ['Scorpio', T('Transcendence', 'Sex', 'Death/Regeneration')],
  2: ['Taurus', T('Materialism', 'Practicality', 'Inertia')],
  3: ['Aries/Taurus', T('Desire/Will', 'Impulse', 'Materialism')],
  4: ['Leo', T('Self-expression', 'Pleasure', 'Authority')],
  5: ['Sagittarius', T('Philosophy', 'Religion', 'Idealism')],
  6: ['Virgo', T('Mental Detail', 'Service', 'Judgment')],
  7: ['Leo', T('Self-expression', 'Pleasure', 'Authority')],
  8: ['Taurus/Gemini', T('Materialism', 'Changeability', 'Expansion')],
  9: ['Sagittarius', T('Philosophy', 'Religion', 'Idealism')],
  10: ['Sagittarius/Capricorn', T('Philosophy', 'Ambition', 'Status')],
  11: ['Sagittarius', T('Philosophy', 'Religion', 'Idealism')],
  12: ['Gemini', T('Changeability', 'Duality', 'Expansion')],
  13: ['Aquarius', T('Science', 'Humanitarianism', 'Music')],
  14: ['Scorpio/Sagittarius', T('Transcendence', 'Philosophy', 'Idealism')],
  15: ['Gemini/Cancer', T('Changeability', 'Sensitivity', 'Home/Family')],
  16: ['Gemini', T('Changeability', 'Duality', 'Expansion')],
  17: ['Aries', T('Desire', 'Will', 'Impulse/Courage')],
  18: ['Libra', T('Comparison', 'Appreciation', 'Evaluation')],
  19: ['Aquarius', T('Science', 'Humanitarianism', 'Music')],
  20: ['Gemini', T('Changeability', 'Duality', 'Expansion')],
  21: ['Aries', T('Desire', 'Will', 'Impulse/Courage')],
  22: ['Pisces', T('Openness', 'Devotion', 'Conflict')],
  23: ['Taurus', T('Materialism', 'Practicality', 'Inertia')],
  24: ['Taurus', T('Materialism', 'Practicality', 'Inertia')],
  25: ['Pisces/Aries', T('Openness', 'Desire/Will', 'Courage')],
  26: ['Sagittarius', T('Philosophy', 'Religion', 'Idealism')],
  27: ['Taurus', T('Materialism', 'Practicality', 'Inertia')],
  28: ['Scorpio', T('Transcendence', 'Sex', 'Death/Regeneration')],
  29: ['Leo/Virgo', T('Self-expression', 'Service', 'Judgment')],
  30: ['Aquarius/Pisces', T('Science', 'Openness', 'Devotion')],
  31: ['Leo', T('Self-expression', 'Pleasure', 'Authority')],
  32: ['Libra', T('Comparison', 'Appreciation', 'Evaluation')],
  33: ['Leo', T('Self-expression', 'Pleasure', 'Authority')],
  34: ['Sagittarius', T('Philosophy', 'Religion', 'Idealism')],
  35: ['Gemini', T('Changeability', 'Duality', 'Expansion')],
  36: ['Pisces', T('Openness', 'Devotion', 'Conflict')],
  37: ['Pisces', T('Openness', 'Devotion', 'Conflict')],
  38: ['Capricorn', T('Ambition', 'Government', 'Status')],
  39: ['Cancer', T('Receptivity', 'Sensitivity', 'Home/Family')],
  40: ['Virgo', T('Mental Detail', 'Service', 'Judgment')],
  41: ['Aquarius', T('Science', 'Humanitarianism', 'Music')],
  42: ['Aries', T('Desire', 'Will', 'Impulse/Courage')],
  43: ['Scorpio', T('Transcendence', 'Sex', 'Death/Regeneration')],
  44: ['Scorpio', T('Transcendence', 'Sex', 'Death/Regeneration')],
  45: ['Gemini', T('Changeability', 'Duality', 'Expansion')],
  46: ['Virgo/Libra', T('Service', 'Comparison', 'Appreciation')],
  47: ['Virgo', T('Mental Detail', 'Service', 'Judgment')],
  48: ['Libra', T('Comparison', 'Appreciation', 'Evaluation')],
  49: ['Aquarius', T('Science', 'Humanitarianism', 'Music')],
  50: ['Libra/Scorpio', T('Appreciation', 'Transcendence', 'Sex')],
  51: ['Aries', T('Desire', 'Will', 'Impulse/Courage')],
  52: ['Cancer', T('Receptivity', 'Sensitivity', 'Home/Family')],
  53: ['Cancer', T('Receptivity', 'Sensitivity', 'Home/Family')],
  54: ['Capricorn', T('Ambition', 'Government', 'Status')],
  55: ['Pisces', T('Openness', 'Devotion', 'Conflict')],
  56: ['Cancer/Leo', T('Sensitivity', 'Self-expression', 'Pleasure')],
  57: ['Libra', T('Comparison', 'Appreciation', 'Evaluation')],
  58: ['Capricorn', T('Ambition', 'Government', 'Status')],
  59: ['Virgo', T('Mental Detail', 'Service', 'Judgment')],
  60: ['Capricorn/Aquarius', T('Ambition', 'Science', 'Humanitarianism')],
  61: ['Capricorn', T('Ambition', 'Government', 'Status')],
  62: ['Cancer', T('Receptivity', 'Sensitivity', 'Home/Family')],
  63: ['Pisces', T('Openness', 'Devotion', 'Conflict')],
  64: ['Virgo', T('Mental Detail', 'Service', 'Judgment')],
});

// User-supplied Black Book line-expression index. Gate 34 was only supplied
// partially, so its two supplied expressions are merged with the preserved
// donor rather than inventing the four missing titles.
const USER_LINE_EXPRESSIONS = Object.freeze({
  1: T('Creation', 'Love', 'Energy', 'Alone', 'Attracting', 'Self-expression'),
  2: T('Intuition', 'Genius', 'Patience', 'Secretiveness', 'Intelligent Application', 'Fixation'),
  3: T('Synthesis', 'Immaturity', 'Survival', 'Charisma', 'Victimization', 'Surrender'),
  4: T('Pleasure', 'Acceptance', 'Irresponsibility', 'The Liar', 'Seduction', 'Excess'),
  5: T('Perseverance', 'Inner Peace', 'Compulsiveness', 'The Hunter', 'Joy', 'Yielding'),
  6: T('Retreat', 'The Guerrilla', 'Allegiance', 'Triumph', 'Arbitration', 'The Peacemaker'),
  7: T('Authoritarian', 'The Democrat', 'The Anarchist', 'The Abdicator', 'The General', 'The Administrator'),
  8: T('Honesty', 'Service', 'The phoney', 'Respect', 'Dharma', 'Communion'),
  9: T('Sensibility', 'Misery Loves Company', 'The Straw', 'Dedication', 'Faith', 'Gratitude'),
  10: T('Modesty', 'The Hermit', 'The Martyr', 'The Opportunist', 'The Heretic', 'The Role Model'),
  11: T('Attunement', 'Rigour', 'The Realist', 'The Teacher', 'The Philanthropist', 'Adaptability'),
  12: T('The Monk', 'Purification', 'Confession', 'The Prophet', 'The Pragmatist', 'Metamorphosis'),
  13: T('Empathy', 'Bigotry', 'Pessimism', 'Fatigue', 'The Savior', 'Optimism'),
  14: T('Money', 'Management', 'Service', 'Security', 'Arrogance', 'Humility'),
  15: T('Duty', 'Influence', 'Ego inflation', 'The Wallflower', 'Sensitivity', 'Self-defense'),
  16: T('Delusion', 'The Cynic', 'Independence', 'The leader', 'The grinch', 'Gullibility'),
  17: T('Openness', 'Discrimination', 'Understanding', 'Personnel Manager', 'No man is an island', 'Bodhisattva'),
  18: T('Conservatism', 'Terminal disease', 'The zealot', 'The incompetent', 'Therapy', 'Buddhahood'),
  19: T('Interdependence', 'Service', 'Dedication', 'Teamwork', 'Sacrifice', 'Recluse'),
  20: T('Superficiality', 'The dogmatist', 'Self-awareness', 'Application', 'Realism', 'Wisdom'),
  21: T('Warning', 'Might is right', 'Powerlessness', 'Strategy', 'Objectivity', 'Chaos'),
  22: T('Second Best', 'Charm', 'The Enchanter', 'Sensitivity', 'Directness', 'Maturity'),
  23: T('Proselytization', 'Self-defense', 'Individuality', 'Fragmentation', 'Assimilation', 'Fusion'),
  24: T('The sin of omission', 'Recognition', 'The addict', 'The hermit', 'Confession', 'The gift horse'),
  25: T('Selflessness', 'The Existentialist', 'Sensibility', 'Survival', 'Recuperation', 'Ignorance'),
  26: T('A Bird in the Hand', 'The Lessons', 'Influence', 'Memory', 'Adaptability', 'Authority'),
  27: T('Selfishness', 'Self-sufficiency', 'Greed', 'Generosity', 'The executor', 'Wariness'),
  28: T('Preparation', 'Shaking hands', 'Adventurism', 'Holding on', 'Treachery', 'Blaze of glory'),
  29: T('The Draftee', 'Assessment', 'Evaluation', 'Directness', 'Overreach', 'Confusion'),
  30: T('Composure', 'Pragmatism', 'Resignation', 'Burnout', 'Irony', 'Enforcement'),
  31: T('Manifestation', 'Arrogance', 'Selectivity', 'Intent', 'Self-righteousness', 'Application'),
  32: T('Conservation', 'Restraint', 'Lack of continuity', 'Right is might', 'Flexibility', 'Tranquility'),
  33: T('Avoidance', 'Surrender', 'Spirit', 'Dignity', 'Timing', 'Disassociation'),
  34: Object.freeze({ 1: 'The Bully', 6: 'Common Sense' }),
  35: T('Humility', 'Creative block', 'Collaboration', 'Hunger', 'Altruism', 'Rectification'),
  36: T('Resistance', 'Support', 'Transition', 'Espionage', 'The Underground', 'Justice'),
  37: T('Mother/Father', 'Responsibility', 'Discipline', 'Leadership', 'Love', 'Purpose'),
  38: T('Qualification', 'Politeness', 'Alliance', 'Investigation', 'Alienation', 'The Misunderstood'),
  39: T('Disengagement', 'Confrontation', 'Responsibility', 'Temperance', 'Single-mindedness', 'The Troubleshooter'),
  40: T('Recuperation', 'Resoluteness', 'Humility', 'Organization', 'Rigidity', 'Decapitation'),
  41: T('Reasonableness', 'Caution', 'Efficiency', 'Correction', 'Vicariousness', 'Contemplation'),
  42: T('Diversification', 'Identification', 'Trial and error', 'The middle man', 'Self-actualization', 'Nurturing'),
  43: T('Patience', 'Dedication', 'Expediency', 'The Mind', 'Progression', 'Breakthrough'),
  44: T('Conditions', 'Management', 'Interference', 'Honesty', 'Manipulation', 'Aloofness'),
  45: T('Canvassing', 'Consensus', 'Exclusion', 'Direction', 'Leadership', 'Reconsideration'),
  46: T('Being Discovered', 'The Prima Donna', 'Projection', 'Impact', 'Pacing', 'Integrity'),
  47: T('Taking Stock', 'Ambition', 'Self-oppression', 'Repression', 'The Saint', 'Futility'),
  48: T('Insignificance', 'Degeneracy', 'Incommunicado', 'Restructuring', 'Action', 'Self-fulfillment'),
  49: T('Law', 'The Last Resort', 'Popularity', 'Platform', 'The General', 'Liberty'),
  50: T('The Immigrant', 'Determination', 'Adaptability', 'Corruption', 'Consistency', 'Leadership'),
  51: T('Reference', 'Withdrawal', 'Adaptation', 'Limitation', 'Symmetry', 'Separation'),
  52: T('Think before you speak', 'Concern', 'Controls', 'Self-discipline', 'Explanation', 'Peacefulness'),
  53: T('Accumulation', 'Momentum', 'Practicality', 'Assuredness', 'Assertion', 'Phasing'),
  54: T('Influence', 'Discretion', 'Interaction', 'Enlightenment', 'Magnanimity', 'Selectivity'),
  55: T('Cooperation', 'Distrust', 'Innocence', 'Assimilation', 'Self-centeredness', 'Selfishness'),
  56: T('Quality', 'Linkage', 'Alienation', 'Expediency', 'Attracting attention', 'Caution'),
  57: T('Confusion', 'Cleansing', 'Acuteness', 'The Director', 'Progression', 'Utilization'),
  58: T('Love of Life', 'Perversion', 'Electricity', 'Focus', 'Defense', 'Carried Away'),
  59: T('The Preemptive Strike', 'Shyness', 'Openness', 'Brotherhood/Sisterhood', 'The Femme Fatale or Casanova', 'The One Night Stand'),
  60: T('Acceptance', 'Decisiveness', 'Conservatism', 'Resourcefulness', 'Leadership', 'Rigidity'),
  61: T('Occult Knowledge', 'Natural Brilliance', 'Interdependence', 'Research', 'Influence', 'Appeal'),
  62: T('Routine', 'Restraint', 'Discovery', 'Asceticism', 'Metamorphosis', 'Self-discipline'),
  63: T('Composure', 'Structuring', 'Continuance', 'Memory', 'Affirmation', 'Nostalgia'),
  64: T('Conditions', 'Qualification', 'Over-extension', 'Conviction', 'Promise', 'Victory'),
});

const TOTAL_ARC_SECONDS = 360 * 60 * 60;
const GATE_ARC_SECONDS = 5 * 60 * 60 + 37 * 60 + 30;
const LINE_ARC_SECONDS = 56 * 60 + 15;
const USER_WHEEL_ANCHOR_ARC_SECONDS = (10 * 30 + 2) * 60 * 60; // 02°00'00" Aquarius

function normalizeGate(gate) {
  const value = Number(gate);
  if (!Number.isInteger(value) || value < 1 || value > 64) {
    throw new RangeError(`gate must be 1..64, got ${gate}`);
  }
  return value;
}

function normalizeLine(line) {
  const value = Number(line);
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new RangeError(`line must be 1..6, got ${line}`);
  }
  return value;
}

function modArcSeconds(value) {
  return ((value % TOTAL_ARC_SECONDS) + TOTAL_ARC_SECONDS) % TOTAL_ARC_SECONDS;
}

function coordinate(totalArcSeconds) {
  const normalized = modArcSeconds(totalArcSeconds);
  const signIndex = Math.floor(normalized / (30 * 60 * 60));
  const withinSign = normalized - signIndex * 30 * 60 * 60;
  const degree = Math.floor(withinSign / 3600);
  const minute = Math.floor((withinSign % 3600) / 60);
  const second = withinSign % 60;
  return Object.freeze({
    totalArcSeconds: normalized,
    signIndex: signIndex + 1,
    sign: ZODIAC[signIndex],
    degree,
    minute,
    second,
    label: `${String(degree).padStart(2, '0')}°${String(minute).padStart(2, '0')}'${String(second).padStart(2, '0')}\" ${ZODIAC[signIndex]}`,
  });
}

function gateSpan(gate) {
  const index = GATE_WHEEL.indexOf(normalizeGate(gate));
  if (index < 0) throw new Error(`gate ${gate} is missing from preserved wheel`);
  const startArcSeconds = modArcSeconds(USER_WHEEL_ANCHOR_ARC_SECONDS + index * GATE_ARC_SECONDS);
  const endArcSeconds = modArcSeconds(startArcSeconds + GATE_ARC_SECONDS);
  return Object.freeze({
    gate: Number(gate),
    size: Object.freeze({ degrees: 5, minutes: 37, seconds: 30, totalArcSeconds: GATE_ARC_SECONDS }),
    start: coordinate(startArcSeconds),
    end: coordinate(endArcSeconds),
    anchor: Object.freeze({ gate: 41, position: coordinate(USER_WHEEL_ANCHOR_ARC_SECONDS), source: 'USER_SUPPLIED_BLACK_BOOK_MAPPING' }),
  });
}

function lineSpan(gate, line) {
  const selectedLine = normalizeLine(line);
  const span = gateSpan(gate);
  const startArcSeconds = modArcSeconds(span.start.totalArcSeconds + (selectedLine - 1) * LINE_ARC_SECONDS);
  return Object.freeze({
    gate: Number(gate),
    line: selectedLine,
    size: Object.freeze({ degrees: 0, minutes: 56, seconds: 15, totalArcSeconds: LINE_ARC_SECONDS }),
    start: coordinate(startArcSeconds),
    end: coordinate(startArcSeconds + LINE_ARC_SECONDS),
  });
}

function userExpression(gate, line) {
  const record = USER_LINE_EXPRESSIONS[gate];
  if (Array.isArray(record)) return record[line - 1] ?? null;
  return record?.[line] ?? null;
}

function centerNameForDisplay(center) {
  if (center === 'Solar') return 'Solar Plexus';
  if (center === 'Spleen') return 'Splenic';
  if (center === 'Heart') return 'Heart (Ego)';
  if (center === 'G') return 'G Center';
  return center;
}

export const GATE_ARCHITECTURE_CONFLICTS = Object.freeze([
  Object.freeze({
    id: 'center-head-ajna-61-63-64',
    field: 'center',
    gates: Object.freeze([61, 63, 64]),
    liveResolution: Object.freeze({ 61: 'Head', 63: 'Head', 64: 'Head', layout: Object.freeze({ left: 64, middle: 61, right: 63 }) }),
    supersededClaim: 'Ajna / Pituitary in some supplied summary tables',
    status: 'USER_CLARIFIED_LIVE_RESOLUTION',
  }),
  Object.freeze({
    id: 'channel-45-16-transcription',
    field: 'channel',
    rejectedPair: Object.freeze([45, 16]),
    liveResolutions: Object.freeze([
      Object.freeze({ gates: Object.freeze([16, 48]), centers: Object.freeze(['Throat', 'Spleen']) }),
      Object.freeze({ gates: Object.freeze([21, 45]), centers: Object.freeze(['Heart', 'Throat']) }),
    ]),
    status: 'USER_CORRECTED_TRANSCRIPTION_ERROR',
  }),
  Object.freeze({
    id: 'channel-count-32-36',
    field: 'channelCount',
    liveResolution: 36,
    supersededClaim: 32,
    status: 'CANONICAL_GRAPH_RESOLUTION',
  }),
  Object.freeze({
    id: 'donor-center-variants',
    field: 'center',
    liveResolution: Object.freeze({ 16: 'Throat', 22: 'Solar', 39: 'Root', 48: 'Spleen' }),
    supersededClaim: 'conflicting preserved donor center tables',
    status: 'USER_AND_INTEGRATION_CORRECTED',
  }),
]);

export class GateArchitectureProvider {
  constructor() {
    if (GATE_WHEEL.length !== 64 || new Set(GATE_WHEEL).size !== 64) {
      throw new Error('gate architecture requires a complete 64-gate wheel');
    }
    if (CANONICAL_CHANNELS.length !== 36) {
      throw new Error(`gate architecture requires 36 canonical channels, got ${CANONICAL_CHANNELS.length}`);
    }
    this.records = new Map();
    for (let gate = 1; gate <= 64; gate++) this.records.set(gate, this.#build(gate));
  }

  #build(gate) {
    const donor = GATES[gate] ?? {};
    const center = AUTHORITATIVE_GATE_CENTERS[gate];
    const [sign, themes] = ASTROLOGY[gate];
    const lines = Array.from({ length: 6 }, (_unused, index) => {
      const line = index + 1;
      const donorLine = donor.lines?.find((entry) => Number(entry.line) === line) ?? null;
      const suppliedExpression = userExpression(gate, line);
      return Object.freeze({
        gate,
        line,
        expression: suppliedExpression ?? donorLine?.name ?? `Line ${line}`,
        sourceStatus: suppliedExpression ? 'USER_SUPPLIED_BLACK_BOOK_INDEX' : 'PRESERVED_DONOR_CLAIM',
        mandala: lineSpan(gate, line),
        planetaryPolarity: Object.freeze({
          exaltation: donorLine?.exalted ?? null,
          detriment: donorLine?.detriment ?? null,
          donorKeynote: donorLine?.keynote ?? null,
          status: 'PRESERVED_DONOR_CLAIM_REQUIRES_SOURCE_RECONCILIATION',
        }),
        alternatives: Object.freeze(suppliedExpression && donorLine?.name && suppliedExpression.toLowerCase() !== donorLine.name.trim().toLowerCase()
          ? [Object.freeze({ expression: donorLine.name.trim(), source: 'preserved Kimi Human Design donor', status: 'PRESERVED_DONOR_CONFLICT' })]
          : []),
      });
    });
    return Object.freeze({
      gate,
      name: donor.name ?? `Gate ${gate}`,
      chineseName: donor.chineseName ?? null,
      astrologicalFilter: Object.freeze({ sign, themes }),
      center: Object.freeze({
        id: center,
        displayName: centerNameForDisplay(center),
        biology: CENTER_BIOLOGY[center],
        sourceStatus: 'USER_CONFIRMED_LIVE_MAPPING',
        donorClaim: donor.center ?? null,
      }),
      harmonics: Object.freeze(channelPartners(gate)),
      channels: Object.freeze(CANONICAL_CHANNELS
        .filter(([left, right]) => left === gate || right === gate)
        .map(([left, right]) => `${Math.min(left, right)}-${Math.max(left, right)}`)),
      mandala: gateSpan(gate),
      lines: Object.freeze(lines),
      donor: Object.freeze({
        circuit: donor.circuit ?? null,
        aminoAcid: donor.aminoAcid ?? null,
        element: donor.element ?? null,
        organ: donor.organ ?? null,
        theme: donor.theme ?? null,
        pressure: donor.pressure ?? null,
        status: 'PRESERVED_DONOR_CLAIM',
      }),
      sourceStatus: Object.freeze({
        astrology: 'USER_SUPPLIED_BLACK_BOOK_MAPPING',
        center: 'USER_CONFIRMED_LIVE_MAPPING',
        harmonics: 'CANONICAL_36_CHANNEL_GRAPH',
        mandala: 'USER_SUPPLIED_BLACK_BOOK_MAPPING',
        scientificClaim: false,
      }),
    });
  }

  gate(gate) {
    const value = this.records.get(normalizeGate(gate));
    if (!value) throw new RangeError(`unknown gate: ${gate}`);
    return value;
  }

  line(gate, line) {
    return this.gate(gate).lines[normalizeLine(line) - 1];
  }

  centerLayout(center) {
    const normalized = String(center).replace('Solar Plexus', 'Solar').replace('Splenic', 'Spleen').replace('G Center', 'G').replace('Heart (Ego)', 'Heart');
    const gates = [...this.records.values()].filter((record) => record.center.id === normalized).map((record) => record.gate);
    return Object.freeze({
      center: normalized,
      gates: Object.freeze(gates),
      biology: CENTER_BIOLOGY[normalized] ?? Object.freeze([]),
      topHeadLayout: normalized === 'Head' ? Object.freeze({ left: 64, middle: 61, right: 63 }) : null,
    });
  }

  snapshot({ includeGates = false } = {}) {
    return Object.freeze({
      gates: this.records.size,
      lines: [...this.records.values()].reduce((sum, record) => sum + record.lines.length, 0),
      canonicalChannels: CANONICAL_CHANNELS.length,
      gateArc: Object.freeze({ degrees: 5, minutes: 37, seconds: 30 }),
      lineArc: Object.freeze({ degrees: 0, minutes: 56, seconds: 15 }),
      headLayout: Object.freeze({ left: 64, middle: 61, right: 63 }),
      centers: Object.freeze(Object.fromEntries(Object.keys(CENTER_BIOLOGY).map((center) => [center, this.centerLayout(center)]))),
      conflicts: GATE_ARCHITECTURE_CONFLICTS,
      sourcePolicy: 'user-confirmed live mappings are authoritative; conflicting donor claims remain inspectable',
      records: includeGates ? Object.freeze([...this.records.values()]) : undefined,
    });
  }
}

export {
  ASTROLOGY as USER_ASTROLOGICAL_GATE_FILTERS,
  USER_LINE_EXPRESSIONS,
  CENTER_BIOLOGY,
  gateSpan,
  lineSpan,
};

export default GateArchitectureProvider;
