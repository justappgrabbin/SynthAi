"use strict";
/**
 * ============================================================
 * ATO ENGINE v2 — Episodic Memory + Semantic Completion
 * Based on: Fayyaz et al. (2022) PMID: 35896150
 * Fixed: deterministic, no random, clean syntax
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtoEngine = exports.AutopoieticGenerator = exports.AtoSwitchingLayer = exports.Neocortex = exports.Hippocampus = exports.PixelCNNGenerator = exports.VectorQuantizer = void 0;
class VectorQuantizer {
    config;
    codebook;
    codebookUsage;
    constructor(config) {
        this.config = config;
        this.codebook = this.initializeCodebook();
        this.codebookUsage = new Array(config.numEmbeddings).fill(0);
    }
    initializeCodebook() {
        const codebook = [];
        for (let i = 0; i < this.config.numEmbeddings; i++) {
            const vec = new Float32Array(this.config.embeddingDim);
            for (let j = 0; j < this.config.embeddingDim; j++) {
                // DETERMINISTIC initialization based on index
                vec[j] = Math.sin(i * 0.5 + j * 0.3) * 0.8;
            }
            codebook.push(vec);
        }
        return codebook;
    }
    encode(continuousLatent) {
        const { latentResolution, embeddingDim } = this.config;
        const totalPositions = latentResolution[0] * latentResolution[1];
        const codes = [];
        const quantized = new Float32Array(continuousLatent.length);
        for (let pos = 0; pos < totalPositions; pos++) {
            const start = pos * embeddingDim;
            const end = start + embeddingDim;
            const vector = continuousLatent.slice(start, end);
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < this.codebook.length; i++) {
                const dist = this.euclideanDistance(vector, this.codebook[i]);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
            codes.push(bestIdx);
            this.codebookUsage[bestIdx]++;
            for (let j = 0; j < embeddingDim; j++) {
                quantized[start + j] = this.codebook[bestIdx][j];
            }
        }
        return { codes, quantized };
    }
    decode(codes) {
        const { latentResolution, embeddingDim } = this.config;
        const totalPositions = latentResolution[0] * latentResolution[1];
        const latent = new Float32Array(totalPositions * embeddingDim);
        for (let pos = 0; pos < Math.min(codes.length, totalPositions); pos++) {
            const codeIdx = codes[pos];
            const codeVector = this.codebook[codeIdx];
            const start = pos * embeddingDim;
            for (let j = 0; j < embeddingDim; j++) {
                latent[start + j] = codeVector[j];
            }
        }
        return latent;
    }
    euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            const diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
    getCodebook() {
        return this.codebook;
    }
}
exports.VectorQuantizer = VectorQuantizer;
class PixelCNNGenerator {
    contextEmbeddings = new Map();
    registerContext(contextId, embedding) {
        this.contextEmbeddings.set(contextId, embedding);
    }
    complete(partialTrace, completionMask) {
        const contextEmbedding = this.contextEmbeddings.get(partialTrace.contextId);
        if (!contextEmbedding)
            throw new Error(`Context ${partialTrace.contextId} not registered`);
        const completed = { ...partialTrace, id: `${partialTrace.id}_completed_${Date.now()}`, timestamp: Date.now() };
        if (completionMask.visual && partialTrace.missingMask.visual) {
            completed.partialObservation.visual = this.generateVisual(partialTrace.discreteCodes, contextEmbedding, partialTrace.partialObservation.visual);
            completed.missingMask = { ...completed.missingMask, visual: false };
        }
        if (completionMask.audio && partialTrace.missingMask.audio) {
            completed.partialObservation.audio = this.generateAudio(partialTrace.discreteCodes, contextEmbedding);
            completed.missingMask = { ...completed.missingMask, audio: false };
        }
        if (completionMask.state && partialTrace.missingMask.state) {
            completed.partialObservation.state = this.generateState(partialTrace.discreteCodes, contextEmbedding, partialTrace.partialObservation.state);
            completed.missingMask = { ...completed.missingMask, state: false };
        }
        return completed;
    }
    generateFromScratch(contextId, seedCodes) {
        const contextEmbedding = this.contextEmbeddings.get(contextId);
        const codes = seedCodes || this.sampleCodes(contextId);
        return {
            id: `generated_${Date.now()}_${codes[0] || 0}`,
            contextId,
            contextLabel: contextId,
            discreteCodes: codes,
            codebookSize: 512,
            partialObservation: {
                visual: this.generateVisual(codes, contextEmbedding),
                audio: this.generateAudio(codes, contextEmbedding),
                state: this.generateState(codes, contextEmbedding),
            },
            missingMask: { visual: false, audio: false, state: false },
            timestamp: Date.now(),
            sequenceIndex: 0,
            semanticEmbedding: contextEmbedding,
            attentionLevel: 1.0,
        };
    }
    generateVisual(codes, contextEmbedding, partialVisual) {
        const size = 256 * 256 * 3;
        const visual = partialVisual ? new Float32Array(partialVisual) : new Float32Array(size);
        for (let i = 0; i < size; i++) {
            if (!partialVisual || visual[i] === 0) {
                const codeIdx = codes[Math.floor((i / size) * codes.length)] || 0;
                const ctxVal = contextEmbedding[i % contextEmbedding.length];
                visual[i] = Math.sin(codeIdx * 0.1 + ctxVal * 0.5 + i * 0.01) * 0.5 + 0.5;
            }
        }
        return visual;
    }
    generateAudio(codes, contextEmbedding) {
        const size = 16000;
        const audio = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            const codeIdx = codes[Math.floor((i / size) * codes.length)] || 0;
            const ctxVal = contextEmbedding[i % contextEmbedding.length];
            audio[i] = Math.sin(codeIdx * 0.05 + ctxVal * 0.3 + i * 0.001) * 0.3;
        }
        return audio;
    }
    generateState(codes, contextEmbedding, partialState) {
        const state = partialState ? { ...partialState } : {};
        if (!state.playerPosition) {
            state.playerPosition = {
                x: Math.sin((codes[0] || 0) * 0.1) * 100,
                y: Math.cos((codes[1] || 0) * 0.1) * 100,
                z: Math.sin((codes[2] || 0) * 0.1) * 50,
            };
        }
        if (!state.health)
            state.health = 100;
        if (!state.ammo)
            state.ammo = 50;
        if (!state.level)
            state.level = 'generated';
        return state;
    }
    sampleCodes(contextId) {
        const length = 64;
        const codes = [];
        for (let i = 0; i < length; i++) {
            codes.push((i * 7 + contextId.length * 13) % 512);
        }
        return codes;
    }
}
exports.PixelCNNGenerator = PixelCNNGenerator;
class Hippocampus {
    contexts = new Map();
    vectorQuantizers = new Map();
    vqConfig;
    constructor(vqConfig) {
        this.vqConfig = {
            inputResolution: [256, 256],
            latentResolution: [64, 64],
            numEmbeddings: 512,
            embeddingDim: 64,
            commitmentCost: 0.25,
            ...vqConfig,
        };
    }
    createContext(id, label, domain) {
        const context = {
            id, label, domain, traces: [],
            semanticCentroid: new Float32Array(64),
            codebook: [], isActive: false,
            totalEpisodes: 0, averageTraceLength: 0, compressionRatio: 0,
        };
        this.contexts.set(id, context);
        this.vectorQuantizers.set(id, new VectorQuantizer(this.vqConfig));
        return context;
    }
    storeTrace(contextId, observation, attentionLevel = 0.5) {
        const context = this.contexts.get(contextId);
        const vq = this.vectorQuantizers.get(contextId);
        if (!context || !vq)
            throw new Error(`Context ${contextId} not found`);
        const continuousLatent = observation.visual
            ? this.observationToLatent(observation)
            : new Float32Array(this.vqConfig.latentResolution[0] * this.vqConfig.latentResolution[1] * this.vqConfig.embeddingDim);
        const { codes } = vq.encode(continuousLatent);
        const missingMask = {
            visual: attentionLevel < 0.3 || !observation.visual,
            audio: attentionLevel < 0.5 || !observation.audio,
            state: attentionLevel < 0.7 || !observation.state,
        };
        const trace = {
            id: `trace_${contextId}_${Date.now()}_${context.traces.length}`,
            contextId, contextLabel: context.label,
            discreteCodes: codes, codebookSize: this.vqConfig.numEmbeddings,
            partialObservation: observation, missingMask,
            timestamp: Date.now(), sequenceIndex: context.traces.length,
            semanticEmbedding: this.computeSemanticEmbedding(observation, context),
            attentionLevel,
        };
        context.traces.push(trace);
        context.totalEpisodes++;
        context.averageTraceLength = context.traces.reduce((sum, t) => sum + t.discreteCodes.length, 0) / context.traces.length;
        context.compressionRatio = this.computeCompressionRatio(trace);
        this.updateCentroid(context, trace.semanticEmbedding);
        return trace;
    }
    retrieve(queryEmbedding, contextId, topK = 5) {
        const candidates = [];
        if (contextId) {
            const ctx = this.contexts.get(contextId);
            if (ctx)
                candidates.push(...ctx.traces);
        }
        else {
            for (const ctx of this.contexts.values())
                candidates.push(...ctx.traces);
        }
        const scored = candidates.map((trace) => ({
            trace,
            similarity: this.cosineSimilarity(queryEmbedding, trace.semanticEmbedding),
        }));
        scored.sort((a, b) => b.similarity - a.similarity);
        return scored.slice(0, topK).map((s) => s.trace);
    }
    activateContext(contextId) {
        for (const ctx of this.contexts.values())
            ctx.isActive = ctx.id === contextId;
    }
    getActiveContext() {
        return Array.from(this.contexts.values()).find((c) => c.isActive);
    }
    getContext(id) {
        return this.contexts.get(id);
    }
    getAllContexts() {
        return Array.from(this.contexts.values());
    }
    observationToLatent(obs) {
        const size = this.vqConfig.latentResolution[0] * this.vqConfig.latentResolution[1] * this.vqConfig.embeddingDim;
        const latent = new Float32Array(size);
        if (obs.visual) {
            for (let i = 0; i < Math.min(obs.visual.length, size); i++)
                latent[i] = obs.visual[i];
        }
        return latent;
    }
    computeSemanticEmbedding(obs, context) {
        const emb = new Float32Array(64);
        if (obs.visual) {
            for (let i = 0; i < 20 && i < obs.visual.length; i++)
                emb[i % 64] += obs.visual[i];
        }
        if (obs.state) {
            const stateStr = JSON.stringify(obs.state);
            for (let i = 0; i < stateStr.length; i++)
                emb[(i + 20) % 64] += stateStr.charCodeAt(i) / 255;
        }
        const domainBias = { fps: 0.1, rpg: 0.2, platformer: 0.3, strategy: 0.4, puzzle: 0.5, simulation: 0.6, custom: 0.7 };
        emb[63] = domainBias[context.domain] || 0;
        const norm = Math.sqrt(emb.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0)
            for (let i = 0; i < emb.length; i++)
                emb[i] /= norm;
        return emb;
    }
    updateCentroid(context, embedding) {
        const n = context.traces.length;
        for (let i = 0; i < context.semanticCentroid.length; i++) {
            context.semanticCentroid[i] = (context.semanticCentroid[i] * (n - 1) + embedding[i]) / n;
        }
    }
    computeCompressionRatio(trace) {
        const originalSize = trace.partialObservation.visual?.length || 256 * 256 * 3;
        const compressedSize = trace.discreteCodes.length * 4;
        return originalSize / (compressedSize + 1);
    }
    cosineSimilarity(a, b) {
        let dot = 0, aNorm = 0, bNorm = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            dot += a[i] * b[i];
            aNorm += a[i] * a[i];
            bNorm += b[i] * b[i];
        }
        return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm) + 1e-10);
    }
}
exports.Hippocampus = Hippocampus;
class Neocortex {
    hippocampus;
    pixelCNN;
    constructor(hippocampus) {
        this.hippocampus = hippocampus;
        this.pixelCNN = new PixelCNNGenerator();
    }
    completeTrace(trace) {
        return this.pixelCNN.complete(trace, trace.missingMask);
    }
    generateEpisode(contextId, seedCodes) {
        return this.pixelCNN.generateFromScratch(contextId, seedCodes);
    }
    registerContextEmbedding(contextId, embedding) {
        this.pixelCNN.registerContext(contextId, embedding);
    }
}
exports.Neocortex = Neocortex;
class AtoSwitchingLayer {
    hippocampus;
    neocortex;
    activeBlend = null;
    constructor(hippocampus, neocortex) {
        this.hippocampus = hippocampus;
        this.neocortex = neocortex;
    }
    switchContext(contextId) {
        this.hippocampus.activateContext(contextId);
        this.activeBlend = null;
    }
    blendContexts(contextA, contextB, alpha = 0.5) {
        this.activeBlend = { contextA, contextB, alpha };
    }
    generateNextFrame(previousTrace) {
        if (this.activeBlend) {
            const embA = this.hippocampus.getContext(this.activeBlend.contextA)?.semanticCentroid || new Float32Array(64);
            const embB = this.hippocampus.getContext(this.activeBlend.contextB)?.semanticCentroid || new Float32Array(64);
            const blended = new Float32Array(64);
            for (let i = 0; i < 64; i++)
                blended[i] = embA[i] * (1 - this.activeBlend.alpha) + embB[i] * this.activeBlend.alpha;
            const trace = this.neocortex.generateEpisode(this.activeBlend.contextA);
            trace.semanticEmbedding = blended;
            trace.contextLabel = `${this.activeBlend.contextA}_x_${this.activeBlend.contextB}`;
            return trace;
        }
        const activeContext = this.hippocampus.getActiveContext();
        if (!activeContext)
            throw new Error('No active context. Call switchContext() first.');
        if (previousTrace)
            return this.neocortex.completeTrace(previousTrace);
        return this.neocortex.generateEpisode(activeContext.id);
    }
    getActiveBlend() {
        return this.activeBlend;
    }
}
exports.AtoSwitchingLayer = AtoSwitchingLayer;
class AutopoieticGenerator {
    hippocampus;
    neocortex;
    constructor(hippocampus, neocortex, _switchingLayer) {
        this.hippocampus = hippocampus;
        this.neocortex = neocortex;
    }
    evolveNewSystem(parentContexts, generations = 10) {
        const newId = `evolved_${Date.now()}`;
        const newContext = this.hippocampus.createContext(newId, `Evolved System (${parentContexts.join(' + ')})`, 'custom');
        const parentEmbeddings = parentContexts.map((id) => {
            const ctx = this.hippocampus.getContext(id);
            return ctx ? ctx.semanticCentroid : new Float32Array(64);
        });
        const blendedEmb = this.blendEmbeddings(parentEmbeddings);
        this.neocortex.registerContextEmbedding(newId, blendedEmb);
        for (let gen = 0; gen < generations; gen++) {
            const parentTrace = this.selectRandomTrace(parentContexts);
            if (parentTrace) {
                const mutated = this.mutateTrace(parentTrace, gen);
                this.hippocampus.storeTrace(newId, mutated.partialObservation, mutated.attentionLevel);
            }
        }
        return newContext;
    }
    generateNovelSystem(label) {
        const newId = `novel_${Date.now()}`;
        const context = this.hippocampus.createContext(newId, label, 'custom');
        const novelEmb = new Float32Array(64);
        for (let i = 0; i < 64; i++)
            novelEmb[i] = Math.sin(i * 0.7) * 0.8;
        this.neocortex.registerContextEmbedding(newId, novelEmb);
        for (let i = 0; i < 5; i++) {
            const episode = this.neocortex.generateEpisode(newId);
            this.hippocampus.storeTrace(newId, episode.partialObservation, 0.8);
        }
        return context;
    }
    blendEmbeddings(embeddings) {
        const result = new Float32Array(64);
        for (const emb of embeddings) {
            for (let i = 0; i < 64; i++)
                result[i] += emb[i] / embeddings.length;
        }
        return result;
    }
    selectRandomTrace(contextIds) {
        const allTraces = contextIds.flatMap((id) => {
            const ctx = this.hippocampus.getContext(id);
            return ctx ? ctx.traces : [];
        });
        return allTraces.length > 0 ? allTraces[0] : undefined;
    }
    mutateTrace(trace, generation) {
        const mutated = {
            ...trace,
            id: `mutated_${Date.now()}_${generation}`,
            discreteCodes: trace.discreteCodes.map((c, i) => ((c + i + generation) % trace.codebookSize)),
            timestamp: Date.now(),
        };
        if (mutated.partialObservation.visual) {
            for (let i = 0; i < mutated.partialObservation.visual.length; i++) {
                mutated.partialObservation.visual[i] += Math.sin(i * 0.1 + generation) * 0.05;
            }
        }
        return mutated;
    }
}
exports.AutopoieticGenerator = AutopoieticGenerator;
class AtoEngine {
    hippocampus;
    neocortex;
    switchingLayer;
    autopoietic;
    constructor(vqConfig) {
        this.hippocampus = new Hippocampus(vqConfig);
        this.neocortex = new Neocortex(this.hippocampus);
        this.switchingLayer = new AtoSwitchingLayer(this.hippocampus, this.neocortex);
        this.autopoietic = new AutopoieticGenerator(this.hippocampus, this.neocortex, this.switchingLayer);
    }
    learnSystem(id, label, domain) {
        const context = this.hippocampus.createContext(id, label, domain);
        const embedding = new Float32Array(64);
        for (let i = 0; i < 64; i++)
            embedding[i] = Math.sin(i * 0.3 + id.length) * 0.8;
        this.neocortex.registerContextEmbedding(id, embedding);
        return context;
    }
    storeEpisode(contextId, observation, attentionLevel = 0.5) {
        return this.hippocampus.storeTrace(contextId, observation, attentionLevel);
    }
    switchSystem(contextId) {
        this.switchingLayer.switchContext(contextId);
    }
    generateFrame(previousTrace) {
        return this.switchingLayer.generateNextFrame(previousTrace);
    }
    blendSystems(contextA, contextB, alpha = 0.5) {
        this.switchingLayer.blendContexts(contextA, contextB, alpha);
    }
    evolveSystem(parentContexts, generations = 10) {
        return this.autopoietic.evolveNewSystem(parentContexts, generations);
    }
    createNovelSystem(label) {
        return this.autopoietic.generateNovelSystem(label);
    }
    complete(trace) {
        return this.neocortex.completeTrace(trace);
    }
    recall(query, contextId, topK = 5) {
        return this.hippocampus.retrieve(query, contextId, topK);
    }
    getStats() {
        const contexts = this.hippocampus.getAllContexts();
        return {
            totalContexts: contexts.length,
            totalTraces: contexts.reduce((sum, c) => sum + c.traces.length, 0),
            activeContext: this.hippocampus.getActiveContext()?.label || 'none',
            blend: this.switchingLayer.getActiveBlend(),
        };
    }
}
exports.AtoEngine = AtoEngine;
exports.default = AtoEngine;
//# sourceMappingURL=ato-engine.js.map