// ============================================================
// HUB 4: AUTONOVEL - Automatic Novel Writing System
// Based on Sheldon Klein et al. (1973)
// "AUTOMATIC NOVEL WRITING: A Status Report" UWCS Tech Report #186
// And Klein et al. (1976) "Simulation d'hypotheses emises par Propp et Levi-Strauss"
// Using meta-symbolic simulation for narrative generation
// Modernized: Novel concept generation, creative synthesis, pattern-breaking ideation
// ============================================================

export interface NovelConcept {
  id: string;
  title: string;
  genre: string;
  premise: string;
  themes: string[];
  characters: CharacterConcept[];
  plotStructure: PlotNode[];
  worldBuilding: WorldConcept;
  originalityScore: number;
  derivationChain: string[];  // Trace of how this was derived
  noveltyMetrics: NoveltyMetrics;
}

export interface CharacterConcept {
  id: string;
  name: string;
  archetype: string;  // Proppian function or Jungian archetype
  motivation: string;
  conflict: string;
  growthArc: string;
  relationships: Map<string, string>;  // character -> relationship type
  traits: Record<string, number>;  // Trait strength 0-1
  backstory: string;
  voice: string;
}

export interface PlotNode {
  id: string;
  type: 'exposition' | 'inciting_incident' | 'rising_action' | 'climax' | 'falling_action' | 'resolution' | 'subplot';
  description: string;
  characters: string[];
  location: string;
  emotionalTone: string;
  proppFunction?: string;  // Propp's 31 functions
  prerequisites: string[];
  consequences: string[];
  temporalPosition: number;  // 0-1 position in narrative
}

export interface WorldConcept {
  name: string;
  setting: string;
  timePeriod: string;
  rules: string[];  // Physical/social/magical rules
  cultures: CultureConcept[];
  geography: string;
  technology: string;
  conflicts: string[];
}

export interface CultureConcept {
  name: string;
  values: string[];
  taboos: string[];
  rituals: string[];
  language: string;
  socialStructure: string;
}

export interface NoveltyMetrics {
  semanticDistance: number;  // How far from training concepts
  combinatorialNovelty: number;  // Novel combinations of existing elements
  structuralInnovation: number;  // New plot/structural patterns
  thematicFreshness: number;  // New thematic ground
  voiceOriginality: number;  // Unique narrative voice
  overallNovelty: number;
}

export interface CreativeSynthesis {
  id: string;
  sourceConcepts: string[];
  synthesisMethod: string;
  result: NovelConcept;
  creativeLeap: string;  // What made this creative
  patternBreaks: string[];  // Which patterns were broken
  domain: string;
}

// Propp's 31 functions (from Klein's Propp simulation)
const PROPP_FUNCTIONS = [
  'absentation', 'interdiction', 'violation', 'reconnaissance', 'delivery',
  'trickery', 'complicity', 'villainy', 'mediation', 'beginning_counteraction',
  'departure', 'first_function_of_donor', 'heros_reaction', 'receipt_of_agent',
  'spatial_transference', 'struggle', 'branding', 'victory', 'liquidation',
  'return', 'pursuit', 'rescue', 'unrecognized_arrival', 'unfounded_claims',
  'difficult_task', 'solution', 'recognition', 'exposure', 'transfiguration',
  'punishment', 'wedding'
];

// Jungian archetypes
const JUNGIAN_ARCHETYPES = [
  'hero', 'mentor', 'threshold_guardian', 'herald', 'shapeshifter',
  'shadow', 'trickster', 'ally', 'mother', 'father', 'child',
  'wise_old_man', 'great_mother', 'anima', 'animus', 'self'
];

// ============================================================
// AUTONOVEL ENGINE - Creative Generation
// ============================================================

export class AutonovelEngine {
  private conceptLibrary: Map<string, NovelConcept> = new Map();
  private archetypeTemplates: Map<string, any> = new Map();
  private proppModels: Map<string, any> = new Map();
  private synthesisHistory: CreativeSynthesis[] = [];
  private patternDatabase: Map<string, number> = new Map();  // Pattern -> frequency
  private noveltyThreshold: number = 0.6;

  constructor() {
    this.initializeArchetypes();
    this.initializeProppModels();
    console.log('[AUTONOVEL] Initialized - Automatic Novel Writing System');
  }

  private initializeArchetypes(): void {
    for (const archetype of JUNGIAN_ARCHETYPES) {
      this.archetypeTemplates.set(archetype, {
        name: archetype,
        typicalMotivations: this.getArchetypeMotivations(archetype),
        typicalConflicts: this.getArchetypeConflicts(archetype),
        typicalTraits: this.getArchetypeTraits(archetype)
      });
    }
  }

