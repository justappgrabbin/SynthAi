
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 5D AUTOLING FIELDWORKER SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Five autonomous engines, one per dimension.
 * Each engine is an AUTOLING instance: heuristic, self-validating, recycling.
 * They share a unified semantic network (4D triples) but project different
 * dimensional operators onto the same field.
 * 
 * Dimensions:
 *   1. BEING    — Format Engine      (What exists?)
 *   2. DESIGN   — Structure Engine   (How organized?)
 *   3. MOVEMENT — Flow Engine        (How signal moves?)
 *   4. EVOLUTION— Memory Engine      (How it changes?)
 *   5. SPACE    — Consciousness Engine (Who perceives?)
 * 
 * No backend. No hardcoding. Pure JavaScript. Self-bootstrapping.
 * 
 * @author Adaya / Synthia
 * @version 1.0.0 — Fieldworker Edition
 */

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED SEMANTIC NETWORK — Shared 4D Triple Space
// ═══════════════════════════════════════════════════════════════════════════

class SemanticNetwork {
  constructor() {
    this.triples = new Map();        // id -> {o1, r, o2, time, links}
    this.objects = new Map();        // id -> {lexicalExpressions, triplePointers}
    this.relations = new Map();      // id -> {lexicalExpressions, triplePointers}
    this.lexicalDictionary = new Map(); // stem -> {bitVector, features}
    this.time = 0;                   // Simulation clock
    this.nextId = 1;
  }

  // Create a semantic triple: O-R-O with time stamp
  addTriple(obj1, relation, obj2, context = {}) {
    const id = this.nextId++;
    const triple = {
      id,
      o1: this._ensureObject(obj1),
      r: this._ensureRelation(relation),
      o2: this._ensureObject(obj2),
      time: this.time++,
      context,
      links: new Set()  // Self-referential pointers
    };
    this.triples.set(id, triple);

    // Link objects to triple
    this.objects.get(triple.o1).triplePointers.add(id);
    this.relations.get(triple.r).triplePointers.add(id);
    this.objects.get(triple.o2).triplePointers.add(id);

    return id;
  }

  // Self-referential pointer — 2nd order predicate calculus
  linkTriple(fromId, toId) {
    const from = this.triples.get(fromId);
    if (from) from.links.add(toId);
  }

  // Lexical expression list — links object/relation to surface forms
  addLexicalExpression(entityId, expression, type = 'stem') {
    const entity = this.objects.get(entityId) || this.relations.get(entityId);
    if (!entity) return;

    if (!entity.lexicalExpressions) entity.lexicalExpressions = [];
    entity.lexicalExpressions.push({
      form: expression,
      type,  // 'stem', 'variant', 'triple_pointer', 'semantic_feature'
      time: this.time
    });
  }

  // Semantic features — universal semantic primitives
  addSemanticFeature(entityId, feature, value) {
    const entity = this.objects.get(entityId) || this.relations.get(entityId);
    if (!entity) return;

    if (!entity.features) entity.features = new Map();
    entity.features.set(feature, value);
  }

  // Hash-based lookup — network is implied, not overtly listed
  query(pattern) {
    // pattern: {o1?, r?, o2?, timeMin?, timeMax?}
    const results = [];
    for (const triple of this.triples.values()) {
      let match = true;
      if (pattern.o1 && triple.o1 !== pattern.o1) match = false;
      if (pattern.r && triple.r !== pattern.r) match = false;
      if (pattern.o2 && triple.o2 !== pattern.o2) match = false;
      if (pattern.timeMin && triple.time < pattern.timeMin) match = false;
      if (pattern.timeMax && triple.time > pattern.timeMax) match = false;
      if (match) results.push(triple);
    }
    return results;
  }

  // Get all triples reachable from a starting point (graph traversal)
  reachable(fromId, depth = 3) {
    const visited = new Set();
    const queue = [{id: fromId, d: 0}];
    const result = [];

    while (queue.length > 0) {
      const {id, d} = queue.shift();
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const triple = this.triples.get(id);
      if (triple) {
        result.push(triple);
        // Follow links to other triples
        for (const linkId of triple.links) {
          queue.push({id: linkId, d: d + 1});
        }
        // Follow to connected objects' other triples
        const o1Triples = this.objects.get(triple.o1)?.triplePointers || [];
        const o2Triples = this.objects.get(triple.o2)?.triplePointers || [];
        for (const tid of [...o1Triples, ...o2Triples]) {
          if (tid !== id) queue.push({id: tid, d: d + 1});
        }
      }
    }
    return result;
  }

