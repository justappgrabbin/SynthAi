/**
 * synthia-video-perception-center.ts
 * Synthia Video Perception Center — MCP Server
 * 
 * Protocol: Model Context Protocol (MCP)
 * Transport: stdio (default) or HTTP/SSE
 * 
 * Tools:
 *   - perceive_video        : Frame → Event stream (RetinoSim)
 *   - generate_video        : Intent → Raw video (Helios)
 *   - transform_video       : Video + Reference → Transformed video (OmniTransfer)
 *   - package_video         : Narrative → Packaged short (short-video-maker)
 *   - synchronize_video     : Symbol + Video → Synchronized playback (ly2video)
 *   - understand_video      : Video → Knowledge graph (video_annotation)
 *   - run_full_loop         : Intent → Complete autopoietic cycle
 *   - get_loop_health       : Report cognitive loop stability
 *   - get_growth_rules      : List active growth rules
 *   - spawn_subsystem       : Manually trigger growth rule spawning
 * 
 * Centers mapped:
 *   PERCEIVE   → Body (biological frontend)
 *   GENERATE   → Mind (creative generation)
 *   TRANSFORM  → Intelligence (property transfer)
 *   PACKAGE    → Broadcast (narrative composition)
 *   SYNCHRONIZE→ Memory (temporal binding)
 *   UNDERSTAND → Governance (knowledge extraction)
 *   FEEDBACK   → Heart (resonance tuning)
 */

import { Retina, EventPacket, PerceptionConfig, DEFAULT_PERCEPTION_CONFIG, EventVisualizer } from './autonove-perception';
import {
  AutonoveVideoCognition,
  CognitiveState,
  LoopResult,
  PackageConfig,
  KnowledgeTriple,
  FeedbackSignal,
} from './autonove-video-cognition';
import {
  GrowthEngine,
  GrowthRule,
  RULE_RETINOSIM_PERCEPTION,
  RULE_HELIOS_GENERATION,
  RULE_OMNITRANSFER_TRANSFORMATION,
  RULE_SHORTVIDEO_COMPOSITION,
  RULE_LY2VIDEO_SYNCHRONIZATION,
  RULE_VIDEOANNOTATION_EXTRACTION,
  RULE_FEEDBACK_CLOSURE,
  RULE_UNIVERSAL_GRAMMAR,
} from './ingest-lessons-complete';

// ─────────────────────────────────────────────────────────────
// MCP Protocol Types (simplified — use @modelcontextprotocol/sdk in production)
// ─────────────────────────────────────────────────────────────

export interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Synthia Video Perception Center
// ─────────────────────────────────────────────────────────────

export class SynthiaVideoPerceptionCenter {
  private retina: Retina;
  private cognition: AutonoveVideoCognition;
  private growthEngine: GrowthEngine;
  private toolRegistry: Map<string, (args: unknown) => Promise<unknown>> = new Map();
  private sessionId: string;
  private startTime: number;