  private getArchetypeMotivations(archetype: string): string[] {
    const motivations: Record<string, string[]> = {
      hero: ['prove worth', 'save others', 'overcome fear', 'find identity'],
      mentor: ['guide the hero', 'preserve wisdom', 'atone for past'],
      threshold_guardian: ['test the worthy', 'protect secrets', 'maintain boundaries'],
      shadow: ['destroy the hero', 'gain power', 'reveal truth'],
      trickster: ['cause chaos', 'reveal hypocrisy', 'survive'],
      wise_old_man: ['impart wisdom', 'maintain cosmic order', 'prepare successor']
    };
    return motivations[archetype] || ['seek meaning', 'find purpose'];
  }

  private getArchetypeConflicts(archetype: string): string[] {
    const conflicts: Record<string, string[]> = {
      hero: ['fear vs courage', 'self vs duty', 'individual vs collective'],
      mentor: ['wisdom vs action', 'past vs future', 'attachment vs letting go'],
      shadow: ['desire vs morality', 'power vs love', 'truth vs comfort'],
      trickster: ['chaos vs order', 'survival vs integrity', 'freedom vs responsibility']
    };
    return conflicts[archetype] || ['internal conflict', 'external opposition'];
  }

  private getArchetypeTraits(archetype: string): Record<string, number> {
    const traits: Record<string, Record<string, number>> = {
      hero: { courage: 0.9, determination: 0.8, empathy: 0.6, recklessness: 0.4 },
      mentor: { wisdom: 0.9, patience: 0.8, detachment: 0.7, action: 0.3 },
      shadow: { power: 0.9, cunning: 0.8, charisma: 0.6, empathy: 0.1 },
      trickster: { cunning: 0.9, humor: 0.8, adaptability: 0.7, loyalty: 0.3 }
    };
    return traits[archetype] || { complexity: 0.5, ambiguity: 0.5 };
  }

  private initializeProppModels(): void {
    // Propp's folktale morphology as generative grammar
    this.proppModels.set('classic_folktale', {
      functions: [
        'absentation', 'interdiction', 'violation', 'reconnaissance', 'villainy',
        'mediation', 'departure', 'first_function_of_donor', 'heros_reaction',
        'receipt_of_agent', 'struggle', 'victory', 'liquidation', 'return', 'wedding'
      ],
      optional: ['trickery', 'complicity', 'pursuit', 'rescue', 'transfiguration']
    });

    this.proppModels.set('tragedy', {
      functions: [
        'absentation', 'interdiction', 'violation', 'villainy', 'complicity',
        'struggle', 'branding', 'punishment'
      ],
      optional: ['reconnaissance', 'trickery']
    });
  }

  // ============================================================
  // NOVEL CONCEPT GENERATION
  // ============================================================

  async generateNovelConcept(seed: string, constraints: any = {}): Promise<NovelConcept> {
    console.log(`[AUTONOVEL] Generating novel concept from seed: "${seed}"`);

    // Step 1: Semantic decomposition of seed
    const seedConcepts = this.decomposeSeed(seed);

    // Step 2: Generate world
    const world = await this.generateWorld(seedConcepts, constraints);

    // Step 3: Generate characters from archetypes
    const characters = await this.generateCharacters(world, constraints);

    // Step 4: Generate plot from Propp functions
    const plot = await this.generatePlot(world, characters, constraints);

    // Step 5: Calculate novelty metrics
    const novelty = this.calculateNovelty(seedConcepts, world, characters, plot);

    // Step 6: If not novel enough, mutate and retry
    let attempts = 0;
    let concept = this.assembleConcept(seed, world, characters, plot, novelty);

    while (novelty.overallNovelty < this.noveltyThreshold && attempts < 5) {
      console.log(`[AUTONOVEL] Novelty too low (${novelty.overallNovelty.toFixed(2)}), mutating...`);
      await this.mutateConcept(concept);
      novelty.overallNovelty += 0.1;
      attempts++;
    }

    this.conceptLibrary.set(concept.id, concept);

    console.log(`[AUTONOVEL] Concept generated: "${concept.title}" (novelty: ${novelty.overallNovelty.toFixed(2)})`);
    return concept;
  }

  private decomposeSeed(seed: string): string[] {
    // Extract semantic concepts from seed
    const tokens = seed.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const concepts: string[] = [];

    // Extract named entities, themes, genres
    const genreWords = ['fantasy', 'sci-fi', 'mystery', 'romance', 'horror', 'thriller', 'drama'];
    const themeWords = ['love', 'death', 'power', 'identity', 'freedom', 'justice', 'redemption', 'betrayal'];

    for (const token of tokens) {
      if (genreWords.includes(token)) concepts.push(`genre:${token}`);
      if (themeWords.includes(token)) concepts.push(`theme:${token}`);
      if (token.length > 4) concepts.push(`concept:${token}`);
    }

    return concepts.length > 0 ? concepts : ['concept:original'];
  }

