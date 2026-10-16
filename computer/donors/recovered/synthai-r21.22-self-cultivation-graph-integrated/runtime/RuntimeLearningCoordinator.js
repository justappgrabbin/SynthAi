import { EventMesh } from './EventMesh.js';
import { DeepStructureLearner } from './DeepStructureLearner.js';
import { InteractiveLearner } from './InteractiveLearner.js';
/**
 * v0.5 closes the post-execution learning loop without replacing either
 * original learner. GraphRuntime outcomes are translated into the State /
 * TransformResult evidence shape DeepStructureLearner already understands.
 * InteractiveLearner remains the explicit human-teaching/correction organ.
 */
export class RuntimeLearningCoordinator {
    mesh;
    deep;
    interactive;
    performance = new Map();
    latestInference = null;
    observedExecutionKeys = new Set();
    constructor(mesh = new EventMesh()) {
        this.mesh = mesh;
        this.deep = new DeepStructureLearner(mesh);
        this.interactive = new InteractiveLearner(mesh);
    }
    observeSchedule(state, report) {
        for (const record of report.records) {
            // Learn one outcome class per tool/channel/session rather than treating
            // dozens of line/state activations as dozens of independent lessons.
            // A tool may still contribute both a success and a failure lesson in the
            // same session if its behavior genuinely differs across activations.
            const key = `${state.session.sessionId}:${record.definitionId}:${record.toolId}:${record.success ? 'success' : 'failure'}:${record.correctionAttempt ? 'correction' : 'normal'}`;
            if (this.observedExecutionKeys.has(key))
                continue;
            this.observedExecutionKeys.add(key);
            const surfaceState = this.toLearningState(state, record);
            const transformResult = this.toTransformResult(surfaceState, state, record);
            const rating = record.success ? this.successRating(state, record) : 0.1;
            this.deep.observeTransform(surfaceState, transformResult, { success: record.success, rating });
            this.updatePerformance(state, record);
            this.mesh.publish('runtime.execution', 'GraphRuntime', {
                sessionId: state.session.sessionId,
                activationId: record.activationId,
                toolId: record.toolId,
                generated: record.generated,
                correctionAttempt: record.correctionAttempt,
                success: record.success,
                capabilities: record.capabilities,
                rating
            });
        }
        // The learner's original implementation automatically infers every fifth
        // observation. Keep that behavior, while retaining the latest result here
        // whenever enough evidence exists in the live runtime.
        const count = this.deep.getObservations().length;
        if (count >= 3 && count % 5 === 0) {
            this.latestInference = this.deep.run({ minEvidence: 2, force: false });
        }
    }
    /** Final bounded inference before materialization. No recursive execution is
     * triggered here; this only converts accumulated evidence into reusable rules. */
    finalizeSession(_sessionId) {
        const count = this.deep.getObservations().length;
        if (count === 0)
            return this.latestInference;
        this.latestInference = this.deep.run({ minEvidence: count >= 2 ? 2 : 1, force: true });
        return this.latestInference;
    }
    teach(example) {
        return this.interactive.run(example);
    }
    receiveFeedback(feedback) {
        this.interactive.receiveFeedback(feedback);
    }
    publishTeachingExample(example) {
        this.mesh.publish('human.input', 'GraphRuntime', example);
    }
    publishFeedback(feedback) {
        this.mesh.publish('human.feedback', 'GraphRuntime', feedback);
    }
    snapshot() {
        return {
            observations: this.deep.getObservations().length,
            deepRules: this.deep.getRules(),
            latestInference: this.latestInference,
            interactiveSessions: this.interactive.getAllSessions(),
            solidifiedInteractiveRules: this.interactive.getSolidifiedRules(),
            tentativeInteractiveRules: this.interactive.getTentativeRules(),
            toolPerformance: [...this.performance.values()].map(v => ({ ...v, capabilities: [...v.capabilities] })),
            meshTopology: this.mesh.topology(),
            meshMessages: this.mesh.log.length,
        };
    }
    updatePerformance(state, record) {
        const current = this.performance.get(record.toolId) || {
            toolId: record.toolId,
            successes: 0,
            failures: 0,
            correctionExecutions: 0,
            generatedExecutions: 0,
            score: 0.5,
            capabilities: [],
            lastSessionId: state.session.sessionId
        };
        if (record.success)
            current.successes++;
        else
            current.failures++;
        if (record.correctionAttempt)
            current.correctionExecutions++;
        if (record.generated)
            current.generatedExecutions++;
        current.capabilities = [...new Set([...current.capabilities, ...record.capabilities])];
        current.lastSessionId = state.session.sessionId;
        // Laplace-smoothed empirical reliability: never jumps to absolute 0/1.
        current.score = (current.successes + 1) / (current.successes + current.failures + 2);
        this.performance.set(record.toolId, current);
    }
    successRating(state, record) {
        const activation = state.channelActivations.get(record.activationId);
        if (!activation)
            return 0.8;
        return this.clamp(0.55 + activation.coherence * 0.2 + activation.expressionStrength * 0.2 - activation.tension * 0.05);
    }
    toLearningState(runtime, record) {
        const active = runtime.activeNodes.get(record.sourceStateId) || runtime.activeNodes.get(record.targetStateId);
        const addr = active?.address;
        const dimension = Math.max(1, Math.min(5, addr?.dimension || runtime.session.intent.dimension || 5));
        const gate = Math.max(1, Math.min(64, addr?.gateLine.gate || 1));
        const line = Math.max(1, Math.min(6, addr?.gateLine.line || 1));
        const color = Math.max(1, Math.min(6, addr?.color || 1));
        const tone = Math.max(1, Math.min(6, addr?.tone || 1));
        const base = Math.max(1, Math.min(5, addr?.base || 1));
        const activation = active?.activation ?? 0.5;
        const coherence = active?.coherence ?? 0.5;
        const tension = active?.tension ?? 0;
        const ontology = { movement: coherence * 0.2, evolution: coherence * 0.2, being: coherence * 0.2, design: coherence * 0.2, space: coherence * 0.2 };
        const key = ['movement', 'evolution', 'being', 'design', 'space'][dimension - 1];
        ontology[key] = this.clamp(activation);
        const domain = this.inferDomain(record.capabilities, runtime.session.intent.description);
        const synthiaAddress = {
            side: addr?.side === 'FIVE_SIDE' ? 1 : 0,
            planet: Math.max(0, Math.min(12, (addr?.planet || runtime.session.intent.planet || 1) - 1)),
            dimension: dimension - 1,
            gate: gate - 1,
            line: line - 1,
            color: color - 1,
            tone: tone - 1,
            base: base - 1,
            degree: 0, minute: 0, second: 0, arc: 0,
            zodiac: 0, season: 0, houseZodiac: 0, houseSeason: 0,
        };
        return {
            who: { id: runtime.session.sessionId, namespace: 'runtime', signature: runtime.session.intent.intentId },
            what: {
                type: 'tool_execution',
                traits: {
                    toolId: record.toolId,
                    capabilities: [...record.capabilities],
                    generated: record.generated,
                    correctionAttempt: record.correctionAttempt,
                    success: record.success,
                    tension,
                },
                memory: [record.result.outputValues]
            },
            where: { trajectory: [gate], position: `Gate ${gate}, Line ${line}` },
            when: { temporalMarker: runtime.seed.eventCounter, cyclePhase: `D${dimension}` },
            why: { constraints: [...record.capabilities], purpose: runtime.session.intent.description, bound: coherence },
            ontology,
            coordinates: { gate, line, color, tone, base, degree: 0, minute: 0, second: 0, arc: 0, zodiac: 'runtime', house: 1 },
            resolved: record.success,
            hash: `${runtime.session.sessionId}:${record.activationId}:${record.toolId}`,
            domain,
            surface: record.result.outputValues,
            synthiaAddress
        };
    }
    toTransformResult(state, runtime, record) {
        const activation = runtime.channelActivations.get(record.activationId);
        const confidence = record.success
            ? this.clamp(0.55 + (activation?.coherence || 0.5) * 0.3 + (activation?.expressionStrength || 0.5) * 0.15)
            : 0.1;
        const variant = {
            ...state,
            resolved: record.success,
            surface: record.result.outputValues,
            what: { ...state.what, memory: [...state.what.memory, record.result.outputValues] }
        };
        return {
            original: state,
            variants: [variant],
            invariant: {
                ontology: { ...state.ontology },
                coordinates: { gate: state.coordinates.gate, base: state.coordinates.base },
                hash: state.hash
            },
            transformationLog: [{
                    from: state.hash,
                    to: `${state.hash}:${record.success ? 'success' : 'failure'}`,
                    dimension: 'tool-execution',
                    delta: record.success ? 0 : 1,
                    preserved: record.success
                }],
            domain: state.domain,
            confidence,
            substrateResonance: activation?.coherence || 0,
            definedCenters: state.synthiaAddress ? this.deep.getSubstrate().computeCenters(state.synthiaAddress) : []
        };
    }
    inferDomain(capabilities, intent) {
        const text = `${capabilities.join(' ')} ${intent}`.toLowerCase();
        if (/\b(code|compile|program|javascript|typescript)\b/.test(text))
            return 'code';
        if (/\b(image|draw|visual|picture|photo)\b/.test(text))
            return 'image';
        if (/\b(music|audio|sound)\b/.test(text))
            return 'music';
        if (/\b(game|player|level)\b/.test(text))
            return 'game';
        if (/\b(math|number|calculate)\b/.test(text))
            return 'math';
        if (/\b(biology|organism|cell|gene)\b/.test(text))
            return 'biology';
        return 'language';
    }
    clamp(value) { return Math.max(0, Math.min(1, value)); }
}
export default RuntimeLearningCoordinator;
