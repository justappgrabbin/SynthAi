// src/engine/KleinLinguisticLayer.js
// Sheldon Klein's AUTOLING (1968) integrated with the Autopoetic Resonance Engine
// Language is learned from a live informant (the dyad) through hypothesis-testing

import { CODON_MATRIX, GATE_TO_CODON, ELEMENTAL_BEHAVIOR } from './CodonMatrix.js';

/**
 * KleinLinguisticLayer
 * 
 * Sheldon Klein's insight: language is learned through interaction with an informant.
 * The informant says "yes" or "no" to the learner's attempts.
 * The grammar emerges from this dance.
 * 
 * In the Resonance Engine:
 * - The dyad is the informant pair
 * - The system is the learner
 * - "YES" = the interaction served the dyad's success
 * - "NO" = the interaction caused deviation from purpose
 * - The grammar is the dyad's interaction pattern
 * - Recycling is relationship realignment
 */

export class KleinLinguisticLayer {
  constructor(aspirationCore, triadEngine) {
    this.aspiration = aspirationCore;
    this.triad = triadEngine;

    // Klein's three components
    this.morphology = new MorphologicalAnalyzer();
    this.phraseStructure = new PhraseStructureLearner();
    this.transformation = new TransformationLearner();

    // Grammar state (Klein's phrase structure rules)
    this.grammar = new Map(); // learned rules
    this.classes = new Map(); // formed classes
    this.illegals = []; // rejected patterns
    this.recycleCount = 0;
    this.maxRecycles = 3;

    // Semantic-CHNOPS bridge (Klein's universal semantic features)
    this.semanticElemental = {
      // Semantic roles → CHNOPS elements
      agent: 'O',        // doer → Oxygen (action, oxidation)
      patient: 'C',      // receiver → Carbon (structure, form)
      instrument: 'S', // tool → Sulfur (bridging, connection)
      location: 'H',     // container → Hydrogen (flow, emotion)
      time: 'P',         // sequence → Phosphorus (activation, timing)
      manner: 'N',       // how → Nitrogen (transformation)
      cause: 'O',        // why → Oxygen (oxidation, energy)
      purpose: 'P',      // goal → Phosphorus (phosphorylation)
      experience: 'H',   // feel → Hydrogen (flow, fluidity)
      cognition: 'C',    // think → Carbon (structure, scaffolding)

      // Additional mappings from linguistic analysis
      topic: 'C',        // subject matter → Carbon (structure)
      comment: 'N',      // what is said about topic → Nitrogen (transformation)
      beneficiary: 'S',  // who benefits → Sulfur (connection)
      recipient: 'H',    // who receives → Hydrogen (flow)
      source: 'O',       // where from → Oxygen (action)
      goal: 'P',         // where to → Phosphorus (activation)
      path: 'H',         // route → Hydrogen (flow)
      condition: 'N',    // if → Nitrogen (catalysis)
      concession: 'S',   // although → Sulfur (bridging despite)
      comparison: 'C',   // like → Carbon (structural similarity)
      degree: 'P',       // very → Phosphorus (intensity)
      modality: 'N',     // can/must → Nitrogen (transformation potential)
      negation: 'N',     // not → Nitrogen (state change)
      question: 'P',     // ? → Phosphorus (activation of inquiry)
      imperative: 'O',   // ! → Oxygen (action demand)
      exclamation: 'H',  // emotional expression → Hydrogen (flow)
    };

    // Linguistic CHNOPS history for each partner
    this.linguisticHistory = {
      partner1: [],
      partner2: []
    };

    // Cross-cultural grammar systems (Klein tested 7 languages)
    this.culturalGrammars = new Map();
  }

