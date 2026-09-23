import type { FieldDiagnosis, HDActivation } from "@shared/schema";
import { diagnoseField } from "./resonance-engine";

export type OverseerAction = "approve" | "deny" | "freeze" | "review";
export type DecisionContext = "build" | "promote" | "deploy" | "agent" | "financial" | "governance";

export interface OverseerDecision {
  id: string;
  action: OverseerAction;
  context: DecisionContext;
  targetId: string;
  targetType: string;
  resonanceScore: number;
  coherenceScore: number;
  approved: boolean;
  reasoning: string[];
  conditions: string[];
  timestamp: Date;
  frozen: boolean;
  appealable: boolean;
}

export interface OverseerRequest {
  context: DecisionContext;
  targetId: string;
  targetType: string;
  bodyActivations?: HDActivation[];
  mindActivations?: HDActivation[];
  heartActivations?: HDActivation[];
  metadata?: Record<string, unknown>;
}

export interface OverseerConfig {
  minResonanceScore: number;
  minCoherenceScore: number;
  strictMode: boolean;
  allowAppeals: boolean;
  freezeOnCriticalFail: boolean;
}

const DEFAULT_CONFIG: OverseerConfig = {
  minResonanceScore: 0.5,
  minCoherenceScore: 70,
  strictMode: true,
  allowAppeals: true,
  freezeOnCriticalFail: true,
};

export class Overseer {
  private config: OverseerConfig;
  private decisionLog: OverseerDecision[] = [];
  private frozenTargets: Set<string> = new Set();

  constructor(config: Partial<OverseerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  evaluate(request: OverseerRequest): OverseerDecision {
    const id = crypto.randomUUID();
    const reasoning: string[] = [];
    const conditions: string[] = [];

    if (this.frozenTargets.has(request.targetId)) {
      return {
        id,
        action: "deny",
        context: request.context,
        targetId: request.targetId,
        targetType: request.targetType,
        resonanceScore: 0,
        coherenceScore: 0,
        approved: false,
        reasoning: ["Target is frozen by previous Overseer decision"],
        conditions: ["Unfreeze required before any action"],
        timestamp: new Date(),
        frozen: true,
        appealable: this.config.allowAppeals,
      };
    }

    const bodyActivations = request.bodyActivations || [];
    const mindActivations = request.mindActivations || [];
    const heartActivations = request.heartActivations || [];

    let diagnosis: FieldDiagnosis;

    if (bodyActivations.length > 0 || mindActivations.length > 0 || heartActivations.length > 0) {
      diagnosis = diagnoseField(bodyActivations, mindActivations, heartActivations);
    } else {
      diagnosis = {
        missingNodes: [],
        chargeImbalance: [],
        chartDisorder: [],
        coherenceScore: 50,
        hdAlignment: 0.3,
        iChingProbability: 0.5,
        frictionFactor: 0.8,
        resonanceScore: 0.1875,
        approved: false,
      };
      reasoning.push("No activation data provided; conservative baseline applied - resonance evaluation required");
    }

    const meetsResonance = diagnosis.resonanceScore >= this.config.minResonanceScore;
    const meetsCoherence = diagnosis.coherenceScore >= this.config.minCoherenceScore;

    if (!meetsResonance) {
      reasoning.push(`Resonance score ${diagnosis.resonanceScore.toFixed(3)} below minimum ${this.config.minResonanceScore}`);
    }
    if (!meetsCoherence) {
      reasoning.push(`Coherence score ${diagnosis.coherenceScore.toFixed(1)} below minimum ${this.config.minCoherenceScore}`);
    }

    if (diagnosis.missingNodes.length > 0) {
      reasoning.push(`${diagnosis.missingNodes.length} missing harmonic node(s) detected`);
      conditions.push("Restore harmonic channel connections");
    }
    if (diagnosis.chargeImbalance.length > 0) {
      reasoning.push(`${diagnosis.chargeImbalance.length} charge imbalance(s) detected`);
      conditions.push("Balance resonance between layer pairs");
    }
    if (diagnosis.chartDisorder.length > 0) {
      reasoning.push(`${diagnosis.chartDisorder.length} chart disorder(s) detected`);
      conditions.push("Reduce positional variance across charts");
    }

    let action: OverseerAction;
    let approved: boolean;
    let frozen = false;

    const criticalFail = diagnosis.coherenceScore < 30 || diagnosis.resonanceScore < 0.1;

    if (criticalFail && this.config.freezeOnCriticalFail) {
      action = "freeze";
      approved = false;
      frozen = true;
      this.frozenTargets.add(request.targetId);
      reasoning.push("Critical failure detected - target frozen for safety");
    } else if (meetsResonance && meetsCoherence && diagnosis.approved) {
      action = "approve";
      approved = true;
      reasoning.push("All governance thresholds met");
    } else if (this.config.strictMode) {
      action = "deny";
      approved = false;
      reasoning.push("Strict mode: denying due to threshold violations");
    } else {
      action = "review";
      approved = false;
      reasoning.push("Manual review required for marginal case");
    }

    this.applyContextRules(request.context, reasoning, conditions);

    const decision: OverseerDecision = {
      id,
      action,
      context: request.context,
      targetId: request.targetId,
      targetType: request.targetType,
      resonanceScore: diagnosis.resonanceScore,
      coherenceScore: diagnosis.coherenceScore,
      approved,
      reasoning,
      conditions,
      timestamp: new Date(),
      frozen,
      appealable: this.config.allowAppeals && !frozen,
    };

    this.decisionLog.push(decision);
    return decision;
  }

  private applyContextRules(context: DecisionContext, reasoning: string[], conditions: string[]) {
    switch (context) {
      case "deploy":
        conditions.push("Production quality attestation required");
        conditions.push("All dependencies must be production-grade");
        break;
      case "financial":
        conditions.push("Financial stability check required");
        conditions.push("Risk assessment must pass threshold");
        break;
      case "agent":
        conditions.push("Agent must be bound to Resonance Engine");
        conditions.push("Economy integration required");
        break;
      case "governance":
        reasoning.push("Governance decision requires elevated scrutiny");
        break;
    }
  }

  unfreeze(targetId: string, overrideReason: string): boolean {
    if (this.frozenTargets.has(targetId)) {
      this.frozenTargets.delete(targetId);
      this.decisionLog.push({
        id: crypto.randomUUID(),
        action: "approve",
        context: "governance",
        targetId,
        targetType: "unfreeze",
        resonanceScore: 0,
        coherenceScore: 0,
        approved: true,
        reasoning: [`Unfrozen by override: ${overrideReason}`],
        conditions: [],
        timestamp: new Date(),
        frozen: false,
        appealable: false,
      });
      return true;
    }
    return false;
  }

  isFrozen(targetId: string): boolean {
    return this.frozenTargets.has(targetId);
  }

  getDecisionLog(): OverseerDecision[] {
    return [...this.decisionLog];
  }

  getRecentDecisions(limit: number = 50): OverseerDecision[] {
    return this.decisionLog.slice(-limit);
  }

  getConfig(): OverseerConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OverseerConfig>) {
    this.config = { ...this.config, ...updates };
  }
}

export const overseer = new Overseer();
