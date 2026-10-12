/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYNTHIA-CORE.js — The Nested State-Space Neural Field Substrate
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Version: 1.0.0
 * Runtime: Pure JavaScript (Browser, Termux, Node — no WebWorkers, no backend)
 * 
 * ARCHITECTURE:
 *   4 Dimensions (Movement, Evolution, Being, Design) — each a duality pole
 *   64 Gates per dimension = 256 addressable slots
 *   Space = emergent coherence field from the interplay of the 4
 *   9 Centers = Shader readouts (emergent, not hardcoded)
 *   Swarm = 2-bit, 4-bit, 8-bit packs that power the LLM positions
 * 
 * PRINCIPLE: The swarm powers the LLM. The LLM does not control the swarm.
 * 
 * LINEAGE: Integrates mechanisms from:
 *   - Synthia-v0.3.0-composition-and-local-execution-02
 *   - Synthia-Universal-Execution-Spine-v0.3.0
 *   - Synthia-Kimi-Focal-StateSpace-v1.4.0-mesh-execution
 *   - Synthia-v0.5.1-AUTOMATA-INGESTION-EXECUTION-PATCH
 *   - Synthia-FULL-Executable-v4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS — The Pre-Existing Ontology
// ═══════════════════════════════════════════════════════════════════════════════

const DIMENSIONS = Object.freeze(['Movement', 'Evolution', 'Being', 'Design']);
const DIMENSION_INDEX = Object.freeze({ Movement: 0, Evolution: 1, Being: 2, Design: 3 });

const DIMENSION_CHAINS = Object.freeze({
  Movement: Object.freeze(['Energy', 'Creation', 'Seeing', 'Landscape', 'Environment']),
  Evolution: Object.freeze(['Gravity', 'Memory', 'Taste', 'Love', 'Light']),
  Being: Object.freeze(['Matter', 'Touch', 'Sex', 'Survival']),
  Design: Object.freeze(['Structure', 'Progress', 'Smell', 'Life', 'Art']),
});

const DIMENSION_KEYNOTES = Object.freeze({
  Movement: 'I Define',
  Evolution: 'I Remember',
  Being: 'I Am',
  Design: 'I Design',
});

const DIMENSION_VOWELS = Object.freeze({
  Movement: 'I',
  Evolution: 'A',
  Being: 'E',
  Design: 'U',
});

const SPACE_VOWEL = 'O';

const GATES_PER_DIMENSION = 64;
const LINES_PER_GATE = 6;
const COLORS_PER_LINE = 6;
const TONES_PER_COLOR = 6;
const BASES_PER_TONE = 5;

const BASES = Object.freeze([
  { id: 1, name: 'Movement', sense: 'Sight', field: 'Individuality', question: 'Where?', keynote: 'I Define' },
  { id: 2, name: 'Evolution', sense: 'Taste', field: 'Mind', question: 'What?', keynote: 'I Remember' },
  { id: 3, name: 'Being', sense: 'Touch', field: 'Body', question: 'When?', keynote: 'I Am' },
  { id: 4, name: 'Design', sense: 'Smell', field: 'Ego', question: 'Why?', keynote: 'I Design' },
  { id: 5, name: 'Space', sense: 'Hearing', field: 'Personality', question: 'Who?', keynote: 'I Think' },
]);

const TONES = Object.freeze([
  { id: 1, name: 'Security', sense: 'Smell', binary: 'Fear', department: 'Splenic' },
  { id: 2, name: 'Uncertainty', sense: 'Taste', binary: 'Hope', department: 'Splenic' },
  { id: 3, name: 'Action', sense: 'Outer Vision', binary: 'Desire', department: 'Ajna' },
  { id: 4, name: 'Meditation', sense: 'Inner Vision', binary: 'Need', department: 'Ajna' },
  { id: 5, name: 'Judgement', sense: 'Feeling', binary: 'Guilt', department: 'Solar Plexus' },
  { id: 6, name: 'Acceptance', sense: 'Hearing', binary: 'Innocence', department: 'Solar Plexus' },
]);

const COLORS = Object.freeze([
  { id: 1, name: 'Fear', tone: 'Alert' },
  { id: 2, name: 'Hope', tone: 'Leader' },
  { id: 3, name: 'Desire', tone: 'Dreamer' },
  { id: 4, name: 'Need', tone: 'Fixity' },
  { id: 5, name: 'Guilt', tone: 'Judge' },
  { id: 6, name: 'Innocence', tone: 'Passenger' },
]);

const ZODIAC = Object.freeze([
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]);

const CENTER_REFERENCES = Object.freeze([
  'Head', 'Ajna', 'Throat', 'G Center', 'Heart', 'Splenic', 'Sacral', 'Solar Plexus', 'Root'
]);

const PLANETS = Object.freeze([
  'Sun', 'Earth', 'Moon', 'North Node', 'South Node', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
]);

const AXES = Object.freeze(['Vertical', 'Horizontal', 'Diagonal']);

