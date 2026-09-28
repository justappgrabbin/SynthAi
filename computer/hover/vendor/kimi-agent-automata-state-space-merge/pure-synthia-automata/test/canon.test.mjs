// Canon/claim-layer tests — run with node from project root: node test/canon.test.mjs
// Covers the Synthia OS Canonical Integration Handoff contract/canon/conflicts layer:
// src/state-space/claim-status.js, src/state-space/dimension-canon.js,
// src/engine/canon-registry.js (docs/HANDOFF_INTEGRATION.md reconciles the docs).
import { fileURLToPath } from 'node:url';
import {
  CLAIM_STATUS, claim, isClaim, resolveClaimStatus,
  RESOLUTION_ORDER, NON_RESOLVING, resolveDimension,
  PROMOTION_GATE, passesPromotionGate, isHonestlyEmpirical,
} from '../src/state-space/claim-status.js';
import {
  DIMENSION_CANON, CANON_DIMENSION_CHAINS, SPACE_ROLE_MODELS,
  CANON_AGREEMENTS, CANON_CONFLICTS,
} from '../src/state-space/dimension-canon.js';
import { CanonRegistry, CANON_REGISTRY, seedFromDimensionCanon } from '../src/engine/canon-registry.js';
import { DIMENSIONS, DIMENSION_META } from '../src/state-space/constants.js';
import { DIMENSION_CHAINS } from '../src/state-space/dimensions.js';
import { MANNER_DIMENSION, SENSE_DIMENSIONS } from '../src/state-space/primitive-dimensions.js';
import { controlMappings } from '../src/experiments/scale/controls.js';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function run({ quiet } = {}) {
  let passed = 0; let failed = 0;
  const failures = [];
  const check = (name, cond) => {
    if (cond) { passed++; if (!quiet) console.log(`ok   ${name}`); }
    else { failed++; failures.push(name); console.log(`FAIL ${name}`); }
  };

  // =============== 1. claim wrapper ===============
  check('CLAIM_STATUS holds exactly the contract\'s 9 statuses',
    eq(Object.values(CLAIM_STATUS).sort(), ['CONFLICT', 'CONTROL_ONLY', 'DERIVED', 'EMPIRICALLY_SUPPORTED',
      'LEARNED', 'PROJECT_HYPOTHESIS', 'RENDERER_CONVENTION', 'SOURCE_STATEMENT', 'STRUCTURAL_MATH'].sort()));

  const c1 = claim('Energy=Creation=Seeing=Landscape=Environment', {
    status: CLAIM_STATUS.SOURCE_STATEMENT, source: 'GGM §1a', confidence: null,
  });
  check('claim() shape {value,status,source,hypothesisId,confidence} + frozen',
    c1.value === 'Energy=Creation=Seeing=Landscape=Environment'
    && c1.status === 'SOURCE_STATEMENT' && c1.source === 'GGM §1a'
    && c1.hypothesisId === null && c1.confidence === null && Object.isFrozen(c1));
  check('claim() deep-freezes evidence objects',
    (() => {
      const c = claim(1, { status: CLAIM_STATUS.DERIVED, evidence: { chain: ['a', 'b'] } });
      return Object.isFrozen(c.evidence) && Object.isFrozen(c.evidence.chain);
    })());
  check('claim() rejects a status outside the enum',
    (() => { try { claim(1, { status: 'GUESSED' }); return false; } catch { return true; } })());
  check('claim() refuses SOURCE_STATEMENT without a source citation',
    (() => { try { claim(1, { status: CLAIM_STATUS.SOURCE_STATEMENT }); return false; } catch { return true; } })());
  check('isClaim true for claims, false for bare values / non-claims',
    isClaim(c1) === true && isClaim('Movement') === false && isClaim({ status: 'SOURCE_STATEMENT' }) === false
    && isClaim({ value: 1, status: 'GUESSED' }) === false && isClaim(null) === false);
  check('resolveClaimStatus returns status for claims, null for bare values',
    resolveClaimStatus(c1) === 'SOURCE_STATEMENT' && resolveClaimStatus({ value: 'x' }) === null
    && resolveClaimStatus('x') === null);

  // =============== 2. resolution order (contract §2) ===============
  const sourceClaim = claim('Movement', { status: CLAIM_STATUS.SOURCE_STATEMENT, source: 'canon' });
  const hypothesisClaim = claim('Design', { status: CLAIM_STATUS.PROJECT_HYPOTHESIS, hypothesisId: 'H-F4' });
  const derivedClaim = claim('Being', { status: CLAIM_STATUS.DERIVED });
  const learnedClaim = claim('Space', { status: CLAIM_STATUS.LEARNED });
  const empiricalClaim = claim('Evolution', {
    status: CLAIM_STATUS.EMPIRICALLY_SUPPORTED,
    evidence: { preRegistered: true, heldOut: true, beatenControls: ['random', 'shuffled', 'modulo', 'ablated'] },
  });

  check('RESOLUTION_ORDER: source anchor > derivation > renderer > hypothesis > learned',
    eq(RESOLUTION_ORDER.map((t) => [...t]), [
      ['SOURCE_STATEMENT'], ['STRUCTURAL_MATH', 'DERIVED'], ['RENDERER_CONVENTION'],
      ['PROJECT_HYPOTHESIS'], ['LEARNED', 'EMPIRICALLY_SUPPORTED'],
    ]));
  check('resolveDimension: source beats hypothesis regardless of candidate order',
    resolveDimension([hypothesisClaim, sourceClaim]).value === 'Movement'
    && resolveDimension([sourceClaim, hypothesisClaim]).value === 'Movement');
  check('resolveDimension: derivation beats hypothesis when no source anchor exists',
    resolveDimension([hypothesisClaim, derivedClaim]).value === 'Being');
  check('resolveDimension: honest null when only hypotheses exist and nothing higher',
    resolveDimension([hypothesisClaim]).value === 'Design' // hypothesis DOES clear tier 4
    && resolveDimension([]) === null && resolveDimension([{ value: 'x' }]) === null);
  check('resolveDimension: CONTROL_ONLY excluded from canon resolution',
    resolveDimension([claim('Movement', { status: CLAIM_STATUS.CONTROL_ONLY })]) === null
    && resolveDimension([claim('Movement', { status: CLAIM_STATUS.CONTROL_ONLY }), hypothesisClaim]).value === 'Design');
  check('resolveDimension: CONFLICT never silently resolves',
    resolveDimension([claim('Movement', { status: CLAIM_STATUS.CONFLICT, source: 'x' })]) === null
    && NON_RESOLVING.includes('CONFLICT') && NON_RESOLVING.includes('CONTROL_ONLY'));
  check('resolveDimension: learned/tested is the last tier before null',
    resolveDimension([learnedClaim, hypothesisClaim]).value === 'Design'
    && resolveDimension([learnedClaim]).value === 'Space'
    && resolveDimension([empiricalClaim]).value === 'Evolution');

  // =============== 3. promotion gate (contract §10) ===============
  check('PROMOTION_GATE covers exactly the controlMappings control battery (minus source)',
    eq(PROMOTION_GATE.requiredControls,
      Object.keys(controlMappings({ a: 1, b: 2 }).conditions).filter((k) => k !== 'source').sort())
    && eq(PROMOTION_GATE.requiredControls, ['ablated', 'modulo', 'random', 'shuffled']));
  check('promotion gate refuses EMPIRICALLY_SUPPORTED without control evidence',
    passesPromotionGate(hypothesisClaim, null) === false
    && passesPromotionGate(hypothesisClaim, { preRegistered: true, heldOut: true }) === false);
  check('promotion gate refuses when any pre-registered control is unbeaten',
    passesPromotionGate(hypothesisClaim, {
      preRegistered: true, heldOut: true, beatenControls: ['random', 'shuffled', 'modulo'], // ablation missing
    }) === false);
  check('promotion gate refuses non-hypothesis candidates and non-held-out evidence',
    passesPromotionGate(sourceClaim, { preRegistered: true, heldOut: true, beatenControls: PROMOTION_GATE.requiredControls }) === false
    && passesPromotionGate(hypothesisClaim, {
      preRegistered: true, heldOut: false, beatenControls: PROMOTION_GATE.requiredControls,
    }) === false);
  check('promotion gate passes a fully pre-registered, control-beating hypothesis',
    passesPromotionGate(hypothesisClaim, {
      preRegistered: true, heldOut: true, beatenControls: PROMOTION_GATE.requiredControls,
      reproducible: true, nonRegressing: true,
    }) === true);
  check('isHonestlyEmpirical: EMPIRICALLY_SUPPORTED tag is only honest with gate-satisfying evidence',
    isHonestlyEmpirical(empiricalClaim) === true
    && isHonestlyEmpirical(claim('x', { status: CLAIM_STATUS.EMPIRICALLY_SUPPORTED })) === false);

  // =============== 4. dimension canon (06_DIMENSION_CANON.json) ===============
  check('canon loads all five dimensions, frozen, claim-wrapped',
    eq(Object.keys(DIMENSION_CANON.dimensions), [...DIMENSIONS])
    && Object.isFrozen(DIMENSION_CANON)
    && Object.values(DIMENSION_CANON.dimensions).every((d) => isClaim(d)));
  check('canon version/policy preserved verbatim',
    DIMENSION_CANON.version === 'handoff-v1'
    && DIMENSION_CANON.policy === 'Represent first; compare second; test third; canonize last.');
  check('Space role conflict intact: SOURCE_STATEMENT_WITH_ROLE_CONFLICT + both role models',
    DIMENSION_CANON.dimensions.Space.value.source_status === 'SOURCE_STATEMENT_WITH_ROLE_CONFLICT'
    && DIMENSION_CANON.dimensions.Space.status === CLAIM_STATUS.CONFLICT
    && eq(DIMENSION_CANON.dimensions.Space.value.role_models.map((m) => m.id), ['space-first-class', 'space-emergent'])
    && SPACE_ROLE_MODELS.A.status === 'SOURCE_MODEL' && SPACE_ROLE_MODELS.B.status === 'SOURCE_MODEL_CONFLICT');
  check('canon chains verbatim (Movement=Energy=Creation=Seeing=Landscape=Environment; Space=Form=...=Freedom)',
    eq(CANON_DIMENSION_CHAINS.Movement, ['Energy', 'Creation', 'Seeing', 'Landscape', 'Environment'])
    && eq(CANON_DIMENSION_CHAINS.Being, ['Matter', 'Touch', 'Sex', 'Survival'])
    && eq(CANON_DIMENSION_CHAINS.Space, ['Form', 'Illusion', 'Hearing', 'Music', 'Freedom']));
  check('canon controls are CONTROL_ONLY claims; promotion_rule preserved',
    DIMENSION_CANON.controls.every((c) => c.status === CLAIM_STATUS.CONTROL_ONLY)
    && DIMENSION_CANON.controls.length === 3
    && eq(DIMENSION_CANON.promotion_rule.requires, [
      'pre-registered mapping', 'held-out test', 'random/shuffled/modulo controls',
      'ablation', 'reproducible derivations', 'non-regression on canonical runtime',
    ]));
  check('H-F4 canon hypothesis matches our MANNER_DIMENSION.map (agreement, still hypothesis)',
    DIMENSION_CANON.candidate_hypotheses[0].status === CLAIM_STATUS.PROJECT_HYPOTHESIS
    && DIMENSION_CANON.candidate_hypotheses[0].value.mapping.stop === MANNER_DIMENSION.map.stop
    && DIMENSION_CANON.candidate_hypotheses[0].value.mapping.nasal === MANNER_DIMENSION.map.nasal
    && DIMENSION_CANON.candidate_hypotheses[0].value.mapping.vowel === MANNER_DIMENSION.map.vowel);
  check('canon agreements hold (dimension names, sense map, H-F4, Space conflict)',
    CANON_AGREEMENTS.every((a) => a.holds === true));
  check('sense agreement is real: canon senses === SENSE_DIMENSIONS one-for-one',
    Object.entries({ Movement: 'see', Evolution: 'taste', Being: 'touch', Design: 'smell', Space: 'hear' })
      .every(([dim, sense]) => SENSE_DIMENSIONS.senses[sense].dimension === dim));

  // =============== 5. recorded conflicts (never overwrite our constants) ===============
  check('three canon conflicts recorded: chains, seedGates, letter addressing',
    eq(CANON_CONFLICTS.map((c) => c.value.id).sort(),
      ['CANON-CONFLICT-chains', 'CANON-CONFLICT-letter-addressing', 'CANON-CONFLICT-seedGates'])
    && CANON_CONFLICTS.every((c) => c.status === CLAIM_STATUS.CONFLICT && Object.isFrozen(c)));
  check('chain conflict: canon chains !== our DIMENSION_CHAINS, and ours are untouched',
    !eq(CANON_DIMENSION_CHAINS.Movement, DIMENSION_CHAINS.Movement)
    && eq(DIMENSION_CHAINS.Movement, ['wait', 'prepare', 'move', 'transition']));
  check('seedGate conflict: canon silent; our 2/6/14/20 stay in DIMENSION_META as-is',
    DIMENSION_META.Movement.seedGate === 1 && DIMENSION_META.Evolution.seedGate === 2
    && DIMENSION_META.Being.seedGate === 6 && DIMENSION_META.Design.seedGate === 14
    && DIMENSION_META.Space.seedGate === 20
    && CANON_CONFLICTS.find((c) => c.value.id === 'CANON-CONFLICT-seedGates').value.positionA.value === null);

  // =============== 6. canon registry ===============
  const registry = new CanonRegistry();
  const entry = registry.register({
    concept: 'Movement',
    canonicalWording: 'Movement = Energy = Creation = Seeing = Landscape = Environment',
    sourceLocation: '06_DIMENSION_CANON.json dimensions.Movement',
    dimension: 'Movement',
    coordinateLevel: 'dimension',
    aliases: ['Seeing'],
    computationalInterpretation: 'five-dimensional state-space perspective',
    status: CLAIM_STATUS.SOURCE_STATEMENT,
  });
  check('registry.register stores a frozen entry with all contract fields',
    Object.isFrozen(entry) && entry.concept === 'Movement' && entry.dimension === 'Movement'
    && entry.coordinateLevel === 'dimension' && entry.aliases.includes('Seeing')
    && entry.status === 'SOURCE_STATEMENT' && Number.isInteger(entry.seq));
  check('registry.lookup works by concept and alias; unknown -> null',
    registry.lookup('Movement') === entry && registry.lookup('Seeing') === entry
    && registry.lookup('Nope') === null);
  check('registry rejects bad entries (no concept / bad status)',
    (() => {
      try { registry.register({ canonicalWording: 'x' }); return false; } catch { /* expected */ }
      try { registry.register({ concept: 'y', status: 'GUESSED' }); return false; } catch { return true; }
    })());
  const reRegistered = registry.register({ concept: 'Movement', canonicalWording: 'Movement = Something Else' });
  check('re-registration never overwrites: original wording kept, challenger preserved as conflict, status CONFLICT',
    reRegistered.canonicalWording === entry.canonicalWording
    && reRegistered.status === CLAIM_STATUS.CONFLICT
    && reRegistered.conflicts.length === 1
    && reRegistered.conflicts[0].canonicalWording === 'Movement = Something Else');
  check('conflictsFor reports preserved conflicts (scoped by dimension too)',
    registry.conflictsFor().some((e) => e.concept === 'Movement')
    && registry.conflictsFor({ dimension: 'Movement' }).length === 1
    && registry.conflictsFor({ dimension: 'Space' }).length === 0);
  check('registry.export is JSON-safe with counts',
    (() => {
      const snap = registry.export();
      return snap.count === 1 && snap.conflicts === 1 && JSON.parse(JSON.stringify(snap)).entries[0].concept === 'Movement';
    })());

  // =============== 7. seeded registry from the canon + 5 chains ===============
  check('CANON_REGISTRY seeds 38 entries: 5 dims + 24 chain rungs + 2 anchors + 1 hypothesis + 3 controls + 3 conflicts',
    CANON_REGISTRY.list().length === 38);
  check('seeded registry: every dimension entry present with chain wording',
    DIMENSIONS.every((d) => CANON_REGISTRY.lookup(d)?.canonicalWording.startsWith(`${d} = `)));
  check('seeded registry: Space stored with role conflict, never silently resolved',
    (() => {
      const space = CANON_REGISTRY.lookup('Space');
      return space.status === CLAIM_STATUS.CONFLICT
        && space.conflicts.length === 2
        && eq(space.conflicts.map((c) => c.id), ['space-first-class', 'space-emergent']);
    })());
  check('seeded registry: controls are CONTROL_ONLY entries (stored, never canon answers)',
    ['alphabet-modulo', 'random-dimension-permutation', 'shuffled-dimension-mapping']
      .every((id) => CANON_REGISTRY.lookup(id)?.status === CLAIM_STATUS.CONTROL_ONLY)
    && CANON_REGISTRY.lookup('H-F4')?.status === CLAIM_STATUS.PROJECT_HYPOTHESIS);
  check('seeded registry: all three canon-vs-codebase conflicts preserved first-class',
    ['CANON-CONFLICT-chains', 'CANON-CONFLICT-seedGates', 'CANON-CONFLICT-letter-addressing']
      .every((id) => CANON_REGISTRY.lookup(id)?.status === CLAIM_STATUS.CONFLICT));
  check('seedFromDimensionCanon() builds an independent equivalent registry',
    seedFromDimensionCanon(new CanonRegistry()).list().length === 38);

  return { passed, failed, failures };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed } = run();
  console.log(`\ncanon.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