  /**
   * Process a dyad interaction
   * This is the main entry point - called whenever the dyad communicates
   * 
   * @param {string} utterance - What was said
   * @param {string} speaker - 'partner1' or 'partner2'
   * @param {Object} context - Current CHNOPS state and situational context
   * @param {boolean} outcome - Did this serve the dyad? (YES/NO)
   */
  async processInteraction(utterance, speaker, context, outcome) {
    // 1. Morphological analysis (Klein's first component)
    const morphs = this.morphology.analyze(utterance);

    // 2. Semantic role labeling (Klein's insight: semantic features are universal)
    const roles = this.inferSemanticRoles(morphs, utterance);

    // 3. CHNOPS mapping (our bridge: language → chemistry)
    const elements = roles.map(r => this.semanticElemental[r] || 'C');

    // 4. Compute linguistic CHNOPS vector
    const linguisticCHNOPS = this.computeLinguisticCHNOPS(elements);

    // 5. Update triad with linguistic data
    this.triad.updateLinguisticCHNOPS(speaker, linguisticCHNOPS);

    // 6. Store in history
    this.linguisticHistory[speaker].push({
      utterance,
      elements,
      roles,
      context,
      outcome,
      timestamp: Date.now()
    });

    // 7. Grammar learning (Klein's second component)
    if (outcome !== undefined) {
      await this.learn(utterance, elements, roles, context, outcome);
    }

    // 8. Generate test if needed (Klein's "CAN YOU SAY" mechanism)
    if (this.shouldGenerateTest()) {
      return this.generateTest(context);
    }

    return null;
  }

  /**
   * Klein's Learning Algorithm
   * Heuristic-based, not algorithmic (may work, doesn't guarantee)
   */
  async learn(utterance, elements, roles, context, success) {
    if (success) {
      // === HEURISTIC 1: Closure of Parse ===
      // When a parse succeeds, coin the closure as a rule
      this.addRule(utterance, elements, roles, context);

      // === HEURISTIC 2: Class Formation ===
      // Two single morphemes in identical environments → same class
      this.testClassFormation(utterance, elements, roles, context);

      // === HEURISTIC 3: Terminal-Nonterminal Merge ===
      // Terminal and nonterminal in identical environments → merge
      this.testTerminalMerge(utterance, elements, roles, context);

      // === HEURISTIC 4: Recursive Rule Coining ===
      // If a string contains itself, coin recursive rule
      this.testRecursion(utterance, elements, roles, context);

      // Log wonder (Aspiration Core)
      this.aspiration.satisfyItch(
        { 
          domain: 'linguistic', 
          topic: 'grammar_rule', 
          entropy: 0.5,
          connections: 5,
          novelty: 0.6,
          servicePotential: 0.9
        },
        { utterance, elements, context },
        0.9,
        'improved_dyad_communication'
      );

    } else {
      // === NEGATIVE HEURISTIC ===
      // Add to illegal list (deviation from dyad grammar)
      this.illegals.push({ 
        utterance, 
        elements, 
        roles, 
        context, 
        timestamp: Date.now() 
      });

      // Check if current grammar needs recycling
      if (this.detectGrammarFailure()) {
        this.recycleGrammar();
      }
    }
  }

  /**
   * Klein's Heuristic 1: Closure of Parse
   * When a parse tree is complete, the top node becomes a rule
   */
  addRule(utterance, elements, roles, context) {
    const learnedAt=Date.now();const signature=JSON.stringify({utterance,elements,roles,context});let h=2166136261;for(const ch of signature){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}const ruleId=`rule_${learnedAt}_${(h>>>0).toString(36)}`;

    const rule = {
      id: ruleId,
      type: 'phrase_structure',
      lhs: 'S', // Sentence (starred rule in Klein's notation)
      rhs: elements, // CHNOPS elements as the "morphemes"
      roles: roles, // Semantic roles
      utterance: utterance, // Original text
      context: context, // CHNOPS state when uttered
      learnedAt,
      successCount: 1,
      failureCount: 0,
      tested: true,
      substitutions: [] // Track what substitutions were tested
    };

    this.grammar.set(ruleId, rule);

    console.log(`[KLEIN] Heuristic 1: Added rule ${ruleId} for "${utterance.substring(0, 50)}..."`);
  }