// The 64 gates with their I Ching names, zodiac, house, center, biology, harmonic
const GATE_MAP = Object.freeze({
  1: { name: 'The Creative', sign: 'Scorpio', house: 8, center: 'G Center', biology: 'Liver', harmonic: [8], base: 1, anchor: 'Creation' },
  2: { name: 'The Receptive', sign: 'Taurus', house: 2, center: 'G Center', biology: 'Liver', harmonic: [14], base: 1, anchor: 'Landscape' },
  3: { name: 'Difficulty at Beginning', sign: 'Aries/Taurus', house: 2, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [60], base: 4, anchor: 'Structure' },
  4: { name: 'Youthful Folly', sign: 'Leo', house: 5, center: 'Ajna', biology: 'Pituitary', harmonic: [63], base: 2, anchor: 'Memory' },
  5: { name: 'Waiting', sign: 'Sagittarius', house: 9, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [15], base: 5, anchor: 'Rhythm' },
  6: { name: 'Conflict', sign: 'Virgo', house: 6, center: 'Solar Plexus', biology: 'Kidney/Pancreas', harmonic: [59], base: 3, anchor: 'Sex/Survival' },
  7: { name: 'The Army', sign: 'Leo', house: 5, center: 'G Center', biology: 'Liver', harmonic: [31], base: 1, anchor: 'Orientation' },
  8: { name: 'Holding Together', sign: 'Taurus/Gemini', house: 2, center: 'Throat', biology: 'Thyroid', harmonic: [1], base: 1, anchor: 'Seeing' },
  9: { name: 'Taming Power of Small', sign: 'Sagittarius', house: 9, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [52], base: 4, anchor: 'Structure' },
  10: { name: 'Treading', sign: 'Sag/Cap', house: 10, center: 'G Center', biology: 'Liver', harmonic: [20, 34, 57], base: 3, anchor: 'Being' },
  11: { name: 'Peace', sign: 'Sagittarius', house: 9, center: 'Ajna', biology: 'Pituitary', harmonic: [56], base: 5, anchor: 'Illusion/Form' },
  12: { name: 'Standstill', sign: 'Gemini', house: 3, center: 'Throat', biology: 'Thyroid', harmonic: [22], base: 5, anchor: 'Hearing/Music' },
  13: { name: 'Fellowship of Man', sign: 'Aquarius', house: 11, center: 'G Center', biology: 'Liver', harmonic: [33], base: 2, anchor: 'Memory' },
  14: { name: 'Possession in Great Measure', sign: 'Scorpio/Sag', house: 9, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [2], base: 4, anchor: 'Progress' },
  15: { name: 'Modesty', sign: 'Gemini/Cancer', house: 3, center: 'G Center', biology: 'Liver', harmonic: [5], base: 5, anchor: 'Rhythm' },
  16: { name: 'Enthusiasm', sign: 'Gemini', house: 3, center: 'Throat', biology: 'Thyroid', harmonic: [48], base: 5, anchor: 'Music/Expression' },
  17: { name: 'Following', sign: 'Aries', house: 1, center: 'Ajna', biology: 'Pituitary', harmonic: [62], base: 2, anchor: 'Gravity' },
  18: { name: 'Work on What Has Been Spoilt', sign: 'Libra', house: 7, center: 'Splenic', biology: 'Spleen/Lymph', harmonic: [58], base: 4, anchor: 'Structure/Decay' },
  19: { name: 'Approach', sign: 'Aquarius', house: 11, center: 'Root', biology: 'Adrenals', harmonic: [49], base: 3, anchor: 'Touch' },
  20: { name: 'Contemplation', sign: 'Gemini', house: 3, center: 'Throat', biology: 'Thyroid', harmonic: [10, 34, 57], base: 1, anchor: 'Environment' },
  21: { name: 'Biting Through', sign: 'Aries', house: 1, center: 'Heart', biology: 'Thymus', harmonic: [45], base: 4, anchor: 'Structure' },
  22: { name: 'Grace', sign: 'Pisces', house: 12, center: 'Solar Plexus', biology: 'Kidney/Pancreas', harmonic: [12], base: 5, anchor: 'Music/Form' },
  23: { name: 'Splitting Apart', sign: 'Taurus', house: 2, center: 'Throat', biology: 'Thyroid', harmonic: [43], base: 2, anchor: 'Light' },
  24: { name: 'Returning', sign: 'Taurus', house: 2, center: 'Ajna', biology: 'Pituitary', harmonic: [61], base: 2, anchor: 'Memory' },
  25: { name: 'Innocence', sign: 'Pisces/Aries', house: 1, center: 'G Center', biology: 'Liver', harmonic: [51], base: 2, anchor: 'Love' },
  26: { name: 'Taming Power of Great', sign: 'Sagittarius', house: 9, center: 'Heart', biology: 'Thymus', harmonic: [44], base: 4, anchor: 'Life/Art' },
  27: { name: 'Nourishment', sign: 'Taurus', house: 2, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [50], base: 3, anchor: 'Survival' },
  28: { name: 'Preponderance of Great', sign: 'Scorpio', house: 8, center: 'Splenic', biology: 'Spleen/Lymph', harmonic: [38], base: 3, anchor: 'Survival' },
  29: { name: 'The Abysmal', sign: 'Leo/Virgo', house: 6, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [46], base: 3, anchor: 'Matter' },
  30: { name: 'Clinging Fire', sign: 'Aqua/Pisces', house: 11, center: 'Solar Plexus', biology: 'Kidney/Pancreas', harmonic: [41], base: 5, anchor: 'Fantasy/Form' },
  31: { name: 'Influence', sign: 'Leo', house: 6, center: 'Throat', biology: 'Thyroid', harmonic: [7], base: 1, anchor: 'Orientation' },
  32: { name: 'Duration', sign: 'Libra', house: 7, center: 'Splenic', biology: 'Spleen/Lymph', harmonic: [54], base: 4, anchor: 'Continuity' },
  33: { name: 'Retreat', sign: 'Leo', house: 5, center: 'Throat', biology: 'Thyroid', harmonic: [13], base: 2, anchor: 'Memory' },
  34: { name: 'Power of Great', sign: 'Sagittarius', house: 9, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [10, 20, 57], base: 3, anchor: 'Matter/Body' },
  35: { name: 'Progress', sign: 'Gemini', house: 3, center: 'Throat', biology: 'Thyroid', harmonic: [36], base: 4, anchor: 'Progress' },
  36: { name: 'Darkening of Light', sign: 'Pisces', house: 12, center: 'Solar Plexus', biology: 'Kidney/Pancreas', harmonic: [35], base: 5, anchor: 'Illusion' },
  37: { name: 'The Family', sign: 'Pisces', house: 12, center: 'Solar Plexus', biology: 'Kidney/Pancreas', harmonic: [40], base: 3, anchor: 'Touch' },
  38: { name: 'Opposition', sign: 'Capricorn', house: 10, center: 'Root', biology: 'Adrenals', harmonic: [28], base: 3, anchor: 'Survival' },
  39: { name: 'Obstruction', sign: 'Cancer', house: 4, center: 'Root', biology: 'Adrenals', harmonic: [55], base: 1, anchor: 'Energy' },
  40: { name: 'Deliverance', sign: 'Virgo', house: 6, center: 'Heart', biology: 'Thymus', harmonic: [37], base: 4, anchor: 'Ego/Structure' },
  41: { name: 'Decrease', sign: 'Aquarius', house: 11, center: 'Root', biology: 'Adrenals', harmonic: [30], base: 5, anchor: 'Fantasy' },
  42: { name: 'Increase', sign: 'Aries', house: 1, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [53], base: 4, anchor: 'Growth' },
  43: { name: 'Breakthrough', sign: 'Scorpio', house: 8, center: 'Ajna', biology: 'Pituitary', harmonic: [23], base: 2, anchor: 'Light' },
  44: { name: 'Coming to Meet', sign: 'Scorpio', house: 8, center: 'Splenic', biology: 'Spleen/Lymph', harmonic: [26], base: 4, anchor: 'Smell/Structure' },
  45: { name: 'Gathering Together', sign: 'Gemini', house: 3, center: 'Throat', biology: 'Thyroid', harmonic: [21], base: 4, anchor: 'Manifestation' },
  46: { name: 'Pushing Upward', sign: 'Virgo/Libra', house: 6, center: 'G Center', biology: 'Liver', harmonic: [29], base: 3, anchor: 'Biology/Body' },
  47: { name: 'Oppression', sign: 'Virgo', house: 6, center: 'Ajna', biology: 'Pituitary', harmonic: [64], base: 2, anchor: 'Memory' },
  48: { name: 'The Well', sign: 'Libra', house: 7, center: 'Splenic', biology: 'Spleen/Lymph', harmonic: [16], base: 4, anchor: 'Structure' },
  49: { name: 'Revolution', sign: 'Aquarius', house: 11, center: 'Solar Plexus', biology: 'Kidney/Pancreas', harmonic: [19], base: 3, anchor: 'Survival' },
  50: { name: 'The Cauldron', sign: 'Libra/Scorpio', house: 7, center: 'Splenic', biology: 'Spleen/Lymph', harmonic: [27], base: 4, anchor: 'Structure' },
  51: { name: 'The Arousing', sign: 'Aries', house: 1, center: 'Heart', biology: 'Thymus', harmonic: [25], base: 1, anchor: 'Energy' },
  52: { name: 'Keeping Still', sign: 'Cancer', house: 4, center: 'Root', biology: 'Adrenals', harmonic: [9], base: 4, anchor: 'Structure' },
  53: { name: 'Development', sign: 'Cancer', house: 4, center: 'Root', biology: 'Adrenals', harmonic: [42], base: 4, anchor: 'Progress' },
  54: { name: 'Marrying Maiden', sign: 'Capricorn', house: 10, center: 'Root', biology: 'Adrenals', harmonic: [32], base: 4, anchor: 'Manifestation' },
  55: { name: 'Abundance', sign: 'Pisces', house: 12, center: 'Solar Plexus', biology: 'Kidney/Pancreas', harmonic: [39], base: 5, anchor: 'Music/Freedom' },
  56: { name: 'The Wanderer', sign: 'Cancer/Leo', house: 5, center: 'Throat', biology: 'Thyroid', harmonic: [11], base: 5, anchor: 'Fantasy/Illusion' },
  57: { name: 'The Gentle', sign: 'Libra', house: 7, center: 'Splenic', biology: 'Spleen/Lymph', harmonic: [10, 20, 34], base: 4, anchor: 'Smell' },
  58: { name: 'The Joyous', sign: 'Capricorn', house: 10, center: 'Root', biology: 'Adrenals', harmonic: [18], base: 3, anchor: 'Biology' },
  59: { name: 'Dispersion', sign: 'Virgo', house: 6, center: 'Sacral', biology: 'Ovaries/Testes', harmonic: [6], base: 3, anchor: 'Sex' },
  60: { name: 'Limitation', sign: 'Cap/Aqua', house: 10, center: 'Root', biology: 'Adrenals', harmonic: [3], base: 1, anchor: 'Limitation' },
  61: { name: 'Inner Truth', sign: 'Capricorn', house: 10, center: 'Head', biology: 'Pineal', harmonic: [24], base: 2, anchor: 'Light' },
  62: { name: 'Small Preponderance', sign: 'Cancer', house: 4, center: 'Throat', biology: 'Thyroid', harmonic: [17], base: 5, anchor: 'Form' },
  63: { name: 'After Completion', sign: 'Pisces', house: 12, center: 'Head', biology: 'Pineal', harmonic: [4], base: 2, anchor: 'Gravity' },
  64: { name: 'Before Completion', sign: 'Virgo', house: 6, center: 'Head', biology: 'Pineal', harmonic: [47], base: 2, anchor: 'Memory' },
});

