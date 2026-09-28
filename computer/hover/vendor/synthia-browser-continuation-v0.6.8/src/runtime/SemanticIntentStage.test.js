import test from "node:test";
import assert from "node:assert/strict";
import { createSynthiaRuntime } from "../UPGRADES/bootstrap/createSynthiaRuntime.js";

test("GraphRuntime executes the semantic intent stage exactly once per session", async () => {
  const { runtime } = createSynthiaRuntime();
  const intent = {
    intentId: "semantic-intent-stage-test",
    description: "A small tool that greets the user by name and remembers the greeting",
    side: "FOUR_SIDE",
    seed: 12345n
  };
  await runtime.ingest(intent);
  await runtime.step(intent.intentId);
  await runtime.step(intent.intentId);
  const graph = runtime.states.get(intent.intentId).expressionGraph;
  for (const toolId of ["autoling", "diseminer", "computational-grammar-coder"]) {
    const nodes = graph.nodes.filter(node => node.sourceToolIds.includes(toolId));
    assert.equal(nodes.length, 1, `${toolId} should execute once per session`);
    assert.ok(nodes[0].capabilities.includes("semantic.intent.analysis"));
    assert.ok(Object.prototype.hasOwnProperty.call(nodes[0].configuration, "output"));
  }
});
