// Chains/Colors tests — run with node from project root: node test/chains-colors.test.mjs
// Covers src/state-space/chains.js (Turn-10 Black Book pp.126–130 + Book of
// Colors chart) against docs/corpus/black-book-chains-colors.md: verbatim
// string equality, blank cell C17, per-dimension perspectives (nulls), three
// conditions 2/4/5, COLOR/TONE/BASE completeness, [sic] spellings, and the
// double-attested keynote conflicts C13/C14 (never resolved).
import { fileURLToPath } from 'node:url';
import { CLAIM_STATUS, isClaim } from '../src/state-space/claim-status.js';
import {
  DIMENSION_CHAINS, ORDINAL_PERSPECTIVES, THREE_CONDITIONS,
  CRYSTALS_AND_MONOPOLE, COLOR_TABLE, TONE_TABLE, BASE_TABLE,
  KEYNOTE_CONFLICTS, seedChainsColorsCanon, CHAINS_COLORS_REGISTRY,
} from '../src/state-space/chains.js';
import { SENSE_DIMENSIONS } from '../src/state-space/primitive-dimensions.js';
import { CanonRegistry } from '../src/engine/canon-registry.js';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function run({ quiet } = {}) {
  let passed = 0; let failed = 0;
  const failures = [];
  const check = (name, cond) => {
    if (cond) { passed++; if (!quiet) console.log(`ok   ${name}`); }
    else { failed++; failures.push(name); console.log(`FAIL ${name}`); }
  };

  const ALLOWED_SOURCES = ['BB-p126', 'BB-p127', 'BB-p128', 'BB-p129', 'BB-p130', 'BOC-chart'];

  // =============== 1. macro chains — verbatim equality, all five ===============
  const MACRO = {
    Movement: ['Movement is Energy', 'Energy is Creation', 'Creation is Seeing', 'Seeing is Landscape', 'Landscape is Environment'],
    Evolution: ['Evolution is Gravity', 'Gravity is Memory', 'Memory is Taste', 'Taste is Love', 'Love is Light'],
    Being: ['Being is Matter', 'Matter is', 'Matter is Touch', 'Touch is Sex', 'Sex is Survival'],
    Design: ['Design is Structure', 'Structure is Progress', 'Progress is Smelt', 'Smelling is Life', 'Life is Art'],
    Space: ['Space is Form', 'Form is Illusion', 'Illusion is Hearing', 'Hearing is Music', 'Music is Freedom'],
  };
  for (const [dim, sentences] of Object.entries(MACRO)) {
    check(`macro chain ${dim}: verbatim sentences exact (corpus doc §1)`,
      eq(DIMENSION_CHAINS[dim].macroChain.map((s) => s.value), sentences));
    check(`macro chain ${dim}: every sentence is a SOURCE_STATEMENT claim citing BB-p126`,
      DIMENSION_CHAINS[dim].macroChain.every((s) => isClaim(s)
        && s.status === CLAIM_STATUS.SOURCE_STATEMENT && s.source === 'BB-p126'));
  }
  check('Design chain preserves printed "Smelt" verbatim (not "corrected" to Smell)',
    DIMENSION_CHAINS.Design.macroChain[2].value === 'Progress is Smelt');

  // =============== 2. Being blank cell C17 ===============
  const blank = DIMENSION_CHAINS.Being.macroChain[1];
  check('"Matter is" blank cell: verbatim string, blankCell true, conflictId C17',
    blank.value === 'Matter is' && blank.blankCell === true && blank.conflictId === 'C17');
  check('blank cell predicate NEVER filled: value ends at "is", no other chain entry is blank',
    blank.value === 'Matter is' && !/\S$/.test(blank.value.replace(/Matter is$/, ''))
    && DIMENSION_CHAINS.Being.macroChain.filter((s) => s.blankCell).length === 1);
  check('C17 second attestation: BB-p130 Body chain keeps "Matter is." verbatim',
    CRYSTALS_AND_MONOPOLE.designCrystal.value.binary[0].chainText.includes('Matter is.'));

  // =============== 3. micro layers (BB-p126) ===============
  check('micro names: Individuality / The Mind / The Body / The Ego / Personality',
    DIMENSION_CHAINS.Movement.micro.value.name === 'Individuality'
    && DIMENSION_CHAINS.Evolution.micro.value.name === 'The Mind'
    && DIMENSION_CHAINS.Being.micro.value.name === 'The Body'
    && DIMENSION_CHAINS.Design.micro.value.name === 'The Ego'
    && DIMENSION_CHAINS.Space.micro.value.name === 'Personality');
  check('micro nature lists verbatim (Movement; Being spot-check)',
    eq(DIMENSION_CHAINS.Movement.micro.value.nature, ['Activity', 'Reaction', 'Limitation', 'Perspective', 'Relation'])
    && eq(DIMENSION_CHAINS.Being.micro.value.nature, ['Biology', 'Chemistry', 'Objectivity', 'Geometry', 'Trajectory']));
  check('micro keynotes verbatim: "I Define" / "I Remember" / "I am" (lowercase as printed) / "I Design" / "I Think"',
    DIMENSION_CHAINS.Movement.micro.value.keynote.phrase === 'I Define'
    && DIMENSION_CHAINS.Evolution.micro.value.keynote.phrase === 'I Remember'
    && DIMENSION_CHAINS.Being.micro.value.keynote.phrase === 'I am'
    && DIMENSION_CHAINS.Design.micro.value.keynote.phrase === 'I Design'
    && DIMENSION_CHAINS.Space.micro.value.keynote.phrase === 'I Think');

  // =============== 4. symbols + basic components (BB-p128/129) ===============
  check('four-dimension chart symbols Ǝ/E/M/◆; Space symbol null (appended row prints no symbol)',
    DIMENSION_CHAINS.Movement.symbol.value === 'Ǝ'
    && DIMENSION_CHAINS.Evolution.symbol.value === 'E'
    && DIMENSION_CHAINS.Being.symbol.value === 'M'
    && DIMENSION_CHAINS.Design.symbol.value === '◆'
    && DIMENSION_CHAINS.Space.symbol === null);
  check('basic components: four-dimension chart (Monopole/Personality Crystal/The Atom/Design Crystal; Space appended = Personality Crystal)',
    DIMENSION_CHAINS.Movement.basicComponents.fourDimensionChart.value === 'Magnetic Monopole'
    && DIMENSION_CHAINS.Evolution.basicComponents.fourDimensionChart.value === 'Personality Crystal'
    && DIMENSION_CHAINS.Being.basicComponents.fourDimensionChart.value === 'The Atom'
    && DIMENSION_CHAINS.Design.basicComponents.fourDimensionChart.value === 'Design Crystal'
    && DIMENSION_CHAINS.Space.basicComponents.fourDimensionChart.value === 'Personality Crystal');
  check('three-conditions components: singularity Quarks(Being), postBigBang Atomic(Being); Space null in both',
    DIMENSION_CHAINS.Being.basicComponents.threeConditions.singularity.value === 'Quarks'
    && DIMENSION_CHAINS.Being.basicComponents.threeConditions.postBigBang.value === 'Atomic'
    && DIMENSION_CHAINS.Space.basicComponents.threeConditions.singularity === null
    && DIMENSION_CHAINS.Space.basicComponents.threeConditions.postBigBang === null);

  // =============== 5. ORDINAL_PERSPECTIVES (BB-p127) ===============
  check("Being's ordinal perspective exact: Being/Movement/Space/Design/Evolution",
    isClaim(ORDINAL_PERSPECTIVES.Being) && ORDINAL_PERSPECTIVES.Being.source === 'BB-p127'
    && eq(ORDINAL_PERSPECTIVES.Being.value, ['Being', 'Movement', 'Space', 'Design', 'Evolution']));
  check('unattested ordinal perspectives are null — never guessed',
    ORDINAL_PERSPECTIVES.Movement === null && ORDINAL_PERSPECTIVES.Evolution === null
    && ORDINAL_PERSPECTIVES.Design === null && ORDINAL_PERSPECTIVES.Space === null);

  // =============== 6. THREE_CONDITIONS (BB-p129) ===============
  check('three-conditions formulas exact as printed: "Ǝ ⟶ M" / "Ǝ = ME◆" / "Ǝ = M <²"',
    THREE_CONDITIONS.preBigBang.value.formula === 'Ǝ ⟶ M'
    && THREE_CONDITIONS.singularity.value.formula === 'Ǝ = ME◆'
    && THREE_CONDITIONS.postBigBang.value.formula === 'Ǝ = M <²');
  check('dimensional counts 2 / 4 / 5',
    eq(THREE_CONDITIONS.dimensionalCount.value, { pre: 2, singularity: 4, post: 5 }));
  check('row counts match: pre 2 rows, singularity 4 rows, post 4 printed rows (Space has no printed row)',
    THREE_CONDITIONS.preBigBang.value.rows.length === 2
    && THREE_CONDITIONS.singularity.value.rows.length === 4
    && THREE_CONDITIONS.postBigBang.value.rows.length === 4);
  check('pre-Big-Bang poles verbatim: Yang "the Energy to Evolve Form", Yin "the Structure of Matter"',
    THREE_CONDITIONS.preBigBang.value.rows[0].concept === 'The Yang'
    && THREE_CONDITIONS.preBigBang.value.rows[0].gloss === 'the Energy to Evolve Form'
    && THREE_CONDITIONS.preBigBang.value.rows[1].concept === 'The Yin'
    && THREE_CONDITIONS.preBigBang.value.rows[1].gloss === 'the Structure of Matter');
  check('post-Big-Bang glyphs as printed: "< Light" and "z Progress" rows with dimensions/components',
    eq(THREE_CONDITIONS.postBigBang.value.rows[2], { glyph: '<', concept: 'Light', dimension: 'Evolution', component: 'Personality Crystal' })
    && eq(THREE_CONDITIONS.postBigBang.value.rows[3], { glyph: 'z', concept: 'Progress', dimension: 'Design', component: 'Design Crystal' }));
  check('Space-emergence note recorded as SOURCE_STATEMENT supporting SpaceModel.B, SpaceModel.A still represented',
    THREE_CONDITIONS.spaceEmergenceNote.status === CLAIM_STATUS.SOURCE_STATEMENT
    && THREE_CONDITIONS.spaceEmergenceNote.supports === 'SpaceModel.B'
    && THREE_CONDITIONS.spaceEmergenceNote.alsoRepresented === 'SpaceModel.A'
    && DIMENSION_CHAINS.Space.macroChain.length === 5);

  // =============== 7. CRYSTALS_AND_MONOPOLE (BB-p130) ===============
  check('crystals/monopole roles, descriptions, locations verbatim',
    CRYSTALS_AND_MONOPOLE.personalityCrystal.value.role === 'The Witness'
    && CRYSTALS_AND_MONOPOLE.personalityCrystal.value.description === 'Who you think you are.'
    && CRYSTALS_AND_MONOPOLE.personalityCrystal.value.location === 'Head Center'
    && CRYSTALS_AND_MONOPOLE.designCrystal.value.role === 'The Vehicle'
    && CRYSTALS_AND_MONOPOLE.designCrystal.value.description === 'What you say and think and do.'
    && CRYSTALS_AND_MONOPOLE.designCrystal.value.location === 'Ajna Center'
    && CRYSTALS_AND_MONOPOLE.magneticMonopole.value.role === 'The Attractor'
    && CRYSTALS_AND_MONOPOLE.magneticMonopole.value.description === 'Your Uniqueness.'
    && CRYSTALS_AND_MONOPOLE.magneticMonopole.value.location === 'G Center');
  check('binary structure: Personality Crystal = The Personality (Space, "I Communicate") + The Mind (Evolution, "I Remember")',
    eq(CRYSTALS_AND_MONOPOLE.personalityCrystal.value.binary.map((b) => [b.name, b.chain, b.keynote]),
      [['The Personality', 'Space', 'I Communicate'], ['The Mind', 'Evolution', 'I Remember']]));
  check('Design Crystal = The Body (Being, "I Am") + The Ego (Design, "I Design"); Monopole = Individuality (Movement, "I Create")',
    eq(CRYSTALS_AND_MONOPOLE.designCrystal.value.binary.map((b) => [b.name, b.chain, b.keynote]),
      [['The Body', 'Being', 'I Am'], ['The Ego', 'Design', 'I Design']])
    && CRYSTALS_AND_MONOPOLE.magneticMonopole.value.manifests.name === 'Individuality'
    && CRYSTALS_AND_MONOPOLE.magneticMonopole.value.manifests.keynote === 'I Create');
  check('crystal chain texts verbatim incl. printed "Smelt" (Ego chain)',
    CRYSTALS_AND_MONOPOLE.designCrystal.value.binary[1].chainText
      === 'It is Design. Design is Structure. Structure is Progress. Progress is Smelt. Smelling is Life. Life is Art.'
    && CRYSTALS_AND_MONOPOLE.personalityCrystal.value.binary[0].chainText
      === 'It is Space. Space is Form. Form is Illusion. Illusion is Hearing. Hearing is Music. Music is Freedom.');

  // =============== 8. COLOR_TABLE (BOC-chart) ===============
  check('COLOR table complete: 6 entries, responses FEAR/HOPE/DESIRE/NEED/GUILT/INNOCENCE',
    COLOR_TABLE.entries.length === 6
    && eq(COLOR_TABLE.entries.map((e) => e.value.response),
      ['FEAR', 'HOPE', 'DESIRE', 'NEED', 'GUILT', 'INNOCENCE']));
  check('COLOR entries: n, mode pairs, binaries Splenic(1-2)/Ajna(3-4)/Solar Plexus(5-6), role "motivation"',
    eq(COLOR_TABLE.entries[0].value, { n: 1, response: 'FEAR', mode: ['Communalist', 'Separatist'], binary: 'Splenic', role: 'motivation' })
    && COLOR_TABLE.entries.every((e) => e.value.role === 'motivation')
    && eq(COLOR_TABLE.entries.map((e) => e.value.binary),
      ['Splenic', 'Splenic', 'Ajna', 'Ajna', 'Solar Plexus', 'Solar Plexus'])
    && COLOR_TABLE.entries[4].value.printedNote.includes('Solar')
    && COLOR_TABLE.entries[5].value.mode.join(' / ') === 'Observer / Observed');
  check('COLOR recursion note Line → Color → Tone → Base; Color 6 INNOCENCE agreement with Gate:Innocence° recorded',
    COLOR_TABLE.recursion.value === 'Line → Color → Tone → Base'
    && COLOR_TABLE.entries[5].value.agreement.includes('Gate:Innocence°'));

  // =============== 9. TONE_TABLE (BOC-chart) ===============
  check('TONE table complete: 6 entries, sideLabel SOUND',
    TONE_TABLE.entries.length === 6 && TONE_TABLE.sideLabel === 'SOUND'
    && TONE_TABLE.entries.every((e) => e.value.sideLabel === 'SOUND'));
  check('TONE printed themes exact incl. the three [sic] spellings UNCERTENTY / MEDITION / ACCEPTENCE',
    eq(TONE_TABLE.entries.map((e) => e.value.theme.printed),
      ['SECURITY', 'UNCERTENTY', 'ACTION', 'MEDITION', 'JUDGEMENT', 'ACCEPTENCE']));
  check('TONE normalized forms separate: UNCERTAINTY / MEDITATION / ACCEPTANCE; others null (never guessed)',
    TONE_TABLE.entries[1].value.theme.normalized === 'UNCERTAINTY'
    && TONE_TABLE.entries[3].value.theme.normalized === 'MEDITATION'
    && TONE_TABLE.entries[5].value.theme.normalized === 'ACCEPTANCE'
    && TONE_TABLE.entries[1].value.theme.sic === true
    && TONE_TABLE.entries[0].value.theme.normalized === null
    && TONE_TABLE.entries[2].value.theme.normalized === null
    && TONE_TABLE.entries[4].value.theme.normalized === null);
  check('TONE departments + binaries as printed: SPLENIC/SPLENIC/AJNA/AJNA/SOLAR/PLEXUS',
    eq(TONE_TABLE.entries.map((e) => e.value.department),
      ['Smell', 'Taste', 'Outer Vision', 'Inner Vision', 'Feeling', 'Touch'])
    && eq(TONE_TABLE.entries.map((e) => e.value.binary),
      ['SPLENIC', 'SPLENIC', 'AJNA', 'AJNA', 'SOLAR', 'PLEXUS']));
  check('TONE departments recorded as a separate architecture from SENSE_DIMENSIONS (no merge)',
    TONE_TABLE.architectureNote.includes('separate architecture'));

  // =============== 10. BASE_TABLE (BOC-chart §6) ===============
  check('BASE table complete: exactly 5 entries',
    BASE_TABLE.entries.length === 5
    && eq(BASE_TABLE.entries.map((e) => e.value.name),
      ['INDIVIDUALITY', 'MIND', 'BODY', 'EGO', 'PERSONALITY']));
  check('BASE rows verbatim (Base 1 and Base 3 spot-checked field-by-field)',
    eq(BASE_TABLE.entries[0].value, {
      n: 1, name: 'INDIVIDUALITY', polarity: 'Yang/Yang', mode: 'Reactive',
      question: 'Where?', sense: 'Seeing', function: 'Location',
      keynoteLine: 'Uniqueness: "I Define"', descriptor: 'to measure, to name',
      dimension: 'Movement', printedDimension: 'MOVEMENT',
    })
    && eq(BASE_TABLE.entries[2].value, {
      n: 3, name: 'BODY', polarity: 'Yin/Yin', mode: 'Objective',
      question: 'When?', sense: 'Touching', function: 'Collaboration',
      keynoteLine: 'Genetics: "I Am"', descriptor: 'Matter is Being',
      dimension: 'Being', printedDimension: '(Being)',
    }));
  check('Base 3 dimension = "Being"; printed dimensions preserved verbatim (incl. "(Being)")',
    BASE_TABLE.entries[2].value.dimension === 'Being'
    && eq(BASE_TABLE.entries.map((e) => e.value.printedDimension),
      ['MOVEMENT', 'EVOLUTION', '(Being)', 'DESIGN', 'SPACE']));
  check('Base 5 keynote line keeps printed single quotes: Presence: \'I Think\'',
    BASE_TABLE.entries[4].value.keynoteLine === "Presence: 'I Think'");
  check('AGREEMENT: Base-table senses match SENSE_DIMENSIONS one-for-one',
    BASE_TABLE.entries.every((e) => {
      const key = { Seeing: 'see', Taste: 'taste', Touching: 'touch', Smell: 'smell', Hearing: 'hear' }[e.value.sense];
      return SENSE_DIMENSIONS.senses[key]?.dimension === e.value.dimension;
    }));

  // =============== 11. KEYNOTE_CONFLICTS C13/C14 — both attestations, no resolution ===============
  check('two keynote conflicts registered: C13 (Movement) and C14 (Space), status CONFLICT',
    KEYNOTE_CONFLICTS.length === 2
    && eq(KEYNOTE_CONFLICTS.map((c) => c.value.id), ['C13', 'C14'])
    && KEYNOTE_CONFLICTS.every((c) => c.status === CLAIM_STATUS.CONFLICT && Object.isFrozen(c)));
  check('C13: BOTH "I Define" [BB-p126 + BOC-chart Base 1] and "I Create" [BB-p130] attested',
    (() => {
      const keys = KEYNOTE_CONFLICTS[0].value.attestations.map((a) => a.keynote);
      return keys.includes('I Define') && keys.includes('I Create')
        && KEYNOTE_CONFLICTS[0].value.attestations.find((a) => a.keynote === 'I Define').sources.includes('BOC-chart')
        && KEYNOTE_CONFLICTS[0].value.attestations.find((a) => a.keynote === 'I Create').sources.includes('BB-p130');
    })());
  check('C14: BOTH "I Think" [BB-p126 + BOC-chart Base 5] and "I Communicate" [BB-p130] attested',
    (() => {
      const keys = KEYNOTE_CONFLICTS[1].value.attestations.map((a) => a.keynote);
      return keys.includes('I Think') && keys.includes('I Communicate')
        && KEYNOTE_CONFLICTS[1].value.attestations.find((a) => a.keynote === 'I Think').sources.includes('BOC-chart')
        && KEYNOTE_CONFLICTS[1].value.attestations.find((a) => a.keynote === 'I Communicate').sources.includes('BB-p130');
    })());
  check('conflicts never resolved: resolution null on both; both variants live in the source data',
    KEYNOTE_CONFLICTS.every((c) => c.value.resolution === null)
    && DIMENSION_CHAINS.Movement.micro.value.keynote.phrase === 'I Define'
    && CRYSTALS_AND_MONOPOLE.magneticMonopole.value.manifests.keynote === 'I Create'
    && DIMENSION_CHAINS.Space.micro.value.keynote.phrase === 'I Think'
    && CRYSTALS_AND_MONOPOLE.personalityCrystal.value.binary[0].keynote === 'I Communicate');

  // =============== 12. provenance + frozenness sweep ===============
  const walk = (x, acc = []) => {
    if (x && typeof x === 'object') {
      if (Object.prototype.hasOwnProperty.call(x, 'value') && Object.prototype.hasOwnProperty.call(x, 'status')) acc.push(x);
      for (const v of Object.values(x)) walk(v, acc);
    }
    return acc;
  };
  const allRecords = [
    ...walk(DIMENSION_CHAINS), ...walk(ORDINAL_PERSPECTIVES), ...walk(THREE_CONDITIONS),
    ...walk(CRYSTALS_AND_MONOPOLE), ...walk(COLOR_TABLE), ...walk(TONE_TABLE),
    ...walk(BASE_TABLE), ...walk(KEYNOTE_CONFLICTS),
  ];
  check('every carried record is a claim ({value,status[,source]}), frozen, with a cited source',
    allRecords.length > 50
    && allRecords.every((r) => isClaim(r) && Object.isFrozen(r)
      && typeof r.source === 'string'
      && ALLOWED_SOURCES.some((s) => r.source.includes(s))));
  check('top-level exports frozen',
    Object.isFrozen(DIMENSION_CHAINS) && Object.isFrozen(ORDINAL_PERSPECTIVES)
    && Object.isFrozen(THREE_CONDITIONS) && Object.isFrozen(CRYSTALS_AND_MONOPOLE)
    && Object.isFrozen(COLOR_TABLE) && Object.isFrozen(TONE_TABLE)
    && Object.isFrozen(BASE_TABLE) && Object.isFrozen(KEYNOTE_CONFLICTS));

  // =============== 13. seeded registry (canon-registry idiom, no edits to canon-registry.js) ===============
  check('CHAINS_COLORS_REGISTRY seeds 31 entries: 5 chains + 1 ordinal + 3 conditions + 3 crystals + 6 colors + 6 tones + 5 bases + 2 conflicts',
    CHAINS_COLORS_REGISTRY.list().length === 31);
  check('seeded registry: chains present with verbatim wording; Being chain carries the C17 blank-cell conflict',
    CHAINS_COLORS_REGISTRY.lookup('BB:chain:Movement').canonicalWording === MACRO.Movement.join(' / ')
    && CHAINS_COLORS_REGISTRY.lookup('BB:chain:Being').conflicts[0].conflictId === 'C17');
  check('seeded registry: C13/C14 registered as first-class CONFLICT entries with both keynotes preserved',
    ['BB:C13', 'BB:C14'].every((id) => {
      const e = CHAINS_COLORS_REGISTRY.lookup(id);
      return e && e.status === CLAIM_STATUS.CONFLICT && e.conflicts.length === 2;
    }));
  check('seedChainsColorsCanon() builds an independent equivalent registry (orchestrator-wirable)',
    (() => {
      const r = seedChainsColorsCanon(new CanonRegistry());
      return r !== CHAINS_COLORS_REGISTRY && r.list().length === 31
        && r.lookup('BOC:base:3').dimension === 'Being'
        && r.lookup('BB:ordinal-perspective:Being').status === CLAIM_STATUS.SOURCE_STATEMENT;
    })());

  return { passed, failed, failures };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed, failures } = run();
  if (failed) console.log(`\nfailed: ${failures.join('; ')}`);
  console.log(`\nchains-colors.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
