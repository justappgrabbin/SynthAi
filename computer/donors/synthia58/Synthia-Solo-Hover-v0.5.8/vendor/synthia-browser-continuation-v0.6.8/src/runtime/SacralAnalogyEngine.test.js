import { EventMesh } from "./EventMesh.js";
import { SacralAnalogyEngine } from "./SacralAnalogyEngine.js";
const mesh = new EventMesh();
mesh.onEmergence(({ channel, firstSource }) => {
  console.log(`[mesh] EMERGENT CHANNEL "${channel}" created by ${firstSource}`);
});
const sacral = new SacralAnalogyEngine(mesh);
console.log("\n=== SACRAL ANALOGY ENGINE \u2014 CREATIVE CENTER TEST ===\n");
console.log("Architecture: State (5D) \u2192 Hypercube (n-D) \u2192 XOR/Equivalence \u2192 Surface\n");
console.log("--- TEST 1: Sacral Activation ---\n");
const activeState = {
  who: { id: "creator-1", namespace: "sacral", signature: "sacral-sig" },
  what: { type: "creative_impulse", traits: {}, memory: [] },
  where: { trajectory: [59], position: "Sacral center" },
  when: { temporalMarker: 0.5, cyclePhase: "Creation" },
  why: { constraints: ["create"], purpose: "birth_new_world", bound: 1 },
  ontology: { movement: 0.8, evolution: 0.7, being: 0.6, design: 0.5, space: 0.9 },
  coordinates: { gate: 59, line: 6, color: 6, tone: 5, base: 5, degree: 270, minute: 0, second: 0, arc: 0, zodiac: "Sagittarius", house: 9 },
  resolved: true,
  hash: "sacral-active",
  domain: "language"
};
const response1 = sacral.run({ state: activeState, domain: "language", depth: 3 });
console.log("Sacral activated:", response1.activated);
console.log("Active gates:", response1.gates);
console.log("Active channels:", response1.channels);
console.log("Creative energy:", response1.energy.toFixed(3));
console.log("Creations:", response1.creations.length);
console.log("\n\n--- TEST 2: Inactive Sacral (Rest) ---\n");
const restState = {
  ...activeState,
  coordinates: { ...activeState.coordinates, gate: 1, line: 1, color: 1, base: 1 },
  hash: "sacral-rest"
};
const response2 = sacral.run({ state: restState, domain: "language" });
console.log("Sacral activated:", response2.activated);
console.log("Active gates:", response2.gates);
console.log("Active channels:", response2.channels);
console.log("Energy:", response2.energy.toFixed(3));
console.log("(Sacral rests when no gates are active)");
console.log("\n\n--- TEST 3: Language Creation ---\n");
const langResponse = sacral.run({ state: activeState, domain: "language", depth: 2 });
langResponse.creations.forEach((creation, i) => {
  console.log(`
Creation ${i + 1}:`);
  console.log(`  Transformation: ${creation.transformation.type} \u2014 ${creation.transformation.description}`);
  console.log(`  Confidence: ${creation.confidence.toFixed(3)}`);
  console.log(`  Surface: "${creation.surface}"`);
});
console.log("\n\n--- TEST 4: Code Creation ---\n");
const codeState = {
  ...activeState,
  domain: "code",
  coordinates: { ...activeState.coordinates, gate: 42, line: 4, base: 2 },
  hash: "code-sacral"
};
const codeResponse = sacral.run({ state: codeState, domain: "code", depth: 2 });
codeResponse.creations.forEach((creation, i) => {
  console.log(`
Creation ${i + 1}:`);
  console.log(`  Transformation: ${creation.transformation.type}`);
  console.log(`  Surface: ${creation.surface}`);
});
console.log("\n\n--- TEST 5: Image Creation ---\n");
const imageState = {
  ...activeState,
  domain: "image",
  coordinates: { ...activeState.coordinates, gate: 30, line: 5, color: 5, base: 3 },
  hash: "image-sacral"
};
const imageResponse = sacral.run({ state: imageState, domain: "image", depth: 2 });
imageResponse.creations.forEach((creation, i) => {
  console.log(`
Creation ${i + 1}:`);
  console.log(`  Transformation: ${creation.transformation.type}`);
  console.log(`  Surface: ${creation.surface}`);
});
console.log("\n\n--- TEST 6: Music Creation ---\n");
const musicState = {
  ...activeState,
  domain: "music",
  coordinates: { ...activeState.coordinates, gate: 55, line: 2, color: 3, base: 1, degree: 120 },
  hash: "music-sacral"
};
const musicResponse = sacral.run({ state: musicState, domain: "music", depth: 2 });
musicResponse.creations.forEach((creation, i) => {
  console.log(`
Creation ${i + 1}:`);
  console.log(`  Transformation: ${creation.transformation.type}`);
  console.log(`  Surface: ${creation.surface}`);
});
console.log("\n\n--- TEST 7: Game Creation ---\n");
const gameState = {
  ...activeState,
  domain: "game",
  coordinates: { ...activeState.coordinates, gate: 17, line: 5, color: 2, base: 4 },
  hash: "game-sacral"
};
const gameResponse = sacral.run({ state: gameState, domain: "game", depth: 2 });
gameResponse.creations.forEach((creation, i) => {
  console.log(`
Creation ${i + 1}:`);
  console.log(`  Transformation: ${creation.transformation.type}`);
  console.log(`  Surface: ${creation.surface}`);
});
console.log("\n\n--- TEST 8: Same State, Different Domains (Klein Unity) ---\n");
const unifiedState = {
  ...activeState,
  coordinates: { ...activeState.coordinates, gate: 34, line: 4, color: 4, tone: 4, base: 3 },
  hash: "unified-sacral"
};
const domains = ["language", "code", "image", "music", "game"];
for (const domain of domains) {
  const domainState = { ...unifiedState, domain };
  const response = sacral.run({ state: domainState, domain, depth: 1 });
  console.log(`
${domain.toUpperCase()}:`);
  console.log(`  Sacral: ${response.activated ? "YES" : "NO"}`);
  console.log(`  Energy: ${response.energy.toFixed(3)}`);
  if (response.creations[0]) {
    console.log(`  Surface: ${response.creations[0].surface}`);
  }
}
console.log("\n(Same underlying state, same hypercube computation, different domain surfaces)");
console.log("\n\n--- TEST 9: Transformation Types ---\n");
const transforms = sacral.getTransformations();
console.log("Available transformations:");
transforms.forEach((t) => {
  console.log(`  ${t.type}: ${t.description}`);
});
console.log("\n\n--- TEST 10: Mesh Topology ---\n");
console.log("Mesh topology:");
console.table(mesh.topology());
console.log("\nTotal messages:", mesh.log.length);
console.log("\n\n--- TEST 11: The Sacral Responds ---\n");
console.log("The sacral is a motor center. It responds YES or NO.");
console.log("When the state activates sacral gates (5, 14, 29, 34, 57, 59):");
console.log("  \u2192 The sacral says YES");
console.log("  \u2192 Energy flows");
console.log("  \u2192 The hypercube computes");
console.log("  \u2192 Creation happens");
console.log("");
console.log("When the state does not activate sacral gates:");
console.log("  \u2192 The sacral says NO");
console.log("  \u2192 Energy rests");
console.log("  \u2192 Nothing is created");
console.log("  \u2192 The system waits");
console.log("");
console.log("This is not a database lookup.");
console.log("This is not a taxonomy.");
console.log("This is a computational engine that transforms state into creation.");
console.log("\n\n=== ALL TESTS COMPLETE ===");
