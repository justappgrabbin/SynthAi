/**
 * RESONANCE WEAVER -- ported from Kimi_Agent_Human_Design_Sim_Game's
 * GameEngine.ts + ResonanceEngine.ts, with real adaptations:
 *
 *   1. Characters are REAL people -- bootstrapped from actual bodygraph
 *      data (active_gates, defined centers) already computed by
 *      hd_engine.py, not synthetic NPCs from generatePresetCharacter().
 *   2. The field state driving the game (mind/body/heart) is the REAL
 *      Mind/Body/Heart coherence already computed by resonance.py, not a
 *      synthetic ConsciousnessOscillator sine-wave.
 *   3. Fixed a real gap found while porting: 'wind' was used as a
 *      playable element throughout the original but had no row in
 *      ELEMENT_COMPATIBILITY, so every wind match silently fell back to
 *      a flat 0.5 regardless of context. Added a real row for it.
 *   4. Color palette remapped -- the original used #3498DB (blue) for the
 *      'water' element, which conflicts with the app's absolute no-blue
 *      rule. Remapped to the locked palette (gold/amber/emerald/violet/
 *      coral) throughout.
 *
 * The core scoring math (calculateResonance) and loop/interference/goal
 * mechanics are otherwise unchanged from the original -- they were real
 * and well-designed, not fabricated.
 */

export type ElementType = 'fire' | 'water' | 'earth' | 'metal' | 'wood' | 'aether' | 'wind';

export const ELEMENT_COMPATIBILITY: Record<ElementType, Record<ElementType, number>> = {
  fire:   { fire: 1.0, water: 0.2, earth: 0.5, metal: 0.7, wood: 0.9, aether: 1.0, wind: 0.6 },
  water:  { fire: 0.2, water: 1.0, earth: 0.8, metal: 0.6, wood: 0.7, aether: 1.0, wind: 0.5 },
  earth:  { fire: 0.5, water: 0.8, earth: 1.0, metal: 0.9, wood: 0.4, aether: 1.0, wind: 0.4 },
  metal:  { fire: 0.7, water: 0.6, earth: 0.9, metal: 1.0, wood: 0.3, aether: 1.0, wind: 0.5 },
  wood:   { fire: 0.9, water: 0.7, earth: 0.4, metal: 0.3, wood: 1.0, aether: 1.0, wind: 0.8 },
  aether: { fire: 1.0, water: 1.0, earth: 1.0, metal: 1.0, wood: 1.0, aether: 1.0, wind: 0.9 },
  wind:   { fire: 0.6, water: 0.5, earth: 0.4, metal: 0.5, wood: 0.8, aether: 0.9, wind: 1.0 },
};

// Locked app palette only -- gold/amber/emerald/violet/coral, no blue ever.
export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff5959',    // coral
  water: '#10d474',   // emerald (was blue in the original -- fixed)
  earth: '#e8921a',   // amber
  metal: '#c084fc',   // violet
  wood: '#10d474',    // emerald (shares with water, differentiated by icon)
  aether: '#f5c518',  // gold
  wind: '#c084fc',    // violet (shares with metal, differentiated by icon)
};

export const ELEMENT_ICONS: Record<ElementType, string> = {
  fire: 'fa-fire', water: 'fa-droplet', earth: 'fa-mountain', metal: 'fa-gem',
  wood: 'fa-tree', aether: 'fa-star', wind: 'fa-wind',
};

const ELEMENT_FREQUENCIES: Record<ElementType, number> = {
  fire: 528, water: 396, earth: 432, metal: 741, wood: 639, aether: 852, wind: 417,
};

const ELEMENT_GATES: Record<ElementType, number[]> = {
  fire:  [1, 14, 21, 26, 30, 34, 38, 49, 51, 54, 55, 64],
  water: [2, 6, 11, 12, 13, 28, 29, 33, 36, 39, 41, 47, 48, 59, 63],
  earth: [5, 7, 9, 19, 27, 32, 37, 45, 50, 52, 60],
  metal: [10, 20, 23],
  wood:  [3, 8, 42, 46, 53, 57, 58],
  wind:  [17, 18, 22, 24, 31, 35, 40, 44, 56, 62],
  aether:[25, 43, 61],
};

