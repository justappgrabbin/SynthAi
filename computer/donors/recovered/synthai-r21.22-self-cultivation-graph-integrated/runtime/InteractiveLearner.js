// ============================================================================
// InteractiveLearner.ts (Updated with SynthiaSubstrate)
// ============================================================================
// Klein & Kuppin 1970: "Automated Linguistic Fieldworker"
// TEACHING ORGAN with Synthia coordinate substrate.
//
// Added features:
//   - W-H interrogative core with coordinate extraction
//   - Synthia mesh addressing for examples
//   - Convergence-based learning (not just counting)
//   - Coordinate-space test generation
//
// Architecture:
//   Human ↔ InteractiveLearner ↔ SynthiaSubstrate ↔ MIND ↔ Heartfield ↔ Body
// ============================================================================
import { ToolBase } from './ToolBase.js';
import { SynthiaSubstrate } from './SynthiaSubstrate.js';
// ============================================================================
// INTERACTIVE LEARNER
// ============================================================================
export class InteractiveLearner extends ToolBase {
    idSequence = 0;
    sessions = new Map();
    currentRules = new Map();
    testQueue = [];
    feedbackHistory = [];
    // NEW: Synthia substrate
    substrate;
    CONFIRMATION_THRESHOLD = 3;
    CONTRADICTION_THRESHOLD = 2;
    MAX_TESTS_PER_EXAMPLE = 5;
    CONVERGENCE_THRESHOLD = 0.75;
    constructor(mesh) {
        super(mesh, 'InteractiveLearner', 'learn.interactive');
        this.substrate = new SynthiaSubstrate();
        this.subscribeToHumanInput();
    }
    // ==========================================================================
    // PRIMARY RUN METHOD
    // ==========================================================================
    run(input) {
        const sessionId = this.computeSessionId(input);
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = {
                id: sessionId,
                teacher: input.who,
                domain: input.where,
                examples: [],
                tests: [],
                feedback: [],
                rules: [],
                status: 'active',
                startedAt: Date.now(),
                lastActivity: Date.now(),
                convergenceDepth: 0,
            };
            this.sessions.set(sessionId, session);
        }
        // NEW: Extract Synthia address from W-H input
        const synthiaAddress = input.synthiaAddress || this.extractSynthiaAddress(input);
        input.synthiaAddress = synthiaAddress;
        session.examples.push(input);
        session.lastActivity = Date.now();
        // Activate in substrate
        this.substrate.activate(synthiaAddress, 0.5);
        this.digestExample(session, input);
        const testCase = this.generateTest(session, input);
        session.tests.push(testCase);
        this.testQueue.push(testCase);
        this.mesh.publish(this.channel, this.name, {
            type: 'test_proposed',
            sessionId: session.id,
            testId: testCase.id,
            domain: input.where,
            teacher: input.who,
            resonanceScore: testCase.resonanceScore,
        });
        return testCase;
    }
    // ==========================================================================
    // NEW: SYNTHIA ADDRESS EXTRACTION FROM W-H
    // ==========================================================================
    extractSynthiaAddress(example) {
        // Map W-H to Synthia dimensions and bases
        const address = {
            side: 0, // Personality/Conscious
            planet: 0,
            dimension: 0,
            gate: 0,
            line: 0,
            color: 0,
            tone: 0,
            base: 0,
            degree: 0,
            minute: 0,
            second: 0,
            arc: 0,
            zodiac: 0,
            season: 0,
            houseZodiac: 0,
            houseSeason: 0,
        };
        // Extract from WHO → Space (Base 5)
        if (example.who) {
            address.dimension = 4; // Space
            address.base = 4; // Personality
            address.gate = this.extractGateFromText(example.who);
        }
        // Extract from WHAT → Evolution (Base 2)
        if (example.what) {
            const whatText = typeof example.what === 'string' ? example.what : JSON.stringify(example.what);
            address.dimension = 1; // Evolution
            address.base = 1; // Mind
            address.gate = this.extractGateFromText(whatText) || address.gate;
        }
        // Extract from WHERE → Movement (Base 1)
        if (example.where) {
            address.dimension = 0; // Movement
            address.base = 0; // Individuality
        }
        // Extract from WHEN → Being (Base 3)
        if (example.when) {
            address.dimension = 2; // Being
            address.base = 2; // Body
            address.degree = Math.floor((example.when / Date.now()) * 60) % 60;
        }
        // Extract from WHY → Design (Base 4)
        if (example.why) {
            address.dimension = 3; // Design
            address.base = 3; // Ego
            address.line = this.extractLineFromText(example.why);
        }
        return address;
    }
    extractGateFromText(text) {
        const keywords = {
            'creative': 0, 'receptive': 1, 'difficulty': 2, 'youthful': 3,
            'waiting': 4, 'conflict': 5, 'army': 6, 'fellowship': 7,
            'small': 8, 'treading': 9, 'peace': 10, 'standstill': 11,
            'great': 13, 'modesty': 14, 'enthusiasm': 15,
            'following': 16, 'work': 17, 'decay': 18, 'approach': 19,
            'contemplation': 20, 'biting': 21, 'grace': 22, 'splitting': 23,
            'return': 24, 'innocence': 25, 'taming': 26, 'nourishing': 27,
            'preponderance': 28, 'abysmal': 28, 'clinging': 29, 'influence': 30,
            'duration': 31, 'retreat': 32, 'power': 34,
            'progress': 35, 'darkening': 36, 'family': 36, 'opposition': 37,
            'obstruction': 38, 'deliverance': 39, 'decrease': 40, 'increase': 41,
            'breakthrough': 42, 'coming': 43, 'gathering': 44, 'pushing': 45,
            'wandering': 47, 'well': 48, 'revolution': 49,
            'cauldron': 49, 'thunder': 50, 'mountain': 51, 'development': 52,
            'marrying': 53, 'abundance': 54, 'wanderer': 55, 'gentle': 56,
            'joyous': 57, 'dispersion': 58, 'limitation': 59, 'inner': 60,
            'truth': 61, 'after': 63, 'before': 62,
        };
        const lower = text.toLowerCase();
        for (const [word, gate] of Object.entries(keywords)) {
            if (lower.includes(word))
                return gate;
        }
        return 0;
    }
    extractLineFromText(text) {
        const lineKeywords = {
            'first': 0, 'beginning': 0, 'start': 0,
            'second': 1, 'middle': 1, 'transition': 1,
            'third': 2, 'peak': 2, 'climax': 2,
            'fourth': 3, 'decline': 3, 'falling': 3,
            'fifth': 4, 'recovery': 4, 'rising': 4,
            'sixth': 5, 'end': 5, 'completion': 5,
        };
        const lower = text.toLowerCase();
        for (const [word, line] of Object.entries(lineKeywords)) {
            if (lower.includes(word))
                return line;
        }
        return 0;
    }
    // ==========================================================================
    // DIGEST EXAMPLE (updated with Synthia)
    // ==========================================================================
    digestExample(session, example) {
        const patterns = this.extractPatterns(example);
        for (const pattern of patterns) {
            const existingRule = this.findMatchingRule(pattern);
            if (existingRule) {
                existingRule.confidence = Math.min(1, existingRule.confidence + 0.1);
                existingRule.evidence++;
                existingRule.lastTested = Date.now();
            }
            else {
                const newRule = {
                    id: `tentative-${this.generateId()}`,
                    source: example.who,
                    pattern,
                    confidence: 0.3,
                    evidence: 1,
                    contradictions: 0,
                    createdAt: Date.now(),
                    lastTested: Date.now(),
                    synthiaAddress: example.synthiaAddress || this.defaultAddress(),
                    resonanceScore: 0.3,
                };
                this.currentRules.set(newRule.id, newRule);
                session.rules.push(newRule);
            }
        }
        this.mesh.publish(this.channel, this.name, {
            type: 'example_digested',
            sessionId: session.id,
            patterns: patterns.length,
            rules: session.rules.length,
        });
    }
    // ==========================================================================
    // GENERATE TEST (updated with Synthia)
    // ==========================================================================
    generateTest(session, example) {
        const testId = `test-${this.generateId()}`;
        const proposed = this.buildTestState(example, session);
        const surface = this.generateSurface(proposed, example.where);
        const confidence = this.computeTestConfidence(proposed, session);
        const alternatives = this.generateAlternatives(proposed, example.where, 2);
        // NEW: Compute Synthia address for test
        const testAddress = {
            ...(example.synthiaAddress || this.defaultAddress()),
            line: (example.synthiaAddress?.line || 0) + 1, // Slight variation
        };
        const resonanceScore = example.synthiaAddress
            ? this.substrate.resonance(example.synthiaAddress, testAddress)
            : 0;
        return {
            id: testId,
            derivedFrom: example.who,
            proposed,
            surface,
            confidence,
            alternatives,
            synthiaAddress: testAddress,
            resonanceScore,
        };
    }
    // ==========================================================================
    // RECEIVE FEEDBACK (updated with Synthia)
    // ==========================================================================
    receiveFeedback(feedback) {
        const testCase = this.testQueue.find(t => t.id === feedback.testId);
        if (!testCase)
            return;
        let session;
        for (const s of this.sessions.values()) {
            if (s.tests.some(t => t.id === feedback.testId)) {
                session = s;
                break;
            }
        }
        if (!session)
            return;
        session.feedback.push(feedback);
        this.feedbackHistory.push(feedback);
        session.lastActivity = Date.now();
        this.processFeedback(session, testCase, feedback);
        this.checkSessionHealth(session);
        this.mesh.publish(this.channel, this.name, {
            type: 'feedback_received',
            sessionId: session.id,
            testId: feedback.testId,
            response: feedback.response,
            intensity: feedback.intensity || 0.5,
        });
    }
    // ==========================================================================
    // PROCESS FEEDBACK (updated with Synthia convergence)
    // ==========================================================================
    processFeedback(session, testCase, feedback) {
        const relevantRules = session.rules.filter(r => r.source === testCase.derivedFrom);
        switch (feedback.response) {
            case 'yes':
                for (const rule of relevantRules) {
                    rule.confidence = Math.min(1, rule.confidence + 0.15);
                    rule.evidence++;
                    rule.lastTested = Date.now();
                    if (rule.evidence >= this.CONFIRMATION_THRESHOLD) {
                        this.solidifyRule(rule, session);
                    }
                }
                // NEW: Activate in substrate
                if (testCase.synthiaAddress) {
                    this.substrate.activate(testCase.synthiaAddress, 0.8);
                }
                break;
            case 'no':
                for (const rule of relevantRules) {
                    rule.confidence = Math.max(0, rule.confidence - 0.2);
                    rule.contradictions++;
                    rule.lastTested = Date.now();
                    if (rule.contradictions >= this.CONTRADICTION_THRESHOLD) {
                        this.discardRule(rule, session);
                    }
                }
                break;
            case 'correction':
                if (feedback.correction) {
                    this.learnFromCorrection(testCase, feedback.correction, session);
                }
                if (feedback.preferredAddress) {
                    // NEW: Activate preferred address
                    this.substrate.activate(feedback.preferredAddress, 0.9);
                }
                break;
        }
    }
    // ==========================================================================
    // EXISTING METHODS (preserved)
    // ==========================================================================
    learnFromCorrection(testCase, correction, session) {
        const correctedPattern = this.extractCorrectionPattern(testCase, correction);
        const correctionRule = {
            id: `correction-${this.generateId()}`,
            source: testCase.derivedFrom,
            pattern: correctedPattern,
            confidence: 0.6,
            evidence: 1,
            contradictions: 0,
            createdAt: Date.now(),
            lastTested: Date.now(),
            synthiaAddress: testCase.synthiaAddress,
            resonanceScore: testCase.resonanceScore,
        };
        this.currentRules.set(correctionRule.id, correctionRule);
        session.rules.push(correctionRule);
    }
    solidifyRule(rule, session) {
        rule.confidence = 0.9;
        this.mesh.publish('mind.learn', this.name, {
            type: 'rule_solidified',
            ruleId: rule.id,
            pattern: rule.pattern,
            evidence: rule.evidence,
            source: session.teacher,
        });
        this.mesh.publish('style.control', this.name, {
            type: 'profile_suggestion',
            pattern: rule.pattern,
            confidence: rule.confidence,
        });
    }
    discardRule(rule, session) {
        this.currentRules.delete(rule.id);
        session.rules = session.rules.filter(r => r.id !== rule.id);
    }
    checkSessionHealth(session) {
        const totalContradictions = session.rules.reduce((sum, r) => sum + r.contradictions, 0);
        const totalRules = session.rules.length;
        if (totalRules > 0 && totalContradictions / totalRules > 0.5) {
            this.recycleSession(session);
        }
    }
    recycleSession(session) {
        const solidifiedRules = session.rules.filter(r => r.confidence >= 0.8);
        const confirmedExamples = session.examples.filter((_, i) => session.feedback.slice(i * this.MAX_TESTS_PER_EXAMPLE, (i + 1) * this.MAX_TESTS_PER_EXAMPLE)
            .some(f => f.response === 'yes'));
        const recycledSession = {
            id: `${session.id}-recycled`,
            teacher: session.teacher,
            domain: session.domain,
            examples: confirmedExamples,
            tests: [],
            feedback: [],
            rules: solidifiedRules,
            status: 'active',
            startedAt: Date.now(),
            lastActivity: Date.now(),
            convergenceDepth: 0,
        };
        this.sessions.set(recycledSession.id, recycledSession);
        session.status = 'recycled';
    }
    buildTestState(example, session) {
        return {
            who: { id: example.who, namespace: 'teaching', signature: this.computeSignature(example) },
            what: { type: 'test_case', traits: { originalExample: example.what }, memory: [] },
            where: { trajectory: [1], position: 'Teaching space' },
            when: { temporalMarker: example.when || Date.now(), cyclePhase: 'Teaching' },
            why: { constraints: [example.why], purpose: 'learning_test', bound: 0.5 },
            ontology: { movement: 0.5, evolution: 0.5, being: 0.5, design: 0.5, space: 0.5 },
            coordinates: { gate: 1, line: 1, color: 1, tone: 1, base: 1, degree: 0, minute: 0, second: 0, arc: 0, zodiac: 'Aries', house: 1 },
            resolved: true,
            hash: 'test-state',
            domain: example.where,
            synthiaAddress: example.synthiaAddress,
        };
    }
    generateSurface(state, domain) {
        return `Generated ${domain} surface from state ${state.hash}`;
    }
    generateAlternatives(state, domain, count) {
        return [];
    }
    computeTestConfidence(state, session) {
        return 0.5;
    }
    extractPatterns(example) {
        return [{ type: 'example', content: example.what }];
    }
    findMatchingRule(pattern) {
        return undefined;
    }
    extractCorrectionPattern(testCase, correction) {
        return { type: 'correction', proposed: testCase.surface, corrected: correction };
    }
    computeSignature(example) {
        return `${example.who}:${example.where}:${example.why}`.slice(0, 20);
    }
    defaultAddress() {
        return {
            side: 0, planet: 0, dimension: 0, gate: 0, line: 0, color: 0, tone: 0, base: 0,
            degree: 0, minute: 0, second: 0, arc: 0, zodiac: 0, season: 0, houseZodiac: 0, houseSeason: 0,
        };
    }
    generateId() {
        return (++this.idSequence).toString(36).padStart(8,'0');
    }
    computeSessionId(example) {
        return `${example.who}-${example.where}-${example.when || Date.now()}`;
    }
    subscribeToHumanInput() {
        this.mesh.subscribe('human.input', (message) => {
            const input = message.payload;
            if (input && input.who && input.what)
                this.run(input);
        });
        this.mesh.subscribe('human.feedback', (message) => {
            const feedback = message.payload;
            if (feedback && feedback.testId)
                this.receiveFeedback(feedback);
        });
    }
    // EXPORT METHODS
    getSession(id) { return this.sessions.get(id); }
    getAllSessions() { return Array.from(this.sessions.values()); }
    getActiveSessions() { return this.getAllSessions().filter(s => s.status === 'active'); }
    getSolidifiedRules() { return Array.from(this.currentRules.values()).filter(r => r.confidence >= 0.8); }
    getTentativeRules() { return Array.from(this.currentRules.values()).filter(r => r.confidence < 0.8); }
    getSubstrate() { return this.substrate; }
}
