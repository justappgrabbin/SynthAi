import type {
  KleinToolAdapter, ChannelExpression, ToolExecutionContext,
  ToolExecutionResult, ExpressionNode, ProvenanceRecord
} from '../../runtime/foundations';
import type { GraphRuntime } from '../../runtime/GraphRuntime';
import { EnhancedAutoLing } from '../adapters/EnhancedAutoLing';
import { EnhancedDiseminer } from '../adapters/EnhancedDiseminer';
import { MorphMemoryEngine } from '../vendor/morph-mir-system/lib/morphMemoryEngine';
import { morphMirAdapter } from '../adapters/MorphMirAdapter';

// Runtime JS vendors are preserved as their original ESM packages.
// @ts-ignore
import { bootstrapATO } from '../vendor/ato-core/src/index.mjs';

const CHANNEL_PAIRS: ReadonlyArray<readonly [number, number]> = Object.freeze([
  [1,8],[2,14],[3,60],[4,63],[5,15],[6,59],[7,31],[9,52],[10,20],[11,56],[12,22],[13,33],
  [16,48],[17,62],[18,58],[19,49],[21,45],[23,43],[24,61],[25,51],[26,44],[27,50],[28,38],[29,30],
  [32,54],[34,57],[35,36],[37,40],[39,55],[30,41],[42,53],[29,46],[47,64],[48,16],[49,19],[50,27]
]);

const canonicalChannel = (a:number,b:number) => `${Math.min(a,b)}-${Math.max(a,b)}`;
const ALL_CHANNELS = Object.freeze([...new Set(CHANNEL_PAIRS.map(([a,b]) => canonicalChannel(a,b)))]);
export const channelsForGate = (gate:number) => Object.freeze(ALL_CHANNELS.filter(id => id.split('-').map(Number).includes(gate)));

let sequence = 0;
function nodeFor(toolId:string, output:unknown, context:ToolExecutionContext): ExpressionNode {
  return {
    expressionNodeId: `tool_${toolId}_${context.sessionId}_${++sequence}`,
    sourceChannelIds: [...context.expression.capabilities],
    sourceStateIds: [
      (context.inputValues.sourceState as any)?.stateId,
      (context.inputValues.targetState as any)?.stateId
    ].filter(Boolean),
    sourceToolIds: [toolId],
    capabilities: [...context.expression.capabilities],
    inputs: [],
    outputs: [],
    configuration: { output }
  };
}

function success(toolId:string, output:unknown, context:ToolExecutionContext): ToolExecutionResult {
  const node = nodeFor(toolId, output, context);
  const provenance: ProvenanceRecord = {
    recordId: `prov_${toolId}_${context.sessionId}_${sequence}`,
    timestamp: Date.now(),
    sourceType: 'TOOL',
    sourceId: toolId,
    description: `Executed ${toolId}`,
    resultingNodeIds: [node.expressionNodeId]
  };
  return { success: true, outputValues: { output }, expressionNodes: [node], provenance: [provenance] };
}

function failure(error:unknown): ToolExecutionResult {
  return { success:false, outputValues:{ error:error instanceof Error?error.message:String(error) }, expressionNodes:[], provenance:[] };
}

function wrapATO(tool:any, toolId = tool.id): KleinToolAdapter {
  const manifest = tool.manifest();
  const gate = Number(manifest?.address?.gate || 0);
  const provides = [...channelsForGate(gate)];
  return {
    toolId,
    name: toolId,
    provides,
    requires: [],
    accepts(expression:ChannelExpression) { return expression.capabilities.some(cap => provides.includes(cap)); },
    async execute(context:ToolExecutionContext) {
      try {
        const input = {
          operation: 'process',
          text: context.inputValues.intent,
          channel: context.expression.capabilities[0] || null,
          parameters: context.expression.parameters,
          inputValues: context.inputValues,
          sessionId: context.sessionId
        };
        const output = await tool.call(input, { runtimeState: context.runtimeState });
        return success(toolId, output, context);
      } catch (error) { return failure(error); }
    }
  };
}

function enhancedAutoLingAdapter(engine:EnhancedAutoLing): KleinToolAdapter {
  const provides = [...channelsForGate(17)]; // preserves the existing AutoLing gate address
  return {
    toolId:'autoling', name:'Enhanced AutoLing', provides, requires:[],
    accepts(expression){ return expression.capabilities.some(cap => provides.includes(cap)); },
    async execute(context){
      try {
        const text = String(context.inputValues.intent || '');
        const pipeline = await engine.runPipeline(text);
        return success('autoling', { pipeline, rules:engine.getRules(), stats:engine.getParserStats() }, context);
      } catch(error){ return failure(error); }
    }
  };
}

function enhancedDiseminerAdapter(engine:EnhancedDiseminer): KleinToolAdapter {
  const provides = [...channelsForGate(48)]; // preserves the existing DISEMINER gate address
  return {
    toolId:'diseminer', name:'Enhanced DISEMINER', provides, requires:[],
    accepts(expression){ return expression.capabilities.some(cap => provides.includes(cap)); },
    async execute(context){
      try {
        const text = String(context.inputValues.intent || '');
        const sense = engine.observe(text);
        const claims = await engine.extractClaims(text, context.sessionId);
        return success('diseminer', { sense, claims }, context);
      } catch(error){ return failure(error); }
    }
  };
}

export interface InstalledSynthiaToolStack {
  ato: any;
  autoling: EnhancedAutoLing;
  diseminer: EnhancedDiseminer;
  morphMir: MorphMemoryEngine;
  adapters: KleinToolAdapter[];
}

/**
 * Progressive substitution:
 * - all existing ATO tools remain in the stack;
 * - thin AutoLing/DISEMINER are retained as *-lite adapters;
 * - enhanced implementations occupy the active canonical ids.
 */
export function installSynthiaToolStack(runtime:GraphRuntime): InstalledSynthiaToolStack {
  const ato = bootstrapATO();
  const adapters: KleinToolAdapter[] = [];

  for (const tool of ato.tools) {
    if (tool.id === 'autoling') adapters.push(wrapATO(tool, 'autoling-lite'));
    else if (tool.id === 'diseminer') adapters.push(wrapATO(tool, 'diseminer-lite'));
    else adapters.push(wrapATO(tool));
  }

  const autoling = new EnhancedAutoLing();
  const diseminer = new EnhancedDiseminer();
  const morphMir = new MorphMemoryEngine();
  adapters.push(enhancedAutoLingAdapter(autoling));
  adapters.push(enhancedDiseminerAdapter(diseminer));
  adapters.push(morphMirAdapter(morphMir));

  runtime.registerTools(adapters);
  return { ato, autoling, diseminer, morphMir, adapters };
}

export default installSynthiaToolStack;