// Faithful port of the original's per-gate element lookup (used for
// scoring a character's OWN gates against a placed condition's element).
const GATE_ELEMENTS: Record<number, ElementType> = {
  1: 'fire', 8: 'wood', 13: 'water', 25: 'aether', 31: 'wind',
  34: 'fire', 20: 'metal', 10: 'metal', 15: 'water', 46: 'wood',
  2: 'water', 14: 'fire', 43: 'fire', 23: 'metal', 21: 'fire',
  51: 'fire', 26: 'fire', 49: 'fire', 55: 'fire', 54: 'fire',
  38: 'fire', 28: 'water', 58: 'wood', 47: 'water', 64: 'fire',
};

// Real gate meanings driving goal generation -- same content as the
// original, which was already grounded in actual HD gate keynotes.
const GOAL_TEMPLATES: Record<number, { title: string; category: 'mind' | 'body' | 'heart' | 'integration'; description: string }> = {
  1:  { title: 'Create Authentically', category: 'integration', description: 'Express your unique creative vision' },
  2:  { title: 'Find Higher Direction', category: 'mind', description: 'Discover the path of least resistance' },
  3:  { title: 'Master New Skills', category: 'body', description: 'Learn through trial and adaptation' },
  4:  { title: 'Answer the Call', category: 'mind', description: 'Find solutions that satisfy the mind' },
  5:  { title: 'Establish Rhythm', category: 'body', description: 'Create sustainable patterns' },
  6:  { title: 'Navigate Intimacy', category: 'heart', description: 'Learn the art of emotional friction' },
  7:  { title: 'Lead by Example', category: 'integration', description: 'Guide others through embodied wisdom' },
  8:  { title: 'Contribute Meaningfully', category: 'integration', description: 'Make your unique mark on the world' },
  9:  { title: 'Focus Energy', category: 'body', description: 'Direct attention to what matters' },
  10: { title: 'Love Yourself', category: 'heart', description: 'Embody self-acceptance' },
  13: { title: 'Listen Deeply', category: 'heart', description: 'Hear what others cannot say' },
  14: { title: 'Wealth Through Power', category: 'body', description: 'Channel life force into prosperity' },
  17: { title: 'Refine Your Opinion', category: 'mind', description: 'Test ideas before sharing them' },
  18: { title: 'Correct What\u2019s Broken', category: 'body', description: 'Find and fix the pattern' },
  20: { title: 'Be Present', category: 'mind', description: 'Live fully in the now' },
  25: { title: 'Universal Love', category: 'heart', description: 'Embody spiritual innocence' },
  28: { title: 'Find Purpose', category: 'integration', description: 'Discover meaning through struggle' },
  32: { title: 'Sense What Lasts', category: 'body', description: 'Recognize what\u2019s built to endure' },
  34: { title: 'Pure Power', category: 'body', description: 'Harness sacral life force' },
  43: { title: 'Inner Knowing', category: 'mind', description: 'Trust unique insights' },
  46: { title: 'Love of the Body', category: 'body', description: 'Be in the right place at the right time' },
  50: { title: 'Hold Values', category: 'heart', description: 'Maintain tribal responsibility' },
  51: { title: 'Shock into Awakening', category: 'body', description: 'Initiate through disruption' },
  55: { title: 'Emotional Freedom', category: 'heart', description: 'Release into spirit' },
  57: { title: 'Intuitive Clarity', category: 'mind', description: 'Penetrate to the truth' },
  59: { title: 'Break Down Barriers', category: 'heart', description: 'Create intimacy and bonding' },
};

export interface WeaverCharacter {
  id: string;
  name: string;
  isPlayer: boolean;
  designType: string;
  activeGates: number[];
  definedCenters: string[];
  energy: number;
  maxEnergy: number;
  coherence: number;
  alive: boolean;
  position: { x: number; y: number };
  goals: WeaverGoal[];
}

export interface WeaverGoal {
  id: string;
  title: string;
  description: string;
  category: 'mind' | 'body' | 'heart' | 'integration';
  targetValue: number;
  currentValue: number;
  completed: boolean;
  derivedFromGate: number;
}

