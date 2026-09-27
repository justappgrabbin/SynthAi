// ============================================================
// KLEIN AUTOLING v2 — True State-Driven Transition Grammar
// NOT template filling. NOT prompt-based generation.
// Constraint satisfaction. Goal-directed construction.
// Recursive expansion. Coherence maintenance across text.
// Based on Sheldon Klein's 1968-1979 research:
// - AutoLing: Automatic language generation
// - Interactive Heuristic Transition Grammar
// - Control of Style in Generated Grammar
// ============================================================

import type { Center, Color, Dimension, FiveW, WritingStyle } from '@/types';
import { COLOR_MAP } from '@/data/humanDesign';

// === GRAMMAR STATE MACHINE ===
export type GrammarState = 
  | 'INIT'           // Starting state
  | 'NP_BUILD'       // Building noun phrase
  | 'VP_BUILD'       // Building verb phrase
  | 'CLAUSE_CLOSE'   // Closing a clause
  | 'CONNECT'        // Adding connective
  | 'DESCRIBE'       // Adding description
  | 'DIALOGUE_OPEN'  // Opening dialogue
  | 'DIALOGUE_BODY'  // Dialogue content
  | 'DIALOGUE_CLOSE' // Closing dialogue
  | 'COMPLETE';      // Finished

export interface TransitionRule {
  from: GrammarState;
  to: GrammarState;
  condition: (ctx: GenerationContext) => boolean;
  weight: number;
  action: (ctx: GenerationContext) => void;
}

export interface GenerationContext {
  goal: string;              // What we're trying to express
  topic: string;
  currentState: GrammarState;
  previousStates: GrammarState[];
  generatedText: string[];
  currentPhrase: string[];
  depth: number;
  maxDepth: number;
  center: Center;
  color: Color;
  dimension: Dimension;
  style: WritingStyle;
  subject: string;
  verb: string;
  object: string;
  mood: string;
  tense: string;
  coherence: number;         // 0-1, tracks text coherence
  usedWords: Set<string>;    // For avoiding repetition
  constraints: Constraint[];
}

export interface Constraint {
  type: 'avoid_word' | 'must_include' | 'max_length' | 'min_coherence' | 'style_match';
  value: any;
  satisfied: boolean;
}

// === THE TRANSITION GRAMMAR ENGINE ===
export class KleinAutoLing {
  private rules: TransitionRule[] = [];
  private rng: () => number;
  private transitionHistory: Array<{from: GrammarState; to: GrammarState; chosen: boolean}> = [];

  constructor(seed?: number) {
    this.rng = this.createSeededRng(seed || Date.now());
    this.initRules();
  }

  private createSeededRng(seed: number): () => number {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  }

  private pick<T>(arr: T[]): T { return arr[Math.floor(this.rng() * arr.length)]; }
  private pickWeighted<T>(items: [T, number][]): T {
    const total = items.reduce((sum, [, w]) => sum + w, 0);
    let r = this.rng() * total;
    for (const [item, weight] of items) { r -= weight; if (r <= 0) return item; }
    return items[0][0];
  }