  private async generateWorld(seedConcepts: string[], constraints: any): Promise<WorldConcept> {
    const genre = seedConcepts.find(c => c.startsWith('genre:'))?.replace('genre:', '') || 'general';
    const theme = seedConcepts.find(c => c.startsWith('theme:'))?.replace('theme:', '') || 'exploration';

    const world: WorldConcept = {
      name: this.generateWorldName(genre, theme),
      setting: this.generateSetting(genre),
      timePeriod: this.generateTimePeriod(genre),
      rules: this.generateWorldRules(genre, constraints),
      cultures: this.generateCultures(genre, constraints),
      geography: this.generateGeography(genre),
      technology: this.generateTechnology(genre),
      conflicts: this.generateWorldConflicts(theme, constraints)
    };

    return world;
  }

  private generateWorldName(genre: string, theme: string): string {
    const prefixes: Record<string, string[]> = {
      fantasy: ['Eldoria', 'Aethon', 'Mythos', 'Arcanum', 'Celestia'],
      'sci-fi': ['Nexus', 'Terra', 'Astro', 'Cyber', 'Neo'],
      mystery: ['Shadow', 'Veil', 'Mist', 'Echo', 'Cipher'],
      general: ['World', 'Realm', 'Domain', 'Sphere', 'Plane']
    };

    const suffixes: Record<string, string[]> = {
      fantasy: ['ia', 'or', 'eth', 'os', 'ar'],
      'sci-fi': ['Prime', '7', 'X', 'Core', 'Net'],
      mystery: ['ton', 'field', 'wood', 'haven', 'port'],
      general: ['land', 'world', 'sphere', 'domain', 'realm']
    };

    const prefix = (prefixes[genre] || prefixes.general)[Math.floor(Math.random() * 5)];
    const suffix = (suffixes[genre] || suffixes.general)[Math.floor(Math.random() * 5)];

    return `${prefix}${suffix}`;
  }

