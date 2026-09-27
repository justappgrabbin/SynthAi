import assert from 'node:assert/strict';
import { createSynthiaRuntime } from '../bootstrap/createSynthiaRuntime';

async function runSession(runtime: any, id: string) {
  await runtime.ingest({
    intentId: id,
    description: 'connect the active state into a reusable working process',
    side: 'FOUR_SIDE',
    planet: 1,
    dimension: 1,
    seed: 4242n
  });
  const steps = [];
  for (let i = 0; i < 4; i++) steps.push(await runtime.step(id));
  return steps;
}

async function main() {
  const { runtime, autonomy, stack } = createSynthiaRuntime();
  const beforeTools = runtime.getRegisteredTools().length;
  assert.equal(stack.ato.mesh.automatons.has('autoling'), true);

  const firstSteps = await runSession(runtime, 'autonomy-first');
  const grownAfterFirst = runtime.getRegisteredTools().filter((tool: any) => tool.toolId.startsWith('tool-'));
  assert.ok(grownAfterFirst.length > 0, 'runtime should generate at least one missing capability tool');

  const snapshot1 = autonomy.snapshot();
  const bindings1 = snapshot1.capabilityBindings;
  assert.ok(bindings1['34-57'], '34-57 should be bound to a generated tool');
  const tool3457 = bindings1['34-57'];
  assert.equal(stack.ato.mesh.automatons.has(tool3457), true, 'generated tool should be mounted in ATO mesh');
  assert.equal(runtime.getRegisteredTools().some((tool: any) => tool.toolId === tool3457), true, 'generated tool should be registered in GraphRuntime');

  const generatedCount1 = grownAfterFirst.length;
  await runSession(runtime, 'autonomy-second');
  const grownAfterSecond = runtime.getRegisteredTools().filter((tool: any) => tool.toolId.startsWith('tool-'));
  assert.equal(grownAfterSecond.length, generatedCount1, 'second session should reuse retained generated tools');

  console.log(JSON.stringify({
    beforeTools,
    generatedCount: generatedCount1,
    bound3457: tool3457,
    meshHasGenerated: stack.ato.mesh.automatons.has(tool3457),
    firstSessionStep3: firstSteps[3]
  }, null, 2));
}

main();
