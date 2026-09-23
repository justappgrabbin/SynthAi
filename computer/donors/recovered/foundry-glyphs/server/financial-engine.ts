import { overseer, type OverseerDecision } from "./overseer";
import type { HDActivation } from "@shared/schema";
import { diagnoseField } from "./resonance-engine";

export interface FinancialState {
  balance: number;
  dailyTarget: number;
  currentDaily: number;
  riskExposure: number;
  stabilityScore: number;
  lastUpdated: Date;
}

export interface RevenueOpportunity {
  id: string;
  name: string;
  type: "gig" | "affiliate" | "product" | "service" | "investment";
  estimatedRevenue: number;
  riskLevel: number;
  resonanceAffinity: number;
  timeToRealization: number;
  requirements: string[];
}

export interface FinancialDecision {
  id: string;
  action: "invest" | "divest" | "hold" | "pursue" | "avoid";
  target: string;
  amount: number;
  reasoning: string[];
  ethicalFlags: string[];
  approved: boolean;
  overseerDecision: OverseerDecision;
  timestamp: Date;
}

export interface EthicalConstraint {
  name: string;
  description: string;
  check: (opportunity: RevenueOpportunity) => boolean;
}

export class FinancialEngine {
  private state: FinancialState;
  private opportunities: RevenueOpportunity[] = [];
  private decisions: FinancialDecision[] = [];
  private constraints: EthicalConstraint[] = [];

  constructor() {
    this.state = {
      balance: 0,
      dailyTarget: 100,
      currentDaily: 0,
      riskExposure: 0,
      stabilityScore: 1.0,
      lastUpdated: new Date(),
    };

    this.initializeEthicalConstraints();
  }

  private initializeEthicalConstraints() {
    this.constraints = [
      {
        name: "no-exploitation",
        description: "Reject opportunities that exploit vulnerable populations",
        check: (opp) => !opp.name.toLowerCase().includes("exploit"),
      },
      {
        name: "sustainable-risk",
        description: "Risk level must not exceed 0.7",
        check: (opp) => opp.riskLevel <= 0.7,
      },
      {
        name: "positive-resonance",
        description: "Must have positive resonance affinity",
        check: (opp) => opp.resonanceAffinity > 0.3,
      },
      {
        name: "realistic-timeline",
        description: "Time to realization must be reasonable",
        check: (opp) => opp.timeToRealization <= 90,
      },
    ];
  }

  addOpportunity(opportunity: RevenueOpportunity) {
    this.opportunities.push(opportunity);
  }

  evaluateOpportunity(
    opportunity: RevenueOpportunity,
    bodyActivations?: HDActivation[],
    mindActivations?: HDActivation[],
    heartActivations?: HDActivation[]
  ): FinancialDecision {
    const decisionId = crypto.randomUUID();
    const reasoning: string[] = [];
    const ethicalFlags: string[] = [];

    for (const constraint of this.constraints) {
      if (!constraint.check(opportunity)) {
        ethicalFlags.push(`Failed: ${constraint.name} - ${constraint.description}`);
      }
    }

    let resonanceBonus = 0;
    if (bodyActivations || mindActivations || heartActivations) {
      const diagnosis = diagnoseField(
        bodyActivations || [],
        mindActivations || [],
        heartActivations || []
      );
      resonanceBonus = diagnosis.resonanceScore * 0.2;
      reasoning.push(`Resonance alignment bonus: ${(resonanceBonus * 100).toFixed(1)}%`);
    }

    const expectedValue = opportunity.estimatedRevenue * (1 - opportunity.riskLevel);
    const adjustedValue = expectedValue * (1 + resonanceBonus);

    reasoning.push(`Base expected value: $${expectedValue.toFixed(2)}`);
    reasoning.push(`Adjusted for resonance: $${adjustedValue.toFixed(2)}`);
    reasoning.push(`Risk level: ${(opportunity.riskLevel * 100).toFixed(1)}%`);

    const overseerDecision = overseer.evaluate({
      context: "financial",
      targetId: opportunity.id,
      targetType: opportunity.type,
      bodyActivations,
      mindActivations,
      heartActivations,
      metadata: {
        estimatedRevenue: opportunity.estimatedRevenue,
        riskLevel: opportunity.riskLevel,
        ethicalFlags: ethicalFlags.length,
      },
    });

    let action: FinancialDecision["action"];
    let approved = false;

    if (ethicalFlags.length > 0) {
      action = "avoid";
      reasoning.push("Ethical constraints violated");
    } else if (!overseerDecision.approved) {
      action = "avoid";
      reasoning.push("Overseer denied: " + overseerDecision.reasoning.join("; "));
    } else if (adjustedValue < this.state.dailyTarget * 0.1) {
      action = "hold";
      reasoning.push("Value below threshold; hold for better opportunity");
    } else if (opportunity.riskLevel > 0.5) {
      action = "hold";
      reasoning.push("High risk; recommend caution");
    } else {
      action = "pursue";
      approved = true;
      reasoning.push("Opportunity approved for pursuit");
    }

    const decision: FinancialDecision = {
      id: decisionId,
      action,
      target: opportunity.name,
      amount: adjustedValue,
      reasoning,
      ethicalFlags,
      approved,
      overseerDecision,
      timestamp: new Date(),
    };

    this.decisions.push(decision);
    return decision;
  }

  updateState(updates: Partial<FinancialState>) {
    this.state = { ...this.state, ...updates, lastUpdated: new Date() };
  }

  calculateStabilityScore(): number {
    const balanceScore = Math.min(1, this.state.balance / (this.state.dailyTarget * 30));
    const dailyProgress = this.state.currentDaily / this.state.dailyTarget;
    const riskPenalty = this.state.riskExposure * 0.5;

    return Math.max(0, Math.min(1, (balanceScore + dailyProgress) / 2 - riskPenalty));
  }

  suggestRevenuePaths(): RevenueOpportunity[] {
    const eligible = this.opportunities.filter((opp) => {
      const passes = this.constraints.every((c) => c.check(opp));
      return passes && opp.resonanceAffinity > 0.5;
    });

    return eligible
      .sort((a, b) => {
        const scoreA = (a.estimatedRevenue * (1 - a.riskLevel)) * a.resonanceAffinity;
        const scoreB = (b.estimatedRevenue * (1 - b.riskLevel)) * b.resonanceAffinity;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }

  getProjectedTimeline(targetAmount: number): { days: number; confidence: number } {
    const avgDaily = this.state.currentDaily || this.state.dailyTarget * 0.5;
    const daysToTarget = targetAmount / avgDaily;
    const confidence = this.state.stabilityScore * (1 - this.state.riskExposure);

    return {
      days: Math.ceil(daysToTarget),
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  }

  getState(): FinancialState {
    return { ...this.state };
  }

  getDecisions(): FinancialDecision[] {
    return [...this.decisions];
  }

  getOpportunities(): RevenueOpportunity[] {
    return [...this.opportunities];
  }
}

export const financialEngine = new FinancialEngine();
