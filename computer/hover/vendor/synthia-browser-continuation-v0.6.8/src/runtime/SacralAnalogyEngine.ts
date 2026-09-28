
// ============================================================================
// SacralAnalogyEngine.ts (Updated with SynthiaSubstrate)
// ============================================================================
// Klein 1999/2002: "The Analogical Foundations of Creativity"
// SACRAL CREATIVE CENTER with Synthia coordinate substrate.
//
// Added features:
//   - I Ching hexagram structure (6-bit binary strings)
//   - Cosmological rendering from 5D coordinates
//   - Synthia resonance-based creation
//   - Emergent center-aware generation
//
// Architecture:
//   State (5D) → SynthiaSubstrate → Hypercube → XOR → Cosmological Surface
// ============================================================================

import { ToolBase } from './ToolBase.js';
import { SynthiaSubstrate, CoordinateAddress, CoordinateEncoder, NODES_PER_SIDE, TOTAL_NODES, DIMENSION_NAMES, BASE_NAMES, COLOR_NAMES, TONE_NAMES } from './SynthiaSubstrate.js';
import type { State, Domain } from './SurfaceTransformEngine.js';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureVector {
  dimensions: number;
  bits: boolean[];
  label: string;
}

export interface HypercubePoint {
  coordinates: number[];
  features: FeatureVector;
  domain: Domain;
  stateHash: string;
  // NEW: Synthia address
  synthiaAddress: CoordinateAddress;
}

export interface AnalogicalTransformation {
  type: 'xor' | 'equivalence' | 'reflection' | 'rotation' | 'translation';
  operator: (a: boolean[], b: boolean[]) => boolean[];
  description: string;
}

export interface AnalogyResult {
  source: HypercubePoint;
  target: HypercubePoint;
  transformation: AnalogicalTransformation;
  surface: any;
  confidence: number;
  domain: Domain;
  // NEW: Synthia-specific
  resonanceScore: number;
  definedCenters: string[];
  activeChannels: string[];
}

export interface SacralResponse {
  activated: boolean;
  gates: number[];
  channels: string[];
  creations: AnalogyResult[];
  energy: number;
  // NEW: Synthia-specific
  synthiaAddress: CoordinateAddress;
  definedCenters: string[];
}

// ============================================================================
// SACRAL ANALOGY ENGINE
// ============================================================================

export class SacralAnalogyEngine extends ToolBase {
  private hypercubeDimension = 8;
  private featureSpace: Map<string, FeatureVector> = new Map();
  private transformations: AnalogicalTransformation[] = [];
  private creationHistory: AnalogyResult[] = [];

  // NEW: Synthia substrate
  private substrate: SynthiaSubstrate;

  // Sacral gates from Human Design
  private readonly SACRAL_GATES = [5, 14, 29, 34, 57, 59];
  private readonly SACRAL_CHANNELS = [
    { name: 'Channel of Rhythm', gates: [5, 15] },
    { name: 'Channel of Power', gates: [34, 57] },
    { name: 'Channel of Mating', gates: [59, 6] },
    { name: 'Channel of Discovery', gates: [29, 46] },
    { name: 'Channel of Money', gates: [14, 2] },
    { name: 'Channel of Surrender', gates: [9, 52] },
  ];

  // I Ching trigram features (from Klein 1996)
  private readonly TRIGRAM_FEATURES: Record<string, string[]> = {
    '111': ['creative', 'heaven', 'active'],
    '000': ['receptive', 'earth', 'yielding'],
    '100': ['arousing', 'thunder', 'initiating'],
    '010': ['abysmal', 'water', 'dangerous'],
    '001': ['keeping_still', 'mountain', 'bounded'],
    '011': ['gentle', 'wind', 'penetrating'],
    '101': ['clinging', 'fire', 'clarifying'],
    '110': ['joyous', 'lake', 'open'],
  };

