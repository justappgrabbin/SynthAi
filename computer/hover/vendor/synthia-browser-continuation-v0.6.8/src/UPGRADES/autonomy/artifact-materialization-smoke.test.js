import assert from "node:assert/strict";
import { createSynthiaRuntime } from "../bootstrap/createSynthiaRuntime.js";
import { ChannelRegistry, INTEGRATION_CIRCUIT_CHANNELS } from "../../runtime/ChannelRegistry.js";
async function main() {
  const registry = new ChannelRegistry();
  const integration = ["10-34", "10-57", "34-57", "20-34", "20-57", "10-20"];
  assert.equal(INTEGRATION_CIRCUIT_CHANNELS.size, 6);
  for (const id of integration) assert.equal(registry.getChannel(id)?.circuit, "Integration", `${id} should be Integration`);
  const { runtime } = createSynthiaRuntime();
  const sessionId = "artifact-v04";
  await runtime.ingest({
    intentId: sessionId,
    description: "connect the active state into a reusable working process",
    side: "FOUR_SIDE",
    planet: 1,
    dimension: 1,
    seed: 4242n
  });
  for (let i = 0; i < 4; i++) await runtime.step(sessionId);
  const result = await runtime.materialize(sessionId, "WEB_APP");
  assert.equal(result.success, true, result.errors.join("; "));
  const paths = new Set(result.files.map((f) => f.path));
  assert.ok(paths.has("synthia/expression-graph.json"));
  assert.ok(paths.has("synthia/runtime-output.json"));
  assert.ok(paths.has("synthia/provenance.json"));
  assert.ok(paths.has("synthia/artifact-manifest.json"));
  assert.ok([...paths].some((p) => /^tools\/tool-.*\.mjs$/.test(p)), "generated tool source should be materialized");
  assert.deepEqual(new Set(result.manifest.materializedFiles), paths);
  const allText = result.files.map((f) => f.content).join("\n");
  assert.equal(allText.includes("console.log('Synthia app initialized')"), false);
  assert.equal(allText.includes("this.world = new World()"), false);
  assert.ok(result.manifest.executedTools.length > 0);
  assert.ok(result.manifest.activatedChannels.length > 0);
  console.log(JSON.stringify({
    integrationCircuit: integration,
    files: result.files.map((f) => f.path),
    executedTools: result.manifest.executedTools,
    activatedChannels: result.manifest.activatedChannels
  }, null, 2));
}
main();
