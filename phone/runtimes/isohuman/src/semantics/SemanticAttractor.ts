// ============================================================================
// Semantic Attractor — Node as a center of semantic gravity
// ============================================================================
import {
  SemanticItem, SemanticField, StructuralSupport, ExplanationStep, CorrelativeNode
} from "../models";

export class SemanticAttractor {
  private weights = {
    addressSupport: 0.20,
    neighborSupport: 0.15,
    contrastSupport: 0.15,
    transitionSupport: 0.20,
    historicalSupport: 0.10,
    observationalSupport: 0.20,
  };

  setWeights(w: Partial<typeof this.weights>): void {
    this.weights = { ...this.weights, ...w };
  }

  scoreItem(item: SemanticItem): number {
    const s = item.structuralSupport;
    return (
      s.addressSupport * this.weights.addressSupport +
      s.neighborSupport * this.weights.neighborSupport +
      s.contrastSupport * this.weights.contrastSupport +
      s.transitionSupport * this.weights.transitionSupport +
      s.historicalSupport * this.weights.historicalSupport +
      s.observationalSupport * this.weights.observationalSupport
    );
  }

  classify(score: number): SemanticItem["status"] {
    if (score >= 0.80) return "central";
    if (score >= 0.60) return "supporting";
    if (score >= 0.40) return "peripheral";
    return "rejected";
  }

  computeCentroid(field: SemanticField): number[] | undefined {
    const all = [...field.center, ...field.central, ...field.peripheral];
    if (all.length === 0) return undefined;
    const dim = 8;
    const vec = new Array(dim).fill(0);
    let totalWeight = 0;
    for (const item of all) {
      const hash = this.hashString(item.term);
      for (let i = 0; i < dim; i++) {
        vec[i] += hash[i] * item.weight;
      }
      totalWeight += item.weight;
    }
    if (totalWeight === 0) return undefined;
    return vec.map((v) => v / totalWeight);
  }

  private hashString(s: string): number[] {
    const dim = 8;
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < s.length; i++) {
      vec[i % dim] += s.charCodeAt(i) / 1000;
    }
    return vec;
  }

  updateField(field: SemanticField): SemanticField {
    for (const item of [...field.center, ...field.central, ...field.peripheral, ...field.rejected]) {
      const score = this.scoreItem(item);
      item.confidence = score;
      item.status = this.classify(score);
    }
    field.centroid = this.computeCentroid(field);
    const totalItems = field.center.length + field.central.length + field.peripheral.length + field.rejected.length;
    field.coherenceScore = totalItems > 0
      ? (field.center.length * 1.0 + field.central.length * 0.7 + field.peripheral.length * 0.4) / totalItems
      : 0;
    return field;
  }
}