  constructor(mesh) {
    super(mesh, 'SacralAnalogyEngine', 'create.analogy');
    this.substrate = new SynthiaSubstrate();
    this.initializeTransformations();
    this.subscribeToStateChannel();
  }

  // ==========================================================================
  // PRIMARY RUN (updated with Synthia)
  // ==========================================================================

  run(input: { state: State; domain: Domain; transformation?: string; depth?: number }): SacralResponse {
    const { state, domain, transformation, depth = 1 } = input;

    const sacralCheck = this.checkSacralActivation(state);
    if (!sacralCheck.activated) {
      return {
        activated: false,
        gates: sacralCheck.gates,
        channels: sacralCheck.channels,
        creations: [],
        energy: 0,
        synthiaAddress: state.synthiaAddress || this.defaultAddress(),
        definedCenters: [],
      };
    }

    // NEW: Project to Synthia substrate first
    const synthiaAddress = state.synthiaAddress || this.extractSynthiaAddress(state);
    this.substrate.activate(synthiaAddress, sacralCheck.energy);

    const sourcePoint = this.projectToHypercube(state, domain, synthiaAddress);
    const creations: AnalogyResult[] = [];
    const transforms = transformation
      ? this.transformations.filter(t => t.type === transformation)
      : this.transformations;

    for (let i = 0; i < Math.min(depth, transforms.length); i++) {
      const transform = transforms[i % transforms.length];
      const targetPoint = this.applyTransformation(sourcePoint, transform, state);
      const surface = this.generateCosmologicalSurface(targetPoint, domain);

      // NEW: Compute Synthia resonance and centers
      const resonanceScore = this.substrate.resonance(sourcePoint.synthiaAddress, targetPoint.synthiaAddress);
      const definedCenters = this.substrate.computeCenters(targetPoint.synthiaAddress);
      const activeChannels = this.getActiveChannels(targetPoint.synthiaAddress);

      creations.push({
        source: sourcePoint,
        target: targetPoint,
        transformation: transform,
        surface,
        confidence: this.computeAnalogyConfidence(sourcePoint, targetPoint),
        domain,
        resonanceScore,
        definedCenters,
        activeChannels,
      });
    }

    this.creationHistory.push(...creations);
    const energy = sacralCheck.gates.length / this.SACRAL_GATES.length;

    this.mesh.publish(this.channel, this.name, {
      type: 'sacral_creation',
      stateHash: state.hash,
      domain,
      creations: creations.length,
      energy,
      gates: sacralCheck.gates,
      channels: sacralCheck.channels,
      resonance: creations[0]?.resonanceScore || 0,
    });

    return {
      activated: true,
      gates: sacralCheck.gates,
      channels: sacralCheck.channels,
      creations,
      energy,
      synthiaAddress,
      definedCenters: this.substrate.computeCenters(synthiaAddress),
    };
  }

  // ==========================================================================
  // NEW: SYNTHIA ADDRESS EXTRACTION
  // ==========================================================================

  private extractSynthiaAddress(state: State): CoordinateAddress {
    return {
      side: 0,
      planet: 0,
      dimension: this.dimensionToIndex(state.ontology),
      gate: (state.coordinates.gate || 1) - 1,
      line: (state.coordinates.line || 1) - 1,
      color: (state.coordinates.color || 1) - 1,
      tone: (state.coordinates.tone || 1) - 1,
      base: (state.coordinates.base || 1) - 1,
      degree: Math.floor((state.coordinates.degree || 0) / 6),
      minute: state.coordinates.minute || 0,
      second: state.coordinates.second || 0,
      arc: state.coordinates.arc || 0,
      zodiac: 0,
      season: 0,
      houseZodiac: (state.coordinates.house || 1) - 1,
      houseSeason: 0,
    };
  }

  private dimensionToIndex(ontology: State['ontology']): number {
    // Find dominant dimension from ontology
    const dims = [ontology.movement, ontology.evolution, ontology.being, ontology.design, ontology.space];
    return dims.indexOf(Math.max(...dims));
  }

