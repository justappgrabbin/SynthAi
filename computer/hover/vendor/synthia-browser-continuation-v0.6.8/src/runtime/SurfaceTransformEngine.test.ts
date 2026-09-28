
// ============================================================================
// SurfaceTransformEngine.test.ts
// ============================================================================
// Integration test showing the SurfaceTransformEngine working with:
//   - EventMesh (pub/sub)
//   - SemanticOS (state resolution)
//   - Head (dispatcher)
//   - Existing Klein tools (Diseminer, AutoLing, etc.)
//
// Run: ts-node SurfaceTransformEngine.test.ts
// ============================================================================

import { EventMesh } from './EventMesh.js';
import { SurfaceTransformEngine, State, Domain } from './SurfaceTransformEngine.js';
import { Head } from './legacy-klein/head.js';
import { AutoLing } from './legacy-klein/autoling.js';
import { Diseminer } from './legacy-klein/diseminer.js';
import { AnalogyEngine } from './legacy-klein/analogyEngine.js';
import { IChingGrammar } from './legacy-klein/iChingGrammar.js';

// ============================================================================
// SETUP: Create mesh, instantiate all tools, register with Head
// ============================================================================

const mesh = new EventMesh();

// Log channel emergence
mesh.onEmergence(({ channel, firstSource }) => {
  console.log(`[mesh] EMERGENT CHANNEL "${channel}" created by ${firstSource}`);
});

// Instantiate all tools
const autoLing = new AutoLing(mesh);
const diseminer = new Diseminer(mesh);
const analogy = new AnalogyEngine(mesh);
const iching = new IChingGrammar(mesh);
const surfaceTransform = new SurfaceTransformEngine(mesh);

// Head dispatcher
const head = new Head(mesh);
head.register('AutoLing', autoLing);
head.register('Diseminer', diseminer);
head.register('AnalogyEngine', analogy);
head.register('IChingGrammar', iching);
head.register('SurfaceTransformEngine', surfaceTransform);

console.log('\n=== SURFACE TRANSFORM ENGINE INTEGRATION TEST ===\n');

// ============================================================================
// TEST 1: Language Paraphrasing (Klein 1965)
// ============================================================================

console.log('--- TEST 1: Language Paraphrasing ---\n');

const textState: State = {
  who: { id: 'user-1', namespace: 'test', signature: 'abc123' },
  what: { type: 'linguistic_query', traits: { originalText: 'The cat sat on the mat' }, memory: [] },
  where: { trajectory: [1], position: 'Gate 1, Line 1' },
  when: { temporalMarker: 0, cyclePhase: 'Aries' },
  why: { constraints: ['paraphrase'], purpose: 'style_exploration', bound: 0.8 },
  ontology: { movement: 0.125, evolution: 0, being: 0, design: 0, space: 0.0083 },
  coordinates: { gate: 1, line: 1, color: 1, tone: 1, base: 5, degree: 0, minute: 0, second: 0, arc: 0, zodiac: 'Aries', house: 1 },
  resolved: true,
  hash: 'test-hash-1',
  domain: 'language',
  surface: { text: 'The cat sat on the mat' }
};

const langResult = surfaceTransform.run({
  state: textState,
  domain: 'language',
  constraint: { depth: 3, temperature: 0.7 }
});

console.log('Original:', langResult.original.surface?.text);
console.log('\nVariants:');
langResult.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.text}`);
});
console.log('\nInvariant preserved:', JSON.stringify(langResult.invariant.ontology) === JSON.stringify(textState.ontology));
console.log('Confidence:', langResult.confidence.toFixed(3));
console.log('\nTransformation Log:');
langResult.transformationLog.forEach(step => {
  console.log(`  ${step.dimension}: ${step.preserved ? 'PRESERVED' : 'CHANGED'} (delta: ${step.delta.toFixed(3)})`);
});

// ============================================================================
// TEST 2: Code Refactoring
// ============================================================================

console.log('\n\n--- TEST 2: Code Refactoring ---\n');

const codeState: State = {
  ...textState,
  hash: 'test-hash-2',
  domain: 'code',
  coordinates: { ...textState.coordinates, gate: 42, line: 3, base: 2 },
  ontology: { movement: 0.25, evolution: 0.4, being: 0.171, design: 0.25, space: 0.175 },
  surface: { code: 'for (let i = 0; i < 10; i++) { console.log(i); }' }
};

const codeResult = surfaceTransform.run({
  state: codeState,
  domain: 'code',
  constraint: { depth: 3, temperature: 0.6 }
});

console.log('Original:', codeResult.original.surface?.code);
console.log('\nVariants:');
codeResult.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.code}`);
});

// ============================================================================
// TEST 3: Image Style Transfer
// ============================================================================

console.log('\n\n--- TEST 3: Image Style Transfer ---\n');

