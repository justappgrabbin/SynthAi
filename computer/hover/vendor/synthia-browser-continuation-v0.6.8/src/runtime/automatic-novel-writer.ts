/**
 * Automatic Novel Writer
 * Based on Sheldon Klein et al. "Automatic Novel Writing" (1973)
 * UWCS Technical Report No. 186
 * 
 * Generates coherent narrative using deep structure rules,
 * Monte Carlo exploration, DISEMINER inference, character tracking,
 * and thematic progression.
 */

import { MonteCarloGrammarEngine, StyleProfile, ParseNode } from './monte-carlo-grammar-engine';
import { DISEMINER, InferenceResult } from './disseminer';

export interface Character {
  name: string;
  traits: string[];
  goals: string[];
  relationships: Map<string, string>;
  state: CharacterState;
  arc: CharacterArc;
}

export interface CharacterState {
  location: string;
  emotionalState: string;
  possessions: string[];
  knowledge: string[];
  health: number;
}

export interface CharacterArc {
  stage: 'ordinary' | 'call' | 'threshold' | 'trials' | 'crisis' | 'transformation' | 'return';
  progress: number;
  transformations: { from: string; to: string; trigger: string }[];
}

export interface PlotPoint {
  type: 'exposition' | 'inciting' | 'rising' | 'climax' | 'falling' | 'resolution';
  characters: string[];
  action: string;
  setting: string;
  emotionalValence: number;
  thematicWeight: number;
  deepStructure: DeepStructureRule;
}

export interface DeepStructureRule {
  id: string;
  pattern: string;
  semanticRoles: SemanticRole[];
  preconditions: string[];
  postconditions: string[];
  probability: number;
  narrativeFunction: string;
}

export interface SemanticRole {
  role: 'AGENT' | 'PATIENT' | 'RECIPIENT' | 'INSTRUMENT' | 'LOCATION' | 'TIME' | 'MANNER' | 'CAUSE';
  constraints: string[];
  optional: boolean;
}

export interface Scene {
  id: number;
  setting: string;
  time: string;
  characters: Character[];
  plotPoints: PlotPoint[];
  mood: string;
  prose: string[];
  thematicElements: string[];
}

export interface Novel {
  title: string;
  genre: string;
  theme: string;
  scenes: Scene[];
  characters: Character[];
  wordCount: number;
  summary: string;
}

export interface NarrativeConfig {
  genre: string;
  theme: string;
  numScenes: number;
  targetWordCount: number;
  styleProfile: StyleProfile;
  protagonistTraits: string[];
  setting: string;
  tone: 'heroic' | 'tragic' | 'comic' | 'mysterious' | 'philosophical';
}

export class AutomaticNovelWriter {
  private grammar: MonteCarloGrammarEngine;
  private disseminer: DISEMINER;
  private config: NarrativeConfig;
  private characters: Map<string, Character> = new Map();
  private scenes: Scene[] = [];
  private deepStructureRules: DeepStructureRule[] = [];
  private plotArc: PlotPoint[] = [];
  private thematicProgression: string[] = [];
  private rng: () => number;

  constructor(config: NarrativeConfig) {
    this.config = config;
    this.grammar = new MonteCarloGrammarEngine(config.styleProfile);
    this.disseminer = new DISEMINER({ contextWindow: 7, vectorDimension: 128 });
    this.rng = this.createSeededRNG(42);
    this.initializeDeepStructureRules();
    this.initializeThematicProgression();
    this.createCharacters();
  }

