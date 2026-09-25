// Runtime-safe compiled copy of the full parser engine; avoids colliding with similarly named donor JS files.
// @ts-ignore - preserved compiled JS runtime
import { AutolingEngine as ParserAutolingEngine } from '../../runtime/autoling.js';
function templatize(relation) { return relation.replace(/\d+/g, 'N'); }
function jaccard(a, b) {
    const setA = new Set(a), setB = new Set(b), union = new Set([...setA, ...setB]);
    if (union.size === 0)
        return 1;
    let inter = 0;
    for (const x of setA)
        if (setB.has(x))
            inter++;
    return inter / union.size;
}
/**
 * Upgrade facade: preserves the organism's existing rule-induction contract
 * while attaching the much deeper AUTOLING parser/grammar/transform pipeline.
 * Existing callers can keep using induceRule()/getRules(); new callers can use
 * morphology, semantic parsing, grammar learning, transformations and pipeline.
 */
export class EnhancedAutoLing {
    parser;
    ruleSequence = 0;
    rules = [];
    constructor(parser = new ParserAutolingEngine()) {
        this.parser = parser;
    }
    induceRule(examples) {
        if (examples.length < 2)
            return null;
        const counts = new Map();
        for (const ex of examples)
            for (const c of ex.input.constraints)
                counts.set(c, (counts.get(c) || 0) + 1);
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const anchor = sorted[0]?.[0] || null;
        const supportIdx = [], counterexampleIds = [];
        examples.forEach((ex, i) => {
            if (anchor && ex.input.constraints.includes(anchor))
                supportIdx.push(i);
            else
                counterexampleIds.push(`ex-${i}`);
        });
        if (supportIdx.length === 0)
            return null;
        const supporting = supportIdx.map(i => examples[i]);
        const inTpl = supporting.map(e => e.input.relations.map(templatize));
        const outTpl = supporting.map(e => e.output.relations.map(templatize));
        const commonIn = inTpl[0].filter(t => inTpl.every(s => s.includes(t)));
        const commonOut = outTpl[0].filter(t => outTpl.every(s => s.includes(t)));
        const added = commonOut.filter(t => !commonIn.includes(t));
        const confidence = supportIdx.length / examples.length;
        const rule = {
            id: `rule-${++this.ruleSequence}`,
            anchorConstraint: anchor,
            inputPattern: { relations: commonIn, constraints: anchor ? [anchor] : [] },
            addedTemplates: added,
            supportExampleIds: supportIdx.map(i => `ex-${i}`),
            counterexampleIds,
            confidence,
            status: confidence >= 0.8 ? 'validated' : confidence >= 0.5 ? 'provisional' : 'candidate',
        };
        this.rules.push(rule);
        return rule;
    }
    validateRule(ruleId, testInput) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule)
            return { valid: false, score: 0 };
        const constraintsSatisfied = rule.inputPattern.constraints.every(c => testInput.constraints.includes(c));
        if (!constraintsSatisfied)
            return { valid: false, score: 0, constraintsSatisfied: false };
        const score = jaccard(rule.inputPattern.relations, testInput.relations.map(templatize));
        return { valid: score >= 0.6, score, constraintsSatisfied: true };
    }
    getRules() { return this.rules; }
    generateHypothesisQuery(ruleId, novelSeed) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule)
            return null;
        const hypothesis = rule.inputPattern.relations.map(t => t.replace(/N/g, novelSeed))
            .concat(rule.addedTemplates.map(t => t.replace(/N/g, novelSeed)));
        return { ruleId, hypothesis, underConstraint: rule.anchorConstraint };
    }
    answerHypothesis(query, holds, lastPattern) {
        return {
            input: { relations: [...lastPattern.relations], constraints: [...lastPattern.constraints] },
            output: {
                relations: holds ? [...query.hypothesis] : [...lastPattern.relations],
                constraints: holds && query.underConstraint ? [query.underConstraint] : [...lastPattern.constraints],
            },
        };
    }
    // Deep AUTOLING functionality from the existing full parser engine.
    analyzeMorphology(input) { return this.parser.analyzeMorphology(input); }
    learnPhraseStructure(sentence) { return this.parser.learnPhraseStructure(sentence); }
    learnTransformation(sourceTree, targetString) { return this.parser.learnTransformation(sourceTree, targetString); }
    parseSemantic(input) { return this.parser.parseSemantic(input); }
    runPipeline(input) { return this.parser.runPipeline(input); }
    saveParserState(slot) { return this.parser.saveState(slot); }
    loadParserState(slot) { return this.parser.loadState(slot); }
    getGrammar() { return this.parser.getGrammar(); }
    getTransformations() { return this.parser.getTransformations(); }
    getParserStats() { return this.parser.getStats(); }
    exportState() {
        return { rules: this.rules.map(r => structuredClone(r)), parserStats: this.parser.getStats() };
    }
    importRules(rules = []) {
        this.rules = rules.map(r => structuredClone(r));
        this.ruleSequence = this.rules.reduce((m, r) => Math.max(m, Number(r.id.match(/(\d+)$/)?.[1] || 0)), 0);
    }
}
export default EnhancedAutoLing;