  constructor(options?: {
    perceptionConfig?: PerceptionConfig;
    generator?: (intent: string, config: unknown) => Promise<unknown>;
    transformer?: (input: unknown, reference: unknown, mode: string) => Promise<unknown>;
    packager?: (config: PackageConfig) => Promise<unknown>;
    extractor?: (videoData: unknown) => Promise<KnowledgeTriple[]>;
  }) {
    this.sessionId = `synthia-vpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.startTime = Date.now();

    this.retina = new Retina(options?.perceptionConfig || DEFAULT_PERCEPTION_CONFIG);
    this.cognition = new AutonoveVideoCognition(options);
    this.growthEngine = new GrowthEngine();
    this.growthEngine.loadVideoCognitionCorpus();

    this.registerTools();
  }

  private registerTools(): void {
    this.toolRegistry.set('perceive_video', this.perceiveVideo.bind(this));
    this.toolRegistry.set('generate_video', this.generateVideo.bind(this));
    this.toolRegistry.set('transform_video', this.transformVideo.bind(this));
    this.toolRegistry.set('package_video', this.packageVideo.bind(this));
    this.toolRegistry.set('synchronize_video', this.synchronizeVideo.bind(this));
    this.toolRegistry.set('understand_video', this.understandVideo.bind(this));
    this.toolRegistry.set('run_full_loop', this.runFullLoop.bind(this));
    this.toolRegistry.set('get_loop_health', this.getLoopHealth.bind(this));
    this.toolRegistry.set('get_growth_rules', this.getGrowthRules.bind(this));
    this.toolRegistry.set('spawn_subsystem', this.spawnSubsystem.bind(this));
    this.toolRegistry.set('get_event_visualization', this.getEventVisualization.bind(this));
  }

  // ─────────────────────────────────────────────────────────
  // Tool: perceive_video
  // ─────────────────────────────────────────────────────────

  private async perceiveVideo(args: unknown): Promise<unknown> {
    const { frameData, width, height, timestamp, configOverride } = args as {
      frameData: number[]; // RGBA flat array
      width: number;
      height: number;
      timestamp?: number;
      configOverride?: Partial<PerceptionConfig>;
    };

    // Reconstruct ImageData-like object
    const imageData = {
      data: new Uint8ClampedArray(frameData),
      width,
      height,
    };

    if (configOverride) {
      this.retina = new Retina({ ...DEFAULT_PERCEPTION_CONFIG, ...configOverride, width, height });
    }

    const t = timestamp || Date.now();
    const events = this.retina.perceive(imageData as any, t);
    const stats = this.retina.getStatistics();

    return {
      events: events.map(e => ({
        x: e.x,
        y: e.y,
        polarity: e.p,
        timestamp: e.t,
        confidence: e.confidence,
      })),
      statistics: stats,
      eventCount: events.length,
      resonance: stats.resonance,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: generate_video
  // ─────────────────────────────────────────────────────────

  private async generateVideo(args: unknown): Promise<unknown> {
    const { intent, numFrames, fps, guidanceScale } = args as {
      intent: string;
      numFrames?: number;
      fps?: number;
      guidanceScale?: number;
    };

    // This would call Helios or a mock
    const result = await this.cognition.runLoop(intent);

    return {
      intent,
      finalState: {
        phase: result.finalState.phase,
        resonance: result.finalState.resonance,
        entropy: result.finalState.entropy,
        lineage: result.finalState.lineage,
      },
      executionTimeMs: result.executionTimeMs,
      health: result.health,
      mock: true, // Replace with actual Helios call
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: transform_video
  // ─────────────────────────────────────────────────────────

  private async transformVideo(args: unknown): Promise<unknown> {
    const { videoId, referenceVideoId, mode } = args as {
      videoId: string;
      referenceVideoId: string;
      mode: 'style' | 'motion' | 'camera' | 'id' | 'effect';
    };

    // Mock: would call OmniTransfer pipeline
    return {
      videoId,
      referenceVideoId,
      mode,
      status: 'transformed',
      transformMode: mode,
      mock: true,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: package_video
  // ─────────────────────────────────────────────────────────

  private async packageVideo(args: unknown): Promise<unknown> {
    const { scenes, music, voice, captionPosition, orientation } = args as PackageConfig & { scenes: { text: string; searchTerms: string[] }[] };

    const config: PackageConfig = {
      scenes,
      music: music || 'chill',
      voice: voice || 'af_heart',
      captionPosition: captionPosition || 'bottom',
      orientation: orientation || 'portrait',
      paddingBack: 1500,
    };

    // Mock: would call short-video-maker MCP
    return {
      videoId: `pkg-${Date.now()}`,
      config,
      status: 'packaged',
      mock: true,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: synchronize_video
  // ─────────────────────────────────────────────────────────

  private async synchronizeVideo(args: unknown): Promise<unknown> {
    const { symbols, durationMs, videoId } = args as {
      symbols: string[];
      durationMs: number;
      videoId: string;
    };

    // Mock: would call ly2video-style elastic sync
    const syncPoints = symbols.map((sym, i) => ({
      timeMs: (i / Math.max(1, symbols.length - 1)) * durationMs,
      symbol: sym,
      confidence: 0.8 + Math.random() * 0.2,
    }));

    return {
      videoId,
      syncPoints,
      durationMs,
      status: 'synchronized',
      mock: true,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: understand_video
  // ─────────────────────────────────────────────────────────

  private async understandVideo(args: unknown): Promise<unknown> {
    const { videoId, caption } = args as {
      videoId: string;
      caption?: string;
    };

    // Mock: would call video_annotation pipeline
    const triples: KnowledgeTriple[] = caption
      ? this.parseCaptionToTriples(caption)
      : [{ subject: videoId, predicate: 'contains', object: 'unknown_content', confidence: 0.5, source: videoId }];

    return {
      videoId,
      triples,
      knowledgeGraph: this.buildGraph(triples),
      mock: true,
    };
  }

  private parseCaptionToTriples(caption: string): KnowledgeTriple[] {
    const words = caption.split(/\s+/);
    const triples: KnowledgeTriple[] = [];
    if (words.length >= 3) {
      triples.push({
        subject: words[0],
        predicate: words[1],
        object: words.slice(2).join(' '),
        confidence: 0.7,
        source: 'caption-parse',
      });
    }
    return triples;
  }

  private buildGraph(triples: KnowledgeTriple[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const t of triples) {
      if (!graph[t.subject]) graph[t.subject] = [];
      graph[t.subject].push(`${t.predicate} → ${t.object} (${t.confidence.toFixed(2)})`);
    }
    return graph;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: run_full_loop
  // ─────────────────────────────────────────────────────────

  private async runFullLoop(args: unknown): Promise<unknown> {
    const { intent, reference, maxIterations } = args as {
      intent: string;
      reference?: unknown;
      maxIterations?: number;
    };

    const result = await this.cognition.runLoop(intent, undefined, reference);

    // Update growth engine based on loop outcome
    if (result.health.isStable) {
      this.growthEngine.updateRuleResonance('GR-FBK-001', true, 0.1);
    }

    return {
      intent,
      finalPhase: result.finalState.phase,
      finalResonance: result.finalState.resonance,
      finalEntropy: result.finalState.entropy,
      lineage: result.finalState.lineage,
      executionTimeMs: result.executionTimeMs,
      iterations: result.iterations,
      health: result.health,
      feedbackCount: result.feedbackSignals.length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_loop_health
  // ─────────────────────────────────────────────────────────

  private async getLoopHealth(_args: unknown): Promise<unknown> {
    const metrics = this.cognition.getMetrics();
    const memory = this.cognition.getMemory();
    const attractor = memory.getAttractorSignature();

    return {
      stageMetrics: metrics,
      attractorSignature: attractor,
      totalStates: memory.states.length,
      totalEvents: memory.events.length,
      activeRules: this.growthEngine.getActiveRules().length,
      spawnedSubsystems: this.growthEngine.getSpawnedSubsystems().length,
      sessionUptimeMs: Date.now() - this.startTime,
      sessionId: this.sessionId,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_growth_rules
  // ─────────────────────────────────────────────────────────

  private async getGrowthRules(_args: unknown): Promise<unknown> {
    const rules = this.growthEngine.getActiveRules();
    return {
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        sourceRepo: r.sourceRepo,
        resonance: this.growthEngine.getRuleResonance(r.id),
        spawnable: r.spawnConditions.triggerEvent || 'always',
      })),
      total: rules.length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: spawn_subsystem
  // ─────────────────────────────────────────────────────────

  private async spawnSubsystem(args: unknown): Promise<unknown> {
    const { ruleId } = args as { ruleId: string };
    const rules = this.growthEngine.getActiveRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const subsystem = this.growthEngine.spawnSubsystem(rule);
    return {
      ruleId,
      ruleName: rule.name,
      subsystem,
      status: 'spawned',
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_event_visualization
  // ─────────────────────────────────────────────────────────

  private async getEventVisualization(args: unknown): Promise<unknown> {
    const { mode, width, height } = args as {
      mode?: 'accumulate' | 'latest';
      width?: number;
      height?: number;
    };

    const events = this.retina.getEventHistory();
    const w = width || this.retina['config'].width;
    const h = height || this.retina['config'].height;

    const img = EventVisualizer.renderToImageData(events, w, h, mode || 'accumulate');

    return {
      width: w,
      height: h,
      rgbaData: Array.from(img.data),
      eventCount: events.length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // MCP Protocol Handlers
  // ─────────────────────────────────────────────────────────

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return this.listTools(request.id);
        case 'tools/call':
          return await this.callTool(request.id, request.params as { name: string; arguments?: unknown });
        case 'initialize':
          return this.initialize(request.id, request.params as { protocolVersion?: string });
        default:
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32601, message: `Method not found: ${request.method}` },
          };
      }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32603, message: err instanceof Error ? err.message : 'Internal error' },
      };
    }
  }

  private listTools(id: number | string): MCPResponse {
    const tools: MCPTool[] = [
      {
        name: 'perceive_video',
        description: 'Convert raw video frames into sparse biological event streams using retinomorphic filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            frameData: { type: 'array', description: 'Flat RGBA array' },
            width: { type: 'number' },
            height: { type: 'number' },
            timestamp: { type: 'number' },
            configOverride: { type: 'object' },
          },
          required: ['frameData', 'width', 'height'],
        },
      },
      {
        name: 'generate_video',
        description: 'Generate raw video from text intent using diffusion model (Helios-style).',
        inputSchema: {
          type: 'object',
          properties: {
            intent: { type: 'string' },
            numFrames: { type: 'number' },
            fps: { type: 'number' },
            guidanceScale: { type: 'number' },
          },
          required: ['intent'],
        },
      },
      {
        name: 'transform_video',
        description: 'Apply reference-guided property transfer (style, motion, camera, ID, effect).',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
            referenceVideoId: { type: 'string' },
            mode: { type: 'string', enum: ['style', 'motion', 'camera', 'id', 'effect'] },
          },
          required: ['videoId', 'referenceVideoId', 'mode'],
        },
      },
      {
        name: 'package_video',
        description: 'Compose narrative scenes into platform-ready short video with captions and music.',
        inputSchema: {
          type: 'object',
          properties: {
            scenes: { type: 'array', items: { type: 'object' } },
            music: { type: 'string' },
            voice: { type: 'string' },
            captionPosition: { type: 'string' },
            orientation: { type: 'string' },
          },
          required: ['scenes'],
        },
      },
      {
        name: 'synchronize_video',
        description: 'Bind symbolic structure to temporal flow with elastic synchronization.',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: { type: 'array', items: { type: 'string' } },
            durationMs: { type: 'number' },
            videoId: { type: 'string' },
          },
          required: ['symbols', 'durationMs', 'videoId'],
        },
      },
      {
        name: 'understand_video',
        description: 'Extract symbolic knowledge graph from video content.',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
            caption: { type: 'string' },
          },
          required: ['videoId'],
        },
      },
      {
        name: 'run_full_loop',
        description: 'Execute the complete autopoietic video cognition cycle.',
        inputSchema: {
          type: 'object',
          properties: {
            intent: { type: 'string' },
            reference: { type: 'object' },
            maxIterations: { type: 'number' },
          },
          required: ['intent'],
        },
      },
      {
        name: 'get_loop_health',
        description: 'Report cognitive loop stability, resonance, and entropy metrics.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_growth_rules',
        description: 'List active growth rules from ingested repositories.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'spawn_subsystem',
        description: 'Manually trigger spawning of a cognitive subsystem from a growth rule.',
        inputSchema: {
          type: 'object',
          properties: {
            ruleId: { type: 'string' },
          },
          required: ['ruleId'],
        },
      },
      {
        name: 'get_event_visualization',
        description: 'Render event stream as RGBA image data for debugging.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['accumulate', 'latest'] },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
      },
    ];

    return {
      jsonrpc: '2.0',
      id,
      result: { tools },
    };
  }

  private async callTool(id: number | string, params: { name: string; arguments?: unknown }): Promise<MCPResponse> {
    const { name, arguments: args } = params;
    const handler = this.toolRegistry.get(name);

    if (!handler) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Tool not found: ${name}` },
      };
    }

    const result = await handler(args || {});
    return {
      jsonrpc: '2.0',
      id,
      result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
    };
  }

  private initialize(id: number | string, params?: { protocolVersion?: string }): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
        },
        serverInfo: {
          name: 'synthia-video-perception-center',
          version: '1.0.0',
          sessionId: this.sessionId,
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // Stdio Transport (for MCP CLI usage)
  // ─────────────────────────────────────────────────────────

  async startStdioServer(): Promise<void> {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdin.setEncoding('utf8');
    stdin.resume();

    let buffer = '';

    stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const request = JSON.parse(line) as MCPRequest;
          const response = await this.handleRequest(request);
          stdout.write(JSON.stringify(response) + '\n');
        } catch (err) {
          stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error' },
          }) + '\n');
        }
      }
    });

    console.error(`[SynthiaVPC] Started on stdio. Session: ${this.sessionId}`);
  }

  // ─────────────────────────────────────────────────────────
  // HTTP/SSE Transport (for REST-like usage)
  // ─────────────────────────────────────────────────────────

  async startHttpServer(port: number = 3123): Promise<void> {
    // In production, use a real HTTP server (Express, Fastify, etc.)
    // This is a minimal implementation for demonstration
    const { createServer } = await import('http');

    const server = createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', sessionId: this.sessionId }));
        return;
      }

      if (req.url === '/mcp/sse') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        res.write('event: endpoint\n');
        res.write(`data: /mcp/messages\n\n`);
        // Keep connection open
        return;
      }

      if (req.url === '/mcp/messages' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const request = JSON.parse(body) as MCPRequest;
            const response = await this.handleRequest(request);
            res.writeHead(200);
            res.end(JSON.stringify(response));
          } catch {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(port, () => {
      console.error(`[SynthiaVPC] HTTP server on port ${port}. Session: ${this.sessionId}`);
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────

async function main() {
  const center = new SynthiaVideoPerceptionCenter();

  const transport = process.argv.includes('--http') ? 'http' : 'stdio';
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : 3123;

  if (transport === 'http') {
    await center.startHttpServer(port);
  } else {
    await center.startStdioServer();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SynthiaVideoPerceptionCenter };
