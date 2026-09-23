import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGlyphSchema, insertAttestationSchema, insertAuditLogSchema, type Glyph, type ResonanceScoreRequest } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { resonanceEngine } from "./resonance-engine";
import { builder, type BuildManifest } from "./builder";
import { overseer, type OverseerRequest } from "./overseer";
import { financialEngine, type RevenueOpportunity } from "./financial-engine";
import { agentSystem } from "./agent-system";
import { selector } from "./selector";
import { evolutionEngine } from "./evolution-engine";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Glyphs
  app.get("/api/glyphs", async (_req, res) => {
    const glyphs = await storage.getGlyphs();
    res.json(glyphs);
  });

  app.get("/api/glyphs/:id", async (req, res) => {
    const glyph = await storage.getGlyph(req.params.id);
    if (!glyph) {
      return res.status(404).json({ error: "Glyph not found" });
    }
    res.json(glyph);
  });

  app.post("/api/glyphs", async (req, res) => {
    try {
      const body = insertGlyphSchema.parse(req.body);
      const id = `blake3:${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
      
      const glyph = await storage.createGlyph(id, {
        ...body,
        producedAt: new Date(),
      });

      await storage.createAuditLog({
        actor: "api",
        action: "ingest",
        glyphId: id,
        payload: { type: body.type, name: body.name },
      });

      res.status(201).json(glyph);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: fromError(error as any).toString() });
      }
      throw error;
    }
  });

  // Edges
  app.get("/api/edges", async (_req, res) => {
    const edges = await storage.getEdges();
    res.json(edges);
  });

  app.post("/api/edges", async (req, res) => {
    try {
      const edge = await storage.createEdge(req.body);
      res.status(201).json(edge);
    } catch (error) {
      res.status(400).json({ error: "Invalid edge data" });
    }
  });

  // Attestations
  app.get("/api/attestations", async (_req, res) => {
    const attestations = await storage.getAttestations();
    res.json(attestations);
  });

  app.post("/api/attestations", async (req, res) => {
    try {
      const body = insertAttestationSchema.parse(req.body);
      const attestation = await storage.createAttestation({
        ...body,
        at: new Date(),
      });
      res.status(201).json(attestation);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: fromError(error as any).toString() });
      }
      throw error;
    }
  });

  // Quality promotion with attestation
  app.post("/api/promote", async (req, res) => {
    const { glyphId, toQuality, evidenceUri, signerKeyId } = req.body;

    if (!glyphId || !toQuality || !evidenceUri) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const glyph = await storage.getGlyph(glyphId);
    if (!glyph) {
      return res.status(404).json({ error: "Glyph not found" });
    }

    // Create attestation
    await storage.createAttestation({
      glyphId,
      fromQuality: glyph.quality,
      toQuality,
      signerKeyId: signerKeyId || "foundry.local",
      signature: "sig_" + Date.now(), // Simplified signature
      evidenceUri,
      at: new Date(),
    });

    // Update glyph quality
    const updated = await storage.updateGlyph(glyphId, { quality: toQuality });

    await storage.createAuditLog({
      actor: "api",
      action: "promote",
      glyphId,
      payload: { from: glyph.quality, to: toQuality, evidenceUri },
    });

    res.json(updated);
  });

  // Audit logs
  app.get("/api/audit", async (_req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  // Lineage graph
  app.get("/api/lineage", async (_req, res) => {
    const graph = await storage.getLineageGraph();
    res.json(graph);
  });

  // Assembly (build simulation)
  app.post("/api/assembly", async (req, res) => {
    const { recipe } = req.body;
    
    if (!recipe || !recipe.name) {
      return res.status(400).json({ error: "Invalid recipe" });
    }

    // Simulate assembly process
    const result = {
      success: true,
      appGlyphId: `blake3:${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`,
      logs: [
        { level: "info", message: `Assembling ${recipe.name}...` },
        { level: "info", message: `Resolved ${recipe.fragments?.length || 0} fragments` },
        { level: "success", message: "Assembly complete" },
      ],
      artifacts: recipe.fragments || [],
    };

    await storage.createAuditLog({
      actor: "api",
      action: "assemble",
      glyphId: result.appGlyphId,
      payload: { recipe: recipe.name },
    });

    res.json(result);
  });

  // ============================================================================
  // RESONANCE ENGINE ROUTES
  // ============================================================================

  // Calculate Resonance Score for birth data
  app.post("/api/resonance/score", async (req, res) => {
    try {
      const request: ResonanceScoreRequest = req.body;
      
      if (!request.birthData) {
        return res.status(400).json({ error: "Missing birthData" });
      }

      const result = resonanceEngine.calculateResonanceScore(request.birthData);
      
      await storage.createAuditLog({
        actor: "resonance-engine",
        action: "score",
        glyphId: request.targetGlyphId || null,
        payload: {
          location: request.birthData.location,
          hdType: result.blueprint.hdType,
          coherenceScore: result.diagnosis.coherenceScore,
          resonanceScore: result.diagnosis.resonanceScore,
          approved: result.diagnosis.approved,
        },
      });

      res.json(result);
    } catch (error) {
      console.error("Resonance score error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to calculate resonance score" });
    }
  });

  // Get blueprint only (no full scoring)
  app.post("/api/resonance/blueprint", async (req, res) => {
    try {
      const { birthData } = req.body;
      
      if (!birthData) {
        return res.status(400).json({ error: "Missing birthData" });
      }

      const result = resonanceEngine.calculateResonanceScore(birthData);
      res.json({ blueprint: result.blueprint });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate blueprint" });
    }
  });

  // ============================================================================
  // FOUNDRY-BUILDER ROUTES
  // ============================================================================

  // Build a new artifact from manifest
  app.post("/api/build", async (req, res) => {
    try {
      const manifest: BuildManifest = req.body;
      
      if (!manifest.name || !manifest.type || !manifest.components) {
        return res.status(400).json({ error: "Invalid build manifest" });
      }

      const result = await builder.build(manifest);

      await storage.createAuditLog({
        actor: "builder",
        action: "build",
        glyphId: result.artifact?.id || null,
        payload: {
          name: manifest.name,
          status: result.status,
          componentCount: manifest.components.length,
          resonanceScore: result.overseerDecision.resonanceScore,
          coherenceScore: result.overseerDecision.coherenceScore,
        },
      });

      if (result.status === "failed") {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Build failed" });
    }
  });

  // Get build history
  app.get("/api/builds", async (_req, res) => {
    const history = builder.getBuildHistory();
    res.json(history);
  });

  // ============================================================================
  // OVERSEER ROUTES
  // ============================================================================

  // Evaluate a decision
  app.post("/api/overseer/evaluate", async (req, res) => {
    try {
      const request: OverseerRequest = req.body;
      const decision = overseer.evaluate(request);
      res.json(decision);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Evaluation failed" });
    }
  });

  // Get decision log
  app.get("/api/overseer/decisions", async (_req, res) => {
    const decisions = overseer.getDecisionLog();
    res.json(decisions);
  });

  // Check if target is frozen
  app.get("/api/overseer/frozen/:targetId", async (req, res) => {
    const frozen = overseer.isFrozen(req.params.targetId);
    res.json({ targetId: req.params.targetId, frozen });
  });

  // Unfreeze a target
  app.post("/api/overseer/unfreeze", async (req, res) => {
    const { targetId, reason } = req.body;
    if (!targetId || !reason) {
      return res.status(400).json({ error: "Missing targetId or reason" });
    }
    const success = overseer.unfreeze(targetId, reason);
    res.json({ success, targetId });
  });

  // ============================================================================
  // FINANCIAL ENGINE ROUTES
  // ============================================================================

  // Get financial state
  app.get("/api/financial/state", async (_req, res) => {
    res.json(financialEngine.getState());
  });

  // Update financial state
  app.post("/api/financial/state", async (req, res) => {
    financialEngine.updateState(req.body);
    res.json(financialEngine.getState());
  });

  // Evaluate opportunity
  app.post("/api/financial/evaluate", async (req, res) => {
    try {
      const { opportunity, bodyActivations, mindActivations, heartActivations } = req.body;
      if (!opportunity) {
        return res.status(400).json({ error: "Missing opportunity" });
      }
      const decision = financialEngine.evaluateOpportunity(
        opportunity,
        bodyActivations,
        mindActivations,
        heartActivations
      );
      res.json(decision);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Evaluation failed" });
    }
  });

  // Suggest revenue paths
  app.get("/api/financial/suggestions", async (_req, res) => {
    const suggestions = financialEngine.suggestRevenuePaths();
    res.json(suggestions);
  });

  // ============================================================================
  // AGENT SYSTEM ROUTES
  // ============================================================================

  // Get all agents
  app.get("/api/agents", async (_req, res) => {
    const agents = agentSystem.getAgents();
    res.json(agents);
  });

  // Get specific agent
  app.get("/api/agents/:id", async (req, res) => {
    const agent = agentSystem.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json(agent);
  });

  // Get agent stats
  app.get("/api/agents/stats", async (_req, res) => {
    const stats = agentSystem.getStats();
    res.json(stats);
  });

  // Pause agent
  app.post("/api/agents/:id/pause", async (req, res) => {
    const success = agentSystem.pauseAgent(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json({ success: true });
  });

  // Resume agent
  app.post("/api/agents/:id/resume", async (req, res) => {
    const success = agentSystem.resumeAgent(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json({ success: true });
  });

  // ============================================================================
  // SELF-EVOLUTION ROUTES
  // ============================================================================

  // Analyze and propose improvements
  app.post("/api/evolution/analyze", async (req, res) => {
    try {
      const { targetScope = "all", includeResonanceCheck = true } = req.body;
      const result = await evolutionEngine.analyze({ targetScope, includeResonanceCheck });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Analysis failed" });
    }
  });

  // Approve an improvement
  app.post("/api/evolution/approve", async (req, res) => {
    try {
      const { proposalId, improvementId, approved, reason } = req.body;
      if (!proposalId || !improvementId) {
        return res.status(400).json({ error: "Missing proposalId or improvementId" });
      }
      const result = await evolutionEngine.approve({ proposalId, improvementId, approved, reason });
      if (!result) {
        return res.status(404).json({ error: "Proposal or improvement not found" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Approval failed" });
    }
  });

  // Apply an improvement
  app.post("/api/evolution/apply", async (req, res) => {
    try {
      const { proposalId, improvementId, dryRun = false } = req.body;
      if (!proposalId || !improvementId) {
        return res.status(400).json({ error: "Missing proposalId or improvementId" });
      }
      const result = await evolutionEngine.apply({ proposalId, improvementId, dryRun });
      if (!result) {
        return res.status(404).json({ error: "Proposal or improvement not found" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Application failed" });
    }
  });

  // Rollback an improvement
  app.post("/api/evolution/rollback/:historyId", async (req, res) => {
    const success = await evolutionEngine.rollback(req.params.historyId);
    if (!success) {
      return res.status(404).json({ error: "History entry not found or rollback unavailable" });
    }
    res.json({ success: true });
  });

  // Get evolution state
  app.get("/api/evolution/state", async (_req, res) => {
    res.json({
      currentProposal: evolutionEngine.getCurrentProposal(),
      history: evolutionEngine.getHistory(),
    });
  });

  // Get evolution history
  app.get("/api/evolution/history", async (_req, res) => {
    res.json(evolutionEngine.getHistory());
  });

  const httpServer = createServer(app);
  return httpServer;
}
