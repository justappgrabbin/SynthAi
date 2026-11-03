// ============================================================================
// DISEMINER — Resolve implied relationships, analogical operators, inference
// ============================================================================
import { ExplanationStep, WeightedCorrespondence, ProvenanceRecord } from "../models";

export interface InferenceResult {
  inferredRelations: WeightedCorrespondence[];
  trace: ExplanationStep[];
}

export class DiseminerEngine {
  inferMissingRelation(
    knownRelations: WeightedCorrespondence[],
    sourceId: string,
    targetId: string
  ): InferenceResult {
    const trace: ExplanationStep[] = [];
    const inferred: WeightedCorrespondence[] = [];

    // Transitive closure: if A→B and B→C, infer A→C
    const direct = knownRelations.find((r) => r.sourceId === sourceId && r.targetId === targetId);
    if (direct) {
      trace.push({ step: 1, operation: "direct_check", input: `${sourceId}→${targetId}`, output: "found_direct", confidence: direct.confidence });
      return { inferredRelations: [direct], trace };
    }

    const intermediates = knownRelations
      .filter((r) => r.sourceId === sourceId)
      .map((r) => r.targetId);

    for (const mid of intermediates) {
      const midToTarget = knownRelations.find((r) => r.sourceId === mid && r.targetId === targetId);
      if (midToTarget) {
        const inferredRel: WeightedCorrespondence = {
          sourceId,
          targetId,
          relation: `inferred_via_${mid}`,
          context: ["transitive_inference"],
          weight: Math.min(1, midToTarget.weight * 0.7),
          confidence: Math.min(1, midToTarget.confidence * 0.7),
          provenance: [{
            id: `prov-${Date.now()}`, category: "derived_operator", source: "DiseminerEngine",
            description: `Inferred via ${mid}`, timestamp: new Date().toISOString()
          }],
        };
        inferred.push(inferredRel);
        trace.push({ step: trace.length + 1, operation: "transitive_inference", input: `${sourceId}→${mid}→${targetId}`, output: inferredRel.relation, confidence: inferredRel.confidence });
      }
    }

    if (inferred.length === 0) {
      trace.push({ step: 1, operation: "search", input: `${sourceId}→${targetId}`, output: "no_path_found", confidence: 0.1 });
    }

    return { inferredRelations: inferred, trace };
  }
}
