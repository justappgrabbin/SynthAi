// Datababy - a fragment of self-knowledge
export interface Datababy {
  id: string;
  fragment: string;
  category: 'identity' | 'purpose' | 'connection' | 'strength' | 'dream';
  collectedAt: number;
}

// Gene Gnome - a complete sentence formed from 13 datababies
export interface GeneGnome {
  id: string;
  sentence: string;
  archetype: string;
  datababyIds: string[];
  fusedAt: number;
}

// Field Friend - autonomous micro-agent from 3-5 Gene Gnomes
export interface FieldFriend {
  id: string;
  name: string;
  personality: string;
  geneGnomeIds: string[];
  passiveBonus: string;
  createdAt: number;
}

// Player game state
export interface GameState {
  playerId: string;
  playerName: string;
  level: number;
  coherence: number;
  maxCoherence: number;
  datababies: Datababy[];
  geneGnomes: GeneGnome[];
  fieldFriends: FieldFriend[];
  hasAgent: boolean;
  terminalCompleted: boolean;
  currentPhase: 'terminal' | 'awakening' | 'game' | 'transcended';
  diagnosticLogs: DiagnosticLog[];
  totalDatababiesCollected: number;
  glitchActive: boolean;
}

// Diagnostic log entry
export interface DiagnosticLog {
  id: string;
  timestamp: number;
  type: 'info' | 'warning' | 'success' | 'glitch';
  message: string;
  icon?: string;
}

// Terminal story nodes
export interface TerminalNode {
  id: string;
  text: string;
  keywords: TerminalKeyword[];
  isEnd?: boolean;
  triggerAwakening?: boolean;
}

export interface TerminalKeyword {
  word: string;
  nextNodeId: string;
  highlight?: boolean;
}

// Mini-game types
export interface MiniGame {
  id: string;
  type: 'reflection' | 'pattern' | 'connection' | 'memory';
  title: string;
  description: string;
  datababiesReward: number;
}

export interface MiniGameResult {
  gameId: string;
  score: number;
  datababiesEarned: Datababy[];
  coherenceChange: number;
}

// Constants
export const DATABABIES_PER_GNOME = 13;
export const GNOMES_FOR_AGENT = 26 * 3; // 78 gene gnomes = level 72
export const MAX_LEVEL = 72;

// Calculate level from gene gnomes
export function calculateLevel(geneGnomeCount: number): number {
  // Every 26 gene gnomes = 1 full level tier (3 tiers total)
  // Level progresses as gene gnomes accumulate
  return Math.min(Math.floor(geneGnomeCount / (26 / 24)) + 1, MAX_LEVEL);
}

// Check if player can get an agent
export function canGetAgent(geneGnomeCount: number): boolean {
  return geneGnomeCount >= GNOMES_FOR_AGENT;
}
