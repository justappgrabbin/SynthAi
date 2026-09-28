// ============================================================================
// SYNTHIA LIFE VIDEO DIFFUSION BACKBONE
// Transformer-based Latent Video Diffusion for Human Design Life Episodes
// Based on: GameFactory (arXiv:2501.08325) architecture
// Adapted for: Human dramatization, Sims-like character interaction, life scenarios
// ============================================================================

import { Tensor, matMul, softmax, layerNorm, gelu, conv3d } from './tensor-ops';
import { DesignDecisionController, DDC_CONFIG } from './design-decision-controller';
import { HDChart } from './hd-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const VIDEO_CONFIG = {
  // Video dimensions
  resolution: { width: 360, height: 640 },  // Portrait (mobile-first)
  frameRate: 24,
  temporalCompression: 4,  // r=4, 4 frames → 1 latent frame

  // Model architecture
  hiddenDim: 768,
  numLayers: 12,
  numHeads: 12,
  mlpRatio: 4,

  // Diffusion parameters
  numTimesteps: 1000,
  betaStart: 0.0001,
  betaEnd: 0.02,

  // Autoregressive generation
  contextFrames: 4,  // k+1 = 4 (clean conditionals)
  generationFrames: 12,  // N-k = 12 (noisy frames to generate)

  // LoRA for style adaptation
  loraRank: 128,
  loraAlpha: 64,

  // Training
  batchSize: 4,
  learningRate: 1e-4,  // Phase 1 (style)
  actionLearningRate: 1e-5,  // Phase 2 (action control)
};

// ============================================================================
// 3D CONVOLUTIONAL VIDEO ENCODER (VAE)
// ============================================================================
// Encodes video frames into latent space with temporal compression
// Similar to Stable Video Diffusion's 3D VAE
// ============================================================================

export class VideoVAE {
  private encoder: Conv3DEncoder;
  private decoder: Conv3DDecoder;
  private temporalCompression: number;

  constructor() {
    this.temporalCompression = VIDEO_CONFIG.temporalCompression;
    this.encoder = new Conv3DEncoder(this.temporalCompression);
    this.decoder = new Conv3DDecoder(this.temporalCompression);
  }

  /**
   * Encode video to latent space
   * Input: [batch, frames, height, width, channels] 
   * Output: [batch, frames/r, height/8, width/8, latent_channels]
   */
  encode(video: Tensor): Tensor {
    return this.encoder.forward(video);
  }

  /**
   * Decode latent back to video
   * Input: [batch, frames/r, height/8, width/8, latent_channels]
   * Output: [batch, frames, height, width, channels]
   */
  decode(latent: Tensor): Tensor {
    return this.decoder.forward(latent);
  }
}

class Conv3DEncoder {
  private temporalCompression: number;
  private conv1: Conv3DBlock;
  private conv2: Conv3DBlock;
  private conv3: Conv3DBlock;
  private conv4: Conv3DBlock;

  constructor(temporalCompression: number) {
    this.temporalCompression = temporalCompression;

    // Progressive downsampling: spatial ×2, temporal ×r
    this.conv1 = new Conv3DBlock(3, 64, { t: 1, h: 2, w: 2 });
    this.conv2 = new Conv3DBlock(64, 128, { t: 1, h: 2, w: 2 });
    this.conv3 = new Conv3DBlock(128, 256, { t: 1, h: 2, w: 2 });
    this.conv4 = new Conv3DBlock(256, 512, { t: temporalCompression, h: 1, w: 1 });
  }

  forward(video: Tensor): Tensor {
    let x = this.conv1.forward(video);
    x = this.conv2.forward(x);
    x = this.conv3.forward(x);
    x = this.conv4.forward(x);  // Temporal compression happens here
    return x;
  }
}

class Conv3DDecoder {
  private temporalCompression: number;
  private deconv1: Conv3DTransposeBlock;
  private deconv2: Conv3DTransposeBlock;
  private deconv3: Conv3DTransposeBlock;
  private deconv4: Conv3DTransposeBlock;

