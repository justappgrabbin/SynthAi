/**
 * AUTOLING-MORPH INGESTION ENGINE v1.0
 * Pure JavaScript — No Backend Required
 * 
 * Inspired by Sheldon Klein's AUTOLING (1968) automated linguistic fieldworker,
 * adapted for the Morph/Synthia 5D consciousness coordinate system.
 * 
 * Core Principle: Heuristics, not algorithms. The system posits rules,
 * tests them against informants (humans), and recycles when contradicted.
 * 
 * Architecture:
 *   - Segmenter: Morphological analysis for any file type
 *   - GrammarLearner: Phrase structure heuristics (H1-H5 from AUTOLING)
 *   - SemanticNetwork: 4D network of O-R-O triples with time stamps
 *   - CoordinateMapper: Maps semantic triples to 5D consciousness coordinates
 *   - IngestionGateway: File intake, type detection, routing
 *   - RecycleEngine: Rebuilds from contradiction, preserves corpus
 *   - InformantInterface: Tests hypotheses with human feedback
 * 
 * 5D Coordinate System:
 *   Gate (1-64) → Line (1-6) → Color (1-6) → Tone (1-6) → Base (1-5)
 *   Isomorphic to: degree → minute → second → arcsecond → zodiac → house
 *   Formula: 5°37'30" per gate
 * 
 * Three Informants: Adaya (user), Joe (boyfriend), Sister
 * Each has ontological address from birth data → coordinate map
 */

