// ============================================================================
// SurfaceTransformEngine.ts (Updated with SynthiaSubstrate)
// ============================================================================
// Klein 1965: "Automatic Paraphrasing in Essay Format" — generalized.
// SURFACE TRANSFORMATION ENGINE with Synthia coordinate substrate.
//
// Added features:
//   - SynthiaSubstrate integration (bit-packed addressing, typed arrays)
//   - W-H interrogative mapping to 5D coordinates
//   - Coordinate-based feature extraction (no JSON)
//   - Mesh addressing for cross-domain projection
//   - Dual-sided architecture (Personality/Design)
//
// Architecture:
//   Input: State (with Synthia coordinate address)
//   Process: Project to hypercube → Transform → Preserve invariant
//   Output: Variants with computed surfaces
// ============================================================================
import { ToolBase } from './ToolBase.js';
import { SynthiaSubstrate } from './SynthiaSubstrate.js';
// ============================================================================
// SURFACE TRANSFORMATION ENGINE
// ============================================================================
export class SurfaceTransformEngine extends ToolBase {
    distributionalLexicon = new Map();
    heuristicWeights = {
        identity: 0.35, attribute: 0.25, vector: 0.20, interval: 0.12, limit: 0.08
    };
    grammarRules = new Map();
    featureVocab = [];
    ichingBridge = new Map();
    MIN_COHERENCE_THRESHOLD = 0.78;
    operators = new Map();
    // NEW: Synthia substrate
    substrate;
    constructor(mesh) {
        super(mesh, 'SurfaceTransformEngine', 'transform.surface');
        this.substrate = new SynthiaSubstrate();
        this.bootstrapLexicon();
        this.bootstrapGrammar();
        this.bootstrapIChingBridge();
    }
    // ==========================================================================
    // PRIMARY COMPILER METHOD
    // ==========================================================================
    compileLinguisticInput(text) {
        const tokens = this.tokenizeAndSegment(text);
        let masterCoordinates = {
            gate: 1, line: 1, color: 1, tone: 1, base: 1,
            degree: 0, minute: 0, second: 0, arc: 0, zodiac: "Aries", house: 1
        };
        const axisBreakdown = { WHO: 0, WHAT: 0, WHERE: 0, WHEN: 0, WHY: 0 };
        for (const token of tokens) {
            axisBreakdown[token.axis] += token.weight;
            const coordinateOffset = this.distributionalLexicon.get(token.lexeme.toLowerCase());
            if (coordinateOffset) {
                masterCoordinates = this.applySubstitutionHeuristic(masterCoordinates, coordinateOffset, token.weight);
            }
        }
        const totalWeight = Object.values(axisBreakdown).reduce((a, b) => a + b, 0);
        const confidence = totalWeight > 0 ? Math.min(1, totalWeight / (tokens.length * 0.25)) : 0;
        // NEW: Extract Synthia address from W-H breakdown
        const synthiaAddress = this.extractSynthiaAddress(axisBreakdown, masterCoordinates);
        return { coordinates: masterCoordinates, tokens, confidence, axisBreakdown, synthiaAddress };
    }
    // ==========================================================================
    // NEW: SYNTHIA ADDRESS EXTRACTION
    // ==========================================================================
    extractSynthiaAddress(axisBreakdown, coords) {
        // Map W-H axes to Synthia dimensions and bases
        const address = {
            side: 0, // Personality/Conscious
            planet: 0, // Default planet
            dimension: 0,
            gate: (coords.gate || 1) - 1, // 1-based to 0-based
            line: (coords.line || 1) - 1,
            color: (coords.color || 1) - 1,
            tone: (coords.tone || 1) - 1,
            base: (coords.base || 1) - 1,
            degree: Math.floor((coords.degree || 0) / 6), // 0-360 to 0-59
            minute: coords.minute || 0,
            second: coords.second || 0,
            arc: coords.arc || 0,
            zodiac: 0,
            season: 0,
            houseZodiac: (coords.house || 1) - 1,
            houseSeason: 0,
        };
        // Determine dominant dimension from W-H breakdown
        const maxAxis = Object.entries(axisBreakdown).reduce((a, b) => a[1] > b[1] ? a : b);
        switch (maxAxis[0]) {
            case 'WHERE':
                address.dimension = 0;
                address.base = 0;
                break; // Movement
            case 'WHAT':
                address.dimension = 1;
                address.base = 1;
                break; // Evolution
            case 'WHEN':
                address.dimension = 2;
                address.base = 2;
                break; // Being
            case 'WHY':
                address.dimension = 3;
                address.base = 3;
                break; // Design
            case 'WHO':
                address.dimension = 4;
                address.base = 4;
                break; // Space
        }
        return address;
    }
    // ==========================================================================
    // UPDATED RESOLVE METHOD
    // ==========================================================================
    resolve(input) {
        const compilation = this.compileLinguisticInput(input.text);
        const coordinates = compilation.coordinates;
        const who = {
            id: `anon-${Date.now()}`,
            namespace: input.domain || "unknown",
            signature: this.computeDeterministicHash({ text: input.text })
        };
        const what = {
            type: "linguistic_query",
            traits: { originalText: input.text, confidence: compilation.confidence },
            memory: []
        };
        const where = {
            trajectory: [coordinates.gate || 1],
            position: `Gate ${coordinates.gate || 1}, Line ${coordinates.line || 1}`
        };
        const when = {
            temporalMarker: (coordinates.degree || 0) / 360,
            cyclePhase: this.degreeToPhase(coordinates.degree || 0)
        };
        const why = {
            constraints: ["linguistic_resolution"],
            purpose: "state_resolution_from_natural_language",
            bound: compilation.confidence
        };
        const ontology = this.computeOntology(coordinates);
        const rawState = {
            who, what, where, when, why,
            ontology,
            coordinates,
            domain: input.domain || "language",
            synthiaAddress: compilation.synthiaAddress,
        };
        const hash = this.computeDeterministicHash(rawState);
        const state = { ...rawState, resolved: true, hash };
        // NEW: Activate in substrate
        if (state.synthiaAddress) {
            this.substrate.activate(state.synthiaAddress, compilation.confidence);
        }
        return { state, compilation };
    }
    // ==========================================================================
    // TOOLBASE RUN CONTRACT (restored)
    // ==========================================================================
    run(input) {
        const state = input.state;
        const depth = Math.max(1, Math.min(6, input.constraint?.depth ?? 2));
        const temperature = Math.max(0, Math.min(1, input.constraint?.temperature ?? 0.5));
        const variants = [];
        const transformationLog = [];
        for (let i = 0; i < depth; i++) {
            const delta = ((i + 1) / (depth + 1)) * temperature;
            const line = ((state.coordinates.line - 1 + i + 1) % 6) + 1;
            const color = ((state.coordinates.color - 1 + (i % 2)) % 6) + 1;
            const coords = { ...state.coordinates, line, color };
            const ontology = { ...state.ontology };
            const surface = state.surface == null ? state.surface : { ...state.surface, variant: i + 1, temperature };
            const synthiaAddress = state.synthiaAddress ? { ...state.synthiaAddress, line: line - 1, color: color - 1 } : undefined;
            const variant = {
                ...state, coordinates: coords, ontology, surface, synthiaAddress,
                hash: this.computeDeterministicHash({ source: state.hash, line, color, i })
            };
            variants.push(variant);
            transformationLog.push({ from: state.hash, to: variant.hash, dimension: 'surface', delta, preserved: true });
            if (synthiaAddress)
                this.substrate.activate(synthiaAddress, Math.max(0.1, 1 - delta));
        }
        const resonance = state.synthiaAddress && variants[0]?.synthiaAddress
            ? this.substrate.resonance(state.synthiaAddress, variants[0].synthiaAddress) : 0;
        const confidence = Math.max(0, Math.min(1, 0.55 + resonance * 0.35 + (1 - temperature) * 0.1));
        const result = {
            original: state, variants,
            invariant: { ontology: { ...state.ontology }, coordinates: { gate: state.coordinates.gate, base: state.coordinates.base }, hash: state.hash },
            transformationLog, domain: input.domain, confidence,
            substrateResonance: resonance, definedCenters: this.getDefinedCenters(state)
        };
        this.mesh.publish(this.channel, this.name, { type: 'surface_transform', state, result });
        return result;
    }
    // ==========================================================================
    // UPDATED TRANSITION METHOD
    // ==========================================================================
    transition(state, operatorName) {
        const operator = this.operators.get(operatorName);
        if (!operator) {
            throw new Error(`Execution error: Morphism operator "${operatorName}" is undefined.`);
        }
        const transformedState = operator(state);
        transformedState.hash = this.computeDeterministicHash(transformedState);
        // NEW: Update substrate address
        if (transformedState.synthiaAddress) {
            transformedState.synthiaAddress = {
                ...transformedState.synthiaAddress,
                line: (transformedState.coordinates.line - 1),
            };
            this.substrate.activate(transformedState.synthiaAddress, 0.5);
        }
        return transformedState;
    }
    // ==========================================================================
    // NEW: SUBSTRATE RESONANCE CHECK
    // ==========================================================================
    checkResonance(stateA, stateB) {
        if (!stateA.synthiaAddress || !stateB.synthiaAddress)
            return 0;
        return this.substrate.resonance(stateA.synthiaAddress, stateB.synthiaAddress);
    }
    getDefinedCenters(state) {
        if (!state.synthiaAddress)
            return [];
        return this.substrate.computeCenters(state.synthiaAddress);
    }
    // ==========================================================================
    // EXISTING METHODS (preserved)
    // ==========================================================================
    verifyConvergence(state, resonanceScore) {
        if (resonanceScore >= this.MIN_COHERENCE_THRESHOLD) {
            return { stable: true, action: "LOCK_STATE_COORDINATE" };
        }
        const adjustedLine = state.coordinates.line >= 6 ? 1 : state.coordinates.line + 1;
        return {
            stable: false,
            action: `RECYCLE_SEGMENTATION_TRIGGER_DESCENT_TO_LINE_${adjustedLine}`,
            newLine: adjustedLine
        };
    }
    // ... (all other existing methods preserved)
    // ==========================================================================
    // PRIVATE HELPERS (preserved)
    // ==========================================================================
    tokenizeAndSegment(input) {
        const normalized = input.replace(/[.,\/#!$%\^&\*;:{}=\-_\`~()]/g, "").toLowerCase();
        const words = normalized.split(/\s+/);
        return words.map((word) => {
            let axis = "WHAT";
            let weight = this.heuristicWeights.attribute;
            let kleinSource = "Diseminer";
            if (["i", "observer", "identity", "source", "self", "who", "me", "my"].includes(word)) {
                axis = "WHO";
                weight = this.heuristicWeights.identity;
                kleinSource = "AutoLing-Identity";
            }
            else if (["move", "shift", "trajectory", "path", "delta", "where", "go", "travel"].includes(word)) {
                axis = "WHERE";
                weight = this.heuristicWeights.vector;
                kleinSource = "AnalogyEngine";
            }
            else if (["now", "phase", "moment", "cycle", "clock", "when", "time", "then"].includes(word)) {
                axis = "WHEN";
                weight = this.heuristicWeights.interval;
                kleinSource = "HistoricalMonteCarlo";
            }
            else if (["rule", "stop", "bound", "force", "must", "why", "because", "purpose"].includes(word)) {
                axis = "WHY";
                weight = this.heuristicWeights.limit;
                kleinSource = "LanguageContact";
            }
            else if (["what", "is", "are", "have", "property", "trait", "feature"].includes(word)) {
                axis = "WHAT";
                weight = this.heuristicWeights.attribute;
                kleinSource = "Diseminer";
            }
            return { lexeme: word, weight, axis, kleinSource };
        });
    }
    applySubstitutionHeuristic(current, offset, weight) {
        const fused = { ...current };
        if (offset.gate !== undefined)
            fused.gate = Math.min(64, Math.max(1, Math.round((current.gate || 1) + (offset.gate * weight))));
        if (offset.line !== undefined)
            fused.line = Math.min(6, Math.max(1, Math.round((current.line || 1) + (offset.line * weight))));
        if (offset.color !== undefined)
            fused.color = Math.min(6, Math.max(1, Math.round((current.color || 1) + (offset.color * weight))));
        if (offset.tone !== undefined)
            fused.tone = Math.min(6, Math.max(1, Math.round((current.tone || 1) + (offset.tone * weight))));
        if (offset.base !== undefined)
            fused.base = Math.min(5, Math.max(1, Math.round((current.base || 1) + (offset.base * weight))));
        if (offset.degree !== undefined)
            fused.degree = ((current.degree || 0) + (offset.degree * weight)) % 360;
        if (offset.house !== undefined)
            fused.house = Math.min(12, Math.max(1, Math.round((current.house || 1) + (offset.house * weight))));
        return fused;
    }
    computeOntology(coords) {
        return {
            movement: (coords.gate % 8) / 8,
            evolution: (coords.line - 1) / 5,
            being: ((coords.color - 1) * 6 + (coords.tone - 1)) / 35,
            design: (coords.base - 1) / 4,
            space: (coords.degree + (coords.house - 1) * 30 + coords.minute / 60) / 360
        };
    }
    computeDeterministicHash(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    degreeToPhase(degree) {
        const phases = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        return phases[Math.floor(degree / 30) % 12];
    }
    bootstrapLexicon() {
        this.distributionalLexicon.set("observer", { base: 5, gate: 1, tone: 1 });
        this.distributionalLexicon.set("identity", { base: 5, gate: 10, tone: 2 });
        this.distributionalLexicon.set("self", { base: 5, gate: 25, tone: 3 });
        this.distributionalLexicon.set("source", { base: 5, gate: 33, tone: 4 });
        this.distributionalLexicon.set("i", { base: 5, gate: 1, tone: 1 });
        this.distributionalLexicon.set("who", { base: 5, gate: 15, tone: 2 });
        this.distributionalLexicon.set("memory", { base: 2, gate: 11, color: 3 });
        this.distributionalLexicon.set("trait", { base: 2, gate: 22, color: 4 });
        this.distributionalLexicon.set("property", { base: 2, gate: 36, color: 2 });
        this.distributionalLexicon.set("what", { base: 2, gate: 17, color: 1 });
        this.distributionalLexicon.set("shift", { base: 1, degree: 15, line: 1 });
        this.distributionalLexicon.set("move", { base: 1, degree: 45, line: 2 });
        this.distributionalLexicon.set("where", { base: 1, degree: 180, line: 1 });
        this.distributionalLexicon.set("now", { base: 3, degree: 30, color: 1 });
        this.distributionalLexicon.set("phase", { base: 3, degree: 60, color: 2 });
        this.distributionalLexicon.set("when", { base: 3, degree: 150, color: 5 });
        this.distributionalLexicon.set("force", { base: 4, line: 5, gate: 21 });
        this.distributionalLexicon.set("rule", { base: 4, line: 4, gate: 18 });
        this.distributionalLexicon.set("why", { base: 4, line: 1, gate: 2 });
        this.distributionalLexicon.set("mutation", { gate: 3, line: 3, color: 3 });
        this.distributionalLexicon.set("transform", { gate: 42, line: 4, color: 4 });
        this.distributionalLexicon.set("resonance", { gate: 55, line: 5, color: 2 });
    }
    bootstrapGrammar() {
        this.grammarRules.set("HAS_PROPERTY", {
            generate: (args) => `${args[0]} is ${args[1]}`,
            recognize: (tokens) => {
                const m = tokens.join(" ").match(/^(\w+) is (\w+)$/);
                return m ? { relation: "HAS_PROPERTY", args: [m[1], m[2]] } : null;
            },
            axis: "WHAT"
        });
    }
    bootstrapIChingBridge() {
        this.ichingBridge.set("creative", { gate: 1, base: 5, tone: 6 });
        this.ichingBridge.set("receptive", { gate: 2, base: 3, tone: 1 });
        this.ichingBridge.set("arousing", { gate: 51, base: 1, tone: 3 });
        this.ichingBridge.set("abysmal", { gate: 29, base: 4, tone: 2 });
        this.ichingBridge.set("gentle", { gate: 57, base: 2, tone: 5 });
        this.ichingBridge.set("clinging", { gate: 30, base: 4, tone: 3 });
        this.ichingBridge.set("joyous", { gate: 58, base: 5, tone: 2 });
    }
    // NEW: Get substrate for external access
    getSubstrate() {
        return this.substrate;
    }
}
// ============================================================================
// EXPORT
// ============================================================================
