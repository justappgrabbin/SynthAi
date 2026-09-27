/**
 * ============================================================
 * gameNgen ADAPTER v3 — Honest about capabilities
 *
 * This is a FRAME GENERATION INTERFACE, not a working diffusion model.
 * The real gameNgen requires:
 *   - 2GB+ of PyTorch checkpoints
 *   - CUDA GPU
 *   - Python server with diffusers
 *
 * This adapter provides:
 *   - The data structures for frames
 *   - A mock backend for testing (deterministic, no random)
 *   - Interface stubs for real backends
 *
 * If you want real diffusion, use the Python server (not included
 * in this build because it requires external model downloads).
 * ============================================================
 */

import { SemanticNode, IngestedSignal, IngestGapFillEngine } from './core-engine';

export interface GameNGenFrame {
  latent: Float32Array;
  action: number;
  previousFrames: string[];
  timestamp: number;
  frameIndex: number;
  semanticOverlay: SemanticNode | null;
  metadata?: {
    generation_time_ms: number;
    device: string;
    action_name: string;
    note?: string;
  };
}

export interface FrameBuffer {
  frames: GameNGenFrame[];
  maxSize: number;
  contextWindow: number;
}

export interface DiffusionModelConfig {
  modelPath: string;
  autoencoderPath: string;
  numInferenceSteps: number;
  guidanceScale: number;
  frameConditioning: 'concat' | 'cross-attn';
  useTensorRT: boolean;
  useFlashAttention: boolean;
  outputResolution: [number, number];
}

export abstract class DiffusionModelBackend {
  protected config: DiffusionModelConfig;
  protected isLoaded = false;

  constructor(config: DiffusionModelConfig) {
    this.config = config;
  }

  abstract load(): Promise<void>;
  abstract generateFrame(
    previousLatents: Float32Array[],
    action: number,
    seed?: number
  ): Promise<{ latent: Float32Array; metadata?: any }>;
  abstract encodeImage(pixels: Uint8Array): Promise<Float32Array>;
  abstract decodeLatent(latent: Float32Array): Promise<Uint8Array>;
  abstract dispose(): Promise<void>;
}

/**
 * Mock backend for testing without PyTorch.
 * Generates deterministic patterns (not real images).
 */
export class MockDiffusionBackend extends DiffusionModelBackend {
  constructor(config: DiffusionModelConfig) {
    super(config);
  }

  async load(): Promise<void> {
    console.log('[MockDiffusion] Deterministic mock backend loaded.');
    console.log('[MockDiffusion] NOTE: This does NOT generate real images.');
    console.log('[MockDiffusion] For real diffusion, run a PyTorch server.');
    this.isLoaded = true;
  }

  async generateFrame(
    previousLatents: Float32Array[],
    action: number,
    seed?: number
  ): Promise<{ latent: Float32Array; metadata?: any }> {
    const size = 4 * 64 * 64;
    const latent = new Float32Array(size);
    const s = seed ?? action * 42;
    for (let i = 0; i < size; i++) {
      latent[i] = Math.sin(i * 0.01 + action + s * 0.1) * 0.5;
    }

    const actions = ['NOOP', 'MOVE_FORWARD', 'MOVE_BACKWARD', 'TURN_LEFT', 'TURN_RIGHT', 'ATTACK', 'USE', 'JUMP'];

    return {
      latent,
      metadata: {
        action: actions[action] || 'UNKNOWN',
        generation_time_ms: 50,
        device: 'mock',
        note: 'MOCK: No real diffusion model loaded.',
      },
    };
  }

  async encodeImage(pixels: Uint8Array): Promise<Float32Array> {
    const size = 4 * 64 * 64;
    const latent = new Float32Array(size);
    for (let i = 0; i < size && i < pixels.length; i++) {
      latent[i] = pixels[i] / 255.0;
    }
    return latent;
  }

  async decodeLatent(latent: Float32Array): Promise<Uint8Array> {
    const pixels = new Uint8Array(latent.length);
    for (let i = 0; i < latent.length; i++) {
      pixels[i] = Math.min(255, Math.max(0, (latent[i] + 1) * 127.5));
    }
    return pixels;
  }

  async dispose(): Promise<void> {
    this.isLoaded = false;
  }
}

/**
 * The gameNgen engine coordinates frame generation.
 * With MockDiffusionBackend, it produces deterministic test patterns.
 */
export class GameNGenEngine {
  private backend: DiffusionModelBackend;
  private frameBuffer: FrameBuffer;
  private engine: IngestGapFillEngine;

  private actionSpace: Map<number, string> = new Map([
    [0, 'NOOP'], [1, 'MOVE_FORWARD'], [2, 'MOVE_BACKWARD'],
    [3, 'TURN_LEFT'], [4, 'TURN_RIGHT'], [5, 'ATTACK'],
    [6, 'USE'], [7, 'JUMP'],
  ]);

  constructor(backend: DiffusionModelBackend, engine: IngestGapFillEngine) {
    this.backend = backend;
    this.engine = engine;
    this.frameBuffer = { frames: [], maxSize: 1000, contextWindow: 4 };
  }

  async initialize() {
    await this.backend.load();
  }

  async generateFrame(action: number, seed?: number): Promise<GameNGenFrame> {
    const previousLatents = this.frameBuffer.frames
      .slice(-this.frameBuffer.contextWindow)
      .map((f) => f.latent);

    const result = await this.backend.generateFrame(previousLatents, action, seed);

    const frame: GameNGenFrame = {
      latent: result.latent,
      action,
      previousFrames: previousLatents.map((_, i) =>
        this.frameBuffer.frames[this.frameBuffer.frames.length - previousLatents.length + i]?.timestamp.toString() || ''
      ),
      timestamp: Date.now(),
      frameIndex: this.frameBuffer.frames.length,
      semanticOverlay: null,
      metadata: result.metadata,
    };

    this.frameBuffer.frames.push(frame);
    if (this.frameBuffer.frames.length > this.frameBuffer.maxSize) {
      this.frameBuffer.frames.shift();
    }

    return frame;
  }

  async autoregressiveRollout(
    actions: number[],
    onFrame?: (frame: GameNGenFrame, index: number) => void
  ): Promise<GameNGenFrame[]> {
    const rollout: GameNGenFrame[] = [];
    for (let i = 0; i < actions.length; i++) {
      const frame = await this.generateFrame(actions[i]);
      rollout.push(frame);
      if (onFrame) onFrame(frame, i);
    }
    return rollout;
  }

  getFrameBuffer(): FrameBuffer {
    return { ...this.frameBuffer };
  }
}

export default GameNGenEngine;