  private createSeededRNG(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  private initializeDeepStructureRules(): void {
    this.deepStructureRules = [
      {
        id: 'DS-QUEST',
        pattern: 'AGENT + DESIRE + OBSTACLE + STRUGGLE + RESOLUTION',
        semanticRoles: [
          { role: 'AGENT', constraints: ['animate', 'intentional'], optional: false },
          { role: 'PATIENT', constraints: ['any'], optional: false },
          { role: 'INSTRUMENT', constraints: ['tool', 'knowledge'], optional: true },
          { role: 'LOCATION', constraints: ['place'], optional: true }
        ],
        preconditions: ['AGENT has goal', 'AGENT lacks PATIENT'],
        postconditions: ['AGENT obtains or fails to obtain PATIENT'],
        probability: 0.25,
        narrativeFunction: 'quest'
      },
      {
        id: 'DS-TRANSFORMATION',
        pattern: 'AGENT + STATE_A + CATALYST + STATE_B + CONSEQUENCE',
        semanticRoles: [
          { role: 'AGENT', constraints: ['animate'], optional: false },
          { role: 'CAUSE', constraints: ['event', 'force'], optional: false },
          { role: 'PATIENT', constraints: ['any'], optional: true }
        ],
        preconditions: ['AGENT is in STATE_A'],
        postconditions: ['AGENT is in STATE_B'],
        probability: 0.20,
        narrativeFunction: 'transformation'
      },
      {
        id: 'DS-CONFLICT',
        pattern: 'AGENT_A + AGENT_B + OPPOSITION + ESCALATION + OUTCOME',
        semanticRoles: [
          { role: 'AGENT', constraints: ['animate'], optional: false },
          { role: 'PATIENT', constraints: ['animate'], optional: false },
          { role: 'INSTRUMENT', constraints: ['weapon', 'words'], optional: true }
        ],
        preconditions: ['AGENT_A and AGENT_B have incompatible goals'],
        postconditions: ['One prevails, compromise, or mutual destruction'],
        probability: 0.20,
        narrativeFunction: 'conflict'
      },
      {
        id: 'DS-DISCOVERY',
        pattern: 'AGENT + UNKNOWN + SEARCH + REVELATION + CHANGE',
        semanticRoles: [
          { role: 'AGENT', constraints: ['animate', 'curious'], optional: false },
          { role: 'PATIENT', constraints: ['hidden', 'secret'], optional: false },
          { role: 'LOCATION', constraints: ['mysterious'], optional: true }
        ],
        preconditions: ['AGENT lacks knowledge of PATIENT'],
        postconditions: ['AGENT knows PATIENT, world changes'],
        probability: 0.15,
        narrativeFunction: 'discovery'
      },
      {
        id: 'DS-SACRIFICE',
        pattern: 'AGENT + POSSESSION + NEED + CHOICE + LOSS/GAIN',
        semanticRoles: [
          { role: 'AGENT', constraints: ['animate', 'moral'], optional: false },
          { role: 'PATIENT', constraints: ['valuable'], optional: false },
          { role: 'RECIPIENT', constraints: ['animate'], optional: true }
        ],
        preconditions: ['AGENT values PATIENT', 'Greater good requires loss'],
        postconditions: ['AGENT loses PATIENT, gains meaning'],
        probability: 0.10,
        narrativeFunction: 'sacrifice'
      },
      {
        id: 'DS-REUNION',
        pattern: 'AGENT + SEPARATION + SEARCH + ENCOUNTER + RESTORATION',
        semanticRoles: [
          { role: 'AGENT', constraints: ['animate', 'attached'], optional: false },
          { role: 'PATIENT', constraints: ['animate'], optional: false },
          { role: 'LOCATION', constraints: ['any'], optional: true }
        ],
        preconditions: ['AGENT and PATIENT are separated'],
        postconditions: ['AGENT and PATIENT reunited or accept separation'],
        probability: 0.10,
        narrativeFunction: 'reunion'
      }
    ];
  }

  private initializeThematicProgression(): void {
    const themeMap: { [key: string]: string[] } = {
      'heroic': ['innocence', 'trial', 'doubt', 'perseverance', 'sacrifice', 'triumph', 'wisdom'],
      'tragic': ['hubris', 'warning', 'temptation', 'fall', 'suffering', 'recognition', 'catharsis'],
      'comic': ['confusion', 'misunderstanding', 'escalation', 'absurdity', 'revelation', 'harmony'],
      'mysterious': ['enigma', 'clue', 'false-lead', 'pattern', 'breakthrough', 'truth', 'consequence'],
      'philosophical': ['question', 'exploration', 'paradox', 'insight', 'doubt', 'synthesis', 'wonder']
    };
    this.thematicProgression = themeMap[this.config.tone] || themeMap['heroic'];
  }

  private createCharacters(): void {
    const protagonist: Character = {
      name: this.config.protagonistTraits[0] || 'Aldric',
      traits: [...this.config.protagonistTraits.slice(1), 'determined', 'complex'],
      goals: ['discover truth', 'protect what matters', 'find meaning'],
      relationships: new Map(),
      state: {
        location: this.config.setting,
        emotionalState: 'restless',
        possessions: ['a worn journal', 'a silver pendant'],
        knowledge: ['the old legends', 'family secrets'],
        health: 1.0
      },
      arc: {
        stage: 'ordinary',
        progress: 0,
        transformations: []
      }
    };
    this.characters.set(protagonist.name, protagonist);

    const supportingChars = this.generateSupportingCast();
    for (const char of supportingChars) {
      this.characters.set(char.name, char);
      protagonist.relationships.set(char.name, this.determineRelationship(protagonist, char));
      char.relationships.set(protagonist.name, this.determineRelationship(char, protagonist));
    }
  }

  private generateSupportingCast(): Character[] {
    const cast: Character[] = [];
    const archetypes = this.getArchetypesForGenre();
    for (let i = 0; i < Math.min(4, archetypes.length); i++) {
      const archetype = archetypes[i];
      cast.push({
        name: this.generateName(archetype),
        traits: archetype.traits,
        goals: archetype.goals,
        relationships: new Map(),
        state: {
          location: this.config.setting,
          emotionalState: archetype.initialState,
          possessions: archetype.possessions,
          knowledge: archetype.knowledge,
          health: 1.0
        },
        arc: {
          stage: 'ordinary',
          progress: this.rng() * 0.3,
          transformations: []
        }
      });
    }
    return cast;
  }

  private getArchetypesForGenre(): any[] {
    const archetypeMap: { [key: string]: any[] } = {
      'heroic': [
        { traits: ['wise', 'mysterious'], goals: ['guide the hero'], initialState: 'watchful', possessions: ['ancient map'], knowledge: ['forgotten lore'], nameType: 'mentor' },
        { traits: ['loyal', 'brave'], goals: ['protect friend'], initialState: 'steadfast', possessions: ['trusted blade'], knowledge: ['battle tactics'], nameType: 'companion' },
        { traits: ['cunning', 'ambitious'], goals: ['seize power'], initialState: 'scheming', possessions: ['poison ring'], knowledge: ['political secrets'], nameType: 'antagonist' },
        { traits: ['gentle', 'perceptive'], goals: ['heal wounds'], initialState: 'hopeful', possessions: ['healing herbs'], knowledge: ['medicine'], nameType: 'ally' }
      ],
      'tragic': [
        { traits: ['proud', 'brilliant'], goals: ['prove superiority'], initialState: 'confident', possessions: ['family crest'], knowledge: ['ancestry'], nameType: 'protagonist-foil' },
        { traits: ['loving', 'fearful'], goals: ['prevent disaster'], initialState: 'anxious', possessions: ['warning letter'], knowledge: ['prophecy'], nameType: 'cassandra' },
        { traits: ['corrupt', 'charming'], goals: ['destroy protagonist'], initialState: 'smiling', possessions: ['forged document'], knowledge: ['blackmail'], nameType: 'villain' }
      ],
      'mysterious': [
        { traits: ['secretive', 'knowledgeable'], goals: ['hide truth'], initialState: 'guarded', possessions: ['locked diary'], knowledge: ['the secret'], nameType: 'keeper' },
        { traits: ['observant', 'skeptical'], goals: ['solve mystery'], initialState: 'curious', possessions: ['magnifying glass'], knowledge: ['deduction'], nameType: 'detective' },
        { traits: ['unstable', 'visionary'], goals: ['reveal all'], initialState: 'frantic', possessions: ['fragmented notes'], knowledge: ['hidden connections'], nameType: 'madman' }
      ]
    };
    return archetypeMap[this.config.genre] || archetypeMap['heroic'];
  }

  private generateName(archetype: any): string {
    const names: { [key: string]: string[] } = {
      'mentor': ['Orion', 'Elias', 'Thaddeus', 'Solomon'],
      'companion': ['Kael', 'Rowan', 'Finn', 'Doran'],
      'antagonist': ['Vex', 'Malachar', 'Severin', 'Draegon'],
      'ally': ['Lyra', 'Mira', 'Seren', 'Aurelia'],
      'protagonist-foil': ['Cassius', 'Lucian', 'Valerius', 'Maximus'],
      'cassandra': ['Cassandra', 'Elara', 'Isolde', 'Ophelia'],
      'villain': ['Vex', 'Morvain', 'Sable', 'Nyx'],
      'keeper': ['Archivist', 'Curator', 'Warden', 'Sentinel'],
      'detective': ['Sheridan', 'Quincy', 'Hawthorne', 'Pryce'],
      'madman': ['Echo', 'Fragment', 'Whisper', 'Riddle']
    };
    const pool = names[archetype.nameType] || ['Aeon', 'Cipher', 'Nova', 'Zenith'];
    return pool[Math.floor(this.rng() * pool.length)];
  }

  private determineRelationship(char1: Character, char2: Character): string {
    const relationships = ['ally', 'rival', 'mentor', 'student', 'family', 'stranger', 'enemy'];
    const scores = relationships.map(r => {
      if (r === 'ally' && char1.traits.some(t => char2.traits.includes(t))) return 0.4;
      if (r === 'rival' && char1.goals.some(g => char2.goals.includes(g))) return 0.3;
      if (r === 'enemy' && char1.traits.includes('ambitious') && char2.traits.includes('ambitious')) return 0.2;
      return 0.1;
    });
    const total = scores.reduce((a, b) => a + b, 0);
    const rand = this.rng() * total;
    let cumulative = 0;
    for (let i = 0; i < scores.length; i++) {
      cumulative += scores[i];
      if (rand <= cumulative) return relationships[i];
    }
    return 'stranger';
  }

  public generateNovel(): Novel {
    this.seedDisseminer();
    this.generatePlotArc();

    for (let i = 0; i < this.config.numScenes; i++) {
      const scene = this.generateScene(i);
      this.scenes.push(scene);
      this.updateCharacterStates(scene);
      this.disseminer.ingest(scene.prose.join(' '), `scene-${i}`);
    }

    const totalWords = this.scenes.reduce((sum, s) => sum + s.prose.join(' ').split(/\s+/).length, 0);

    return {
      title: this.generateTitle(),
      genre: this.config.genre,
      theme: this.config.theme,
      scenes: this.scenes,
      characters: Array.from(this.characters.values()),
      wordCount: totalWords,
      summary: this.generateSummary()
    };
  }

  private seedDisseminer(): void {
    const seedTexts = this.getSeedCorpus();
    for (const text of seedTexts) {
      this.disseminer.ingest(text, 'seed-corpus');
    }
  }

  private getSeedCorpus(): string[] {
    const corpora: { [key: string]: string[] } = {
      'heroic': [
        'The ancient king stood upon the mountain and gazed across the valley.',
        'A sword of light shimmered in the darkness, waiting for the hand that was worthy.',
        'The warrior raised her shield against the storm and spoke words that none had heard before.',
        'In the hall of echoes, truth revealed itself to those who dared to listen.',
        'The journey began not with a step but with the decision to no longer remain still.'
      ],
      'tragic': [
        'The crown weighed heavy upon a brow that had once been light with laughter.',
        'In the mirror, she saw not her face but the face of all she had become.',
        'The letter arrived too late, its words dissolving into the rain.',
        'He stood at the edge of everything he had built and understood the cost at last.',
        'The garden bloomed, but the one who planted the seeds would never see it.'
      ],
      'mysterious': [
        'The door had always been there, but no one had noticed the keyhole until now.',
        'Three symbols, repeated in every ancient text, yet never translated the same way twice.',
        'She woke to find the room rearranged, though no one had entered.',
        'The pattern emerged only when the pages were held to candlelight.',
        'In the silence between heartbeats, the answer waited.'
      ],
      'philosophical': [
        'The question was not whether the mountain could be moved, but why it had been placed there.',
        'In the space between two thoughts, the self observed itself and found no boundary.',
        'Time folded upon itself like a letter written but never sent.',
        'The mirror reflected not what was, but what the observer was prepared to see.',
        'Meaning, like water, took the shape of the vessel that held it.'
      ]
    };
    return corpora[this.config.genre] || corpora['heroic'];
  }

  private generatePlotArc(): void {
    const stages = ['exposition', 'inciting', 'rising', 'climax', 'falling', 'resolution'];
    for (const stage of stages) {
      const rule = this.sampleDeepStructureRule();
      const chars = this.selectCharactersForPlot(stage);
      const plotPoint: PlotPoint = {
        type: stage as any,
        characters: chars.map(c => c.name),
        action: this.generateActionFromRule(rule, chars),
        setting: this.selectSetting(stage),
        emotionalValence: this.calculateEmotionalValence(stage),
        thematicWeight: this.getThematicWeight(stage),
        deepStructure: rule
      };
      this.plotArc.push(plotPoint);
    }
  }

  private sampleDeepStructureRule(): DeepStructureRule {
    const totalProb = this.deepStructureRules.reduce((a, r) => a + r.probability, 0);
    const rand = this.rng() * totalProb;
    let cumulative = 0;
    for (const rule of this.deepStructureRules) {
      cumulative += rule.probability;
      if (rand <= cumulative) return rule;
    }
    return this.deepStructureRules[0];
  }

  private selectCharactersForPlot(stage: string): Character[] {
    const chars = Array.from(this.characters.values());
    const protagonist = chars[0];
    if (stage === 'exposition') return [protagonist];
    if (stage === 'inciting') return [protagonist, chars[1]];
    if (stage === 'climax') return chars.slice(0, Math.min(4, chars.length));
    return chars.slice(0, Math.min(3, chars.length));
  }

  private generateActionFromRule(rule: DeepStructureRule, chars: Character[]): string {
    const actions: { [key: string]: string[] } = {
      'quest': ['sought', 'journeyed', 'searched', 'hunted', 'pursued'],
      'transformation': ['changed', 'became', 'transformed', 'awakened', 'evolved'],
      'conflict': ['confronted', 'challenged', 'opposed', 'battled', 'defied'],
      'discovery': ['found', 'uncovered', 'revealed', 'discerned', 'recognized'],
      'sacrifice': ['yielded', 'surrendered', 'offered', 'gave', 'relinquished'],
      'reunion': ['returned', 'found', 'embraced', 'restored', 'reclaimed']
    };
    const verbPool = actions[rule.narrativeFunction] || ['acted', 'moved', 'spoke'];
    return verbPool[Math.floor(this.rng() * verbPool.length)];
  }

  private selectSetting(stage: string): string {
    const settings = [
      this.config.setting,
      'the ancient library',
      'the threshold between worlds',
      'the chamber of echoes',
      'the garden at twilight',
      'the tower of silence',
      'the bridge of crossings',
      'the mirror hall'
    ];
    return settings[Math.floor(this.rng() * settings.length)];
  }

  private calculateEmotionalValence(stage: string): number {
    const valences: { [key: string]: number } = {
      'exposition': 0.1, 'inciting': -0.2, 'rising': 0.3,
      'climax': 0.8, 'falling': -0.3, 'resolution': 0.5
    };
    return valences[stage] || 0;
  }

  private getThematicWeight(stage: string): number {
    const weights: { [key: string]: number } = {
      'exposition': 0.2, 'inciting': 0.4, 'rising': 0.6,
      'climax': 1.0, 'falling': 0.7, 'resolution': 0.8
    };
    return weights[stage] || 0.5;
  }

  private generateScene(sceneIndex: number): Scene {
    const plotPoint = this.plotArc[Math.min(sceneIndex, this.plotArc.length - 1)];
    const theme = this.thematicProgression[Math.min(sceneIndex, this.thematicProgression.length - 1)];
    const sceneChars = plotPoint.characters
      .map(name => this.characters.get(name))
      .filter(c => c !== undefined) as Character[];

    const prose: string[] = [];
    prose.push(this.generateSceneOpening(plotPoint, sceneChars));
    for (let i = 0; i < 3 + Math.floor(this.rng() * 3); i++) {
      const sentence = this.generateNarrativeSentence(sceneChars, plotPoint, theme);
      prose.push(sentence);
    }
    prose.push(this.generateSceneClosing(plotPoint, sceneChars));

    const sceneText = prose.join(' ');
    const inference = this.disseminer.infer(sceneText);
    if (inference.confidence < 0.5) {
      for (let i = 1; i < prose.length - 1; i++) {
        const sentInference = this.disseminer.infer(prose[i]);
        if (sentInference.confidence < 0.4) {
          prose[i] = this.generateNarrativeSentence(sceneChars, plotPoint, theme);
        }
      }
    }

    return {
      id: sceneIndex,
      setting: plotPoint.setting,
      time: this.generateTimeOfDay(),
      characters: sceneChars,
      plotPoints: [plotPoint],
      mood: this.calculateMood(plotPoint),
      prose,
      thematicElements: [theme]
    };
  }

  private generateSceneOpening(plotPoint: PlotPoint, chars: Character[]): string {
    const openers = [
      `In ${plotPoint.setting}, ${chars[0]?.name || 'the figure'} stood in silence.`,
      `The ${this.getAtmosphereWord()} air of ${plotPoint.setting} carried ${chars[0]?.name || 'one'} forward.`,
      `${chars[0]?.name || 'Someone'} arrived at ${plotPoint.setting} with ${this.getEmotionalState(chars[0])} in their eyes.`,
      `It was in ${plotPoint.setting} that ${chars[0]?.name || 'the traveler'} first understood the weight of ${this.config.theme}.`,
      `${plotPoint.setting} held its breath as ${chars.map(c => c.name).join(' and ')} gathered.`
    ];
    return openers[Math.floor(this.rng() * openers.length)];
  }

  private generateNarrativeSentence(chars: Character[], plotPoint: PlotPoint, theme: string): string {
    const baseSentences = this.grammar.generate(1);
    let sentence = baseSentences[0];
    sentence = this.injectCharacters(sentence, chars);
    sentence = this.injectTheme(sentence, theme);
    sentence = this.injectPlot(sentence, plotPoint);
    const inference = this.disseminer.infer(sentence);
    if (inference.confidence < 0.3) {
      const alt = this.grammar.generate(1)[0];
      sentence = this.injectCharacters(alt, chars);
      sentence = this.injectTheme(sentence, theme);
    }
    return sentence;
  }

  private injectCharacters(sentence: string, chars: Character[]): string {
    const charNames = chars.map(c => c.name);
    const pronouns = ['he', 'she', 'they', 'the man', 'the woman', 'the figure'];
    for (const pronoun of pronouns) {
      if (sentence.toLowerCase().includes(pronoun)) {
        const replacement = charNames[Math.floor(this.rng() * charNames.length)];
        sentence = sentence.replace(new RegExp(`\\b${pronoun}\\b`, 'gi'), replacement);
        break;
      }
    }
    return sentence;
  }

  private injectTheme(sentence: string, theme: string): string {
    const themeWords: { [key: string]: string[] } = {
      'innocence': ['light', 'dawn', 'unmarked', 'pure', 'beginning'],
      'trial': ['test', 'fire', 'challenge', 'forge', 'prove'],
      'doubt': ['shadow', 'question', 'uncertainty', 'hesitation', 'fog'],
      'perseverance': ['endure', 'continue', 'persist', 'remain', 'hold'],
      'sacrifice': ['yield', 'give', 'surrender', 'offer', 'release'],
      'triumph': ['victory', 'ascend', 'overcome', 'rise', 'shine'],
      'wisdom': ['know', 'understand', 'see', 'discern', 'recognize'],
      'hubris': ['pride', 'fall', 'tower', 'crash', 'shatter'],
      'enigma': ['mystery', 'puzzle', 'secret', 'riddle', 'hidden'],
      'question': ['wonder', 'ask', 'seek', 'ponder', 'explore']
    };
    const words = themeWords[theme] || ['truth', 'meaning', 'path'];
    const themeWord = words[Math.floor(this.rng() * words.length)];
    if (this.rng() > 0.5 && !sentence.toLowerCase().includes(themeWord)) {
      const injectors = [
        `, carrying the ${themeWord} of ${this.config.theme}`,
        `, as if the ${themeWord} itself watched`,
        `, and in that moment, the ${themeWord} became clear`,
        `, bound by the ${themeWord} that ${this.config.theme} demands`
      ];
      const injector = injectors[Math.floor(this.rng() * injectors.length)];
      const lastPunct = sentence.match(/[.!?]$/);
      if (lastPunct) {
        sentence = sentence.slice(0, -1) + injector + lastPunct[0];
      }
    }
    return sentence;
  }

  private injectPlot(sentence: string, plotPoint: PlotPoint): string {
    const plotWords = ['journey', 'search', 'discover', 'confront', 'transform', 'sacrifice'];
    const plotWord = plotWords[Math.floor(this.rng() * plotWords.length)];
    if (this.rng() > 0.7 && !sentence.toLowerCase().includes(plotWord)) {
      sentence = sentence.replace(/\.$/, `, driven by the need to ${plotWord}.`);
    }
    return sentence;
  }

  private generateSceneClosing(plotPoint: PlotPoint, chars: Character[]): string {
    const closings = [
      `And so ${chars[0]?.name || 'the figure'} stood at the threshold of what came next.`,
      `The ${this.config.theme} would not be denied, not now, not ever.`,
      `${chars[0]?.name || 'One'} understood then that the ${plotPoint.type} had only begun.`,
      `In the silence that followed, ${this.config.theme} spoke louder than words.`,
      `The path forward was clear, though none could say where it led.`
    ];
    return closings[Math.floor(this.rng() * closings.length)];
  }

  private getAtmosphereWord(): string {
    const words = ['heavy', 'thin', 'electric', 'still', 'ancient', 'fragile', 'resonant'];
    return words[Math.floor(this.rng() * words.length)];
  }

  private getEmotionalState(char: Character | undefined): string {
    if (!char) return 'uncertainty';
    const states = ['determination', 'sorrow', 'hope', 'fear', 'wonder', 'resolve'];
    return states[Math.floor(this.rng() * states.length)];
  }

  private generateTimeOfDay(): string {
    const times = ['dawn', 'morning', 'noon', 'twilight', 'dusk', 'midnight', 'the hour between'];
    return times[Math.floor(this.rng() * times.length)];
  }

  private calculateMood(plotPoint: PlotPoint): string {
    if (plotPoint.emotionalValence > 0.5) return 'triumphant';
    if (plotPoint.emotionalValence > 0) return 'hopeful';
    if (plotPoint.emotionalValence > -0.3) return 'tense';
    if (plotPoint.emotionalValence > -0.6) return 'somber';
    return 'tragic';
  }

  private updateCharacterStates(scene: Scene): void {
    for (const char of scene.characters) {
      const moodEffects: { [key: string]: string } = {
        'triumphant': 'exalted', 'hopeful': 'inspired', 'tense': 'anxious',
        'somber': 'melancholy', 'tragic': 'broken'
      };
      char.state.emotionalState = moodEffects[scene.mood] || 'changed';
      char.arc.progress += 0.15;
      if (char.arc.progress > 1) char.arc.progress = 1;
      this.updateArcStage(char);
    }
  }

  private updateArcStage(char: Character): void {
    const stages: CharacterArc['stage'][] = ['ordinary', 'call', 'threshold', 'trials', 'crisis', 'transformation', 'return'];
    const currentIndex = stages.indexOf(char.arc.stage);
    const targetIndex = Math.floor(char.arc.progress * (stages.length - 1));
    if (targetIndex > currentIndex) {
      const oldStage = char.arc.stage;
      char.arc.stage = stages[targetIndex];
      char.arc.transformations.push({ from: oldStage, to: char.arc.stage, trigger: `scene-${this.scenes.length - 1}` });
    }
  }

  private generateTitle(): string {
    const formats = [
      `The ${this.capitalize(this.config.theme)} of ${this.getRandomName()}`,
      `${this.capitalize(this.config.theme)} and the ${this.getRandomNoun()}`,
      `When ${this.capitalize(this.config.theme)} ${this.getRandomVerb()}`,
      `The ${this.getRandomAdjective()} ${this.getRandomNoun()}`,
      `${this.getRandomName()}'s ${this.capitalize(this.config.theme)}`
    ];
    return formats[Math.floor(this.rng() * formats.length)];
  }

  private generateSummary(): string {
    const protagonist = Array.from(this.characters.values())[0];
    return `A ${this.config.genre} narrative following ${protagonist.name}, ` +
           `who must confront ${this.config.theme} in ${this.config.setting}. ` +
           `Through ${this.config.numScenes} scenes of ${this.config.tone} progression, ` +
           `${protagonist.name} transforms from ${protagonist.arc.stage} to ${protagonist.arc.transformations[protagonist.arc.transformations.length - 1]?.to || 'self-knowledge'}.`;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private getRandomName(): string {
    const names = ['Aldric', 'Seraphina', 'Thorne', 'Elena', 'Kael', 'Lyra', 'Orion', 'Isolde'];
    return names[Math.floor(this.rng() * names.length)];
  }

  private getRandomNoun(): string {
    const nouns = ['Mirror', 'Sword', 'Garden', 'Tower', 'Path', 'Flame', 'Silence', 'Echo'];
    return nouns[Math.floor(this.rng() * nouns.length)];
  }

  private getRandomVerb(): string {
    const verbs = ['Awakens', 'Falls', 'Rises', 'Returns', 'Speaks', 'Waits', 'Burns'];
    return verbs[Math.floor(this.rng() * verbs.length)];
  }

  private getRandomAdjective(): string {
    const adjs = ['Silent', 'Eternal', 'Broken', 'Hidden', 'Ancient', 'Golden', 'Last'];
    return adjs[Math.floor(this.rng() * adjs.length)];
  }

  public exportToMarkdown(novel: Novel): string {
    let md = `# ${novel.title}\n\n`;
    md += `*${novel.genre} — ${novel.theme}*\n\n`;
    md += `## Summary\n\n${novel.summary}\n\n`;
    md += `## Characters\n\n`;
    for (const char of novel.characters) {
      md += `### ${char.name}\n`;
      md += `- **Traits:** ${char.traits.join(', ')}\n`;
      md += `- **Goals:** ${char.goals.join(', ')}\n`;
      md += `- **Arc:** ${char.arc.stage} (progress: ${(char.arc.progress * 100).toFixed(0)}%)\n`;
      md += `- **State:** ${char.state.emotionalState} in ${char.state.location}\n\n`;
    }
    md += `## Scenes\n\n`;
    for (const scene of novel.scenes) {
      md += `### Scene ${scene.id + 1}: ${scene.setting} (${scene.time})\n`;
      md += `*Mood: ${scene.mood} | Theme: ${scene.thematicElements.join(', ')}*\n\n`;
      for (const paragraph of scene.prose) {
        md += `${paragraph}\n\n`;
      }
    }
    md += `---\n\n`;
    md += `*Word count: ${novel.wordCount}*\n`;
    return md;
  }

  public exportToJSON(novel: Novel): string {
    return JSON.stringify(novel, (key, value) => {
      if (value instanceof Map) return Object.fromEntries(value);
      return value;
    }, 2);
  }
}

export type { Character, CharacterState, CharacterArc, PlotPoint, DeepStructureRule, SemanticRole, Scene, Novel, NarrativeConfig };
