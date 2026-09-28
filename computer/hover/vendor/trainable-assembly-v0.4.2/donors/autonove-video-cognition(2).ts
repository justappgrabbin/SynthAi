/**
 * autonove-video-cognition.ts
 * Complete Autopoietic Video Cognition Loop
 * 
 * Universal Grammar: state → relation → tension → resolution → recursion
 * Dimensional Stack: D1(impulse) → D2(polarity) → D3(witness) → D4(context) → D5(meaning)
 * 
 * Stages:
 *   1. PERCEIVE   (RetinoSim)     — D1→D2: Biological event-based filtering
 *   2. GENERATE   (Helios)        — D5→D1/D2: Intent to raw video
 *   3. TRANSFORM  (OmniTransfer)  — D2→D2: Reference-guided restyling
 *   4. PACKAGE    (short-video)   — D3→D4: Narrative composition
 *   5. SYNCHRONIZE(ly2video)      — D2→D4: Symbol-to-temporal binding
 *   6. UNDERSTAND (video_annotation) — D4→D5: Symbolic knowledge extraction
 *   7. FEEDBACK   → tunes PERCEIVE filters (closed loop)
 */

import { Retina, EventPacket, PerceptionConfig, DEFAULT_PERCEPTION_CONFIG } from './autonove-perception';

// ─────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────

export type DimensionalPhase = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

export interface CognitiveState {
  phase: DimensionalPhase;
  data: unknown;
  timestamp: number;
  resonance: number;      // 0-1, coherence measure
  entropy: number;        // 0-1, uncertainty measure
  lineage: string[];      // trace of transformations
}

export interface StageResult {
  success: boolean;
  output: CognitiveState;
  feedback: FeedbackSignal;
  latencyMs: number;
}

export interface FeedbackSignal {
  targetStage: string;
  adjustment: Record<string, number>;
  intensity: number;      // 0-1, how strongly to apply
  reason: string;
}

export interface GrowthRule {
  id: string;
  name: string;
  sourceRepo: string;
  problem: string;
  solution: string;
  dimensionalMapping: Record<string, DimensionalPhase>;
  spawnConditions: {
    minResonance: number;
    maxEntropy: number;
    requiredStages: string[];
  };
  biologicalInspiration?: string;
  mathematicalFormulation?: string;
}

// ─────────────────────────────────────────────────────────────
// Stage Interface
// ─────────────────────────────────────────────────────────────

export interface CognitiveStage {
  readonly name: string;
  readonly inputDimension: DimensionalPhase;
  readonly outputDimension: DimensionalPhase;
  execute(input: CognitiveState, context: LoopContext): Promise<StageResult>;
  applyFeedback(feedback: FeedbackSignal): void;
  getMetrics(): StageMetrics;
}

export interface StageMetrics {
  totalExecutions: number;
  meanResonance: number;
  meanLatencyMs: number;
  feedbackCount: number;
}

export interface LoopContext {
  intent: string;
  reference?: unknown;
  constraints: {
    maxDurationMs: number;
    targetResonance: number;
    maxEntropy: number;
  };
  memory: CognitiveMemory;
}

export interface CognitiveMemory {
  events: EventPacket[];
  states: CognitiveState[];
  rules: GrowthRule[];
  getResonanceHistory(): number[];
  getEntropyHistory(): number[];
}

// ─────────────────────────────────────────────────────────────
// Stage 1: PERCEIVE (RetinoSim-inspired)
// ─────────────────────────────────────────────────────────────

export class PerceiveStage implements CognitiveStage {
  readonly name = 'PERCEIVE';
  readonly inputDimension: DimensionalPhase = 'D1';
  readonly outputDimension: DimensionalPhase = 'D2';

  private retina: Retina;
  private metrics: StageMetrics = {
    totalExecutions: 0,
    meanResonance: 0,
    meanLatencyMs: 0,
    feedbackCount: 0,
  };
  private configOverride: Partial<PerceptionConfig> = {};

  constructor(config?: PerceptionConfig) {
    this.retina = new Retina(config || DEFAULT_PERCEPTION_CONFIG);
  }