  // ==========================================================================
  // NEW: COSMOLOGICAL SURFACE GENERATION
  // ==========================================================================

  private generateCosmologicalSurface(point: HypercubePoint, domain: Domain): any {
    const features = point.features.bits;
    const addr = point.synthiaAddress;
    const f = (i: number) => features[i] ?? false;

    // Get dimension and base info from Synthia
    const dimName = DIMENSION_NAMES[addr.dimension] || 'Unknown';
    const baseInfo = BASE_NAMES[addr.base] || { name: 'Unknown', sense: 'Unknown', mantra: 'Unknown' };
    const colorInfo = COLOR_NAMES[addr.color] || { name: 'Unknown', response: 'Unknown', mode: 'Unknown' };
    const toneInfo = TONE_NAMES[addr.tone] || { name: 'Unknown', theme: 'Unknown', department: 'Unknown' };

    // Generate cosmological description based on 5D nature
    const cosmology = this.generateCosmology(addr, f);

    switch (domain) {
      case 'language':
        return this.generateLanguageCosmology(cosmology, addr, baseInfo, colorInfo, toneInfo);
      case 'code':
        return this.generateCodeCosmology(cosmology, addr, baseInfo, colorInfo, toneInfo);
      case 'image':
        return this.generateImageCosmology(cosmology, addr, baseInfo, colorInfo, toneInfo);
      case 'music':
        return this.generateMusicCosmology(cosmology, addr, baseInfo, colorInfo, toneInfo);
      case 'game':
        return this.generateGameCosmology(cosmology, addr, baseInfo, colorInfo, toneInfo);
      case 'math':
        return this.generateMathCosmology(cosmology, addr, baseInfo, colorInfo, toneInfo);
      case 'biology':
        return this.generateBiologyCosmology(cosmology, addr, baseInfo, colorInfo, toneInfo);
      default:
        return cosmology;
    }
  }

  private generateCosmology(addr: CoordinateAddress, f: (i: number) => boolean): Record<string, string> {
    // Generate cosmological properties based on 5D coordinates
    // From your design images:
    // Movement = Energy, Creation, Seeing, Landscape, Environment
    // Evolution = Gravity, Memory, Taste, Love, Light
    // Being = Matter, Touch, Sex, Survival
    // Design = Structure, Progress, Smelt, Life, Art
    // Space = Form, Illusion, Hearing, Music, Freedom

    const cosmology: Record<string, string> = {};

    // Movement dimension (D1)
    if (addr.dimension === 0) {
      cosmology.energy = f(0) ? 'high' : 'low';
      cosmology.creation = f(1) ? 'active' : 'dormant';
      cosmology.seeing = f(2) ? 'clear' : 'obscured';
      cosmology.landscape = f(3) ? 'vast' : 'confined';
      cosmology.environment = f(4) ? 'rich' : 'sparse';
    }

    // Evolution dimension (D2)
    if (addr.dimension === 1) {
      cosmology.gravity = f(0) ? 'strong' : 'weak';
      cosmology.memory = f(1) ? 'deep' : 'shallow';
      cosmology.taste = f(2) ? 'refined' : 'raw';
      cosmology.love = f(3) ? 'radiant' : 'dim';
      cosmology.light = f(4) ? 'brilliant' : 'faded';
    }

    // Being dimension (D3)
    if (addr.dimension === 2) {
      cosmology.matter = f(0) ? 'dense' : 'diffuse';
      cosmology.touch = f(1) ? 'sensitive' : 'numb';
      cosmology.sex = f(2) ? 'vital' : 'dormant';
      cosmology.survival = f(3) ? 'urgent' : 'secure';
    }

    // Design dimension (D4)
    if (addr.dimension === 3) {
      cosmology.structure = f(0) ? 'rigid' : 'fluid';
      cosmology.progress = f(1) ? 'advancing' : 'receding';
      cosmology.smelt = f(2) ? 'purifying' : 'corrupting';
      cosmology.life = f(3) ? 'teeming' : 'barren';
      cosmology.art = f(4) ? 'expressive' : 'silent';
    }

    // Space dimension (D5)
    if (addr.dimension === 4) {
      cosmology.form = f(0) ? 'defined' : 'amorphous';
      cosmology.illusion = f(1) ? 'pervasive' : 'transparent';
      cosmology.hearing = f(2) ? 'attuned' : 'deaf';
      cosmology.music = f(3) ? 'harmonious' : 'discordant';
      cosmology.freedom = f(4) ? 'unbounded' : 'constrained';
    }

    return cosmology;
  }

