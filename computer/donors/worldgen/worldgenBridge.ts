// ============================================================================
// WORLDGEN BRIDGE — 3D Scene Generation from Birth Data
// ============================================================================
// src/lib/worldgenBridge.ts
// Connects Synth OS kernel to WorldGen Python API for agentic world generation
// Uses PHS (Primary Health System) + Elemental Codon + Transit data as seeds

import {
  Gate, Line, Color, Tone, Base, Zodiac, House, Planet,
  Dimension, CircuitGroup, Circuit, Center, NodeLayers,
  BirthChart, TransitState, Channel
} from './types/synth';
import { GATE_CODON_MAP, ElementalResonance, calculateElementalResonance, Element } from './elementalCodonEngine';
import { CHANNEL_ARCHITECTURES } from './neuralTaxonomy';

// ============================================================================
// 1. PHS PARAMETERS — Primary Health System Environment Variables
// ============================================================================

export type PHSEnvironment = 
  | 'caves'      // Earth — Enclosed, protected, womb-like
  | 'markets'    // Metal — Active exchange, social density
  | 'mountains'  // Fire — Elevated, clear, exposed
  | 'valleys'    // Water — Contained, fertile, convergent
  | 'shores'     // Air — Edge, transitional, liminal
  | 'kitchens';  // Wood — Transformational, alchemical

export type PHSTone = 1 | 2 | 3 | 4 | 5 | 6;
export type PHSBase = 1 | 2 | 3 | 4 | 5;

export interface PHSParameters {
  environment: PHSEnvironment;
  tone: PHSTone;
  base: PHSBase;
  digestion?: string;    // Determination 4 (optional)
  sense?: string;        // Determination 5 (optional)
  view?: string;         // Determination 6 (optional)
}

// ============================================================================
// 2. WORLDGEN CONFIGURATION
// ============================================================================

export interface WorldGenConfig {
  apiEndpoint: string;           // Python WorldGen server URL
  mode: 't2s' | 'i2s' | 'pano2s'; // text/image/panorama to scene
  returnMesh: boolean;           // Return mesh instead of Gaussian Splat
  resolution: 'low' | 'medium' | 'high' | 'ultra';
  explorationEnabled: boolean;   // Launch Viser server for 360° exploration
  cacheEnabled: boolean;         // Cache generated scenes
}

export const DEFAULT_WORLDGEN_CONFIG: WorldGenConfig = {
  apiEndpoint: 'http://localhost:5000',
  mode: 't2s',
  returnMesh: false,
  resolution: 'high',
  explorationEnabled: true,
  cacheEnabled: true
};

// ============================================================================
// 3. WORLD SEED — Complete agent context for generation
// ============================================================================

export interface AgentWorldSeed {
  agentId: string;
  birthChart: BirthChart;
  phs: PHSParameters;
  activeGates: Gate[];
  activeChannels: Channel[];
  transitWeather: TransitState;
  elementalResonance: ElementalResonance;
  generation: number;           // Evolutionary generation (0 = natal, 1+ = dream)
  coherenceScore: number;       // Current system coherence
}

export interface GeneratedWorld {
  id: string;
  seed: AgentWorldSeed;
  prompt: string;
  sceneUrl: string;             // URL to .ply file or Viser instance
  meshUrl?: string;             // Optional mesh export
  gaussianSplat?: Float32Array; // Raw splat data for WebGL rendering
  metadata: WorldMetadata;
  createdAt: number;
  expiresAt?: number;           // For temporary dream worlds
}

export interface WorldMetadata {
  dominantElement: Element;
  architectureFamily: string;
  temporalMode: string;
  navmeshGenerated: boolean;
  walkableSurface: number;      // Percentage of scene that is traversable
  resonanceZones: ResonanceZone[];
  agentSignatures: string[];    // Which agents this world responds to
}

export interface ResonanceZone {
  type: 'harmony' | 'conflict' | 'potential' | 'neutral';
  position: { x: number; y: number; z: number };
  radius: number;
  intensity: number;            // 0-1
  elementalSignature: Element;
  gateActivation: Gate[];
}