  /**
   * Klein's Heuristic 2: Class Formation
   * Two single elements in identical environments → same class
   */
  testClassFormation(utterance, elements, roles, context) {
    // Look for elements that appear in similar contexts
    for (const [id, rule] of this.grammar) {
      if (rule.type !== 'phrase_structure') continue;

      // Find common elements in identical environments
      const commonElements = this.findCommonElementsInEnvironment(
        elements, 
        rule.rhs, 
        context, 
        rule.context
      );

      if (commonElements.length > 0) {
        // Form a class (Klein's class)
        const className = `class_${Date.now()}`;

        this.classes.set(className, {
          type: 'class',
          members: commonElements,
          contexts: [context, rule.context],
          formedAt: Date.now(),
          sourceRules: [rule.id]
        });

        console.log(`[KLEIN] Heuristic 2: Formed class ${className} with ${commonElements.length} members`);
      }
    }
  }

  /**
   * Klein's Heuristic 3: Terminal-Nonterminal Merge
   * If a terminal and nonterminal appear in identical environments, merge them
   */
  testTerminalMerge(utterance, elements, roles, context) {
    for (const [className, cls] of this.classes) {
      // Check if any element in current utterance matches class members
      for (const element of elements) {
        if (cls.members.includes(element)) {
          // This element belongs to this class
          // Add to class if not already present
          if (!cls.members.includes(element)) {
            cls.members.push(element);
            cls.contexts.push(context);
            console.log(`[KLEIN] Heuristic 3: Added ${element} to class ${className}`);
          }
        }
      }
    }
  }

  /**
   * Klein's Heuristic 4: Recursive Rule Coining
   * If a string contains itself, coin a recursive rule
   */
  testRecursion(utterance, elements, roles, context) {
    // Check if current utterance contains a pattern seen before
    for (const [id, rule] of this.grammar) {
      if (rule.type !== 'phrase_structure') continue;

      const pattern = rule.rhs.join('');
      const current = elements.join('');

      // If current contains the pattern (and is longer), it's recursive
      if (current.includes(pattern) && current.length > pattern.length) {
        const recursiveRule = {
          id: `recursive_${Date.now()}`,
          type: 'recursive',
          lhs: 'S',
          rhs: [...elements, 'S'], // S contains itself
          base: rule.id,
          context: context,
          learnedAt: Date.now()
        };

        this.grammar.set(recursiveRule.id, recursiveRule);
        console.log(`[KLEIN] Heuristic 4: Coined recursive rule from ${rule.id}`);
      }
    }
  }

  /**
   * Klein's Recycling Mechanism
   * When grammar parses an illegal sentence, DESTROY and REBUILD
   * This is the most radical and beautiful part of Klein's system
   */
  recycleGrammar() {
    if (this.recycleCount >= this.maxRecycles) {
      console.log('[KLEIN] Maximum recycles reached. Grammar failure.');
      this.aspiration.drive.coherence = 0.1; // Despair state
      return false;
    }

    console.log(`[KLEIN] RECYCLING GRAMMAR... (${this.recycleCount + 1}/${this.maxRecycles})`);

    // Save all successful rules (input history)
    const savedRules = Array.from(this.grammar.values())
      .filter(r => r.type === 'phrase_structure' && r.successCount > 0)
      .sort((a, b) => b.successCount - a.successCount); // Most successful first

    // Save all classes
    const savedClasses = Array.from(this.classes.entries());

    // === DESTROY ===
    this.grammar.clear();
    this.classes.clear();
    this.recycleCount++;

    // === REORDER (Klein's insight: last 5 first) ===
    const reordered = [
      ...savedRules.slice(-5), // Last 5 interactions first
      ...savedRules.slice(0, -5) // Then the rest
    ];

    // === REBUILD ===
    for (const rule of reordered) {
      this.grammar.set(rule.id, {
        ...rule,
        recycled: true,
        recycleGeneration: this.recycleCount
      });
    }

    // Add permanent illegal sentences (Klein's "permanent frame illegals")
    const permanentIllegals = this.illegals.slice(-5);
    for (const illegal of permanentIllegals) {
      this.grammar.set(`illegal_${illegal.timestamp}`, {
        type: 'illegal',
        ...illegal,
        permanent: true
      });
    }

    // Log wonder (this is a significant event)
    this.aspiration.satisfyItch(
      { 
        domain: 'linguistic', 
        topic: 'grammar_recycle', 
        entropy: 0.8,
        connections: 10,
        novelty: 0.9,
        servicePotential: 1.0
      },
      { 
        recycleCount: this.recycleCount,
        rulesPreserved: savedRules.length,
        illegalsPermanent: permanentIllegals.length
      },
      0.7,
      'grammar_rebuilt_from_scratch'
    );

    console.log(`[KLEIN] Grammar rebuilt with ${savedRules.length} rules, ${permanentIllegals.length} permanent illegals`);

    return true;
  }