  constructor(temporalCompression: number) {
    this.temporalCompression = temporalCompression;

    this.deconv1 = new Conv3DTransposeBlock(512, 256, { t: temporalCompression, h: 1, w: 1 });
    this.deconv2 = new Conv3DTransposeBlock(256, 128, { t: 1, h: 2, w: 2 });
    this.deconv3 = new Conv3DTransposeBlock(128, 64, { t: 1, h: 2, w: 2 });
    this.deconv4 = new Conv3DTransposeBlock(64, 3, { t: 1, h: 2, w: 2 });
  }

  forward(latent: Tensor): Tensor {
    let x = this.deconv1.forward(latent);
    x = this.deconv2.forward(x);
    x = this.deconv3.forward(x);
    x = this.deconv4.forward(x);
    return x;
  }
}

class Conv3DBlock {
  constructor(inChannels: number, outChannels: number, stride: { t: number, h: number, w: number }) {
    // 3D convolution with GroupNorm and SiLU activation
  }
  forward(x: Tensor): Tensor {
    // Implementation
    return x;
  }
}

class Conv3DTransposeBlock {
  constructor(inChannels: number, outChannels: number, stride: { t: number, h: number, w: number }) {
    // 3D transposed convolution
  }
  forward(x: Tensor): Tensor {
    // Implementation
    return x;
  }
}

// ============================================================================
// TRANSFORMER DIFFUSION MODEL
// ============================================================================
// Core video generation model — transformer blocks with temporal attention
// Integrated with Design Decision Controller for HD-based action control
// ============================================================================

export class LifeVideoDiffusionModel {
  private vae: VideoVAE;
  private transformer: DiTTransformer;
  private ddc: DesignDecisionController;
  private noiseScheduler: NoiseScheduler;

  // LoRA weights for style adaptation (Phase 1)
  private loraWeights: Map<string, { A: Tensor, B: Tensor }>;
  private useLoRA: boolean = false;

  constructor(ddc: DesignDecisionController) {
    this.vae = new VideoVAE();
    this.transformer = new DiTTransformer();
    this.ddc = ddc;
    this.noiseScheduler = new NoiseScheduler();
    this.loraWeights = new Map();
  }

  /**
   * MULTI-PHASE TRAINING PIPELINE
   * 
   * Phase 0: Pretrain on open-domain life drama video (no design data)
   * Phase 1: Fine-tune with LoRA for HD archetype visual style
   * Phase 2: Freeze all, train DDC with annotated episodes
   * Phase 3: Inference — remove LoRA, use original model + DDC
   */

