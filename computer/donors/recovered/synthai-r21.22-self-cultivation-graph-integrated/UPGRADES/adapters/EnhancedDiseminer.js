// Runtime-safe compiled copy of the full DISEMINER engine; the runtime tree also contains a thinner diseminer.js donor with a missing ToolBase dependency.
// @ts-ignore - preserved compiled JS runtime
import { DiseminerEngine as DeepDiseminerEngine } from '../../runtime/diseminer.js';
/**
 * Upgrade facade: keeps the organism's synchronous observe()/sense() contract
 * while adding the existing full distributional-space, claim extraction,
 * evidence synthesis, simulation and narrative engine behind it.
 */
export class EnhancedDiseminer {
    cooccurrence = new Map();
    wordSeenCount = new Map();
    messageCount = 0;
    deep;
    learningQueue = Promise.resolve();
    constructor(deep = new DeepDiseminerEngine()) {
        this.deep = deep;
    }
    observe(text) {
        this.messageCount++;
        const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
        for (const w of words) {
            this.wordSeenCount.set(w, (this.wordSeenCount.get(w) || 0) + 1);
            if (!this.cooccurrence.has(w))
                this.cooccurrence.set(w, new Map());
            const ctx = this.cooccurrence.get(w);
            for (const w2 of words)
                if (w2 !== w)
                    ctx.set(w2, (ctx.get(w2) || 0) + 1);
        }
        // Preserve synchronous behavior, but also feed the deeper distributional
        // learner in-order. Call flush() before a deep query when strict ordering
        // matters.
        this.learningQueue = this.learningQueue.then(() => this.deep.buildDistributionalSpace([text]));
        return this.sense(words);
    }
    sense(words) {
        let totalEntropy = 0, known = 0, totalExposure = 0;
        for (const w of words) {
            const ctx = this.cooccurrence.get(w);
            totalExposure += this.wordSeenCount.get(w) || 0;
            if (!ctx || ctx.size === 0) {
                totalEntropy += 1;
                continue;
            }
            known++;
            const total = [...ctx.values()].reduce((a, b) => a + b, 0);
            let entropy = 0;
            for (const v of ctx.values()) {
                const p = v / total;
                entropy -= p * Math.log(p + 1e-9);
            }
            totalEntropy += Math.min(1, entropy / Math.log(Math.max(ctx.size, 2)));
        }
        const alert = words.length ? totalEntropy / words.length : 0.5;
        const avgExposure = words.length ? totalExposure / words.length : 0;
        return { alert, familiar: known > 0 && avgExposure >= 3, wordCount: words.length, knownWords: known, avgExposure };
    }
    async flush() { await this.learningQueue; }
    async buildDistributionalSpace(documents) {
        await this.flush();
        return this.deep.buildDistributionalSpace(documents);
    }
    async extractClaims(text, source = 'runtime') {
        await this.flush();
        return this.deep.extractClaims(text, source);
    }
    async runMonteCarlo(query, options = {}) {
        await this.flush();
        return this.deep.runMonteCarlo(query, options);
    }
    async generateNarrative(query, userContext = {}) {
        await this.flush();
        return this.deep.generateNarrative(query, userContext);
    }
    async synthesizeEvidence(claims) {
        await this.flush();
        return this.deep.synthesizeEvidence(claims);
    }
    async handleMessage(message) {
        await this.flush();
        return this.deep.handleMessage(message);
    }
    exportCompatibilityState() {
        return {
            messageCount: this.messageCount,
            wordSeenCount: Object.fromEntries(this.wordSeenCount),
            cooccurrence: Object.fromEntries([...this.cooccurrence].map(([w, m]) => [w, Object.fromEntries(m)])),
        };
    }
    importCompatibilityState(state = {}) {
        this.messageCount = state.messageCount || 0;
        this.wordSeenCount = new Map(Object.entries(state.wordSeenCount || {}).map(([k, v]) => [k, Number(v)]));
        this.cooccurrence = new Map(Object.entries(state.cooccurrence || {}).map(([k, v]) => [k, new Map(Object.entries(v).map(([x, n]) => [x, Number(n)]))]));
    }
}
export default EnhancedDiseminer;