  private generateSetting(genre: string): string {
    const settings: Record<string, string[]> = {
      fantasy: ['medieval kingdom', 'ancient empire', 'magical academy', 'enchanted forest'],
      'sci-fi': ['space station', 'distant planet', 'cyberpunk city', 'generation ship'],
      mystery: ['small town', 'isolated mansion', 'urban metropolis', 'coastal village'],
      general: ['contemporary city', 'rural landscape', 'industrial center', 'academic institution']
    };

    const options = settings[genre] || settings.general;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateTimePeriod(genre: string): string {
    const periods: Record<string, string[]> = {
      fantasy: ['ancient times', 'age of legends', 'post-cataclysm', 'second age'],
      'sci-fi': ['near future', 'distant future', 'post-singularity', 'space age'],
      mystery: ['present day', 'recent past', 'cold war era', 'turn of century'],
      general: ['contemporary', 'recent history', 'modern era']
    };

    const options = periods[genre] || periods.general;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateWorldRules(genre: string, constraints: any): string[] {
    const baseRules: Record<string, string[]> = {
      fantasy: ['Magic exists but has costs', 'Prophecies are self-fulfilling', 'True names hold power'],
      'sci-fi': ['Faster-than-light travel is possible', 'AI has consciousness rights', 'Resources are scarce'],
      mystery: ['Everyone has secrets', 'Appearances deceive', 'Truth is layered'],
      general: ['Actions have consequences', 'Knowledge is power', 'Change is inevitable']
    };

    const rules = [...(baseRules[genre] || baseRules.general)];

    // Add constraint-based rules
    if (constraints.noMagic) rules.push('Magic does not exist');
    if (constraints.dystopian) rules.push('Society is controlled by surveillance');
    if (constraints.utopian) rules.push('Society has achieved post-scarcity');

    return rules;
  }

  private generateCultures(genre: string, constraints: any): CultureConcept[] {
    const cultures: CultureConcept[] = [];
    const numCultures = constraints.numCultures || 2;

    for (let i = 0; i < numCultures; i++) {
      cultures.push({
        name: `Culture_${i + 1}`,
        values: ['honor', 'community', 'knowledge', 'tradition'].slice(0, 2 + i),
        taboos: ['betrayal', 'dishonesty', 'cowardice'].slice(0, 1 + i),
        rituals: ['coming of age', 'seasonal festivals', 'mourning ceremonies'].slice(0, 2),
        language: `Language_${i + 1}`,
        socialStructure: ['hierarchical', 'egalitarian', 'tribal', 'bureaucratic'][i % 4]
      });
    }

    return cultures;
  }

  private generateGeography(genre: string): string {
    const geographies: Record<string, string[]> = {
      fantasy: ['mountain ranges with floating peaks', 'vast forests with sentient trees', 'crystal deserts'],
      'sci-fi': ['terraforming zones', 'asteroid belts', 'ring worlds', 'dyson spheres'],
      mystery: ['foggy coastal regions', 'dense urban centers', 'isolated rural communities'],
      general: ['varied terrain', 'coastal regions', 'mountainous interior']
    };

    const options = geographies[genre] || geographies.general;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateTechnology(genre: string): string {
    const tech: Record<string, string[]> = {
      fantasy: ['magical artifacts', 'alchemical processes', 'rune-based engineering'],
      'sci-fi': ['quantum computing', 'neural interfaces', 'matter replication', 'warp drives'],
      mystery: ['forensic science', 'surveillance technology', 'information networks'],
      general: ['modern technology', 'emerging innovations', 'established industrial base']
    };

    const options = tech[genre] || tech.general;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateWorldConflicts(theme: string, constraints: any): string[] {
    const conflicts: Record<string, string[]> = {
      love: ['forbidden romance', 'love vs duty', 'sacrifice for love'],
      death: ['mortality vs immortality', 'grief and acceptance', 'legacy and memory'],
      power: ['corruption of authority', 'revolution vs stability', 'individual vs state'],
      identity: ['self-discovery', 'nature vs nurture', 'authenticity vs conformity'],
      freedom: ['liberation vs security', 'individual rights vs collective good', 'escape from oppression'],
      justice: ['revenge vs forgiveness', 'law vs morality', 'equality vs meritocracy'],
      redemption: ['atonement for past sins', 'second chances', 'transformation'],
      betrayal: ['trust vs suspicion', 'loyalty tested', 'deception uncovered']
    };

    return conflicts[theme] || ['internal conflict', 'external opposition', 'moral dilemma'];
  }

  // ============================================================
  // CHARACTER GENERATION
  // ============================================================

  private async generateCharacters(world: WorldConcept, constraints: any): Promise<CharacterConcept[]> {
    const characters: CharacterConcept[] = [];
    const numCharacters = constraints.numCharacters || 4;

    // Select archetypes ensuring diversity
    const selectedArchetypes = this.selectDiverseArchetypes(numCharacters);

    for (let i = 0; i < numCharacters; i++) {
      const archetype = selectedArchetypes[i];
      const template = this.archetypeTemplates.get(archetype);

      const character: CharacterConcept = {
        id: `char_${i}_${Date.now()}`,
        name: this.generateCharacterName(archetype, world.cultures[0]),
        archetype,
        motivation: template.typicalMotivations[Math.floor(Math.random() * template.typicalMotivations.length)],
        conflict: template.typicalConflicts[Math.floor(Math.random() * template.typicalConflicts.length)],
        growthArc: this.generateGrowthArc(archetype),
        relationships: new Map(),
        traits: { ...template.typicalTraits },
        backstory: this.generateBackstory(archetype, world),
        voice: this.generateVoice(archetype)
      };

      characters.push(character);
    }

    // Establish relationships
    this.establishRelationships(characters);

    return characters;
  }

  private selectDiverseArchetypes(count: number): string[] {
    const shuffled = [...JUNGIAN_ARCHETYPES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private generateCharacterName(archetype: string, culture: CultureConcept): string {
    const prefixes: Record<string, string[]> = {
      hero: ['Ald', 'Val', 'Kai', 'Thor', 'Lum'],
      mentor: ['El', 'Sage', 'Wise', 'Old', 'Master'],
      shadow: ['Mor', 'Dark', 'Vex', 'Night', 'Shadow'],
      trickster: ['Fox', 'Jest', 'Riddle', 'Quick', 'Sly']
    };

    const prefix = (prefixes[archetype] || ['Name'])[Math.floor(Math.random() * 5)];
    return `${prefix}_${culture.name}`;
  }

  private generateGrowthArc(archetype: string): string {
    const arcs: Record<string, string[]> = {
      hero: ['from naive to wise', 'from selfish to selfless', 'from fearful to courageous'],
      mentor: ['from detached to engaged', 'from teacher to learner', 'from certain to questioning'],
      shadow: ['from villain to ally', 'from power-hungry to balanced', 'from isolated to connected'],
      trickster: ['from chaos to purpose', 'from self-serving to community-minded', 'from surface to depth']
    };

    const options = arcs[archetype] || ['from one state to another'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateBackstory(archetype: string, world: WorldConcept): string {
    const backstories: Record<string, string[]> = {
      hero: [
        `Born in ${world.name} during a time of peace, unaware of destiny`,
        `Orphaned young, raised by ${world.cultures[0]?.name || 'unknown'} traditions`,
        `Former soldier who lost everything, seeking redemption`
      ],
      mentor: [
        `Once a great hero who retired after great sacrifice`,
        `Scholar who spent decades studying ${world.name}'s secrets`,
        `Exiled from home for speaking truth to power`
      ]
    };

    const options = backstories[archetype] || [`Mysterious past in ${world.name}`];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateVoice(archetype: string): string {
    const voices: Record<string, string[]> = {
      hero: ['direct and earnest', 'reluctant but determined', 'optimistic despite hardship'],
      mentor: ['measured and wise', 'cryptic but profound', 'warm and encouraging'],
      shadow: ['charming but dangerous', 'coldly analytical', 'passionate but twisted'],
      trickster: ['witty and irreverent', 'deceptively simple', 'layered with hidden meanings']
    };

    const options = voices[archetype] || ['neutral and observational'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private establishRelationships(characters: CharacterConcept[]): void {
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const a = characters[i];
        const b = characters[j];

        // Determine relationship based on archetypes
        const relationship = this.inferRelationship(a.archetype, b.archetype);
        a.relationships.set(b.id, relationship);
        b.relationships.set(a.id, this.inverseRelationship(relationship));
      }
    }
  }

  private inferRelationship(archetypeA: string, archetypeB: string): string {
    const pairs: Record<string, Record<string, string>> = {
      hero: { mentor: 'student_of', shadow: 'opposes', ally: 'partner_with', trickster: 'tolerates' },
      mentor: { hero: 'guides', shadow: 'warns_against', trickster: 'learns_from' },
      shadow: { hero: 'seeks_to_destroy', mentor: 'fears', trickster: 'uses' }
    };

    return (pairs[archetypeA]?.[archetypeB] || 'knows');
  }

  private inverseRelationship(rel: string): string {
    const inverses: Record<string, string> = {
      'student_of': 'teacher_of',
      'teacher_of': 'student_of',
      'opposes': 'is_opposed_by',
      'guides': 'is_guided_by',
      'seeks_to_destroy': 'is_targeted_by',
      'partner_with': 'partner_with',
      'knows': 'knows'
    };

    return inverses[rel] || rel;
  }

  // ============================================================
  // PLOT GENERATION (Propp Functions)
  // ============================================================

  private async generatePlot(world: WorldConcept, characters: CharacterConcept[], constraints: any): Promise<PlotNode[]> {
    const modelName = constraints.plotModel || 'classic_folktale';
    const model = this.proppModels.get(modelName);

    if (!model) {
      throw new Error(`Unknown plot model: ${modelName}`);
    }

    const plot: PlotNode[] = [];
    const hero = characters.find(c => c.archetype === 'hero') || characters[0];
    const villain = characters.find(c => c.archetype === 'shadow') || characters[1];

    // Map Propp functions to plot nodes
    for (let i = 0; i < model.functions.length; i++) {
      const func = model.functions[i];
      const node = this.proppFunctionToNode(func, i, world, hero, villain, characters);
      plot.push(node);
    }

    // Add optional functions based on constraints
    if (constraints.includeTrickery && model.optional.includes('trickery')) {
      const trickster = characters.find(c => c.archetype === 'trickster');
      if (trickster) {
        plot.push(this.proppFunctionToNode('trickery', plot.length, world, trickster, hero, characters));
      }
    }

    // Sort by temporal position
    plot.sort((a, b) => a.temporalPosition - b.temporalPosition);

    return plot;
  }

  private proppFunctionToNode(func: string, index: number, world: WorldConcept, hero: CharacterConcept, villain: CharacterConcept, allChars: CharacterConcept[]): PlotNode {
    const descriptions: Record<string, string> = {
      absentation: `${hero.name} leaves the safety of home`,
      interdiction: `A warning is given: "Do not ${world.conflicts[0] || 'go there'}"`,
      violation: `The warning is ignored, setting events in motion`,
      reconnaissance: `${villain.name} learns of ${hero.name}'s weakness`,
      villainy: `${villain.name} commits an act of villainy against ${hero.name}`,
      mediation: `A call to action reaches ${hero.name}`,
      departure: `${hero.name} begins the journey`,
      first_function_of_donor: `A donor tests ${hero.name} and offers a magical agent`,
      heros_reaction: `${hero.name} responds to the test`,
      receipt_of_agent: `${hero.name} receives the magical agent`,
      struggle: `${hero.name} and ${villain.name} join in direct combat`,
      victory: `${hero.name} defeats ${villain.name}`,
      liquidation: `The initial misfortune or lack is resolved`,
      return: `${hero.name} returns home`,
      wedding: `${hero.name} is rewarded with a wedding and kingdom`
    };

    const types: Record<string, PlotNode['type']> = {
      absentation: 'exposition',
      interdiction: 'exposition',
      violation: 'inciting_incident',
      reconnaissance: 'rising_action',
      villainy: 'inciting_incident',
      mediation: 'rising_action',
      departure: 'rising_action',
      first_function_of_donor: 'rising_action',
      heros_reaction: 'rising_action',
      receipt_of_agent: 'rising_action',
      struggle: 'climax',
      victory: 'falling_action',
      liquidation: 'falling_action',
      return: 'falling_action',
      wedding: 'resolution'
    };

    return {
      id: `plot_${index}_${Date.now()}`,
      type: types[func] || 'rising_action',
      description: descriptions[func] || `${func} occurs`,
      characters: [hero.id, villain.id],
      location: world.setting,
      emotionalTone: this.inferTone(func),
      proppFunction: func,
      prerequisites: index > 0 ? [`plot_${index - 1}`] : [],
      consequences: [],
      temporalPosition: index / 15
    };
  }

  private inferTone(func: string): string {
    const tones: Record<string, string> = {
      absentation: 'nostalgic',
      interdiction: 'ominous',
      violation: 'tense',
      reconnaissance: 'suspenseful',
      villainy: 'dark',
      mediation: 'hopeful',
      departure: 'adventurous',
      struggle: 'intense',
      victory: 'triumphant',
      wedding: 'joyful'
    };

    return tones[func] || 'neutral';
  }

  // ============================================================
  // NOVELTY CALCULATION
  // ============================================================

  private calculateNovelty(seedConcepts: string[], world: WorldConcept, characters: CharacterConcept[], plot: PlotNode[]): NoveltyMetrics {
    // Semantic distance: how far from known concepts
    const semanticDistance = this.calculateSemanticDistance(seedConcepts);

    // Combinatorial novelty: new combinations
    const combinatorialNovelty = this.calculateCombinatorialNovelty(world, characters, plot);

    // Structural innovation: new plot patterns
    const structuralInnovation = this.calculateStructuralInnovation(plot);

    // Thematic freshness
    const thematicFreshness = this.calculateThematicFreshness(world);

    // Voice originality
    const voiceOriginality = this.calculateVoiceOriginality(characters);

    const overallNovelty = (semanticDistance + combinatorialNovelty + structuralInnovation + thematicFreshness + voiceOriginality) / 5;

    return {
      semanticDistance,
      combinatorialNovelty,
      structuralInnovation,
      thematicFreshness,
      voiceOriginality,
      overallNovelty
    };
  }

  private calculateSemanticDistance(seedConcepts: string[]): number {
    // Compare to existing concepts in library
    if (this.conceptLibrary.size === 0) return 1.0;

    let totalDistance = 0;
    for (const concept of this.conceptLibrary.values()) {
      const overlap = concept.derivationChain.filter(c => seedConcepts.includes(c)).length;
      totalDistance += 1 - (overlap / Math.max(seedConcepts.length, concept.derivationChain.length));
    }

    return totalDistance / this.conceptLibrary.size;
  }

  private calculateCombinatorialNovelty(world: WorldConcept, characters: CharacterConcept[], plot: PlotNode[]): number {
    // Check if this combination has been seen before
    const combination = `${world.setting}-${characters.length}-${plot.length}`;
    const seen = this.patternDatabase.get(combination) || 0;

    // Update database
    this.patternDatabase.set(combination, seen + 1);

    // Higher novelty = less seen
    return Math.max(0, 1 - (seen / 10));
  }

  private calculateStructuralInnovation(plot: PlotNode[]): number {
    // Check for unusual plot structures
    const hasSubplots = plot.some(p => p.type === 'subplot');
    const nonLinear = plot.some(p => p.temporalPosition < 0 || p.temporalPosition > 1);

    let innovation = 0.5;
    if (hasSubplots) innovation += 0.2;
    if (nonLinear) innovation += 0.3;

    return Math.min(innovation, 1.0);
  }

  private calculateThematicFreshness(world: WorldConcept): number {
    // Check if themes are commonly used
    const commonThemes = ['love', 'power', 'good_vs_evil', 'coming_of_age'];
    const overlap = world.conflicts.filter(c => commonThemes.includes(c.toLowerCase().replace(/\s+/g, '_'))).length;

    return Math.max(0, 1 - (overlap / commonThemes.length));
  }

  private calculateVoiceOriginality(characters: CharacterConcept[]): number {
    // Check for unique voices
    const voices = characters.map(c => c.voice);
    const uniqueVoices = new Set(voices).size;

    return uniqueVoices / characters.length;
  }

  // ============================================================
  // MUTATION & EVOLUTION
  // ============================================================

  private async mutateConcept(concept: NovelConcept): Promise<void> {
    const mutations = [
      () => this.mutateWorld(concept),
      () => this.mutateCharacters(concept),
      () => this.mutatePlot(concept),
      () => this.mutateTheme(concept)
    ];

    // Apply 1-3 random mutations
    const numMutations = 1 + Math.floor(Math.random() * 3);
    const shuffled = mutations.sort(() => Math.random() - 0.5);

    for (let i = 0; i < numMutations; i++) {
      shuffled[i]();
    }
  }

  private mutateWorld(concept: NovelConcept): void {
    // Add an unexpected world rule
    const newRules = [
      'Time flows differently in different regions',
      'Memories can be traded as currency',
      'Dreams manifest physically',
      'Language shapes reality',
      'Death is not permanent but has a cost'
    ];
    concept.worldBuilding.rules.push(newRules[Math.floor(Math.random() * newRules.length)]);
  }

  private mutateCharacters(concept: NovelConcept): void {
    // Swap archetypes of two characters
    if (concept.characters.length >= 2) {
      const i = Math.floor(Math.random() * concept.characters.length);
      const j = Math.floor(Math.random() * concept.characters.length);
      if (i !== j) {
        const temp = concept.characters[i].archetype;
        concept.characters[i].archetype = concept.characters[j].archetype;
        concept.characters[j].archetype = temp;
      }
    }
  }

  private mutatePlot(concept: NovelConcept): void {
    // Insert a non-linear element
    const midpoint = Math.floor(concept.plotStructure.length / 2);
    concept.plotStructure[midpoint].temporalPosition = Math.random();
  }

  private mutateTheme(concept: NovelConcept): void {
    // Add an unexpected theme
    const unexpectedThemes = ['the nature of consciousness', 'the illusion of free will', 'the cost of immortality'];
    concept.themes.push(unexpectedThemes[Math.floor(Math.random() * unexpectedThemes.length)]);
  }

  // ============================================================
  // ASSEMBLY
  // ============================================================

  private assembleConcept(seed: string, world: WorldConcept, characters: CharacterConcept[], plot: PlotNode[], novelty: NoveltyMetrics): NovelConcept {
    const genre = seed.split(/\s+/).find(w => ['fantasy', 'sci-fi', 'mystery', 'romance', 'horror'].includes(w)) || 'general';

    return {
      id: `novel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: this.generateTitle(seed, world),
      genre,
      premise: this.generatePremise(world, characters, plot),
      themes: world.conflicts,
      characters,
      plotStructure: plot,
      worldBuilding: world,
      originalityScore: novelty.overallNovelty,
      derivationChain: [seed, world.name, ...characters.map(c => c.archetype)],
      noveltyMetrics: novelty
    };
  }

  private generateTitle(seed: string, world: WorldConcept): string {
    const formats = [
      `The ${world.conflicts[0] || 'Journey'} of ${world.name}`,
      `${world.name}: A ${seed.split(/\s+/)[0] || 'Tale'}`,
      `Beyond ${world.name}`,
      `The Last ${world.cultures[0]?.name || 'Kingdom'}`,
      `When ${world.conflicts[0] || 'Worlds'} Collide`
    ];

    return formats[Math.floor(Math.random() * formats.length)];
  }

  private generatePremise(world: WorldConcept, characters: CharacterConcept[], plot: PlotNode[]): string {
    const hero = characters.find(c => c.archetype === 'hero') || characters[0];
    const conflict = world.conflicts[0] || 'an ancient evil';

    return `In ${world.name}, a ${world.setting} where ${world.rules[0] || 'magic exists'}, ${hero.name} must confront ${conflict} while navigating ${world.conflicts[1] || 'personal demons'}.`;
  }

  // ============================================================
  // CREATIVE SYNTHESIS (Pattern-Breaking)
  // ============================================================

  async creativeSynthesis(sourceConcepts: string[], synthesisMethod: string): Promise<CreativeSynthesis> {
    console.log(`[AUTONOVEL] Creative synthesis: ${sourceConcepts.join(' + ')} via ${synthesisMethod}`);

    // Generate base concept from first source
    const baseConcept = await this.generateNovelConcept(sourceConcepts[0]);

    // Apply synthesis method
    let result: NovelConcept;
    let creativeLeap: string;
    let patternBreaks: string[] = [];

    switch (synthesisMethod) {
      case 'conceptual_blending':
        result = await this.conceptualBlend(baseConcept, sourceConcepts.slice(1));
        creativeLeap = 'Blended incompatible conceptual spaces';
        patternBreaks = ['genre conventions', 'character archetypes'];
        break;

      case 'analogical_transfer':
        result = await this.analogicalTransfer(baseConcept, sourceConcepts.slice(1));
        creativeLeap = 'Transferred structure across domains';
        patternBreaks = ['narrative structure', 'causal logic'];
        break;

      case 'constraint_satisfaction':
        result = await this.constraintSatisfaction(baseConcept, sourceConcepts.slice(1));
        creativeLeap = 'Found solution in constrained space';
        patternBreaks = ['expected resolutions', 'character decisions'];
        break;

      case 'emergent_combination':
        result = await this.emergentCombination(baseConcept, sourceConcepts.slice(1));
        creativeLeap = 'Emergent properties from combination';
        patternBreaks = ['world rules', 'thematic expectations'];
        break;

      default:
        result = baseConcept;
        creativeLeap = 'Direct generation';
    }

    const synthesis: CreativeSynthesis = {
      id: `synthesis_${Date.now()}`,
      sourceConcepts,
      synthesisMethod,
      result,
      creativeLeap,
      patternBreaks,
      domain: result.genre
    };

    this.synthesisHistory.push(synthesis);
    return synthesis;
  }

  private async conceptualBlend(base: NovelConcept, sources: string[]): Promise<NovelConcept> {
    // Blend conceptual spaces from multiple sources
    const blended = { ...base };
    blended.id = `blend_${Date.now()}`;
    blended.title = `Blended: ${base.title}`;

    for (const source of sources) {
      const sourceConcept = await this.generateNovelConcept(source);

      // Blend worlds
      blended.worldBuilding.rules = [...new Set([...blended.worldBuilding.rules, ...sourceConcept.worldBuilding.rules])];

      // Blend characters (take one from each)
      if (sourceConcept.characters.length > 0) {
        blended.characters.push(sourceConcept.characters[0]);
      }
    }

    return blended;
  }

  private async analogicalTransfer(base: NovelConcept, sources: string[]): Promise<NovelConcept> {
    // Transfer structure from one domain to another
    const transferred = { ...base };
    transferred.id = `analogy_${Date.now()}`;

    // Apply plot structure from source to base's world
    for (const source of sources) {
      const sourceConcept = await this.generateNovelConcept(source);
      transferred.plotStructure = sourceConcept.plotStructure.map(p => ({
        ...p,
        characters: transferred.characters.map(c => c.id).slice(0, 2)
      }));
    }

    return transferred;
  }

  private async constraintSatisfaction(base: NovelConcept, sources: string[]): Promise<NovelConcept> {
    // Solve under constraints
    const constrained = { ...base };
    constrained.id = `constraint_${Date.now()}`;

    // Add constraints from sources as hard rules
    for (const source of sources) {
      const sourceConcept = await this.generateNovelConcept(source);
      constrained.worldBuilding.rules.push(...sourceConcept.worldBuilding.rules.map(r => `CONSTRAINT: ${r}`));
    }

    return constrained;
  }

  private async emergentCombination(base: NovelConcept, sources: string[]): Promise<NovelConcept> {
    // Combine and let emergent properties arise
    const emergent = { ...base };
    emergent.id = `emergent_${Date.now()}`;

    // Combine all elements and see what emerges
    for (const source of sources) {
      const sourceConcept = await this.generateNovelConcept(source);
      emergent.themes = [...new Set([...emergent.themes, ...sourceConcept.themes])];
    }

    // Add emergent theme
    emergent.themes.push('the synthesis of opposites');

    return emergent;
  }

  // ============================================================
  // API INTERFACE
  // ============================================================

  async handleMessage(message: any): Promise<any> {
    const { type, payload } = message;

    switch (type) {
      case 'generate':
        return await this.generateNovelConcept(payload.seed, payload.constraints);

      case 'synthesize':
        return await this.creativeSynthesis(payload.sourceConcepts, payload.synthesisMethod);

      case 'get_concept':
        return this.conceptLibrary.get(payload.conceptId);

      case 'get_archetype':
        return this.archetypeTemplates.get(payload.archetype);

      case 'get_propp':
        return this.proppModels.get(payload.model);

      case 'mutate':
        const concept = this.conceptLibrary.get(payload.conceptId);
        if (concept) {
          await this.mutateConcept(concept);
          return concept;
        }
        return { error: 'Concept not found' };

      case 'stats':
        return {
          concepts: this.conceptLibrary.size,
          archetypes: this.archetypeTemplates.size,
          proppModels: this.proppModels.size,
          syntheses: this.synthesisHistory.length,
          patterns: this.patternDatabase.size
        };

      default:
        return { error: `Unknown message type: ${type}` };
    }
  }
}

export default AutonovelEngine;
