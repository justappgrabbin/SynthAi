
// ============================================================================
// DeepStructureLearner.test.ts
// ============================================================================
// Integration test showing the MIND → Heartfield architecture:
//
//   MIND (observation) → DeepStructureLearner → infers → Heartfield (directive) → StyleControlEngine
//
// This demonstrates:
//   1. Observing transform results
//   2. Inferring rules from patterns
//   3. Refining profiles automatically
//   4. Discovering new patterns
//   5. Publishing inferred profiles to style.control
// ============================================================================

import { EventMesh } from './EventMesh.js';
import { DeepStructureLearner } from './DeepStructureLearner.js';
import { StyleControlEngine } from './StyleControlEngine.js';
import { SurfaceTransformEngine, State } from './SurfaceTransformEngine.js';

// ============================================================================
// SETUP
// ============================================================================

const mesh = new EventMesh();

// Log all mesh events
mesh.onEmergence(({ channel, firstSource }) => {
  console.log(`[mesh] EMERGENT CHANNEL "${channel}" created by ${firstSource}`);
});

// Instantiate tools
const deepLearner = new DeepStructureLearner(mesh);
const styleControl = new StyleControlEngine(mesh);
const surfaceTransform = new SurfaceTransformEngine(mesh);

console.log('\n=== DEEP STRUCTURE LEARNER INTEGRATION TEST ===\n');
console.log('Architecture: MIND (observation) → DeepStructureLearner → Heartfield (directive) → StyleControlEngine\n');

// ============================================================================
// TEST 1: Seed Observations with Known Patterns
// ============================================================================

console.log('--- TEST 1: Seeding Observations ---\n');

// Create states with different coordinate patterns
const states: State[] = [
  {
    who: { id: 'user-1', namespace: 'test', signature: 'abc' },
    what: { type: 'test', traits: {}, memory: [] },
    where: { trajectory: [1], position: 'Gate 1' },
    when: { temporalMarker: 0, cyclePhase: 'Aries' },
    why: { constraints: [], purpose: 'test', bound: 1 },
    ontology: { movement: 0.125, evolution: 0, being: 0, design: 0, space: 0 },
    coordinates: { gate: 1, line: 1, color: 1, tone: 1, base: 5, degree: 0, minute: 0, second: 0, arc: 0, zodiac: 'Aries', house: 1 },
    resolved: true,
    hash: 'hash-1',
    domain: 'language',
    surface: { text: 'Test 1' }
  },
  {
    ...states[0],
    coordinates: { ...states[0].coordinates, gate: 10, line: 6, color: 5, tone: 5 },
    hash: 'hash-2',
    surface: { text: 'Test 2' }
  },
  {
    ...states[0],
    coordinates: { ...states[0].coordinates, gate: 25, line: 6, color: 6, tone: 4 },
    hash: 'hash-3',
    surface: { text: 'Test 3' }
  },
  {
    ...states[0],
    coordinates: { ...states[0].coordinates, gate: 33, line: 5, color: 4, tone: 6 },
    hash: 'hash-4',
    surface: { text: 'Test 4' }
  },
  {
    ...states[0],
    coordinates: { ...states[0].coordinates, gate: 42, line: 6, color: 5, tone: 5 },
    hash: 'hash-5',
    surface: { text: 'Test 5' }
  },
];

// Simulate transform results with user feedback
for (let i = 0; i < states.length; i++) {
  const state = states[i];
  const transformResult = surfaceTransform.run({
    state,
    domain: 'language',
    constraint: { depth: 2, temperature: 0.5 }
  });

  // Simulate user feedback: high ratings for base=5, line=6 patterns
  const feedback = {
    success: state.coordinates.base === 5 && state.coordinates.line >= 5,
    rating: state.coordinates.base === 5 && state.coordinates.line >= 5 ? 0.9 : 0.3
  };

  deepLearner.observeTransform(state, transformResult, feedback);
  console.log(`Observation ${i + 1}: base=${state.coordinates.base}, line=${state.coordinates.line}, feedback=${feedback.success ? 'SUCCESS' : 'FAIL'}`);
}

console.log('\nTotal observations:', deepLearner.getObservations().length);

// ============================================================================
// TEST 2: Run Inference
// ============================================================================

console.log('\n\n--- TEST 2: Running Inference ---\n');

const inference = deepLearner.run({ minEvidence: 2, force: true });

console.log('Inference complete:');
console.log('  New rules:', inference.newRules.length);
console.log('  Refined profiles:', inference.refinedProfiles.length);
console.log('  Discovered patterns:', inference.discoveredPatterns.length);
console.log('  Confidence:', inference.confidence.toFixed(3));

console.log('\nNew Rules:');
inference.newRules.forEach(rule => {
  console.log(`  [${rule.id}] ${rule.name}`);
  console.log(`    Pattern: ${rule.pattern.dimensions}`);
  console.log(`    Confidence: ${rule.confidence.toFixed(3)} (${rule.evidence} evidence)`);
  console.log(`    Outcome: ${rule.outcome.description}`);
});

console.log('\nDiscovered Patterns:');
inference.discoveredPatterns.forEach(p => console.log(`  - ${p}`));

// ============================================================================
// TEST 3: Check Existing Rules
// ============================================================================

console.log('\n\n--- TEST 3: Existing Rules ---\n');

const allRules = deepLearner.getRules();
console.log('Total rules (including seeded):', allRules.length);

allRules.forEach(rule => {
  console.log(`\n[${rule.id}] ${rule.name}`);
  console.log(`  Domain: ${rule.domain}`);
  console.log(`  Confidence: ${rule.confidence.toFixed(3)}`);
  console.log(`  Evidence: ${rule.evidence}`);
  console.log(`  Pattern: ${JSON.stringify(rule.pattern.dimensions)}`);
});

