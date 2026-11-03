// ============================================================================
// Reciprocal Path Resolver — Detect A→B and B→A pairs
// ============================================================================
import { CorrelativeTransition } from "../models";
import { StateGraph } from "./StateGraph";

export interface ReciprocalPair {
  forward: CorrelativeTransition;
  reverse: CorrelativeTransition;
  sharedVocabulary: string[];
  mirroredConcepts: string[];
  structuralSimilarity: number;
}

export class ReciprocalPathResolver {
  constructor(private graph: StateGraph) {}

  findReciprocal(forward: CorrelativeTransition): CorrelativeTransition | null {
    const candidates = this.graph.getOutgoingTransitions(forward.resultantNodeId);
    for (const t of candidates) {
      if (t.resultantNodeId === forward.rootNodeId) {
        return t;
      }
    }
    return null;
  }

  analyzePair(forward: CorrelativeTransition): ReciprocalPair | null {
    const reverse = this.findReciprocal(forward);
    if (!reverse) return null;

    const fwInterp = forward.semanticInterpretation;
    const rvInterp = reverse.semanticInterpretation;

    const sharedVocab: string[] = [];
    const mirrored: string[] = [];

    if (fwInterp && rvInterp) {
      const fwTerms = new Set([
        ...fwInterp.rootMeaning,
        ...fwInterp.resultantMeaning,
      ]);
      const rvTerms = new Set([
        ...rvInterp.rootMeaning,
        ...rvInterp.resultantMeaning,
      ]);
      for (const term of fwTerms) {
        if (rvTerms.has(term)) sharedVocab.push(term);
      }
    }

    const structSim = this.structuralSimilarity(forward, reverse);

    return {
      forward,
      reverse,
      sharedVocabulary: sharedVocab,
      mirroredConcepts: mirrored,
      structuralSimilarity: structSim,
    };
  }

  private structuralSimilarity(a: CorrelativeTransition, b: CorrelativeTransition): number {
    const aSet = new Set(a.changedDimensions);
    const bSet = new Set(b.changedDimensions);
    let common = 0;
    for (const d of aSet) if (bSet.has(d)) common++;
    const total = new Set([...a.changedDimensions, ...b.changedDimensions]).size;
    return total === 0 ? 0 : common / total;
  }

  getAllReciprocalPairs(nodeId: string): ReciprocalPair[] {
    const outgoing = this.graph.getOutgoingTransitions(nodeId);
    const pairs: ReciprocalPair[] = [];
    for (const t of outgoing) {
      const pair = this.analyzePair(t);
      if (pair) pairs.push(pair);
    }
    return pairs;
  }
}