  async execute(input: CognitiveState, context: LoopContext): Promise<StageResult> {
    const start = performance.now();

    // Input is raw frame data (ImageData or Float32Array)
    const frame = input.data as ImageData | Float32Array;
    const timestamp = input.timestamp;

    // Apply any feedback-driven config adjustments
    const config = this.mergeConfig();
    if (Object.keys(this.configOverride).length > 0) {
      this.retina = new Retina(config);
    }

    // Biological perception: frame → sparse events
    const events = this.retina.perceive(frame, timestamp);

    // Resonance: how much does this perception matter?
    const resonance = this.retina.computeResonance();
    const entropy = this.computeEntropy(events);

    const latency = performance.now() - start;
    this.updateMetrics(resonance, latency);

    const output: CognitiveState = {
      phase: 'D2',
      data: { events, stats: this.retina.getStatistics() },
      timestamp,
      resonance,
      entropy,
      lineage: [...input.lineage, 'PERCEIVE'],
    };

    // Feedback: if entropy is too high, tighten filters; too low, loosen them
    const feedback = this.generateFeedback(output, context);

    return { success: true, output, feedback, latencyMs: latency };
  }

  private mergeConfig(): PerceptionConfig {
    const base = DEFAULT_PERCEPTION_CONFIG;
    return {
      ...base,
      ...this.configOverride,
      opl: { ...base.opl, ...(this.configOverride.opl || {}) },
      ipl: { ...base.ipl, ...(this.configOverride.ipl || {}) },
      gc: { ...base.gc, ...(this.configOverride.gc || {}) },
    } as PerceptionConfig;
  }

  private computeEntropy(events: EventPacket[]): number {
    if (events.length === 0) return 1;
    // Spatial entropy: how evenly distributed are events?
    const gridSize = 8;
    const bins = new Array(gridSize * gridSize).fill(0);
    const w = this.retina['config'].width / gridSize;
    const h = this.retina['config'].height / gridSize;
    for (const ev of events) {
      const gx = Math.min(gridSize - 1, Math.floor(ev.x / w));
      const gy = Math.min(gridSize - 1, Math.floor(ev.y / h));
      bins[gy * gridSize + gx]++;
    }
    let entropy = 0;
    const total = events.length;
    for (const count of bins) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy / Math.log2(gridSize * gridSize); // normalize
  }

  private generateFeedback(output: CognitiveState, context: LoopContext): FeedbackSignal {
    const adjustments: Record<string, number> = {};
    let reason = '';

    if (output.entropy > context.constraints.maxEntropy) {
      // Too chaotic: increase spatial filtering, raise thresholds
      adjustments['opl.spatialFilterStrength'] = 1.2;
      adjustments['gc.thresholdMean'] = 1.1;
      reason = 'High entropy: tightening perceptual filters';
    } else if (output.resonance < context.constraints.targetResonance * 0.5) {
      // Too sparse: lower thresholds, increase gain
      adjustments['opl.gain'] = 1.3;
      adjustments['gc.thresholdMean'] = 0.8;
      reason = 'Low resonance: sensitizing perceptual frontend';
    } else if (output.resonance > context.constraints.targetResonance * 1.5) {
      // Too dense: raise thresholds
      adjustments['gc.thresholdMean'] = 1.2;
      reason = 'Over-saturation: desensitizing perceptual frontend';
    }

    return {
      targetStage: 'PERCEIVE',
      adjustment: adjustments,
      intensity: Math.abs(output.entropy - 0.5) * 2,
      reason,
    };
  }

  private updateMetrics(resonance: number, latency: number) {
    const n = this.metrics.totalExecutions;
    this.metrics.meanResonance = (this.metrics.meanResonance * n + resonance) / (n + 1);
    this.metrics.meanLatencyMs = (this.metrics.meanLatencyMs * n + latency) / (n + 1);
    this.metrics.totalExecutions++;
  }

