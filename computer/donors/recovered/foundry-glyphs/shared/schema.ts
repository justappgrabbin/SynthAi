import { pgTable, text, varchar, integer, bigint, timestamp, jsonb, bytea, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Quality states enum
export const qualityStates = ["draft", "tested", "production"] as const;
export type QualityState = typeof qualityStates[number];

// Glyph types enum
export const glyphTypes = ["fragment", "app", "asset"] as const;
export type GlyphType = typeof glyphTypes[number];

// Fragment kinds enum
export const fragmentKinds = ["component", "logic", "style", "asset"] as const;
export type FragmentKind = typeof fragmentKinds[number];

// Producer info
export const producerSchema = z.object({
  tool: z.string(),
  host: z.string(),
  user: z.string(),
});
export type Producer = z.infer<typeof producerSchema>;

// Origin info with lineage
export const originSchema = z.object({
  parents: z.array(z.string()).default([]),
  recipe: z.string().optional(),
});
export type Origin = z.infer<typeof originSchema>;

// Signature info
export const signatureSchema = z.object({
  alg: z.string(),
  keyId: z.string(),
  sig: z.string(),
}).optional();
export type Signature = z.infer<typeof signatureSchema>;

// Glyph catalog table
export const glyphs = pgTable("glyph", {
  id: text("id").primaryKey(), // blake3:<hex>
  schemaVersion: integer("schema_version").notNull().default(1),
  type: text("type").notNull().$type<GlyphType>(),
  name: text("name").notNull(),
  quality: text("quality").notNull().$type<QualityState>().default("draft"),
  producedAt: timestamp("produced_at").notNull().defaultNow(),
  producer: jsonb("producer").notNull().$type<Producer>(),
  origin: jsonb("origin").$type<Origin>(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  casSha256: text("cas_sha256").notNull(),
  casBucket: text("cas_bucket").notNull().default("default"),
  signAlg: text("sign_alg"),
  signKeyId: text("sign_key_id"),
  signSig: text("sign_sig"),
  language: text("language").default("ts"),
  kind: text("kind").$type<FragmentKind>(),
  entry: text("entry"),
  exports: jsonb("exports").$type<string[]>(),
  deps: jsonb("deps").$type<Record<string, string>>(),
});

// Lineage edges table
export const edges = pgTable("edge", {
  parentId: text("parent_id").notNull().references(() => glyphs.id),
  childId: text("child_id").notNull().references(() => glyphs.id),
  role: text("role").default("depends"),
}, (table) => ({
  pk: primaryKey({ columns: [table.parentId, table.childId] }),
  childIdx: index("edge_child_idx").on(table.childId),
}));

// Attestations / promotions table
export const attestations = pgTable("attestation", {
  id: varchar("id").primaryKey(),
  glyphId: text("glyph_id").notNull().references(() => glyphs.id),
  fromQuality: text("from_quality").$type<QualityState>(),
  toQuality: text("to_quality").$type<QualityState>(),
  signerKeyId: text("signer_key_id").notNull(),
  signature: text("signature").notNull(),
  evidenceUri: text("evidence_uri"),
  at: timestamp("at").notNull().defaultNow(),
});

// Recipes & locks table
export const recipes = pgTable("recipe", {
  glyphId: text("glyph_id").primaryKey().references(() => glyphs.id),
  body: jsonb("body").notNull(),
  lock: jsonb("lock").notNull(),
});

// Audit log table (append-only)
export const auditLogs = pgTable("audit", {
  id: varchar("id").primaryKey(),
  at: timestamp("at").notNull().defaultNow(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  glyphId: text("glyph_id"),
  payload: jsonb("payload"),
}, (table) => ({
  actorIdx: index("audit_actor_idx").on(table.actor),
}));

// Insert schemas
export const insertGlyphSchema = createInsertSchema(glyphs).omit({ id: true });
export const insertEdgeSchema = createInsertSchema(edges);
export const insertAttestationSchema = createInsertSchema(attestations).omit({ id: true, at: true });
export const insertRecipeSchema = createInsertSchema(recipes);
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, at: true });

// Types
export type Glyph = typeof glyphs.$inferSelect;
export type InsertGlyph = z.infer<typeof insertGlyphSchema>;
export type Edge = typeof edges.$inferSelect;
export type InsertEdge = z.infer<typeof insertEdgeSchema>;
export type Attestation = typeof attestations.$inferSelect;
export type InsertAttestation = z.infer<typeof insertAttestationSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Dashboard stats type
export interface DashboardStats {
  totalGlyphs: number;
  draftCount: number;
  testedCount: number;
  productionCount: number;
  fragmentCount: number;
  appCount: number;
  recentBuilds: number;
  recentPromotions: number;
}

// Lineage node for graph visualization
export interface LineageNode {
  id: string;
  name: string;
  type: GlyphType;
  quality: QualityState;
}

export interface LineageEdge {
  source: string;
  target: string;
  role: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE ENGINE - Human Design Alignment Scoring (Ra Uru Hu Canonical Math)
// ═══════════════════════════════════════════════════════════════════════════════

// Chart layer types
export const chartLayers = ["body", "mind", "heart"] as const;
export type ChartLayer = typeof chartLayers[number];

// Zodiac signs
export const zodiacSigns = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;
export type ZodiacSign = typeof zodiacSigns[number];

// Human Design Centers
export const hdCenters = [
  "Head", "Ajna", "Throat", "Identity", "Heart", "Spleen", "Sacral", "SolarPlexus", "Root"
] as const;
export type HDCenter = typeof hdCenters[number];

// Human Design Types
export const hdTypes = ["Manifestor", "Generator", "ManifestingGenerator", "Projector", "Reflector"] as const;
export type HDType = typeof hdTypes[number];

// HD Activation (Gate.Line.Color.Tone.Base)
export interface HDActivation {
  gate: number;       // 1-64
  line: number;       // 1-6
  color: number;      // 1-6
  tone: number;       // 1-6
  base: number;       // 1-5
  eclipticDeg: number; // 0-360
  sign: ZodiacSign;
  degree: number;
  minute: number;
  second: number;
}

// Birth data input
export interface BirthData {
  date: string;       // ISO date string
  time: string;       // HH:MM format
  timezone: string;   // e.g., "America/Los_Angeles"
  latitude: number;
  longitude: number;
  location: string;   // City, Country
}

// Natal Blueprint - Three chart layers
export interface NatalBlueprint {
  birthData: BirthData;
  body: ChartLayerData;   // Tropical
  mind: ChartLayerData;   // Sidereal (Fagan-Bradley)
  heart: ChartLayerData;  // Draconic
  hdType: HDType;
  definition: "Single" | "Split" | "TripleSplit" | "QuadrupleSplit" | "None";
  activatedChannels: number[];
  activatedCenters: HDCenter[];
}

// Chart layer data
export interface ChartLayerData {
  layer: ChartLayer;
  ayanamsa?: number;      // For sidereal
  nodeShift?: number;     // For draconic
  sun: HDActivation;
  moon: HDActivation;
  mercury: HDActivation;
  venus: HDActivation;
  mars: HDActivation;
  jupiter: HDActivation;
  saturn: HDActivation;
  uranus: HDActivation;
  neptune: HDActivation;
  pluto: HDActivation;
  northNode: HDActivation;
  southNode: HDActivation;
  ascendant: HDActivation;
  descendant: HDActivation;
  midheaven: HDActivation;
  imumCoeli: HDActivation;
}

// Field Misalignment Error Types
export interface MissingHarmonicNode {
  pairIdx: number;
  expected: number;
  actual: number;
  gap: number;
}

export interface ResonanceImbalance {
  bodies: [string, string];
  natalDiff: number;
  currentDiff: number;
  deviation: number;
}

export interface ChartDisorder {
  body: string;
  sidereal: number;
  tropical: number;
  draconic: number;
  variance: number;
  dominant?: ChartLayer;
}

// Field Diagnosis Result
export interface FieldDiagnosis {
  missingNodes: MissingHarmonicNode[];
  chargeImbalance: ResonanceImbalance[];
  chartDisorder: ChartDisorder[];
  coherenceScore: number;        // 0-100
  hdAlignment: number;           // 0-1
  iChingProbability: number;     // 0-1
  frictionFactor: number;        // 0-1
  resonanceScore: number;        // Calculated: (hdAlignment * iChingProbability) / frictionFactor
  approved: boolean;             // Score >= threshold
}

// Resonance Score Request
export interface ResonanceScoreRequest {
  birthData: BirthData;
  targetGlyphId?: string;        // Optional glyph to score alignment with
  groupMembers?: BirthData[];    // For group coherence scoring
}

// Resonance Score Response
export interface ResonanceScoreResponse {
  blueprint: NatalBlueprint;
  diagnosis: FieldDiagnosis;
  compositeSentence: string;
  correctionSentence?: string;
  recommendations: string[];
}

// Group Coherence Result
export interface GroupCoherence {
  members: NatalBlueprint[];
  sharedGates: number[];
  convergencePoints: Array<{
    gate: number;
    members: string[];
    layer: ChartLayer;
  }>;
  groupCoherenceScore: number;
  frictionPairs: Array<{
    member1: string;
    member2: string;
    frictionFactor: number;
    conflictingGates: number[];
  }>;
  synergyBonus: number;
  groupResonanceScore: number;
}

// I Ching Hexagram
export interface IChingHexagram {
  number: number;           // 1-64
  name: string;
  chineseName: string;
  lines: [boolean, boolean, boolean, boolean, boolean, boolean]; // 6 lines, yin=false, yang=true
  trigrams: {
    upper: string;
    lower: string;
  };
  meaning: string;
  hdGate: number;           // Corresponding HD gate
}

// Mandala Constants (Ra Uru Hu's original math)
export const MANDALA_CONSTANTS = {
  GATE_ARC: 5 + 37/60 + 30/3600,           // 5°37'30" per gate
  LINE_ARC: (5 + 37/60 + 30/3600) / 6,     // 0.9375° per line
  COLOR_ARC: (5 + 37/60 + 30/3600) / 36,   // 0.15625° per color
  TONE_ARC: (5 + 37/60 + 30/3600) / 216,   // 0.026041667° per tone
  BASE_ARC: (5 + 37/60 + 30/3600) / 1080,  // 0.005208333° per base
  FAGAN_BRADLEY_EPOCH: 1950,
  FAGAN_BRADLEY_BASE: 24 + 2/60 + 31/3600, // 24°02'31"
  PRECESSION_RATE: 50.2388475 / 3600,      // arcseconds/year to degrees
} as const;

// Gate sequence on the mandala (counter-clockwise from 0° Aries)
export const GATE_SEQUENCE: Array<{ start: number; gate: number }> = [
  { start: 0, gate: 25 }, { start: 3.875, gate: 17 }, { start: 9.5, gate: 21 },
  { start: 15.125, gate: 51 }, { start: 20.75, gate: 42 }, { start: 26.375, gate: 3 },
  { start: 32, gate: 27 }, { start: 37.625, gate: 24 }, { start: 43.25, gate: 2 },
  { start: 48.875, gate: 23 }, { start: 54.5, gate: 8 }, { start: 60.125, gate: 20 },
  { start: 65.75, gate: 16 }, { start: 71.375, gate: 35 }, { start: 77, gate: 45 },
  { start: 82.625, gate: 12 }, { start: 88.25, gate: 15 }, { start: 93.875, gate: 52 },
  { start: 99.5, gate: 39 }, { start: 105.125, gate: 53 }, { start: 110.75, gate: 62 },
  { start: 116.375, gate: 56 }, { start: 122, gate: 31 }, { start: 127.625, gate: 33 },
  { start: 133.25, gate: 7 }, { start: 138.875, gate: 4 }, { start: 144.5, gate: 29 },
  { start: 150.125, gate: 59 }, { start: 155.75, gate: 40 }, { start: 161.375, gate: 64 },
  { start: 167, gate: 47 }, { start: 172.625, gate: 6 }, { start: 178.25, gate: 46 },
  { start: 183.875, gate: 18 }, { start: 189.5, gate: 48 }, { start: 195.125, gate: 57 },
  { start: 200.75, gate: 32 }, { start: 206.375, gate: 50 }, { start: 212, gate: 28 },
  { start: 217.625, gate: 44 }, { start: 223.25, gate: 1 }, { start: 228.875, gate: 43 },
  { start: 234.5, gate: 14 }, { start: 240.125, gate: 34 }, { start: 245.75, gate: 9 },
  { start: 251.375, gate: 5 }, { start: 257, gate: 26 }, { start: 262.625, gate: 11 },
  { start: 268.25, gate: 10 }, { start: 273.875, gate: 58 }, { start: 279.5, gate: 38 },
  { start: 285.125, gate: 54 }, { start: 290.75, gate: 61 }, { start: 296.375, gate: 60 },
  { start: 302, gate: 41 }, { start: 307.625, gate: 19 }, { start: 313.25, gate: 13 },
  { start: 318.875, gate: 49 }, { start: 324.5, gate: 30 }, { start: 330.125, gate: 55 },
  { start: 335.75, gate: 37 }, { start: 341.375, gate: 63 }, { start: 347, gate: 22 },
  { start: 352.625, gate: 36 }, { start: 358.25, gate: 25 },
];

// Gate meanings for sentence generation
export const GATE_MEANINGS: Record<number, { name: string; theme: string; center: HDCenter }> = {
  1: { name: "Self-Expression", theme: "creative individuality", center: "Identity" },
  2: { name: "Direction", theme: "receptive knowing", center: "Identity" },
  3: { name: "Ordering", theme: "innovative mutation", center: "Sacral" },
  4: { name: "Answers", theme: "formulaic solutions", center: "Ajna" },
  5: { name: "Patterns", theme: "universal rhythms", center: "Sacral" },
  6: { name: "Friction", theme: "emotional conflict resolution", center: "SolarPlexus" },
  7: { name: "Role of the Self", theme: "logical leadership", center: "Identity" },
  8: { name: "Contribution", theme: "creative modeling", center: "Throat" },
  9: { name: "Focus", theme: "detailed concentration", center: "Sacral" },
  10: { name: "Behavior", theme: "self-love expression", center: "Identity" },
  11: { name: "Ideas", theme: "conceptual harmony", center: "Ajna" },
  12: { name: "Caution", theme: "articulated mutation", center: "Throat" },
  13: { name: "Listener", theme: "empathic gathering", center: "Identity" },
  14: { name: "Power Skills", theme: "abundant direction", center: "Sacral" },
  15: { name: "Extremes", theme: "rhythmic diversity", center: "Identity" },
  16: { name: "Skills", theme: "enthusiastic experimentation", center: "Throat" },
  17: { name: "Opinions", theme: "logical following", center: "Ajna" },
  18: { name: "Correction", theme: "judgmental perfection", center: "Spleen" },
  19: { name: "Wanting", theme: "sensitive approach", center: "Root" },
  20: { name: "Now", theme: "present contemplation", center: "Throat" },
  21: { name: "Hunter", theme: "controlling ego", center: "Heart" },
  22: { name: "Openness", theme: "emotional grace", center: "SolarPlexus" },
  23: { name: "Assimilation", theme: "verbal translation", center: "Throat" },
  24: { name: "Rationalization", theme: "mental return", center: "Ajna" },
  25: { name: "Spirit", theme: "innocent love", center: "Identity" },
  26: { name: "Taming Power", theme: "egoist salesmanship", center: "Heart" },
  27: { name: "Nourishment", theme: "caring preservation", center: "Sacral" },
  28: { name: "Game Player", theme: "purposeful risk", center: "Spleen" },
  29: { name: "Perseverance", theme: "committed saying yes", center: "Sacral" },
  30: { name: "Feelings", theme: "fiery desire", center: "SolarPlexus" },
  31: { name: "Influence", theme: "democratic leadership", center: "Throat" },
  32: { name: "Continuity", theme: "transformative endurance", center: "Spleen" },
  33: { name: "Privacy", theme: "reflective retreat", center: "Throat" },
  34: { name: "Power", theme: "pure sacral response", center: "Sacral" },
  35: { name: "Change", theme: "adventurous progress", center: "Throat" },
  36: { name: "Crisis", theme: "emotional inexperience", center: "SolarPlexus" },
  37: { name: "Friendship", theme: "family bargains", center: "SolarPlexus" },
  38: { name: "Fighter", theme: "stubborn opposition", center: "Root" },
  39: { name: "Provocation", theme: "emotional tension", center: "Root" },
  40: { name: "Aloneness", theme: "willful deliverance", center: "Heart" },
  41: { name: "Decrease", theme: "contracting fantasy", center: "Root" },
  42: { name: "Increase", theme: "completing cycles", center: "Sacral" },
  43: { name: "Insight", theme: "breakthrough awareness", center: "Ajna" },
  44: { name: "Alertness", theme: "pattern recognition", center: "Spleen" },
  45: { name: "Gatherer", theme: "monarchic gathering", center: "Throat" },
  46: { name: "Love of Body", theme: "serendipitous discovery", center: "Identity" },
  47: { name: "Realization", theme: "oppressive abstraction", center: "Ajna" },
  48: { name: "Depth", theme: "fearful inadequacy", center: "Spleen" },
  49: { name: "Revolution", theme: "principled rejection", center: "SolarPlexus" },
  50: { name: "Values", theme: "responsible guardianship", center: "Spleen" },
  51: { name: "Shock", theme: "competitive initiative", center: "Heart" },
  52: { name: "Stillness", theme: "concentrated inaction", center: "Root" },
  53: { name: "Beginnings", theme: "developmental pressure", center: "Root" },
  54: { name: "Ambition", theme: "driving ascension", center: "Root" },
  55: { name: "Spirit", theme: "emotional abundance", center: "SolarPlexus" },
  56: { name: "Stimulation", theme: "storytelling wanderer", center: "Throat" },
  57: { name: "Intuition", theme: "gentle penetration", center: "Spleen" },
  58: { name: "Vitality", theme: "joyous correction", center: "Root" },
  59: { name: "Sexuality", theme: "intimate dispersion", center: "Sacral" },
  60: { name: "Limitation", theme: "accepting mutation", center: "Root" },
  61: { name: "Mystery", theme: "inner truth pressure", center: "Head" },
  62: { name: "Details", theme: "careful expression", center: "Throat" },
  63: { name: "Doubt", theme: "logical questioning", center: "Head" },
  64: { name: "Confusion", theme: "mental pressure", center: "Head" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-EVOLUTION ENGINE - User-Gated Evolution System
// ═══════════════════════════════════════════════════════════════════════════════

// Evolution stages
export const evolutionStages = ["analyzing", "proposing", "awaiting_approval", "applying", "completed", "rejected"] as const;
export type EvolutionStage = typeof evolutionStages[number];

// Evolution types
export const evolutionTypes = ["feature", "ui", "performance", "component", "page", "integration"] as const;
export type EvolutionType = typeof evolutionTypes[number];

// Evolution priority
export const evolutionPriorities = ["critical", "high", "medium", "low"] as const;
export type EvolutionPriority = typeof evolutionPriorities[number];

// Proposed improvement
export interface ProposedImprovement {
  id: string;
  type: EvolutionType;
  priority: EvolutionPriority;
  title: string;
  description: string;
  benefit: string;
  implementation: string;
  estimatedComplexity: number;
  affectedComponents: string[];
  resonanceImpact: number;
}

// Evolution proposal
export interface EvolutionProposal {
  id: string;
  stage: EvolutionStage;
  createdAt: string;
  updatedAt: string;
  version: string;
  currentFeatures: string[];
  improvements: ProposedImprovement[];
  selectedImprovement?: ProposedImprovement;
  generatedCode?: string;
  overseerDecision?: {
    approved: boolean;
    resonanceScore: number;
    coherenceScore: number;
    reasoning: string[];
    frozen: boolean;
  };
  userApproval?: {
    approved: boolean;
    approvedAt?: string;
    rejectedAt?: string;
    reason?: string;
  };
  applicationResult?: {
    success: boolean;
    artifactId?: string;
    error?: string;
    appliedAt: string;
  };
}

// Evolution history entry
export interface EvolutionHistoryEntry {
  id: string;
  version: string;
  improvement: ProposedImprovement;
  appliedAt: string;
  artifactId: string;
  rollbackAvailable: boolean;
}

// Evolution analysis request
export interface EvolutionAnalysisRequest {
  targetScope?: "glyphs" | "pages" | "system" | "all";
  includeResonanceCheck: boolean;
}

// Evolution analysis response
export interface EvolutionAnalysisResponse {
  proposalId: string;
  stage: EvolutionStage;
  currentFeatures: string[];
  improvements: ProposedImprovement[];
  systemHealth: {
    totalComponents: number;
    testedComponents: number;
    productionComponents: number;
    resonanceAverage: number;
  };
}

// User approval request
export interface UserApprovalRequest {
  proposalId: string;
  improvementId: string;
  approved: boolean;
  reason?: string;
}

// Evolution application request
export interface EvolutionApplicationRequest {
  proposalId: string;
  improvementId: string;
  dryRun?: boolean;
}
