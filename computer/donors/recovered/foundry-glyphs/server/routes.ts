import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGlyphSchema, insertEdgeSchema, insertAttestationSchema, insertRecipeSchema, insertAuditLogSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import { evaluateResonance, getHDActivation, diagnoseField } from "./resonance-engine";
import { overseer } from "./overseer";
import { selector } from "./selector";
import { builder } from "./builder";
import { financialEngine } from "./financial-engine";
import { evolutionEngine } from "./evolution-engine";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Stats
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Glyphs
  app.get("/api/glyphs", async (_req, res) => {
    try {
      const glyphs = await storage.getGlyphs();
      res.json(glyphs);
    } catch (error) {
      console.error("Error fetching glyphs:", error);
      res.status(500).json({ error: "Failed to fetch glyphs" });
    }
  });

  app.get("/api/glyphs/:id", async (req, res) => {
    try {
      const glyph = await storage.getGlyph(req.params.id);
      if (!glyph) {
        return res.status(404).json({ error: "Glyph not found" });
      }
      res.json(glyph);
    } catch (error) {
      console.error("Error fetching glyph:", error);
      res.status(500).json({ error: "Failed to fetch glyph" });
    }
  });

  app.post("/api/glyphs", async (req, res) => {
    try {
      const result = insertGlyphSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }
      const id = `blake3:${randomUUID().replace(/-/g, "")}`;
      const glyph = await storage.createGlyph(id, result.data);
      await storage.createAuditLog({
        actor: "api",
        action: "create",
        glyphId: glyph.id,
        payload: { name: glyph.name },
      });
      res.status(201).json(glyph);
    } catch (error) {
      console.error("Error creating glyph:", error);
      res.status(500).json({ error: "Failed to create glyph" });
    }
  });

  app.patch("/api/glyphs/:id", async (req, res) => {
    try {
      const glyph = await storage.updateGlyph(req.params.id, req.body);
      if (!glyph) {
        return res.status(404).json({ error: "Glyph not found" });
      }
      res.json(glyph);
    } catch (error) {
      console.error("Error updating glyph:", error);
      res.status(500).json({ error: "Failed to update glyph" });
    }
  });

  app.post("/api/glyphs/:id/promote", async (req, res) => {
    try {
      const { targetQuality } = req.body;
      if (!["tested", "production"].includes(targetQuality)) {
        return res.status(400).json({ error: "Invalid target quality" });
      }
      const glyph = await storage.getGlyph(req.params.id);
      if (!glyph) {
        return res.status(404).json({ error: "Glyph not found" });
      }
      const fromQuality = glyph.quality;
      const updated = await storage.updateGlyph(req.params.id, { quality: targetQuality });
      await storage.createAttestation({
        glyphId: glyph.id,
        fromQuality,
        toQuality: targetQuality,
        signerKeyId: "api-key",
        signature: `sig-${Date.now()}`,
      });
      await storage.createAuditLog({
        actor: "api",
        action: "promote",
        glyphId: glyph.id,
        payload: { from: fromQuality, to: targetQuality },
      });
      res.json(updated);
    } catch (error) {
      console.error("Error promoting glyph:", error);
      res.status(500).json({ error: "Failed to promote glyph" });
    }
  });

  app.delete("/api/glyphs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGlyph(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Glyph not found" });
      }
      await storage.createAuditLog({
        actor: "api",
        action: "delete",
        glyphId: req.params.id,
        payload: {},
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting glyph:", error);
      res.status(500).json({ error: "Failed to delete glyph" });
    }
  });

  // Edges (lineage)
  app.get("/api/edges", async (_req, res) => {
    try {
      const edgeList = await storage.getEdges();
      res.json(edgeList);
    } catch (error) {
      console.error("Error fetching edges:", error);
      res.status(500).json({ error: "Failed to fetch edges" });
    }
  });

  app.get("/api/edges/glyph/:glyphId", async (req, res) => {
    try {
      const edgeList = await storage.getEdgesByGlyph(req.params.glyphId);
      res.json(edgeList);
    } catch (error) {
      console.error("Error fetching edges:", error);
      res.status(500).json({ error: "Failed to fetch edges" });
    }
  });

  app.post("/api/edges", async (req, res) => {
    try {
      const result = insertEdgeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }
      const edge = await storage.createEdge(result.data);
      res.status(201).json(edge);
    } catch (error) {
      console.error("Error creating edge:", error);
      res.status(500).json({ error: "Failed to create edge" });
    }
  });

  // Attestations
  app.get("/api/attestations", async (_req, res) => {
    try {
      const attestationList = await storage.getAttestations();
      res.json(attestationList);
    } catch (error) {
      console.error("Error fetching attestations:", error);
      res.status(500).json({ error: "Failed to fetch attestations" });
    }
  });

  app.get("/api/attestations/glyph/:glyphId", async (req, res) => {
    try {
      const attestationList = await storage.getAttestationsByGlyph(req.params.glyphId);
      res.json(attestationList);
    } catch (error) {
      console.error("Error fetching attestations:", error);
      res.status(500).json({ error: "Failed to fetch attestations" });
    }
  });

  // Recipes
  app.get("/api/recipes", async (_req, res) => {
    try {
      const recipeList = await storage.getRecipes();
      res.json(recipeList);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  app.get("/api/recipes/:glyphId", async (req, res) => {
    try {
      const recipe = await storage.getRecipe(req.params.glyphId);
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ error: "Failed to fetch recipe" });
    }
  });

  // Audit logs
  app.get("/api/audit", async (_req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Lineage graph
  app.get("/api/lineage", async (_req, res) => {
    try {
      const graph = await storage.getLineageGraph();
      res.json(graph);
    } catch (error) {
      console.error("Error fetching lineage:", error);
      res.status(500).json({ error: "Failed to fetch lineage" });
    }
  });

  // ============================================
  // RESONANCE ENGINE API
  // ============================================

  app.post("/api/resonance/calculate", async (req, res) => {
    try {
      const { sign, degree, minute, second } = req.body;
      if (!sign || degree === undefined) {
        return res.status(400).json({ error: "sign and degree required" });
      }
      const activation = getHDActivation(sign, degree, minute || 0, second || 0);
      res.json(activation);
    } catch (error) {
      console.error("Error calculating activation:", error);
      res.status(500).json({ error: "Failed to calculate activation" });
    }
  });

  app.post("/api/resonance/diagnose", async (req, res) => {
    try {
      const { bodyActivations, mindActivations, heartActivations } = req.body;
      const diagnosis = diagnoseField(
        bodyActivations || [],
        mindActivations || [],
        heartActivations || []
      );
      res.json(diagnosis);
    } catch (error) {
      console.error("Error diagnosing field:", error);
      res.status(500).json({ error: "Failed to diagnose field" });
    }
  });

  app.post("/api/resonance/evaluate", async (req, res) => {
    try {
      const response = evaluateResonance(req.body);
      res.json(response);
    } catch (error) {
      console.error("Error evaluating resonance:", error);
      res.status(500).json({ error: "Failed to evaluate resonance" });
    }
  });

  // ============================================
  // OVERSEER GOVERNANCE API
  // ============================================

  app.post("/api/overseer/evaluate", async (req, res) => {
    try {
      const decision = overseer.evaluate(req.body);
      res.json(decision);
    } catch (error) {
      console.error("Error in overseer evaluation:", error);
      res.status(500).json({ error: "Failed to evaluate" });
    }
  });

  app.get("/api/overseer/decisions", async (_req, res) => {
    try {
      const decisions = overseer.getRecentDecisions(50);
      res.json(decisions);
    } catch (error) {
      console.error("Error fetching decisions:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });

  app.get("/api/overseer/config", async (_req, res) => {
    try {
      const config = overseer.getConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  app.patch("/api/overseer/config", async (req, res) => {
    try {
      overseer.updateConfig(req.body);
      res.json(overseer.getConfig());
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  app.post("/api/overseer/unfreeze", async (req, res) => {
    try {
      const { targetId, reason } = req.body;
      if (!targetId || !reason) {
        return res.status(400).json({ error: "targetId and reason required" });
      }
      const success = overseer.unfreeze(targetId, reason);
      res.json({ success, targetId });
    } catch (error) {
      console.error("Error unfreezing:", error);
      res.status(500).json({ error: "Failed to unfreeze" });
    }
  });

  app.get("/api/overseer/frozen/:targetId", async (req, res) => {
    try {
      const frozen = overseer.isFrozen(req.params.targetId);
      res.json({ targetId: req.params.targetId, frozen });
    } catch (error) {
      console.error("Error checking frozen status:", error);
      res.status(500).json({ error: "Failed to check frozen status" });
    }
  });

  // ============================================
  // SELECTOR API
  // ============================================

  app.post("/api/selector/select", async (req, res) => {
    try {
      const glyphs = await storage.getGlyphs();
      selector.clearCandidates();
      selector.addCandidatesFromGlyphs(glyphs);
      const result = selector.select(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error in selection:", error);
      res.status(500).json({ error: "Failed to select" });
    }
  });

  app.get("/api/selector/candidates", async (_req, res) => {
    try {
      const glyphs = await storage.getGlyphs();
      selector.clearCandidates();
      selector.addCandidatesFromGlyphs(glyphs);
      res.json(selector.getCandidates());
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  // ============================================
  // BUILDER API
  // ============================================

  app.post("/api/builder/build", async (req, res) => {
    try {
      const result = await builder.build(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error in build:", error);
      res.status(500).json({ error: "Failed to build" });
    }
  });

  app.get("/api/builder/history", async (_req, res) => {
    try {
      const history = builder.getRecentBuilds(20);
      res.json(history);
    } catch (error) {
      console.error("Error fetching build history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.get("/api/builder/causal-graph", async (_req, res) => {
    try {
      const graph = builder.getCausalGraph();
      res.json(graph);
    } catch (error) {
      console.error("Error fetching causal graph:", error);
      res.status(500).json({ error: "Failed to fetch causal graph" });
    }
  });

  // ============================================
  // FINANCIAL ENGINE API
  // ============================================

  app.get("/api/financial/state", async (_req, res) => {
    try {
      const state = financialEngine.getState();
      res.json(state);
    } catch (error) {
      console.error("Error fetching financial state:", error);
      res.status(500).json({ error: "Failed to fetch state" });
    }
  });

  app.patch("/api/financial/state", async (req, res) => {
    try {
      financialEngine.updateState(req.body);
      res.json(financialEngine.getState());
    } catch (error) {
      console.error("Error updating financial state:", error);
      res.status(500).json({ error: "Failed to update state" });
    }
  });

  app.post("/api/financial/opportunity", async (req, res) => {
    try {
      financialEngine.addOpportunity(req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding opportunity:", error);
      res.status(500).json({ error: "Failed to add opportunity" });
    }
  });

  app.post("/api/financial/evaluate", async (req, res) => {
    try {
      const { opportunity, bodyActivations, mindActivations, heartActivations } = req.body;
      const decision = financialEngine.evaluateOpportunity(
        opportunity,
        bodyActivations,
        mindActivations,
        heartActivations
      );
      res.json(decision);
    } catch (error) {
      console.error("Error evaluating opportunity:", error);
      res.status(500).json({ error: "Failed to evaluate" });
    }
  });

  app.get("/api/financial/opportunities", async (_req, res) => {
    try {
      const opportunities = financialEngine.getOpportunities();
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/financial/suggestions", async (_req, res) => {
    try {
      const suggestions = financialEngine.suggestRevenuePaths();
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  app.get("/api/financial/decisions", async (_req, res) => {
    try {
      const decisions = financialEngine.getDecisions();
      res.json(decisions);
    } catch (error) {
      console.error("Error fetching decisions:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });

  app.post("/api/financial/project", async (req, res) => {
    try {
      const { targetAmount } = req.body;
      if (!targetAmount) {
        return res.status(400).json({ error: "targetAmount required" });
      }
      const projection = financialEngine.getProjectedTimeline(targetAmount);
      res.json(projection);
    } catch (error) {
      console.error("Error projecting timeline:", error);
      res.status(500).json({ error: "Failed to project timeline" });
    }
  });

  // ============================================
  // SYSTEM MODE API
  // ============================================

  let systemMode: "admin" | "dev" | "user" = "user";

  app.get("/api/system/mode", async (_req, res) => {
    res.json({ mode: systemMode });
  });

  app.post("/api/system/mode", async (req, res) => {
    const { mode } = req.body;
    if (!["admin", "dev", "user"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }
    systemMode = mode;
    await storage.createAuditLog({
      actor: "system",
      action: "mode-change",
      glyphId: null,
      payload: { newMode: mode },
    });
    res.json({ mode: systemMode });
  });

  app.get("/api/system/health", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      const overseerConfig = overseer.getConfig();
      const financialState = financialEngine.getState();

      res.json({
        status: "healthy",
        mode: systemMode,
        glyphCount: stats.totalGlyphs,
        overseerStrict: overseerConfig.strictMode,
        financialStability: financialState.stabilityScore,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error fetching health:", error);
      res.status(500).json({ status: "unhealthy", error: "Health check failed" });
    }
  });

  // ============================================
  // EVOLUTION ENGINE API (User-Gated)
  // ============================================

  app.get("/api/evolution/status", async (_req, res) => {
    try {
      const proposal = evolutionEngine.getCurrentProposal();
      const history = evolutionEngine.getEvolutionHistory();
      const version = evolutionEngine.getAppVersion();

      res.json({
        hasActiveProposal: !!proposal,
        currentProposal: proposal,
        historyCount: history.length,
        appVersion: version,
      });
    } catch (error) {
      console.error("Error fetching evolution status:", error);
      res.status(500).json({ error: "Failed to fetch evolution status" });
    }
  });

  app.post("/api/evolution/start", async (_req, res) => {
    try {
      const proposal = await evolutionEngine.startAnalysis();
      res.json(proposal);
    } catch (error) {
      console.error("Error starting analysis:", error);
      res.status(500).json({ error: "Failed to start analysis" });
    }
  });

  app.post("/api/evolution/analyze", async (_req, res) => {
    try {
      const analysis = await evolutionEngine.analyzeSystem();
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing system:", error);
      res.status(500).json({ error: "Failed to analyze system" });
    }
  });

  app.post("/api/evolution/select", async (req, res) => {
    try {
      const { improvementId } = req.body;
      if (!improvementId) {
        return res.status(400).json({ error: "improvementId required" });
      }
      const proposal = await evolutionEngine.selectImprovement(improvementId);
      if (!proposal) {
        return res.status(404).json({ error: "Improvement not found or no active proposal" });
      }
      res.json(proposal);
    } catch (error) {
      console.error("Error selecting improvement:", error);
      res.status(500).json({ error: "Failed to select improvement" });
    }
  });

  app.post("/api/evolution/approve", async (req, res) => {
    try {
      const { proposalId, approved, reason } = req.body;
      if (!proposalId || approved === undefined) {
        return res.status(400).json({ error: "proposalId and approved required" });
      }
      const proposal = await evolutionEngine.submitUserApproval(proposalId, approved, reason);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      res.json(proposal);
    } catch (error) {
      console.error("Error submitting approval:", error);
      res.status(500).json({ error: "Failed to submit approval" });
    }
  });

  app.post("/api/evolution/apply", async (req, res) => {
    try {
      const { proposalId } = req.body;
      if (!proposalId) {
        return res.status(400).json({ error: "proposalId required" });
      }
      const proposal = await evolutionEngine.applyEvolution(proposalId);
      if (!proposal) {
        return res.status(400).json({ error: "Cannot apply - proposal not approved or not found" });
      }
      res.json(proposal);
    } catch (error) {
      console.error("Error applying evolution:", error);
      res.status(500).json({ error: "Failed to apply evolution" });
    }
  });

  app.post("/api/evolution/back", async (_req, res) => {
    try {
      const newStage = evolutionEngine.goBack();
      const proposal = evolutionEngine.getCurrentProposal();
      res.json({ stage: newStage, proposal });
    } catch (error) {
      console.error("Error going back:", error);
      res.status(500).json({ error: "Failed to go back" });
    }
  });

  app.post("/api/evolution/cancel", async (_req, res) => {
    try {
      evolutionEngine.cancelProposal();
      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling proposal:", error);
      res.status(500).json({ error: "Failed to cancel proposal" });
    }
  });

  app.get("/api/evolution/history", async (_req, res) => {
    try {
      const history = evolutionEngine.getEvolutionHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  return httpServer;
}
