"use strict";
/**
 * ============================================================
 * PIPELINE v5 — Fixed: recursive seed bug, exports, sensory integration
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestGapFillPipeline = exports.DEFAULT_CONFIG = void 0;
exports.demo = demo;
const core_engine_1 = require("./core-engine");
const klein_full_toolkit_1 = require("./klein-full-toolkit");
const ato_engine_1 = require("./ato-engine");
const klein_mesh_game_engine_1 = require("./klein-mesh-game-engine");
const sensory_adapter_1 = require("./sensory-adapter");
exports.DEFAULT_CONFIG = {
    maxFileSize: 50 * 1024 * 1024,
    allowedExtensions: [
        'ts', 'js', 'tsx', 'jsx', 'py', 'html', 'css', 'json',
        'md', 'yaml', 'yml', 'xml', 'glsl', 'shader', 'wasm',
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg',
        'gltf', 'obj', 'fbx',
    ],
    recursive: true,
    narrativeLength: 8,
    narrativeMorphology: 'linear',
    autoFill: true,
    fillSeverity: ['critical', 'warning'],
    outputDir: './output',
    verbose: true,
    messyFeatureDimension: 256,
    messyMutationRate: 0.05,
    autoNovelMode: 'code',
    vqCodebookSize: 512,
    vqEmbeddingDim: 64,
    enableAto: true,
    enableKleinMesh: true,
};
class IngestGapFillPipeline {
    engine;
    klein;
    ato = null;
    kleinMesh = null;
    sensory = null;
    config;
    logs = [];
    // FIX: Track ALL signals (original + generated) for recursive seed lookup
    allSignals = [];
    constructor(config = {}) {
        this.config = { ...exports.DEFAULT_CONFIG, ...config };
        this.engine = new core_engine_1.IngestGapFillEngine();
        this.klein = new klein_full_toolkit_1.KleinEngine();
        if (this.config.enableAto) {
            this.ato = new ato_engine_1.AtoEngine({
                numEmbeddings: this.config.vqCodebookSize,
                embeddingDim: this.config.vqEmbeddingDim,
            });
        }
        if (this.config.enableKleinMesh) {
            this.kleinMesh = new klein_mesh_game_engine_1.KleinMeshGameEngine(this.config.vqCodebookSize);
            this.sensory = new sensory_adapter_1.SensoryInputAdapter();
        }
    }
    async initialize() {
        this.logEntry('╔══════════════════════════════════════════════════════════════╗');
        this.logEntry('║  INGEST-GAPFILL PIPELINE v5 — DISEMINER with Eyes             ║');
        this.logEntry('╠══════════════════════════════════════════════════════════════╣');
        this.logEntry('║  Core: D1-D5 Cognitive Stack                               ║');
        this.logEntry('║  Klein: 8 tools on MESSY substrate                           ║');
        this.logEntry('║  ATO: Episodic memory + semantic completion                  ║');
        this.logEntry('║  Klein-Mesh: Multi-game grammar engine with DISEMINER eyes    ║');
        this.logEntry('║  Sensory: Structured observation adapter (sight upgraded)      ║');
        this.logEntry('╚══════════════════════════════════════════════════════════════╝');
        this.logEntry('');
        this.logEntry('Pipeline initialized. Ready to ingest, watch, learn, and blend.');
    }
    logEntry(message) {
        const entry = `[${new Date().toISOString()}] ${message}`;
        this.logs.push(entry);
        if (this.config.verbose)
            console.log(entry);
    }
    // ═══════════════════════════════════════════════════════
    // INGESTION — Fixed: all signals tracked for recursive lookup
    // ═══════════════════════════════════════════════════════
    async ingestFile(filePath, content) {
        this.logEntry(`📥 Ingesting: ${filePath}`);
        const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content);
        const signal = await this.engine.ingestFile(contentStr, filePath.split('/').pop() || 'unknown', {
            path: filePath,
        });
        // FIX: Track in allSignals for recursive seed lookup
        this.allSignals.push(signal);
        const messySymbol = await this.klein.process(contentStr, `messy_${signal.id}`);
        const fiveW = this.klein.ask5W(messySymbol.id);
        this.log5W(fiveW);
        return { signal, messySymbol, fiveW };
    }
    log5W(fiveW) {
        const entries = [];
        if (fiveW.who)
            entries.push(`Who: ${fiveW.who}`);
        if (fiveW.what)
            entries.push(`What: ${fiveW.what}`);
        if (fiveW.where)
            entries.push(`Where: ${fiveW.where}`);
        if (fiveW.when)
            entries.push(`When: ${fiveW.when}`);
        if (fiveW.why)
            entries.push(`Why: ${fiveW.why}`);
        if (entries.length > 0) {
            this.logEntry(`  -> AUTOLING 5W: ${entries.join(' | ')}`);
        }
    }
    async ingestDirectory(dirPath, files) {
        this.logEntry(`📂 Ingesting directory: ${dirPath}`);
        const results = [];
        for (const [path, content] of Object.entries(files)) {
            const ext = path.split('.').pop()?.toLowerCase() || '';
            if (!this.config.allowedExtensions.includes(ext)) {
                this.logEntry(`  -> Skipping (not allowed): ${path}`);
                continue;
            }
            if (content.length > this.config.maxFileSize) {
                this.logEntry(`  -> Skipping (too large): ${path}`);
                continue;
            }
            const result = await this.ingestFile(path, content);
            results.push(result);
        }
        this.logEntry(`Directory complete: ${results.length} files`);
        return results;
    }
    // ═══════════════════════════════════════════════════════
    // SENSORY INPUT — DISEMINER's Eyes
    // ═══════════════════════════════════════════════════════
    /**
     * Feed a structured observation from the sensory adapter into DISEMINER.
     * DISEMINER now has eyes: it learns objects, relations, and changes.
     */
    ingestObservation(gameId, observation) {
        if (!this.kleinMesh)
            throw new Error('Klein-Mesh not enabled');
        const ctx = this.kleinMesh['contexts'].get(gameId);
        if (!ctx)
            throw new Error(`Game ${gameId} not found`);
        ctx.diseMiner.ingestObservation(observation, gameId);
        this.logEntry(`👁 DISEMINER ingested observation for ${gameId}: ${observation.objects.length} objects, ${observation.relations.length} relations, ${observation.changes.length} changes`);
    }
    /**
     * Create a perception from raw sensor data and feed it into the mesh.
     */
    perceive(gameId, inputs) {
        if (!this.sensory || !this.kleinMesh)
            throw new Error('Sensory/Klein-Mesh not enabled');
        const perception = this.sensory.createPerceptionFromSensors(inputs);
        if (perception.sight) {
            this.ingestObservation(gameId, perception.sight);
        }
        return perception;
    }
    // ═══════════════════════════════════════════════════════
    // MESSY MORPHING
    // ═══════════════════════════════════════════════════════
    morphSymbol(symbolId) {
        this.logEntry(`🔄 Morphing ${symbolId} through MESSY...`);
        const semantic = this.klein.messy.morph(symbolId, 'semantic');
        this.logEntry(`  D2->D3: semantic -- ${semantic.id}`);
        const behavioral = this.klein.messy.morph(semantic.id, 'behavioral');
        this.logEntry(`  D3->D4: behavioral -- ${behavioral.id}`);
        const narrative = this.klein.messy.morph(behavioral.id, 'narrative');
        this.logEntry(`  D4->D5: narrative -- ${narrative.id}`);
        const connectionist = this.klein.messy.morph(narrative.id, 'connectionist');
        this.logEntry(`  D5: connectionist -- ${connectionist.id}`);
        return connectionist;
    }
    morphThroughTime(symbolId, epochs = 5) {
        this.logEntry(`⏳ Morphing ${symbolId} through ${epochs} epochs...`);
        return this.klein.messy.simulateEpochs(symbolId, epochs);
    }
    // ═══════════════════════════════════════════════════════
    // SYNTHESIS & RECURSIVE GAP FILLING
    // ═══════════════════════════════════════════════════════
    synthesize() {
        this.logEntry('🔬 Synthesizing world model...');
        const world = this.engine.synthesize();
        this.logEntry(`  Nodes: ${world.nodes.length}`);
        this.logEntry(`  Gaps detected: ${world.gaps.length}`);
        this.logEntry(`  Gaps filled: ${world.filled.length}`);
        this.logEntry(`  Coverage: ${(world.emergentProperties.get('coverage') * 100).toFixed(1)}%`);
        return world;
    }
    fillAllGaps() {
        this.logEntry('🔧 Filling all detected gaps (recursive)...');
        const world = this.synthesize();
        const filled = [];
        for (const gap of world.gaps) {
            if (this.config.fillSeverity.includes(gap.severity)) {
                if (gap.triggeringAnalogy) {
                    this.logEntry(`  🎨 Analogy-driven fill: ${gap.gapType} (${gap.triggeringAnalogy.sourceDomain} -> ${gap.triggeringAnalogy.targetDomain})`);
                }
                const artifacts = this.engine.rolloutNode(gap.nodeId, 1);
                filled.push(...artifacts);
                this.logEntry(`  ✓ Filled ${gap.gapType} for ${gap.nodeId} (${gap.severity})`);
            }
        }
        this.logEntry(`Total filled: ${filled.length}`);
        return filled;
    }
    // ═══════════════════════════════════════════════════════
    // AUTO NOVEL
    // ═══════════════════════════════════════════════════════
    writeCode(requirements) {
        this.logEntry(`📝 Auto Novel generating code: "${requirements}"`);
        const code = this.klein.writeCode(requirements);
        this.logEntry(`  Generated ${code.split('\n').length} lines`);
        return code;
    }
    tellStory(theme, length = 8) {
        this.logEntry(`📖 Generating folktale: "${theme}"`);
        const tale = this.klein.tellStory(theme, length);
        const rendered = this.renderFolktale(tale);
        this.logEntry(`  ${tale.functions.length} functions, ${tale.mythemes.length} mythemes`);
        return rendered;
    }
    renderFolktale(tale) {
        const lines = [
            '# Folktale Generated by Propp/Lévi-Strauss Module',
            '',
            '## Narrative Functions',
            ...tale.functions.map((f, i) => `${i + 1}. **${f.name}** -- ${f.roles.join(', ')}`),
            '',
            '## Mythemes (Lévi-Strauss)',
            ...tale.mythemes.map((m) => `- ${m.concept}: ${m.value > 0 ? '+' : ''}${m.value}`),
        ];
        return lines.join('\n');
    }
    // ═══════════════════════════════════════════════════════
    // KLEIN-MESH GAME ENGINE
    // ═══════════════════════════════════════════════════════
    createGame(id, name, genre) {
        if (!this.kleinMesh)
            throw new Error('Klein-Mesh not enabled');
        return this.kleinMesh.createGame(id, name, genre);
    }
    ingestGameplay(gameId, session) {
        if (!this.kleinMesh)
            throw new Error('Klein-Mesh not enabled');
        this.kleinMesh.ingestGameplay(gameId, session);
    }
    switchGame(gameId) {
        if (!this.kleinMesh)
            throw new Error('Klein-Mesh not enabled');
        this.kleinMesh.switchGame(gameId);
    }
    blendGames(gameA, gameB, hybridId, alpha = 0.5) {
        if (!this.kleinMesh)
            throw new Error('Klein-Mesh not enabled');
        return this.kleinMesh.blendGames(gameA, gameB, hybridId, alpha);
    }
    isPossible(action, target, gameId) {
        if (!this.kleinMesh)
            return false;
        return this.kleinMesh.isPossible(action, target, gameId);
    }
    evolveGame(gameId, years = 25) {
        if (!this.kleinMesh)
            throw new Error('Klein-Mesh not enabled');
        return this.kleinMesh.evolveGame(gameId, years);
    }
    listGames() {
        if (!this.kleinMesh)
            return [];
        return this.kleinMesh.listGames();
    }
    // ═══════════════════════════════════════════════════════
    // ATO
    // ═══════════════════════════════════════════════════════
    learnGame(id, label, domain) {
        if (!this.ato)
            throw new Error('ATO not enabled');
        const ctx = this.ato.learnSystem(id, label, domain);
        this.logEntry(`🎮 Learned game: ${label} (${domain}) -- ID: ${id}`);
        return ctx;
    }
    storeEpisode(gameId, frameData, gameState, action, attentionLevel = 0.8) {
        if (!this.ato)
            throw new Error('ATO not enabled');
        const trace = this.ato.storeEpisode(gameId, { visual: frameData, state: { ...gameState, action } }, attentionLevel);
        this.logEntry(`  📝 Stored episode ${trace.sequenceIndex} in ${gameId} (attention: ${attentionLevel})`);
        return trace;
    }
    switchAtoGame(gameId) {
        if (!this.ato)
            throw new Error('ATO not enabled');
        this.ato.switchSystem(gameId);
        this.logEntry(`🔄 Switched to ATO game: ${gameId}`);
    }
    generateGameFrame(previousTrace) {
        if (!this.ato)
            throw new Error('ATO not enabled');
        const frame = this.ato.generateFrame(previousTrace);
        this.logEntry(`🎨 Generated frame for ${frame.contextId} (codes: ${frame.discreteCodes.length})`);
        return frame;
    }
    completeTrace(trace) {
        if (!this.ato)
            throw new Error('ATO not enabled');
        const completed = this.ato.complete(trace);
        const filled = Object.entries(completed.missingMask)
            .filter(([_, v]) => !v)
            .map(([k, _]) => k);
        this.logEntry(`🔧 Completed trace: filled ${filled.join(', ')}`);
        return completed;
    }
    // ═══════════════════════════════════════════════════════
    // QUERY & EXPORT
    // ═══════════════════════════════════════════════════════
    query(pattern) {
        return this.engine.query(pattern);
    }
    ask5W(symbolId) {
        return this.klein.ask5W(symbolId);
    }
    getStats() {
        const engineStats = this.engine.getStats();
        const kleinStats = this.klein.getStats();
        const atoStats = this.ato?.getStats();
        const meshStats = this.kleinMesh?.listGames();
        return {
            ...engineStats,
            ...kleinStats,
            ato: atoStats,
            kleinMesh: meshStats,
            autoNovelMode: this.config.autoNovelMode,
            logEntries: this.logs.length,
        };
    }
    exportWorldModel() {
        return this.engine.exportWorldModel();
    }
    getLogs() {
        return this.logs;
    }
}
exports.IngestGapFillPipeline = IngestGapFillPipeline;
// ═══════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════
async function demo() {
    const pipeline = new IngestGapFillPipeline({
        autoFill: true,
        autoNovelMode: 'code',
        enableAto: true,
        enableKleinMesh: true,
        verbose: true,
    });
    await pipeline.initialize();
    // Ingest files
    const results = await pipeline.ingestDirectory('demo', {
        'src/engine.ts': `
      import { Renderer } from './renderer';
      import { Physics } from './physics';
      export class GameEngine {
        private renderer: Renderer;
        private physics: Physics;
        constructor() {
          this.renderer = new Renderer();
          this.physics = new Physics();
        }
        update(dt: number) {
          this.physics.step(dt);
          this.renderer.render();
        }
      }
    `,
        'src/renderer.ts': `
      export class Renderer {
        render() {
          // WebGL rendering
        }
      }
    `,
        'src/physics.ts': `
      export class Physics {
        step(dt: number) {
          // Physics simulation
        }
      }
    `,
        'package.json': JSON.stringify({
            name: 'demo-game',
            version: '1.0.0',
            dependencies: { three: '^0.160.0', 'cannon-es': '^0.20.0' },
        }),
        'README.md': '# Demo Game\n\nA simple game engine demo.',
    });
    // Synthesize and fill gaps
    const world = pipeline.synthesize();
    const fills = pipeline.fillAllGaps();
    // Show generated artifacts
    console.log('\n=== GENERATED ARTIFACTS ===');
    for (const fill of fills.slice(0, 3)) {
        console.log(`\n--- ${fill.filename} (${fill.generator}) ---`);
        console.log(fill.content.slice(0, 500));
    }
    // Klein-Mesh: Create games with DISEMINER eyes
    pipeline.createGame('doom', 'DOOM (FPS)', 'fps');
    pipeline.createGame('zelda', 'Zelda (RPG)', 'rpg');
    // Ingest gameplay with structured observations (DISEMINER's eyes)
    pipeline.ingestGameplay('doom', {
        observations: [
            {
                timestamp: Date.now(),
                frameIndex: 1,
                frameEmbedding: new Float32Array(64),
                objects: [
                    { id: 'player', position: { x: 100, y: 200 }, velocity: { x: 0, y: 0 }, appearanceEmbedding: new Float32Array(64), confidence: 0.95 },
                    { id: 'imp', position: { x: 300, y: 200 }, velocity: { x: -1, y: 0 }, appearanceEmbedding: new Float32Array(64), confidence: 0.9 },
                ],
                relations: [
                    { subject: 'player', predicate: 'near', object: 'imp', confidence: 0.8, frameIndex: 1 },
                ],
                changes: [],
                raw: { values: {}, source: 'sight', timestamp: Date.now() },
            },
            {
                timestamp: Date.now(),
                frameIndex: 2,
                frameEmbedding: new Float32Array(64),
                objects: [
                    { id: 'player', position: { x: 100, y: 200 }, velocity: { x: 0, y: 0 }, appearanceEmbedding: new Float32Array(64), confidence: 0.95 },
                    { id: 'imp', position: { x: 250, y: 200 }, velocity: { x: -2, y: 0 }, appearanceEmbedding: new Float32Array(64), confidence: 0.9 },
                ],
                relations: [
                    { subject: 'projectile', predicate: 'collides', object: 'imp', confidence: 0.85, frameIndex: 2 },
                ],
                changes: [
                    { subject: 'imp', property: 'health', before: 100, after: 74, delta: -26, cause: 'shoot' },
                ],
                raw: { values: {}, source: 'sight', timestamp: Date.now() },
            },
        ],
    });
    // Query DISEMINER
    console.log('\n=== DISEMINER EYES ===');
    console.log(`player -> imp possible? ${pipeline.isPossible('player', 'imp', 'doom')}`);
    console.log(`shoot -> imp.health possible? ${pipeline.isPossible('shoot', 'imp.health', 'doom')}`);
    // Blend games
    const hybrid = pipeline.blendGames('doom', 'zelda', 'doomzelda', 0.5);
    console.log(`\nHybrid: ${hybrid.name}`);
    console.log(`Direct links: ${hybrid.diseMiner.exportDirectLinks().length}`);
    console.log(`Grammar rules: ${hybrid.grammar.getStats().rules}`);
    // Stats
    console.log('\n=== STATS ===');
    console.log(JSON.stringify(pipeline.getStats(), null, 2));
    return { world, fills, stats: pipeline.getStats() };
}
if (typeof window === 'undefined') {
    demo().catch(console.error);
}
exports.default = IngestGapFillPipeline;
//# sourceMappingURL=pipeline.js.map