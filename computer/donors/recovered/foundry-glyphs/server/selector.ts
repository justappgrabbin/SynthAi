import type { Glyph, HDActivation } from "@shared/schema";
import { overseer, type OverseerDecision } from "./overseer";
import { diagnoseField, calculateHDAlignment, calculateResonanceScore } from "./resonance-engine";

export interface SelectionCandidate {
  id: string;
  name: string;
  type: string;
  quality: string;
  weight: number;
  resonanceAffinity: number;
  metadata?: Record<string, unknown>;
}

export interface SelectionRequest {
  purpose: string;
  requiredType?: string;
  requiredQuality?: string;
  targetGates?: number[];
  bodyActivations?: HDActivation[];
  mindActivations?: HDActivation[];
  heartActivations?: HDActivation[];
  maxCandidates?: number;
}

export interface SelectionResult {
  selected: SelectionCandidate | null;
  alternatives: SelectionCandidate[];
  confidence: number;
  reasoning: string[];
  overseerDecision: OverseerDecision;
  timestamp: Date;
}

export class Selector {
  private candidates: SelectionCandidate[] = [];

  addCandidate(candidate: SelectionCandidate) {
    this.candidates.push(candidate);
  }

  addCandidatesFromGlyphs(glyphs: Glyph[]) {
    glyphs.forEach((glyph) => {
      const qualityWeight = glyph.quality === "production" ? 1.0 :
                           glyph.quality === "tested" ? 0.7 : 0.4;

      this.candidates.push({
        id: glyph.id,
        name: glyph.name,
        type: glyph.type,
        quality: glyph.quality,
        weight: qualityWeight,
        resonanceAffinity: Math.random() * 0.5 + 0.5,
        metadata: {
          sizeBytes: glyph.sizeBytes,
          language: glyph.language,
          kind: glyph.kind,
        },
      });
    });
  }

  clearCandidates() {
    this.candidates = [];
  }

  select(request: SelectionRequest): SelectionResult {
    const reasoning: string[] = [];
    let filtered = [...this.candidates];

    if (request.requiredType) {
      filtered = filtered.filter((c) => c.type === request.requiredType);
      reasoning.push(`Filtered to type: ${request.requiredType}`);
    }

    if (request.requiredQuality) {
      const qualityOrder = ["draft", "tested", "production"];
      const minQualityIdx = qualityOrder.indexOf(request.requiredQuality);
      filtered = filtered.filter((c) => qualityOrder.indexOf(c.quality) >= minQualityIdx);
      reasoning.push(`Filtered to minimum quality: ${request.requiredQuality}`);
    }

    if (filtered.length === 0) {
      const decision = overseer.evaluate({
        context: "build",
        targetId: "selection-empty",
        targetType: "selector",
      });

      return {
        selected: null,
        alternatives: [],
        confidence: 0,
        reasoning: [...reasoning, "No candidates match criteria"],
        overseerDecision: decision,
        timestamp: new Date(),
      };
    }

    const bodyActivations = request.bodyActivations || [];
    const mindActivations = request.mindActivations || [];
    const heartActivations = request.heartActivations || [];

    const scored = filtered.map((candidate) => {
      let score = candidate.weight;

      if (bodyActivations.length > 0 || mindActivations.length > 0 || heartActivations.length > 0) {
        const allActivations = [...bodyActivations, ...mindActivations, ...heartActivations];
        const hdAlignment = calculateHDAlignment(allActivations, request.targetGates);
        score *= (1 + hdAlignment);
      }

      score *= candidate.resonanceAffinity;

      return { candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const topCandidate = scored[0]?.candidate || null;
    const alternatives = scored.slice(1, (request.maxCandidates || 5)).map((s) => s.candidate);

    const maxScore = scored[0]?.score || 0;
    const confidence = maxScore > 0 ? Math.min(1, maxScore / 2) : 0;

    const decision = overseer.evaluate({
      context: "build",
      targetId: topCandidate?.id || "none",
      targetType: topCandidate?.type || "unknown",
      bodyActivations,
      mindActivations,
      heartActivations,
    });

    reasoning.push(`Selected ${topCandidate?.name || "none"} with confidence ${(confidence * 100).toFixed(1)}%`);
    reasoning.push(`Overseer ${decision.action}: ${decision.reasoning.join(", ")}`);

    return {
      selected: decision.approved ? topCandidate : null,
      alternatives,
      confidence,
      reasoning,
      overseerDecision: decision,
      timestamp: new Date(),
    };
  }

  getWeightedRandom(request: SelectionRequest): SelectionCandidate | null {
    let filtered = [...this.candidates];

    if (request.requiredType) {
      filtered = filtered.filter((c) => c.type === request.requiredType);
    }
    if (request.requiredQuality) {
      const qualityOrder = ["draft", "tested", "production"];
      const minQualityIdx = qualityOrder.indexOf(request.requiredQuality);
      filtered = filtered.filter((c) => qualityOrder.indexOf(c.quality) >= minQualityIdx);
    }

    if (filtered.length === 0) return null;

    const totalWeight = filtered.reduce((sum, c) => sum + c.weight * c.resonanceAffinity, 0);
    let random = Math.random() * totalWeight;

    for (const candidate of filtered) {
      random -= candidate.weight * candidate.resonanceAffinity;
      if (random <= 0) return candidate;
    }

    return filtered[filtered.length - 1];
  }

  getCandidates(): SelectionCandidate[] {
    return [...this.candidates];
  }
}

export const selector = new Selector();
