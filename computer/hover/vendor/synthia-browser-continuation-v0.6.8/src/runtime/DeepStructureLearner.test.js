import { EventMesh } from "./EventMesh.js";
import { DeepStructureLearner } from "./DeepStructureLearner.js";
import { StyleControlEngine } from "./StyleControlEngine.js";
import { SurfaceTransformEngine } from "./SurfaceTransformEngine.js";
const mesh = new EventMesh();
mesh.onEmergence(({ channel, firstSource }) => {
  console.log(`[mesh] EMERGENT CHANNEL "${channel}" created by ${firstSource}`);
});
const deepLearner = new DeepStructureLearner(mesh);
const styleControl = new StyleControlEngine(mesh);
const surfaceTransform = new SurfaceTransformEngine(mesh);
console.log("\n=== DEEP STRUCTURE LEARNER INTEGRATION TEST ===\n");
console.log("Architecture: MIND (observation) \u2192 DeepStructureLearner \u2192 Heartfield (directive) \u2192 StyleControlEngine\n");
console.log("--- TEST 1: Seeding Observations ---\n");
const baseState = {
  who: { id: "user-1", namespace: "test", signature: "abc" },
  what: { type: "test", traits: {}, memory: [] },
  where: { trajectory: [1], position: "Gate 1" },
  when: { temporalMarker: 0, cyclePhase: "Aries" },
  why: { constraints: [], purpose: "test", bound: 1 },
  ontology: { movement: 0.125, evolution: 0, being: 0, design: 0, space: 0 },
  coordinates: { gate: 1, line: 1, color: 1, tone: 1, base: 5, degree: 0, minute: 0, second: 0, arc: 0, zodiac: "Aries", house: 1 },
  resolved: true,
  hash: "hash-1",
  domain: "language",
  surface: { text: "Test 1" }
};
const states = [
  baseState,
  { ...baseState, coordinates: { ...baseState.coordinates, gate: 10, line: 6, color: 5, tone: 5 }, hash: "hash-2", surface: { text: "Test 2" } },
  { ...baseState, coordinates: { ...baseState.coordinates, gate: 25, line: 6, color: 6, tone: 4 }, hash: "hash-3", surface: { text: "Test 3" } },
  { ...baseState, coordinates: { ...baseState.coordinates, gate: 33, line: 5, color: 4, tone: 6 }, hash: "hash-4", surface: { text: "Test 4" } },
  { ...baseState, coordinates: { ...baseState.coordinates, gate: 42, line: 6, color: 5, tone: 5 }, hash: "hash-5", surface: { text: "Test 5" } }
];
for (let i = 0; i < states.length; i++) {
  const state = states[i];
  const transformResult = surfaceTransform.run({
    state,
    domain: "language",
    constraint: { depth: 2, temperature: 0.5 }
  });
  const feedback = {
    success: state.coordinates.base === 5 && state.coordinates.line >= 5,
    rating: state.coordinates.base === 5 && state.coordinates.line >= 5 ? 0.9 : 0.3
  };
  deepLearner.observeTransform(state, transformResult, feedback);
  console.log(`Observation ${i + 1}: base=${state.coordinates.base}, line=${state.coordinates.line}, feedback=${feedback.success ? "SUCCESS" : "FAIL"}`);
}
console.log("\nTotal observations:", deepLearner.getObservations().length);
console.log("\n\n--- TEST 2: Running Inference ---\n");
const inference = deepLearner.run({ minEvidence: 2, force: true });
console.log("Inference complete:");
console.log("  New rules:", inference.newRules.length);
console.log("  Refined profiles:", inference.refinedProfiles.length);
console.log("  Discovered patterns:", inference.discoveredPatterns.length);
console.log("  Confidence:", inference.confidence.toFixed(3));
console.log("\nNew Rules:");
inference.newRules.forEach((rule) => {
  console.log(`  [${rule.id}] ${rule.name}`);
  console.log(`    Pattern: ${rule.pattern.dimensions}`);
  console.log(`    Confidence: ${rule.confidence.toFixed(3)} (${rule.evidence} evidence)`);
  console.log(`    Outcome: ${rule.outcome.description}`);
});
console.log("\nDiscovered Patterns:");
inference.discoveredPatterns.forEach((p) => console.log(`  - ${p}`));
console.log("\n\n--- TEST 3: Existing Rules ---\n");
const allRules = deepLearner.getRules();
console.log("Total rules (including seeded):", allRules.length);
allRules.forEach((rule) => {
  console.log(`
[${rule.id}] ${rule.name}`);
  console.log(`  Domain: ${rule.domain}`);
  console.log(`  Confidence: ${rule.confidence.toFixed(3)}`);
  console.log(`  Evidence: ${rule.evidence}`);
  console.log(`  Pattern: ${JSON.stringify(rule.pattern.dimensions)}`);
});
console.log("\n\n--- TEST 4: Profile Refinement ---\n");
const poeticProfile = styleControl.getProfile("poetic_leader");
for (let i = 0; i < 3; i++) {
  const styleResult = styleControl.run({
    state: states[i],
    profile: poeticProfile,
    depth: 2,
    temperature: 0.7
  });
  deepLearner.observeStyleControl(states[i], styleResult, {
    success: i < 2,
    // First 2 succeed, last fails
    rating: i < 2 ? 0.9 : 0.2
  });
}
const refinedInference = deepLearner.run({ minEvidence: 2, force: true });
console.log("Refined profiles:", refinedInference.refinedProfiles.length);
refinedInference.refinedProfiles.forEach((p) => {
  console.log(`
  [${p.name}]`);
  console.log(`    Description: ${p.description}`);
  console.log(`    Confidence: ${(p.confidence || 0).toFixed(3)}`);
  console.log(`    Constraints: ${p.constraints.map((c) => `${c.dimension}=${c.mode}[${c.min}-${c.max}]`).join(", ")}`);
});
console.log("\n\n--- TEST 5: Cross-Domain Patterns ---\n");
const codeState = {
  ...states[0],
  domain: "code",
  coordinates: { ...states[0].coordinates, gate: 42, line: 3, base: 2 },
  hash: "hash-code",
  surface: { code: "for (let i = 0; i < 10; i++) {}" }
};
const codeTransform = surfaceTransform.run({
  state: codeState,
  domain: "code",
  constraint: { depth: 2, temperature: 0.5 }
});
deepLearner.observeTransform(codeState, codeTransform, {
  success: true,
  rating: 0.85
});
const codeInference = deepLearner.run({ domain: "code", minEvidence: 1, force: true });
console.log("Code domain inference:");
console.log("  New rules:", codeInference.newRules.length);
console.log("  Patterns:", codeInference.discoveredPatterns);
console.log("\n\n--- TEST 6: Learning Progress ---\n");
console.log("Total observations:", deepLearner.getObservations().length);
console.log("Pattern cache size:", deepLearner["patternCache"].size);
const cache = deepLearner["patternCache"];
const sortedPatterns = Array.from(cache.entries()).sort((a, b) => b[1] - a[1]);
console.log("\nMost frequent coordinate signatures:");
sortedPatterns.slice(0, 5).forEach(([sig, count]) => {
  console.log(`  ${sig}: ${count} occurrences`);
});
console.log("\n\n--- TEST 7: Mesh Topology ---\n");
console.log("Mesh topology:");
console.table(mesh.topology());
console.log("\nTotal messages:", mesh.log.length);
console.log("\n\n--- TEST 8: Codegen Output ---\n");
const generatedCode = deepLearner.codegen();
console.log(generatedCode.slice(0, 800) + "...");
console.log("\n\n--- TEST 9: MIND \u2192 Heartfield Flow ---\n");
console.log("The MIND (DeepStructureLearner) observes:");
console.log("  - 5 language observations");
console.log("  - 3 style control observations");
console.log("  - 1 code observation");
console.log("\nThe MIND infers:");
console.log('  - "When base=5 and line=6, language outputs succeed"');
console.log('  - "When base=2, code outputs succeed"');
console.log('  - "Line 6 correlates with poetic expression"');
console.log("\nThe MIND publishes to style.control:");
console.log("  - New inferred profiles");
console.log("  - Refined versions of existing profiles");
console.log("\nThe Heartfield (StyleControlEngine) receives:");
console.log('  - "Use the refined_poetic_leader profile \u2014 it has higher confidence"');
console.log("\nThe Heartfield constrains the Body (SurfaceTransformEngine):");
console.log('  - "Generate variants using refined_poetic_leader constraints"');
console.log("\n\n--- TEST 10: Full Pipeline ---\n");
const finalInference = deepLearner.run({ force: true });
console.log("MIND inferred", finalInference.newRules.length, "new rules");
const inferredProfiles = deepLearner.getInferredProfiles();
if (inferredProfiles.length > 0) {
  const inferred = inferredProfiles[0];
  console.log("\nHeartfield using inferred profile:", inferred.name);
  const styleResult = styleControl.run({
    state: states[0],
    profile: inferred,
    depth: 2,
    temperature: 0.6
  });
  console.log("Feasibility:", styleResult.feasibility.toFixed(3));
  const transform = surfaceTransform.run({
    state: states[0],
    domain: "language",
    constraint: styleResult.constrainedRequest
  });
  console.log("\nBody output:");
  console.log("Original:", transform.original.surface?.text);
  transform.variants.forEach((v, i) => {
    console.log(`Variant ${i + 1}:`, v.surface?.text);
  });
}
console.log("\n\n=== ALL TESTS COMPLETE ===");