  applyFeedback(feedback: FeedbackSignal): void {
    if (feedback.targetStage !== this.name) return;
    this.metrics.feedbackCount++;

    // Parse adjustments into configOverride
    for (const [key, value] of Object.entries(feedback.adjustment)) {
      const parts = key.split('.');
      if (parts[0] === 'opl') {
        this.configOverride.opl = { ...this.configOverride.opl, [parts[1]]: value };
      } else if (parts[0] === 'ipl') {
        this.configOverride.ipl = { ...this.configOverride.ipl, [parts[1]]: value };
      } else if (parts[0] === 'gc') {
        this.configOverride.gc = { ...this.configOverride.gc, [parts[1]]: value };
      }
    }
  }

  getMetrics(): StageMetrics {
    return { ...this.metrics };
  }
}

// ─────────────────────────────────────────────────────────────
// Stage 2: GENERATE (Helios-inspired)
// Intent → Raw Video
// External integration: calls Helios or similar diffusion model
// ─────────────────────────────────────────────────────────────

export class GenerateStage implements CognitiveStage {
  readonly name = 'GENERATE';
  readonly inputDimension: DimensionalPhase = 'D5';
  readonly outputDimension: DimensionalPhase = 'D1';

  private metrics: StageMetrics = {
    totalExecutions: 0, meanResonance: 0, meanLatencyMs: 0, feedbackCount: 0,
  };
  private generatorCallback?: (intent: string, config: unknown) => Promise<unknown>;

  constructor(generator?: (intent: string, config: unknown) => Promise<unknown>) {
    this.generatorCallback = generator;
  }

  async execute(input: CognitiveState, context: LoopContext): Promise<StageResult> {
    const start = performance.now();

    // Input is intent (D5: meaning)
    const intent = input.data as string || context.intent;

    // Call external generator (Helios, or mock)
    let videoData: unknown;
    if (this.generatorCallback) {
      videoData = await this.generatorCallback(intent, { 
        numFrames: 240, 
        fps: 24,
        guidanceScale: 1.0 
      });
    } else {
      // Mock: return placeholder
      videoData = { type: 'video', intent, frames: 240, mock: true };
    }

    const latency = performance.now() - start;

    // Resonance: how well does output match intent?
    // In real system: CLIP-style alignment score
    const resonance = 0.7 + Math.random() * 0.2;
    const entropy = 0.5; // generation is structured but uncertain

    const output: CognitiveState = {
      phase: 'D1',
      data: videoData,
      timestamp: input.timestamp,
      resonance,
      entropy,
      lineage: [...input.lineage, 'GENERATE'],
    };

    const feedback: FeedbackSignal = {
      targetStage: 'GENERATE',
      adjustment: {},
      intensity: 0,
      reason: 'Generation complete',
    };

    this.updateMetrics(resonance, latency);
    return { success: true, output, feedback, latencyMs: latency };
  }

  applyFeedback(feedback: FeedbackSignal): void {
    this.metrics.feedbackCount++;
  }

  getMetrics(): StageMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(resonance: number, latency: number) {
    const n = this.metrics.totalExecutions;
    this.metrics.meanResonance = (this.metrics.meanResonance * n + resonance) / (n + 1);
    this.metrics.meanLatencyMs = (this.metrics.meanLatencyMs * n + latency) / (n + 1);
    this.metrics.totalExecutions++;
  }
}

// ─────────────────────────────────────────────────────────────
// Stage 3: TRANSFORM (OmniTransfer-inspired)
// Reference-guided property transfer
// ─────────────────────────────────────────────────────────────

export class TransformStage implements CognitiveStage {
  readonly name = 'TRANSFORM';
  readonly inputDimension: DimensionalPhase = 'D2';
  readonly outputDimension: DimensionalPhase = 'D2';

  private metrics: StageMetrics = {
    totalExecutions: 0, meanResonance: 0, meanLatencyMs: 0, feedbackCount: 0,
  };
  private transformCallback?: (input: unknown, reference: unknown, mode: string) => Promise<unknown>;

  constructor(transformer?: (input: unknown, reference: unknown, mode: string) => Promise<unknown>) {
    this.transformCallback = transformer;
  }