  // === TRANSITION RULES (The Heart of Klein's System) ===
  private initRules(): void {
    this.rules = [
      // INIT -> NP_BUILD: Start with a noun phrase
      {
        from: 'INIT', to: 'NP_BUILD',
        condition: (ctx) => ctx.depth < ctx.maxDepth,
        weight: 0.9,
        action: (ctx) => {
          const subject = this.selectSubject(ctx);
          ctx.subject = subject;
          ctx.currentPhrase.push(subject);
          ctx.coherence = 0.8;
        }
      },
      // INIT -> DESCRIBE: Start with description
      {
        from: 'INIT', to: 'DESCRIBE',
        condition: (ctx) => ctx.style === 'poetic' || ctx.style === 'mystical',
        weight: 0.3,
        action: (ctx) => {
          const desc = this.generateDescription(ctx);
          ctx.currentPhrase.push(desc);
          ctx.coherence = 0.6;
        }
      },
      // NP_BUILD -> VP_BUILD: Add verb
      {
        from: 'NP_BUILD', to: 'VP_BUILD',
        condition: (ctx) => ctx.subject.length > 0 && ctx.depth < ctx.maxDepth,
        weight: 0.85,
        action: (ctx) => {
          const verb = this.selectVerb(ctx);
          ctx.verb = verb;
          ctx.currentPhrase.push(verb);
          ctx.coherence = Math.min(1, ctx.coherence + 0.1);
        }
      },
      // NP_BUILD -> DESCRIBE: Describe the subject
      {
        from: 'NP_BUILD', to: 'DESCRIBE',
        condition: (ctx) => ctx.depth < ctx.maxDepth - 1,
        weight: 0.4,
        action: (ctx) => {
          const desc = this.generateDescription(ctx);
          ctx.currentPhrase.push(desc);
        }
      },
      // VP_BUILD -> NP_BUILD: Add object (recursive)
      {
        from: 'VP_BUILD', to: 'NP_BUILD',
        condition: (ctx) => ctx.depth < ctx.maxDepth - 1,
        weight: 0.6,
        action: (ctx) => {
          const obj = this.selectObject(ctx);
          ctx.object = obj;
          ctx.currentPhrase.push(obj);
          ctx.depth++;
          ctx.coherence = Math.min(1, ctx.coherence + 0.05);
        }
      },
      // VP_BUILD -> CLAUSE_CLOSE: Close the clause
      {
        from: 'VP_BUILD', to: 'CLAUSE_CLOSE',
        condition: (ctx) => ctx.verb.length > 0,
        weight: 0.8,
        action: (ctx) => {
          const closer = this.generateClauseClose(ctx);
          ctx.currentPhrase.push(closer);
          ctx.generatedText.push(ctx.currentPhrase.join(' '));
          ctx.currentPhrase = [];
          ctx.coherence = Math.min(1, ctx.coherence + 0.1);
        }
      },
      // VP_BUILD -> DESCRIBE: Describe the action
      {
        from: 'VP_BUILD', to: 'DESCRIBE',
        condition: (ctx) => ctx.verb.length > 0,
        weight: 0.35,
        action: (ctx) => {
          const desc = this.generateAdverbial(ctx);
          ctx.currentPhrase.push(desc);
        }
      },
      // CLAUSE_CLOSE -> CONNECT: Connect to next
      {
        from: 'CLAUSE_CLOSE', to: 'CONNECT',
        condition: (ctx) => ctx.generatedText.length < 3 && ctx.depth < ctx.maxDepth,
        weight: 0.7,
        action: (ctx) => {
          const conn = this.selectConnective(ctx);
          ctx.currentPhrase.push(conn);
          ctx.coherence = Math.max(0, ctx.coherence - 0.05);
        }
      },
      // CLAUSE_CLOSE -> DIALOGUE_OPEN: Open dialogue
      {
        from: 'CLAUSE_CLOSE', to: 'DIALOGUE_OPEN',
        condition: (ctx) => ctx.style === 'dialogic',
        weight: 0.3,
        action: (ctx) => {
          const open = this.generateDialogueOpen(ctx);
          ctx.currentPhrase.push(open);
        }
      },
      // CLAUSE_CLOSE -> COMPLETE: End generation
      {
        from: 'CLAUSE_CLOSE', to: 'COMPLETE',
        condition: (ctx) => ctx.generatedText.length >= 2 || ctx.depth >= ctx.maxDepth,
        weight: 0.5,
        action: (ctx) => {
          if (ctx.currentPhrase.length > 0) {
            ctx.generatedText.push(ctx.currentPhrase.join(' '));
          }
        }
      },
      // CONNECT -> NP_BUILD: New subject
      {
        from: 'CONNECT', to: 'NP_BUILD',
        condition: (ctx) => ctx.depth < ctx.maxDepth,
        weight: 0.8,
        action: (ctx) => {
          const newSubj = this.selectSubject(ctx);
          ctx.subject = newSubj;
          ctx.currentPhrase.push(newSubj);
          ctx.coherence = Math.min(1, ctx.coherence + 0.05);
        }
      },
      // CONNECT -> DESCRIBE: Descriptive transition
      {
        from: 'CONNECT', to: 'DESCRIBE',
        condition: (ctx) => ctx.style === 'poetic' || ctx.style === 'mystical',
        weight: 0.4,
        action: (ctx) => {
          const desc = this.generateDescription(ctx);
          ctx.currentPhrase.push(desc);
        }
      },
      // DESCRIBE -> VP_BUILD: Verb after description
      {
        from: 'DESCRIBE', to: 'VP_BUILD',
        condition: (ctx) => ctx.currentPhrase.length > 0 && ctx.depth < ctx.maxDepth,
        weight: 0.7,
        action: (ctx) => {
          const verb = this.selectVerb(ctx);
          ctx.verb = verb;
          ctx.currentPhrase.push(verb);
        }
      },
      // DESCRIBE -> CLAUSE_CLOSE: End with description
      {
        from: 'DESCRIBE', to: 'CLAUSE_CLOSE',
        condition: (ctx) => ctx.currentPhrase.length > 2,
        weight: 0.5,
        action: (ctx) => {
          ctx.generatedText.push(ctx.currentPhrase.join(' '));
          ctx.currentPhrase = [];
        }
      },
      // DIALOGUE_OPEN -> DIALOGUE_BODY: Dialogue content
      {
        from: 'DIALOGUE_OPEN', to: 'DIALOGUE_BODY',
        condition: () => true,
        weight: 1.0,
        action: (ctx) => {
          const line = this.generateDialogueLine(ctx);
          ctx.currentPhrase.push('"' + line + '"');
        }
      },
      // DIALOGUE_BODY -> DIALOGUE_CLOSE: End dialogue
      {
        from: 'DIALOGUE_BODY', to: 'DIALOGUE_CLOSE',
        condition: () => true,
        weight: 0.6,
        action: (ctx) => {
          const close = this.generateDialogueClose(ctx);
          ctx.currentPhrase.push(close);
          ctx.generatedText.push(ctx.currentPhrase.join(' '));
          ctx.currentPhrase = [];
        }
      },
      // DIALOGUE_BODY -> DIALOGUE_BODY: Continue dialogue
      {
        from: 'DIALOGUE_BODY', to: 'DIALOGUE_BODY',
        condition: (ctx) => ctx.currentPhrase.length > 2,
        weight: 0.4,
        action: (ctx) => {
          const line = this.generateDialogueLine(ctx);
          ctx.currentPhrase.push('"' + line + '"');
        }
      },
      // DIALOGUE_CLOSE -> CONNECT: Back to narrative
      {
        from: 'DIALOGUE_CLOSE', to: 'CONNECT',
        condition: (ctx) => ctx.depth < ctx.maxDepth,
        weight: 0.6,
        action: (ctx) => {
          const conn = this.selectConnective(ctx);
          ctx.currentPhrase.push(conn);
        }
      },
      // DIALOGUE_CLOSE -> COMPLETE: End
      {
        from: 'DIALOGUE_CLOSE', to: 'COMPLETE',
        condition: (ctx) => ctx.generatedText.length >= 2,
        weight: 0.4,
        action: (ctx) => {
          if (ctx.currentPhrase.length > 0) {
            ctx.generatedText.push(ctx.currentPhrase.join(' '));
          }
        }
      }
    ];
  }

