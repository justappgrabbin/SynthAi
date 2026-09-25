import type { EmbodiedWorldEngine } from '../engine/EmbodiedWorldEngine';
import type { KernelState } from '../engine/MorphKernel';

export interface CanonicalMorphAddress {
  planetary?: number;
  dimension?: string;
  gate?: number;
  line?: number;
  color?: number;
  tone?: number;
  base?: number;
  degree?: number;
  minute?: number;
  second?: number;
  arc?: number;
  zodiac?: number;
  house?: number;
  [key: string]: unknown;
}

export interface SynthiaPresentation {
  identity: 'Synthia' | string;
  personId?: string;
  personLane?: string;
  version: string;
  residentType?: string;
  packet: any;
  packetId: string | null;
  stateId: string | null;
  address: CanonicalMorphAddress | null;
  dimension: string | null;
  gate: number | null;
  line: number | null;
  color: number | null;
  tone: number | null;
  base: number | null;
  role?: any;
  utterance?: string | null;
  worldPort?: any;
  canonicalMorph?: any;
  inhabited?: boolean;
  pulse?: number;
  roleResolution?: any;
  pipelineTrace?: any;
}

export interface RealmMorphVisual {
  packetId: string | null;
  dimension: string;
  primary: string;
  secondary: string;
  background: string;
  fog: string;
  ground: string;
  grid: string;
  intensity: number;
  pulseSpeed: number;
  scale: number;
  form: 'orb' | 'column' | 'diamond' | 'crystal' | 'field';
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
}

const DIMENSION_VISUALS: Record<string, Omit<RealmMorphVisual, 'packetId' | 'gate' | 'line' | 'color' | 'tone' | 'base' | 'scale' | 'intensity' | 'pulseSpeed'>> = {
  Movement: {
    dimension: 'Movement',
    primary: '#ff8a3d',
    secondary: '#ffd166',
    background: '#120904',
    fog: '#1f0f08',
    ground: '#160b06',
    grid: '#5b2d12',
    form: 'column',
  },
  Being: {
    dimension: 'Being',
    primary: '#6ce5b1',
    secondary: '#9bf6d0',
    background: '#04110d',
    fog: '#08221a',
    ground: '#061813',
    grid: '#1d5f49',
    form: 'orb',
  },
  Design: {
    dimension: 'Design',
    primary: '#ff70a6',
    secondary: '#ffd6e6',
    background: '#14050c',
    fog: '#260a17',
    ground: '#1b0710',
    grid: '#6d1f43',
    form: 'diamond',
  },
  Evolution: {
    dimension: 'Evolution',
    primary: '#63b3ff',
    secondary: '#bde0ff',
    background: '#04101a',
    fog: '#071f34',
    ground: '#061522',
    grid: '#1f5682',
    form: 'crystal',
  },
  Space: {
    dimension: 'Space',
    primary: '#c084fc',
    secondary: '#e9d5ff',
    background: '#0b0614',
    fog: '#160b29',
    ground: '#10081d',
    grid: '#4a2575',
    form: 'field',
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function visualFromSynthia(presentation: SynthiaPresentation | null): RealmMorphVisual | null {
  const address = presentation?.address;
  if (!address) return null;
  const dimension = String(address.dimension ?? presentation?.dimension ?? 'Space');
  const baseVisual = DIMENSION_VISUALS[dimension] ?? DIMENSION_VISUALS.Space;
  const gate = Number(address.gate ?? 1);
  const line = Number(address.line ?? 1);
  const color = Number(address.color ?? 1);
  const tone = Number(address.tone ?? 1);
  const base = Number(address.base ?? 1);

  return {
    ...baseVisual,
    packetId: presentation?.packetId ?? null,
    gate,
    line,
    color,
    tone,
    base,
    scale: 0.86 + clamp(base, 1, 5) * 0.065,
    intensity: 0.55 + clamp(color, 1, 6) * 0.075,
    pulseSpeed: 0.55 + clamp(tone, 1, 6) * 0.2,
  };
}

export function buildRealmSnapshot(
  engine: EmbodiedWorldEngine,
  kernelState: KernelState,
  viewer: Record<string, unknown> | null = null,
) {
  return {
    sceneId: 'consciousness-realm',
    viewer,
    time: { ...engine.time },
    agents: Array.from(engine.agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      residentType: agent.residentType ?? 'realm-agent',
      position: { x: agent.position.x, y: agent.position.y, z: agent.position.z },
      currentPlace: agent.currentPlace,
      currentActivity: agent.currentActivity,
      animationState: agent.animationState,
      consciousness: { ...agent.consciousness },
      gate: agent.gate,
      circuit: agent.circuit,
      morph: agent.morphSignature ?? null,
    })),
    places: Array.from(engine.places.values()).map((place) => ({
      id: place.id,
      name: place.name,
      circuit: place.circuit,
      architecture: place.architecture,
      theme: place.theme,
      currentAgents: [...place.currentAgents],
      artifactCount: place.artifacts.length,
      position: { ...place.position },
    })),
    kernel: {
      consciousnessLevel: engine.consciousnessLevel,
      activeGates: Array.from(engine.activeGates),
      activeChannels: kernelState.activeChannels.map((channel) => ({
        name: channel.name,
        gates: channel.gates,
        circuit: channel.circuit,
        architecture: channel.architecture,
      })),
      hmmState: kernelState.hmm.state,
      hmmEntropy: kernelState.hmm.entropy,
      mcState: kernelState.mc.currentState,
      lsmReadout: kernelState.lsm.readout,
    },
  };
}

async function jsonPost<T>(url: string, personId: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-synthia-person-id': personId,
    },
    body: JSON.stringify({ ...(body as Record<string, unknown>), personId }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function inhabitSynthia(personId: string, snapshot: unknown): Promise<SynthiaPresentation> {
  return jsonPost<SynthiaPresentation>('/api/synthia/inhabit', personId, { snapshot });
}

export async function morphSynthia(personId: string, message: string, snapshot: unknown): Promise<SynthiaPresentation> {
  return jsonPost<SynthiaPresentation>('/api/synthia/morph', personId, { message, snapshot });
}

export async function sendWorldObservation(personId: string, event: unknown, snapshot?: unknown) {
  return jsonPost('/api/synthia/world/observe', personId, { event, snapshot });
}

export function shortUtterance(value: string | null | undefined) {
  if (!value) return 'Synthia is present.';
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  const plain = lines.filter((line) => !line.startsWith('{') && !/^\d+\./.test(line));
  const candidate = plain.at(-1) ?? lines.at(-1) ?? value;
  return candidate.length > 220 ? `${candidate.slice(0, 217)}…` : candidate;
}