  async execute(input: CognitiveState, context: LoopContext): Promise<StageResult> {
    const start = performance.now();

    const videoData = input.data;
    const reference = context.reference;
    const mode = 'style'; // or 'motion', 'camera', 'id', 'effect'

    let transformed: unknown;
    if (this.transformCallback && reference) {
      transformed = await this.transformCallback(videoData, reference, mode);
    } else {
      transformed = videoData;
    }

    const latency = performance.now() - start;
    const resonance = input.resonance * 0.95; // slight degradation per transform
    const entropy = input.entropy * 1.05;  // slight increase

    const output: CognitiveState = {
      phase: 'D2',
      data: transformed,
      timestamp: input.timestamp,
      resonance,
      entropy,
      lineage: [...input.lineage, 'TRANSFORM'],
    };

    const feedback: FeedbackSignal = {
      targetStage: 'TRANSFORM',
      adjustment: {},
      intensity: 0,
      reason: 'Transform applied',
    };

    this.updateMetrics(resonance, latency);
    return { success: true, output, feedback, latencyMs: latency };
  }

  applyFeedback(feedback: FeedbackSignal): void {
    this.metrics.feedbackCount++;
  }

  getMetrics(): StageMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(resonance: number, latency: number) {
    const n = this.metrics.totalExecutions;
    this.metrics.meanResonance = (this.metrics.meanResonance * n + resonance) / (n + 1);
    this.metrics.meanLatencyMs = (this.metrics.meanLatencyMs * n + latency) / (n + 1);
    this.metrics.totalExecutions++;
  }
}

// ─────────────────────────────────────────────────────────────
// Stage 4: PACKAGE (short-video-maker-inspired)
// Narrative composition: TTS + captions + music + footage
// ─────────────────────────────────────────────────────────────

export interface Scene {
  text: string;
  searchTerms: string[];
}

export interface PackageConfig {
  scenes: Scene[];
  music: string;
  voice: string;
  captionPosition: 'top' | 'center' | 'bottom';
  orientation: 'portrait' | 'landscape';
  paddingBack: number;
}

export class PackageStage implements CognitiveStage {
  readonly name = 'PACKAGE';
  readonly inputDimension: DimensionalPhase = 'D3';
  readonly outputDimension: DimensionalPhase = 'D4';

  private metrics: StageMetrics = {
    totalExecutions: 0, meanResonance: 0, meanLatencyMs: 0, feedbackCount: 0,
  };
  private packagerCallback?: (config: PackageConfig) => Promise<unknown>;

  constructor(packager?: (config: PackageConfig) => Promise<unknown>) {
    this.packagerCallback = packager;
  }

  async execute(input: CognitiveState, context: LoopContext): Promise<StageResult> {
    const start = performance.now();

    // Input is structured narrative intent (D3: witness/observer)
    const narrative = input.data as PackageConfig || {
      scenes: [{ text: context.intent, searchTerms: ['nature'] }],
      music: 'chill',
      voice: 'af_heart',
      captionPosition: 'bottom',
      orientation: 'portrait',
      paddingBack: 1500,
    };

    let packaged: unknown;
    if (this.packagerCallback) {
      packaged = await this.packagerCallback(narrative);
    } else {
      packaged = { type: 'packaged_video', config: narrative, mock: true };
    }

    const latency = performance.now() - start;
    const resonance = 0.75;
    const entropy = 0.4;

    const output: CognitiveState = {
      phase: 'D4',
      data: packaged,
      timestamp: input.timestamp,
      resonance,
      entropy,
      lineage: [...input.lineage, 'PACKAGE'],
    };

    const feedback: FeedbackSignal = {
      targetStage: 'PACKAGE',
      adjustment: {},
      intensity: 0,
      reason: 'Packaging complete',
    };

    this.updateMetrics(resonance, latency);
    return { success: true, output, feedback, latencyMs: latency };
  }

  applyFeedback(feedback: FeedbackSignal): void {
    this.metrics.feedbackCount++;
  }

