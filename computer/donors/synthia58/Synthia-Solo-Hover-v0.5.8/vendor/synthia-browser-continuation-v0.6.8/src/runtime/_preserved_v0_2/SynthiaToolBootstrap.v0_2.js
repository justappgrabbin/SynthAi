import { EnhancedAutoLing } from "../adapters/EnhancedAutoLing";
import { EnhancedDiseminer } from "../adapters/EnhancedDiseminer";
import { bootstrapATO } from "../vendor/ato-core/src/index.mjs";
const CHANNEL_PAIRS = Object.freeze([
  [1, 8],
  [2, 14],
  [3, 60],
  [4, 63],
  [5, 15],
  [6, 59],
  [7, 31],
  [9, 52],
  [10, 20],
  [11, 56],
  [12, 22],
  [13, 33],
  [16, 48],
  [17, 62],
  [18, 58],
  [19, 49],
  [21, 45],
  [23, 43],
  [24, 61],
  [25, 51],
  [26, 44],
  [27, 50],
  [28, 38],
  [29, 30],
  [32, 54],
  [34, 57],
  [35, 36],
  [37, 40],
  [39, 55],
  [30, 41],
  [42, 53],
  [29, 46],
  [47, 64],
  [48, 16],
  [49, 19],
  [50, 27]
]);
const canonicalChannel = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
const ALL_CHANNELS = Object.freeze([...new Set(CHANNEL_PAIRS.map(([a, b]) => canonicalChannel(a, b)))]);
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
  const provides = [...channelsForGate(gate)];
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
    }
  };
}
function enhancedAutoLingAdapter(engine) {
  const provides = [...channelsForGate(17)];
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
    }
  };
}
function enhancedDiseminerAdapter(engine) {
  const provides = [...channelsForGate(48)];
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
  runtime.registerTools(adapters);
  return { ato, autoling, diseminer, adapters };
}
var stdin_default = installSynthiaToolStack;
export {
  channelsForGate,
  stdin_default as default,
  installSynthiaToolStack
};
