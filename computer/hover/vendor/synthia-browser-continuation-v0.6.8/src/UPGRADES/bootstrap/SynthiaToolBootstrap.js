import { CANONICAL_CHANNEL_PAIRS, canonicalChannelId } from "../../runtime/ChannelRegistry.js";
import { SEMANTIC_INTENT_ANALYSIS } from "../../runtime/SemanticCapabilities.js";
import { EnhancedAutoLing } from "../adapters/EnhancedAutoLing.js";
import { EnhancedDiseminer } from "../adapters/EnhancedDiseminer.js";
import { morphMirAdapter } from "../adapters/MorphMirAdapter.js";
import { bootstrapATO } from "../vendor/ato-core/src/index.mjs";
const ALL_CHANNELS = Object.freeze(CANONICAL_CHANNEL_PAIRS.map(([a, b]) => canonicalChannelId(a, b)));
const channelsForGate = (gate) => Object.freeze(ALL_CHANNELS.filter((id) => id.split("-").map(Number).includes(gate)));
let sequence = 0;
function nodeFor(toolId, output, context) {
  return {
    expressionNodeId: `tool_${toolId}_${context.sessionId}_${++sequence}`,
    sourceChannelIds: [...context.expression.capabilities],
    sourceStateIds: [
      context.inputValues.sourceState?.stateId,
      context.inputValues.targetState?.stateId
    ].filter(Boolean),
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
function wrapATO(tool, toolId = tool.id) {
  const manifest = tool.manifest();
  const gate = Number(manifest?.address?.gate || 0);
  const semanticProvides = tool.id === "computational-grammar-coder" ? [SEMANTIC_INTENT_ANALYSIS] : [];
  const provides = [...new Set([...channelsForGate(gate), ...semanticProvides])];
  return {
    toolId,
    name: toolId,
    provides,
    requires: [],
    accepts(expression) {
      return expression.capabilities.some((cap) => provides.includes(cap));
    },
    async execute(context) {
      try {
        const input = {
          operation: "process",
          text: context.inputValues.intent,
          channel: context.expression.capabilities[0] || null,
          parameters: context.expression.parameters,
          inputValues: context.inputValues,
          sessionId: context.sessionId
        };
        const output = await tool.call(input, { runtimeState: context.runtimeState });
        return success(toolId, output, context);
      } catch (error) {
        return failure(error);
      }
    },
    materialize() {
      return { manifest: tool.manifest(), metadata: { nativeATO: true, wrappedAs: toolId } };
    }
  };
}
function enhancedAutoLingAdapter(engine) {
  const provides = [...new Set([...channelsForGate(17), SEMANTIC_INTENT_ANALYSIS])];
  return {
    toolId: "autoling",
    name: "Enhanced AutoLing",
    provides,
    requires: [],
    accepts(expression) {
      return expression.capabilities.some((cap) => provides.includes(cap));
    },
    async execute(context) {
      try {
        const text = String(context.inputValues.intent || "");
        const pipeline = await engine.runPipeline(text);
        return success("autoling", { pipeline, rules: engine.getRules(), stats: engine.getParserStats() }, context);
      } catch (error) {
        return failure(error);
      }
    },
    materialize() {
      return { metadata: { enhanced: true, family: "AutoLing", provides } };
    }
  };
}
function enhancedDiseminerAdapter(engine) {
  const provides = [...new Set([...channelsForGate(48), SEMANTIC_INTENT_ANALYSIS])];
  return {
    toolId: "diseminer",
    name: "Enhanced DISEMINER",
    provides,
    requires: [],
    accepts(expression) {
      return expression.capabilities.some((cap) => provides.includes(cap));
    },
    async execute(context) {
      try {
        const text = String(context.inputValues.intent || "");
        const sense = engine.observe(text);
        const claims = await engine.extractClaims(text, context.sessionId);
        return success("diseminer", { sense, claims }, context);
      } catch (error) {
        return failure(error);
      }
    },
    materialize() {
      return { metadata: { enhanced: true, family: "DISEMINER", provides } };
    }
  };
}
function installSynthiaToolStack(runtime) {
  const ato = bootstrapATO();
  const adapters = [];
  for (const tool of ato.tools) {
    if (tool.id === "autoling") adapters.push(wrapATO(tool, "autoling-lite"));
    else if (tool.id === "diseminer") adapters.push(wrapATO(tool, "diseminer-lite"));
    else adapters.push(wrapATO(tool));
  }
  const autoling = new EnhancedAutoLing();
  const diseminer = new EnhancedDiseminer();
  adapters.push(enhancedAutoLingAdapter(autoling));
  adapters.push(enhancedDiseminerAdapter(diseminer));
  adapters.push(morphMirAdapter());
  runtime.registerTools(adapters);
  return { ato, autoling, diseminer, adapters };
}
var stdin_default = installSynthiaToolStack;
export {
  SEMANTIC_INTENT_ANALYSIS,
  channelsForGate,
  stdin_default as default,
  installSynthiaToolStack
};