  getMetrics(): StageMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(resonance: number, latency: number) {
    const n = this.metrics.totalExecutions;
    this.metrics.meanResonance = (this.metrics.meanResonance * n + resonance) / (n + 1);
    this.metrics.meanLatencyMs = (this.metrics.meanLatencyMs * n + latency) / (n + 1);
    this.metrics.totalExecutions++;
  }
}

// ─────────────────────────────────────────────────────────────
// Stage 5: SYNCHRONIZE (ly2video-inspired)
// Symbol-to-temporal binding: align symbolic structure with continuous time
// ─────────────────────────────────────────────────────────────

export interface SyncPoint {
  timeMs: number;
  symbol: string;
  confidence: number;
}

export class SynchronizeStage implements CognitiveStage {
  readonly name = 'SYNCHRONIZE';
  readonly inputDimension: DimensionalPhase = 'D2';
  readonly outputDimension: DimensionalPhase = 'D4';

  private metrics: StageMetrics = {
    totalExecutions: 0, meanResonance: 0, meanLatencyMs: 0, feedbackCount: 0,
  };
  private syncPoints: SyncPoint[] = [];

  async execute(input: CognitiveState, context: LoopContext): Promise<StageResult> {
    const start = performance.now();

    // Input is video data with symbolic structure (e.g., score, script)
    const videoData = input.data as { symbols?: string[]; durationMs?: number };
    const symbols = videoData.symbols || [];
    const duration = videoData.durationMs || 60000;

    // Elastic synchronization: distribute symbols across time
    // With tempo rubato support: non-uniform distribution based on symbol importance
    this.syncPoints = this.computeSyncPoints(symbols, duration);

    const latency = performance.now() - start;
    const resonance = this.computeSyncResonance();
    const entropy = symbols.length > 0 ? 1 / symbols.length : 1;

    const output: CognitiveState = {
      phase: 'D4',
      data: { syncPoints: this.syncPoints, duration },
      timestamp: input.timestamp,
      resonance,
      entropy,
      lineage: [...input.lineage, 'SYNCHRONIZE'],
    };

    const feedback: FeedbackSignal = {
      targetStage: 'SYNCHRONIZE',
      adjustment: {},
      intensity: 0,
      reason: 'Synchronization complete',
    };

    this.updateMetrics(resonance, latency);
    return { success: true, output, feedback, latencyMs: latency };
  }

  private computeSyncPoints(symbols: string[], duration: number): SyncPoint[] {
    const points: SyncPoint[] = [];
    const n = symbols.length;
    if (n === 0) return points;

    // Non-uniform distribution: important symbols get more time
    // Importance estimated by symbol length (proxy for complexity)
    const weights = symbols.map(s => Math.max(1, s.length));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let accumulated = 0;

    for (let i = 0; i < n; i++) {
      const proportion = weights[i] / totalWeight;
      const timeMs = (accumulated + proportion / 2) * duration;
      accumulated += proportion;
      points.push({
        timeMs,
        symbol: symbols[i],
        confidence: Math.min(1, weights[i] / 10),
      });
    }

    return points;
  }

  private computeSyncResonance(): number {
    if (this.syncPoints.length < 2) return 0.5;
    // Measure temporal coherence: are sync points well-distributed?
    const gaps = [];
    for (let i = 1; i < this.syncPoints.length; i++) {
      gaps.push(this.syncPoints[i].timeMs - this.syncPoints[i - 1].timeMs);
    }
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, g) => sum + (g - meanGap) ** 2, 0) / gaps.length;
    const cv = Math.sqrt(variance) / meanGap; // coefficient of variation
    return Math.max(0, 1 - cv); // lower variance = higher resonance
  }

  applyFeedback(feedback: FeedbackSignal): void {
    this.metrics.feedbackCount++;
  }

  getMetrics(): StageMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(resonance: number, latency: number) {
    const n = this.metrics.totalExecutions;
    this.metrics.meanResonance = (this.metrics.meanResonance * n + resonance) / (n + 1);
    this.metrics.meanLatencyMs = (this.metrics.meanLatencyMs * n + latency) / (n + 1);
    this.metrics.totalExecutions++;
  }
}