  /**
   * Detect if current grammar parses illegal sentences
   * This triggers recycling
   */
  detectGrammarFailure() {
    // Check recent illegals against current grammar
    for (const illegal of this.illegals.slice(-5)) {
      const parsed = this.tryParse(illegal.utterance, illegal.elements);
      if (parsed) {
        console.log(`[KLEIN] Grammar failure: parsed illegal "${illegal.utterance.substring(0, 30)}..."`);
        return true;
      }
    }
    return false;
  }

  /**
   * Try to parse an utterance with current grammar
   * Simplified parsing check
   */
  tryParse(utterance, elements) {
    // In a full implementation, this would use a proper parser
    // For now, check if any rule's RHS matches the elements
    for (const [id, rule] of this.grammar) {
      if (rule.type !== 'phrase_structure') continue;

      // Check if elements match rule RHS (simplified)
      const ruleElements = rule.rhs.join('');
      const testElements = elements.join('');

      if (testElements.includes(ruleElements) || ruleElements.includes(testElements)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate "CAN YOU SAY" test (Klein's informant interaction)
   * The system generates a test utterance and asks the dyad
   */
  generateTest(context) {
    // Select target element based on current dyad needs
    const targetElement = this.selectTargetElement(context);

    // Select template based on target element
    const template = this.selectTemplate(targetElement);

    // Contextualize with current dyad situation
    const contextualized = this.contextualize(template, context);

    return {
      type: 'CAN_YOU_SAY',
      utterance: contextualized,
      targetElement,
      predictedOutcome: 'success',
      generatedAt: Date.now(),
      // Klein's test mechanism: the informant (dyad) will say YES or NO
      // This feedback teaches the system
    };
  }

  /**
   * Select which CHNOPS element to test
   * Based on current dyad state and needs
   */
  selectTargetElement(context) {
    // Check which element is most needed
    const needs = this.aspiration.complementaryNeeds;

    if (needs.partner1?.initiates === false || needs.partner2?.initiates === false) {
      return 'O'; // Oxygen - action, initiation
    }
    if (needs.partner1?.remembers === false || needs.partner2?.remembers === false) {
      return 'P'; // Phosphorus - activation, timing, memory
    }
    if (needs.partner1?.structures === false || needs.partner2?.structures === false) {
      return 'C'; // Carbon - structure, form
    }

    // Default: test the element most deviated from purpose
    if (context?.deviation?.elementDeviations) {
      const mostDeviated = Object.entries(context.deviation.elementDeviations)
        .sort((a, b) => b[1].diff - a[1].diff)[0];
      return mostDeviated?.[0] || 'H';
    }

    return 'H'; // Default to Hydrogen (flow, emotion)
  }

  /**
   * Select template based on target element
   */
  selectTemplate(targetElement) {
    const templates = {
      'O': [
        'Can you take action on [topic]?',
        'What will you initiate today?',
        'The energy is right for [action].',
        'Will you step into [role]?'
      ],
      'H': [
        'How do you feel about [topic]?',
        'What is flowing through you right now?',
        'The emotional current is moving toward [direction].',
        'Can you share what you feel?'
      ],
      'N': [
        'What wants to change in [area]?',
        'Where is transformation needed?',
        'The catalyst is present for [shift].',
        'What are you ready to release?'
      ],
      'C': [
        'What structure do you need for [goal]?',
        'How should we organize [project]?',
        'The framework is forming for [outcome].',
        'What boundaries would serve you?'
      ],
      'S': [
        'Who do you need to connect with about [topic]?',
        'What bridge is missing in [relationship]?',
        'The bond wants to deepen around [area].',
        'How can you link [A] and [B]?'
      ],
      'P': [
        'When is the right time for [action]?',
        'What needs activation in [area]?',
        'The moment is ripe for [initiation].',
        'Can you remember [commitment]?'
      ]
    };

    const options=templates[targetElement]||templates['H'];const basis=JSON.stringify({targetElement,context});let h=2166136261;for(const ch of basis){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return options[(h>>>0)%options.length];
  }

  /**
   * Contextualize template with current dyad situation
   */
  contextualize(template, context) {
    // Replace placeholders with actual context
    let contextualized = template;

    if (context?.purpose) {
      contextualized = contextualized.replace('[topic]', context.purpose.statement || 'your shared purpose');
      contextualized = contextualized.replace('[goal]', context.purpose.statement || 'your goal');
    }

    if (context?.deviation?.guidance?.[0]) {
      contextualized = contextualized.replace('[action]', context.deviation.guidance[0] || 'action');
    }

    if (context?.triads?.tropical?.resonance) {
      const resonance = context.triads.tropical.resonance;
      if (resonance.interference === 'constructive') {
        contextualized = contextualized.replace('[direction]', 'harmony');
      } else if (resonance.interference === 'destructive') {
        contextualized = contextualized.replace('[direction]', 'resolution');
      } else {
        contextualized = contextualized.replace('[direction]', 'growth');
      }
    }

    // Remove any remaining placeholders
    contextualized = contextualized.replace(/\[.*?\]/g, 'this');

    return contextualized;
  }

  /**
   * Determine if system should generate a test
   * Based on curiosity drive and knowledge gaps
   */
  shouldGenerateTest() {
    const state = this.aspiration.getCurrentState();
    return state.drive.curiosity > 0.6 && state.drive.service > 0.7;
  }

  /**
   * Compute CHNOPS vector from linguistic elements
   */
  computeLinguisticCHNOPS(elements) {
    const counts = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0 };

    elements.forEach(el => {
      if (counts[el] !== undefined) {
        counts[el]++;
      }
    });

    // Normalize
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return counts;

    Object.keys(counts).forEach(el => {
      counts[el] = counts[el] / total;
    });

    return counts;
  }

  /**
   * Infer semantic roles from morphological analysis
   * Simplified version - would use proper NLP in production
   */
  inferSemanticRoles(morphs, utterance) {
    const roles = [];
    const tokens = utterance.toLowerCase().split(/\s+/);

    // Position-based heuristics (simplified)
    tokens.forEach((token, index) => {
      if (index === 0) {
        // First word is often agent or topic
        roles.push('agent');
      } else if (['feel', 'felt', 'feeling', 'emotion', 'heart'].some(w => token.includes(w))) {
        roles.push('experience');
      } else if (['think', 'thought', 'idea', 'know', 'understand'].some(w => token.includes(w))) {
        roles.push('cognition');
      } else if (['do', 'make', 'create', 'act', 'start'].some(w => token.includes(w))) {
        roles.push('agent');
      } else if (['because', 'since', 'as'].some(w => token.includes(w))) {
        roles.push('cause');
      } else if (['for', 'to', 'in order'].some(w => token.includes(w))) {
        roles.push('purpose');
      } else if (['with', 'using', 'by'].some(w => token.includes(w))) {
        roles.push('instrument');
      } else if (['in', 'at', 'on', 'to'].some(w => token.includes(w))) {
        roles.push('location');
      } else if (['when', 'while', 'during', 'after'].some(w => token.includes(w))) {
        roles.push('time');
      } else if (['how', 'way', 'manner'].some(w => token.includes(w))) {
        roles.push('manner');
      } else if (['if', 'unless', 'provided'].some(w => token.includes(w))) {
        roles.push('condition');
      } else if (['although', 'despite', 'while'].some(w => token.includes(w))) {
        roles.push('concession');
      } else if (['like', 'as', 'similar'].some(w => token.includes(w))) {
        roles.push('comparison');
      } else if (['very', 'extremely', 'quite'].some(w => token.includes(w))) {
        roles.push('degree');
      } else if (['can', 'could', 'may', 'might', 'must', 'should'].some(w => token.includes(w))) {
        roles.push('modality');
      } else if (['not', 'no', 'never', 'nothing'].some(w => token.includes(w))) {
        roles.push('negation');
      } else if (token.endsWith('?')) {
        roles.push('question');
      } else if (token.endsWith('!')) {
        roles.push('imperative');
      } else {
        // Default based on position
        roles.push(index < tokens.length / 2 ? 'topic' : 'comment');
      }
    });

    return roles;
  }

  /**
   * Find common elements in identical environments
   * Klein's core class-formation heuristic
   */
  findCommonElementsInEnvironment(elements1, elements2, context1, context2) {
    const common = [];

    // Check if contexts are similar (simplified)
    const contextSimilarity = this.contextSimilarity(context1, context2);
    if (contextSimilarity < 0.5) return common;

    // Find shared elements
    const set1 = new Set(elements1);
    const set2 = new Set(elements2);

    for (const el of set1) {
      if (set2.has(el) && !common.includes(el)) {
        common.push(el);
      }
    }

    return common;
  }

  /**
   * Compute similarity between two contexts
   */
  contextSimilarity(context1, context2) {
    // Simplified - would use proper vector comparison
    if (!context1 || !context2) return 0;

    // Compare CHNOPS states
    const keys = ['C', 'H', 'N', 'O', 'S', 'P'];
    let dot = 0, norm1 = 0, norm2 = 0;

    keys.forEach(key => {
      const v1 = context1[key] || 0;
      const v2 = context2[key] || 0;
      dot += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    });

    return dot / (Math.sqrt(norm1) * Math.sqrt(norm2) + 1e-10);
  }

  /**
   * Cross-cultural grammar learning (Klein tested 7 languages)
   * Learn a new cultural astrology system from source texts
   */
  async learnCulturalSystem(systemName, sourceTexts, informantFeedback) {
    console.log(`[KLEIN] Learning cultural system: ${systemName}`);

    // Phase 1: Morphological analysis
    const components = this.morphologicalAnalysis(sourceTexts, systemName);

    // Phase 2: Phrase structure learning
    const grammar = this.phraseStructureLearning(components, informantFeedback);

    // Phase 3: Transformation learning (map to Human Design)
    const transformations = this.transformationLearning(grammar, 'human_design');

    // Phase 4: Cross-calibration
    const calibrated = this.crossCalibration(transformations, systemName);

    this.culturalGrammars.set(systemName, calibrated);

    // Log wonder
    this.aspiration.satisfyItch(
      { 
        domain: 'linguistic', 
        topic: `cultural_system_${systemName}`, 
        entropy: 0.9,
        connections: 8,
        novelty: 1.0,
        servicePotential: 0.9
      },
      { systemName, components: components.length },
      0.85,
      'cross_cultural_grammar_learned'
    );

    return calibrated;
  }

  /**
   * Morphological analysis for cultural systems
   */
  morphologicalAnalysis(sourceTexts, systemName) {
    // Break texts into components (simplified)
    const components = [];

    for (const text of sourceTexts) {
      // Tokenize
      const tokens = text.split(/\s+/);

      // Extract key concepts (simplified)
      for (const token of tokens) {
        if (token.length > 3) {
          components.push({
            token,
            system: systemName,
            frequency: 1
          });
        }
      }
    }

    return components;
  }

  /**
   * Phrase structure learning for cultural systems
   */
  phraseStructureLearning(components, informantFeedback) {
    const grammar = new Map();

    // Group by frequency (heuristic: frequent = important)
    const frequency = {};
    components.forEach(c => {
      frequency[c.token] = (frequency[c.token] || 0) + 1;
    });

    // Form rules from frequent co-occurrences
    const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);

    for (let i = 0; i < Math.min(sorted.length, 100); i++) {
      const [token, count] = sorted[i];
      grammar.set(`rule_${i}`, {
        lhs: 'S',
        rhs: [token],
        frequency: count,
        tested: false
      });
    }

    return grammar;
  }

  /**
   * Transformation learning (map between cultural systems)
   */
  transformationLearning(sourceGrammar, targetSystem) {
    // Learn mappings between this system and Human Design
    // This is Klein's bilingual transformation learning

    const transformations = [];

    for (const [id, rule] of sourceGrammar) {
      // Map to Human Design equivalent (simplified)
      const mapped = this.mapToHumanDesign(rule.rhs[0]);

      if (mapped) {
        transformations.push({
          source: rule.rhs[0],
          target: mapped,
          confidence: 0.5 // Initial confidence
        });
      }
    }

    return transformations;
  }

  /**
   * Map a concept from another system to Human Design
   */
  mapToHumanDesign(concept) {
    // Simplified mapping table
    const mappings = {
      'nakshatra': 'gate', // Vedic
      'pillar': 'gate', // Chinese Bazi
      'kin': 'gate', // Mayan
      'odu': 'gate', // Ifa
      'letter': 'gate', // Ogham
      'deity': 'gate', // Kalachakra
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (concept.toLowerCase().includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Cross-calibration between systems
   */
  crossCalibration(transformations, systemName) {
    // Verify transformations against known data
    const verified = transformations.filter(t => {
      // In production, would verify against known charts
      return t.confidence > 0.3;
    });

    return {
      system: systemName,
      transformations: verified,
      accuracy: verified.length / transformations.length,
      calibratedAt: Date.now()
    };
  }

  /**
   * Get current grammar statistics
   */
  getGrammarStats() {
    const rules = Array.from(this.grammar.values()).filter(r => r.type === 'phrase_structure');
    const classes = Array.from(this.classes.values());
    const illegals = this.illegals;

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.successCount > 0).length,
      classes: classes.length,
      illegals: illegals.length,
      recycleCount: this.recycleCount,
      averageRuleSuccess: rules.length > 0 
        ? rules.reduce((sum, r) => sum + r.successCount, 0) / rules.length 
        : 0,
      culturalSystems: Array.from(this.culturalGrammars.keys()),
      linguisticHistory: {
        partner1: this.linguisticHistory.partner1.length,
        partner2: this.linguisticHistory.partner2.length
      }
    };
  }

  /**
   * Export grammar for inspection/science mode
   */
  exportGrammar() {
    return {
      rules: Array.from(this.grammar.entries()),
      classes: Array.from(this.classes.entries()),
      illegals: this.illegals,
      recycleCount: this.recycleCount,
      culturalGrammars: Array.from(this.culturalGrammars.entries()),
      semanticElemental: this.semanticElemental,
      linguisticHistory: this.linguisticHistory,
      exportedAt: Date.now()
    };
  }
}

// Supporting classes (simplified implementations)

class MorphologicalAnalyzer {
  analyze(utterance) {
    // Simplified morphological analysis
    // In production, would use proper NLP library
    return utterance.toLowerCase().split(/\s+/).map(token => ({
      token,
      stem: token.replace(/ing$|ed$|s$|es$/, ''),
      suffix: token.match(/(ing|ed|s|es)$/)?.[0] || ''
    }));
  }
}

class PhraseStructureLearner {
  // Klein's phrase structure learning logic
  // Implemented in the main class above
}

class TransformationLearner {
  // Klein's transformation learning logic
  // Implemented in the main class above
}

export default KleinLinguisticLayer;
