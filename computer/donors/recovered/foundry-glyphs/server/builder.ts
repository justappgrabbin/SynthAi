import type { Glyph, HDActivation } from "@shared/schema";
import { overseer, type OverseerDecision } from "./overseer";
import { selector, type SelectionResult } from "./selector";
import { storage } from "./storage";
import { randomUUID } from "crypto";

export type BuildStatus = "pending" | "building" | "success" | "failed" | "frozen";

export interface BuildManifest {
  name: string;
  type: "app" | "fragment" | "agent" | "media";
  components: string[];
  targetQuality: "draft" | "tested" | "production";
  bodyActivations?: HDActivation[];
  mindActivations?: HDActivation[];
  heartActivations?: HDActivation[];
  metadata?: Record<string, unknown>;
}

export interface BuildResult {
  id: string;
  status: BuildStatus;
  manifest: BuildManifest;
  artifact: Glyph | null;
  componentResults: SelectionResult[];
  overseerDecision: OverseerDecision;
  causalGraphEntry: CausalGraphEntry | null;
  financialImpact: FinancialImpact;
  errors: string[];
  warnings: string[];
  timestamp: Date;
  duration: number;
}

export interface CausalGraphEntry {
  id: string;
  buildId: string;
  artifactId: string;
  parentIds: string[];
  action: "create" | "compose" | "transform";
  timestamp: Date;
}

export interface FinancialImpact {
  estimatedCost: number;
  estimatedRevenue: number;
  riskScore: number;
  stabilityFactor: number;
  approved: boolean;
}

export class Builder {
  private buildHistory: BuildResult[] = [];
  private causalGraph: CausalGraphEntry[] = [];

  async build(manifest: BuildManifest): Promise<BuildResult> {
    const buildId = randomUUID();
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const componentResults: SelectionResult[] = [];

    const glyphs = await storage.getGlyphs();
    selector.clearCandidates();
    selector.addCandidatesFromGlyphs(glyphs);

    for (const componentName of manifest.components) {
      const result = selector.select({
        purpose: `Component for ${manifest.name}`,
        requiredType: "fragment",
        requiredQuality: manifest.targetQuality === "production" ? "tested" : undefined,
        bodyActivations: manifest.bodyActivations,
        mindActivations: manifest.mindActivations,
        heartActivations: manifest.heartActivations,
      });

      componentResults.push(result);

      if (!result.selected) {
        errors.push(`Failed to select component: ${componentName}`);
      } else if (result.overseerDecision.frozen) {
        errors.push(`Component ${componentName} is frozen by Overseer: ${result.overseerDecision.reasoning.join(", ")}`);
      } else if (!result.overseerDecision.approved) {
        errors.push(`Component ${componentName} denied by Overseer: ${result.overseerDecision.reasoning.join(", ")}`);
      }
    }

    const financialImpact = this.calculateFinancialImpact(manifest, componentResults);

    const overseerDecision = overseer.evaluate({
      context: "build",
      targetId: buildId,
      targetType: manifest.type,
      bodyActivations: manifest.bodyActivations,
      mindActivations: manifest.mindActivations,
      heartActivations: manifest.heartActivations,
      metadata: {
        componentCount: manifest.components.length,
        errorCount: errors.length,
        financialRisk: financialImpact.riskScore,
      },
    });

    let artifact: Glyph | null = null;
    let causalGraphEntry: CausalGraphEntry | null = null;
    let status: BuildStatus;

    if (errors.length > 0) {
      status = "failed";
    } else if (overseerDecision.frozen) {
      status = "frozen";
    } else if (!overseerDecision.approved) {
      status = "failed";
      errors.push("Overseer denied build: " + overseerDecision.reasoning.join("; "));
    } else if (!financialImpact.approved) {
      status = "failed";
      errors.push("Financial stability check failed");
    } else {
      status = "success";

      const glyphId = `blake3:${randomUUID().replace(/-/g, "")}`;
      artifact = await storage.createGlyph(glyphId, {
        schemaVersion: 1,
        type: manifest.type === "agent" || manifest.type === "media" ? "app" : manifest.type,
        name: manifest.name,
        quality: "draft",
        producer: {
          host: "builder",
          tool: "foundry-builder",
          user: "system",
        },
        sizeBytes: Math.floor(Math.random() * 100000) + 10000,
        casSha256: `sha256:${randomUUID().replace(/-/g, "")}`,
        casBucket: "default",
        language: "ts",
        kind: manifest.type === "app" ? null : "logic",
      });

      const parentIds = componentResults
        .filter((r) => r.selected)
        .map((r) => r.selected!.id);

      for (const parentId of parentIds) {
        await storage.createEdge({
          parentId,
          childId: artifact.id,
          role: "component",
        });
      }

      causalGraphEntry = {
        id: randomUUID(),
        buildId,
        artifactId: artifact.id,
        parentIds,
        action: "compose",
        timestamp: new Date(),
      };
      this.causalGraph.push(causalGraphEntry);

      await storage.createAuditLog({
        actor: "builder",
        action: "build",
        glyphId: artifact.id,
        payload: {
          manifest: manifest.name,
          componentCount: manifest.components.length,
          resonanceScore: overseerDecision.resonanceScore,
          coherenceScore: overseerDecision.coherenceScore,
        },
      });
    }

    const result: BuildResult = {
      id: buildId,
      status,
      manifest,
      artifact,
      componentResults,
      overseerDecision,
      causalGraphEntry,
      financialImpact,
      errors,
      warnings,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };

    this.buildHistory.push(result);
    return result;
  }

  private calculateFinancialImpact(
    manifest: BuildManifest,
    componentResults: SelectionResult[]
  ): FinancialImpact {
    const componentCost = componentResults.length * 10;
    const qualityMultiplier = manifest.targetQuality === "production" ? 2.0 :
                              manifest.targetQuality === "tested" ? 1.5 : 1.0;

    const estimatedCost = componentCost * qualityMultiplier;

    const successfulComponents = componentResults.filter((r) => r.selected && r.overseerDecision.approved);
    const avgConfidence = successfulComponents.length > 0
      ? successfulComponents.reduce((sum, r) => sum + r.confidence, 0) / successfulComponents.length
      : 0;

    const estimatedRevenue = estimatedCost * (1 + avgConfidence);

    const failedComponents = componentResults.filter((r) => !r.selected || !r.overseerDecision.approved);
    const riskScore = failedComponents.length / Math.max(1, componentResults.length);

    const avgResonance = componentResults
      .filter((r) => r.overseerDecision)
      .reduce((sum, r) => sum + r.overseerDecision.resonanceScore, 0) / Math.max(1, componentResults.length);

    const stabilityFactor = avgResonance > 0.5 ? 1 - riskScore : 0.5 - riskScore;

    return {
      estimatedCost,
      estimatedRevenue,
      riskScore,
      stabilityFactor,
      approved: riskScore < 0.5 && stabilityFactor > 0.3,
    };
  }

  getBuildHistory(): BuildResult[] {
    return [...this.buildHistory];
  }

  getCausalGraph(): CausalGraphEntry[] {
    return [...this.causalGraph];
  }

  getRecentBuilds(limit: number = 20): BuildResult[] {
    return this.buildHistory.slice(-limit);
  }
}

export const builder = new Builder();
