import type { BirthAnchor } from "../api";
const randomUUID = () => crypto.randomUUID();
import type { 
  GameState, 
  Datababy, 
  GeneGnome, 
  DiagnosticLog,
  FieldFriend 
} from "./types";
import { 
  DATABABIES_PER_GNOME, 
  calculateLevel 
} from "./types";

const SENTENCE_FRAGMENTS: Record<Datababy['category'], string[]> = {
  identity: [
    'I am', 'uniquely', 'myself', 'authentic', 'growing', 
    'discovering', 'becoming', 'evolving', 'learning', 'present',
    'aware', 'conscious', 'alive'
  ],
  purpose: [
    'I create', 'meaning', 'through', 'my actions', 'intentions',
    'goals', 'dreams', 'aspirations', 'contributions', 'impact',
    'legacy', 'purpose', 'calling'
  ],
  connection: [
    'I connect', 'with others', 'deeply', 'genuinely', 'openly',
    'lovingly', 'empathetically', 'compassionately', 'understanding',
    'sharing', 'together', 'united', 'bonded'
  ],
  strength: [
    'I possess', 'courage', 'resilience', 'determination', 'power',
    'wisdom', 'patience', 'kindness', 'strength', 'inner peace',
    'balance', 'harmony', 'stability'
  ],
  dream: [
    'I envision', 'a world', 'where', 'possibilities', 'expand',
    'horizons', 'infinite', 'wonder', 'imagination', 'hope',
    'futures', 'potential', 'magic'
  ],
};

const ARCHETYPE_NAMES = [
  'Memory Keeper', 'Dream Weaver', 'Pattern Finder', 
  'Truth Speaker', 'Heart Guardian', 'Mind Builder',
  'Soul Navigator', 'Light Bearer', 'Path Walker',
  'Story Teller', 'Bond Maker', 'Peace Bringer'
];

export interface IStorage {
  createGame(playerName: string): Promise<GameState>;
  getGame(playerId: string): Promise<GameState | undefined>;
  updateGame(playerId: string, updates: Partial<GameState>): Promise<GameState | undefined>;
  collectDatababy(playerId: string, category: Datababy['category']): Promise<{ gameState: GameState; datababy: Datababy } | undefined>;
  fuseGeneGnome(playerId: string): Promise<{ gameState: GameState; geneGnome: GeneGnome } | undefined>;
  updateCoherence(playerId: string, change: number): Promise<GameState | undefined>;
  addDiagnosticLog(playerId: string, type: DiagnosticLog['type'], message: string): Promise<GameState | undefined>;
}

export class MemStorage implements IStorage {
  private games: Map<string, GameState>;

  constructor(private anchor: BirthAnchor) {
    this.games = new Map();
  }

  // Chart-derived selection is a game rule, not a personality inference.
  private selectionIndex(kind: string, step: number, count: number): number {
    const sun = this.anchor.tropical_sun;
    const key = `${this.anchor.configuration_id}:${sun.longitude}:${sun.gate}.${sun.line}.${sun.color}.${sun.tone}.${sun.base}:${kind}:${step}`;
    let value = 2166136261;
    for (const ch of key) value = Math.imul(value ^ ch.charCodeAt(0), 16777619);
    return (value >>> 0) % count;
  }

  private generateId(): string {
    return randomUUID();
  }

  async createGame(playerName: string): Promise<GameState> {
    const playerId = this.generateId();
    const gameState: GameState = {
      playerId,
      playerName,
      level: 1,
      coherence: 100,
      maxCoherence: 100,
      datababies: [],
      geneGnomes: [],
      fieldFriends: [],
      hasAgent: false,
      terminalCompleted: false,
      currentPhase: 'terminal',
      diagnosticLogs: [],
      totalDatababiesCollected: 0,
      glitchActive: false,
    };
    this.games.set(playerId, gameState);
    return gameState;
  }

  async getGame(playerId: string): Promise<GameState | undefined> {
    return this.games.get(playerId);
  }

