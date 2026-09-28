/**
 * ============================================================
 * KLEIN-MESH MULTI-GAME ENGINE + INGEST-GAPFILL SYSTEM
 * Complete exports — v5 with DISEMINER eyes
 * ============================================================
 */

// Core gap-filling engine (D1-D5)
export { IngestGapFillEngine, ImpulseIngestor, PolarityClassifier, WitnessEngine, ContextEngine, MeaningSynthesizer } from './core-engine';

// Klein-Mesh Multi-Game Engine (all 5 Klein papers)
export { KleinMeshGameEngine, CompGramCoder, DiseMinerEngine, AutolingGrammar, HistoricalChangeEngine } from './klein-mesh-game-engine';

// Sensory Input Adapter (DISEMINER's eyes)
export { SensoryInputAdapter, RawMeasurement, StructuredObservation, DetectedObject, DetectedRelation, DetectedChange } from './sensory-adapter';

// ATO Episodic Memory (Fayyaz et al. 2022)
export { AtoEngine, Hippocampus, Neocortex, AtoSwitchingLayer, AutopoieticGenerator, VectorQuantizer, PixelCNNGenerator } from './ato-engine';

// Klein 8 tools on MESSY substrate
export { KleinEngine, MessySubstrate, MessySymbol, MessyModule, WhoWhatWhereWhenWhy, DiseMinerModule, AutolingModule, AutoNovelModule, ProppLeviStraussModule, AnalogyMysticismModule, HistoricalChangeModule, CreativityModule } from './klein-full-toolkit';

// gameNgen adapter (honest mock)
export { GameNGenEngine, MockDiffusionBackend } from './gamengen-adapter';

// Pipeline orchestrator
export { IngestGapFillPipeline, PipelineConfig, DEFAULT_CONFIG, demo } from './pipeline';

// Types from core engine
export type { IngestedSignal, PolarityVector, SemanticNode, AnalogyMapping, GapReport, ContextField, GeneratedArtifact, WorldModel } from './core-engine';

// Types from Klein-Mesh
export type { GameContext, GameElement, GameCode, StemEntry, DependencyMatrices, DependencyLink, GrammarRule, GameAgent } from './klein-mesh-game-engine';

// Types from ATO
export type { EpisodicTrace, EpisodicContext, VQVAEConfig } from './ato-engine';

// Types from gameNgen adapter
export type { GameNGenFrame, FrameBuffer, DiffusionModelConfig } from './gamengen-adapter';