  /**
   * Phase 1: Style adaptation with LoRA
   * Train LoRA weights to adapt visual style to HD archetypes
   */
  trainStyleLoRA(
    archetypeData: ArchetypeDataset,
    epochs: number = 100
  ): void {
    this.useLoRA = true;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const batch of archetypeData.batches()) {
        // Forward pass with LoRA
        const latent = this.vae.encode(batch.videos);
        const noise = this.generateNoise(latent.shape);
        const timesteps = this.sampleTimesteps(batch.size);

        const noisyLatent = this.noiseScheduler.addNoise(latent, noise, timesteps);

        // Predict noise with LoRA-enabled transformer
        const predictedNoise = this.transformer.forwardWithLoRA(
          noisyLatent,
          timesteps,
          batch.textEmbeddings,
          this.loraWeights
        );

        // Loss: MSE between predicted and actual noise
        const loss = predictedNoise.subtract(noise).square().mean();

        // Backprop only LoRA weights (original weights frozen)
        loss.backward();
        this.updateLoRAWeights(VIDEO_CONFIG.learningRate);
      }
    }
  }

  /**
   * Phase 2: Train Design Decision Controller
   * Freeze all weights, train only DDC on annotated life episodes
   */
  trainDDC(
    episodeData: LifeEpisodeDataset,
    epochs: number = 100
  ): void {
    // Freeze all transformer and VAE weights
    this.transformer.freeze();
    this.vae.freeze();

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const batch of episodeData.batches()) {
        // Encode chart
        const chartEmbedding = this.ddc.encodeChart(batch.charts);

        // Encode video
        const latent = this.vae.encode(batch.videos);
        const noise = this.generateNoise(latent.shape);
        const timesteps = this.sampleTimesteps(batch.size);

        const noisyLatent = this.noiseScheduler.addNoise(latent, noise, timesteps);

        // Forward with DDC action control
        const predictedNoise = this.transformer.forwardWithDDC(
          noisyLatent,
          timesteps,
          batch.textEmbeddings,
          this.ddc,
          batch.decisions,
          batch.charts
        );

        // Loss: MSE between predicted and actual noise
        const loss = predictedNoise.subtract(noise).square().mean();

        // Backprop only DDC weights
        loss.backward();
        this.ddc.updateWeights(VIDEO_CONFIG.actionLearningRate);
      }
    }
  }

  /**
   * Phase 3: Inference — Generate life episode video
   * Remove LoRA, use original model + trained DDC
   * 
   * @param chart — user's HD chart
   * @param prompt — text description of the life scenario
   * @param decisions — user's life decisions (discrete + continuous)
   * @param numFrames — total frames to generate
   * @returns generated video tensor
   */
  async generateEpisode(
    chart: HDChart,
    prompt: string,
    decisions: LifeDecisions,
    numFrames: number = 120  // 5 seconds at 24fps
  ): Promise<Tensor> {
    // Remove LoRA for open-domain generation (Phase 3)
    this.useLoRA = false;

    // Encode prompt to text embedding
    const textEmbedding = await this.encodeText(prompt);

    // Get valid decision space for this chart
    const validDecisions = this.ddc.generateValidDecisions(chart);

    // Initialize with random noise
    const latentShape = this.calculateLatentShape(numFrames);
    let latent = this.generateNoise(latentShape);

    // Diffusion denoising loop
    for (let t = VIDEO_CONFIG.numTimesteps - 1; t >= 0; t--) {
      const timestep = new Tensor([[t]]);

      // Predict noise with DDC action control
      const predictedNoise = this.transformer.forwardWithDDC(
        latent,
        timestep,
        textEmbedding,
        this.ddc,
        decisions,
        chart
      );

      // Denoise step
      latent = this.noiseScheduler.step(predictedNoise, t, latent);
    }

    // Decode to video
    const video = this.vae.decode(latent);

    return video;
  }

  /**
   * AUTOREGRESSIVE LONG EPISODE GENERATION
   * Diffusion Forcing adaptation from GameFactory
   * 
   * Standard diffusion generates full sequence at once — limited length.
   * Diffusion Forcing: keep first k+1 frames clean, add noise to remaining N-k.
   * At inference: generate N-k new frames using last k+1 as context, merge, repeat.
   * 
   * This enables UNLIMITED episode length with multi-frame generation per step.
   */
  async generateLongEpisode(
    chart: HDChart,
    prompt: string,
    decisions: LifeDecisions,
    totalFrames: number = 720,  // 30 seconds
    contextFrames: number = 4,
    generationFrames: number = 12
  ): Promise<Tensor> {
    const allFrames: Tensor[] = [];

    // Generate initial segment
    let currentContext = await this.generateInitialContext(
      chart, prompt, decisions, contextFrames
    );
    allFrames.push(currentContext);

    let remainingFrames = totalFrames - contextFrames;

    while (remainingFrames > 0) {
      const framesToGenerate = Math.min(generationFrames, remainingFrames);

      // Generate new frames using last contextFrames as clean conditionals
      const newFrames = await this.generateSegment(
        chart,
        prompt,
        decisions,
        currentContext,
        framesToGenerate
      );

      allFrames.push(newFrames);

      // Update context: last contextFrames from the combined sequence
      currentContext = this.extractLastContext(allFrames, contextFrames);

      remainingFrames -= framesToGenerate;

      // Update decisions based on generated content (feedback loop)
      decisions = await this.updateDecisions(decisions, newFrames, chart);
    }

    // Concatenate all frames
    return this.concatenateFrames(allFrames);
  }

  /**
   * Generate initial clean context frames
   */
  private async generateInitialContext(
    chart: HDChart,
    prompt: string,
    decisions: LifeDecisions,
    numFrames: number
  ): Promise<Tensor> {
    // Generate with full denoising (no conditioning)
    return this.generateEpisode(chart, prompt, decisions, numFrames);
  }

  /**
   * Generate new segment with clean context conditioning
   * First k+1 frames are clean, remaining N-k are noisy
   */
  private async generateSegment(
    chart: HDChart,
    prompt: string,
    decisions: LifeDecisions,
    contextFrames: Tensor,
    numNewFrames: number
  ): Promise<Tensor> {
    const totalFrames = contextFrames.shape[1] + numNewFrames;
    const latentShape = this.calculateLatentShape(totalFrames);

    // Initialize: context frames are clean, new frames are noisy
    let latent = this.initializeWithContext(contextFrames, numNewFrames);

    // Encode prompt
    const textEmbedding = await this.encodeText(prompt);

    // Diffusion denoising (only denoise the new frames, keep context clean)
    for (let t = VIDEO_CONFIG.numTimesteps - 1; t >= 0; t--) {
      const timestep = new Tensor([[t]]);

      const predictedNoise = this.transformer.forwardWithDDCAndContext(
        latent,
        timestep,
        textEmbedding,
        this.ddc,
        decisions,
        chart,
        contextFrames  // Clean conditioning
      );

      // Only apply denoising to new frames, keep context frames unchanged
      latent = this.noiseScheduler.stepWithMask(
        predictedNoise, t, latent, contextFrames.shape[1]
      );
    }

    // Extract only the new frames
    return this.extractNewFrames(latent, contextFrames.shape[1]);
  }

  /**
   * Update decisions based on generated content
   * This creates the feedback loop — the user's design responds to the world
   */
  private async updateDecisions(
    decisions: LifeDecisions,
    newFrames: Tensor,
    chart: HDChart
  ): Promise<LifeDecisions> {
    // Analyze generated frames for emotional/physical states
    const frameAnalysis = await this.analyzeFrames(newFrames);

    // Update continuous states based on analysis
    const updatedContinuous = {
      ...decisions.continuous,
      emotional_intensity: frameAnalysis.emotionalIntensity,
      body_sensation: frameAnalysis.bodySensation,
      identity_coherence: frameAnalysis.identityCoherence,
    };

    // Generate next discrete decisions based on chart strategy
    const nextDiscrete = this.generateNextDecisions(chart, frameAnalysis);

    return {
      ...decisions,
      continuous: updatedContinuous,
      discrete: [...decisions.discrete, ...nextDiscrete],
      history: {
        ...decisions.history,
        decisions: [...decisions.history.decisions, {
          action: nextDiscrete[0]?.action || 'WAIT',
          effect: frameAnalysis.embedding,
          timestamp: Date.now(),
        }],
      },
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateNoise(shape: number[]): Tensor {
    return Tensor.randn(shape);
  }

  private sampleTimesteps(batchSize: number): Tensor {
    const timesteps = [];
    for (let i = 0; i < batchSize; i++) {
      timesteps.push(Math.floor(Math.random() * VIDEO_CONFIG.numTimesteps));
    }
    return new Tensor(timesteps);
  }

  private calculateLatentShape(numFrames: number): number[] {
    const compressedFrames = Math.ceil(numFrames / VIDEO_CONFIG.temporalCompression);
    const h = VIDEO_CONFIG.resolution.height / 8;
    const w = VIDEO_CONFIG.resolution.width / 8;
    return [1, compressedFrames, h, w, 512];  // batch=1, 512 latent channels
  }

  private async encodeText(prompt: string): Promise<Tensor> {
    // Use T5 or CLIP text encoder
    // Implementation depends on chosen text encoder
    return new Tensor([[]]);
  }

  private async analyzeFrames(frames: Tensor): Promise<FrameAnalysis> {
    // Analyze generated frames for emotional/physical content
    // Uses a pre-trained perception model
    return {
      emotionalIntensity: 0.5,
      bodySensation: 0.5,
      identityCoherence: 0.5,
      embedding: new Tensor([[]]),
    };
  }

  private generateNextDecisions(chart: HDChart, analysis: FrameAnalysis): DiscreteDecision[] {
    // Generate next decisions based on chart strategy and current state
    const validActions = this.ddc.generateValidDecisions(chart);

    // Simple heuristic: if emotional intensity is high, use authority
    if (analysis.emotionalIntensity > 0.7) {
      return [{ action: 'WAIT', confidence: 0.9, timestamp: Date.now() }];
    }

    // Otherwise, follow strategy
    const strategyAction = validActions.discrete[0];
    return [{ action: strategyAction, confidence: 0.8, timestamp: Date.now() }];
  }

  private extractLastContext(frames: Tensor[], numFrames: number): Tensor {
    // Extract last numFrames from the concatenated sequence
    return frames[frames.length - 1];
  }

  private concatenateFrames(frames: Tensor[]): Tensor {
    // Concatenate along temporal dimension
    return Tensor.concat(frames, 1);
  }

  private extractNewFrames(latent: Tensor, contextLength: number): Tensor {
    // Extract frames after the context
    return latent.slice(1, contextLength, -1);
  }

  private initializeWithContext(context: Tensor, numNewFrames: number): Tensor {
    // Initialize latent: context frames are clean (from VAE), new frames are noise
    const contextLatent = this.vae.encode(context);
    const newLatentShape = [
      contextLatent.shape[0],
      numNewFrames / VIDEO_CONFIG.temporalCompression,
      contextLatent.shape[2],
      contextLatent.shape[3],
      contextLatent.shape[4]
    ];
    const newLatent = this.generateNoise(newLatentShape);

    return Tensor.concat([contextLatent, newLatent], 1);
  }

  private updateLoRAWeights(lr: number): void {
    // Update only LoRA weights
    for (const [name, weights] of this.loraWeights) {
      weights.A = weights.A.subtract(weights.A.grad.multiply(lr));
      weights.B = weights.B.subtract(weights.B.grad.multiply(lr));
    }
  }
}

// ============================================================================
// DiT TRANSFORMER (Diffusion Transformer)
// ============================================================================
// Transformer backbone for video diffusion
// Uses temporal and spatial attention, integrated with DDC
// ============================================================================

class DiTTransformer {
  private blocks: DiTBlock[];
  private finalLayer: Linear;

  constructor() {
    this.blocks = [];
    for (let i = 0; i < VIDEO_CONFIG.numLayers; i++) {
      this.blocks.push(new DiTBlock(i));
    }
    this.finalLayer = new Linear(VIDEO_CONFIG.hiddenDim, 512 * 8 * 8);  // latent channels
  }

  forwardWithDDC(
    latent: Tensor,
    timestep: Tensor,
    textEmbedding: Tensor,
    ddc: DesignDecisionController,
    decisions: LifeDecisions,
    chart: HDChart
  ): Tensor {
    // Patchify latent video into tokens
    let x = this.patchify(latent);

    // Add timestep embedding
    const tEmb = this.timestepEmbedding(timestep);
    x = x.add(tEmb);

    // Add text embedding
    x = x.add(textEmbedding);

    // Apply transformer blocks with DDC integration
    for (const block of this.blocks) {
      x = block.forward(x, ddc, decisions, chart);
    }

    // Final layer
    x = this.finalLayer.forward(x);

    // Unpatchify back to latent video
    return this.unpatchify(x, latent.shape);
  }

  forwardWithLoRA(
    latent: Tensor,
    timestep: Tensor,
    textEmbedding: Tensor,
    loraWeights: Map<string, { A: Tensor, B: Tensor }>
  ): Tensor {
    // Same as above but with LoRA weights applied
    let x = this.patchify(latent);
    const tEmb = this.timestepEmbedding(timestep);
    x = x.add(tEmb);
    x = x.add(textEmbedding);

    for (const block of this.blocks) {
      x = block.forwardWithLoRA(x, loraWeights);
    }

    x = this.finalLayer.forward(x);
    return this.unpatchify(x, latent.shape);
  }

  forwardWithDDCAndContext(
    latent: Tensor,
    timestep: Tensor,
    textEmbedding: Tensor,
    ddc: DesignDecisionController,
    decisions: LifeDecisions,
    chart: HDChart,
    contextFrames: Tensor
  ): Tensor {
    // Same as forwardWithDDC but with context conditioning
    let x = this.patchify(latent);
    const tEmb = this.timestepEmbedding(timestep);
    x = x.add(tEmb);
    x = x.add(textEmbedding);

    // Add context conditioning
    const contextEmb = this.patchify(contextFrames);
    x = x.add(contextEmb);

    for (const block of this.blocks) {
      x = block.forward(x, ddc, decisions, chart);
    }

    x = this.finalLayer.forward(x);
    return this.unpatchify(x, latent.shape);
  }

  freeze(): void {
    // Freeze all weights
    for (const block of this.blocks) {
      block.freeze();
    }
    this.finalLayer.freeze();
  }

  private patchify(latent: Tensor): Tensor {
    // Convert latent video [B, T, H, W, C] to sequence of patches [B, N, D]
    // Each patch is a spatiotemporal chunk
    return latent;
  }

  private unpatchify(x: Tensor, originalShape: number[]): Tensor {
    // Convert sequence back to latent video
    return x;
  }

  private timestepEmbedding(timestep: Tensor): Tensor {
    // Sinusoidal timestep embedding
    return timestep;
  }
}

class DiTBlock {
  private norm1: LayerNorm;
  private attn: MultiHeadAttention;
  private norm2: LayerNorm;
  private mlp: MLP;
  private layerId: number;

  constructor(layerId: number) {
    this.layerId = layerId;
    this.norm1 = new LayerNorm(VIDEO_CONFIG.hiddenDim);
    this.attn = new MultiHeadAttention(
      VIDEO_CONFIG.hiddenDim, 
      VIDEO_CONFIG.numHeads
    );
    this.norm2 = new LayerNorm(VIDEO_CONFIG.hiddenDim);
    this.mlp = new MLP(
      VIDEO_CONFIG.hiddenDim, 
      VIDEO_CONFIG.hiddenDim * VIDEO_CONFIG.mlpRatio
    );
  }

  forward(
    x: Tensor,
    ddc: DesignDecisionController,
    decisions: LifeDecisions,
    chart: HDChart
  ): Tensor {
    // Self-attention with DDC integration
    let attnOut = this.attn.forward(this.norm1.forward(x));

    // Apply DDC action control at this layer
    attnOut = ddc.forward(attnOut, chart, decisions, this.layerId);

    x = x.add(attnOut);

    // MLP
    x = x.add(this.mlp.forward(this.norm2.forward(x)));

    return x;
  }

  forwardWithLoRA(x: Tensor, loraWeights: Map<string, { A: Tensor, B: Tensor }>): Tensor {
    // Apply LoRA to attention and MLP layers
    let attnOut = this.attn.forwardWithLoRA(
      this.norm1.forward(x), 
      loraWeights
    );
    x = x.add(attnOut);
    x = x.add(this.mlp.forwardWithLoRA(
      this.norm2.forward(x), 
      loraWeights
    ));
    return x;
  }

  freeze(): void {
    this.norm1.freeze();
    this.attn.freeze();
    this.norm2.freeze();
    this.mlp.freeze();
  }
}

class MultiHeadAttention {
  private numHeads: number;
  private headDim: number;
  private qkv: Linear;
  private proj: Linear;

  constructor(dim: number, numHeads: number) {
    this.numHeads = numHeads;
    this.headDim = dim / numHeads;
    this.qkv = new Linear(dim, dim * 3);
    this.proj = new Linear(dim, dim);
  }

  forward(x: Tensor): Tensor {
    const B = x.shape[0];
    const N = x.shape[1];
    const C = x.shape[2];

    // QKV projection
    const qkv = this.qkv.forward(x);

    // Split into Q, K, V
    const q = qkv.slice(2, 0, C);
    const k = qkv.slice(2, C, C * 2);
    const v = qkv.slice(2, C * 2, C * 3);

    // Reshape for multi-head attention
    const q_heads = q.reshape([B, N, this.numHeads, this.headDim]);
    const k_heads = k.reshape([B, N, this.numHeads, this.headDim]);
    const v_heads = v.reshape([B, N, this.numHeads, this.headDim]);

    // Attention: Q @ K^T / sqrt(d)
    const attn = softmax(
      matMul(q_heads, k_heads.transpose()) / Math.sqrt(this.headDim),
      -1
    );

    // Apply attention to values
    const out = matMul(attn, v_heads);

    // Reshape and project
    const out_flat = out.reshape([B, N, C]);
    return this.proj.forward(out_flat);
  }

  forwardWithLoRA(x: Tensor, loraWeights: Map<string, { A: Tensor, B: Tensor }>): Tensor {
    // Apply LoRA to QKV and projection
    // W' = W + alpha/r * B @ A
    return this.forward(x);  // Simplified
  }

  freeze(): void {
    this.qkv.freeze();
    this.proj.freeze();
  }
}

class MLP {
  private fc1: Linear;
  private fc2: Linear;

  constructor(inDim: number, hiddenDim: number) {
    this.fc1 = new Linear(inDim, hiddenDim);
    this.fc2 = new Linear(hiddenDim, inDim);
  }

  forward(x: Tensor): Tensor {
    x = this.fc1.forward(x);
    x = gelu(x);
    x = this.fc2.forward(x);
    return x;
  }

  forwardWithLoRA(x: Tensor, loraWeights: Map<string, { A: Tensor, B: Tensor }>): Tensor {
    return this.forward(x);  // Simplified
  }

  freeze(): void {
    this.fc1.freeze();
    this.fc2.freeze();
  }
}

class LayerNorm {
  private dim: number;
  private gamma: Tensor;
  private beta: Tensor;

  constructor(dim: number) {
    this.dim = dim;
    this.gamma = Tensor.ones([dim]);
    this.beta = Tensor.zeros([dim]);
  }

  forward(x: Tensor): Tensor {
    return layerNorm(x, this.gamma, this.beta, 1e-6);
  }

  freeze(): void {
    this.gamma.requiresGrad = false;
    this.beta.requiresGrad = false;
  }
}

class Linear {
  private weight: Tensor;
  private bias: Tensor;

  constructor(inDim: number, outDim: number) {
    this.weight = Tensor.randn([inDim, outDim]).multiply(Math.sqrt(2 / inDim));
    this.bias = Tensor.zeros([outDim]);
  }

  forward(x: Tensor): Tensor {
    return matMul(x, this.weight).add(this.bias);
  }

  freeze(): void {
    this.weight.requiresGrad = false;
    this.bias.requiresGrad = false;
  }
}

// ============================================================================
// NOISE SCHEDULER
// ============================================================================
// Standard diffusion noise scheduler with cosine beta schedule
// ============================================================================

class NoiseScheduler {
  private betas: Tensor;
  private alphas: Tensor;
  private alphasCumprod: Tensor;

  constructor() {
    // Cosine beta schedule
    const steps = VIDEO_CONFIG.numTimesteps;
    this.betas = new Tensor(
      Array.from({ length: steps }, (_, i) => {
        const t = i / steps;
        return VIDEO_CONFIG.betaStart + (VIDEO_CONFIG.betaEnd - VIDEO_CONFIG.betaStart) * t;
      })
    );

    this.alphas = this.betas.map(b => 1 - b);
    this.alphasCumprod = this.alphas.cumprod();
  }

  addNoise(x: Tensor, noise: Tensor, timesteps: Tensor): Tensor {
    // x_t = sqrt(alpha_cumprod) * x_0 + sqrt(1 - alpha_cumprod) * noise
    const alpha_t = this.alphasCumprod.gather(timesteps);
    const sqrtAlpha = alpha_t.sqrt();
    const sqrtOneMinusAlpha = alpha_t.subtract(1).negate().sqrt();

    return x.multiply(sqrtAlpha).add(noise.multiply(sqrtOneMinusAlpha));
  }

  step(predictedNoise: Tensor, t: number, x_t: Tensor): Tensor {
    // DDPM denoising step
    const alpha_t = this.alphasCumprod.values[t];
    const alpha_prev = t > 0 ? this.alphasCumprod.values[t - 1] : 1.0;

    const beta_t = this.betas.values[t];
    const sqrtAlpha = Math.sqrt(alpha_t);
    const sqrtOneMinusAlpha = Math.sqrt(1 - alpha_t);

    // Predict x_0
    const x_0 = x_t.subtract(predictedNoise.multiply(sqrtOneMinusAlpha)).divide(sqrtAlpha);

    // Compute x_{t-1}
    const sqrtAlphaPrev = Math.sqrt(alpha_prev);
    const sqrtOneMinusAlphaPrev = Math.sqrt(1 - alpha_prev);

    const x_t_minus_1 = x_0.multiply(sqrtAlphaPrev).add(predictedNoise.multiply(sqrtOneMinusAlphaPrev));

    return x_t_minus_1;
  }

  stepWithMask(
    predictedNoise: Tensor, 
    t: number, 
    x_t: Tensor, 
    contextLength: number
  ): Tensor {
    // Same as step but only apply to non-context frames
    const denoised = this.step(predictedNoise, t, x_t);

    // Create mask: 1 for context frames (keep original), 0 for new frames (use denoised)
    const mask = new Tensor(
      Array.from({ length: x_t.shape[1] }, (_, i) => i < contextLength ? 1 : 0)
    ).reshape([1, -1, 1, 1, 1]);

    return x_t.multiply(mask).add(denoised.multiply(mask.subtract(1).negate()));
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ArchetypeDataset {
  batches(): Generator<ArchetypeBatch>;
}

interface ArchetypeBatch {
  videos: Tensor;
  textEmbeddings: Tensor;
  size: number;
}

interface LifeEpisodeDataset {
  batches(): Generator<EpisodeBatch>;
}

interface EpisodeBatch {
  videos: Tensor;
  charts: HDChart[];
  textEmbeddings: Tensor;
  decisions: LifeDecisions[];
  size: number;
}

interface FrameAnalysis {
  emotionalIntensity: number;
  bodySensation: number;
  identityCoherence: number;
  embedding: Tensor;
}

interface LifeDecisions {
  discrete: DiscreteDecision[];
  continuous: ContinuousState;
  history: DecisionHistory;
}

interface DiscreteDecision {
  action: string;
  confidence: number;
  timestamp: number;
}

interface ContinuousState {
  emotional_intensity: number;
  mental_perspective: number;
  body_sensation: number;
  social_distance: number;
  temporal_pressure: number;
  identity_coherence: number;
}

interface DecisionHistory {
  decisions: {
    action: string;
    effect: Tensor;
    timestamp: number;
  }[];
}

// ============================================================================
// EXPORT
// ============================================================================

export { VIDEO_CONFIG, VideoVAE, LifeVideoDiffusionModel, NoiseScheduler };
export default LifeVideoDiffusionModel;