const imageState: State = {
  ...textState,
  hash: 'test-hash-3',
  domain: 'image',
  coordinates: { ...textState.coordinates, gate: 30, line: 4, color: 5, tone: 2, base: 3 },
  ontology: { movement: 0.375, evolution: 0.6, being: 0.257, design: 0.5, space: 0.25 },
  surface: { description: 'A mountain landscape with a river' }
};

const imageResult = surfaceTransform.run({
  state: imageState,
  domain: 'image',
  constraint: { depth: 3, temperature: 0.8 }
});

console.log('Original:', imageResult.original.surface?.description);
console.log('\nVariants:');
imageResult.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.description}`);
});

// ============================================================================
// TEST 4: Music Arrangement
// ============================================================================

console.log('\n\n--- TEST 4: Music Arrangement ---\n');

const musicState: State = {
  ...textState,
  hash: 'test-hash-4',
  domain: 'music',
  coordinates: { ...textState.coordinates, gate: 55, line: 2, color: 3, tone: 4, base: 1, degree: 120 },
  ontology: { movement: 0.875, evolution: 0.2, being: 0.314, design: 0, space: 0.333 },
  surface: { score: 'C4 E4 G4 C5' }
};

const musicResult = surfaceTransform.run({
  state: musicState,
  domain: 'music',
  constraint: { depth: 3, temperature: 0.5 }
});

console.log('Original:', musicResult.original.surface?.score);
console.log('\nVariants:');
musicResult.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.score}`);
});

// ============================================================================
// TEST 5: Game Reskinning
// ============================================================================

console.log('\n\n--- TEST 5: Game Reskinning ---\n');

const gameState: State = {
  ...textState,
  hash: 'test-hash-5',
  domain: 'game',
  coordinates: { ...textState.coordinates, gate: 17, line: 5, color: 2, tone: 1, base: 4, degree: 225 },
  ontology: { movement: 0.125, evolution: 0.8, being: 0.057, design: 0.75, space: 0.625 },
  surface: { rules: 'Player collects coins, avoids enemies, reaches exit' }
};

const gameResult = surfaceTransform.run({
  state: gameState,
  domain: 'game',
  constraint: { depth: 3, temperature: 0.9 }
});

console.log('Original:', gameResult.original.surface?.rules);
console.log('\nVariants:');
gameResult.variants.forEach((v, i) => {
  console.log(`  [${i + 1}] ${v.surface?.rules}`);
});

// ============================================================================
// TEST 6: Cross-Domain Projection (Language → Code)
// ============================================================================

console.log('\n\n--- TEST 6: Cross-Domain Projection ---\n');

// Take a language state and project it to code
const langToCode = surfaceTransform.run({
  state: textState,
  domain: 'code',
  constraint: { depth: 2, temperature: 0.5, preserve: ['ontology'] }
});

console.log('Language state projected to code:');
console.log('Original (language):', langToCode.original.surface?.text);
console.log('Variant (code):', langToCode.variants[0].surface?.code);
console.log('Ontology preserved:', JSON.stringify(langToCode.invariant.ontology));

// ============================================================================
// TEST 7: Learning Weights
// ============================================================================

console.log('\n\n--- TEST 7: Transformation State Compatibility ---\n');
const legacyHistory = (surfaceTransform as any)['transformationHistory'];
const legacyWeights = (surfaceTransform as any)['learningWeights'];
if (Array.isArray(legacyHistory)) {
  console.log('Legacy transformation history size:', legacyHistory.length);
} else {
  console.log('Canonical v0.6 stores transformation history on each result; latest log size:', langToCode.transformationLog.length);
}
if (legacyWeights instanceof Map) {
  console.log('Legacy learning weights:', legacyWeights.size);
} else {
  console.log('Canonical v0.6 SurfaceTransformEngine has no engine-level learningWeights field.');
}

console.log('\n\n--- TEST 8: Mesh Integration ---\n');

console.log('Mesh topology:');
console.table(mesh.topology());

console.log('\nTotal messages logged:', mesh.log.length);

// ============================================================================
// TEST 9: Head Dispatcher Integration
// ============================================================================

console.log('\n\n--- TEST 9: Head Dispatcher ---\n');

// Route a transform request through Head
const dispatchResult = head.dispatch({
  state: textState,
  domain: 'language',
  constraint: { depth: 2, temperature: 0.5 }
});

console.log('Head dispatch result:', dispatchResult);

// ============================================================================
// TEST 10: Codegen
// ============================================================================

console.log('\n\n--- TEST 10: Codegen Output ---\n');

const generatedCode = surfaceTransform.codegen({ domain: 'language' });
console.log(generatedCode.slice(0, 500) + '...');

console.log('\n\n=== ALL TESTS COMPLETE ===');
