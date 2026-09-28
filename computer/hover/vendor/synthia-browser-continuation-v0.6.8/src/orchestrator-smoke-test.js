import { createSynthiaRuntime } from "./UPGRADES/bootstrap/createSynthiaRuntime.js";
async function main() {
  const { runtime, stack } = createSynthiaRuntime();
  console.log("--- orchestrator: full session run ---");
  console.log("Tools available to the runtime:", stack.adapters.length);
  const intent = {
    intentId: "intent-1",
    description: "A small tool that greets the user by name and remembers the greeting",
    side: "FOUR_SIDE",
    seed: 12345n
  };
  console.log("\n[INGEST] accepting intent:", intent.description);
  const session = await runtime.ingest(intent);
  console.log("  sessionId:", session.sessionId);
  console.log("\n[UNDERSTAND/ADDRESS/PLACE] stepping through the five dimensions until settled...");
  let steps = 0;
  let lastResult;
  while (steps < 25) {
    lastResult = await runtime.step(session.sessionId);
    steps++;
    console.log(`  step ${steps}: dimension=${lastResult.dimensionalStage} activeStates=${lastResult.activeStates} openArcs=${lastResult.openArcs} activeChannels=${lastResult.activeChannels} coherence=${lastResult.coherence.toFixed(2)}`);
    if (lastResult.dimensionalStage >= 5 || lastResult.openArcs === 0 && lastResult.activeStates === 0 && steps > 1) break;
  }
  console.log("\n[EXECUTE] materializing an artifact...");
  const artifact = await runtime.materialize(session.sessionId, "CLI");
  console.log("  success:", artifact.success);
  console.log("  errors:", artifact.errors);
  console.log("  files produced:", artifact.files?.length);
  for (const f of artifact.files || []) {
    console.log("   -", f.path || f.name, `(${(f.content || "").length} chars)`);
  }
  const semanticSpec = artifact.files?.find((f) => f.path === "synthia/semantic-spec.json");
  const cli = artifact.files?.find((f) => f.path === "cli.mjs");
  if (!semanticSpec || !cli || !cli.content.includes("Hello, ${name}!")) {
    throw new Error("Semantic materialization regression: greeting + memory CLI was not compiled from the intent");
  }
  const parsedSpec = JSON.parse(semanticSpec.content);
  if (!parsedSpec.actions?.includes("greet") || !parsedSpec.actions?.includes("remember") || !parsedSpec.inputs?.includes("name")) {
    throw new Error("Semantic materialization regression: behavior spec does not satisfy the input intent");
  }
  console.log("  semantic behavior:", parsedSpec.actions.join(" + "), "inputs:", parsedSpec.inputs.join(", "));
  console.log("\n--- orchestrator run complete ---");
}
main().catch((err) => {
  console.error("ORCHESTRATOR SMOKE TEST FAILED:", err);
  process.exit(1);
});