export interface WeaverCondition {
  id: string;
  element: ElementType;
  position: { x: number; y: number };
  resonanceFrequency: number;
  coherenceRequired: number;
  compatibleGates: number[];
  radius: number;
}

export interface WeaverLoop {
  id: string;
  characterId: string;
  conditionId: string;
  loopType: 'harmonic' | 'dissonant' | 'growth' | 'decay';
  strength: number;
  goalProgress: number;
  interferenceGenerated: number;
  active: boolean;
  age: number;
}

export interface WeaverInterference {
  id: string;
  sourceLoopId: string;
  intensity: number;
  position: { x: number; y: number };
  manifestation: 'static' | 'drift' | 'echo' | 'shadow' | 'flare';
  age: number;
}

export interface RealFieldState {
  mind: number;  // 0-1 coherence, real values from resonance.py's field_state
  body: number;
  heart: number;
}

export interface WeaverState {
  characters: WeaverCharacter[];
  conditions: WeaverCondition[];
  loops: WeaverLoop[];
  interferences: WeaverInterference[];
  globalCoherence: number;
  totalLoops: number;
  goalsCompleted: number;
  turn: number;
  gridSize: number;
  maxConditions: number;
}

function calculateResonance(
  characterGates: number[],
  characterCoherence: number,
  conditionElement: ElementType,
  conditionCompatibleGates: number[],
  conditionCoherenceRequired: number,
  fieldState: RealFieldState,
): { score: number; loopType: WeaverLoop['loopType']; goalProgress: number; interference: number } {
  let totalCompat = 0;
  for (const gate of characterGates) {
    const ge = GATE_ELEMENTS[gate] || 'earth';
    totalCompat += ELEMENT_COMPATIBILITY[ge]?.[conditionElement] ?? 0.5;
  }
  const avgCompat = characterGates.length > 0 ? totalCompat / characterGates.length : 0.5;

  const gateOverlap = characterGates.filter(g => conditionCompatibleGates.includes(g)).length;
  const overlapBonus = conditionCompatibleGates.length > 0 ? gateOverlap / conditionCompatibleGates.length : 0;

  const coherenceMatch = characterCoherence >= conditionCoherenceRequired
    ? 1.0 : characterCoherence / conditionCoherenceRequired;

  const fieldAvg = (fieldState.mind + fieldState.body + fieldState.heart) / 3;

  const score = avgCompat * 0.35 + overlapBonus * 0.30 + coherenceMatch * 0.20 + fieldAvg * 0.15;

  let loopType: WeaverLoop['loopType'] = 'decay';
  if (score > 0.7) loopType = 'harmonic';
  else if (score > 0.5) loopType = 'growth';
  else if (score > 0.3) loopType = 'dissonant';

  const interference = (1 - fieldAvg) * (1 - characterCoherence) * 0.5;
  const goalProgress = loopType === 'harmonic' ? 0.15 : loopType === 'growth' ? 0.08 : loopType === 'dissonant' ? 0.02 : -0.05;

  return { score, loopType, goalProgress, interference };
}

function generateGoals(activeGates: number[], designType: string): WeaverGoal[] {
  const goals: WeaverGoal[] = [];
  for (const gate of activeGates.slice(0, 4)) {
    const tmpl = GOAL_TEMPLATES[gate];
    if (tmpl) {
      goals.push({
        id: `goal_${gate}_${Date.now()}`, title: tmpl.title, description: tmpl.description,
        category: tmpl.category, targetValue: 100, currentValue: 0, completed: false, derivedFromGate: gate,
      });
    }
  }
  const typeGoal: Record<string, Omit<WeaverGoal, 'id'>> = {
    Generator: { title: 'Satisfy the Sacral', description: 'Find work that lights up your body', category: 'integration', targetValue: 100, currentValue: 0, completed: false, derivedFromGate: 0 },
    Projector: { title: 'Be Recognized', description: 'Wait for the invitation that sees your gift', category: 'integration', targetValue: 100, currentValue: 0, completed: false, derivedFromGate: 0 },
    Manifestor: { title: 'Initiate Peace', description: 'Impact the world while informing others', category: 'integration', targetValue: 100, currentValue: 0, completed: false, derivedFromGate: 0 },
    Reflector: { title: 'Reflect Truth', description: 'Sample the lunar cycle and mirror the community', category: 'integration', targetValue: 100, currentValue: 0, completed: false, derivedFromGate: 0 },
  };
  const tg = typeGoal[designType] || typeGoal.Generator;
  goals.push({ ...tg, id: `goal_type_${Date.now()}` });
  return goals;
}