// Line expressions for all 64 gates × 6 lines
const LINE_EXPRESSIONS = Object.freeze({
  1: ['Creation', 'Love', 'Energy', 'Alone', 'Attracting', 'Self-expression'],
  2: ['Intuition', 'Genius', 'Patience', 'Secretiveness', 'Intelligent Application', 'Fixation'],
  3: ['Synthesis', 'Immaturity', 'Survival', 'Charisma', 'Victimization', 'Surrender'],
  4: ['Pleasure', 'Acceptance', 'Irresponsibility', 'The Liar', 'Seduction', 'Excess'],
  5: ['Perseverance', 'Inner Peace', 'Compulsiveness', 'The Hunter', 'Joy', 'Yielding'],
  6: ['Retreat', 'The Guerrilla', 'Allegiance', 'Triumph', 'Arbitration', 'The Peacemaker'],
  7: ['Authoritarian', 'The Democrat', 'The Anarchist', 'The Abdicator', 'The General', 'The Administrator'],
  8: ['Honesty', 'Service', 'The Phoney', 'Respect', 'Dharma', 'Communion'],
  9: ['Sensibility', 'Misery Loves Company', 'The Straw', 'Dedication', 'Faith', 'Gratitude'],
  10: ['Modesty', 'The Hermit', 'The Martyr', 'The Opportunist', 'The Heretic', 'The Role Model'],
  11: ['Attunement', 'Rigour', 'The Realist', 'The Teacher', 'The Philanthropist', 'Adaptability'],
  12: ['The Monk', 'Purification', 'Confession', 'The Prophet', 'The Pragmatist', 'Metamorphosis'],
  13: ['Empathy', 'Bigotry', 'Pessimism', 'Fatigue', 'The Savior', 'Optimism'],
  14: ['Money Is Not Everything', 'Management', 'Service', 'Security', 'Arrogance', 'Humility'],
  15: ['Duty', 'Influence', 'Ego Inflation', 'The Wallflower', 'Sensitivity', 'Self-defense'],
  16: ['Delusion', 'The Cynic', 'Independence', 'The Leader', 'The Grinch', 'Gullibility'],
  17: ['Openness', 'Discrimination', 'Understanding', 'The Personnel Manager', 'No Man Is An Island', 'Bodhisattva'],
  18: ['Conservatism', 'Terminal Disease', 'The Zealot', 'The Incompetent', 'Therapy', 'Buddhahood'],
  19: ['Interdependence', 'Service', 'Dedication', 'Teamwork', 'Sacrifice', 'Recluse'],
  20: ['Superficiality', 'The Dogmatist', 'Self-awareness', 'Application', 'Realism', 'Wisdom'],
  21: ['Warning', 'Might Is Right', 'Powerlessness', 'Strategy', 'Objectivity', 'Chaos'],
  22: ['Second Best', 'Charm', 'The Enchanter', 'Sensitivity', 'Directness', 'Maturity'],
  23: ['Proselytization', 'Self-defense', 'Individuality', 'Fragmentation', 'Assimilation', 'Fusion'],
  24: ['The Sin of Omission', 'Recognition', 'The Addict', 'The Hermit', 'Confession', 'The Gift Horse'],
  25: ['Selflessness', 'The Existentialist', 'Sensibility', 'Survival', 'Recuperation', 'Ignorance'],
  26: ['A Bird in the Hand', 'The Lessons', 'Influence', 'Memory', 'Adaptability', 'Authority'],
  27: ['Selfishness', 'Self-sufficiency', 'Greed', 'Generosity', 'The Executor', 'Wariness'],
  28: ['Preparation', 'Shaking Hands', 'Adventurism', 'Holding On', 'Treachery', 'Blaze of Glory'],
  29: ['The Draftee', 'Assessment', 'Evaluation', 'Directness', 'Overreach', 'Confusion'],
  30: ['Composure', 'Pragmatism', 'Resignation', 'Burnout', 'Irony', 'Enforcement'],
  31: ['Manifestation', 'Arrogance', 'Selectivity', 'Intent', 'Self-righteousness', 'Application'],
  32: ['Conservation', 'Restraint', 'Lack of Continuity', 'Right Is Might', 'Flexibility', 'Tranquility'],
  33: ['Avoidance', 'Surrender', 'Spirit', 'Dignity', 'Timing', 'Disassociation'],
  34: ['The Bully', 'Momentum', 'Machismo', 'Triumph', 'Annihilation', 'Common Sense'],
  35: ['Humility', 'Creative Block', 'Collaboration', 'Hunger', 'Altruism', 'Rectification'],
  36: ['Resistance', 'Support', 'Transition', 'Espionage', 'The Underground', 'Justice'],
  37: ['Mother/Father', 'Responsibility', 'Discipline', 'Leadership', 'Love', 'Purpose'],
  38: ['Qualification', 'Politeness', 'Alliance', 'Investigation', 'Alienation', 'The Misunderstood'],
  39: ['Disengagement', 'Confrontation', 'Responsibility', 'Temperance', 'Single-mindedness', 'The Troubleshooter'],
  40: ['Recuperation', 'Resoluteness', 'Humility', 'Organization', 'Rigidity', 'Decapitation'],
  41: ['Reasonableness', 'Caution', 'Efficiency', 'Correction', 'Vicariousness', 'Contemplation'],
  42: ['Diversification', 'Identification', 'Trial and Error', 'The Middle Man', 'Self-actualization', 'Nurturing'],
  43: ['Patience', 'Dedication', 'Expediency', 'The Mind', 'Progression', 'Breakthrough'],
  44: ['Conditions', 'Management', 'Interference', 'Honesty', 'Manipulation', 'Aloofness'],
  45: ['Canvassing', 'Consensus', 'Exclusion', 'Direction', 'Leadership', 'Reconsideration'],
  46: ['Being Discovered', 'The Prima Donna', 'Projection', 'Impact', 'Pacing', 'Integrity'],
  47: ['Taking Stock', 'Ambition', 'Self-oppression', 'Repression', 'The Saint', 'Futility'],
  48: ['Insignificance', 'Degeneracy', 'Incommunicado', 'Restructuring', 'Action', 'Self-fulfillment'],
  49: ['Law', 'The Last Resort', 'Popularity', 'Platform', 'The General', 'Liberty'],
  50: ['The Immigrant', 'Determination', 'Adaptability', 'Corruption', 'Consistency', 'Leadership'],
  51: ['Reference', 'Withdrawal', 'Adaptation', 'Limitation', 'Symmetry', 'Separation'],
  52: ['Think Before You Speak', 'Concern', 'Controls', 'Self-discipline', 'Explanation', 'Peacefulness'],
  53: ['Accumulation', 'Momentum', 'Practicality', 'Assuredness', 'Assertion', 'Phasing'],
  54: ['Influence', 'Discretion', 'Interaction', 'Enlightenment', 'Magnanimity', 'Selectivity'],
  55: ['Cooperation', 'Distrust', 'Innocence', 'Assimilation', 'Self-centeredness', 'Selfishness'],
  56: ['Quality', 'Linkage', 'Alienation', 'Expediency', 'Attracting Attention', 'Caution'],
  57: ['Confusion', 'Cleansing', 'Acuteness', 'The Director', 'Progression', 'Utilization'],
  58: ['Love of Life', 'Perversion', 'Electricity', 'Focus', 'Defense', 'Carried Away'],
  59: ['The Preemptive Strike', 'Shyness', 'Openness', 'Brotherhood/Sisterhood', 'The Femme Fatale/Casanova', 'The One Night Stand'],
  60: ['Acceptance', 'Decisiveness', 'Conservatism', 'Resourcefulness', 'Leadership', 'Rigidity'],
  61: ['Occult Knowledge', 'Natural Brilliance', 'Interdependence', 'Research', 'Influence', 'Appeal'],
  62: ['Routine', 'Restraint', 'Discovery', 'Asceticism', 'Metamorphosis', 'Self-discipline'],
  63: ['Composure', 'Structuring', 'Continuance', 'Memory', 'Affirmation', 'Nostalgia'],
  64: ['Conditions', 'Qualification', 'Over-extension', 'Conviction', 'Promise', 'Victory'],
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: ERRORS — Descriptive, Observable, Provenance-Aware
// ═══════════════════════════════════════════════════════════════════════════════

class SynthiaError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = 'SynthiaError';
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }
}

class AddressError extends SynthiaError {
  constructor(field, value, expected, address) {
    super(
      'ADDRESS_VALIDATION_ERROR',
      `Address field "${field}" has invalid value ${JSON.stringify(value)}; expected ${expected}`,
      { field, received: value, expected, address, timestamp: Date.now() }
    );
    this.name = 'AddressError';
  }
}

