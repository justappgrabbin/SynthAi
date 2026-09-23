import { randomUUID } from "crypto";
import { storage } from "./storage";
import { overseer } from "./overseer";
import type {
  EvolutionProposal,
  EvolutionStage,
  ProposedImprovement,
  EvolutionHistoryEntry,
  EvolutionAnalysisResponse,
  Glyph,
} from "@shared/schema";

interface EvolutionConfig {
  maxImprovementsPerCycle: number;
  requireUserApproval: boolean;
  requireOverseerApproval: boolean;
  minResonanceForAutoApproval: number;
}

const DEFAULT_CONFIG: EvolutionConfig = {
  maxImprovementsPerCycle: 5,
  requireUserApproval: true,
  requireOverseerApproval: true,
  minResonanceForAutoApproval: 0.85,
};

class EvolutionEngine {
  private config: EvolutionConfig;
  private currentProposal: EvolutionProposal | null = null;
  private evolutionHistory: EvolutionHistoryEntry[] = [];
  private appVersion = "1.0.0";

  constructor(config: Partial<EvolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private incrementVersion(): string {
    const [major, minor, patch] = this.appVersion.split(".").map(Number);
    this.appVersion = `${major}.${minor}.${patch + 1}`;
    return this.appVersion;
  }

  async startAnalysis(): Promise<EvolutionProposal> {
    const proposal: EvolutionProposal = {
      id: randomUUID(),
      stage: "analyzing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: this.appVersion,
      currentFeatures: [],
      improvements: [],
    };
    this.currentProposal = proposal;
    return proposal;
  }

  async analyzeSystem(): Promise<EvolutionAnalysisResponse> {
    if (!this.currentProposal || this.currentProposal.stage !== "analyzing") {
      await this.startAnalysis();
    }

    const glyphs = await storage.getGlyphs();
    const stats = await storage.getStats();

    const currentFeatures = this.detectCurrentFeatures(glyphs);
    const improvements = this.generateImprovementSuggestions(glyphs, currentFeatures);

    this.currentProposal!.currentFeatures = currentFeatures;
    this.currentProposal!.improvements = improvements;
    this.currentProposal!.stage = "proposing";
    this.currentProposal!.updatedAt = new Date().toISOString();

    return {
      proposalId: this.currentProposal!.id,
      stage: this.currentProposal!.stage,
      currentFeatures,
      improvements,
      systemHealth: {
        totalComponents: stats.totalGlyphs,
        testedComponents: stats.testedCount,
        productionComponents: stats.productionCount,
        resonanceAverage: this.calculateAverageResonance(glyphs),
      },
    };
  }

  private detectCurrentFeatures(glyphs: Glyph[]): string[] {
    const features: string[] = [
      "Glyph Registry with BLAKE3 content addressing",
      "Quality lifecycle management (draft/tested/production)",
      "Lineage tracking via directed edges",
      "Resonance Engine with Human Design alignment",
      "Overseer governance with freeze/approve/deny",
      "Builder with causal graph tracking",
      "Financial stability scoring",
      "Multi-page navigation with sidebar",
    ];

    if (glyphs.some(g => g.type === "app")) {
      features.push("App assembly from fragments");
    }
    if (glyphs.filter(g => g.quality === "production").length > 3) {
      features.push("Production-grade artifact pipeline");
    }

    return features;
  }

  private generateImprovementSuggestions(
    glyphs: Glyph[],
    currentFeatures: string[]
  ): ProposedImprovement[] {
    const improvements: ProposedImprovement[] = [];
    const draftCount = glyphs.filter(g => g.quality === "draft").length;
    const testedCount = glyphs.filter(g => g.quality === "tested").length;

    if (draftCount > testedCount * 2) {
      improvements.push({
        id: randomUUID(),
        type: "feature",
        priority: "high",
        title: "Automated Testing Pipeline",
        description: "Add automated quality promotion workflow that runs tests on draft glyphs and promotes them to tested status",
        benefit: "Reduces manual testing burden and accelerates the quality lifecycle",
        implementation: "Create a TestRunner component that validates glyphs against schema, runs lint checks, and auto-promotes passing drafts",
        estimatedComplexity: 6,
        affectedComponents: ["builder", "registry", "quality-lifecycle"],
        resonanceImpact: 0.15,
      });
    }

    if (!currentFeatures.includes("Real-time collaboration")) {
      improvements.push({
        id: randomUUID(),
        type: "feature",
        priority: "medium",
        title: "Collaborative Glyph Editing",
        description: "Enable multiple users to view and edit glyph metadata simultaneously with real-time sync",
        benefit: "Improves team productivity and reduces merge conflicts in shared registries",
        implementation: "Add WebSocket-based sync layer for glyph updates with conflict resolution",
        estimatedComplexity: 7,
        affectedComponents: ["registry", "storage", "websocket-layer"],
        resonanceImpact: 0.12,
      });
    }

    improvements.push({
      id: randomUUID(),
      type: "ui",
      priority: "medium",
      title: "Visual Lineage Graph Explorer",
      description: "Interactive graph visualization showing glyph dependencies and build history",
      benefit: "Makes complex lineage relationships immediately understandable",
      implementation: "Add D3.js or React Flow component to render lineage as interactive node graph",
      estimatedComplexity: 5,
      affectedComponents: ["lineage-page", "graph-renderer"],
      resonanceImpact: 0.08,
    });

    improvements.push({
      id: randomUUID(),
      type: "integration",
      priority: "high",
      title: "Astrological Transit Alerts",
      description: "Real-time notifications when planetary transits affect resonance scores",
      benefit: "Enables proactive alignment adjustments before resonance drops",
      implementation: "Add transit calculation module and notification system tied to Resonance Engine",
      estimatedComplexity: 8,
      affectedComponents: ["resonance-engine", "notifications", "alerts"],
      resonanceImpact: 0.25,
    });

    improvements.push({
      id: randomUUID(),
      type: "component",
      priority: "low",
      title: "Glyph Template Library",
      description: "Pre-built templates for common fragment types (auth, API, database)",
      benefit: "Accelerates development by providing battle-tested starting points",
      implementation: "Create template catalog with one-click instantiation and customization",
      estimatedComplexity: 4,
      affectedComponents: ["template-library", "builder", "registry"],
      resonanceImpact: 0.05,
    });

    improvements.push({
      id: randomUUID(),
      type: "performance",
      priority: "medium",
      title: "Intelligent Caching Layer",
      description: "Add smart caching for frequently accessed glyphs and lineage queries",
      benefit: "Reduces database load and improves response times for large registries",
      implementation: "Implement LRU cache with invalidation hooks on glyph updates",
      estimatedComplexity: 5,
      affectedComponents: ["storage", "api-routes", "cache-layer"],
      resonanceImpact: 0.03,
    });

    return improvements.slice(0, this.config.maxImprovementsPerCycle);
  }

  private calculateAverageResonance(glyphs: Glyph[]): number {
    if (glyphs.length === 0) return 0;
    const qualityScores: Record<string, number> = {
      draft: 0.3,
      tested: 0.6,
      production: 0.9,
    };
    const total = glyphs.reduce((sum, g) => sum + (qualityScores[g.quality] || 0), 0);
    return total / glyphs.length;
  }

  async selectImprovement(improvementId: string): Promise<EvolutionProposal | null> {
    if (!this.currentProposal) return null;

    const improvement = this.currentProposal.improvements.find(i => i.id === improvementId);
    if (!improvement) return null;

    const overseerDecision = overseer.evaluate({
      context: "evolution",
      targetId: improvementId,
      targetType: "improvement",
      metadata: {
        type: improvement.type,
        complexity: improvement.estimatedComplexity,
        resonanceImpact: improvement.resonanceImpact,
      },
    });

    this.currentProposal.selectedImprovement = improvement;
    this.currentProposal.stage = "awaiting_approval";
    this.currentProposal.overseerDecision = {
      approved: overseerDecision.approved,
      resonanceScore: overseerDecision.resonanceScore,
      coherenceScore: overseerDecision.coherenceScore,
      reasoning: overseerDecision.reasoning,
      frozen: overseerDecision.frozen || false,
    };
    this.currentProposal.updatedAt = new Date().toISOString();

    return this.currentProposal;
  }

  async submitUserApproval(
    proposalId: string,
    approved: boolean,
    reason?: string
  ): Promise<EvolutionProposal | null> {
    if (!this.currentProposal || this.currentProposal.id !== proposalId) {
      return null;
    }

    const now = new Date().toISOString();

    this.currentProposal.userApproval = {
      approved,
      ...(approved ? { approvedAt: now } : { rejectedAt: now }),
      reason,
    };

    if (approved) {
      this.currentProposal.stage = "applying";
    } else {
      this.currentProposal.stage = "rejected";
    }

    this.currentProposal.updatedAt = now;
    return this.currentProposal;
  }

  async applyEvolution(proposalId: string): Promise<EvolutionProposal | null> {
    if (!this.currentProposal || this.currentProposal.id !== proposalId) {
      return null;
    }

    if (!this.currentProposal.userApproval?.approved) {
      return null;
    }

    if (!this.currentProposal.selectedImprovement) {
      return null;
    }

    const improvement = this.currentProposal.selectedImprovement;
    const newVersion = this.incrementVersion();
    const artifactId = `evolution:${randomUUID()}`;

    try {
      const historyEntry: EvolutionHistoryEntry = {
        id: randomUUID(),
        version: newVersion,
        improvement,
        appliedAt: new Date().toISOString(),
        artifactId,
        rollbackAvailable: true,
      };

      this.evolutionHistory.push(historyEntry);

      this.currentProposal.stage = "completed";
      this.currentProposal.applicationResult = {
        success: true,
        artifactId,
        appliedAt: new Date().toISOString(),
      };
      this.currentProposal.updatedAt = new Date().toISOString();

      await storage.createAuditLog({
        actor: "evolution-engine",
        action: "evolution-applied",
        glyphId: artifactId,
        payload: {
          version: newVersion,
          improvementType: improvement.type,
          title: improvement.title,
        },
      });

      return this.currentProposal;
    } catch (error) {
      this.currentProposal.applicationResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        appliedAt: new Date().toISOString(),
      };
      return this.currentProposal;
    }
  }

  getCurrentProposal(): EvolutionProposal | null {
    return this.currentProposal;
  }

  getEvolutionHistory(): EvolutionHistoryEntry[] {
    return this.evolutionHistory;
  }

  getAppVersion(): string {
    return this.appVersion;
  }

  cancelProposal(): void {
    this.currentProposal = null;
  }

  goBack(): EvolutionStage | null {
    if (!this.currentProposal) return null;

    const currentStage = this.currentProposal.stage;

    if (currentStage === "awaiting_approval") {
      this.currentProposal.selectedImprovement = undefined;
      this.currentProposal.overseerDecision = undefined;
      this.currentProposal.stage = "proposing";
      this.currentProposal.updatedAt = new Date().toISOString();
      return "proposing";
    }

    if (currentStage === "proposing") {
      this.currentProposal.improvements = [];
      this.currentProposal.currentFeatures = [];
      this.currentProposal.stage = "analyzing";
      this.currentProposal.updatedAt = new Date().toISOString();
      return "analyzing";
    }

    if (currentStage === "analyzing") {
      this.currentProposal = null;
      return null;
    }

    return this.currentProposal.stage;
  }
}

export const evolutionEngine = new EvolutionEngine();
