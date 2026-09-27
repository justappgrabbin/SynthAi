import { IntegratedToolFactory, ATONativeBridge } from "../vendor/integrated-tool-factory/src/integrated-tool-factory.mjs";
import { Automaton } from "../vendor/ato-core/src/index.mjs";
const DIMENSION_NAMES = {
  1: "Movement",
  2: "Evolution",
  3: "Being",
  4: "Design",
  5: "Space"
};
let nodeSequence = 0;
function executionSuccess(toolId, output, context) {
  const expressionNodeId = `generated_${toolId}_${context.sessionId}_${++nodeSequence}`;
  const node = {
    expressionNodeId,
    sourceChannelIds: [...context.expression.capabilities],
    sourceStateIds: [
      context.inputValues.sourceState?.stateId,
      context.inputValues.targetState?.stateId
    ].filter(Boolean),
    sourceToolIds: [toolId],
    capabilities: [...context.expression.capabilities],
    inputs: [],
    outputs: [],
    configuration: { output, generated: true }
  };
  const provenance = {
    recordId: `prov_generated_${toolId}_${context.sessionId}_${nodeSequence}`,
    timestamp: Date.now(),
    sourceType: "TOOL",
    sourceId: toolId,
    description: `Generated, mounted, and executed ${toolId}`,
    resultingNodeIds: [expressionNodeId]
  };
  return { success: true, outputValues: { output }, expressionNodes: [node], provenance: [provenance] };
}
function executionFailure(error) {
  return {
    success: false,
    outputValues: { error: error instanceof Error ? error.message : String(error) },
    expressionNodes: [],
    provenance: []
  };
}
class FactoryToolGenerator {
  factory;
  bridge;
  adapters = /* @__PURE__ */ new Map();
  capabilityToTool = /* @__PURE__ */ new Map();
  constructor({ mesh, factory = new IntegratedToolFactory() }) {
    this.factory = factory;
    this.bridge = new ATONativeBridge({ Automaton, mesh, factory: this.factory });
  }
  async ensureTool(expression, context) {
    const capabilities = [...new Set(expression.capabilities)].sort();
    if (capabilities.length === 0) return null;
    const capabilityKey = capabilities.join("+");
    const existingId = this.capabilityToTool.get(capabilityKey);
    if (existingId) return this.adapters.get(existingId) || null;
    const sourceState = context.inputValues.sourceState;
    const targetState = context.inputValues.targetState;
    const runtimeDimension = Number(
      sourceState?.address?.dimension ?? targetState?.address?.dimension ?? context.inputValues.intentRecord?.dimension ?? 5
    );
    const dimension = DIMENSION_NAMES[runtimeDimension] || "Space";
    const sourceGate = Number(sourceState?.address?.gateLine?.gate || 0);
    const targetGate = Number(targetState?.address?.gateLine?.gate || 0);
    const request = {
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
    const adapter = {
      toolId,
      name: factoryTool.name || toolId,
      provides: capabilities,
      requires: [],
      accepts(candidate) {
        return candidate.capabilities.every((cap) => capabilities.includes(cap));
      },
      async execute(toolContext) {
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
      },
      materialize() {
        return {
          files: [{
            path: `tools/${toolId}.mjs`,
            content: factoryTool.exportModule(),
            type: "javascript"
          }],
          manifest: factoryTool.manifest(),
          metadata: { generated: true, capabilityKey, request, plan: factoryTool.plan }
        };
      }
    };
    this.adapters.set(toolId, adapter);
    this.capabilityToTool.set(capabilityKey, toolId);
    return adapter;
  }
  async rejectTool(tool, reason) {
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
var stdin_default = FactoryToolGenerator;
export {
  FactoryToolGenerator,
  stdin_default as default
};
