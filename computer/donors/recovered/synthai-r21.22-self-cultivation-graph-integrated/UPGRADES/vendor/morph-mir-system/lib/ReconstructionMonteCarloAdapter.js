import { MonteCarloGrammarEngine } from "../../../../organs/legacy/monte-carlo-grammar-engine.js";

/**
 * Reuses Synthia's existing MonteCarloGrammarEngine as the weighted stochastic
 * selector for reconstruction hypotheses.
 */
class ReconstructionMonteCarloAdapter {
  constructor({ temperature = 1, samples = 64 } = {}) {
    this.temperature = temperature;
    this.samples = samples;
    this.engine = new MonteCarloGrammarEngine({
      target: {
        formal: 0.7,
        poetic: 0.05,
        terse: 0.45,
        elaborate: 0.4,
        archaic: 0,
        technical: 1
      },
      tolerance: 1
    });
    this.engine.setTemperature(temperature);
  }

  search(candidates, verifier, sourceAnalysis, relationshipContext = {}) {
    if (!candidates.length) {
      throw new Error("Reconstruction search requires at least one candidate.");
    }

    const evaluated = candidates.map((candidate) => {
      const verification = verifier.evaluate(candidate, sourceAnalysis, relationshipContext);
      return { ...candidate, verification };
    });

    const rules = evaluated.map((candidate, index) => ({
      id: candidate.id,
      lhs: "RECONSTRUCTION",
      rhs: [candidate.id],
      probability: Math.max(0.0001, candidate.verification.score),
      styleMask: this.metricsToStyleMask(candidate.verification.metrics),
      features: { candidateIndex: index }
    }));

    const hits = new Map(evaluated.map((candidate) => [candidate.id, 0]));
    const trace = [];
    const sampleCount = Math.max(this.samples, evaluated.length * 8);

    for (let index = 0; index < sampleCount; index += 1) {
      const selected = this.engine.sampleRule(rules);
      hits.set(selected.id, (hits.get(selected.id) || 0) + 1);
      if (trace.length < 24) trace.push(selected.id);
    }

    const ranked = evaluated
      .map((candidate) => ({
        ...candidate,
        monteCarloHits: hits.get(candidate.id) || 0,
        monteCarloFrequency: (hits.get(candidate.id) || 0) / sampleCount
      }))
      .sort((left, right) => {
        if (right.verification.score !== left.verification.score) {
          return right.verification.score - left.verification.score;
        }
        return right.monteCarloHits - left.monteCarloHits;
      });

    return {
      winner: ranked[0],
      ranked,
      trace,
      engine: {
        name: "MonteCarloGrammarEngine",
        reused: true,
        temperature: this.temperature,
        samples: sampleCount
      }
    };
  }

  metricsToStyleMask(metrics) {
    return {
      formal: metrics.apiCoverage,
      poetic: 0,
      terse: metrics.syntax,
      elaborate: metrics.relationshipCoverage,
      archaic: 0,
      technical: (
        metrics.behaviorCoverage +
        metrics.dependencyPurity +
        metrics.syntax +
        metrics.intentCoverage
      ) / 4
    };
  }
}

export { ReconstructionMonteCarloAdapter };
