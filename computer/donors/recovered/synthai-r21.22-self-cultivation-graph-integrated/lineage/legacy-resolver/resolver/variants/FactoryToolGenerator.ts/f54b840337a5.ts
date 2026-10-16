import type {
  ChannelExpression, ToolExecutionContext, KleinToolAdapter,
  ToolExecutionResult, ExpressionNode, ProvenanceRecord
} from '../../runtime/foundations';
import type { MissingToolGenerator } from '../../runtime/ToolScheduler';
// @ts-ignore - preserved ESM vendors
import { IntegratedToolFactory, ATONativeBridge } from '../vendor/integrated-tool-factory/src/integrated-tool-factory.mjs';
// @ts-ignore - preserved ESM vendor
import { Automaton } from '../vendor/ato-core/src/index.mjs';

const DIMENSION_NAMES: Record<number, 'Movement'|'Evolution'|'Being'|'Design'|'Space'> = {
  1: 'Movement', 2: 'Evolution', 3: 'Being', 4: 'Design', 5: 'Space'
};

let nodeSequence = 0;

function executionSuccess(toolId: string, output: unknown, context: ToolExecutionContext): ToolExecutionResult {
  const expressionNodeId = `generated_${toolId}_${context.sessionId}_${++nodeSequence}`;
  const node: ExpressionNode = {
    expressionNodeId,
    sourceChannelIds: [...context.expression.capabilities],
    sourceStateIds: [
      (context.inputValues.sourceState as any)?.stateId,
      (context.inputValues.targetState as any)?.stateId
    ].filter(Boolean),
    sourceToolIds: [toolId],
    capabilities: [...context.expression.capabilities],
    inputs: [],
    outputs: [],
    configuration: { output, generated: true }
  };
  const provenance: ProvenanceRecord = {
    recordId: `prov_generated_${toolId}_${context.sessionId}_${nodeSequence}`,
    timestamp: Date.now(),
    sourceType: 'TOOL',
    sourceId: toolId,
    description: `Generated, mounted, and executed ${toolId}`,
    resultingNodeIds: [expressionNodeId]
  };
  return { success: true, outputValues: { output }, expressionNodes: [node], provenance: [provenance] };
}

function executionFailure(error: unknown): ToolExecutionResult {
  return {
    success: false,
    outputValues: { error: error instanceof Error ? error.message : String(error) },
    expressionNodes: [],
    provenance: []
  };
}

export interface FactoryToolGeneratorOptions {
  mesh: any;
  factory?: any;
}

/**
 * Runtime bridge from an unsatisfied channel capability to the existing
 * Integrated Tool Factory + native ATO mesh.
 *
 * It does not invent arbitrary code. It asks the preserved 8-level factory for
 * the best bounded runtime, materializes that tool as a native ATO Automaton,
 * mounts it into the live ATO mesh, and returns a GraphRuntime adapter.
 */
export class FactoryToolGenerator implements MissingToolGenerator {
  readonly factory: any;
  readonly bridge: any;
  private adapters = new Map<string, KleinToolAdapter>();
  private capabilityToTool = new Map<string, string>();

  constructor({ mesh, factory = new IntegratedToolFactory() }: FactoryToolGeneratorOptions) {
    this.factory = factory;
    this.bridge = new ATONativeBridge({ Automaton, mesh, factory: this.factory });
  }

  async ensureTool(expression: ChannelExpression, context: ToolExecutionContext): Promise<KleinToolAdapter | null> {
    const capabilities = [...new Set(expression.capabilities)].sort();
    if (capabilities.length === 0) return null;

    const capabilityKey = capabilities.join('+');
    const existingId = this.capabilityToTool.get(capabilityKey);
    if (existingId) return this.adapters.get(existingId) || null;

    const sourceState: any = context.inputValues.sourceState;
    const targetState: any = context.inputValues.targetState;
    const runtimeDimension = Number(
      sourceState?.address?.dimension ??
      targetState?.address?.dimension ??
      (context.inputValues.intentRecord as any)?.dimension ??
      5
    );
    const dimension = DIMENSION_NAMES[runtimeDimension] || 'Space';

    const sourceGate = Number(sourceState?.address?.gateLine?.gate || 0);
    const targetGate = Number(targetState?.address?.gateLine?.gate || 0);

    // Channel capabilities are connection/event work, so level 6 is the
    // factory's existing Channel Connector runtime. Gate data remains sourced
    // from the actual activation when available instead of being fabricated.
    const request: Record<string, unknown> = {
      purpose: `connect channel capability ${capabilityKey}`,
      input: capabilityKey,
      dimension,
      level: 6
    };
    if (sourceGate >= 1 && sourceGate <= 64) request.gate = sourceGate;
    if (targetGate >= 1 && targetGate <= 64) request.targetGate = targetGate;

    const mounted = this.bridge.generateAndMount(request);
    if (!mounted?.automaton || !mounted?.tool) return null;

    const native = mounted.automaton;
    const factoryTool = mounted.tool;
    const toolId = native.id;
    const bridge = this.bridge;

    const adapter: KleinToolAdapter = {
      toolId,
      name: factoryTool.name || toolId,
      provides: capabilities,
      requires: [],
      accepts(candidate: ChannelExpression) {
        return candidate.capabilities.every(cap => capabilities.includes(cap));
      },
      async execute(toolContext: ToolExecutionContext) {
        try {
          const input = {
            intent: toolContext.inputValues.intent,
            capability: capabilityKey,
            parameters: toolContext.expression.parameters,
            sourceState: toolContext.inputValues.sourceState,
            targetState: toolContext.inputValues.targetState
          };
          const run = await bridge.run(toolId, input);
          const output = run?.outputs?.[toolId] ?? run;
          return executionSuccess(toolId, output, toolContext);
        } catch (error) {
          return executionFailure(error);
        }
      }
    };

    this.adapters.set(toolId, adapter);
    this.capabilityToTool.set(capabilityKey, toolId);
    return adapter;
  }

  async rejectTool(tool: KleinToolAdapter, reason: string): Promise<void> {
    const capabilityEntries = [...this.capabilityToTool.entries()].filter(([, id]) => id === tool.toolId);
    for (const [capabilityKey] of capabilityEntries) this.capabilityToTool.delete(capabilityKey);
    this.adapters.delete(tool.toolId);
    this.bridge.dissolve(tool.toolId, reason);
  }

  snapshot() {
    return {
      factory: this.factory.snapshot(),
      bridge: this.bridge.snapshot(),
      capabilityBindings: Object.fromEntries(this.capabilityToTool)
    };
  }
}

export default FactoryToolGenerator;