class GrammarError extends SynthiaError {
  constructor(token, line, col, rule, expected) {
    super(
      'GRAMMAR_UNEXPECTED_TOKEN',
      `Unexpected token "${token.value}" (${token.type}) at ${line}:${col} while resolving ${rule}; expected ${expected}`,
      { token, line, column: col, rule, expected, timestamp: Date.now() }
    );
    this.name = 'GrammarError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: DMSA COORDINATE — Degree, Minute, Second, Arc
// ═══════════════════════════════════════════════════════════════════════════════

class DMSA {
  constructor(degree = 0, minute = 0, second = 0, arc = 0) {
    this.degree = degree;
    this.minute = minute;
    this.second = second;
    this.arc = arc;
    this.validate();
  }

  validate() {
    if (!Number.isInteger(this.degree) || this.degree < 0 || this.degree > 29) {
      throw new AddressError('degree', this.degree, 'integer 0..29', this.toObject());
    }
    if (!Number.isInteger(this.minute) || this.minute < 0 || this.minute > 59) {
      throw new AddressError('minute', this.minute, 'integer 0..59', this.toObject());
    }
    if (!Number.isInteger(this.second) || this.second < 0 || this.second > 59) {
      throw new AddressError('second', this.second, 'integer 0..59', this.toObject());
    }
    if (!Number.isInteger(this.arc) || this.arc < 0 || this.arc > 99) {
      throw new AddressError('arc', this.arc, 'integer 0..99', this.toObject());
    }
  }

  toObject() {
    return { degree: this.degree, minute: this.minute, second: this.second, arc: this.arc };
  }

  toString() {
    return `${this.degree}°${this.minute}'${this.second}"${this.arc}`;
  }

  toTotalArcSeconds() {
    return ((this.degree * 60 + this.minute) * 60 + this.second) * 100 + this.arc;
  }

  static fromTotalArcSeconds(total) {
    const arc = total % 100;
    const secs = Math.floor(total / 100);
    const second = secs % 60;
    const mins = Math.floor(secs / 60);
    const minute = mins % 60;
    const degree = Math.floor(mins / 60);
    return new DMSA(degree, minute, second, arc);
  }

  static fromAbsoluteDegree(absDeg) {
    const gateSpan = 5.625;
    const gateIndex = Math.floor(absDeg / gateSpan);
    const withinGate = absDeg - gateIndex * gateSpan;
    const totalSeconds = withinGate * 3600;
    const degree = Math.floor(totalSeconds / 3600);
    const minute = Math.floor((totalSeconds % 3600) / 60);
    const second = Math.floor(totalSeconds % 60);
    const arc = Math.floor((totalSeconds % 1) * 100);
    return { gate: gateIndex + 1, dmsa: new DMSA(degree, minute, second, arc) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: CANONICAL ADDRESS — The Full Ontological Address
// ═══════════════════════════════════════════════════════════════════════════════

const ADDRESS_FIELDS = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arcAxis', 'zodiac', 'house'
]);

class CanonicalAddress {
  constructor(data) {
    this.planetary = data.planetary;
    this.dimension = data.dimension;
    this.gate = data.gate;
    this.line = data.line;
    this.color = data.color;
    this.tone = data.tone;
    this.base = data.base;
    this.degree = data.degree;
    this.minute = data.minute;
    this.second = data.second;
    this.arcAxis = data.arcAxis || { arcUnit: 1, axis: 'Vertical' };
    this.zodiac = data.zodiac;
    this.house = data.house;
    this.validate();
  }

  validate() {
    if (!Number.isInteger(this.planetary) || this.planetary < 1 || this.planetary > 13) {
      throw new AddressError('planetary', this.planetary, 'integer 1..13', this.toObject());
    }
    if (!Number.isInteger(this.dimension) || this.dimension < 1 || this.dimension > 4) {
      throw new AddressError('dimension', this.dimension, 'integer 1..4 (Movement=1, Evolution=2, Being=3, Design=4)', this.toObject());
    }
    if (!Number.isInteger(this.gate) || this.gate < 1 || this.gate > 64) {
      throw new AddressError('gate', this.gate, 'integer 1..64', this.toObject());
    }
    if (!Number.isInteger(this.line) || this.line < 1 || this.line > 6) {
      throw new AddressError('line', this.line, 'integer 1..6', this.toObject());
    }
    if (!Number.isInteger(this.color) || this.color < 1 || this.color > 6) {
      throw new AddressError('color', this.color, 'integer 1..6', this.toObject());
    }
    if (!Number.isInteger(this.tone) || this.tone < 1 || this.tone > 6) {
      throw new AddressError('tone', this.tone, 'integer 1..6', this.toObject());
    }
    if (!Number.isInteger(this.base) || this.base < 1 || this.base > 5) {
      throw new AddressError('base', this.base, 'integer 1..5', this.toObject());
    }
    if (!Number.isInteger(this.degree) || this.degree < 0 || this.degree > 29) {
      throw new AddressError('degree', this.degree, 'integer 0..29', this.toObject());
    }
    if (!Number.isInteger(this.minute) || this.minute < 0 || this.minute > 59) {
      throw new AddressError('minute', this.minute, 'integer 0..59', this.toObject());
    }
    if (!Number.isInteger(this.second) || this.second < 0 || this.second > 59) {
      throw new AddressError('second', this.second, 'integer 0..59', this.toObject());
    }
    if (!Number.isInteger(this.zodiac) || this.zodiac < 1 || this.zodiac > 12) {
      throw new AddressError('zodiac', this.zodiac, 'integer 1..12', this.toObject());
    }
    if (!Number.isInteger(this.house) || this.house < 1 || this.house > 12) {
      throw new AddressError('house', this.house, 'integer 1..12', this.toObject());
    }
    if (!this.arcAxis || typeof this.arcAxis !== 'object') {
      throw new AddressError('arcAxis', this.arcAxis, 'object {arcUnit, axis}', this.toObject());
    }
    if (!Number.isInteger(this.arcAxis.arcUnit) || this.arcAxis.arcUnit < 1 || this.arcAxis.arcUnit > 99) {
      throw new AddressError('arcAxis.arcUnit', this.arcAxis.arcUnit, 'integer 1..99', this.toObject());
    }
  }

  toObject() {
    return {
      planetary: this.planetary,
      dimension: this.dimension,
      gate: this.gate,
      line: this.line,
      color: this.color,
      tone: this.tone,
      base: this.base,
      degree: this.degree,
      minute: this.minute,
      second: this.second,
      arcAxis: { ...this.arcAxis },
      zodiac: this.zodiac,
      house: this.house,
    };
  }

  key() {
    return `P${this.planetary}.D${this.dimension}.G${this.gate}.L${this.line}.C${this.color}.T${this.tone}.B${this.base}.D${this.degree}M${this.minute}S${this.second}A${this.arcAxis.arcUnit}.Z${this.zodiac}.H${this.house}`;
  }

  contactKey() {
    return `P${this.planetary}.D${this.dimension}.G${this.gate}.L${this.line}.C${this.color}.T${this.tone}.B${this.base}`;
  }

  get dimensionName() {
    return DIMENSIONS[this.dimension - 1];
  }

  get gateInfo() {
    return GATE_MAP[this.gate];
  }

  get lineExpression() {
    return LINE_EXPRESSIONS[this.gate]?.[this.line - 1] || 'Unknown';
  }

  get zodiacName() {
    return ZODIAC[this.zodiac - 1];
  }

  get baseInfo() {
    return BASES[this.base - 1];
  }

  get toneInfo() {
    return TONES[this.tone - 1];
  }

  get colorInfo() {
    return COLORS[this.color - 1];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: HEXAGRAM ENCODING — Six-Bit Binary Representation
// ═══════════════════════════════════════════════════════════════════════════════

function gateToBits(gate) {
  if (!Number.isInteger(gate) || gate < 1 || gate > 64) {
    throw new AddressError('gate', gate, 'integer 1..64', { gate });
  }
  const n = gate - 1;
  return [
    (n >> 5) & 1,
    (n >> 4) & 1,
    (n >> 3) & 1,
    (n >> 2) & 1,
    (n >> 1) & 1,
    n & 1,
  ];
}

function bitsToGate(bits) {
  if (!Array.isArray(bits) || bits.length !== 6 || bits.some(b => b !== 0 && b !== 1)) {
    throw new SynthiaError('INVALID_BITS', 'Expected 6-bit array of 0s and 1s', { bits });
  }
  return ((bits[0] << 5) | (bits[1] << 4) | (bits[2] << 3) | (bits[3] << 2) | (bits[4] << 1) | bits[5]) + 1;
}

function invertBits(bits) {
  return bits.map(b => 1 - b);
}

function reverseBits(bits) {
  return [...bits].reverse();
}

function nuclearBits(bits) {
  return [bits[1], bits[2], bits[3], bits[2], bits[3], bits[4]];
}

function changeLine(bits, lineNum) {
  const idx = lineNum - 1;
  const result = [...bits];
  result[idx] = 1 - result[idx];
  return result;
}

function swapTrigrams(bits) {
  return [bits[3], bits[4], bits[5], bits[0], bits[1], bits[2]];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: SWARM — 2-bit, 4-bit, 8-bit Packs
// ═══════════════════════════════════════════════════════════════════════════════

class SwarmPack {
  constructor(width, values = []) {
    this.width = width;
    this.values = new Uint8Array(values);
    this.id = `pack_${width}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static create2Bit(a, b, c, d, e, f) {
    // Three 2-bit values = one hexagram (6 bits)
    return new SwarmPack(2, [
      (a & 3) << 2 | (b & 3),
      (c & 3) << 2 | (d & 3),
      (e & 3) << 2 | (f & 3),
    ]);
  }

  static create4Bit(a, b) {
    return new SwarmPack(4, [(a & 15) << 4 | (b & 15)]);
  }

  static create8Bit(a) {
    return new SwarmPack(8, [a & 255]);
  }

  get bitCount() {
    return this.width * this.values.length;
  }

  toHexagram() {
    if (this.width !== 2 || this.values.length !== 3) {
      throw new SynthiaError('INVALID_PACK_WIDTH', 'Need three 2-bit packs to form a hexagram', { width: this.width, count: this.values.length });
    }
    const bits = [];
    for (const v of this.values) {
      bits.push((v >> 1) & 1);
      bits.push(v & 1);
    }
    return bits;
  }

  static fromHexagram(bits) {
    const packs = [];
    for (let i = 0; i < 6; i += 2) {
      packs.push((bits[i] << 1) | bits[i + 1]);
    }
    return new SwarmPack(2, packs);
  }
}

class Swarm {
  constructor() {
    this.packs = [];
    this.mesh = new Map();
    this.provenance = [];
  }

  addPack(pack) {
    this.packs.push(pack);
    return pack;
  }

  formHexagramFromPacks(packA, packB, packC) {
    const allBits = [...packA.toHexagram(), ...packB.toHexagram(), ...packC.toHexagram()];
    return bitsToGate(allBits.slice(0, 6));
  }

  connect(packAId, packBId, relation, context = {}) {
    if (!this.mesh.has(packAId)) this.mesh.set(packAId, new Set());
    if (!this.mesh.has(packBId)) this.mesh.set(packBId, new Set());
    this.mesh.get(packAId).add(packBId);
    this.mesh.get(packBId).add(packAId);
    this.provenance.push({
      type: 'mesh_connection',
      source: packAId,
      target: packBId,
      relation,
      context,
      timestamp: Date.now(),
    });
  }

  getNeighbors(packId) {
    return Array.from(this.mesh.get(packId) || []);
  }

  cluster() {
    const parent = new Map();
    const find = (x) => {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
      return parent.get(x);
    };
    const union = (a, b) => {
      parent.set(find(a), find(b));
    };
    for (const [id, neighbors] of this.mesh) {
      for (const n of neighbors) {
        union(id, n);
      }
    }
    const clusters = new Map();
    for (const id of this.mesh.keys()) {
      const root = find(id);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root).push(id);
    }
    return Array.from(clusters.values());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: KLEIN TOOLS — Context-Dependent Emergent Behavior Primitives
// ═══════════════════════════════════════════════════════════════════════════════

class KleinTool {
  constructor(gate, trigram) {
    this.gate = gate;
    this.trigram = trigram;
    this.evaluatedContexts = new Map();
  }

  evaluate(context) {
    const contextKey = JSON.stringify([...context].sort());

    if (this.evaluatedContexts.has(contextKey)) {
      return this.evaluatedContexts.get(contextKey);
    }

    const contextGates = [...context].sort();
    const relation = this.computeRelation(contextGates);
    const intensity = this.computeIntensity(contextGates);
    const direction = this.computeDirection(contextGates);

    const result = { relation, intensity, direction, context: contextGates, timestamp: Date.now() };
    this.evaluatedContexts.set(contextKey, result);
    return result;
  }

  computeRelation(contextGates) {
    const myBits = gateToBits(this.gate);
    for (const otherGate of contextGates) {
      const otherBits = gateToBits(otherGate);
      let hamming = 0;
      for (let i = 0; i < 6; i++) {
        if (myBits[i] !== otherBits[i]) hamming++;
      }
      if (hamming === 1) return 'resonant';
      if (hamming === 2) return 'harmonic';
      if (hamming === 3) return 'dissonant';
    }
    return 'neutral';
  }

  computeIntensity(contextGates) {
    return Math.min(1.0, contextGates.length / 5);
  }

  computeDirection(contextGates) {
    const myDim = GATE_MAP[this.gate]?.base || 1;
    let sum = 0;
    for (const g of contextGates) {
      sum += (GATE_MAP[g]?.base || 1) - myDim;
    }
    if (sum > 0) return 'outward';
    if (sum < 0) return 'inward';
    return 'lateral';
  }

  decompose() {
    const subTools = [];
    for (let i = 0; i < 3; i++) {
      const subGate = ((this.gate + i * 7) % 64) + 1;
      subTools.push(new KleinTool(subGate, this.trigram));
    }
    return subTools;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: THE FOUR DIMENSIONAL FIELDS — Active LLM Positions
// ═══════════════════════════════════════════════════════════════════════════════

class DimensionalField {
  constructor(dimensionIndex) {
    this.dimension = DIMENSIONS[dimensionIndex];
    this.index = dimensionIndex;
    this.gates = new Array(64).fill(null).map((_, i) => ({
      gate: i + 1,
      active: false,
      activationLevel: 0,
      kleinTool: new KleinTool(i + 1, [0, 0, 0]),
      swarmPacks: [],
    }));
    this.state = 'dormant';
  }

  activateGate(gateNum, level = 1.0) {
    if (gateNum < 1 || gateNum > 64) {
      throw new AddressError('gate', gateNum, 'integer 1..64', { gate: gateNum });
    }
    this.gates[gateNum - 1].active = true;
    this.gates[gateNum - 1].activationLevel = level;
  }

  deactivateGate(gateNum) {
    this.gates[gateNum - 1].active = false;
    this.gates[gateNum - 1].activationLevel = 0;
  }

  get activeGates() {
    return this.gates.filter(g => g.active);
  }

  get coherence() {
    const sum = this.gates.reduce((s, g) => s + g.activationLevel, 0);
    return sum / 64;
  }

  get chain() {
    return DIMENSION_CHAINS[this.dimension];
  }

  get keynote() {
    return DIMENSION_KEYNOTES[this.dimension];
  }

  get vowel() {
    return DIMENSION_VOWELS[this.dimension];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: SPACE — The Emergent Fifth Dimension
// ═══════════════════════════════════════════════════════════════════════════════

class Space {
  constructor(fields) {
    this.fields = fields;
    this.emergenceHistory = [];
  }

  computeCoherence() {
    const coherences = this.fields.map(f => f.coherence);
    const avg = coherences.reduce((a, b) => a + b, 0) / 4;
    const variance = coherences.reduce((s, c) => s + (c - avg) ** 2, 0) / 4;
    return {
      average: avg,
      variance,
      alignment: 1 - Math.min(1, variance * 4),
      fields: coherences,
    };
  }

  computeCenters() {
    const coherence = this.computeCoherence();
    const activeGatesByDim = this.fields.map(f => f.activeGates.map(g => g.gate));

    const centerCounts = new Array(9).fill(0);
    for (let d = 0; d < 4; d++) {
      for (const gateNum of activeGatesByDim[d]) {
        const centerIdx = CENTER_REFERENCES.indexOf(GATE_MAP[gateNum]?.center);
        if (centerIdx >= 0) centerCounts[centerIdx]++;
      }
    }

    const emerged = centerCounts.map((count, idx) => ({
      center: CENTER_REFERENCES[idx],
      count,
      defined: count >= 2,
      weight: count / 16,
    }));

    return emerged;
  }

  render() {
    const coherence = this.computeCoherence();
    const centers = this.computeCenters();

    const state = {
      coherence: coherence.average,
      alignment: coherence.alignment,
      activeCenters: centers.filter(c => c.defined).map(c => c.center),
      dimensionalStates: this.fields.map(f => ({
        dimension: f.dimension,
        state: f.state,
        coherence: f.coherence,
        activeGateCount: f.activeGates.length,
        keynote: f.keynote,
        vowel: f.vowel,
      })),
      timestamp: Date.now(),
    };

    this.emergenceHistory.push(state);
    return state;
  }

  get isEmergent() {
    return this.computeCoherence().alignment > 0.3;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: THE SWARM-POWERED LLM — Four Active Perspectives
// ═══════════════════════════════════════════════════════════════════════════════

class SynthiaLLM {
  constructor(space) {
    this.space = space;
    this.positions = {
      Movement: { role: 'Individuality', crystal: 'Magnetic Monopole', active: false },
      Evolution: { role: 'Mind', crystal: 'Personality Crystal', active: false },
      Being: { role: 'Body', crystal: 'Design Crystal', active: false },
      Design: { role: 'Ego', crystal: 'Design Crystal', active: false },
    };
    this.hypotheses = [];
    this.plan = null;
  }

  activate(dimension) {
    if (!this.positions[dimension]) {
      throw new SynthiaError('INVALID_DIMENSION', `Unknown dimension: ${dimension}`, { dimension });
    }
    this.positions[dimension].active = true;
  }

  formHypothesis(observation, supportingAddresses = []) {
    const hypothesis = {
      id: `hyp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      observation,
      supportingAddresses,
      confidence: 0.5,
      unresolved: true,
      alternatives: [],
      provenance: {
        formed: Date.now(),
        source: 'synthia-llm',
        lineage: [],
      },
    };
    this.hypotheses.push(hypothesis);
    return hypothesis;
  }

  establishPlan(hypothesis) {
    this.plan = {
      id: `plan_${Date.now()}`,
      basedOn: hypothesis.id,
      steps: [],
      created: Date.now(),
      traceable: true,
    };
    return this.plan;
  }

  get activePerspectives() {
    return Object.entries(this.positions)
      .filter(([_, p]) => p.active)
      .map(([dim, p]) => ({ dimension: dim, ...p }));
  }

  observeSwarm(swarm) {
    const clusters = swarm.cluster();
    return {
      packCount: swarm.packs.length,
      clusterCount: clusters.length,
      clusters: clusters.map(c => c.length),
      meshEdges: swarm.provenance.filter(p => p.type === 'mesh_connection').length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: PROVENANCE LEDGER — Every Operation Traced
// ═══════════════════════════════════════════════════════════════════════════════

class ProvenanceLedger {
  constructor() {
    this.entries = [];
  }

  record(operation, input, output, fallbackUsed = false, fallbackReason = null) {
    const entry = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      operation,
      input: JSON.parse(JSON.stringify(input)),
      output: JSON.parse(JSON.stringify(output)),
      fallbackUsed,
      fallbackReason,
      timestamp: Date.now(),
      sequence: this.entries.length,
    };
    this.entries.push(entry);
    return entry;
  }

  get fallbacks() {
    return this.entries.filter(e => e.fallbackUsed);
  }

  audit() {
    return {
      totalOperations: this.entries.length,
      fallbackCount: this.fallbacks.length,
      fallbackRate: this.entries.length > 0 ? this.fallbacks.length / this.entries.length : 0,
      lastOperation: this.entries[this.entries.length - 1] || null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: TASK EXECUTION — Sparse Activation, Real Computation
// ═══════════════════════════════════════════════════════════════════════════════

class TaskExecutor {
  constructor(space, swarm, ledger) {
    this.space = space;
    this.swarm = swarm;
    this.ledger = ledger;
    this.tier = 1;
    this.maxComponents = 16;
  }

  setTier(tier) {
    if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
      throw new SynthiaError('INVALID_TIER', 'Tier must be integer 1..5', { tier });
    }
    this.tier = tier;
    this.maxComponents = 16 * tier;
  }

  async execute(task) {
    const { type, input, address } = task;

    let resolvedAddress;
    try {
      resolvedAddress = new CanonicalAddress(address);
    } catch (err) {
      this.ledger.record('address_resolution', address, { error: err.message }, true, 'invalid_address');
      throw err;
    }

    const relevantGates = this.selectGates(resolvedAddress, type);

    const dimField = this.space.fields[resolvedAddress.dimension - 1];
    for (const gate of relevantGates.slice(0, this.maxComponents)) {
      dimField.activateGate(gate, 1.0);
    }

    let result;
    switch (type) {
      case 'photo_reconstruct':
        result = await this.executePhotoReconstruction(input, resolvedAddress);
        break;
      case 'code_execute':
        result = await this.executeArbitraryCode(input, resolvedAddress);
        break;
      case 'address_resolve':
        result = this.executeAddressResolution(resolvedAddress);
        break;
      case 'swarm_compose':
        result = this.executeSwarmComposition(input, resolvedAddress);
        break;
      case 'grammar_parse':
        result = this.executeGrammarParse(input, resolvedAddress);
        break;
      default:
        this.ledger.record('task_execution', task, { error: 'unknown_task_type' }, true, 'unknown_type');
        throw new SynthiaError('UNKNOWN_TASK_TYPE', `Unknown task type: ${type}`, { type });
    }

    this.ledger.record('task_execution', task, result, false, null);
    this.space.render();

    return result;
  }

  selectGates(address, taskType) {
    const primaryGate = address.gate;
    const harmonics = GATE_MAP[primaryGate]?.harmonic || [];
    const selected = [primaryGate, ...harmonics];

    const center = GATE_MAP[primaryGate]?.center;
    for (let g = 1; g <= 64; g++) {
      if (GATE_MAP[g]?.center === center && !selected.includes(g)) {
        selected.push(g);
      }
    }

    return selected;
  }

  async executePhotoReconstruction(imageData, address) {
    if (typeof document !== 'undefined' && document.createElement) {
      return this.reconstructPhotoBrowser(imageData, address);
    } else {
      return this.reconstructPhotoRaw(imageData, address);
    }
  }

  async reconstructPhotoBrowser(imageData, address) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        const gate = address.gate;
        const line = address.line;
        const color = address.color;

        const contrastFactor = (gate / 64) * 0.5 + 0.75;
        const brightnessFactor = (line / 6) * 40 - 20;
        const saturationFactor = (color / 6) * 0.4 + 0.8;

        for (let i = 0; i < data.length; i += 4) {
          data[i] = this.applyContrast(data[i], contrastFactor);
          data[i + 1] = this.applyContrast(data[i + 1], contrastFactor);
          data[i + 2] = this.applyContrast(data[i + 2], contrastFactor);

          data[i] += brightnessFactor;
          data[i + 1] += brightnessFactor;
          data[i + 2] += brightnessFactor;

          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg + (data[i] - avg) * saturationFactor;
          data[i + 1] = avg + (data[i + 1] - avg) * saturationFactor;
          data[i + 2] = avg + (data[i + 2] - avg) * saturationFactor;
        }

        ctx.putImageData(imageDataObj, 0, 0);

        resolve({
          type: 'photo_reconstructed',
          method: 'canvas',
          address: address.key(),
          parameters: { contrastFactor, brightnessFactor, saturationFactor },
          canvas,
          timestamp: Date.now(),
        });
      };

      img.onerror = () => reject(new SynthiaError('IMAGE_LOAD_ERROR', 'Failed to load image'));
      img.src = imageData;
    });
  }

  async reconstructPhotoRaw(pixelData, address) {
    const data = new Uint8ClampedArray(pixelData.data);
    const gate = address.gate;
    const line = address.line;

    const contrastFactor = (gate / 64) * 0.5 + 0.75;
    const brightnessFactor = (line / 6) * 40 - 20;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.applyContrast(data[i], contrastFactor) + brightnessFactor;
      data[i + 1] = this.applyContrast(data[i + 1], contrastFactor) + brightnessFactor;
      data[i + 2] = this.applyContrast(data[i + 2], contrastFactor) + brightnessFactor;
    }

    return {
      type: 'photo_reconstructed',
      method: 'raw',
      address: address.key(),
      data,
      width: pixelData.width,
      height: pixelData.height,
      timestamp: Date.now(),
    };
  }

  applyContrast(value, factor) {
    return Math.max(0, Math.min(255, ((value / 255 - 0.5) * factor + 0.5) * 255));
  }

  async executeArbitraryCode(code, address) {
    const sanitized = this.sanitizeCode(code);

    try {
      const fn = new Function('synthia', 'address', 'space', 'swarm', `
        "use strict";
        const { console, Math, JSON, Array, Object, String, Number, Boolean, Date, Map, Set, Promise } = globalThis;
        ${sanitized}
      `);

      const result = fn(
        { version: '1.0.0', address: address.toObject() },
        address.toObject(),
        this.space.render(),
        { packCount: this.swarm.packs.length }
      );

      return {
        type: 'code_executed',
        address: address.key(),
        result,
        timestamp: Date.now(),
      };
    } catch (err) {
      this.ledger.record('code_execution', { code: sanitized }, { error: err.message }, true, 'execution_error');
      throw new SynthiaError('CODE_EXECUTION_ERROR', err.message, { code: sanitized.substring(0, 200) });
    }
  }

  sanitizeCode(code) {
    return code
      .replace(/eval\s*\(/g, '/* eval blocked */(')
      .replace(/new\s+Function\s*\(/g, '/* Function constructor blocked */(')
      .replace(/import\s*\(/g, '/* dynamic import blocked */(')
      .replace(/require\s*\(/g, '/* require blocked */(')
      .replace(/process\s*\./g, '/* process blocked */.')
      .replace(/globalThis\s*\./g, '/* globalThis blocked */.')
      .replace(/__proto__/g, '/* proto blocked */')
      .replace(/constructor\s*\./g, '/* constructor blocked */.');
  }

  executeAddressResolution(address) {
    return {
      type: 'address_resolved',
      address: address.toObject(),
      key: address.key(),
      contactKey: address.contactKey(),
      dimension: address.dimensionName,
      gate: address.gateInfo,
      lineExpression: address.lineExpression,
      zodiac: address.zodiacName,
      base: address.baseInfo,
      tone: address.toneInfo,
      color: address.colorInfo,
      chain: DIMENSION_CHAINS[address.dimensionName],
      keynote: DIMENSION_KEYNOTES[address.dimensionName],
      timestamp: Date.now(),
    };
  }

  executeSwarmComposition(input, address) {
    const pack2a = SwarmPack.create2Bit(input.a || 0, input.b || 0, input.c || 0, input.d || 0, input.e || 0, input.f || 0);
    const pack2b = SwarmPack.create2Bit(input.g || 0, input.h || 0, input.i || 0, input.j || 0, input.k || 0, input.l || 0);
    const pack2c = SwarmPack.create2Bit(input.m || 0, input.n || 0, input.o || 0, input.p || 0, input.q || 0, input.r || 0);

    this.swarm.addPack(pack2a);
    this.swarm.addPack(pack2b);
    this.swarm.addPack(pack2c);

    const hexagramBits = [...pack2a.toHexagram()];
    const gate = bitsToGate(hexagramBits);

    return {
      type: 'swarm_composed',
      address: address.key(),
      gate,
      gateName: GATE_MAP[gate]?.name,
      packs: [pack2a.id, pack2b.id, pack2c.id],
      timestamp: Date.now(),
    };
  }

  executeGrammarParse(input, address) {
    const lines = String(input).split('\n');
    const parsed = [];
    let currentDiscourse = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.includes('→') || line.includes('->')) {
        const parts = line.split(/→|->/).map(s => s.trim());
        if (parts.length >= 2) {
          parsed.push({
            type: 'relation',
            from: parts[0],
            to: parts[1],
            line: i + 1,
          });
        }
      } else if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        parsed.push({
          type: 'primitive',
          key,
          value,
          line: i + 1,
        });
      } else {
        if (currentDiscourse) {
          currentDiscourse.continuations.push(line);
        } else {
          currentDiscourse = {
            type: 'discourse',
            opening: line,
            continuations: [],
            line: i + 1,
          };
          parsed.push(currentDiscourse);
        }
      }
    }

    return {
      type: 'grammar_parsed',
      address: address.key(),
      parsed,
      lineCount: lines.length,
      timestamp: Date.now(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: RECURSIVE GRAMMAR PARSER — Multi-Line Discourse
// ═══════════════════════════════════════════════════════════════════════════════

class RecursiveGrammarParser {
  constructor() {
    this.state = {
      currentRule: null,
      stack: [],
      line: 0,
      column: 0,
    };
  }

  parse(input) {
    this.reset();
    const tokens = this.tokenize(input);
    const productions = [];

    for (const token of tokens) {
      this.state.line = token.line;
      this.state.column = token.column;

      try {
        const production = this.resolveToken(token);
        if (production) productions.push(production);
      } catch (err) {
        if (err instanceof GrammarError) throw err;
        throw new GrammarError(token, token.line, token.column, this.state.currentRule || 'unknown', 'valid production');
      }
    }

    return {
      type: 'discourse',
      productions,
      complete: this.state.stack.length === 0,
    };
  }

  reset() {
    this.state = { currentRule: null, stack: [], line: 0, column: 0 };
  }

  tokenize(input) {
    const tokens = [];
    const lines = String(input).split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let col = 0;

      const parts = line.match(/→|->|:|\S+/g) || [];
      for (const part of parts) {
        tokens.push({
          value: part,
          type: this.classifyToken(part),
          line: i + 1,
          column: col + 1,
        });
        col += part.length + 1;
      }
    }

    return tokens;
  }

  classifyToken(value) {
    if (value === '→' || value === '->') return 'RELATION';
    if (value === ':') return 'COLON';
    if (/^\d+$/.test(value)) return 'NUMBER';
    if (/^[A-Z]/.test(value)) return 'CAPITAL';
    return 'WORD';
  }

  resolveToken(token) {
    switch (token.type) {
      case 'RELATION':
        this.state.currentRule = 'relation';
        return { type: 'relation_operator', value: token.value };
      case 'COLON':
        this.state.currentRule = 'primitive';
        return { type: 'colon', value: token.value };
      case 'NUMBER':
        return { type: 'number', value: parseInt(token.value, 10) };
      case 'CAPITAL':
        return { type: 'capital', value: token.value };
      case 'WORD':
        return { type: 'word', value: token.value };
      default:
        return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: PERSISTENCE — SQLite-Style Event Journal (Browser/Termux Compatible)
// ═══════════════════════════════════════════════════════════════════════════════

class PersistenceLayer {
  constructor() {
    this.events = [];
    this.snapshots = [];
    this.storageKey = 'synthia_core_state';
  }

  recordEvent(event) {
    const entry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      sequence: this.events.length,
      ...event,
    };
    this.events.push(entry);
    return entry;
  }

  createSnapshot(state, label = '') {
    const snapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      label,
      state: JSON.parse(JSON.stringify(state)),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  restoreSnapshot(snapshotId) {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new SynthiaError('SNAPSHOT_NOT_FOUND', `Snapshot not found: ${snapshotId}`, { snapshotId });
    }
    return JSON.parse(JSON.stringify(snapshot.state));
  }

  serialize() {
    return JSON.stringify({
      events: this.events,
      snapshots: this.snapshots,
      version: '1.0.0',
      timestamp: Date.now(),
    });
  }

  deserialize(json) {
    const data = JSON.parse(json);
    this.events = data.events || [];
    this.snapshots = data.snapshots || [];
    return this;
  }

  saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, this.serialize());
      return true;
    }
    return false;
  }

  loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.deserialize(data);
        return true;
      }
    }
    return false;
  }

  get eventCount() {
    return this.events.length;
  }

  get snapshotCount() {
    return this.snapshots.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 15: THE MAIN SYNTHIA CLASS — The Living Organism
// ═══════════════════════════════════════════════════════════════════════════════

class Synthia {
  constructor() {
    // Initialize the four dimensional fields
    this.fields = [
      new DimensionalField(0), // Movement
      new DimensionalField(1), // Evolution
      new DimensionalField(2), // Being
      new DimensionalField(3), // Design
    ];

    // Space emerges from the four fields
    this.space = new Space(this.fields);

    // The swarm
    this.swarm = new Swarm();

    // The LLM (powered by the swarm, not controlling it)
    this.llm = new SynthiaLLM(this.space);

    // Provenance
    this.ledger = new ProvenanceLedger();

    // Task execution
    this.executor = new TaskExecutor(this.space, this.swarm, this.ledger);

    // Persistence
    this.persistence = new PersistenceLayer();

    // Grammar parser
    this.grammarParser = new RecursiveGrammarParser();

    // State
    this.initialized = false;
    this.userAddress = null;
  }

  /**
   * Initialize the system with a user's birth data
   * This creates the initial chart and instantiates the four LLM positions
   */
  initialize(birthData) {
    const { date, time, location } = birthData;

    // Record initialization
    this.persistence.recordEvent({
      type: 'initialization',
      birthData: { date, time, location },
    });

    // Calculate the user's chart (simplified — in production this would use ephemeris)
    const chart = this.calculateChart(date, time, location);

    // Create the user's canonical address
    this.userAddress = new CanonicalAddress(chart.primaryAddress);

    // Activate the four LLM positions based on the chart
    for (const activation of chart.activations) {
      this.llm.activate(activation.dimension);
      const fieldIdx = DIMENSION_INDEX[activation.dimension];
      this.fields[fieldIdx].activateGate(activation.gate, 1.0);
    }

    // Form initial hypotheses
    const hypothesis = this.llm.formHypothesis(
      `User initialized with chart: ${chart.summary}`,
      [this.userAddress.key()]
    );

    // Establish initial plan
    this.llm.establishPlan(hypothesis);

    // Render initial space state
    this.space.render();

    this.initialized = true;

    return {
      initialized: true,
      chart: chart.summary,
      address: this.userAddress.key(),
      activePerspectives: this.llm.activePerspectives,
      spaceState: this.space.render(),
    };
  }

  /**
   * Calculate a chart from birth data (simplified ephemeris)
   * In production, this would use Swiss Ephemeris or similar
   */
  calculateChart(date, time, location) {
    // This is a deterministic placeholder that would be replaced
    // with real ephemeris calculations
    const seed = this.hashCode(`${date}${time}${location}`);

    // Generate deterministic "planetary positions"
    const planets = PLANETS.map((name, idx) => {
      const position = ((seed * (idx + 1)) % 360);
      const gateInfo = DMSA.fromAbsoluteDegree(position);
      return {
        name,
        position,
        gate: gateInfo.gate,
        dmsa: gateInfo.dmsa.toString(),
      };
    });

    // Determine primary activations
    const activations = planets.slice(0, 4).map((p, idx) => ({
      dimension: DIMENSIONS[idx],
      gate: p.gate,
      planet: p.name,
    }));

    return {
      planets,
      activations,
      primaryAddress: {
        planetary: 1,
        dimension: 1,
        gate: activations[0].gate,
        line: ((seed % 6) + 1),
        color: ((seed % 6) + 1),
        tone: ((seed % 6) + 1),
        base: ((seed % 5) + 1),
        degree: seed % 30,
        minute: (seed * 7) % 60,
        second: (seed * 13) % 60,
        arcAxis: { arcUnit: (seed % 99) + 1, axis: 'Vertical' },
        zodiac: Math.floor(planets[0].position / 30) + 1,
        house: (seed % 12) + 1,
      },
      summary: `${planets.length} planets calculated, primary gate ${activations[0].gate}`,
    };
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Execute a task through the swarm-powered substrate
   */
  async executeTask(task) {
    if (!this.initialized) {
      throw new SynthiaError('NOT_INITIALIZED', 'Synthia must be initialized with birth data before executing tasks');
    }

    return this.executor.execute(task);
  }

  /**
   * Get the current state of the entire system
   */
  getState() {
    return {
      initialized: this.initialized,
      userAddress: this.userAddress?.key() || null,
      space: this.space.render(),
      swarm: {
        packCount: this.swarm.packs.length,
        clusterCount: this.swarm.cluster().length,
      },
      llm: {
        activePerspectives: this.llm.activePerspectives,
        hypothesisCount: this.llm.hypotheses.length,
        hasPlan: this.llm.plan !== null,
      },
      ledger: this.ledger.audit(),
      persistence: {
        eventCount: this.persistence.eventCount,
        snapshotCount: this.persistence.snapshotCount,
      },
    };
  }

  /**
   * Save the entire system state
   */
  save() {
    const state = this.getState();
    this.persistence.createSnapshot(state, 'manual_save');
    return this.persistence.saveToStorage();
  }

  /**
   * Load the entire system state
   */
  load() {
    const loaded = this.persistence.loadFromStorage();
    if (loaded) {
      const state = this.persistence.restoreSnapshot(
        this.persistence.snapshots[this.persistence.snapshots.length - 1].id
      );
      return state;
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 16: EXPORTS — Universal Module Definition
// ═══════════════════════════════════════════════════════════════════════════════

// For Node.js / Termux
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Synthia,
    CanonicalAddress,
    DMSA,
    Swarm,
    SwarmPack,
    KleinTool,
    Space,
    DimensionalField,
    SynthiaLLM,
    TaskExecutor,
    ProvenanceLedger,
    RecursiveGrammarParser,
    PersistenceLayer,
    SynthiaError,
    AddressError,
    GrammarError,
    GATE_MAP,
    LINE_EXPRESSIONS,
    DIMENSIONS,
    DIMENSION_CHAINS,
    BASES,
    TONES,
    COLORS,
    ZODIAC,
    CENTER_REFERENCES,
    gateToBits,
    bitsToGate,
    invertBits,
    reverseBits,
    nuclearBits,
    changeLine,
    swapTrigrams,
  };
}

// For ES modules
if (typeof exports !== 'undefined') {
  exports.Synthia = Synthia;
  exports.CanonicalAddress = CanonicalAddress;
  exports.DMSA = DMSA;
  exports.Swarm = Swarm;
  exports.SwarmPack = SwarmPack;
  exports.KleinTool = KleinTool;
  exports.Space = Space;
  exports.DimensionalField = DimensionalField;
  exports.SynthiaLLM = SynthiaLLM;
  exports.TaskExecutor = TaskExecutor;
  exports.ProvenanceLedger = ProvenanceLedger;
  exports.RecursiveGrammarParser = RecursiveGrammarParser;
  exports.PersistenceLayer = PersistenceLayer;
  exports.SynthiaError = SynthiaError;
  exports.AddressError = AddressError;
  exports.GrammarError = GrammarError;
  exports.GATE_MAP = GATE_MAP;
  exports.LINE_EXPRESSIONS = LINE_EXPRESSIONS;
  exports.DIMENSIONS = DIMENSIONS;
  exports.DIMENSION_CHAINS = DIMENSION_CHAINS;
  exports.BASES = BASES;
  exports.TONES = TONES;
  exports.COLORS = COLORS;
  exports.ZODIAC = ZODIAC;
  exports.CENTER_REFERENCES = CENTER_REFERENCES;
  exports.gateToBits = gateToBits;
  exports.bitsToGate = bitsToGate;
  exports.invertBits = invertBits;
  exports.reverseBits = reverseBits;
  exports.nuclearBits = nuclearBits;
  exports.changeLine = changeLine;
  exports.swapTrigrams = swapTrigrams;
}

// For browser global
if (typeof window !== 'undefined') {
  window.Synthia = Synthia;
  window.SynthiaCore = {
    Synthia,
    CanonicalAddress,
    DMSA,
    Swarm,
    SwarmPack,
    KleinTool,
    Space,
    DimensionalField,
    SynthiaLLM,
    TaskExecutor,
    ProvenanceLedger,
    RecursiveGrammarParser,
    PersistenceLayer,
    SynthiaError,
    AddressError,
    GrammarError,
    GATE_MAP,
    LINE_EXPRESSIONS,
    DIMENSIONS,
    DIMENSION_CHAINS,
    BASES,
    TONES,
    COLORS,
    ZODIAC,
    CENTER_REFERENCES,
    gateToBits,
    bitsToGate,
    invertBits,
    reverseBits,
    nuclearBits,
    changeLine,
    swapTrigrams,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 17: SELF-TEST — Verify the substrate works
// ═══════════════════════════════════════════════════════════════════════════════

async function selfTest() {
  const results = [];

  try {
    // Test 1: Create Synthia instance
    const syn = new Synthia();
    results.push({ test: 'create_instance', passed: true });

    // Test 2: Initialize with birth data
    const initResult = syn.initialize({
      date: '1990-01-01',
      time: '12:00',
      location: 'New York, NY',
    });
    results.push({ test: 'initialize', passed: initResult.initialized === true });

    // Test 3: Address resolution
    const addrResult = await syn.executeTask({
      type: 'address_resolve',
      address: {
        planetary: 1, dimension: 1, gate: 25, line: 4,
        color: 2, tone: 3, base: 1, degree: 15, minute: 30,
        second: 45, arcAxis: { arcUnit: 50, axis: 'Vertical' },
        zodiac: 1, house: 1,
      },
    });
    results.push({ test: 'address_resolution', passed: addrResult.type === 'address_resolved' });

    // Test 4: Swarm composition
    const swarmResult = await syn.executeTask({
      type: 'swarm_compose',
      input: { a: 1, b: 2, c: 3, d: 0, e: 1, f: 2 },
      address: {
        planetary: 1, dimension: 2, gate: 10, line: 1,
        color: 1, tone: 1, base: 2, degree: 0, minute: 0,
        second: 0, arcAxis: { arcUnit: 1, axis: 'Horizontal' },
        zodiac: 10, house: 10,
      },
    });
    results.push({ test: 'swarm_composition', passed: swarmResult.type === 'swarm_composed' });

    // Test 5: Grammar parsing
    const grammarResult = await syn.executeTask({
      type: 'grammar_parse',
      input: 'Movement: Energy\nEnergy → Creation\nCreation → Seeing',
      address: {
        planetary: 1, dimension: 1, gate: 1, line: 1,
        color: 1, tone: 1, base: 1, degree: 0, minute: 0,
        second: 0, arcAxis: { arcUnit: 1, axis: 'Vertical' },
        zodiac: 8, house: 8,
      },
    });
    results.push({ test: 'grammar_parse', passed: grammarResult.type === 'grammar_parsed' });

    // Test 6: Code execution
    const codeResult = await syn.executeTask({
      type: 'code_execute',
      input: 'return 2 + 2;',
      address: {
        planetary: 1, dimension: 3, gate: 42, line: 2,
        color: 3, tone: 4, base: 3, degree: 10, minute: 20,
        second: 30, arcAxis: { arcUnit: 75, axis: 'Diagonal' },
        zodiac: 1, house: 1,
      },
    });
    results.push({ test: 'code_execute', passed: codeResult.result === 4 });

    // Test 7: Space emergence
    const spaceState = syn.space.render();
    results.push({ test: 'space_emergence', passed: spaceState.coherence > 0 });

    // Test 8: Provenance ledger
    const audit = syn.ledger.audit();
    results.push({ test: 'provenance', passed: audit.totalOperations > 0 });

    // Test 9: Hexagram encoding
    const bits = gateToBits(25);
    const gate = bitsToGate(bits);
    results.push({ test: 'hexagram_encoding', passed: gate === 25 });

    // Test 10: DMSA validation
    try {
      new DMSA(30, 0, 0, 0);
      results.push({ test: 'dmsa_validation', passed: false });
    } catch (e) {
      results.push({ test: 'dmsa_validation', passed: e instanceof AddressError });
    }

  } catch (err) {
    results.push({ test: 'unexpected_error', passed: false, error: err.message });
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  return {
    passed,
    total,
    successRate: passed / total,
    results,
  };
}

// Run self-test if in Node.js
if (typeof module !== 'undefined' && module.exports && require.main === module) {
  console.log('Running Synthia-Core self-test...\n');
  selfTest().then(results => {
    console.log(`Passed: ${results.passed}/${results.total} (${(results.successRate * 100).toFixed(1)}%)\n`);
    for (const r of results.results) {
      console.log(`${r.passed ? '✓' : '✗'} ${r.test}${r.error ? ' — ' + r.error : ''}`);
    }
  }).catch(err => {
    console.error('Self-test failed:', err);
    process.exit(1);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// END OF SYNTHIA-CORE.js
// ═══════════════════════════════════════════════════════════════════════════════