// ─────────────────────────────────────────────────────────────
// Stage 6: UNDERSTAND (video_annotation-inspired)
// Perceptual → Symbolic extraction
// ─────────────────────────────────────────────────────────────

export interface KnowledgeTriple {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source: string; // which frame/video segment
}

export class UnderstandStage implements CognitiveStage {
  readonly name = 'UNDERSTAND';
  readonly inputDimension: DimensionalPhase = 'D4';
  readonly outputDimension: DimensionalPhase = 'D5';

  private metrics: StageMetrics = {
    totalExecutions: 0, meanResonance: 0, meanLatencyMs: 0, feedbackCount: 0,
  };
  private extractorCallback?: (videoData: unknown) => Promise<KnowledgeTriple[]>;

  constructor(extractor?: (videoData: unknown) => Promise<KnowledgeTriple[]>) {
    this.extractorCallback = extractor;
  }

  async execute(input: CognitiveState, context: LoopContext): Promise<StageResult> {
    const start = performance.now();

    const videoData = input.data;

    let triples: KnowledgeTriple[];
    if (this.extractorCallback) {
      triples = await this.extractorCallback(videoData);
    } else {
      // Mock extraction: parse intent into simple triples
      triples = this.mockExtract(context.intent);
    }

    const latency = performance.now() - start;
    const resonance = triples.reduce((sum, t) => sum + t.confidence, 0) / Math.max(1, triples.length);
    const entropy = 1 - resonance;

    const output: CognitiveState = {
      phase: 'D5',
      data: { triples, knowledgeGraph: this.buildGraph(triples) },
      timestamp: input.timestamp,
      resonance,
      entropy,
      lineage: [...input.lineage, 'UNDERSTAND'],
    };

    // Critical feedback: feed understanding back to perception filters
    const feedback: FeedbackSignal = {
      targetStage: 'PERCEIVE',
      adjustment: this.derivePerceptualAdjustments(triples),
      intensity: resonance,
      reason: `Extracted ${triples.length} triples with resonance ${resonance.toFixed(2)}`,
    };

    this.updateMetrics(resonance, latency);
    return { success: true, output, feedback, latencyMs: latency };
  }

  private mockExtract(intent: string): KnowledgeTriple[] {
    // Simple NLP-like extraction for demonstration
    const words = intent.split(/\s+/);
    const triples: KnowledgeTriple[] = [];
    if (words.length >= 3) {
      triples.push({
        subject: words[0],
        predicate: words[1],
        object: words.slice(2).join(' '),
        confidence: 0.6,
        source: 'intent-parse',
      });
    }
    return triples;
  }

  private buildGraph(triples: KnowledgeTriple[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const t of triples) {
      if (!graph[t.subject]) graph[t.subject] = [];
      graph[t.subject].push(`${t.predicate} → ${t.object}`);
    }
    return graph;
  }

  private derivePerceptualAdjustments(triples: KnowledgeTriple[]): Record<string, number> {
    // If we extracted motion-related triples, sensitize temporal filters
    const hasMotion = triples.some(t => 
      t.predicate.includes('move') || t.object.includes('moving')
    );
    if (hasMotion) {
      return { 'ipl.temporalHighPassDecay': 0.7, 'opl.gain': 1.2 };
    }
    return {};
  }

  applyFeedback(feedback: FeedbackSignal): void {
    this.metrics.feedbackCount++;
  }

  getMetrics(): StageMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(resonance: number, latency: number) {
    const n = this.metrics.totalExecutions;
    this.metrics.meanResonance = (this.metrics.meanResonance * n + resonance) / (n + 1);
    this.metrics.meanLatencyMs = (this.metrics.meanLatencyMs * n + latency) / (n + 1);
    this.metrics.totalExecutions++;
  }
}

// ─────────────────────────────────────────────────────────────
// Feedback Controller
// Routes feedback signals to target stages and manages loop closure
// ─────────────────────────────────────────────────────────────