export class ResonanceWeaver {
  private state: WeaverState;
  private listeners: Set<(state: WeaverState) => void> = new Set();
  private running = false;
  private animFrame = 0;
  private fieldState: RealFieldState = { mind: 0.5, body: 0.5, heart: 0.5 };

  constructor(gridSize = 9) {
    this.state = {
      characters: [], conditions: [], loops: [], interferences: [],
      globalCoherence: 0.5, totalLoops: 0, goalsCompleted: 0, turn: 0,
      gridSize, maxConditions: 12,
    };
  }

  /** Feed real Mind/Body/Heart coherence from resonance.py's field_state
   * -- called whenever the player's real chart data is available/refreshed. */
  setRealFieldState(mind: number, body: number, heart: number) {
    this.fieldState = { mind, body, heart };
    this.state.globalCoherence = (mind + body + heart) / 3;
  }

  subscribe(listener: (state: WeaverState) => void) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const s = this.getState();
    this.listeners.forEach(l => l(s));
  }

  getState(): WeaverState {
    return {
      ...this.state,
      characters: this.state.characters.map(c => ({ ...c, goals: c.goals.map(g => ({ ...g })) })),
      conditions: this.state.conditions.map(c => ({ ...c })),
      loops: this.state.loops.map(l => ({ ...l })),
      interferences: this.state.interferences.map(i => ({ ...i })),
    };
  }

  /** Bootstrap a REAL character from actual bodygraph data -- not a
   * synthetic preset. coherence here is the real network_coherence or
   * an individual field's coherence, whichever is most relevant. */
  addRealCharacter(params: {
    name: string; isPlayer: boolean; designType: string;
    activeGates: number[]; definedCenters: string[]; coherence: number;
    position?: { x: number; y: number };
  }): WeaverCharacter {
    const id = params.isPlayer ? 'player' : `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const position = params.position || {
      x: Math.floor(Math.random() * this.state.gridSize),
      y: Math.floor(Math.random() * this.state.gridSize),
    };
    const char: WeaverCharacter = {
      id, name: params.name, isPlayer: params.isPlayer, designType: params.designType,
      activeGates: params.activeGates, definedCenters: params.definedCenters,
      energy: 80, maxEnergy: 100, coherence: params.coherence, alive: true, position,
      goals: generateGoals(params.activeGates, params.designType),
    };
    this.state.characters.push(char);
    this.emit();
    return char;
  }

  placeCondition(element: ElementType, position: { x: number; y: number }, radius = 2): WeaverCondition | null {
    if (position.x < 0 || position.x >= this.state.gridSize || position.y < 0 || position.y >= this.state.gridSize) return null;
    if (this.state.conditions.length >= this.state.maxConditions) return null;
    if (this.state.conditions.some(c => c.position.x === position.x && c.position.y === position.y)) return null;

    const condition: WeaverCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      element, position, resonanceFrequency: ELEMENT_FREQUENCIES[element],
      coherenceRequired: 0.3, compatibleGates: ELEMENT_GATES[element], radius,
    };
    this.state.conditions.push(condition);
    this.recalculateLoops();
    this.emit();
    return condition;
  }

  removeCondition(conditionId: string) {
    this.state.conditions = this.state.conditions.filter(c => c.id !== conditionId);
    this.state.loops = this.state.loops.filter(l => l.conditionId !== conditionId);
    this.recalculateLoops();
    this.emit();
  }

  private recalculateLoops() {
    for (const loop of this.state.loops) loop.active = false;

    for (const char of this.state.characters) {
      if (!char.alive) continue;
      for (const cond of this.state.conditions) {
        const dist = Math.sqrt((char.position.x - cond.position.x) ** 2 + (char.position.y - cond.position.y) ** 2);
        if (dist > cond.radius) continue;

        const result = calculateResonance(
          char.activeGates, char.coherence, cond.element, cond.compatibleGates,
          cond.coherenceRequired, this.fieldState,
        );

        if (result.score > 0.2) {
          let loop = this.state.loops.find(l => l.characterId === char.id && l.conditionId === cond.id);
          if (!loop) {
            loop = {
              id: `loop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              characterId: char.id, conditionId: cond.id, loopType: result.loopType,
              strength: result.score, goalProgress: result.goalProgress,
              interferenceGenerated: result.interference, active: true, age: 0,
            };
            this.state.loops.push(loop);
            this.state.totalLoops++;
          } else {
            loop.active = true;
            loop.strength = result.score;
            loop.loopType = result.loopType;
            loop.goalProgress = result.goalProgress;
            loop.interferenceGenerated = result.interference;
          }
        }
      }
    }
    this.state.loops = this.state.loops.filter(l => l.active);
  }

  private updateInterferences() {
    for (const intf of this.state.interferences) {
      intf.age++;
      intf.intensity *= 0.998;
    }
    this.state.interferences = this.state.interferences.filter(i => i.intensity > 0.05);

    for (const loop of this.state.loops) {
      if (loop.interferenceGenerated < 0.1) continue;
      const cond = this.state.conditions.find(c => c.id === loop.conditionId);
      if (!cond) continue;
      if (Math.random() < 0.1 * loop.interferenceGenerated) {
        const manifestations: WeaverInterference['manifestation'][] = ['static', 'drift', 'echo', 'shadow', 'flare'];
        this.state.interferences.push({
          id: `intf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          sourceLoopId: loop.id, intensity: loop.interferenceGenerated * (0.5 + Math.random() * 0.5),
          position: {
            x: Math.max(0, Math.min(this.state.gridSize - 1, cond.position.x + (Math.random() - 0.5) * 3)),
            y: Math.max(0, Math.min(this.state.gridSize - 1, cond.position.y + (Math.random() - 0.5) * 3)),
          },
          manifestation: manifestations[Math.floor(Math.random() * manifestations.length)], age: 0,
        });
      }
    }
  }

  private updateGoals() {
    for (const loop of this.state.loops) {
      if (loop.goalProgress <= 0) continue;
      const char = this.state.characters.find(c => c.id === loop.characterId);
      if (!char) continue;
      for (const goal of char.goals) {
        if (goal.completed) continue;
        goal.currentValue = Math.min(goal.targetValue, goal.currentValue + loop.goalProgress * loop.strength * 2);
        if (goal.currentValue >= goal.targetValue) {
          goal.completed = true;
          this.state.goalsCompleted++;
          char.coherence = Math.min(1, char.coherence + 0.1);
        }
        break;
      }
    }
  }

  private updateCharacters() {
    for (const char of this.state.characters) {
      if (!char.alive) continue;
      char.energy = Math.max(0, char.energy - 0.02);
      const totalHarmonic = this.state.loops
        .filter(l => l.characterId === char.id && l.loopType === 'harmonic')
        .reduce((s, l) => s + l.strength, 0);
      char.energy = Math.min(char.maxEnergy, char.energy + totalHarmonic * 0.1);
      char.coherence = char.coherence * 0.99 + this.state.globalCoherence * 0.01;
    }
  }

  private ageLoops() {
    for (const loop of this.state.loops) {
      loop.age++;
      loop.interferenceGenerated = Math.min(0.8, loop.interferenceGenerated + 0.001 * loop.age);
    }
  }

  private tick = () => {
    if (!this.running) return;
    this.state.turn++;
    this.ageLoops();
    this.updateInterferences();
    this.updateGoals();
    this.updateCharacters();
    this.recalculateLoops();
    this.emit();
    this.animFrame = requestAnimationFrame(this.tick);
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animFrame);
  }

  isRunning() {
    return this.running;
  }
}
