import type { ProposedImprovement, EvolutionProposal, EvolutionStage, EvolutionHistoryEntry, EvolutionAnalysisRequest, EvolutionAnalysisResponse, UserApprovalRequest, EvolutionApplicationRequest } from "@shared/schema";
import { storage } from "./storage";
import { overseer } from "./overseer";
import { builder } from "./builder";
import { randomUUID } from "crypto";

export class EvolutionEngine {
  private currentProposal: EvolutionProposal | null = null;
  private history: EvolutionHistoryEntry[] = [];
  private version: string = "1.0.0";

  async analyze(request: EvolutionAnalysisRequest): Promise<EvolutionAnalysisResponse> {
    const glyphs = await storage.getGlyphs();
    const stats = await storage.getStats();

    const currentFeatures = this.detectCurrentFeatures(glyphs);
    const improvements = this.generateImprovements(request, glyphs, stats);

    const proposal: EvolutionProposal = {
      id: randomUUID(),
      stage: "proposing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: this.version,
      currentFeatures,
      improvements,
    };

    this.currentProposal = proposal;

    return {
      proposalId: proposal.id,
      stage: proposal.stage,
      currentFeatures,
      improvements,
      systemHealth: {
        totalComponents: stats.totalGlyphs,
        testedComponents: stats.testedCount,
        productionComponents: stats.productionCount,
        resonanceAverage: 0.75,
      },
    };
  }

  private detectCurrentFeatures(glyphs: Array<{ name: string; type: string; kind: string | null }>): string[] {
    const features: string[] = [];

    const pageNames = ["dashboard", "registry", "fragments", "apps", "lineage", "audit", "settings", "studio", "agents", "overseer", "resonance", "system"];
    const existingPages = glyphs.filter(g => pageNames.some(p => g.name.toLowerCase().includes(p))).length;

    if (existingPages >= 5) features.push("Full navigation system");
    if (glyphs.some(g => g.name.toLowerCase().includes("chart"))) features.push("Data visualization");
    if (glyphs.some(g => g.name.toLowerCase().includes("form"))) features.push("Form handling");
    if (glyphs.some(g => g.name.toLowerCase().includes("modal") || g.name.toLowerCase().includes("dialog"))) features.push("Modal dialogs");
    if (glyphs.some(g => g.name.toLowerCase().includes("table"))) features.push("Data tables");
    if (glyphs.some(g => g.name.toLowerCase().includes("resonance"))) features.push("Resonance scoring");
    if (glyphs.some(g => g.name.toLowerCase().includes("overseer"))) features.push("Overseer governance");
    if (glyphs.some(g => g.name.toLowerCase().includes("agent"))) features.push("Agent system");

    if (features.length === 0) {
      features.push("Basic UI framework", "Component library", "Routing system");
    }

    return features;
  }