  private generateLanguageCosmology(cosmology: Record<string, string>, addr: CoordinateAddress, base: any, color: any, tone: any): string {
    const dim = DIMENSION_NAMES[addr.dimension];
    return `A ${cosmology[Object.keys(cosmology)[0]] || 'resonant'} expression in the ${dim} dimension. ` +
           `Spoken through ${base.name} (${base.sense}), colored by ${color.name} (${color.response}), ` +
           `toned in ${tone.name} (${tone.theme}). The voice says: "${base.mantra}".`;
  }

  private generateCodeCosmology(cosmology: Record<string, string>, addr: CoordinateAddress, base: any, color: any, tone: any): string {
    return `// ${DIMENSION_NAMES[addr.dimension]} pattern\n// Base: ${base.name} (${base.sense})\n// Color: ${color.name} (${color.mode})\n// Tone: ${tone.name} (${tone.department})\nfunction ${base.name.toLowerCase()}() {\n  // ${Object.entries(cosmology).map(([k, v]) => `${k}: ${v}`).join('\n  // ')}\n}`;
  }

  private generateImageCosmology(cosmology: Record<string, string>, addr: CoordinateAddress, base: any, color: any, tone: any): string {
    return `Scene: ${DIMENSION_NAMES[addr.dimension]} landscape. ` +
           `${Object.entries(cosmology).map(([k, v]) => `${k}=${v}`).join(', ')}. ` +
           `Rendered through ${base.sense}, colored by ${color.name}, textured by ${tone.department}.`;
  }

  private generateMusicCosmology(cosmology: Record<string, string>, addr: CoordinateAddress, base: any, color: any, tone: any): string {
    return `Score: ${DIMENSION_NAMES[addr.dimension]} symphony. ` +
           `Key: ${['C', 'G', 'D', 'A', 'E', 'B'][addr.gate % 6]} major. ` +
           `Tempo: ${60 + (addr.degree * 2)} BPM. ` +
           `Texture: ${Object.values(cosmology).join('-')}.`;
  }

  private generateGameCosmology(cosmology: Record<string, string>, addr: CoordinateAddress, base: any, color: any, tone: any): string {
    return `World: ${DIMENSION_NAMES[addr.dimension]} realm. ` +
           `Mechanics: ${Object.entries(cosmology).map(([k, v]) => `${k}=${v}`).join(', ')}. ` +
           `Player experiences ${base.sense} through ${color.name} challenges.`;
  }

  private generateMathCosmology(cosmology: Record<string, string>, addr: CoordinateAddress, base: any, color: any, tone: any): string {
    return `Expression: ${DIMENSION_NAMES[addr.dimension]} manifold. ` +
           `Properties: ${Object.entries(cosmology).map(([k, v]) => `${k}=${v}`).join(', ')}. ` +
           `Notation: ${base.sense}-based, ${color.mode} logic.`;
  }

  private generateBiologyCosmology(cosmology: Record<string, string>, addr: CoordinateAddress, base: any, color: any, tone: any): string {
    return `System: ${DIMENSION_NAMES[addr.dimension]} organism. ` +
           `State: ${Object.entries(cosmology).map(([k, v]) => `${k}=${v}`).join(', ')}. ` +
           `Sensing through ${base.sense}, responding with ${color.response}.`;
  }