export class FeedbackController {
  private stages: Map<string, CognitiveStage> = new Map();
  private feedbackHistory: FeedbackSignal[] = [];
  private resonanceHistory: number[] = [];
  private entropyHistory: number[] = [];

  registerStage(stage: CognitiveStage): void {
    this.stages.set(stage.name, stage);
  }

  async processFeedback(signal: FeedbackSignal): Promise<void> {
    this.feedbackHistory.push(signal);
    const stage = this.stages.get(signal.targetStage);
    if (stage) {
      stage.applyFeedback(signal);
    }
  }

  recordState(state: CognitiveState): void {
    this.resonanceHistory.push(state.resonance);
    this.entropyHistory.push(state.entropy);
  }

  getLoopHealth(): {
    meanResonance: number;
    meanEntropy: number;
    feedbackCount: number;
    isStable: boolean;
  } {
    const r = this.resonanceHistory;
    const e = this.entropyHistory;
    const meanR = r.length > 0 ? r.reduce((a, b) => a + b, 0) / r.length : 0;
    const meanE = e.length > 0 ? e.reduce((a, b) => a + b, 0) / e.length : 0;
    return {
      meanResonance: meanR,
      meanEntropy: meanE,
      feedbackCount: this.feedbackHistory.length,
      isStable: meanR > 0.6 && meanE < 0.5,
    };
  }

  getFeedbackHistory(): readonly FeedbackSignal[] {
    return this.feedbackHistory;
  }
}

// ─────────────────────────────────────────────────────────────
// Cognitive Memory
// ─────────────────────────────────────────────────────────────

export class CognitiveMemoryImpl implements CognitiveMemory {
  events: EventPacket[] = [];
  states: CognitiveState[] = [];
  rules: GrowthRule[] = [];

  addEvent(event: EventPacket): void {
    this.events.push(event);
  }

  addState(state: CognitiveState): void {
    this.states.push(state);
  }

  addRule(rule: GrowthRule): void {
    this.rules.push(rule);
  }

  getResonanceHistory(): number[] {
    return this.states.map(s => s.resonance);
  }

  getEntropyHistory(): number[] {
    return this.states.map(s => s.entropy);
  }

  getAttractorSignature(): { meanResonance: number; resonanceVariance: number; dominantPhase: string } {
    const rh = this.getResonanceHistory();
    const meanR = rh.length > 0 ? rh.reduce((a, b) => a + b, 0) / rh.length : 0;
    const varR = rh.length > 0 ? rh.reduce((sum, r) => sum + (r - meanR) ** 2, 0) / rh.length : 0;

    const phaseCounts: Record<string, number> = {};
    for (const s of this.states) {
      phaseCounts[s.phase] = (phaseCounts[s.phase] || 0) + 1;
    }
    let dominantPhase = 'D1';
    let maxCount = 0;
    for (const [phase, count] of Object.entries(phaseCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantPhase = phase;
      }
    }

    return { meanResonance: meanR, resonanceVariance: varR, dominantPhase };
  }
}

// ─────────────────────────────────────────────────────────────
// Main Orchestrator: AutonoveVideoCognition
// ─────────────────────────────────────────────────────────────

export interface LoopResult {
  finalState: CognitiveState;
  allStates: CognitiveState[];
  feedbackSignals: FeedbackSignal[];
  health: ReturnType<FeedbackController['getLoopHealth']>;
  executionTimeMs: number;
  iterations: number;
}

export class AutonoveVideoCognition {
  private stages: CognitiveStage[];
  private feedbackController: FeedbackController;
  private memory: CognitiveMemoryImpl;
  private maxIterations: number;
  private convergenceThreshold: number;