  private generateImprovements(
    request: EvolutionAnalysisRequest,
    glyphs: Array<{ name: string; type: string; quality: string }>,
    stats: { totalGlyphs: number; draftCount: number; testedCount: number; productionCount: number }
  ): ProposedImprovement[] {
    const improvements: ProposedImprovement[] = [];

    const draftRatio = stats.totalGlyphs > 0 ? stats.draftCount / stats.totalGlyphs : 0;
    if (draftRatio > 0.5) {
      improvements.push({
        id: randomUUID(),
        type: "performance",
        priority: "high",
        title: "Promote Draft Components",
        description: "Many components remain in draft quality. Automated testing pipeline could promote stable components to tested.",
        benefit: "Increased system reliability and component reuse",
        implementation: "Add automated test coverage analysis and quality promotion workflow",
        estimatedComplexity: 3,
        affectedComponents: ["builder", "overseer"],
        resonanceImpact: 0.15,
      });
    }

    const hasSearch = glyphs.some(g => g.name.toLowerCase().includes("search") || g.name.toLowerCase().includes("filter"));
    if (!hasSearch) {
      improvements.push({
        id: randomUUID(),
        type: "feature",
        priority: "medium",
        title: "Advanced Search & Filtering",
        description: "Add full-text search with filters across all glyph properties.",
        benefit: "Faster navigation and discovery in large registries",
        implementation: "Integrate search index with debounced queries and facet filters",
        estimatedComplexity: 4,
        affectedComponents: ["registry", "fragments", "apps"],
        resonanceImpact: 0.12,
      });
    }

    const hasNotifications = glyphs.some(g => g.name.toLowerCase().includes("notification") || g.name.toLowerCase().includes("toast"));
    if (hasNotifications) {
      improvements.push({
        id: randomUUID(),
        type: "ui",
        priority: "medium",
        title: "Notification Center",
        description: "Centralized notification hub with history, preferences, and real-time alerts.",
        benefit: "Better user awareness of system events",
        implementation: "Create notification store, WebSocket listener, and notification panel UI",
        estimatedComplexity: 5,
        affectedComponents: ["topbar", "settings"],
        resonanceImpact: 0.08,
      });
    }

    const hasKeyboard = glyphs.some(g => g.name.toLowerCase().includes("keyboard") || g.name.toLowerCase().includes("shortcut"));
    if (!hasKeyboard) {
      improvements.push({
        id: randomUUID(),
        type: "feature",
        priority: "low",
        title: "Keyboard Shortcuts",
        description: "Power-user keyboard navigation and command palette.",
        benefit: "Improved productivity for frequent users",
        implementation: "Add command palette component with fuzzy search and global keyboard handlers",
        estimatedComplexity: 3,
        affectedComponents: ["app-shell"],
        resonanceImpact: 0.06,
      });
    }

    const hasAnalytics = glyphs.some(g => g.name.toLowerCase().includes("analytics") || g.name.toLowerCase().includes("metrics"));
    if (!hasAnalytics) {
      improvements.push({
        id: randomUUID(),
        type: "page",
        priority: "medium",
        title: "Analytics Dashboard",
        description: "Visual analytics page showing build trends, quality distribution, and usage patterns.",
        benefit: "Data-driven decisions about system improvements",
        implementation: "Create analytics page with recharts visualizations and time-series data",
        estimatedComplexity: 6,
        affectedComponents: ["dashboard", "charts"],
        resonanceImpact: 0.10,
      });
    }

    improvements.push({
      id: randomUUID(),
      type: "component",
      priority: "critical",
      title: "Self-Evolution UI",
      description: "Add a dedicated page for viewing and approving system improvement proposals.",
      benefit: "Enable user-gated autonomous system evolution",
      implementation: "Create evolution page with proposal cards, approval workflow, and history view",
      estimatedComplexity: 5,
      affectedComponents: ["evolution", "overseer"],
      resonanceImpact: 0.25,
    });

    return improvements.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async approve(request: UserApprovalRequest): Promise<EvolutionProposal | null> {
    if (!this.currentProposal || this.currentProposal.id !== request.proposalId) {
      return null;
    }

    const improvement = this.currentProposal.improvements.find(i => i.id === request.improvementId);
    if (!improvement) {
      return null;
    }

    this.currentProposal.selectedImprovement = improvement;
    this.currentProposal.stage = request.approved ? "awaiting_approval" : "rejected";
    this.currentProposal.userApproval = {
      approved: request.approved,
      approvedAt: request.approved ? new Date().toISOString() : undefined,
      rejectedAt: !request.approved ? new Date().toISOString() : undefined,
      reason: request.reason,
    };
    this.currentProposal.updatedAt = new Date().toISOString();

    await storage.createAuditLog({
      actor: "user",
      action: request.approved ? "evolution_approve" : "evolution_reject",
      glyphId: null,
      payload: {
        proposalId: request.proposalId,
        improvementId: request.improvementId,
        title: improvement.title,
      },
    });

    return this.currentProposal;
  }

  async apply(request: EvolutionApplicationRequest): Promise<EvolutionProposal | null> {
    if (!this.currentProposal || this.currentProposal.id !== request.proposalId) {
      return null;
    }

    const improvement = this.currentProposal.improvements.find(i => i.id === request.improvementId);
    if (!improvement) {
      return null;
    }

    if (!this.currentProposal.userApproval?.approved) {
      this.currentProposal.stage = "rejected";
      this.currentProposal.applicationResult = {
        success: false,
        error: "Improvement not approved by user",
        appliedAt: new Date().toISOString(),
      };
      return this.currentProposal;
    }

    this.currentProposal.stage = "applying";
    this.currentProposal.updatedAt = new Date().toISOString();

    const overseerDecision = overseer.evaluate({
      context: "build",
      targetId: improvement.id,
      targetType: "evolution",
    });

    this.currentProposal.overseerDecision = {
      approved: overseerDecision.approved,
      resonanceScore: overseerDecision.resonanceScore,
      coherenceScore: overseerDecision.coherenceScore,
      reasoning: overseerDecision.reasoning,
      frozen: overseerDecision.frozen,
    };

    if (!overseerDecision.approved) {
      this.currentProposal.stage = "rejected";
      this.currentProposal.applicationResult = {
        success: false,
        error: "Overseer denied: " + overseerDecision.reasoning.join("; "),
        appliedAt: new Date().toISOString(),
      };
      return this.currentProposal;
    }

    if (request.dryRun) {
      this.currentProposal.applicationResult = {
        success: true,
        artifactId: "dry-run-no-artifact",
        appliedAt: new Date().toISOString(),
      };
      this.currentProposal.stage = "completed";
      return this.currentProposal;
    }

    const buildResult = await builder.build({
      name: improvement.title.toLowerCase().replace(/\s+/g, "-"),
      type: improvement.type === "page" ? "app" : "fragment",
      components: improvement.affectedComponents,
      targetQuality: "draft",
    });

    if (buildResult.status === "success" && buildResult.artifact) {
      this.version = this.incrementVersion();

      this.history.push({
        id: randomUUID(),
        version: this.version,
        improvement,
        appliedAt: new Date().toISOString(),
        artifactId: buildResult.artifact.id,
        rollbackAvailable: true,
      });

      this.currentProposal.stage = "completed";
      this.currentProposal.applicationResult = {
        success: true,
        artifactId: buildResult.artifact.id,
        appliedAt: new Date().toISOString(),
      };

      await storage.createAuditLog({
        actor: "evolution-engine",
        action: "evolution_applied",
        glyphId: buildResult.artifact.id,
        payload: {
          version: this.version,
          improvement: improvement.title,
          resonanceScore: overseerDecision.resonanceScore,
        },
      });
    } else {
      this.currentProposal.stage = "rejected";
      this.currentProposal.applicationResult = {
        success: false,
        error: buildResult.errors.join("; ") || "Build failed",
        appliedAt: new Date().toISOString(),
      };
    }

    this.currentProposal.updatedAt = new Date().toISOString();
    return this.currentProposal;
  }

  async rollback(historyId: string): Promise<boolean> {
    const entry = this.history.find(h => h.id === historyId);
    if (!entry || !entry.rollbackAvailable) {
      return false;
    }

    await storage.deleteGlyph(entry.artifactId);

    entry.rollbackAvailable = false;
    this.version = this.decrementVersion();

    await storage.createAuditLog({
      actor: "evolution-engine",
      action: "evolution_rollback",
      glyphId: entry.artifactId,
      payload: {
        version: this.version,
        rolledBackImprovement: entry.improvement.title,
      },
    });

    return true;
  }

  private incrementVersion(): string {
    const parts = this.version.split(".").map(Number);
    parts[2]++;
    return parts.join(".");
  }

  private decrementVersion(): string {
    const parts = this.version.split(".").map(Number);
    parts[2] = Math.max(0, parts[2] - 1);
    return parts.join(".");
  }

  getCurrentProposal(): EvolutionProposal | null {
    return this.currentProposal;
  }

  getHistory(): EvolutionHistoryEntry[] {
    return [...this.history];
  }

  getVersion(): string {
    return this.version;
  }
}

export const evolutionEngine = new EvolutionEngine();