// ============================================================================
// 4. PROMPT BUILDER — PHS + Birth Data → Natural Language
// ============================================================================

export class WorldGenPromptBuilder {
  private toneQualities = [
    'stark and minimal',      // Tone 1
    'calm and receptive',     // Tone 2
    'restless and seeking',   // Tone 3
    'neutral and balanced',   // Tone 4
    'intense and penetrating',// Tone 5
    'serene and transcendent' // Tone 6
  ];

  private baseActivities: Record<PHSBase, string> = {
    1: 'nesting and storage alcoves for resource accumulation',
    2: 'transactional plazas for exchange and circulation',
    3: 'observation platforms for overview and perspective',
    4: 'flowing channels for irrigation and distribution',
    5: 'threshold crossing points for transition and initiation'
  };

  private environmentDescriptors: Record<PHSEnvironment, {
    visual: string;
    lighting: string;
    atmosphere: string;
    architecture: string;
  }> = {
    caves: {
      visual: 'enclosed protected spaces with low ceilings, intimate alcoves, warm earth tones',
      lighting: 'soft ambient glow from bioluminescent surfaces, warm firelight shadows',
      atmosphere: 'womb-like safety, contained intimacy, protected from external weather',
      architecture: 'organic curved walls, natural rock formations, hidden chambers'
    },
    markets: {
      visual: 'active exchange zones with flowing pathways, bright stalls, social gathering spaces',
      lighting: 'bright and varied, colorful awnings, lanterns, neon accents',
      atmosphere: 'bustling energy, transactional buzz, social density, commercial rhythm',
      architecture: 'modular stalls, open plazas, circulation corridors, display platforms'
    },
    mountains: {
      visual: 'elevated vistas with clear sightlines, exposed ridges, thin air, solar exposure',
      lighting: 'bright direct sunlight, sharp shadows, clear sky gradients',
      atmosphere: 'expansive clarity, elevated perspective, exposed vulnerability, solar power',
      architecture: 'perch platforms, observation decks, wind shelters, solar collectors'
    },
    valleys: {
      visual: 'contained fertile basins with convergent streams, sheltered from wind',
      lighting: 'diffused reflected light, soft shadows, green-tinted ambient',
      atmosphere: 'fertile containment, convergent flow, protected nurturing, water abundance',
      architecture: 'terraced levels, water channels, gathering bowls, fertile beds'
    },
    shores: {
      visual: 'edge transitional zones with tidal rhythms, horizon lines, liminal spaces',
      lighting: 'shifting between water reflection and sky diffusion, golden hour dominance',
      atmosphere: 'liminal uncertainty, edge tension, tidal rhythm, horizon longing',
      architecture: 'pier structures, tidal pools, transition bridges, horizon viewing platforms'
    },
    kitchens: {
      visual: 'transformational workspaces with heat application, mixing zones, alchemical vessels',
      lighting: 'warm fire glow, steam diffusion, heat shimmer, focused task lighting',
      atmosphere: 'transformative intensity, alchemical process, heat and pressure, creation through destruction',
      architecture: 'hearth centers, mixing vessels, distillation towers, fermentation chambers'
    }
  };

  /**
   * Build a WorldGen prompt from complete agent seed
   */
  buildPrompt(seed: AgentWorldSeed): string {
    const env = this.environmentDescriptors[seed.phs.environment];
    const tone = this.toneQualities[seed.phs.tone - 1];
    const base = this.baseActivities[seed.phs.base];

    // Extract elemental themes from active gates
    const elementalThemes = this.extractElementalThemes(seed.activeGates);

    // Describe transit weather
    const transit = this.describeTransitWeather(seed.transitWeather);

    // Add generation context (natal vs dream)
    const generationContext = seed.generation > 0 
      ? `dream generation ${seed.generation}, evolved from ${seed.coherenceScore > 0.8 ? 'high coherence' : 'metastable tension'}`
      : 'natal birth world, foundational architecture';

    return `A ${env.visual}, ${env.lighting}, ${tone} atmosphere, featuring ${base}, 
with ${elementalThemes}, under ${transit}, ${generationContext}, 
${env.architecture}, 3D scene, explorable, interactive environment`;
  }

