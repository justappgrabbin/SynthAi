const assert = {
  ok(value: any, message = 'assertion failed') { if (!value) throw new Error(message); },
  equal(actual: any, expected: any, message = '') { if (actual !== expected) throw new Error(message || `expected ${expected}, got ${actual}`); }
};
import { GraphRuntime } from '../../runtime/GraphRuntime';
import type {
  KleinToolAdapter, ChannelExpression, ToolExecutionContext, ToolExecutionResult,
  ExpressionNode, ProvenanceRecord
} from '../../runtime/foundations';
import type { MissingToolGenerator } from '../../runtime/ToolScheduler';

class FakeRepairGenerator implements MissingToolGenerator {
  calls = new Map<string, number>();

  async ensureTool(expression: ChannelExpression, _context: ToolExecutionContext): Promise<KleinToolAdapter | null> {
    const caps = [...expression.capabilities].sort();
    const key = caps.join('+');
    const count = (this.calls.get(key) || 0) + 1;
    this.calls.set(key, count);
    const toolId = `grown-${key}-${count}`;
    return {
      toolId,
      name: `Grown ${key}`,
      provides: caps,
      requires: [],
      accepts(candidate) { return candidate.capabilities.every(cap => caps.includes(cap)); },
      async execute(context): Promise<ToolExecutionResult> {
        const nodeId = `node-${toolId}-${context.sessionId}`;
        const node: ExpressionNode = {
          expressionNodeId: nodeId,
          sourceChannelIds: [...caps],
          sourceStateIds: [],
          sourceToolIds: [toolId],
          capabilities: [...caps],
          inputs: [], outputs: [],
          configuration: { output: { repaired: true, capability: key, session: context.sessionId } }
        };
        const provenance: ProvenanceRecord = {
          recordId: `prov-${nodeId}`, timestamp: Date.now(), sourceType: 'TOOL', sourceId: toolId,
          description: `bounded repair tool ${toolId}`, resultingNodeIds: [nodeId]
        };
        return { success: true, outputValues: { repaired: true, capability: key }, expressionNodes: [node], provenance: [provenance] };
      },
      materialize() {
        return { files: [{ path: `tools/${toolId}.mjs`, content: `export default ${JSON.stringify({toolId,key})};`, type: 'javascript' }], metadata: { boundedRepair: true } };
      }
    };
  }
}

const broken3457: KleinToolAdapter = {
  toolId: 'broken-34-57',
  name: 'Broken 34-57 fixture',
  provides: ['34-57'], requires: [],
  accepts(expression) { return expression.capabilities.includes('34-57'); },
  async execute() {
    return { success: false, outputValues: { error: 'deliberate failure' }, expressionNodes: [], provenance: [] };
  }
};

async function runFour(runtime: GraphRuntime, id: string) {
  await runtime.ingest({
    intentId: id,
    description: 'connect the active state into a reusable working process',
    side: 'FOUR_SIDE', planet: 1, dimension: 1, seed: 4242n
  });
  for (let i = 0; i < 4; i++) await runtime.step(id);
}

async function main() {
  const runtime = new GraphRuntime();
  const generator = new FakeRepairGenerator();
  runtime.registerTool(broken3457).setMissingToolGenerator(generator);

  await runFour(runtime, 'learn-first');
  const first = runtime.getLearningSnapshot();
  assert.ok(first.observations >= 4, `expected execution observations, got ${first.observations}`);

  const brokenPerf = first.toolPerformance.find(p => p.toolId === 'broken-34-57');
  assert.ok(brokenPerf && brokenPerf.failures >= 1, 'broken installed tool failure should become learning evidence');
  assert.ok((brokenPerf?.score || 1) < 0.5, 'broken tool reliability should drop below neutral');

  const repairId = runtime.getRegisteredTools().find(t => t.toolId.startsWith('grown-34-57-'))?.toolId;
  assert.ok(repairId, 'failed installed capability should trigger one generated correction tool');
  const repairPerf = first.toolPerformance.find(p => p.toolId === repairId);
  assert.ok(repairPerf && repairPerf.successes >= 1 && repairPerf.correctionExecutions >= 1, 'correction execution should be learned as successful');
  assert.equal(generator.calls.get('34-57'), 1, 'only one bounded correction generation should occur');

  const teaching = runtime.teach({
    who: 'operator', what: 'prefer retained working tools over failed paths', where: 'code',
    when: Date.now(), why: 'reuse learned successful paths'
  });
  runtime.receiveFeedback({ testId: teaching.id, response: 'yes', intensity: 0.9 });
  assert.ok(runtime.getLearningSnapshot().interactiveSessions.length >= 1, 'interactive learner should be live through GraphRuntime');
  assert.ok(runtime.getRegisteredTools().some(t => t.toolId === 'broken-34-57'), 'failed historical tool should remain registered, not deleted');

  // Re-run. The retained correction remains registered, so no second generated
  // replacement is needed even though the broken historical tool still exists.
  await runFour(runtime, 'learn-second');
  assert.equal(generator.calls.get('34-57'), 1, 'second session should reuse the learned retained correction');

  const artifact = await runtime.materialize('learn-second', 'WEB_APP');
  assert.equal(artifact.success, true, artifact.errors.join('; '));
  const learningFile = artifact.files.find(f => f.path === 'synthia/learning-state.json');
  assert.ok(learningFile, 'materialized artifact should carry learner state');
  const persisted = JSON.parse(learningFile!.content);
  assert.ok(persisted.observations >= first.observations, 'learning state should persist accumulated execution evidence');
  assert.ok(Array.isArray(persisted.toolPerformance) && persisted.toolPerformance.length > 0);
  assert.equal(persisted.toolHealth['broken-34-57'].quarantined, true, 'repeatedly failed path should be inactive while healthy replacement exists');
  assert.ok(artifact.manifest.materializedFiles.includes('synthia/learning-state.json'));

  console.log(JSON.stringify({
    observations: persisted.observations,
    deepRules: persisted.deepRules.length,
    interactiveSessions: persisted.interactiveSessions.length,
    brokenPerformance: persisted.toolPerformance.find((p:any) => p.toolId === 'broken-34-57'),
    retainedCorrection: repairId,
    correctionGenerationCount: generator.calls.get('34-57'),
    brokenRouteQuarantined: persisted.toolHealth['broken-34-57'].quarantined,
    learningFile: 'synthia/learning-state.json'
  }, null, 2));
}

main();