  async updateGame(playerId: string, updates: Partial<GameState>): Promise<GameState | undefined> {
    const game = this.games.get(playerId);
    if (!game) return undefined;

    const updated = { ...game, ...updates };
    this.games.set(playerId, updated);
    return updated;
  }

  async collectDatababy(playerId: string, category: Datababy['category']): Promise<{ gameState: GameState; datababy: Datababy } | undefined> {
    const game = this.games.get(playerId);
    if (!game) return undefined;

    const fragments = SENTENCE_FRAGMENTS[category];
    const fragment = fragments[this.selectionIndex(category, game.totalDatababiesCollected, fragments.length)];

    const datababy: Datababy = {
      id: this.generateId(),
      fragment,
      category,
      collectedAt: Date.now(),
    };

    const diagnosticLog: DiagnosticLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'success',
      message: `Data fragment acquired: "${datababy.fragment}"`,
    };

    const updated: GameState = {
      ...game,
      datababies: [...game.datababies, datababy],
      totalDatababiesCollected: game.totalDatababiesCollected + 1,
      coherence: Math.min(game.maxCoherence, game.coherence + 2),
      diagnosticLogs: [...game.diagnosticLogs.slice(-50), diagnosticLog],
    };

    this.games.set(playerId, updated);
    return { gameState: updated, datababy };
  }

  async fuseGeneGnome(playerId: string): Promise<{ gameState: GameState; geneGnome: GeneGnome } | undefined> {
    const game = this.games.get(playerId);
    if (!game || game.datababies.length < DATABABIES_PER_GNOME) return undefined;

    const datababiesToFuse = game.datababies.slice(0, DATABABIES_PER_GNOME);
    const sentence = datababiesToFuse.map(d => d.fragment).join(' ') + '.';
    const archetype = ARCHETYPE_NAMES[this.selectionIndex("archetype", game.geneGnomes.length, ARCHETYPE_NAMES.length)];

    const geneGnome: GeneGnome = {
      id: this.generateId(),
      sentence,
      archetype,
      datababyIds: datababiesToFuse.map(d => d.id),
      fusedAt: Date.now(),
    };

    const newGnomeCount = game.geneGnomes.length + 1;
    const newLevel = calculateLevel(newGnomeCount);

    const diagnosticLog: DiagnosticLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'success',
      message: `Gene Gnome synthesized: ${archetype}`,
    };

    const updated: GameState = {
      ...game,
      datababies: game.datababies.slice(DATABABIES_PER_GNOME),
      geneGnomes: [...game.geneGnomes, geneGnome],
      level: newLevel,
      maxCoherence: 100 + (newLevel * 5),
      diagnosticLogs: [...game.diagnosticLogs.slice(-50), diagnosticLog],
    };

    this.games.set(playerId, updated);
    return { gameState: updated, geneGnome };
  }

  async updateCoherence(playerId: string, change: number): Promise<GameState | undefined> {
    const game = this.games.get(playerId);
    if (!game) return undefined;

    const newCoherence = Math.max(0, Math.min(game.maxCoherence, game.coherence + change));
    const glitchActive = newCoherence < 30;

    const logs = [...game.diagnosticLogs];
    if (glitchActive && !game.glitchActive) {
      logs.push({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'warning',
        message: 'COHERENCE CRITICAL. Glitch events imminent.',
      });
    }

    const updated: GameState = {
      ...game,
      coherence: newCoherence,
      glitchActive,
      diagnosticLogs: logs.slice(-50),
    };

    this.games.set(playerId, updated);
    return updated;
  }

  async addDiagnosticLog(playerId: string, type: DiagnosticLog['type'], message: string): Promise<GameState | undefined> {
    const game = this.games.get(playerId);
    if (!game) return undefined;

    const log: DiagnosticLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      message,
    };

    const updated: GameState = {
      ...game,
      diagnosticLogs: [...game.diagnosticLogs.slice(-50), log],
    };

    this.games.set(playerId, updated);
    return updated;
  }
}