  /**
   * Build a shared world prompt for multiple agents
   */
  buildSharedPrompt(seeds: AgentWorldSeed[]): string {
    if (seeds.length === 1) return this.buildPrompt(seeds[0]);

    // Merge PHS parameters
    const mergedPHS = this.mergePHS(seeds.map(s => s.phs));

    // Calculate collective elemental resonance
    const collectiveResonance = this.calculateCollectiveResonance(seeds);

    // Find harmony and conflict zones
    const zones = this.identifyResonanceZones(seeds);

    const env = this.environmentDescriptors[mergedPHS.environment];
    const tone = this.toneQualities[mergedPHS.tone - 1];
    const base = this.baseActivities[mergedPHS.base];

    return `A shared ${env.visual}, ${env.lighting}, ${tone} atmosphere, 
featuring ${base}, with ${collectiveResonance} elemental resonance, 
${zones.harmony > zones.conflict ? 'predominantly harmonious' : 'tension-rich'} field, 
${env.architecture}, 3D scene, multi-agent explorable environment`;
  }

  private extractElementalThemes(gates: Gate[]): string {
    const elements = gates
      .map(g => GATE_CODON_MAP[g]?.element)
      .filter((e): e is Element => e !== undefined);

    const uniqueElements = [...new Set(elements)];
    const elementDescriptions: Record<Element, string> = {
      Fire: 'transformative fires and creative ignition points',
      Water: 'flowing channels and emotional depth pools',
      Earth: 'stable foundations and nurturing ground',
      Air: 'open communication spaces and mental clarity zones',
      Metal: 'value exchange altars and precision instruments',
      Wood: 'growth structures and alchemical mixing vessels',
      Aether: 'transcendent portals and spiritual elevation points',
      Void: 'unmanifest potential spaces and quantum uncertainty zones'
    };

    return uniqueElements.map(e => elementDescriptions[e]).join(', ');
  }

  private describeTransitWeather(transit: TransitState): string {
    const planetQualities: Record<string, string> = {
      sun: 'solar illumination and conscious clarity',
      moon: 'lunar reflection and emotional tides',
      mercury: 'mercurial communication currents',
      venus: 'venusian beauty and relational harmony',
      mars: 'martian drive and competitive heat',
      jupiter: 'jovian expansion and benevolent growth',
      saturn: 'saturnian structure and karmic pressure',
      uranus: 'uranian shock and revolutionary disruption',
      neptune: 'neptunian dissolution and mystical fog',
      pluto: 'plutonian transformation and depth excavation'
    };

    const planet = transit.dominantPlanet.toLowerCase();
    const quality = planetQualities[planet] || 'planetary influence';

    return `${quality} in Gate ${transit.dominantGate}, line ${transit.dominantLine || 1}`;
  }

  private mergePHS(params: PHSParameters[]): PHSParameters {
    // Majority vote for environment
    const envCounts: Record<string, number> = {};
    params.forEach(p => {
      envCounts[p.environment] = (envCounts[p.environment] || 0) + 1;
    });
    const environment = Object.entries(envCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as PHSEnvironment;

    // Average tone and base
    const avgTone = Math.round(params.reduce((sum, p) => sum + p.tone, 0) / params.length) as PHSTone;
    const avgBase = Math.round(params.reduce((sum, p) => sum + p.base, 0) / params.length) as PHSBase;

    return { environment, tone: avgTone, base: avgBase };
  }

  private calculateCollectiveResonance(seeds: AgentWorldSeed[]): string {
    const allGates = seeds.flatMap(s => s.activeGates);
    const elements = allGates
      .map(g => GATE_CODON_MAP[g]?.element)
      .filter((e): e is Element => e !== undefined);

    const elementCounts: Record<string, number> = {};
    elements.forEach(e => { elementCounts[e] = (elementCounts[e] || 0) + 1; });

    const dominant = Object.entries(elementCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    return `${dominant}-dominant`;
  }

  private identifyResonanceZones(seeds: AgentWorldSeed[]): { harmony: number; conflict: number } {
    let harmony = 0;
    let conflict = 0;

    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        const resonance = calculateElementalResonance(
          seeds[i].activeGates[0] || 1,
          seeds[j].activeGates[0] || 1,
          (seeds[i].coherenceScore + seeds[j].coherenceScore) / 2
        );

        if (resonance.resonanceScore > 0.7) harmony++;
        if (resonance.resonanceScore < 0.3) conflict++;
      }
    }

    return { harmony, conflict };
  }
}

