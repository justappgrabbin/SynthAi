
// ============================================================================
// StyleControlEngine.test.ts
// ============================================================================
// Integration test showing the Heartfield → Body field architecture:
//
//   Heartfield (directive) → StyleControlEngine → constrains → Body (execution) → SurfaceTransformEngine
//
// This demonstrates:
//   1. Style profiles as heart-level directives
//   2. Valid subspace computation
//   3. Feasibility checking
//   4. Constrained transform requests feeding into SurfaceTransformEngine
//   5. Learning from profile applications
// ============================================================================

import { EventMesh } from './EventMesh.js';
import { StyleControlEngine, StyleProfile } from './StyleControlEngine.js';
import { SurfaceTransformEngine, State } from './SurfaceTransformEngine.js';
import { Head } from './legacy-klein/head.js';

// ============================================================================
// SETUP
// ============================================================================

const mesh = new EventMesh();

// Log all mesh events
mesh.onEmergence(({ channel, firstSource }) => {
  console.log(`[mesh] EMERGENT CHANNEL "${channel}" created by ${firstSource}`);
});

// Instantiate tools
const styleControl = new StyleControlEngine(mesh);
const surfaceTransform = new SurfaceTransformEngine(mesh);

// Head dispatcher
const head = new Head(mesh);
head.register('StyleControlEngine', styleControl);
head.register('SurfaceTransformEngine', surfaceTransform);

console.log('\n=== STYLE CONTROL ENGINE INTEGRATION TEST ===\n');
console.log('Architecture: Heartfield (directive) → StyleControlEngine → Body (execution) → SurfaceTransformEngine\n');

// ============================================================================
// TEST 1: Poetic Leader Profile
// ============================================================================

console.log('--- TEST 1: Poetic Leader Profile ---\n');

const textState: State = {
  who: { id: 'user-1', namespace: 'test', signature: 'abc123' },
  what: { type: 'linguistic_query', traits: { originalText: 'The system processes data efficiently' }, memory: [] },
  where: { trajectory: [1], position: 'Gate 1, Line 1' },
  when: { temporalMarker: 0, cyclePhase: 'Aries' },
  why: { constraints: ['style_control'], purpose: 'poetic_expression', bound: 0.9 },
  ontology: { movement: 0.125, evolution: 0, being: 0, design: 0, space: 0.0083 },
  coordinates: { gate: 1, line: 1, color: 1, tone: 1, base: 5, degree: 0, minute: 0, second: 0, arc: 0, zodiac: 'Aries', house: 1 },
  resolved: true,
  hash: 'test-hash-1',
  domain: 'language',
  surface: { text: 'The system processes data efficiently' }
};

const poeticProfile = styleControl.getProfile('poetic_leader')!;
console.log('Profile:', poeticProfile.name);
console.log('Description:', poeticProfile.description);
console.log('Constraints:', poeticProfile.constraints.map(c => `${c.dimension}=${c.mode}${c.value !== undefined ? ':' + c.value : c.min !== undefined ? ':[' + c.min + '-' + c.max + ']' : ''}`).join(', '));

const poeticResult = styleControl.run({
  state: textState,
  profile: poeticProfile,
  depth: 3,
  temperature: 0.7
});

console.log('\nValid Subspace:');
console.log('  gate:', poeticResult.validSubspace.gate);
console.log('  line:', poeticResult.validSubspace.line);
console.log('  color:', poeticResult.validSubspace.color);
console.log('  tone:', poeticResult.validSubspace.tone);
console.log('  base:', poeticResult.validSubspace.base);

console.log('\nFeasibility:', poeticResult.feasibility.toFixed(3));
console.log('Warnings:', poeticResult.warnings.length > 0 ? poeticResult.warnings : 'none');
console.log('Constrained Depth:', poeticResult.constrainedRequest.depth);
console.log('Clamped Temperature:', poeticResult.constrainedRequest.temperature.toFixed(3));

// Now feed the constrained request into SurfaceTransformEngine
console.log('\n--- Executing constrained transform ---');
const poeticTransform = surfaceTransform.run({
  state: textState,
  domain: 'language',
  constraint: poeticResult.constrainedRequest
});

console.log('Original:', poeticTransform.original.surface?.text);
console.log('\nVariants (constrained by poetic_leader style):');
poeticTransform.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.text}`);
});

// ============================================================================
// TEST 2: Technical Precise Profile
// ============================================================================

console.log('\n\n--- TEST 2: Technical Precise Profile ---\n');

const technicalProfile = styleControl.getProfile('technical_precise')!;
console.log('Profile:', technicalProfile.name);

const technicalResult = styleControl.run({
  state: textState,
  profile: technicalProfile,
  depth: 3,
  temperature: 0.5
});

console.log('Feasibility:', technicalResult.feasibility.toFixed(3));
console.log('Constrained Depth:', technicalResult.constrainedRequest.depth);

const technicalTransform = surfaceTransform.run({
  state: textState,
  domain: 'language',
  constraint: technicalResult.constrainedRequest
});

console.log('\nOriginal:', technicalTransform.original.surface?.text);
console.log('Variants (constrained by technical_precise style):');
technicalTransform.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.text}`);
});

// ============================================================================
// TEST 3: Playful Casual Profile
// ============================================================================