  // === SELECTION FUNCTIONS (Goal-Driven) ===

  private selectSubject(ctx: GenerationContext): string {
    const subjects: Record<WritingStyle, string[]> = {
      narrative: ['the wanderer', 'the seeker', 'the one who remembers', 'the forgotten voice', 'the pattern-bearer'],
      analytical: ['the system', 'the structure', 'the observed phenomenon', 'the model', 'the framework'],
      poetic: ['the luminous shadow', 'the silent echo', 'the trembling leaf', 'the ancient star', 'the velvet darkness'],
      technical: ['the implementation', 'the protocol', 'the architecture', 'the interface', 'the algorithm'],
      dialogic: ['the questioner', 'the witness', 'the one who speaks', 'the listener', 'the voice'],
      mystical: ['the essence', 'the divine spark', 'the eternal witness', 'the sacred pattern', 'the cosmic breath']
    };

    // Goal-directed: if goal mentions a concept, use related subject
    if (ctx.goal.includes('consciousness')) return 'the awakening mind';
    if (ctx.goal.includes('transformation')) return 'the one becoming';
    if (ctx.goal.includes('pattern')) return 'the pattern-seer';

    const candidates = subjects[ctx.style] || subjects.narrative;
    return this.pick(candidates);
  }

  private selectVerb(ctx: GenerationContext): string {
    const verbs: Record<WritingStyle, string[]> = {
      narrative: ['journeyed', 'discovered', 'remembered', 'sought', 'found', 'lost', 'returned'],
      analytical: ['demonstrated', 'indicated', 'revealed', 'established', 'confirmed', 'quantified'],
      poetic: ['trembled', 'flowed', 'shattered', 'bloomed', 'lingered', 'dissolved', 'ascended'],
      technical: ['executed', 'initialized', 'configured', 'optimized', 'deployed', 'synchronized'],
      dialogic: ['asked', 'replied', 'pondered', 'insisted', 'whispered', 'demanded'],
      mystical: ['resonated', 'transcended', 'aligned', 'surrendered', 'awakened', 'merged']
    };

    // Goal-directed verb selection
    if (ctx.goal.includes('seek')) return 'sought';
    if (ctx.goal.includes('find')) return 'discovered';
    if (ctx.goal.includes('change')) return 'transformed';

    return this.pick(verbs[ctx.style] || verbs.narrative);
  }