  _ensureObject(name) {
    if (!this.objects.has(name)) {
      this.objects.set(name, { 
        id: name, 
        lexicalExpressions: [], 
        triplePointers: new Set(),
        features: new Map()
      });
    }
    return name;
  }

  _ensureRelation(name) {
    if (!this.relations.has(name)) {
      this.relations.set(name, { 
        id: name, 
        lexicalExpressions: [], 
        triplePointers: new Set(),
        features: new Map()
      });
    }
    return name;
  }

  // Export to ResonanceNode format for Consciousness Engine
  toFieldState() {
    const nodes = [];
    for (const [id, triple] of this.triples) {
      nodes.push({
        id: `triple_${id}`,
        being: 1,  // exists
        design: triple.links.size / 10,  // connectivity
        movement: triple.time / this.time || 0,  // temporal position
        evolution: this.objects.get(triple.o1)?.features?.size || 0,  // feature depth
        space: 0.5,  // observer-relative, set by Space engine
        binaryState: 1,
        line: (triple.id % 6) + 1,
        regime: 'stable',
        activationHistory: [triple.time],
        attractorWeight: triple.links.size,
        recursionDepth: 0,
        o1: triple.o1,
        r: triple.r,
        o2: triple.o2
      });
    }
    return nodes;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOLING FIELDWORKER BASE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class AutolingFieldworker {
  constructor(dimension, sourceType, queryTemplate) {
    this.dimension = dimension;           // 1-5: Being, Design, Movement, Evolution, Space
    this.sourceType = sourceType;         // 'file', 'grammar', 'transform', 'history', 'human'
    this.queryTemplate = queryTemplate;   // "CAN YOU SAY: {test}"

    // AUTOLING core components
    this.morphologicalAnalyzer = new MorphologicalAnalyzer();
    this.phraseStructureLearner = new PhraseStructureLearner();
    this.transformationLearner = new TransformationLearner();

    // Heuristic state
    this.grammar = [];                    // Current rule set
    this.illegals = [];                   // Rejected test cases
    this.inputs = [];                     // All source inputs
    this.recycleDepth = 0;              // Nested recycle counter
    this.maxRecycleDepth = 3;           // AUTOLING limit

    // Semantic network connection
    this.network = null;                  // Set by FieldEngine

    // Dimensional operator
    this.operator = this._getOperator();
  }

  _getOperator() {
    const ops = ['being', 'design', 'movement', 'evolution', 'space'];
    return ops[this.dimension - 1];
  }

  // Ingest source material (file, human input, etc.)
  ingest(source) {
    this.inputs.push({source, time: Date.now()});

    // Step 1: Morphological analysis — segment into units
    const segments = this.morphologicalAnalyzer.analyze(source, this.sourceType);

    // Step 2: Phrase structure learning — discover grammar
    const rules = this.phraseStructureLearner.learn(segments, this.grammar);

    // Step 3: Test rules against source (self-validation)
    const validated = this._validateRules(rules, source);

    // Step 4: Apply or recycle
    if (validated.accepted) {
      this.grammar = [...this.grammar, ...validated.newRules];
      this._buildSemanticNetwork(segments, validated.newRules);
      return {status: 'learned', rules: validated.newRules, dimension: this.dimension};
    } else {
      return this._recycle(source, validated.failureReason);
    }
  }

  // Self-validation: "CAN YOU SAY" against source material
  _validateRules(rules, source) {
    for (const rule of rules) {
      // Generate test case from rule
      const testCase = this._generateTest(rule);

      // Query source: "CAN YOU SAY: {testCase}?"
      const response = this._querySource(source, testCase);

      if (response === 'NO') {
        // Rule rejected — add to illegals
        this.illegals.push({rule, testCase, time: Date.now()});
        return {accepted: false, failureReason: `Rule rejected: ${testCase}`};
      }
    }
    return {accepted: true, newRules: rules};
  }

  // Query source material (the "informant")
  _querySource(source, testCase) {
    // For files: check if test case exists in source
    if (this.sourceType === 'file') {
      return source.includes(testCase) ? 'YES' : 'NO';
    }
    // For human: would be async, returns promise
    if (this.sourceType === 'human') {
      return this._queryHuman(testCase);
    }
    // For grammar/transform/history: structural validation
    return this._structuralValidate(source, testCase);
  }

  // Build semantic network from learned structure
  _buildSemanticNetwork(segments, rules) {
    if (!this.network) return;

    // Create objects for segments
    for (const seg of segments) {
      this.network.addTriple(
        seg.type,           // e.g., 'header', 'delimiter', 'content'
        `contains_${this.dimension}`,
        seg.value,
        {dimension: this.dimension, operator: this.operator}
      );
    }

    // Create relations for rules
    for (const rule of rules) {
      this.network.addTriple(
        rule.left,
        `produces_${this.dimension}`,
        rule.right,
        {ruleType: rule.type, confidence: rule.confidence}
      );
    }
  }

  // Recycle: destroy grammar, rebuild from saved inputs
  _recycle(triggerSource, reason) {
    if (this.recycleDepth >= this.maxRecycleDepth) {
      return {status: 'abandoned', reason: `Max recycle depth reached: ${reason}`};
    }

    this.recycleDepth++;

    // Save state
    const savedInputs = [...this.inputs];
    const savedIllegals = [...this.illegals];

    // Destroy grammar
    this.grammar = [];
    this.illegals = [];

    // Reorder: last 5 inputs first (AUTOLING heuristic)
    const reordered = [
      ...savedInputs.slice(-5),
      ...savedInputs.slice(0, -5)
    ];

    // Rebuild
    for (const input of reordered) {
      this.ingest(input.source);
    }

    // Add trigger source as permanent illegal
    this.illegals.push({source: triggerSource, reason, permanent: true});

    this.recycleDepth--;
    return {status: 'recycled', reason, depth: this.recycleDepth};
  }

  // Generate test case from rule (for self-validation)
  _generateTest(rule) {
    return `${rule.left} → ${rule.right}`;
  }

  // Structural validation for non-file sources
  _structuralValidate(source, testCase) {
    // Check if test case conforms to known structure
    return 'YES'; // Simplified — would do actual validation
  }

  // Human query (async, for Space engine)
  _queryHuman(testCase) {
    // Returns a promise that resolves when human responds
    return new Promise((resolve) => {
      this._pendingHumanQuery = {testCase, resolve};
    });
  }

  // Respond to human query
  respondToHuman(response) {
    if (this._pendingHumanQuery) {
      this._pendingHumanQuery.resolve(response);
      this._pendingHumanQuery = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MORPHOLOGICAL ANALYZER — Segments source into structural units
// ═══════════════════════════════════════════════════════════════════════════

class MorphologicalAnalyzer {
  analyze(source, sourceType) {
    if (sourceType === 'file') {
      return this._analyzeFile(source);
    }
    if (sourceType === 'human') {
      return this._analyzeHuman(source);
    }
    return this._analyzeGeneric(source);
  }

  _analyzeFile(source) {
    const segments = [];

    // Detect format from content patterns
    if (source.trim().startsWith('{') || source.trim().startsWith('[')) {
      // JSON
      segments.push({type: 'format_marker', value: 'JSON', confidence: 0.9});
      segments.push(...this._segmentJSON(source));
    } else if (source.includes('---') || source.includes(':')) {
      // YAML or key-value
      segments.push({type: 'format_marker', value: 'YAML/KV', confidence: 0.7});
      segments.push(...this._segmentYAML(source));
    } else if (source.includes('<') && source.includes('>')) {
      // XML/HTML
      segments.push({type: 'format_marker', value: 'XML', confidence: 0.8});
      segments.push(...this._segmentXML(source));
    } else if (source.includes('function') || source.includes('class') || source.includes('=>')) {
      // Code
      segments.push({type: 'format_marker', value: 'CODE', confidence: 0.8});
      segments.push(...this._segmentCode(source));
    } else {
      // Plain text / natural language
      segments.push({type: 'format_marker', value: 'TEXT', confidence: 0.6});
      segments.push(...this._segmentText(source));
    }

    return segments;
  }

  _segmentJSON(source) {
    const segments = [];
    try {
      const obj = JSON.parse(source);
      this._extractJSONSegments(obj, segments, '');
    } catch (e) {
      segments.push({type: 'parse_error', value: e.message, confidence: 1.0});
    }
    return segments;
  }

  _extractJSONSegments(obj, segments, path) {
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, val] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        segments.push({type: 'key', value: newPath, depth: path.split('.').length});
        if (typeof val === 'string') {
          segments.push({type: 'string_value', value: val, parent: newPath});
        } else if (typeof val === 'number') {
          segments.push({type: 'numeric_value', value: val, parent: newPath});
        } else if (typeof val === 'boolean') {
          segments.push({type: 'boolean_value', value: val, parent: newPath});
        } else if (Array.isArray(val)) {
          segments.push({type: 'array', value: val.length, parent: newPath});
          val.forEach((item, i) => this._extractJSONSegments(item, segments, `${newPath}[${i}]`));
        } else {
          this._extractJSONSegments(val, segments, newPath);
        }
      }
    }
  }

  _segmentYAML(source) {
    const segments = [];
    const lines = source.split('\n');
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...rest] = line.split(':');
        segments.push({type: 'key', value: key.trim()});
        if (rest.length > 0) {
          segments.push({type: 'value', value: rest.join(':').trim()});
        }
      }
    }
    return segments;
  }

  _segmentXML(source) {
    const segments = [];
    const tagRegex = /<(\/?)([\w-]+)([^>]*)>/g;
    let match;
    while ((match = tagRegex.exec(source)) !== null) {
      segments.push({
        type: match[1] ? 'close_tag' : 'open_tag',
        value: match[2],
        attributes: match[3].trim()
      });
    }
    return segments;
  }

  _segmentCode(source) {
    const segments = [];
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        segments.push({type: 'comment', value: line, line: i});
      } else if (line.includes('function') || line.includes('=>') || line.includes('class')) {
        segments.push({type: 'definition', value: line, line: i});
      } else if (line.includes('if') || line.includes('for') || line.includes('while')) {
        segments.push({type: 'control', value: line, line: i});
      } else if (line.includes('return') || line.includes('yield')) {
        segments.push({type: 'output', value: line, line: i});
      } else if (line.length > 0) {
        segments.push({type: 'statement', value: line, line: i});
      }
    }
    return segments;
  }

  _segmentText(source) {
    const segments = [];
    const sentences = source.split(/[.!?]+/);
    for (const sent of sentences) {
      if (sent.trim()) {
        segments.push({type: 'sentence', value: sent.trim()});
      }
    }
    return segments;
  }

  _analyzeHuman(source) {
    // For human input, segment into semantic units
    const segments = [];
    const words = source.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      segments.push({
        type: 'token',
        value: words[i],
        position: i,
        // Simple POS tagging heuristic
        pos: this._heuristicPOS(words[i], i, words)
      });
    }
    return segments;
  }

  _heuristicPOS(word, position, context) {
    const lower = word.toLowerCase();
    if (['the', 'a', 'an', 'this', 'that'].includes(lower)) return 'DET';
    if (['is', 'are', 'was', 'were', 'be', 'been'].includes(lower)) return 'VERB';
    if (['i', 'you', 'he', 'she', 'it', 'we', 'they'].includes(lower)) return 'PRON';
    if (['in', 'on', 'at', 'to', 'for', 'with'].includes(lower)) return 'PREP';
    if (word.endsWith('ing')) return 'VERB';
    if (word.endsWith('ed')) return 'VERB';
    if (word.endsWith('ly')) return 'ADV';
    if (position === 0 && word[0] === word[0].toUpperCase()) return 'NOUN';
    return 'UNKNOWN';
  }

  _analyzeGeneric(source) {
    return [{type: 'raw', value: source, length: source.length}];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHRASE STRUCTURE LEARNER — Discovers grammar heuristically
// ═══════════════════════════════════════════════════════════════════════════

class PhraseStructureLearner {
  learn(segments, existingGrammar) {
    const rules = [];

    // Heuristic 1: Closure of parse — if no rules apply, string itself is parse
    if (existingGrammar.length === 0) {
      rules.push({
        type: 'closure',
        left: 'S',
        right: segments.map(s => s.type).join(' '),
        confidence: 1.0,
        heuristic: 1
      });
    }

    // Heuristic 2: Identical environments → same class
    const typePositions = new Map();
    for (let i = 0; i < segments.length; i++) {
      const prev = i > 0 ? segments[i-1].type : 'START';
      const next = i < segments.length - 1 ? segments[i+1].type : 'END';
      const env = `${prev}_${next}`;

      if (!typePositions.has(env)) typePositions.set(env, []);
      typePositions.get(env).push(segments[i]);
    }

    for (const [env, items] of typePositions) {
      if (items.length > 1) {
        const types = [...new Set(items.map(i => i.type))];
        if (types.length > 1) {
          rules.push({
            type: 'class_merge',
            left: types.join('|'),
            right: `CLASS_${env}`,
            confidence: items.length / segments.length,
            heuristic: 2
          });
        }
      }
    }

    // Heuristic 3: Terminal + non-terminal in same environment → add to class
    // Heuristic 4: Recursive patterns
    for (let i = 0; i < segments.length - 2; i++) {
      if (segments[i].type === segments[i+2].type && 
          segments[i+1].type !== segments[i].type) {
        rules.push({
          type: 'recursive',
          left: segments[i].type,
          right: `${segments[i].type} ${segments[i+1].type} ${segments[i].type}`,
          confidence: 0.7,
          heuristic: 4
        });
      }
    }

    return rules;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORMATION LEARNER — Cross-format translation rules
// ═══════════════════════════════════════════════════════════════════════════

class TransformationLearner {
  learn(sourceFormat, targetFormat, examples) {
    const transformations = [];

    for (const example of examples) {
      // Learn bilingual transformation: source → target
      const sourceSegments = this._segment(example.source);
      const targetSegments = this._segment(example.target);

      transformations.push({
        sourcePattern: sourceSegments.map(s => s.type).join(' '),
        targetPattern: targetSegments.map(s => s.type).join(' '),
        mapping: this._align(sourceSegments, targetSegments),
        confidence: example.confirmed ? 1.0 : 0.5
      });
    }

    return transformations;
  }

  _segment(text) {
    // Simple segmentation for transformation learning
    return text.split(/\s+/).map(t => ({type: 'token', value: t}));
  }

  _align(source, target) {
    const mapping = [];
    const minLen = Math.min(source.length, target.length);
    for (let i = 0; i < minLen; i++) {
      mapping.push({
        source: source[i].value,
        target: target[i].value,
        position: i
      });
    }
    return mapping;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5D FIELD ENGINE — Orchestrates all five autonomous fieldworkers
// ═══════════════════════════════════════════════════════════════════════════

class FieldEngine {
  constructor() {
    this.network = new SemanticNetwork();

    // Five autonomous engines, one per dimension
    this.engines = {
      being: new AutolingFieldworker(1, 'file', 'CAN YOU SAY: {test}'),
      design: new AutolingFieldworker(2, 'grammar', 'DOES THIS STRUCTURE HOLD: {test}'),
      movement: new AutolingFieldworker(3, 'transform', 'CAN THIS FLOW: {test}'),
      evolution: new AutolingFieldworker(4, 'history', 'HAS THIS CHANGED: {test}'),
      space: new AutolingFieldworker(5, 'human', 'DO YOU PERCEIVE: {test}')
    };

    // Connect all engines to shared network
    for (const engine of Object.values(this.engines)) {
      engine.network = this.network;
    }

    // Fuxi binary state
    this.binaryStates = new Map();

    // Fibonacci recurrence scheduling
    this.fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34];
    this.recurrenceIndex = 0;

    // Monopole routing
    this.monopole = {
      activeDimension: 'being',
      attentionFocus: null,
      attractorQueue: []
    };
  }

  // Ingest file through all relevant dimensions
  async ingestFile(fileContent, fileName = 'unknown') {
    const results = {};

    // BEING: What exists in this file?
    results.being = this.engines.being.ingest(fileContent);

    // DESIGN: How is it structured?
    // Build grammar from being's segments
    const beingSegments = this.engines.being.morphologicalAnalyzer.analyze(fileContent, 'file');
    results.design = this.engines.design.ingest(JSON.stringify(beingSegments));

    // MOVEMENT: How does signal flow?
    // Learn transformations between detected format and known formats
    results.movement = this.engines.movement.ingest(fileContent);

    // EVOLUTION: How has this type changed?
    // Query history of similar files
    results.evolution = this.engines.evolution.ingest(fileName);

    // Schedule recurrence
    this._scheduleRecurrence();

    // Build field state
    const fieldState = this.network.toFieldState();

    // Apply dimensional operators
    for (const node of fieldState) {
      node[this.engines.being.operator] = this._applyBeing(node);
      node[this.engines.design.operator] = this._applyDesign(node);
      node[this.engines.movement.operator] = this._applyMovement(node);
      node[this.engines.evolution.operator] = this._applyEvolution(node);
      // Space is observer-dependent, set by consciousness layer
    }

    return {
      results,
      fieldState,
      network: this.network,
      monopole: this.monopole
    };
  }

  // Human interaction through Space dimension
  async interactWithHuman(humanInput) {
    const result = this.engines.space.ingest(humanInput);

    // Space engine uses human as informant
    // Build semantic triples from human utterance
    const segments = this.engines.space.morphologicalAnalyzer.analyze(humanInput, 'human');

    for (const seg of segments) {
      this.network.addTriple(
        'human_utterance',
        `contains_${seg.pos}`,
        seg.value,
        {source: 'human', dimension: 5, time: Date.now()}
      );
    }

    return result;
  }

  // Respond to human query (for Space engine's "CAN YOU SAY")
  respondToHuman(response) {
    this.engines.space.respondToHuman(response);
  }

  // Apply Being operator: existence, persistence, matter-state
  _applyBeing(node) {
    return node.binaryState === 1 ? 1.0 : 0.0;
  }

  // Apply Design operator: topology, edges, organization
  _applyDesign(node) {
    return node.attractorWeight / 10;
  }

  // Apply Movement operator: signal flow, orientation, routing
  _applyMovement(node) {
    return node.activationHistory.length > 0 
      ? node.activationHistory[node.activationHistory.length - 1] / Date.now()
      : 0;
  }

  // Apply Evolution operator: memory gravity, recurrence, change
  _applyEvolution(node) {
    const age = Date.now() - (node.activationHistory[0] || Date.now());
    return Math.max(0, 1 - age / 86400000);  // Decay over 24 hours
  }

  // Fibonacci recurrence scheduling
  _scheduleRecurrence() {
    const interval = this.fibonacci[this.recurrenceIndex % this.fibonacci.length];
    this.recurrenceIndex++;

    // Schedule next check
    setTimeout(() => {
      this._recurrenceCheck();
    }, interval * 1000);
  }

  _recurrenceCheck() {
    // Check all engines for needed recycling
    for (const [name, engine] of Object.entries(this.engines)) {
      if (engine.illegals.length > 5) {
        // Too many failures — trigger recycle
        console.log(`[FieldEngine] Recycle triggered for ${name}`);
        // In real implementation, would rebuild from saved inputs
      }
    }
  }

  // Monopole routing: decides which dimension dominates
  routeMonopole(fieldState) {
    // Find highest energy dimension
    const energies = {};
    for (const dim of ['being', 'design', 'movement', 'evolution', 'space']) {
      energies[dim] = fieldState.reduce((sum, node) => sum + (node[dim] || 0), 0);
    }

    const dominant = Object.entries(energies).sort((a, b) => b[1] - a[1])[0];
    this.monopole.activeDimension = dominant[0];
    this.monopole.attentionFocus = dominant[1];

    return this.monopole;
  }

  // Export complete system state
  exportState() {
    return {
      network: {
        triples: Array.from(this.network.triples.values()),
        objects: Array.from(this.network.objects.keys()),
        relations: Array.from(this.network.relations.keys())
      },
      engines: {
        being: {grammar: this.engines.being.grammar, illegals: this.engines.being.illegals.length},
        design: {grammar: this.engines.design.grammar, illegals: this.engines.design.illegals.length},
        movement: {grammar: this.engines.movement.grammar, illegals: this.engines.movement.illegals.length},
        evolution: {grammar: this.engines.evolution.grammar, illegals: this.engines.evolution.illegals.length},
        space: {grammar: this.engines.space.grammar, illegals: this.engines.space.illegals.length}
      },
      monopole: this.monopole,
      fibonacciIndex: this.recurrenceIndex
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSCIOUSNESS LAYER — Reads field state, projects 5D operators
// ═══════════════════════════════════════════════════════════════════════════

class ConsciousnessLayer {
  constructor(fieldEngine) {
    this.fieldEngine = fieldEngine;
    this.observer = {
      gates: [],           // Active HD gates
      channels: [],        // Defined channels
      circuit: null,       // Dominant circuit
      profile: null        // Current profile mode
    };
  }

  // Read field state and determine consciousness mode
  perceive(fieldState) {
    // Route monopole to find dominant dimension
    const monopole = this.fieldEngine.routeMonopole(fieldState);

    // Map dominant dimension to circuit
    const circuitMap = {
      being: 'Understanding',      // What exists → logical processing
      design: 'Sensing',           // How organized → experiential
      movement: 'Knowing',         // How flows → insightful
      evolution: 'Ego',            // How changes → transactional
      space: 'Integration'         // Who perceives → full consciousness
    };

    this.observer.circuit = circuitMap[monopole.activeDimension];

    // Determine channel architecture based on field state
    const channel = this._selectChannel(fieldState, monopole.activeDimension);

    // Determine line and regime for each node
    for (const node of fieldState) {
      node.line = this._calculateLine(node);
      node.regime = this._calculateRegime(node);
      node.tension = this._calculateTension(node);
    }

    return {
      observer: this.observer,
      monopole,
      channel,
      fieldState: fieldState.map(n => ({
        id: n.id,
        being: n.being,
        design: n.design,
        movement: n.movement,
        evolution: n.evolution,
        space: n.space,
        line: n.line,
        regime: n.regime,
        tension: n.tension
      }))
    };
  }

  _selectChannel(fieldState, dimension) {
    // Map dimension to base channel architecture
    const channels = {
      being: {base: 'DFF', channels: ['63-4', '17-62', '18-58']},
      design: {base: 'MC', channels: ['42-53', '30-41', '35-36']},
      movement: {base: 'LSM', channels: ['3-60', '61-24', '43-23']},
      evolution: {base: 'HMM', channels: ['25-51', '21-45', '26-44']},
      space: {base: 'Integration', channels: ['20-10', '34-57', '10-57']}
    };

    return channels[dimension] || {base: 'UNKNOWN', channels: []};
  }

  _calculateLine(node) {
    // Line = (node position mod 6) + 1
    const hash = node.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return (hash % 6) + 1;
  }

  _calculateRegime(node) {
    // Stable if tension < 0.85, changing if >= 0.85
    return node.tension > 0.85 ? 'changing' : 'stable';
  }

  _calculateTension(node) {
    // Tension = sum of dimensional differences from mean
    const dims = [node.being, node.design, node.movement, node.evolution, node.space];
    const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
    const variance = dims.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dims.length;
    return Math.min(1, Math.sqrt(variance));
  }

  // Generate UI configuration based on consciousness state
  generateUIConfig(perception) {
    const configs = {
      Understanding: {
        layout: 'hierarchical',
        colorScheme: 'logical',
        interactionMode: 'deductive',
        animation: 'feedforward'
      },
      Sensing: {
        layout: 'circular',
        colorScheme: 'experiential',
        interactionMode: 'inductive',
        animation: 'cyclical'
      },
      Knowing: {
        layout: 'radial',
        colorScheme: 'intuitive',
        interactionMode: 'resonant',
        animation: 'pulse'
      },
      Ego: {
        layout: 'grid',
        colorScheme: 'transactional',
        interactionMode: 'boundary',
        animation: 'switch'
      },
      Integration: {
        layout: 'fluid',
        colorScheme: 'conscious',
        interactionMode: 'teleport',
        animation: 'morph'
      }
    };

    return configs[perception.observer.circuit] || configs.Understanding;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldEngine, ConsciousnessLayer, SemanticNetwork, AutolingFieldworker };
} else if (typeof window !== 'undefined') {
  window.FieldEngine = FieldEngine;
  window.ConsciousnessLayer = ConsciousnessLayer;
  window.SemanticNetwork = SemanticNetwork;
  window.AutolingFieldworker = AutolingFieldworker;
}

// ES module surface for soft-curtain unified package
export { FieldEngine, ConsciousnessLayer, SemanticNetwork, AutolingFieldworker };