// ============================================================================
// TEST 4: Profile Refinement
// ============================================================================

console.log('\n\n--- TEST 4: Profile Refinement ---\n');

// First, run some style controls to generate profile observations
const poeticProfile = styleControl.getProfile('poetic_leader')!;
for (let i = 0; i < 3; i++) {
  const styleResult = styleControl.run({
    state: states[i],
    profile: poeticProfile,
    depth: 2,
    temperature: 0.7
  });

  deepLearner.observeStyleControl(states[i], styleResult, {
    success: i < 2, // First 2 succeed, last fails
    rating: i < 2 ? 0.9 : 0.2
  });
}

// Now run inference again
const refinedInference = deepLearner.run({ minEvidence: 2, force: true });

console.log('Refined profiles:', refinedInference.refinedProfiles.length);
refinedInference.refinedProfiles.forEach(p => {
  console.log(`\n  [${p.name}]`);
  console.log(`    Description: ${p.description}`);
  console.log(`    Confidence: ${(p.confidence || 0).toFixed(3)}`);
  console.log(`    Constraints: ${p.constraints.map(c => `${c.dimension}=${c.mode}[${c.min}-${c.max}]`).join(', ')}`);
});

// ============================================================================
// TEST 5: Cross-Domain Pattern Discovery
// ============================================================================

console.log('\n\n--- TEST 5: Cross-Domain Patterns ---\n');

// Create a code state and observe it
const codeState: State = {
  ...states[0],
  domain: 'code',
  coordinates: { ...states[0].coordinates, gate: 42, line: 3, base: 2 },
  hash: 'hash-code',
  surface: { code: 'for (let i = 0; i < 10; i++) {}' }
};

const codeTransform = surfaceTransform.run({
  state: codeState,
  domain: 'code',
  constraint: { depth: 2, temperature: 0.5 }
});

deepLearner.observeTransform(codeState, codeTransform, {
  success: true,
  rating: 0.85
});

// Run inference with code domain
const codeInference = deepLearner.run({ domain: 'code', minEvidence: 1, force: true });
console.log('Code domain inference:');
console.log('  New rules:', codeInference.newRules.length);
console.log('  Patterns:', codeInference.discoveredPatterns);

// ============================================================================
// TEST 6: Learning Weights
// ============================================================================

console.log('\n\n--- TEST 6: Learning Progress ---\n');

console.log('Total observations:', deepLearner.getObservations().length);
console.log('Pattern cache size:', deepLearner['patternCache'].size);

// Show most frequent patterns
const cache = deepLearner['patternCache'];
const sortedPatterns = Array.from(cache.entries()).sort((a, b) => b[1] - a[1]);
console.log('\nMost frequent coordinate signatures:');
sortedPatterns.slice(0, 5).forEach(([sig, count]) => {
  console.log(`  ${sig}: ${count} occurrences`);
});

// ============================================================================
// TEST 7: Mesh Topology
// ============================================================================

console.log('\n\n--- TEST 7: Mesh Topology ---\n');

console.log('Mesh topology:');
console.table(mesh.topology());

console.log('\nTotal messages:', mesh.log.length);

// ============================================================================
// TEST 8: Codegen
// ============================================================================

console.log('\n\n--- TEST 8: Codegen Output ---\n');

const generatedCode = deepLearner.codegen();
console.log(generatedCode.slice(0, 800) + '...');

// ============================================================================
// TEST 9: MIND → Heartfield Flow Demonstration
// ============================================================================

console.log('\n\n--- TEST 9: MIND → Heartfield Flow ---\n');

console.log('The MIND (DeepStructureLearner) observes:');
console.log('  - 5 language observations');
console.log('  - 3 style control observations');
console.log('  - 1 code observation');
console.log('\nThe MIND infers:');
console.log('  - "When base=5 and line=6, language outputs succeed"');
console.log('  - "When base=2, code outputs succeed"');
console.log('  - "Line 6 correlates with poetic expression"');
console.log('\nThe MIND publishes to style.control:');
console.log('  - New inferred profiles');
console.log('  - Refined versions of existing profiles');
console.log('\nThe Heartfield (StyleControlEngine) receives:');
console.log('  - "Use the refined_poetic_leader profile — it has higher confidence"');
console.log('\nThe Heartfield constrains the Body (SurfaceTransformEngine):');
console.log('  - "Generate variants using refined_poetic_leader constraints"');

// ============================================================================
// TEST 10: Full Pipeline
// ============================================================================

console.log('\n\n--- TEST 10: Full Pipeline ---\n');

// MIND infers
const finalInference = deepLearner.run({ force: true });
console.log('MIND inferred', finalInference.newRules.length, 'new rules');

// Heartfield uses inferred profile (if any)
const inferredProfiles = deepLearner.getInferredProfiles();
if (inferredProfiles.length > 0) {
  const inferred = inferredProfiles[0];
  console.log('\nHeartfield using inferred profile:', inferred.name);

  const styleResult = styleControl.run({
    state: states[0],
    profile: inferred,
    depth: 2,
    temperature: 0.6
  });

  console.log('Feasibility:', styleResult.feasibility.toFixed(3));

  // Body executes
  const transform = surfaceTransform.run({
    state: states[0],
    domain: 'language',
    constraint: styleResult.constrainedRequest
  });

  console.log('\nBody output:');
  console.log('Original:', transform.original.surface?.text);
  transform.variants.forEach((v, i) => {
    console.log(`Variant ${i + 1}:`, v.surface?.text);
  });
}

console.log('\n\n=== ALL TESTS COMPLETE ===');