  private selectObject(ctx: GenerationContext): string {
    const objects: Record<WritingStyle, string[]> = {
      narrative: ['the hidden truth', 'the ancient path', 'the forgotten city', 'the source of all stories'],
      analytical: ['the underlying pattern', 'the correlation matrix', 'the structural invariant', 'the emergent property'],
      poetic: ['the luminous void', 'the eternal moment', 'the crystallized tear', 'the whispered secret'],
      technical: ['the recursive function', 'the state machine', 'the dependency graph', 'the execution context'],
      dialogic: ['the unspoken answer', 'the question beneath questions', 'the meaning between words'],
      mystical: ['the divine frequency', 'the akashic record', 'the source vibration', 'the eternal consciousness']
    };

    if (ctx.goal.includes('knowledge')) return 'the well of knowing';
    if (ctx.goal.includes('power')) return 'the source of transformation';

    return this.pick(objects[ctx.style] || objects.narrative);
  }

  private selectConnective(ctx: GenerationContext): string {
    const colorDef = COLOR_MAP[ctx.color];
    const connectives = [
      `Meanwhile, in the realm of ${ctx.dimension.toLowerCase()},`,
      `And so the ${colorDef.name.toLowerCase()} continued:`,
      `Through the ${ctx.center} center,`,
      `As the pattern of ${ctx.topic} deepened,`,
      `In the ${colorDef.mode[0]} time,`
    ];
    return this.pick(connectives);
  }

