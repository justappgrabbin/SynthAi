import { MorphMemoryEngine } from "../vendor/morph-mir-system/lib/morphMemoryEngine.js";
let sequence = 0;
function nodeFor(toolId, output, context) {
  return {
    expressionNodeId: `tool_${toolId}_${context.sessionId}_${++sequence}`,
    sourceChannelIds: [...context.expression.capabilities],
    sourceStateIds: [],
    sourceToolIds: [toolId],
    capabilities: [...context.expression.capabilities],
    inputs: [],
    outputs: [],
    configuration: { output }
  };
}
function success(toolId, output, context) {
  const node = nodeFor(toolId, output, context);
  const provenance = {
    recordId: `prov_${toolId}_${context.sessionId}_${sequence}`,
    timestamp: Date.now(),
    sourceType: "TOOL",
    sourceId: toolId,
    description: `Executed ${toolId}`,
    resultingNodeIds: [node.expressionNodeId]
  };
  return { success: true, outputValues: { output }, expressionNodes: [node], provenance: [provenance] };
}
function failure(error) {
  return { success: false, outputValues: { error: error instanceof Error ? error.message : String(error) }, expressionNodes: [], provenance: [] };
}
function morphMirAdapter(engine = new MorphMemoryEngine()) {
  const provides = ["ingest", "analyze", "remember", "regenerate"];
  return {
    toolId: "morph-mir",
    name: "Morph MIR Regeneration Engine",
    provides,
    requires: [],
    accepts(expression) {
      return expression.capabilities.some((cap) => provides.includes(cap));
    },
    async execute(context) {
      try {
        const name = String(context.inputValues.name || "artifact");
        const content = String(context.inputValues.content || "");
        const mode = context.inputValues.mode || "morph_runtime";
        const artifact = {
          id: `art_${context.sessionId}`,
          originalName: name,
          originalContent: content,
          metadata: { fileType: name.split(".").pop() || "unknown", size: content.length, uploadedAt: (/* @__PURE__ */ new Date()).toISOString(), status: "uploaded" }
        };
        const analyzed = await engine.analyzeArtifact(artifact);
        await engine.rememberArtifact(analyzed);
        const regenerated = await engine.regenerateArtifact(analyzed, void 0, mode);
        return success("morph-mir", {
          understanding: analyzed.understanding,
          regeneration: regenerated.regenerationResult
        }, context);
      } catch (error) {
        return failure(error);
      }
    }
  };
}
var stdin_default = morphMirAdapter;
export {
  stdin_default as default,
  morphMirAdapter
};
