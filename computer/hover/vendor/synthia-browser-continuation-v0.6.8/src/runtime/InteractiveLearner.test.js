import { EventMesh } from "./EventMesh.js";
import { InteractiveLearner } from "./InteractiveLearner.js";
const mesh = new EventMesh();
mesh.onEmergence(({ channel, firstSource }) => {
  console.log(`[mesh] EMERGENT CHANNEL "${channel}" created by ${firstSource}`);
});
const learner = new InteractiveLearner(mesh);
console.log("\n=== INTERACTIVE LEARNER \u2014 TEACHING ORGAN TEST ===\n");
console.log("Architecture: Human \u2194 InteractiveLearner (mouth/ears) \u2194 MIND \u2194 Heartfield \u2194 Body\n");
console.log("--- TEST 1: Teaching Poetic Language Style ---\n");
const example1 = {
  who: "teacher-sarah",
  what: "The moon weeps silver tears upon the sleeping earth",
  where: "language",
  when: Date.now(),
  why: "I need language that feels warm, poetic, and deeply personal",
  context: "Writing a letter to a dear friend"
};
console.log("Human speaks:");
console.log(`  WHO: ${example1.who}`);
console.log(`  WHAT: "${example1.what}"`);
console.log(`  WHERE: ${example1.where}`);
console.log(`  WHY: ${example1.why}`);
console.log(`  CONTEXT: ${example1.context}`);
const test1 = learner.run(example1);
console.log("\nSystem speaks back (test case):");
console.log(`  ID: ${test1.id}`);
console.log(`  Surface: "${test1.surface}"`);
console.log(`  Confidence: ${test1.confidence.toFixed(3)}`);
console.log(`  Derived from: ${test1.derivedFrom}`);
console.log("\nHuman responds: YES");
learner.receiveFeedback({
  testId: test1.id,
  response: "yes",
  explanation: "This feels right \u2014 warm and poetic",
  intensity: 0.9
});
console.log("\n\n--- TEST 2: Second Example, Same Style ---\n");
const example2 = {
  who: "teacher-sarah",
  what: "The old oak remembers every storm it has survived",
  where: "language",
  when: Date.now(),
  why: "Same style \u2014 warm, poetic, personal, but with strength"
};
const test2 = learner.run(example2);
console.log("System speaks back:");
console.log(`  Surface: "${test2.surface}"`);
console.log(`  Confidence: ${test2.confidence.toFixed(3)}`);
console.log("\nHuman responds: YES");
learner.receiveFeedback({
  testId: test2.id,
  response: "yes",
  explanation: "Yes, this is the style I want",
  intensity: 0.8
});
console.log("\n\n--- TEST 3: Third Example \u2014 System Confidence Rising ---\n");
const example3 = {
  who: "teacher-sarah",
  what: "The river carries stories older than stone",
  where: "language",
  when: Date.now(),
  why: "Same warm poetic style"
};
const test3 = learner.run(example3);
console.log("System speaks back:");
console.log(`  Surface: "${test3.surface}"`);
console.log(`  Confidence: ${test3.confidence.toFixed(3)} (higher now!)`);
console.log("\nHuman responds: CORRECTION");
learner.receiveFeedback({
  testId: test3.id,
  response: "correction",
  correction: "The river carries stories older than stone, whispering them to the sea",
  explanation: "Good, but add more movement \u2014 the river should feel alive",
  intensity: 0.7
});
console.log("\n\n--- TEST 4: What Has the System Learned? ---\n");
const session = learner.getAllSessions()[0];
console.log("Session ID:", session.id);
console.log("Status:", session.status);
console.log("Examples:", session.examples.length);
console.log("Tests:", session.tests.length);
console.log("Feedback:", session.feedback.length);
console.log("Rules:", session.rules.length);
console.log("\nRules learned:");
session.rules.forEach((rule, i) => {
  console.log(`  [${i + 1}] ${rule.id}`);
  console.log(`      Confidence: ${rule.confidence.toFixed(3)}`);
  console.log(`      Evidence: ${rule.evidence}, Contradictions: ${rule.contradictions}`);
  console.log(`      Pattern: ${JSON.stringify(rule.pattern).slice(0, 80)}`);
});
console.log("\n\n--- TEST 5: Teaching Code Style ---\n");
const codeExample = {
  who: "teacher-mike",
  what: "function processData(data) { return data.map(x => x * 2); }",
  where: "code",
  when: Date.now(),
  why: "I want clean, functional, readable code",
  context: "Data processing pipeline"
};
const codeTest = learner.run(codeExample);
console.log("Human speaks:");
console.log(`  WHO: ${codeExample.who}`);
console.log(`  WHAT: ${codeExample.what}`);
console.log(`  WHY: ${codeExample.why}`);
console.log("\nSystem speaks back:");
console.log(`  Surface: "${codeTest.surface}"`);
console.log("\nHuman responds: NO");
learner.receiveFeedback({
  testId: codeTest.id,
  response: "no",
  explanation: "Too abstract \u2014 I need to see the actual code structure",
  intensity: 0.6
});
console.log("\n\n--- TEST 6: Teaching Image Style ---\n");
const imageExample = {
  who: "teacher-alex",
  what: "A warm sunset over a quiet lake with golden reflections",
  where: "image",
  when: Date.now(),
  why: "I want images that feel peaceful and nostalgic"
};
const imageTest = learner.run(imageExample);
console.log("Human speaks:");
console.log(`  WHO: ${imageExample.who}`);
console.log(`  WHAT: ${imageExample.what}`);
console.log("\nSystem speaks back:");
console.log(`  Surface: "${imageTest.surface}"`);
console.log("\nHuman responds: YES");
learner.receiveFeedback({
  testId: imageTest.id,
  response: "yes",
  explanation: "Perfect \u2014 peaceful and nostalgic",
  intensity: 0.9
});
console.log("\n\n--- TEST 7: Multiple Teachers ---\n");
console.log("Active sessions:", learner.getActiveSessions().length);
console.log("All sessions:", learner.getAllSessions().length);
console.log("\n\n--- TEST 8: Solidified Rules ---\n");
const solidified = learner.getSolidifiedRules();
console.log("Solidified rules (confidence >= 0.8):", solidified.length);
const tentative = learner.getTentativeRules();
console.log("Tentative rules (confidence < 0.8):", tentative.length);
console.log("\n\n--- TEST 9: Mesh Topology ---\n");
console.log("Mesh topology:");
console.table(mesh.topology());
console.log("\nTotal messages:", mesh.log.length);
console.log("\n\n--- TEST 10: Full Teaching Cycle ---\n");
console.log("The teaching organ cycle:");
console.log("  1. Human SPEAKS: provides example (WHO/WHAT/WHERE/WHEN/WHY)");
console.log("  2. System DIGESTS: extracts patterns, builds understanding");
console.log('  3. System SPEAKS: generates test case ("Is this what you meant?")');
console.log("  4. Human LISTENS: sees test case, evaluates it");
console.log("  5. Human RESPONDS: yes / no / correction");
console.log("  6. System LEARNS: strengthens/weighs/creates rules");
console.log("  7. System PUBLISHES: sends learned rules to mesh");
console.log("  8. Other organs USE: MIND refines, Heartfield directs, Body executes");
console.log("\nThis is the communication organ.");
console.log("It is the mouth and ears of the organism.");
console.log("It eats examples, speaks tests, listens to feedback, and grows.");
console.log("\n\n=== ALL TESTS COMPLETE ===");
