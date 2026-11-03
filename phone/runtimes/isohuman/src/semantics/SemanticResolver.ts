// ============================================================================
// Semantic Resolver — Resolve meaning from structure
// ============================================================================
import { CorrelativeNode, SemanticItem, SemanticField, ExplanationStep } from "../models";
import { SemanticAttractor } from "./SemanticAttractor";
import { MeaningScorer } from "./MeaningScorer";

export class SemanticResolver {
  private attractor = new SemanticAttractor();

  constructor(private scorer: MeaningScorer) {}

  resolve(node: CorrelativeNode): { field: SemanticField; trace: ExplanationStep[] } {
    const trace: ExplanationStep[] = [];
    const field = { ...node.semanticField };

    const allItems = [...field.center, ...field.central, ...field.peripheral, ...field.rejected];
    for (const item of allItems) {
      item.structuralSupport = this.scorer.computeSupport(node, item);
      item.confidence = item.structuralSupport.totalScore;
    }

    trace.push({ step: 1, operation: "compute_structural_support", input: allItems.length, output: "scores computed", confidence: 1 });

    const updated = this.attractor.updateField(field);
    trace.push({ step: 2, operation: "update_field", input: field.coherenceScore, output: updated.coherenceScore, confidence: updated.coherenceScore });

    return { field: updated, trace };
  }

  getPrimaryMeaning(node: CorrelativeNode): string[] {
    const meanings: string[] = [];
    for (const item of node.semanticField.center) meanings.push(item.term);
    for (const item of node.semanticField.central) meanings.push(item.term);
    return meanings;
  }
}
