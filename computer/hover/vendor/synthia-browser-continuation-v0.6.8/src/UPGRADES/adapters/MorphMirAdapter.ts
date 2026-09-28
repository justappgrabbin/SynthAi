// Adapter for the Morph MIR regeneration engine (Ingest -> Analyze -> Regenerate).
// Wraps MorphMemoryEngine as a KleinToolAdapter, following the same pattern
// used for Enhanced AutoLing / Enhanced DISEMINER.
import type {
  KleinToolAdapter, ToolExecutionContext, ToolExecutionResult, ExpressionNode, ProvenanceRecord
} from '../../runtime/foundations';
import { MorphMemoryEngine } from '../vendor/morph-mir-system/lib/morphMemoryEngine';
import type { Artifact } from '../vendor/morph-mir-system/types';

let sequence = 0;
function nodeFor(toolId: string, output: unknown, context: ToolExecutionContext): ExpressionNode {
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

function success(toolId: string, output: unknown, context: ToolExecutionContext): ToolExecutionResult {
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

function failure(error: unknown): ToolExecutionResult {
  return { success: false, outputValues: { error: error instanceof Error ? error.message : String(error) }, expressionNodes: [], provenance: [] };
}

/**
 * One shared engine instance so memory (GNN nodes) accumulates across calls,
 * exactly like MorphMemoryEngine is designed to be used.
 */
export function morphMirAdapter(engine: MorphMemoryEngine = new MorphMemoryEngine()): KleinToolAdapter {
  const provides = ['ingest', 'analyze', 'remember', 'regenerate'];
  return {
    toolId: 'morph-mir',
    name: 'Morph MIR Regeneration Engine',
    provides,
    requires: [],
    accepts(expression) {
      return expression.capabilities.some(cap => provides.includes(cap));
    },
    async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
      try {
        const name = String(context.inputValues.name || 'artifact');
        const content = String(context.inputValues.content || '');
        const mode = (context.inputValues.mode as any) || 'morph_runtime';

        // INGEST
        const artifact: Artifact = {
          id: `art_${context.sessionId}`,
          originalName: name,
          originalContent: content,
          metadata: { fileType: name.split('.').pop() || 'unknown', size: content.length, uploadedAt: new Date().toISOString(), status: 'uploaded' }
        };

        // ANALYZE
        const analyzed = await engine.analyzeArtifact(artifact);

        // REMEMBER
        await engine.rememberArtifact(analyzed);

        // REGENERATE
        const regenerated = await engine.regenerateArtifact(analyzed, undefined, mode);

        return success('morph-mir', {
          understanding: analyzed.understanding,
          regeneration: regenerated.regenerationResult
        }, context);
      } catch (error) {
        return failure(error);
      }
    }
  };
}

export default morphMirAdapter;