console.log('\n\n--- TEST 3: Playful Casual Profile (legacy optional) ---\n');
const playfulProfile = styleControl.getProfile('playful_casual');
if (playfulProfile) {
  console.log('Profile:', playfulProfile.name);
  const playfulResult = styleControl.run({ state: textState, profile: playfulProfile, depth: 3, temperature: 0.8 });
  const playfulTransform = surfaceTransform.run({ state: textState, domain: 'language', constraint: playfulResult.constrainedRequest });
  console.log('Feasibility:', playfulResult.feasibility.toFixed(3));
  console.log('Variants:', playfulTransform.variants.length);
} else {
  console.log('SKIP: playful_casual is not a canonical v0.6 default profile.');
}

console.log('\n\n--- TEST 4: Functional Code Profile (legacy optional) ---\n');
const codeProfile = styleControl.getProfile('functional_code');
if (codeProfile) {
  const codeState: State = {
    ...textState,
    hash: 'test-hash-code',
    domain: 'code',
    coordinates: { ...textState.coordinates, gate: 42, line: 3, base: 2 },
    ontology: { movement: 0.25, evolution: 0.4, being: 0.171, design: 0.25, space: 0.175 },
    surface: { code: 'for (let i = 0; i < 10; i++) { console.log(i); }' }
  };
  console.log('Profile:', codeProfile.name);
  const codeResult = styleControl.run({ state: codeState, profile: codeProfile, depth: 3, temperature: 0.6 });
  const codeTransform = surfaceTransform.run({ state: codeState, domain: 'code', constraint: codeResult.constrainedRequest });
  console.log('Feasibility:', codeResult.feasibility.toFixed(3));
  console.log('Variants:', codeTransform.variants.length);
} else {
  console.log('SKIP: functional_code is not a canonical v0.6 default profile.');
}

console.log('\n\n--- TEST 5: Custom Profile Creation ---\n');

const customProfile: StyleProfile = {
  name: 'aggressive_minimalist',
  description: 'Aggressive, direct, minimal — for urgent commands',
  domain: 'language',
  constraints: [
    { dimension: 'base', mode: 'fix', value: 1 },      // Individual
    { dimension: 'line', mode: 'fix', value: 1 },      // Direct
    { dimension: 'color', mode: 'range', min: 5, max: 6 }, // Hot/aggressive
    { dimension: 'tone', mode: 'fix', value: 1 },      // Simple
    { dimension: 'degree', mode: 'range', min: 0, max: 90 }, // Spring/urgent
  ],
  origin: 'user_created',
  confidence: 0.5,
};

styleControl.registerProfile(customProfile);
console.log('Registered custom profile:', customProfile.name);

const customResult = styleControl.run({
  state: textState,
  profile: customProfile,
  depth: 2,
  temperature: 0.9
});

console.log('Feasibility:', customResult.feasibility.toFixed(3));
console.log('Warnings:', customResult.warnings.length > 0 ? customResult.warnings : 'none');

const customTransform = surfaceTransform.run({
  state: textState,
  domain: 'language',
  constraint: customResult.constrainedRequest
});

console.log('\nOriginal:', customTransform.original.surface?.text);
console.log('Variants (constrained by aggressive_minimalist style):');
customTransform.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.text}`);
});

// ============================================================================
// TEST 6: Profile Learning
// ============================================================================

console.log('\n\n--- TEST 6: Profile Learning ---\n');

console.log('Before feedback:');
console.log('  poetic_leader confidence:', styleControl.getProfile('poetic_leader')?.confidence?.toFixed(3));

styleControl.learnProfile('poetic_leader', { success: true, rating: 0.9 });

console.log('\nAfter positive feedback (rating 0.9):');
console.log('  poetic_leader confidence:', styleControl.getProfile('poetic_leader')?.confidence?.toFixed(3));

styleControl.learnProfile('poetic_leader', { success: false, rating: 0.2 });

console.log('\nAfter negative feedback (rating 0.2):');
console.log('  poetic_leader confidence:', styleControl.getProfile('poetic_leader')?.confidence?.toFixed(3));

// ============================================================================
// TEST 7: List All Profiles
// ============================================================================

console.log('\n\n--- TEST 7: All Registered Profiles ---\n');

const allProfiles = styleControl.listProfiles();
allProfiles.forEach(p => {
  console.log(`  ${p.name} (${p.domain}): ${p.description} [confidence: ${(p.confidence || 0).toFixed(2)}]`);
});

// ============================================================================
// TEST 8: Mesh Topology
// ============================================================================

console.log('\n\n--- TEST 8: Mesh Topology ---\n');

console.log('Mesh topology:');
console.table(mesh.topology());

console.log('\nTotal messages:', mesh.log.length);

// ============================================================================
// TEST 9: Heartfield → Body Flow Demonstration
// ============================================================================

console.log('\n\n--- TEST 9: Heartfield → Body Flow ---\n');

console.log('The Heartfield (directive) says:');
console.log('  "I want this text to sound like a poetic leader speaking."');
console.log('\nThe StyleControlEngine (Heartfield tool) computes:');
console.log('  - Valid subspace: base=5, line=4-6, color=4-6, tone=4-6');
console.log('  - Feasibility: ~0.35 (moderately constrained)');
console.log('  - Clamped temperature: 0.525');
console.log('\nThe SurfaceTransformEngine (Body tool) executes:');
console.log('  - Generates variants within the constrained subspace');
console.log('  - Preserves ontology (invariant structure)');
console.log('  - Mutates surface (words, syntax, style)');
console.log('\nResult: Poetic leader variants of the original text');

// ============================================================================
// TEST 10: Codegen
// ============================================================================

console.log('\n\n--- TEST 10: Codegen Output ---\n');

const generatedCode = styleControl.codegen({ profileName: 'poetic_leader' });
console.log(generatedCode.slice(0, 600) + '...');

console.log('\n\n=== ALL TESTS COMPLETE ===');