  constructor(options?: {
    maxIterations?: number;
    convergenceThreshold?: number;
    perceiveConfig?: PerceptionConfig;
    generator?: (intent: string, config: unknown) => Promise<unknown>;
    transformer?: (input: unknown, reference: unknown, mode: string) => Promise<unknown>;
    packager?: (config: PackageConfig) => Promise<unknown>;
    extractor?: (videoData: unknown) => Promise<KnowledgeTriple[]>;
  }) {
    this.maxIterations = options?.maxIterations || 3;
    this.convergenceThreshold = options?.convergenceThreshold || 0.85;
    this.memory = new CognitiveMemoryImpl();
    this.feedbackController = new FeedbackController();

    const perceive = new PerceiveStage(options?.perceiveConfig);
    const generate = new GenerateStage(options?.generator);
    const transform = new TransformStage(options?.transformer);
    const package_ = new PackageStage(options?.packager);
    const synchronize = new SynchronizeStage();
    const understand = new UnderstandStage(options?.extractor);

    this.stages = [perceive, generate, transform, package_, synchronize, understand];

    for (const stage of this.stages) {
      this.feedbackController.registerStage(stage);
    }
  }

  /**
   * Run the full autopoietic loop.
   * 
   * Universal Grammar execution:
   *   state → relation → tension → resolution → recursion
   */
  async runLoop(
    intent: string,
    initialFrame?: ImageData | Float32Array,
    reference?: unknown
  ): Promise<LoopResult> {
    const startTime = performance.now();
    const allStates: CognitiveState[] = [];
    const allFeedback: FeedbackSignal[] = [];

    const context: LoopContext = {
      intent,
      reference,
      constraints: {
        maxDurationMs: 120000,
        targetResonance: 0.75,
        maxEntropy: 0.5,
      },
      memory: this.memory,
    };

    // Initial state: D1 impulse from intent or frame
    let currentState: CognitiveState = {
      phase: 'D1',
      data: initialFrame || intent,
      timestamp: startTime,
      resonance: 0.5,
      entropy: 1.0,
      lineage: ['INIT'],
    };

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      const iterationStates: CognitiveState[] = [];

      for (const stage of this.stages) {
        // Skip stages that don't match current dimension (adaptive routing)
        if (!this.canRoute(currentState.phase, stage.inputDimension)) {
          continue;
        }

        const result = await stage.execute(currentState, context);
        iterationStates.push(result.output);
        this.memory.addState(result.output);
        this.feedbackController.recordState(result.output);

        if (result.feedback.intensity > 0) {
          await this.feedbackController.processFeedback(result.feedback);
          allFeedback.push(result.feedback);
        }

        currentState = result.output;

        // Check for early convergence
        if (result.output.resonance >= this.convergenceThreshold && result.output.entropy <= context.constraints.maxEntropy) {
          break;
        }
      }

      allStates.push(...iterationStates);

      // Recursion check: has the loop stabilized?
      const health = this.feedbackController.getLoopHealth();
      if (health.isStable && iteration > 0) {
        break;
      }
    }

    const executionTime = performance.now() - startTime;
    const health = this.feedbackController.getLoopHealth();

    return {
      finalState: currentState,
      allStates,
      feedbackSignals: allFeedback,
      health,
      executionTimeMs: executionTime,
      iterations: allStates.length,
    };
  }

  /**
   * Adaptive routing: can we move from dimension A to dimension B?
   * D1→D2: always (perception)
   * D2→D3: if resonance > 0.3
   * D3→D4: if structure is present
   * D4→D5: if temporal coherence exists
   * D5→D1: always (intent drives generation)
   */
  private canRoute(from: DimensionalPhase, to: DimensionalPhase): boolean {
    const transitions: Record<string, string[]> = {
      D1: ['D2', 'D5'],
      D2: ['D3', 'D4', 'D2'],
      D3: ['D4'],
      D4: ['D5', 'D2'],
      D5: ['D1'],
    };
    return transitions[from]?.includes(to) ?? false;
  }

  getMemory(): CognitiveMemoryImpl {
    return this.memory;
  }

  getMetrics(): Record<string, StageMetrics> {
    const metrics: Record<string, StageMetrics> = {};
    for (const stage of this.stages) {
      metrics[stage.name] = stage.getMetrics();
    }
    return metrics;
  }
}

export {
  PerceiveStage,
  GenerateStage,
  TransformStage,
  PackageStage,
  SynchronizeStage,
  UnderstandStage,
  FeedbackController,
  CognitiveMemoryImpl,
};