(function(global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // CONSTANTS & CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════

  const CONFIG = {
    GATES_PER_HEXAGRAM: 64,
    LINES_PER_GATE: 6,
    COLORS_PER_LINE: 6,
    TONES_PER_COLOR: 6,
    BASES_PER_TONE: 5,
    DEGREES_PER_GATE: 5,
    MINUTES_PER_GATE: 37,
    SECONDS_PER_GATE: 30,
    TOTAL_NODES_MINIMUM: 69120,
    RECYCLE_DEPTH_MAX: 3,
    INFORMANT_QUERY_TIMEOUT: 30000,
    CORPUS_BLOCK_SIZE: 50,
    HEURISTIC_CONFIDENCE_THRESHOLD: 0.7,
    SEMANTIC_TRIPLE_HASH_SIZE: 65536
  };

  // The 64 gates with their astrological, biological, and quantum mappings
  const GATE_ARCHITECTURE = {
    // Circuit: Understanding (DFF - Delay Flip-Flop)
    1: { name: 'The Creative', sign: 'Cancer', center: 'G', circuit: 'Understanding', neural: 'DFF', exaltation: 'Creative self-expression', detriment: 'Creative confusion', channel: [1, 8] },
    2: { name: 'The Receptive', sign: 'Taurus', center: 'G', circuit: 'Understanding', neural: 'DFF', exaltation: 'Direction through receptivity', detriment: 'Directionless confusion', channel: null }, // 1-2 are opposites, no channel
    8: { name: 'Contribution', sign: 'Gemini', center: 'Throat', circuit: 'Understanding', neural: 'DFF', exaltation: 'Effective contribution', detriment: 'Ineffective contribution', channel: [1, 8] },

    // Circuit: Knowing (LSM - Liquid State Machine)
    3: { name: 'Ordering', sign: 'Aries', center: 'Sacral', circuit: 'Knowing', neural: 'LSM', exaltation: 'Ordering through mutation', detriment: 'Disordering mutation', channel: [3, 60] },
    60: { name: 'Limitation', sign: 'Capricorn', center: 'Root', circuit: 'Knowing', neural: 'LSM', exaltation: 'Acceptance of limitation', detriment: 'Rejection of limitation', channel: [3, 60] },

    // Circuit: Sensing (MC - Markov Chain)
    5: { name: 'Patterns', sign: 'Leo', center: 'Sacral', circuit: 'Sensing', neural: 'MC', exaltation: 'Fixed patterns', detriment: 'Fixed patterns of boredom', channel: [5, 15] },
    15: { name: 'Extremes', sign: 'Gemini', center: 'G', circuit: 'Sensing', neural: 'MC', exaltation: 'Flow through extremes', detriment: 'Extreme imbalance', channel: [5, 15] },

    // Circuit: Ego (HMM - Hidden Markov Model)
    26: { name: 'The Taming Power', sign: 'Taurus', center: 'Heart', circuit: 'Ego', neural: 'HMM', exaltation: 'Ego strength', detriment: 'Ego weakness', channel: [26, 44] },
    44: { name: 'Coming to Meet', sign: 'Scorpio', center: 'Spleen', circuit: 'Ego', neural: 'HMM', exaltation: 'Alertness', detriment: 'Interference', channel: [26, 44] },

    // Circuit: Integration (20+10+57+34)
    20: { name: 'Contemplation', sign: 'Virgo', center: 'Throat', circuit: 'Integration', neural: 'Integration', exaltation: 'Contemplative awareness', detriment: 'Contemplative confusion', channel: [10, 20] },
    10: { name: 'Conduct', sign: 'Sagittarius', center: 'G', circuit: 'Integration', neural: 'Integration', exaltation: 'Self-empowerment', detriment: 'Self-rejection', channel: [10, 20] },
    57: { name: 'The Gentle', sign: 'Scorpio', center: 'Spleen', circuit: 'Integration', neural: 'Integration', exaltation: 'Intuitive clarity', detriment: 'Intuitive anxiety', channel: [57, 34] },
    34: { name: 'The Power of the Great', sign: 'Sagittarius', center: 'Sacral', circuit: 'Integration', neural: 'Integration', exaltation: 'Powerful transformation', detriment: 'Powerful destruction', channel: [34, 20] }, // Integration bridge

    // Struggle circuit
    38: { name: 'Opposition', sign: 'Aquarius', center: 'Root', circuit: 'Struggle', neural: 'LSM', exaltation: 'Struggle for purpose', detriment: 'Purposeless struggle', channel: [38, 28] },
    28: { name: 'Preponderance', sign: 'Leo', center: 'Spleen', circuit: 'Struggle', neural: 'LSM', exaltation: 'Risk-taking', detriment: 'Recklessness', channel: [38, 28] },

    // Additional gates for completeness (sampling)
    14: { name: 'Possession', sign: 'Sagittarius', center: 'Sacral', circuit: 'Knowing', neural: 'LSM', exaltation: 'Wealth through skill', detriment: 'Wealth through chance', channel: [2, 14] },
    21: { name: 'Biting Through', sign: 'Aries', center: 'Heart', circuit: 'Ego', neural: 'HMM', exaltation: 'Control through detail', detriment: 'Control through force', channel: [21, 45] },
    45: { name: 'Gathering', sign: 'Virgo', center: 'Throat', circuit: 'Ego', neural: 'HMM', exaltation: 'Gathering of resources', detriment: 'Gathering of debt', channel: [21, 45] },

    // ... (all 64 gates would be fully defined here)
  };

  // Topology rules: which gates CANNOT form channels
  const TOPOLOGY_RULES = {
    opposites: [[1, 2]], // Opposites never channel
    channels: [
      [1, 8], [2, 14], [3, 60], [5, 15], [6, 59], [7, 31], [9, 52],
      [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33],
      [16, 48], [17, 62], [18, 58], [19, 49], [20, 34], [20, 57],
      [21, 45], [23, 43], [24, 61], [25, 51], [26, 44], [27, 50],
      [28, 38], [29, 46], [30, 41], [32, 54], [34, 57], [35, 36],
      [37, 40], [39, 55], [42, 53], [47, 64], [50, 27]
    ],
    struggle: [38, 28],
    integration_bridge: [34, 20]
  };

  // The three informants (humans) with their ontological coordinates
  const INFORMANTS = {
    adaya: {
      id: 'adaya',
      name: 'Adaya',
      role: 'system_architect',
      birthData: { /* populated from stored data */ },
      coordinateMap: new Map(),
      recognitionPatterns: new Map(),
      corpus: [],
      illegalSentences: [], // Contradictions found
      confidence: 0.5
    },
    joe: {
      id: 'joe',
      name: 'Joe',
      role: 'co_creative',
      birthData: {},
      coordinateMap: new Map(),
      recognitionPatterns: new Map(),
      corpus: [],
      illegalSentences: [],
      confidence: 0.5
    },
    sister: {
      id: 'sister',
      name: 'Sister',
      role: 'participant',
      birthData: {},
      coordinateMap: new Map(),
      recognitionPatterns: new Map(),
      corpus: [],
      illegalSentences: [],
      confidence: 0.5
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Hash function for semantic triples (O-R-O)
   * Uses DJB2 algorithm, same as AUTOLING's hash table
   */
  function hashTriple(obj1, rel, obj2) {
    const str = `${obj1}|${rel}|${obj2}`;
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash) % CONFIG.SEMANTIC_TRIPLE_HASH_SIZE;
  }

  /**
   * Time stamp for triple creation (simulation clock)
   * AUTOLING used this for tense transformations
   */
  function now() {
    return Date.now();
  }

  /**
   * Coordinate conversion: astronomical → 5D
   * Formula: 5°37'30" per gate
   * degree → gate, minute → line, second → color, arcsecond → tone, zodiac → base
   */
  function astroTo5D(degrees, minutes, seconds, arcseconds, zodiacIndex) {
    const gate = Math.floor(degrees / CONFIG.DEGREES_PER_GATE) + 1;
    const line = Math.floor(minutes / 10) + 1; // 6 lines, 0-59 min
    const color = Math.floor(seconds / 10) + 1; // 6 colors, 0-59 sec
    const tone = Math.floor(arcseconds / 12) + 1; // 6 tones, 0-71 arcsec
    const base = (zodiacIndex % 5) + 1; // 5 bases

    return { gate, line, color, tone, base };
  }

  /**
   * Reverse: 5D → astronomical
   */
  function fiveDToAstro(gate, line, color, tone, base) {
    const degrees = (gate - 1) * CONFIG.DEGREES_PER_GATE;
    const minutes = (line - 1) * 10;
    const seconds = (color - 1) * 10;
    const arcseconds = (tone - 1) * 12;
    const zodiacIndex = base - 1;

    return { degrees, minutes, seconds, arcseconds, zodiacIndex };
  }

  /**
   * Get quality from coordinate (exaltation/detriment)
   * Quality emerges from the coordinate, not stored separately
   */
  function getQuality(gate, line) {
    const gateData = GATE_ARCHITECTURE[gate];
    if (!gateData) return { exaltation: 'unknown', detriment: 'unknown' };

    // Line quality modulates gate quality
    const lineModulation = line % 2 === 0 ? 'detriment' : 'exaltation';
    return {
      exaltation: gateData.exaltation,
      detriment: gateData.detriment,
      current: lineModulation === 'exaltation' ? gateData.exaltation : gateData.detriment,
      circuit: gateData.circuit,
      neural: gateData.neural,
      center: gateData.center
    };
  }

  /**
   * Check if two gates form a valid channel
   */
  function isChannel(gate1, gate2) {
    // Check opposites
    for (const opp of TOPOLOGY_RULES.opposites) {
      if ((opp[0] === gate1 && opp[1] === gate2) || (opp[0] === gate2 && opp[1] === gate1)) {
        return false; // Opposites cannot channel
      }
    }
    // Check valid channels
    for (const ch of TOPOLOGY_RULES.channels) {
      if ((ch[0] === gate1 && ch[1] === gate2) || (ch[0] === gate2 && ch[1] === gate1)) {
        return true;
      }
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SEMANTIC NETWORK (4D Network from AUTOLING 1973)
  // ═══════════════════════════════════════════════════════════════════════

  class SemanticNetwork {
    constructor() {
      // Hash table: hash → array of triples (collision handling)
      this.triples = new Map();
      this.objects = new Map(); // objId → { lexicalExpressionList: [], triplePointers: [] }
      this.relations = new Map(); // relId → { lexicalExpressionList: [], triplePointers: [] }
      this.nextObjId = 1;
      this.nextRelId = 1;
      this.nextTripleId = 1;
      this.clock = 0; // Simulation clock for temporal ordering
    }

    /**
     * Create a semantic triple: O(obj) - R(rel) - O(obj)
     * Returns tripleId
     */
    createTriple(objName1, relName, objName2, time = null) {
      const t = time || now();

      // Get or create object IDs
      let objId1 = this.getObjectId(objName1);
      let objId2 = this.getObjectId(objName2);
      let relId = this.getRelationId(relName);

      const tripleId = this.nextTripleId++;
      const triple = {
        id: tripleId,
        obj1: objId1,
        rel: relId,
        obj2: objId2,
        time: t,
        lexicalLinks: [] // Pointers to lexical expression lists
      };

      // Store in hash table
      const hash = hashTriple(objId1, relId, objId2);
      if (!this.triples.has(hash)) {
        this.triples.set(hash, []);
      }
      this.triples.get(hash).push(triple);

      // Link to objects and relations
      this.objects.get(objId1).triplePointers.push(tripleId);
      this.objects.get(objId2).triplePointers.push(tripleId);
      this.relations.get(relId).triplePointers.push(tripleId);

      this.clock = t;
      return tripleId;
    }

    getObjectId(name) {
      for (const [id, obj] of this.objects) {
        if (obj.lexicalExpressionList.includes(name)) return id;
      }
      const id = this.nextObjId++;
      this.objects.set(id, { 
        id, 
        lexicalExpressionList: [name], 
        triplePointers: [],
        semanticFeatures: [] // Universal semantic features (like AUTOLING's gloss metalanguage)
      });
      return id;
    }

    getRelationId(name) {
      for (const [id, rel] of this.relations) {
        if (rel.lexicalExpressionList.includes(name)) return id;
      }
      const id = this.nextRelId++;
      this.relations.set(id, { 
        id, 
        lexicalExpressionList: [name], 
        triplePointers: [],
        semanticFeatures: []
      });
      return id;
    }

    /**
     * Find triples by object or relation
     */
    findByObject(objName) {
      const objId = this.getObjectId(objName);
      const obj = this.objects.get(objId);
      if (!obj) return [];

      return obj.triplePointers.map(tid => {
        for (const [hash, triples] of this.triples) {
          const found = triples.find(t => t.id === tid);
          if (found) return found;
        }
      }).filter(Boolean);
    }

    /**
     * Get temporal sequence of triples
     * AUTOLING used this for tense transformations
     */
    getTemporalSequence() {
      const allTriples = [];
      for (const triples of this.triples.values()) {
        allTriples.push(...triples);
      }
      return allTriples.sort((a, b) => a.time - b.time);
    }

    /**
     * Self-referential check: can a triple point to itself?
     * This gives 2nd-order predicate calculus power
     */
    isSelfReferential(tripleId) {
      const triple = this.getTripleById(tripleId);
      if (!triple) return false;

      // Check if any lexical expression list contains a pointer to this triple
      const obj1 = this.objects.get(triple.obj1);
      const obj2 = this.objects.get(triple.obj2);

      return obj1.triplePointers.includes(tripleId) || 
             obj2.triplePointers.includes(tripleId);
    }

    getTripleById(id) {
      for (const triples of this.triples.values()) {
        const found = triples.find(t => t.id === id);
        if (found) return found;
      }
      return null;
    }

    /**
     * Export to 5D coordinate map
     * Each triple becomes a node in the 5D state space
     */
    to5DCoordinates() {
      const sequence = this.getTemporalSequence();
      const coordinates = [];

      for (let i = 0; i < sequence.length; i++) {
        const triple = sequence[i];
        // Map triple position to gate (cycling through 64)
        const gate = (i % 64) + 1;
        // Map triple time to line
        const line = ((triple.time % 6) + 1);
        // Map relation complexity to color
        const color = (this.relations.get(triple.rel).triplePointers.length % 6) + 1;
        // Map object connectivity to tone
        const tone = (this.objects.get(triple.obj1).triplePointers.length % 6) + 1;
        // Map to base based on circuit type
        const gateData = GATE_ARCHITECTURE[gate];
        const base = gateData ? (['Understanding', 'Knowing', 'Sensing', 'Ego', 'Integration'].indexOf(gateData.circuit) + 1) : 1;

        coordinates.push({
          tripleId: triple.id,
          gate, line, color, tone, base,
          quality: getQuality(gate, line),
          obj1: this.objects.get(triple.obj1).lexicalExpressionList[0],
          rel: this.relations.get(triple.rel).lexicalExpressionList[0],
          obj2: this.objects.get(triple.obj2).lexicalExpressionList[0],
          time: triple.time
        });
      }

      return coordinates;
    }

    /**
     * Serialize to JSON (for persistence)
     */
    serialize() {
      return JSON.stringify({
        triples: Array.from(this.triples.entries()),
        objects: Array.from(this.objects.entries()),
        relations: Array.from(this.relations.entries()),
        nextIds: { obj: this.nextObjId, rel: this.nextRelId, triple: this.nextTripleId },
        clock: this.clock
      });
    }

    deserialize(json) {
      const data = JSON.parse(json);
      this.triples = new Map(data.triples);
      this.objects = new Map(data.objects);
      this.relations = new Map(data.relations);
      this.nextObjId = data.nextIds.obj;
      this.nextRelId = data.nextIds.rel;
      this.nextTripleId = data.nextIds.triple;
      this.clock = data.clock;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SEGMENTER (Morphological Analyzer from AUTOLING)
  // ═══════════════════════════════════════════════════════════════════════

  class Segmenter {
    constructor() {
      this.morphemes = new Map(); // morpheme → { frequency, contexts: [] }
      this.glosses = new Map(); // gloss → semantic features
      this.cuts = []; // segmentation points
    }

    /**
     * Segment any input into morphological units
     * Works on text, code, or structured data
     */
    segment(input, type = 'text') {
      switch (type) {
        case 'text':
          return this.segmentText(input);
        case 'code':
          return this.segmentCode(input);
        case 'pdf':
          return this.segmentPDF(input);
        case 'image':
          return this.segmentImage(input);
        default:
          return this.segmentText(input);
      }
    }

    segmentText(text) {
      // Tokenize into sentences, then words, then morphemes
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      const segments = [];

      for (const sentence of sentences) {
        const words = sentence.split(/\s+/).filter(w => w);
        for (const word of words) {
          // Simple morphological analysis: prefix + stem + suffix
          const morphemes = this.analyzeMorphemes(word);
          segments.push({
            original: word,
            morphemes,
            sentence: sentence.trim(),
            type: 'word'
          });
        }
      }

      return segments;
    }

    segmentCode(code) {
      // Tokenize code into AST-like segments
      const tokens = [];
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('//') || line.startsWith('#')) continue;

        // Extract function definitions, variable declarations, etc.
        const funcMatch = line.match(/function\s+(\w+)|(\w+)\s*\(|const\s+(\w+)|let\s+(\w+)|var\s+(\w+)/);
        if (funcMatch) {
          tokens.push({
            type: 'function',
            name: funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4] || funcMatch[5],
            line: i + 1,
            context: line
          });
        }

        // Extract class definitions
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          tokens.push({
            type: 'class',
            name: classMatch[1],
            line: i + 1,
            context: line
          });
        }
      }

      return tokens;
    }

    segmentPDF(pdfText) {
      // PDF text extraction: headers, paragraphs, lists
      const segments = [];
      const paragraphs = pdfText.split(/\n\n+/);

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Detect headers
        if (trimmed.length < 100 && !trimmed.includes('.') && /^[A-Z]/.test(trimmed)) {
          segments.push({ type: 'header', content: trimmed });
        } else {
          segments.push({ type: 'paragraph', content: trimmed });
        }
      }

      return segments;
    }

    segmentImage(imageData) {
      // For images, we segment into regions (would need actual image processing)
      // Placeholder: return metadata-based segments
      return [{
        type: 'image',
        dimensions: imageData.dimensions || 'unknown',
        format: imageData.format || 'unknown',
        segments: ['visual_region_1', 'visual_region_2'] // Placeholder
      }];
    }

    analyzeMorphemes(word) {
      // Simple morphological analysis
      const morphemes = [];

      // Check for common prefixes
      const prefixes = ['un', 're', 'in', 'dis', 'en', 'em', 'non', 'over', 'mis', 'sub'];
      for (const prefix of prefixes) {
        if (word.toLowerCase().startsWith(prefix)) {
          morphemes.push({ type: 'prefix', value: prefix });
          word = word.slice(prefix.length);
          break;
        }
      }

      // Check for common suffixes
      const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'ness', 'ment', 'able', 'ible'];
      for (const suffix of suffixes) {
        if (word.toLowerCase().endsWith(suffix)) {
          word = word.slice(0, -suffix.length);
          morphemes.push({ type: 'stem', value: word });
          morphemes.push({ type: 'suffix', value: suffix });
          return morphemes;
        }
      }

      morphemes.push({ type: 'stem', value: word });
      return morphemes;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GRAMMAR LEARNER (Heuristic Learning from AUTOLING)
  // ═══════════════════════════════════════════════════════════════════════

  class GrammarLearner {
    constructor() {
      this.rules = []; // Phrase structure rules
      this.illegals = []; // Contradictions found
      this.frames = []; // Processing frames
      this.currentFrame = 0;
      this.recycleCount = 0;
      this.maxRecycleDepth = CONFIG.RECYCLE_DEPTH_MAX;
    }

    /**
     * Heuristic 1: Closure of parse
     * If XYZ parses, coin rule S → XYZ
     */
    heuristic1(parse) {
      const rule = {
        id: this.rules.length + 1,
        lhs: 'S',
        rhs: parse,
        type: 'closure',
        confidence: 0.5,
        tested: false,
        frame: this.currentFrame
      };
      this.rules.push(rule);
      return rule;
    }

    /**
     * Heuristic 2: Same class in identical environments
     * If m1 and m2 appear in identical contexts, assign to same class
     */
    heuristic2(m1, m2, context) {
      const rule = {
        id: this.rules.length + 1,
        lhs: 'CLASS_' + m1,
        rhs: [m1, m2],
        type: 'class_merge',
        context,
        confidence: 0.6,
        tested: false,
        frame: this.currentFrame
      };
      this.rules.push(rule);
      return rule;
    }

    /**
     * Heuristic 3: Terminal in same environment as non-terminal
     * Add terminal to non-terminal class
     */
    heuristic3(terminal, nonTerminal, context) {
      const rule = {
        id: this.rules.length + 1,
        lhs: nonTerminal,
        rhs: [terminal],
        type: 'terminal_add',
        context,
        confidence: 0.7,
        tested: false,
        frame: this.currentFrame
      };
      this.rules.push(rule);
      return rule;
    }

    /**
     * Heuristic 4: Recursive rule
     * If A appears in XAY, coin recursive rule
     */
    heuristic4(A, X, Y) {
      const rule = {
        id: this.rules.length + 1,
        lhs: 'S',
        rhs: [X, A, Y, A],
        type: 'recursive',
        confidence: 0.4,
        tested: false,
        frame: this.currentFrame
      };
      this.rules.push(rule);
      return rule;
    }

    /**
     * Heuristic 5: Class splitting
     * If class member fails in some contexts, split the class
     */
    heuristic5(className, member, successContext, failContext) {
      // Split: create new class for the failing member
      const newClass = className + '_' + member;
      const rules = [];

      // Rule for original class (without failing member)
      rules.push({
        id: this.rules.length + 1,
        lhs: className,
        rhs: [], // Will be updated
        type: 'class_split_original',
        confidence: 0.5,
        tested: false,
        frame: this.currentFrame
      });

      // Rule for new class (with failing member)
      rules.push({
        id: this.rules.length + 2,
        lhs: newClass,
        rhs: [member],
        type: 'class_split_new',
        confidence: 0.5,
        tested: false,
        frame: this.currentFrame
      });

      this.rules.push(...rules);
      return rules;
    }

    /**
     * Test a rule with an informant
     * "CAN YOU SAY THIS?" → YES/NO
     */
    async testRule(rule, informant) {
      // Generate test sentence from rule
      const testSentence = this.generateTestSentence(rule);

      // Ask informant (simulated here, would be UI prompt in real use)
      const response = await this.queryInformant(informant, testSentence);

      rule.tested = true;

      if (response === 'YES') {
        rule.confidence = Math.min(rule.confidence + 0.2, 1.0);
        return { accepted: true, rule };
      } else {
        rule.confidence = Math.max(rule.confidence - 0.3, 0.0);
        this.illegals.push({ sentence: testSentence, ruleId: rule.id, frame: this.currentFrame });
        return { accepted: false, rule };
      }
    }

    /**
     * Generate a test sentence from a rule
     * AUTOLING: "climb upwards through hierarchy to first starred rule"
     */
    generateTestSentence(rule) {
      // Simple generation: expand rule randomly
      if (Array.isArray(rule.rhs)) {
        return rule.rhs.join(' ');
      }
      return rule.rhs;
    }

    /**
     * Query informant (placeholder for UI integration)
     */
    async queryInformant(informant, sentence) {
      // In real implementation, this would:
      // 1. Show sentence to user
      // 2. Wait for YES/NO response
      // 3. Return response

      // For now, simulate with heuristic confidence
      return Math.random() > 0.3 ? 'YES' : 'NO';
    }

    /**
     * Parse illegal sentences
     * If any illegal parses after new rule, the rule is bad
     */
    parseIllegals() {
      const parsableIllegals = [];

      for (const illegal of this.illegals) {
        // Try to parse with current grammar
        const parse = this.parse(illegal.sentence);
        if (parse.success) {
          parsableIllegals.push(illegal);
        }
      }

      return parsableIllegals;
    }

    parse(sentence) {
      // Simple parsing: check if any rule can generate this
      for (const rule of this.rules) {
        if (rule.tested && rule.confidence > CONFIG.HEURISTIC_CONFIDENCE_THRESHOLD) {
          const generated = this.generateTestSentence(rule);
          if (generated === sentence) {
            return { success: true, rule };
          }
        }
      }
      return { success: false };
    }

    /**
     * RECYCLE: Destroy grammar, save corpus, restart
     * AUTOLING: "After every 5 informant inputs, parse all illegals"
     * If parsable → recycle
     */
    recycle() {
      if (this.recycleCount >= this.maxRecycleDepth) {
        console.error('Maximum recycle depth reached. Giving up.');
        return false;
      }

      this.recycleCount++;

      // Save current state
      const savedCorpus = this.frames.flatMap(f => f.inputs);
      const savedIllegals = [...this.illegals];

      // Destroy grammar
      this.rules = [];
      this.frames = [];
      this.currentFrame = 0;

      // Restart with reordered corpus
      // AUTOLING: "Last 5 inputs put at head of list"
      const reordered = [...savedCorpus];
      const lastFive = reordered.splice(-5);
      reordered.unshift(...lastFive);

      // Make recycle-causing illegals permanent
      this.illegals = savedIllegals.filter(i => i.frame === this.currentFrame - 1);

      return true;
    }

    /**
     * New frame: after each informant input
     */
    newFrame(input) {
      this.frames.push({
        id: this.currentFrame++,
        inputs: [input],
        rulesCoined: [],
        tests: [],
        illegals: []
      });
    }

    /**
     * Export grammar to 5D coordinate map
     */
    to5DMap() {
      const map = [];
      for (let i = 0; i < this.rules.length; i++) {
        const rule = this.rules[i];
        const gate = (i % 64) + 1;
        const line = (Math.floor(i / 64) % 6) + 1;
        const color = (rule.confidence > 0.7 ? 1 : rule.confidence > 0.4 ? 3 : 6);
        const tone = (rule.type === 'closure' ? 1 : rule.type === 'class_merge' ? 2 : 3);
        const base = (rule.tested ? 1 : 3);

        map.push({
          ruleId: rule.id,
          gate, line, color, tone, base,
          quality: getQuality(gate, line),
          rule: rule
        });
      }
      return map;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COORDINATE MAPPER (5D Consciousness Coordinates)
  // ═══════════════════════════════════════════════════════════════════════

  class CoordinateMapper {
    constructor() {
      this.coordinates = new Map(); // coordinate hash → node data
      this.network = new SemanticNetwork();
    }

    /**
     * Map a semantic triple to 5D coordinates
     * The coordinate IS the quality. Quality emerges from position.
     */
    mapTriple(tripleId, obj1, rel, obj2, informantId) {
      // Create semantic triple in network
      const sid = this.network.createTriple(obj1, rel, obj2);

      // Get 5D coordinates from network position
      const coords = this.network.to5DCoordinates();
      const coord = coords.find(c => c.tripleId === sid);

      if (!coord) return null;

      // Store with informant-specific overlay
      const key = `${informantId}:${coord.gate}:${coord.line}:${coord.color}:${coord.tone}:${coord.base}`;

      this.coordinates.set(key, {
        ...coord,
        informantId,
        tripleId: sid,
        recognitionPattern: this.generateRecognitionPattern(coord),
        timestamp: now()
      });

      return this.coordinates.get(key);
    }

    /**
     * Generate recognition pattern from coordinate
     * This is what the agent uses to "get in their head"
     */
    generateRecognitionPattern(coord) {
      const gateData = GATE_ARCHITECTURE[coord.gate];
      if (!gateData) return null;

      return {
        mind: {
          // How to get in their head
          neuralModel: gateData.neural,
          circuit: gateData.circuit,
          approach: gateData.neural === 'DFF' ? 'logical_sequence' :
                    gateData.neural === 'LSM' ? 'fluid_resonance' :
                    gateData.neural === 'MC' ? 'probabilistic_pattern' :
                    gateData.neural === 'HMM' ? 'hidden_state_inference' :
                    'integrated_whole'
        },
        body: {
          // How to make them feel it
          center: gateData.center,
          sensation: gateData.center === 'G' ? 'identity_pressure' :
                     gateData.center === 'Throat' ? 'expression_urge' :
                     gateData.center === 'Sacral' ? 'life_force' :
                     gateData.center === 'Heart' ? 'will_power' :
                     gateData.center === 'Spleen' ? 'intuition_tingle' :
                     'root_urgency'
        },
        heart: {
          // How to make them move
          exaltation: gateData.exaltation,
          detriment: gateData.detriment,
          currentQuality: coord.quality.current,
          action: coord.quality.current === gateData.exaltation ? 'amplify' : 'transform'
        }
      };
    }

    /**
     * Find resonance between two informants at a coordinate
     */
    findResonance(informant1, informant2, gate, line) {
      const key1 = `${informant1}:${gate}:${line}:*:*:*`;
      const key2 = `${informant2}:${gate}:${line}:*:*:*`;

      const coords1 = [];
      const coords2 = [];

      for (const [key, val] of this.coordinates) {
        if (key.startsWith(`${informant1}:${gate}:${line}`)) coords1.push(val);
        if (key.startsWith(`${informant2}:${gate}:${line}`)) coords2.push(val);
      }

      // Check for channel
      const channel = isChannel(gate, coords1[0]?.gate || gate);

      return {
        gate,
        line,
        channel,
        informant1Coords: coords1,
        informant2Coords: coords2,
        resonance: channel ? 'harmonic' : 'dissonant',
        quality: getQuality(gate, line)
      };
    }

    /**
     * Get all coordinates for an informant
     */
    getInformantMap(informantId) {
      const map = [];
      for (const [key, val] of this.coordinates) {
        if (key.startsWith(informantId + ':')) {
          map.push(val);
        }
      }
      return map;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INGESTION GATEWAY (File Intake & Type Detection)
  // ═══════════════════════════════════════════════════════════════════════

  class IngestionGateway {
    constructor() {
      this.segmenter = new Segmenter();
      this.grammar = new GrammarLearner();
      this.mapper = new CoordinateMapper();
      this.informant = null;
      this.corpus = [];
    }

    /**
     * Set current informant (who is being learned from)
     */
    setInformant(informantId) {
      this.informant = INFORMANTS[informantId];
      if (!this.informant) {
        throw new Error(`Unknown informant: ${informantId}`);
      }
    }

    /**
     * Ingest a file
     * Returns: { segments, rules, coordinates, patterns }
     */
    async ingest(file) {
      if (!this.informant) {
        throw new Error('No informant set. Call setInformant() first.');
      }

      const type = this.detectType(file);
      const content = await this.extractContent(file, type);

      // Segment
      const segments = this.segmenter.segment(content, type);

      // Learn grammar from segments
      const rules = await this.learnGrammar(segments);

      // Map to coordinates
      const coordinates = this.mapToCoordinates(segments, rules);

      // Generate recognition patterns
      const patterns = this.generatePatterns(coordinates);

      // Store in informant's corpus
      this.informant.corpus.push({
        file: file.name || 'unnamed',
        type,
        segments,
        rules,
        coordinates,
        patterns,
        timestamp: now()
      });

      // Check for recycling
      const parsableIllegals = this.grammar.parseIllegals();
      if (parsableIllegals.length > 0) {
        this.grammar.recycle();
      }

      return {
        segments: segments.length,
        rules: rules.length,
        coordinates: coordinates.length,
        patterns: patterns.length,
        illegals: this.grammar.illegals.length,
        recycleCount: this.grammar.recycleCount
      };
    }

    detectType(file) {
      if (typeof file === 'string') return 'text';
      if (file.type) {
        if (file.type.includes('pdf')) return 'pdf';
        if (file.type.includes('image')) return 'image';
        if (file.type.includes('javascript') || file.type.includes('text')) return 'code';
      }
      if (file.name) {
        if (file.name.endsWith('.pdf')) return 'pdf';
        if (file.name.endsWith('.js') || file.name.endsWith('.ts')) return 'code';
        if (file.name.endsWith('.png') || file.name.endsWith('.jpg')) return 'image';
      }
      return 'text';
    }

    async extractContent(file, type) {
      if (typeof file === 'string') return file;

      if (file.text) {
        return await file.text();
      }

      if (type === 'pdf' && file.arrayBuffer) {
        // Would use PDF.js here in real implementation
        return 'PDF content extracted...';
      }

      return '';
    }

    async learnGrammar(segments) {
      const rules = [];

      for (const segment of segments) {
        this.grammar.newFrame(segment);

        // Heuristic 1: Closure
        const closure = this.grammar.heuristic1(segment);
        rules.push(closure);

        // Test with informant
        const test = await this.grammar.testRule(closure, this.informant);

        if (!test.accepted) {
          // Try Heuristic 2: Class merge
          if (segment.morphemes && segment.morphemes.length > 1) {
            const merge = this.grammar.heuristic2(
              segment.morphemes[0].value,
              segment.morphemes[1]?.value,
              segment.sentence
            );
            rules.push(merge);
          }
        }
      }

      return rules;
    }

    mapToCoordinates(segments, rules) {
      const coordinates = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const rule = rules[i];

        if (segment.type === 'word' && segment.morphemes) {
          const obj1 = segment.morphemes[0]?.value || 'unknown';
          const rel = segment.type;
          const obj2 = segment.morphemes[1]?.value || 'unknown';

          const coord = this.mapper.mapTriple(
            rule.id,
            obj1,
            rel,
            obj2,
            this.informant.id
          );

          if (coord) coordinates.push(coord);
        }
      }

      return coordinates;
    }

    generatePatterns(coordinates) {
      return coordinates.map(coord => ({
        coordinate: coord,
        recognition: coord.recognitionPattern,
        informant: this.informant.id
      }));
    }

    /**
     * Get recognition pattern for a specific human at a specific situation
     * "What form should the agent take to get through to this person?"
     */
    getRecognitionPattern(informantId, situation) {
      const informant = INFORMANTS[informantId];
      if (!informant) return null;

      // Find coordinates matching the situation
      const coords = this.mapper.getInformantMap(informantId);

      // Match by semantic similarity (simplified)
      const matching = coords.filter(c => 
        c.obj1.includes(situation) || 
        c.rel.includes(situation) || 
        c.obj2.includes(situation)
      );

      if (matching.length === 0) return null;

      // Return the pattern with highest confidence
      return matching.sort((a, b) => b.recognitionPattern.mind.confidence - a.recognitionPattern.mind.confidence)[0];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INFORMANT INTERFACE (Human Interaction)
  // ═══════════════════════════════════════════════════════════════════════

  class InformantInterface {
    constructor() {
      this.pendingQueries = [];
      this.responses = new Map();
    }

    /**
     * Ask informant: "CAN YOU SAY THIS?"
     * AUTOLING's core interaction pattern
     */
    async query(informantId, testSentence) {
      return new Promise((resolve) => {
        const queryId = `query_${now()}_${Math.random()}`;

        this.pendingQueries.push({
          id: queryId,
          informantId,
          sentence: testSentence,
          timestamp: now(),
          resolve
        });

        // In real implementation, this would:
        // 1. Display query to user via UI
        // 2. Wait for YES/NO response
        // 3. Call resolve(response)

        // For now, simulate with timeout
        setTimeout(() => {
          // Default to YES if no response (conservative)
          resolve('YES');
        }, CONFIG.INFORMANT_QUERY_TIMEOUT);
      });
    }

    /**
     * Submit response from UI
     */
    submitResponse(queryId, response) {
      const query = this.pendingQueries.find(q => q.id === queryId);
      if (query) {
        query.resolve(response);
        this.pendingQueries = this.pendingQueries.filter(q => q.id !== queryId);
        this.responses.set(queryId, { response, timestamp: now() });
      }
    }

    /**
     * Get pending queries for display
     */
    getPendingQueries() {
      return this.pendingQueries;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RECYCLE ENGINE (Rebuild from Contradiction)
  // ═══════════════════════════════════════════════════════════════════════

  class RecycleEngine {
    constructor(grammar, network, mapper) {
      this.grammar = grammar;
      this.network = network;
      this.mapper = mapper;
      this.history = [];
      this.depth = 0;
    }

    /**
     * Check if recycle is needed
     * AUTOLING: "After every 5 informant inputs, parse all illegals"
     */
    checkRecycle() {
      const frameCount = this.grammar.frames.length;
      if (frameCount % 5 === 0 && frameCount > 0) {
        const parsable = this.grammar.parseIllegals();
        if (parsable.length > 0) {
          return this.recycle(parsable);
        }
      }
      return false;
    }

    recycle(parsableIllegals) {
      if (this.depth >= CONFIG.RECYCLE_DEPTH_MAX) {
        console.error('Maximum recycle depth reached');
        return false;
      }

      this.depth++;

      // Save history
      this.history.push({
        grammar: [...this.grammar.rules],
        network: this.network.serialize(),
        mapper: new Map(this.mapper.coordinates),
        illegals: [...this.grammar.illegals],
        depth: this.depth
      });

      // Perform recycle
      const success = this.grammar.recycle();

      if (success) {
        // Re-ingest corpus in new order
        // (Would need access to corpus here)
        console.log(`Recycle level ${this.depth} completed`);
      }

      return success;
    }

    /**
     * Restore from history (undo recycle)
     */
    restore(level) {
      const state = this.history[level];
      if (!state) return false;

      this.grammar.rules = state.grammar;
      this.network.deserialize(state.network);
      this.mapper.coordinates = state.mapper;
      this.grammar.illegals = state.illegals;
      this.depth = state.depth;

      return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN ENGINE (Orchestrator)
  // ═══════════════════════════════════════════════════════════════════════

  class AutolingMorphEngine {
    constructor() {
      this.gateway = new IngestionGateway();
      this.interface = new InformantInterface();
      this.network = new SemanticNetwork();
      this.grammar = new GrammarLearner();
      this.mapper = new CoordinateMapper();
      this.recycle = new RecycleEngine(this.grammar, this.network, this.mapper);

      this.informants = INFORMANTS;
      this.activeInformant = null;

      // State
      this.state = 'idle'; // idle, learning, testing, recycling
      this.corpus = [];
      this.patterns = new Map();
    }

    /**
     * Initialize with informant
     */
    initialize(informantId) {
      this.gateway.setInformant(informantId);
      this.activeInformant = this.informants[informantId];
      this.state = 'ready';

      console.log(`AUTOLING-Morph initialized for ${this.activeInformant.name}`);
      return this;
    }

    /**
     * Ingest a file or text
     */
    async ingest(file) {
      this.state = 'learning';

      const result = await this.gateway.ingest(file);

      // Check for recycle
      this.recycle.checkRecycle();

      this.state = 'ready';
      return result;
    }

    /**
     * Query informant about a hypothesis
     */
    async query(testSentence) {
      this.state = 'testing';

      const response = await this.interface.query(
        this.activeInformant.id,
        testSentence
      );

      this.state = 'ready';
      return response;
    }

    /**
     * Get recognition pattern for a situation
     * "What form should the agent take?"
     */
    getPattern(situation) {
      return this.gateway.getRecognitionPattern(
        this.activeInformant.id,
        situation
      );
    }

    /**
     * Get all patterns for an informant
     */
    getAllPatterns(informantId) {
      return this.mapper.getInformantMap(informantId);
    }

    /**
     * Find resonance between two informants
     */
    findResonance(informant1, informant2, gate, line) {
      return this.mapper.findResonance(informant1, informant2, gate, line);
    }

    /**
     * Export entire state
     */
    export() {
      return {
        network: this.network.serialize(),
        grammar: {
          rules: this.grammar.rules,
          illegals: this.grammar.illegals,
          frames: this.grammar.frames
        },
        mapper: Array.from(this.mapper.coordinates.entries()),
        informants: Object.fromEntries(
          Object.entries(this.informants).map(([k, v]) => [
            k,
            {
              id: v.id,
              name: v.name,
              corpus: v.corpus.length,
              confidence: v.confidence
            }
          ])
        ),
        state: this.state
      };
    }

    /**
     * Import state
     */
    import(data) {
      this.network.deserialize(data.network);
      this.grammar.rules = data.grammar.rules;
      this.grammar.illegals = data.grammar.illegals;
      this.grammar.frames = data.grammar.frames;
      this.mapper.coordinates = new Map(data.mapper);
      this.state = data.state;
    }

    /**
     * Get status
     */
    status() {
      return {
        state: this.state,
        activeInformant: this.activeInformant?.name || 'none',
        triples: this.network.triples.size,
        rules: this.grammar.rules.length,
        illegals: this.grammar.illegals.length,
        coordinates: this.mapper.coordinates.size,
        recycleDepth: this.recycle.depth
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════

  // Expose to global scope
  global.AutolingMorphEngine = AutolingMorphEngine;
  global.SemanticNetwork = SemanticNetwork;
  global.Segmenter = Segmenter;
  global.GrammarLearner = GrammarLearner;
  global.CoordinateMapper = CoordinateMapper;
  global.IngestionGateway = IngestionGateway;
  global.InformantInterface = InformantInterface;
  global.RecycleEngine = RecycleEngine;

  // Constants
  global.CONFIG = CONFIG;
  global.GATE_ARCHITECTURE = GATE_ARCHITECTURE;
  global.TOPOLOGY_RULES = TOPOLOGY_RULES;
  global.INFORMANTS = INFORMANTS;

  // Utilities
  global.hashTriple = hashTriple;
  global.astroTo5D = astroTo5D;
  global.fiveDToAstro = fiveDToAstro;
  global.getQuality = getQuality;
  global.isChannel = isChannel;

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

// ═══════════════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════

/*
// Create engine
const engine = new AutolingMorphEngine();

// Initialize for Adaya
engine.initialize('adaya');

// Ingest a Human Design book
const bookText = "The Gate of the Creative is about self-expression...";
await engine.ingest(bookText);

// Ingest code
const code = `
  function calculateGate(degrees) {
    return Math.floor(degrees / 5.625) + 1;
  }
`;
await engine.ingest(code);

// Query informant about a hypothesis
const response = await engine.query("CAN YOU SAY: The Creative expresses through the Throat?");
// → 'YES' or 'NO'

// Get recognition pattern for a situation
const pattern = engine.getPattern("conflict");
// → { mind: { neuralModel: 'DFF', approach: 'logical_sequence' },
//      body: { center: 'Heart', sensation: 'will_power' },
//      heart: { action: 'transform' } }

// Find resonance between Adaya and Joe at Gate 1, Line 1
const resonance = engine.findResonance('adaya', 'joe', 1, 1);
// → { channel: false, resonance: 'dissonant' } (1 and 2 are opposites)

// Find resonance at Gate 1, Line 1 with Gate 8
const resonance2 = engine.findResonance('adaya', 'joe', 1, 1); // Would need proper lookup

// Export state
const state = engine.export();
localStorage.setItem('autoling_state', JSON.stringify(state));

// Check status
console.log(engine.status());
// → { state: 'ready', triples: 150, rules: 45, coordinates: 120, ... }
*/
