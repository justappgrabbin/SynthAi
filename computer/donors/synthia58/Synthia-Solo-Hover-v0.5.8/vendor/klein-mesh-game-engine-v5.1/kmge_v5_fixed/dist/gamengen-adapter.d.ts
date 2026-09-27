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
import { SemanticNode, IngestGapFillEngine } from './core-engine';
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
export declare abstract class DiffusionModelBackend {
    protected config: DiffusionModelConfig;
    protected isLoaded: boolean;
    constructor(config: DiffusionModelConfig);
    abstract load(): Promise<void>;
    abstract generateFrame(previousLatents: Float32Array[], action: number, seed?: number): Promise<{
        latent: Float32Array;
        metadata?: any;
    }>;
    abstract encodeImage(pixels: Uint8Array): Promise<Float32Array>;
    abstract decodeLatent(latent: Float32Array): Promise<Uint8Array>;
    abstract dispose(): Promise<void>;
}
/**
 * Mock backend for testing without PyTorch.
 * Generates deterministic patterns (not real images).
 */
export declare class MockDiffusionBackend extends DiffusionModelBackend {
    constructor(config: DiffusionModelConfig);
    load(): Promise<void>;
    generateFrame(previousLatents: Float32Array[], action: number, seed?: number): Promise<{
        latent: Float32Array;
        metadata?: any;
    }>;
    encodeImage(pixels: Uint8Array): Promise<Float32Array>;
    decodeLatent(latent: Float32Array): Promise<Uint8Array>;
    dispose(): Promise<void>;
}
/**
 * The gameNgen engine coordinates frame generation.
 * With MockDiffusionBackend, it produces deterministic test patterns.
 */
export declare class GameNGenEngine {
    private backend;
    private frameBuffer;
    private engine;
    private actionSpace;
    constructor(backend: DiffusionModelBackend, engine: IngestGapFillEngine);
    initialize(): Promise<void>;
    generateFrame(action: number, seed?: number): Promise<GameNGenFrame>;
    autoregressiveRollout(actions: number[], onFrame?: (frame: GameNGenFrame, index: number) => void): Promise<GameNGenFrame[]>;
    getFrameBuffer(): FrameBuffer;
}
export default GameNGenEngine;
//# sourceMappingURL=gamengen-adapter.d.ts.map