  // ==========================================================================
  // EXISTING METHODS (preserved)
  // ==========================================================================

  private checkSacralActivation(state: State): { activated: boolean; gates: number[]; channels: string[] } {
    const activeGates = this.SACRAL_GATES.filter(gate => {
      return state.coordinates.gate === gate ||
        (gate === 5 && (state.coordinates.line === 5 || state.coordinates.base === 5)) ||
        (gate === 14 && (state.coordinates.gate === 14 || state.coordinates.color === 5)) ||
        (gate === 29 && (state.coordinates.gate === 29 || state.coordinates.tone === 5)) ||
        (gate === 34 && (state.coordinates.gate === 34 || state.coordinates.degree > 180)) ||
        (gate === 57 && (state.coordinates.gate === 57 || state.coordinates.line === 6)) ||
        (gate === 59 && (state.coordinates.gate === 59 || state.coordinates.color === 6));
    });
    const activeChannels = this.SACRAL_CHANNELS
      .filter(ch => activeGates.includes(ch.gates[0]) || activeGates.includes(ch.gates[1]))
      .map(ch => ch.name);
    return { activated: activeGates.length >= 2, gates: activeGates, channels: activeChannels };
  }

  private projectToHypercube(state: State, domain: Domain, synthiaAddress: CoordinateAddress): HypercubePoint {
    const features = this.extractFeatures(state, domain);
    return {
      coordinates: features.bits.map(b => b ? 1 : 0),
      features,
      domain,
      stateHash: state.hash,
      synthiaAddress,
    };
  }

  private extractFeatures(state: State, domain: Domain): FeatureVector {
    const bits: boolean[] = [];
    bits.push(state.ontology.movement > 0.5);
    bits.push(state.ontology.evolution > 0.5);
    bits.push(state.ontology.being > 0.5);
    bits.push(state.ontology.design > 0.5);
    bits.push(state.ontology.space > 0.5);
    switch (domain) {
      case 'language': bits.push(state.coordinates.line > 3); bits.push(state.coordinates.color > 3); bits.push(state.coordinates.tone > 3); bits.push(state.coordinates.base === 5); break;
      case 'code': bits.push(state.coordinates.gate > 32); bits.push(state.coordinates.line > 3); bits.push(state.coordinates.base === 2); bits.push(state.coordinates.degree > 180); break;
      case 'image': bits.push(state.coordinates.color > 3); bits.push(state.coordinates.tone > 3); bits.push(state.coordinates.line > 3); bits.push(state.coordinates.gate > 32); break;
      case 'music': bits.push(state.coordinates.degree > 180); bits.push(state.coordinates.line > 3); bits.push(state.coordinates.color > 3); bits.push(state.coordinates.tone > 3); break;
      case 'game': bits.push(state.coordinates.line > 3); bits.push(state.coordinates.base > 3); bits.push(state.coordinates.gate > 32); bits.push(state.coordinates.color > 3); break;
      case 'math': bits.push(state.coordinates.line > 3); bits.push(state.coordinates.base === 2); bits.push(state.coordinates.tone > 3); bits.push(state.coordinates.degree > 180); break;
      case 'biology': bits.push(state.coordinates.line > 3); bits.push(state.coordinates.base === 3); bits.push(state.coordinates.color > 3); bits.push(state.coordinates.gate > 32); break;
    }
    return { dimensions: bits.length, bits, label: `${domain}_features_${state.hash.slice(0, 8)}` };
  }

