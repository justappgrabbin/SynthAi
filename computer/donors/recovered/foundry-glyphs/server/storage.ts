import { 
  glyphs, edges, attestations, recipes, auditLogs,
  type Glyph, type InsertGlyph, 
  type Edge, type InsertEdge, 
  type Attestation, type InsertAttestation, 
  type Recipe, type InsertRecipe, 
  type AuditLog, type InsertAuditLog,
  type DashboardStats, type LineageGraph
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Glyphs
  getGlyphs(): Promise<Glyph[]>;
  getGlyph(id: string): Promise<Glyph | undefined>;
  createGlyph(id: string, glyph: InsertGlyph): Promise<Glyph>;
  updateGlyph(id: string, glyph: Partial<InsertGlyph>): Promise<Glyph | undefined>;
  deleteGlyph(id: string): Promise<boolean>;

  // Edges (lineage)
  getEdges(): Promise<Edge[]>;
  getEdgesByGlyph(glyphId: string): Promise<Edge[]>;
  createEdge(edge: InsertEdge): Promise<Edge>;

  // Attestations
  getAttestations(): Promise<Attestation[]>;
  getAttestationsByGlyph(glyphId: string): Promise<Attestation[]>;
  createAttestation(attestation: InsertAttestation): Promise<Attestation>;

  // Recipes
  getRecipes(): Promise<Recipe[]>;
  getRecipe(glyphId: string): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;

  // Audit logs
  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Stats & Lineage
  getStats(): Promise<DashboardStats>;
  getLineageGraph(): Promise<LineageGraph>;
}

export class DatabaseStorage implements IStorage {
  // Glyphs
  async getGlyphs(): Promise<Glyph[]> {
    return db.select().from(glyphs).orderBy(desc(glyphs.producedAt));
  }

  async getGlyph(id: string): Promise<Glyph | undefined> {
    const [glyph] = await db.select().from(glyphs).where(eq(glyphs.id, id));
    return glyph || undefined;
  }

  async createGlyph(id: string, glyph: InsertGlyph): Promise<Glyph> {
    const [created] = await db.insert(glyphs).values({ id, ...glyph }).returning();
    return created;
  }

  async updateGlyph(id: string, updates: Partial<InsertGlyph>): Promise<Glyph | undefined> {
    const [updated] = await db.update(glyphs).set(updates).where(eq(glyphs.id, id)).returning();
    return updated || undefined;
  }

  async deleteGlyph(id: string): Promise<boolean> {
    const result = await db.delete(glyphs).where(eq(glyphs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Edges
  async getEdges(): Promise<Edge[]> {
    return db.select().from(edges);
  }

  async getEdgesByGlyph(glyphId: string): Promise<Edge[]> {
    return db.select().from(edges).where(
      or(eq(edges.parentId, glyphId), eq(edges.childId, glyphId))
    );
  }

  async createEdge(edge: InsertEdge): Promise<Edge> {
    const [created] = await db.insert(edges).values(edge).returning();
    return created;
  }

  // Attestations
  async getAttestations(): Promise<Attestation[]> {
    return db.select().from(attestations).orderBy(desc(attestations.at));
  }

  async getAttestationsByGlyph(glyphId: string): Promise<Attestation[]> {
    return db.select().from(attestations).where(eq(attestations.glyphId, glyphId));
  }

  async createAttestation(attestation: InsertAttestation): Promise<Attestation> {
    const id = randomUUID();
    const [created] = await db.insert(attestations).values({ id, ...attestation }).returning();
    return created;
  }

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    return db.select().from(recipes);
  }

  async getRecipe(glyphId: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.glyphId, glyphId));
    return recipe || undefined;
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [created] = await db.insert(recipes).values(recipe).returning();
    return created;
  }

  // Audit logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.at));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const [created] = await db.insert(auditLogs).values({ id, ...log }).returning();
    return created;
  }

  // Stats
  async getStats(): Promise<DashboardStats> {
    const allGlyphs = await this.getGlyphs();
    const recentAttestations = await db.select().from(attestations).orderBy(desc(attestations.at)).limit(50);
    
    return {
      totalGlyphs: allGlyphs.length,
      draftCount: allGlyphs.filter(g => g.quality === "draft").length,
      testedCount: allGlyphs.filter(g => g.quality === "tested").length,
      productionCount: allGlyphs.filter(g => g.quality === "production").length,
      fragmentCount: allGlyphs.filter(g => g.type === "fragment").length,
      appCount: allGlyphs.filter(g => g.type === "app").length,
      recentBuilds: allGlyphs.filter(g => {
        const produced = new Date(g.producedAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return produced > weekAgo;
      }).length,
      recentPromotions: recentAttestations.filter(a => a.toQuality === "production").length,
    };
  }

  // Lineage graph for visualization
  async getLineageGraph(): Promise<LineageGraph> {
    const allGlyphs = await this.getGlyphs();
    const allEdges = await this.getEdges();

    return {
      nodes: allGlyphs.map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        quality: g.quality,
      })),
      edges: allEdges.map(e => ({
        source: e.parentId,
        target: e.childId,
        role: e.role || "depends",
      })),
    };
  }
}

export const storage = new DatabaseStorage();