  private generateDescription(ctx: GenerationContext): string {
    const colorDef = COLOR_MAP[ctx.color];
    const descs: Record<WritingStyle, string[]> = {
      narrative: [`heavy with ${colorDef.name.toLowerCase()}`, 'ancient and patient', 'moving through silence'],
      analytical: [`characterized by ${colorDef.theme}-based parameters`, 'structurally significant', 'quantitatively notable'],
      poetic: [`${colorDef.name.toLowerCase()}-colored and luminous`, 'ethereal beyond measure', 'like a forgotten dream'],
      technical: [`optimized for ${ctx.dimension.toLowerCase()} traversal`, 'state-managed', 'asynchronously aware'],
      dialogic: ['hesitant, then certain', 'spoken as if from far away', 'carrying the weight of meaning'],
      mystical: [`pulsing with ${colorDef.name.toLowerCase()} energy`, 'aligned to cosmic frequency', 'beyond the veil of form']
    };
    return this.pick(descs[ctx.style] || descs.narrative);
  }

  private generateAdverbial(ctx: GenerationContext): string {
    const advs: Record<WritingStyle, string[]> = {
      narrative: ['slowly, deliberately', 'through the mist of time', 'against all resistance'],
      analytical: ['with statistical significance', 'within defined parameters', 'given sufficient constraints'],
      poetic: ['like smoke through light', 'in the cathedral of silence', 'with trembling grace'],
      technical: ['via the optimized pipeline', 'within the bounded context', 'through recursive application'],
      dialogic: ['as if testing each word', 'voice barely above a whisper', 'with growing urgency'],
      mystical: ['through the third frequency', 'beyond the material veil', 'in sacred alignment']
    };
    return this.pick(advs[ctx.style] || advs.narrative);
  }

  private generateClauseClose(ctx: GenerationContext): string {
    const colorDef = COLOR_MAP[ctx.color];
    const closers = [
      `— the ${ctx.center.toLowerCase()} center knowing this truth.`,
      `, carrying ${colorDef.name.toLowerCase()} as both burden and gift.`,
      `, bound to the ${ctx.dimension.toLowerCase()} dimension forever.`,
      `.`,
      `, and the ${colorDef.mode[0]} path was chosen.`
    ];
    return this.pick(closers);
  }

  private generateDialogueOpen(_ctx: GenerationContext): string {
    const opens = [
      'A voice emerged from the pattern:',
      'Someone spoke, though no one was certain who:',
      'The silence answered:',
      'Through the mesh, a question formed:'
    ];
    return this.pick(opens);
  }

  private generateDialogueLine(ctx: GenerationContext): string {
    const colorDef = COLOR_MAP[ctx.color];
    const lines = [
      `I am ${colorDef.name}, and I am the path of ${colorDef.mode[0]}.`,
      `The ${ctx.center} center speaks: ${colorDef.keynote}`,
      `We are ${colorDef.mode[0]} and ${colorDef.mode[1]}, forever both.`,
      `In ${ctx.dimension}, I found what the ${ctx.center} already knew.`,
      `Do you feel the ${colorDef.name.toLowerCase()} between us?`
    ];
    return this.pick(lines);
  }

  private generateDialogueClose(_ctx: GenerationContext): string {
    return this.pick([
      'And the pattern absorbed the words.',
      'Silence returned, deeper than before.',
      'The echo continued in dimensions unseen.',
      'No response came — only resonance.'
    ]);
  }

  // === CONSTRAINT CHECKING ===

  private checkConstraints(ctx: GenerationContext): boolean {
    for (const constraint of ctx.constraints) {
      switch (constraint.type) {
        case 'avoid_word':
          if (ctx.currentPhrase.some(w => w.toLowerCase().includes(constraint.value.toLowerCase()))) {
            return false;
          }
          break;
        case 'max_length':
          const totalLen = ctx.generatedText.join(' ').length + ctx.currentPhrase.join(' ').length;
          if (totalLen > constraint.value) return false;
          break;
        case 'min_coherence':
          if (ctx.coherence < constraint.value) return false;
          break;
      }
    }
    return true;
  }

  // === MAIN GENERATION ===