  private initializeTransformations(): void {
    this.transformations = [
      { type: 'xor', operator: (a, b) => a.map((bit, i) => bit !== (b[i] ?? false)), description: 'Boolean XOR' },
      { type: 'equivalence', operator: (a, b) => a.map((bit, i) => bit === (b[i] ?? false)), description: 'Strong equivalence' },
      { type: 'reflection', operator: (a) => a.map(bit => !bit), description: 'Reflection' },
      { type: 'rotation', operator: (a, b) => { const shift = b.reduce((sum, bit) => sum + (bit ? 1 : 0), 0) % a.length; return [...a.slice(shift), ...a.slice(0, shift)]; }, description: 'Rotation' },
      { type: 'translation', operator: (a, b) => a.map((bit, i) => bit !== (b[(i + 1) % b.length] ?? false)), description: 'Translation' },
    ];
  }

  private applyTransformation(source: HypercubePoint, transform: AnalogicalTransformation, state: State): HypercubePoint {
    let targetBits: boolean[];
    if (transform.type === 'reflection') {
      targetBits = transform.operator(source.features.bits, source.features.bits);
    } else {
      const operandB = this.generateOperandB(state, source.features.bits.length);
      targetBits = transform.operator(source.features.bits, operandB);
    }
    return {
      coordinates: targetBits.map(b => b ? 1 : 0),
      features: { dimensions: targetBits.length, bits: targetBits, label: `${source.features.label}_transformed` },
      domain: source.domain,
      stateHash: state.hash,
      synthiaAddress: this.transformAddress(source.synthiaAddress),
    };
  }

  private transformAddress(addr: CoordinateAddress): CoordinateAddress {
    return { ...addr, line: (addr.line + 1) % 6 };
  }

  private generateOperandB(state: State, length: number): boolean[] {
    const bits: boolean[] = [];
    const coords = [state.coordinates.gate > 32, state.coordinates.line > 3, state.coordinates.color > 3, state.coordinates.tone > 3, state.coordinates.base > 3, state.coordinates.degree > 180, state.coordinates.house > 6, state.ontology.movement > 0.5];
    for (let i = 0; i < length; i++) bits.push(coords[i % coords.length]);
    return bits;
  }

  private computeAnalogyConfidence(source: HypercubePoint, target: HypercubePoint): number {
    const distance = source.features.bits.reduce((sum, bit, i) => sum + (bit !== (target.features.bits[i] ?? false) ? 1 : 0), 0);
    return 1 - (distance / source.features.bits.length);
  }

  private getActiveChannels(address: CoordinateAddress): string[] {
    const channels = this.substrate.getChannels();
    const activeGate = address.gate + 1;
    const recommendations: string[] = [];
    for (const [g1, g2] of channels) {
      if (activeGate === g1 || activeGate === g2) {
        const otherGate = activeGate === g1 ? g2 : g1;
        recommendations.push(`Channel ${activeGate}-${otherGate}`);
      }
    }
    return recommendations;
  }

  private defaultAddress(): CoordinateAddress {
    return { side: 0, planet: 0, dimension: 0, gate: 0, line: 0, color: 0, tone: 0, base: 0, degree: 0, minute: 0, second: 0, arc: 0, zodiac: 0, season: 0, houseZodiac: 0, houseSeason: 0 };
  }

  private subscribeToStateChannel(): void {
    this.mesh.subscribe('system.state', (message: any) => {
      const state = message.payload as State;
      if (state && state.resolved) {
        const check = this.checkSacralActivation(state);
        if (check.activated) {
          this.mesh.publish(this.channel, this.name, { type: 'sacral_ready', stateHash: state.hash, gates: check.gates, channels: check.channels });
        }
      }
    });
  }

  // EXPORT METHODS
  getCreationHistory(): AnalogyResult[] { return [...this.creationHistory]; }
  getTransformations(): AnalogicalTransformation[] { return [...this.transformations]; }
  getSubstrate(): SynthiaSubstrate { return this.substrate; }
}

export type { FeatureVector, HypercubePoint, AnalogicalTransformation, AnalogyResult, SacralResponse };
