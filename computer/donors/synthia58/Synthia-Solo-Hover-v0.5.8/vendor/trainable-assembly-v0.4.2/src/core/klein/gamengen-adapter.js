"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameNGenEngine = exports.MockDiffusionBackend = exports.DiffusionModelBackend = void 0;
class DiffusionModelBackend {
    config;
    isLoaded = false;
    constructor(config) {
        this.config = config;
    }
}
exports.DiffusionModelBackend = DiffusionModelBackend;
/**
 * Mock backend for testing without PyTorch.
 * Generates deterministic patterns (not real images).
 */
class MockDiffusionBackend extends DiffusionModelBackend {
    constructor(config) {
        super(config);
    }
    async load() {
        console.log('[MockDiffusion] Deterministic mock backend loaded.');
        console.log('[MockDiffusion] NOTE: This does NOT generate real images.');
        console.log('[MockDiffusion] For real diffusion, run a PyTorch server.');
        this.isLoaded = true;
    }
    async generateFrame(previousLatents, action, seed) {
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
    async encodeImage(pixels) {
        const size = 4 * 64 * 64;
        const latent = new Float32Array(size);
        for (let i = 0; i < size && i < pixels.length; i++) {
            latent[i] = pixels[i] / 255.0;
        }
        return latent;
    }
    async decodeLatent(latent) {
        const pixels = new Uint8Array(latent.length);
        for (let i = 0; i < latent.length; i++) {
            pixels[i] = Math.min(255, Math.max(0, (latent[i] + 1) * 127.5));
        }
        return pixels;
    }
    async dispose() {
        this.isLoaded = false;
    }
}
exports.MockDiffusionBackend = MockDiffusionBackend;
/**
 * The gameNgen engine coordinates frame generation.
 * With MockDiffusionBackend, it produces deterministic test patterns.
 */
class GameNGenEngine {
    backend;
    frameBuffer;
    engine;
    actionSpace = new Map([
        [0, 'NOOP'], [1, 'MOVE_FORWARD'], [2, 'MOVE_BACKWARD'],
        [3, 'TURN_LEFT'], [4, 'TURN_RIGHT'], [5, 'ATTACK'],
        [6, 'USE'], [7, 'JUMP'],
    ]);
    constructor(backend, engine) {
        this.backend = backend;
        this.engine = engine;
        this.frameBuffer = { frames: [], maxSize: 1000, contextWindow: 4 };
    }
    async initialize() {
        await this.backend.load();
    }
    async generateFrame(action, seed) {
        const previousLatents = this.frameBuffer.frames
            .slice(-this.frameBuffer.contextWindow)
            .map((f) => f.latent);
        const result = await this.backend.generateFrame(previousLatents, action, seed);
        const frame = {
            latent: result.latent,
            action,
            previousFrames: previousLatents.map((_, i) => this.frameBuffer.frames[this.frameBuffer.frames.length - previousLatents.length + i]?.timestamp.toString() || ''),
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
    async autoregressiveRollout(actions, onFrame) {
        const rollout = [];
        for (let i = 0; i < actions.length; i++) {
            const frame = await this.generateFrame(actions[i]);
            rollout.push(frame);
            if (onFrame)
                onFrame(frame, i);
        }
        return rollout;
    }
    getFrameBuffer() {
        return { ...this.frameBuffer };
    }
}
exports.GameNGenEngine = GameNGenEngine;
exports.default = GameNGenEngine;
//# sourceMappingURL=gamengen-adapter.js.map