// ============================================================
// HUB 1: AUTOLING - Parser & Semantic Pipeline
// Based on Sheldon Klein's 1968 UWCS Tech Report #43
// "The AUTOLING System: An Automated Linguistic Fieldworker"
// Modernized: Semantic parsing, structured extraction, pipeline orchestration
// ============================================================
// ============================================================
// AUTOLING ENGINE - The Core Parser
// ============================================================
export class AutolingEngine {
    grammar = [];
    transformations = [];
    morphologicalRules = new Map();
    frame = 0;
    illegalSet = [];
    recycleDepth = 0;
    maxRecycleDepth = 3;
    savedStates = new Map();
    featureVectors = new Map();
    // Klein's heuristic counters
    heuristicCounters = {
        h1: 0, h2: 0, h3: 0, h4: 0, h5: 0
    };
    constructor() {
        console.log('[AUTOLING] Initialized - Sheldon Klein inspired linguistic fieldworker');
    }
    // ============================================================
    // MORPHOLOGICAL ANALYZER (Klein Section 2.0)
    // ============================================================
    async analyzeMorphology(input) {
        // Klein's approach: distributional analysis with feature vectors
        // Primary/secondary gloss distinction
        // Allomorph grouping
        // Morphophonemic rule derivation
        const segments = this.segmentInput(input);
        const morphemes = [];
        for (const segment of segments) {
            const features = this.extractFeatures(segment);
            const isPrimary = this.isPrimaryGloss(segment, features);
            morphemes.push({
                segment,
                gloss: this.generateGloss(segment, features),
                features,
                isAllomorph: this.detectAllomorph(segment, morphemes),
                primaryGloss: isPrimary,
                secondaryGloss: !isPrimary,
            });
        }
        return {
            morphemes,
            segmentationAlgorithm: this.deriveSegmentationAlgorithm(segments),
            confidence: this.calculateMorphologicalConfidence(morphemes)
        };
    }
    segmentInput(input) {
        // Klein's segmentation: spaces between morphological units
        // With heuristic over-cutting detection and recombination
        const basic = input.split(/\s+/).filter(Boolean);
        // Detect over-cutting (what should be single morpheme split into two)
        const recombined = this.recombineOvercuts(basic);
        return recombined;
    }
    extractFeatures(segment) {
        // Boolean feature vectors - Klein's core representation
        const features = {};
        // Person features
        features['1st_person'] = /^(I|me|my|we|us|our)$/i.test(segment);
        features['2nd_person'] = /^(you|your|yours)$/i.test(segment);
        features['3rd_person'] = /^(he|she|it|they|him|her|them|his|her|its|their)$/i.test(segment);
        // Number features
        features['singular'] = /^(I|you|he|she|it|me|him|her)$/i.test(segment);
        features['plural'] = /^(we|they|us|them)$/i.test(segment);
        // Tense features
        features['present'] = /^(eat|run|walk|talk|is|are|am)$/i.test(segment);
        features['past'] = /^(ate|ran|walked|talked|was|were)$/i.test(segment);
        // Animacy
        features['animate'] = /^(I|you|he|she|we|they|man|woman|dog|cat)$/i.test(segment);
        features['human'] = /^(I|you|he|she|we|they|man|woman|person)$/i.test(segment);
        // POS features
        features['noun'] = /^(the|a|an)\s+\w+$/i.test(`the ${segment}`) ||
            /^(man|woman|dog|cat|fish|book|table|car|house|tree)$/i.test(segment);
        features['verb'] = /^(eat|run|walk|talk|read|write|sleep|think|love|hate|is|are|am|was|were)$/i.test(segment);
        features['determiner'] = /^(the|a|an|this|that|these|those)$/i.test(segment);
        features['adjective'] = /^(big|small|red|blue|happy|sad|good|bad|old|new)$/i.test(segment);
        features['adverb'] = /^(quickly|slowly|happily|sadly|very|quite|rather)$/i.test(segment);
        features['preposition'] = /^(in|on|at|by|with|from|to|for|of|about)$/i.test(segment);
        return features;
    }
    generateGloss(segment, features) {
        const activeFeatures = Object.entries(features)
            .filter(([_, v]) => v)
            .map(([k, _]) => k);
        return activeFeatures.join(', ');
    }
    isPrimaryGloss(segment, features) {
        // Primary glosses are uniquely associated features (like 1st person for "I")
        const uniqueAssociations = ['1st_person', '2nd_person', '3rd_person'];
        return uniqueAssociations.some(f => features[f]);
    }
    detectAllomorph(segment, existing) {
        // Check if this segment shares features with an existing morpheme
        const features = this.extractFeatures(segment);
        return existing.some(m => {
            const mFeatures = m.features;
            const overlap = Object.keys(features).filter(k => features[k] && mFeatures[k]);
            return overlap.length > 2; // Significant feature overlap
        });
    }
    recombineOvercuts(segments) {
        // Klein's over-cutting detection: what should be single morpheme
        // Heuristic: if adjacent segments share all features, recombine
        const result = [];
        let i = 0;
        while (i < segments.length) {
            if (i < segments.length - 1) {
                const combined = segments[i] + segments[i + 1];
                const f1 = this.extractFeatures(segments[i]);
                const f2 = this.extractFeatures(segments[i + 1]);
                const fCombined = this.extractFeatures(combined);
                // If combined has more coherent features, recombine
                const coherence1 = Object.values(f1).filter(Boolean).length;
                const coherence2 = Object.values(f2).filter(Boolean).length;
                const coherenceCombined = Object.values(fCombined).filter(Boolean).length;
                if (coherenceCombined > coherence1 + coherence2 - 2) {
                    result.push(combined);
                    i += 2;
                    continue;
                }
            }
            result.push(segments[i]);
            i++;
        }
        return result;
    }
    deriveSegmentationAlgorithm(segments) {
        return `distributional-cut(${segments.length}-segments)`;
    }
    calculateMorphologicalConfidence(morphemes) {
        const totalFeatures = morphemes.reduce((sum, m) => sum + Object.values(m.features).filter(Boolean).length, 0);
        return Math.min(totalFeatures / (morphemes.length * 5), 1.0);
    }
    // ============================================================
    // PHRASE STRUCTURE HEURISTIC LEARNING (Klein Section 3.0)
    // ============================================================
    async learnPhraseStructure(sentence) {
        this.frame++;
        console.log(`[AUTOLING] Frame ${this.frame}: Learning from "${sentence}"`);
        const tokens = sentence.split(/\s+/).filter(Boolean);
        const parse = this.multiPathParse(tokens);
        if (parse.complete) {
            console.log(`[AUTOLING] PARSED OK - Frame ${this.frame}`);
            return this.grammar;
        }
        // Apply Klein's heuristics 1-5
        const newRules = this.applyHeuristics(parse.incompleteTopNodes, tokens);
        // Test each new rule via substitution
        for (const rule of newRules) {
            await this.testRule(rule);
        }
        // Parse illegals from all frames (Klein: after every 5 inputs)
        if (this.frame % 5 === 0) {
            await this.parseAllIllegals();
        }
        return this.grammar;
    }
    multiPathParse(tokens) {
        // Klein's multi-path parser: yields all possible parses
        // If no complete parse, return incomplete parse top nodes ordered by uncombined nodes
        const parses = [];
        // Try to parse with current grammar
        const result = this.attemptParse(tokens);
        if (result.complete) {
            return { complete: true, incompleteTopNodes: [] };
        }
        // Return incomplete parse top nodes
        const topNodes = result.partialTrees.map((tree) => ({
            topNode: tree.top,
            uncombinedNodes: tree.uncombined,
            depth: tree.depth
        }));
        // Order by number of uncombined nodes (fewer = better)
        topNodes.sort((a, b) => a.uncombinedNodes - b.uncombinedNodes);
        return { complete: false, incompleteTopNodes: topNodes };
    }
    attemptParse(tokens) {
        // Simplified parsing with current grammar
        // In full implementation: recursive descent with backtracking
        let canParse = false;
        for (const rule of this.grammar) {
            if (rule.isSentenceRule && this.ruleMatches(rule, tokens)) {
                canParse = true;
                break;
            }
        }
        if (canParse) {
            return { complete: true, partialTrees: [] };
        }
        // Return partial tree if no complete parse
        return {
            complete: false,
            partialTrees: [{ top: 'S', uncombined: tokens.length, depth: 0 }]
        };
    }
    ruleMatches(rule, tokens) {
        // Check if rule RHS matches token sequence
        // Simplified: exact match for now
        return rule.rhs.join(' ') === tokens.join(' ');
    }
    applyHeuristics(topNodes, tokens) {
        const newRules = [];
        // Heuristic 1: Closure of parse (always applies to first input or when no rules apply)
        if (this.grammar.length === 0 || topNodes.length === 0) {
            this.heuristicCounters.h1++;
            const rule = {
                lhs: `S_${this.heuristicCounters.h1}`,
                rhs: tokens,
                isSentenceRule: true,
                isContextSensitive: false,
                testHistory: [],
                confidence: 0.5
            };
            this.grammar.push(rule);
            newRules.push(rule);
            console.log(`[AUTOLING] H1 coined: ${rule.lhs} -> ${rule.rhs.join(' ')}`);
            return newRules;
        }
        // Heuristic 2: Two single morphemes in identical environments -> same class
        const h2Rules = this.applyHeuristic2(topNodes, tokens);
        newRules.push(...h2Rules);
        // Heuristic 3: Terminal + non-terminal in identical environment -> add morpheme to class
        const h3Rules = this.applyHeuristic3(topNodes, tokens);
        newRules.push(...h3Rules);
        // Heuristic 4: Two strings of non-terminals in identical environments -> same class
        const h4Rules = this.applyHeuristic4(topNodes, tokens);
        newRules.push(...h4Rules);
        // Heuristic 5: Class splitting for morphemes with overlapping features
        const h5Rules = this.applyHeuristic5(topNodes, tokens);
        newRules.push(...h5Rules);
        return newRules;
    }
    applyHeuristic2(topNodes, tokens) {
        const rules = [];
        // Find two single morphemes in identical environments
        for (let i = 0; i < tokens.length - 1; i++) {
            for (let j = i + 1; j < tokens.length; j++) {
                const env1 = tokens.slice(0, i).concat(tokens.slice(i + 1));
                const env2 = tokens.slice(0, j).concat(tokens.slice(j + 1));
                if (JSON.stringify(env1) === JSON.stringify(env2)) {
                    this.heuristicCounters.h2++;
                    const className = `Class_${this.heuristicCounters.h2}`;
                    const rule = {
                        lhs: className,
                        rhs: [tokens[i], tokens[j]],
                        isSentenceRule: false,
                        isContextSensitive: false,
                        testHistory: [],
                        confidence: 0.6
                    };
                    this.grammar.push(rule);
                    rules.push(rule);
                }
            }
        }
        return rules;
    }
    applyHeuristic3(topNodes, tokens) {
        // Terminal + non-terminal in identical environment
        // Add morpheme to non-terminal class
        const rules = [];
        // Implementation depends on existing grammar state
        return rules;
    }
    applyHeuristic4(topNodes, tokens) {
        // Two strings of non-terminals in identical environments
        const rules = [];
        return rules;
    }
    applyHeuristic5(topNodes, tokens) {
        // Class splitting for morphemes
        const rules = [];
        return rules;
    }
    async testRule(rule) {
        // Klein's rule testing: substitution + test sentence generation
        // "CAN YOU SAY: [test sentence]"
        const testSentence = this.generateTestSentence(rule);
        console.log(`[AUTOLING] CAN YOU SAY: ${testSentence}`);
        // In real implementation: query informant/semantic validator
        // For now: simulate with feature consistency check
        const accepted = this.validateTestSentence(testSentence, rule);
        rule.testHistory.push({
            accepted,
            frame: this.frame
        });
        if (!accepted) {
            this.illegalSet.push(testSentence);
        }
        rule.confidence = rule.testHistory.filter(h => h.accepted).length / rule.testHistory.length;
    }
    generateTestSentence(rule) {
        // Generate a test sentence by substituting the new class into existing rules
        // Climb to first starred rule that might yield the test rule in generation path
        const sentenceRules = this.grammar.filter(r => r.isSentenceRule);
        if (sentenceRules.length === 0) {
            return rule.rhs.join(' ');
        }
        // Random downward generation with forced choice
        const testRule = sentenceRules[0];
        return testRule.rhs.join(' ');
    }
    validateTestSentence(sentence, rule) {
        // Feature consistency check
        const tokens = sentence.split(/\s+/);
        const features = tokens.map(t => this.extractFeatures(t));
        // Check for contradictions in feature vectors
        for (let i = 0; i < features.length - 1; i++) {
            const f1 = features[i];
            const f2 = features[i + 1];
            // Detect impossible combinations (e.g., singular + plural verb)
            if (f1['singular'] && f2['plural'] && f2['verb']) {
                return false;
            }
        }
        return true;
    }
    async parseAllIllegals() {
        console.log(`[AUTOLING] Parsing illegals from all frames...`);
        for (const illegal of this.illegalSet) {
            const tokens = illegal.split(/\s+/);
            const parse = this.multiPathParse(tokens);
            if (parse.complete) {
                // Bad rule slipped through! Enter recycle mode
                console.log(`[AUTOLING] ILLEGAL PARSED: "${illegal}" - Entering recycle mode`);
                await this.recycle();
                break;
            }
        }
    }
    async recycle() {
        if (this.recycleDepth >= this.maxRecycleDepth) {
            console.log('[AUTOLING] MAX RECYCLE DEPTH REACHED - Giving up on analysis');
            return;
        }
        this.recycleDepth++;
        console.log(`[AUTOLING] RECYCLE MODE (depth ${this.recycleDepth})`);
        // Destroy entire grammar
        const savedInputs = this.grammar.map(r => r.rhs.join(' '));
        this.grammar = [];
        // Reorder: last 5 inputs at head
        const reordered = [...savedInputs.slice(-5), ...savedInputs.slice(0, -5)];
        // Reprocess
        for (const input of reordered) {
            await this.learnPhraseStructure(input);
        }
        this.recycleDepth--;
    }
    // ============================================================
    // TRANSFORMATION LEARNING (Klein Section 4.0)
    // ============================================================
    async learnTransformation(sourceTree, targetString) {
        // Bottom-to-top or top-to-bottom transformation learning
        // Maps semantic structures to syntactic units
        const rule = {
            id: `T_${this.transformations.length + 1}`,
            sourcePattern: this.serializeTree(sourceTree),
            targetPattern: targetString,
            context: '',
            isBilingual: false,
            isMonolingual: true,
            testHistory: [],
            generality: 0,
            status: 'provisional'
        };
        // Find common elements between source and target
        const commonElements = this.findCommonElements(sourceTree, targetString);
        rule.generality = commonElements.length;
        // Test with increasingly general forms
        await this.testTransformation(rule);
        this.transformations.push(rule);
        return rule;
    }
    serializeTree(tree) {
        // Convert tree to string representation
        const root = tree.nodes.get(tree.root);
        if (!root)
            return '';
        return this.serializeNode(tree, tree.root);
    }
    serializeNode(tree, nodeId) {
        const node = tree.nodes.get(nodeId);
        if (!node)
            return '';
        if (node.children.length === 0) {
            return node.surface;
        }
        const children = node.children.map(c => this.serializeNode(tree, c)).join(' ');
        return `${node.lemma}(${children})`;
    }
    findCommonElements(tree, target) {
        const common = [];
        const targetTokens = new Set(target.split(/\s+/));
        for (const [_, node] of tree.nodes) {
            if (targetTokens.has(node.surface)) {
                common.push(node.surface);
            }
        }
        return common;
    }
    async testTransformation(rule) {
        // Generate test cases with varying generality
        const testCases = this.generateTransformationTests(rule);
        for (const test of testCases) {
            const accepted = this.validateTransformation(test, rule);
            rule.testHistory.push({ sentence: test, accepted, frame: this.frame });
            if (!accepted) {
                // Retreat in generality
                rule.generality--;
            }
        }
        rule.status = rule.testHistory.every(h => h.accepted) ? 'confirmed' : 'provisional';
    }
    generateTransformationTests(rule) {
        // Generate test sentences with varying specificity
        return [
            rule.targetPattern,
            // More general versions...
        ];
    }
    validateTransformation(sentence, rule) {
        // Check if transformation preserves semantic structure
        return true; // Simplified
    }
    // ============================================================
    // SEMANTIC PARSING (Modern Extension)
    // ============================================================
    async parseSemantic(input) {
        const morphAnalysis = await this.analyzeMorphology(input);
        const tokens = input.split(/\s+/).filter(Boolean);
        const tree = {
            root: 'SENT',
            nodes: new Map(),
            edges: [],
            illegalSet: [],
            frame: this.frame
        };
        // Build semantic network with Boolean feature vectors
        for (let i = 0; i < tokens.length; i++) {
            const token = {
                id: `t_${i}`,
                surface: tokens[i],
                lemma: tokens[i].toLowerCase(),
                pos: this.inferPOS(tokens[i]),
                features: this.extractFeatures(tokens[i]),
                depth: 0,
                children: [],
                gloss: morphAnalysis.morphemes[i]?.gloss || '',
                confidence: morphAnalysis.morphemes[i] ? 0.8 : 0.5,
                ambiguityScore: this.calculateAmbiguity(tokens[i])
            };
            tree.nodes.set(token.id, token);
            if (i > 0) {
                tree.edges.push({
                    from: `t_${i - 1}`,
                    to: `t_${i}`,
                    label: 'next'
                });
            }
        }
        // Build hierarchical structure
        this.buildHierarchy(tree);
        return tree;
    }
    inferPOS(token) {
        const features = this.extractFeatures(token);
        if (features['noun'])
            return 'NOUN';
        if (features['verb'])
            return 'VERB';
        if (features['determiner'])
            return 'DET';
        if (features['adjective'])
            return 'ADJ';
        if (features['adverb'])
            return 'ADV';
        if (features['preposition'])
            return 'PREP';
        return 'UNKNOWN';
    }
    calculateAmbiguity(token) {
        const features = this.extractFeatures(token);
        const activeCount = Object.values(features).filter(Boolean).length;
        // More active features = more ambiguous (can be multiple things)
        return Math.min(activeCount / 3, 1.0);
    }
    buildHierarchy(tree) {
        // Build constituency structure from flat token sequence
        // Group adjacent tokens into phrases
        const tokens = Array.from(tree.nodes.values());
        // Simple NP chunking: DET + (ADJ)* + NOUN
        let i = 0;
        while (i < tokens.length) {
            if (tokens[i].pos === 'DET') {
                const npStart = i;
                i++;
                while (i < tokens.length && (tokens[i].pos === 'ADJ' || tokens[i].pos === 'NOUN')) {
                    i++;
                }
                if (i > npStart + 1) {
                    // Create NP node
                    const npId = `NP_${npStart}`;
                    const npNode = {
                        id: npId,
                        surface: tokens.slice(npStart, i).map(t => t.surface).join(' '),
                        lemma: 'NP',
                        pos: 'NP',
                        features: {},
                        depth: 1,
                        children: tokens.slice(npStart, i).map(t => t.id),
                        gloss: 'noun phrase',
                        confidence: 0.7,
                        ambiguityScore: 0.3
                    };
                    tree.nodes.set(npId, npNode);
                    for (let j = npStart; j < i; j++) {
                        tokens[j].parent = npId;
                        tokens[j].depth = 2;
                    }
                }
            }
            else {
                i++;
            }
        }
    }
    // ============================================================
    // PIPELINE ORCHESTRATION
    // ============================================================
    async runPipeline(input) {
        console.log(`[AUTOLING] Running full pipeline on: "${input}"`);
        // Step 1: Morphological analysis
        const morphology = await this.analyzeMorphology(input);
        // Step 2: Phrase structure learning
        const grammar = await this.learnPhraseStructure(input);
        // Step 3: Semantic parsing
        const parseTree = await this.parseSemantic(input);
        // Step 4: Feature vector propagation (bidirectional inheritance)
        this.propagateFeatures(parseTree);
        return {
            morphology,
            grammar,
            parseTree,
            frame: this.frame,
            confidence: this.calculateOverallConfidence(parseTree)
        };
    }
    propagateFeatures(tree) {
        // Klein's bidirectional feature inheritance
        // Features propagate up and down the tree
        const nodes = Array.from(tree.nodes.values());
        // Bottom-up: children -> parent
        for (const node of nodes) {
            if (node.children.length > 0) {
                for (const childId of node.children) {
                    const child = tree.nodes.get(childId);
                    if (child) {
                        // Merge features upward
                        for (const [key, value] of Object.entries(child.features)) {
                            if (value && !node.features[key]) {
                                node.features[key] = true;
                            }
                        }
                    }
                }
            }
        }
        // Top-down: parent -> children
        for (const node of nodes) {
            if (node.parent) {
                const parent = tree.nodes.get(node.parent);
                if (parent) {
                    for (const [key, value] of Object.entries(parent.features)) {
                        if (value && !node.features[key]) {
                            node.features[key] = true;
                        }
                    }
                }
            }
        }
    }
    calculateOverallConfidence(tree) {
        const nodes = Array.from(tree.nodes.values());
        if (nodes.length === 0)
            return 0;
        const avgConfidence = nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length;
        return avgConfidence;
    }
    // ============================================================
    // STATE MANAGEMENT
    // ============================================================
    saveState(slot) {
        this.savedStates.set(slot, {
            grammar: [...this.grammar],
            transformations: [...this.transformations],
            frame: this.frame,
            illegalSet: [...this.illegalSet],
            heuristicCounters: { ...this.heuristicCounters }
        });
        console.log(`[AUTOLING] State saved to slot ${slot}`);
    }
    loadState(slot) {
        const state = this.savedStates.get(slot);
        if (state) {
            this.grammar = state.grammar;
            this.transformations = state.transformations;
            this.frame = state.frame;
            this.illegalSet = state.illegalSet;
            this.heuristicCounters = state.heuristicCounters;
            console.log(`[AUTOLING] State loaded from slot ${slot}`);
        }
    }
    getGrammar() {
        return this.grammar;
    }
    getTransformations() {
        return this.transformations;
    }
    getStats() {
        return {
            frames: this.frame,
            grammarRules: this.grammar.length,
            transformations: this.transformations.length,
            illegals: this.illegalSet.length,
            heuristics: this.heuristicCounters,
            recycleDepth: this.recycleDepth
        };
    }
}
// ============================================================
// AUTOLING API SERVER
// ============================================================
export class AutolingServer {
    engine;
    messageQueue = [];
    constructor() {
        this.engine = new AutolingEngine();
    }
    async handleMessage(message) {
        const { type, payload } = message;
        switch (type) {
            case 'parse':
                return await this.engine.parseSemantic(payload.text);
            case 'morphology':
                return await this.engine.analyzeMorphology(payload.text);
            case 'learn':
                return await this.engine.learnPhraseStructure(payload.text);
            case 'pipeline':
                return await this.engine.runPipeline(payload.text);
            case 'transform':
                return await this.engine.learnTransformation(payload.tree, payload.target);
            case 'stats':
                return this.engine.getStats();
            case 'save':
                this.engine.saveState(payload.slot);
                return { saved: true };
            case 'load':
                this.engine.loadState(payload.slot);
                return { loaded: true };
            default:
                return { error: `Unknown message type: ${type}` };
        }
    }
    getEngine() {
        return this.engine;
    }
}
export default AutolingEngine;
