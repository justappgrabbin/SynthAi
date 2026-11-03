// ============================================================================
// Meaning Expander — Gather new associations
// ============================================================================
import { SemanticItem, SemanticField, CorrelativeNode, Observation } from "../models";
import { MeaningScorer } from "./MeaningScorer";

export class MeaningExpander {
  constructor(private scorer: MeaningScorer) {}

  proposeCandidate(
    node: CorrelativeNode,
    term: string,
    context: string,
    sourceId: string
  ): SemanticItem {
    const candidate: SemanticItem = {
      id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      term,
      description: `Proposed meaning for ${node.id}: ${term}`,
      weight: 0.5,
      confidence: 0.5,
      status: "candidate",
      contexts: [context],
      sourceIds: [sourceId],
      structuralSupport: {
        addressSupport: 0,
        neighborSupport: 0,
        contrastSupport: 0,
        transitionSupport: 0,
        historicalSupport: 0,
        observationalSupport: 0,
        totalScore: 0,
      },
    };
    candidate.structuralSupport = this.scorer.computeSupport(node, candidate);
    candidate.confidence = candidate.structuralSupport.totalScore;
    return candidate;
  }

  expandFromObservation(node: CorrelativeNode, obs: Observation): SemanticItem[] {
    const terms = this.extractTerms(obs.content);
    return terms.map((t) => this.proposeCandidate(node, t, obs.context, obs.id));
  }

  private extractTerms(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 5);
  }
}