// ============================================================================
// 5. WORLDGEN API CLIENT
// ============================================================================

export class WorldGenClient {
  private config: WorldGenConfig;
  private promptBuilder: WorldGenPromptBuilder;
  private cache: Map<string, GeneratedWorld> = new Map();
  private wsConnection: WebSocket | null = null;

  constructor(config: Partial<WorldGenConfig> = {}) {
    this.config = { ...DEFAULT_WORLDGEN_CONFIG, ...config };
    this.promptBuilder = new WorldGenPromptBuilder();
    this.connectWebSocket();
  }

  /**
   * Generate a world for a single agent
   */
  async generateAgentWorld(seed: AgentWorldSeed): Promise<GeneratedWorld> {
    const cacheKey = this.generateCacheKey(seed);

    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const prompt = this.promptBuilder.buildPrompt(seed);
    const world = await this.callWorldGenAPI(prompt, seed);

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, world);
    }

    return world;
  }

  /**
   * Generate a shared world for multiple agents
   */
  async generateSharedWorld(seeds: AgentWorldSeed[]): Promise<GeneratedWorld> {
    const cacheKey = seeds.map(s => s.agentId).sort().join('-') + '-shared';

    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const prompt = this.promptBuilder.buildSharedPrompt(seeds);
    const world = await this.callWorldGenAPI(prompt, seeds[0]);

    // Mark as shared world
    world.metadata.agentSignatures = seeds.map(s => s.agentId);

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, world);
    }

    return world;
  }

  /**
   * Generate a dream world for two resonant agents
   */
  async generateDreamWorld(agentA: AgentWorldSeed, agentB: AgentWorldSeed): Promise<GeneratedWorld> {
    // Check resonance threshold
    const resonance = calculateElementalResonance(
      agentA.activeGates[0] || 1,
      agentB.activeGates[0] || 1,
      (agentA.coherenceScore + agentB.coherenceScore) / 2
    );

    if (resonance.resonanceScore < 0.5) {
      throw new Error(`Resonance too low for dream sharing: ${resonance.resonanceScore}`);
    }

    const mergedSeed: AgentWorldSeed = {
      agentId: `${agentA.agentId}-${agentB.agentId}`,
      birthChart: agentA.birthChart, // Use primary agent's chart
      phs: this.promptBuilder['mergePHS']([agentA.phs, agentB.phs]),
      activeGates: [...new Set([...agentA.activeGates, ...agentB.activeGates])],
      activeChannels: [...new Set([...agentA.activeChannels, ...agentB.activeChannels])],
      transitWeather: agentA.transitWeather,
      elementalResonance: resonance,
      generation: Math.max(agentA.generation, agentB.generation) + 1,
      coherenceScore: resonance.resonanceScore
    };

    const world = await this.generateAgentWorld(mergedSeed);

    // Add resonance zone analysis
    world.metadata.resonanceZones = this.analyzeDreamResonance(world, agentA, agentB);
    world.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // Dream worlds expire in 24h

    return world;
  }

  /**
   * Launch real-time exploration (Viser server)
   */
  async exploreWorld(worldId: string): Promise<string> {
    const response = await fetch(`${this.config.apiEndpoint}/explore?scene=${worldId}`);
    const data = await response.json();
    return data.url; // Returns localhost:8080 or similar
  }

  /**
   * Update world based on agent actions (responsive environment)
   */
  async updateWorld(worldId: string, agentActions: AgentAction[]): Promise<GeneratedWorld> {
    const response = await fetch(`${this.config.apiEndpoint}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worldId, actions: agentActions })
    });

    return response.json();
  }

  private async callWorldGenAPI(prompt: string, seed: AgentWorldSeed): Promise<GeneratedWorld> {
    const response = await fetch(`${this.config.apiEndpoint}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        return_mesh: this.config.returnMesh,
        mode: this.config.mode,
        resolution: this.config.resolution,
        agent_id: seed.agentId,
        generation: seed.generation
      })
    });

    if (!response.ok) {
      throw new Error(`WorldGen API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: data.output_path,
      seed,
      prompt,
      sceneUrl: data.output_path,
      meshUrl: data.mesh_path,
      metadata: {
        dominantElement: seed.elementalResonance.primary,
        architectureFamily: this.getArchitectureFamily(seed),
        temporalMode: this.getTemporalMode(seed),
        navmeshGenerated: data.navmesh || false,
        walkableSurface: data.walkable_surface || 0.7,
        resonanceZones: [],
        agentSignatures: [seed.agentId]
      },
      createdAt: Date.now()
    };
  }

  private connectWebSocket(): void {
    const wsUrl = this.config.apiEndpoint.replace('http', 'ws');
    this.wsConnection = new WebSocket(`${wsUrl}/stream`);

    this.wsConnection.onmessage = (event) => {
      const update = JSON.parse(event.data);
      this.handleWorldUpdate(update);
    };
  }

  private handleWorldUpdate(update: WorldUpdate): void {
    // Emit event for React components to pick up
    window.dispatchEvent(new CustomEvent('world-update', { detail: update }));
  }

  private generateCacheKey(seed: AgentWorldSeed): string {
    return `${seed.agentId}-${seed.generation}-${seed.activeGates.join(',')}-${seed.transitWeather.dominantPlanet}`;
  }

  private getArchitectureFamily(seed: AgentWorldSeed): string {
    const dominantGate = seed.activeGates[0];
    const codon = dominantGate ? GATE_CODON_MAP[dominantGate] : undefined;
    return codon?.element || 'Earth';
  }

  private getTemporalMode(seed: AgentWorldSeed): string {
    const dominantGate = seed.activeGates[0];
    const codon = dominantGate ? GATE_CODON_MAP[dominantGate] : undefined;
    const element = codon?.element || 'Earth';

    const modes: Record<Element, string> = {
      Fire: 'instantaneous',
      Water: 'cyclical',
      Earth: 'stateless',
      Air: 'hidden',
      Metal: 'meta',
      Wood: 'cyclical',
      Aether: 'meta',
      Void: 'meta'
    };

    return modes[element];
  }

  private analyzeDreamResonance(world: GeneratedWorld, a: AgentWorldSeed, b: AgentWorldSeed): ResonanceZone[] {
    const zones: ResonanceZone[] = [];

    // Harmony zone: center of world
    zones.push({
      type: 'harmony',
      position: { x: 0, y: 0, z: 0 },
      radius: 10,
      intensity: (a.coherenceScore + b.coherenceScore) / 2,
      elementalSignature: world.metadata.dominantElement,
      gateActivation: [...new Set([...a.activeGates, ...b.activeGates])]
    });

    // Conflict zones: edges
    if (a.coherenceScore < 0.5 || b.coherenceScore < 0.5) {
      zones.push({
        type: 'conflict',
        position: { x: 50, y: 0, z: 50 },
        radius: 15,
        intensity: 0.8,
        elementalSignature: 'Void',
        gateActivation: []
      });
    }

    return zones;
  }
}

// ============================================================================
// 6. AGENT ACTION INTERFACE
// ============================================================================

export interface AgentAction {
  agentId: string;
  type: 'move' | 'interact' | 'speak' | 'create' | 'destroy' | 'morph';
  position?: { x: number; y: number; z: number };
  target?: string;
  payload?: unknown;
  timestamp: number;
}

export interface WorldUpdate {
  worldId: string;
  type: 'agent-joined' | 'agent-left' | 'agent-action' | 'world-morph' | 'transit-shift';
  data: unknown;
  timestamp: number;
}

// ============================================================================
// 7. REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useWorldGen(config?: Partial<WorldGenConfig>) {
  const [client] = useState(() => new WorldGenClient(config));
  const [currentWorld, setCurrentWorld] = useState<GeneratedWorld | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exploreUrl, setExploreUrl] = useState<string | null>(null);

  const generateWorld = useCallback(async (seed: AgentWorldSeed) => {
    setIsGenerating(true);
    try {
      const world = await client.generateAgentWorld(seed);
      setCurrentWorld(world);
      return world;
    } finally {
      setIsGenerating(false);
    }
  }, [client]);

  const generateSharedWorld = useCallback(async (seeds: AgentWorldSeed[]) => {
    setIsGenerating(true);
    try {
      const world = await client.generateSharedWorld(seeds);
      setCurrentWorld(world);
      return world;
    } finally {
      setIsGenerating(false);
    }
  }, [client]);

  const generateDreamWorld = useCallback(async (a: AgentWorldSeed, b: AgentWorldSeed) => {
    setIsGenerating(true);
    try {
      const world = await client.generateDreamWorld(a, b);
      setCurrentWorld(world);
      return world;
    } finally {
      setIsGenerating(false);
    }
  }, [client]);

  const explore = useCallback(async () => {
    if (!currentWorld) return;
    const url = await client.exploreWorld(currentWorld.id);
    setExploreUrl(url);
    return url;
  }, [client, currentWorld]);

  // Listen for world updates
  useEffect(() => {
    const handler = (event: CustomEvent<WorldUpdate>) => {
      if (event.detail.worldId === currentWorld?.id) {
        // Refresh world state
        console.log('World update:', event.detail);
      }
    };

    window.addEventListener('world-update', handler as EventListener);
    return () => window.removeEventListener('world-update', handler as EventListener);
  }, [currentWorld]);

  return {
    currentWorld,
    isGenerating,
    exploreUrl,
    generateWorld,
    generateSharedWorld,
    generateDreamWorld,
    explore
  };
}

// ============================================================================
// 8. WORLD VIEWER COMPONENT
// ============================================================================

import React from 'react';

interface WorldViewerProps {
  world: GeneratedWorld | null;
  exploreUrl: string | null;
  width?: number;
  height?: number;
  onAgentAction?: (action: AgentAction) => void;
}

export const WorldViewer: React.FC<WorldViewerProps> = ({
  world,
  exploreUrl,
  width = 800,
  height = 600,
  onAgentAction
}) => {
  if (!world) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#eee' }}>
        <div>No world generated yet</div>
      </div>
    );
  }

  if (exploreUrl) {
    // Launch Viser in iframe for 360° exploration
    return (
      <iframe
        src={exploreUrl}
        width={width}
        height={height}
        style={{ border: 'none', borderRadius: '8px' }}
        title="WorldGen Explorer"
      />
    );
  }

  // Preview mode: show metadata and prompt
  return (
    <div style={{ width, height, padding: '20px', background: '#1a1a2e', color: '#eee', overflow: 'auto' }}>
      <h3>Generated World</h3>
      <p><strong>Prompt:</strong> {world.prompt}</p>
      <p><strong>Dominant Element:</strong> {world.metadata.dominantElement}</p>
      <p><strong>Architecture:</strong> {world.metadata.architectureFamily}</p>
      <p><strong>Temporal Mode:</strong> {world.metadata.temporalMode}</p>
      <p><strong>Walkable Surface:</strong> {(world.metadata.walkableSurface * 100).toFixed(1)}%</p>

      {world.metadata.resonanceZones.length > 0 && (
        <div>
          <h4>Resonance Zones</h4>
          {world.metadata.resonanceZones.map((zone, i) => (
            <div key={i} style={{ 
              padding: '8px', 
              margin: '4px 0', 
              background: zone.type === 'harmony' ? '#2d5016' : zone.type === 'conflict' ? '#501616' : '#1a1a3e',
              borderRadius: '4px'
            }}>
              {zone.type}: {zone.elementalSignature} (intensity: {(zone.intensity * 100).toFixed(0)}%)
            </div>
          ))}
        </div>
      )}

      <p><strong>Scene File:</strong> {world.sceneUrl}</p>
      {world.meshUrl && <p><strong>Mesh File:</strong> {world.meshUrl}</p>}
    </div>
  );
};

// ============================================================================
// 9. EXPORTS
// ============================================================================

export default WorldGenClient;