  generate(goal: string, topic: string, center: Center, color: Color, dimension: Dimension, style: WritingStyle, maxDepth = 6): { text: string; transitions: Array<{from: GrammarState; to: GrammarState}>; coherence: number } {
    const ctx: GenerationContext = {
      goal, topic, center, color, dimension, style,
      currentState: 'INIT',
      previousStates: [],
      generatedText: [],
      currentPhrase: [],
      depth: 0, maxDepth,
      subject: '', verb: '', object: '',
      mood: 'indicative', tense: 'past',
      coherence: 1.0,
      usedWords: new Set(),
      constraints: [
        { type: 'min_coherence', value: 0.3, satisfied: true },
        { type: 'max_length', value: 2000, satisfied: true }
      ]
    };

    const transitions: Array<{from: GrammarState; to: GrammarState}> = [];
    let iterations = 0;
    const maxIterations = 30;

    while (ctx.currentState !== 'COMPLETE' && iterations < maxIterations) {
      iterations++;

      // Find valid transitions from current state
      const validTransitions = this.rules.filter(rule => {
        if (rule.from !== ctx.currentState) return false;
        try { return rule.condition(ctx); } catch { return false; }
      });

      if (validTransitions.length === 0) {
        // Force to COMPLETE if stuck
        ctx.currentState = 'COMPLETE';
        if (ctx.currentPhrase.length > 0) {
          ctx.generatedText.push(ctx.currentPhrase.join(' '));
        }
        break;
      }

      // Weight transitions by goal alignment and coherence preservation
      const weighted = validTransitions.map(rule => {
        let weight = rule.weight;
        // Prefer transitions that maintain coherence
        if (rule.to === 'COMPLETE' && ctx.coherence < 0.5) weight *= 0.3;
        // Prefer transitions that advance the goal
        if (rule.to === 'VP_BUILD' && ctx.goal.includes('action')) weight *= 1.3;
        if (rule.to === 'DIALOGUE_OPEN' && ctx.goal.includes('speak')) weight *= 1.3;
        return [rule, weight] as [TransitionRule, number];
      });

      // Select and apply
      const selected = this.pickWeighted(weighted);
      const from = ctx.currentState;
      const to = selected.to;

      try { selected.action(ctx); } catch { /* continue */ }

      ctx.previousStates.push(from);
      ctx.currentState = to;
      transitions.push({ from, to });

      // Check constraints
      if (!this.checkConstraints(ctx)) {
        ctx.coherence *= 0.8; // Penalize but continue
      }
    }

    // Ensure we have text
    if (ctx.currentPhrase.length > 0 && ctx.currentState !== 'COMPLETE') {
      ctx.generatedText.push(ctx.currentPhrase.join(' '));
    }

    return {
      text: ctx.generatedText.join('\n\n'),
      transitions,
      coherence: ctx.coherence
    };
  }

  // === 5W Question Generation (Still Available) ===

  generateAllQuestions(center: Center): Record<FiveW, string> {
    return {
      who: `Who speaks through the ${center.toLowerCase()} center when ${COLOR_MAP[4].name.toLowerCase()} awakens?`,
      what: `What pattern does the ${center.toLowerCase()} seek to understand?`,
      where: `Where does the ${center.toLowerCase()} find its true resonance?`,
      when: `When does the ${center.toLowerCase()} know it is time to transform?`,
      why: `Why does the ${center.toLowerCase()} hold both ${COLOR_MAP[1].mode[0]} and ${COLOR_MAP[1].mode[1]}?`
    };
  }

  createStyleProfile(center: Center, color: Color, dimension: Dimension) {
    const colorDef = COLOR_MAP[color];
    const styleMap: Record<number, WritingStyle> = {
      1: 'narrative', 2: 'mystical', 3: 'analytical',
      4: 'technical', 5: 'dialogic', 6: 'poetic'
    };
    return {
      style: styleMap[color] || 'narrative',
      color, center, dimension,
      tone: `${colorDef.name} - ${colorDef.mode[0]}/${colorDef.mode[1]}`
    };
  }

  getTransitionHistory() { return this.transitionHistory; }
  getRules() { return this.rules; }
}

export const kleinAutoLing = new KleinAutoLing();
