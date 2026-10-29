// ============================================================================
// AUTOLING — Identify axes, classes, grammar constraints, operators
// ============================================================================
import { InducedRule, RelationalPattern, SymbolicOperation, ExplanationStep, ProvenanceRecord } from "../models";

export class AutolingEngine {
  private rules: InducedRule[] = [];

  induceRule(examples: Array<{ input: RelationalPattern; output: RelationalPattern }>): InducedRule | null {
    if (examples.length < 2) return null;
    const rule: InducedRule = {
      id: `rule-${Date.now()}`,
      inputPattern: examples[0].input,
      transformation: { type: "induced_mapping", parameters: { exampleCount: examples.length } },
      outputPattern: examples[0].output,
      constraints: [],
      exceptions: [],
      supportExampleIds: examples.map((_, i) => `ex-${i}`),
      counterexampleIds: [],
      confidence: Math.min(1, examples.length * 0.25),
      status: examples.length >= 3 ? "provisional" : "candidate",
      provenance: [{
        id: `prov-${Date.now()}`, category: "derived_operator", source: "AutolingEngine",
        description: `Induced from ${examples.length} examples`, timestamp: new Date().toISOString()
      }],
      explanationTrace: [{
        step: 1, operation: "induce_rule", input: examples.length, output: "rule_created", confidence: Math.min(1, examples.length * 0.25)
      }],
    };
    this.rules.push(rule);
    return rule;
  }

  getRules(): InducedRule[] {
    return this.rules;
  }

  validateRule(ruleId: string, testInput: RelationalPattern): { valid: boolean; trace: ExplanationStep[] } {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return { valid: false, trace: [{ step: 1, operation: "validate", input: ruleId, output: "rule_not_found", confidence: 0 }] };
    const match = this.patternMatch(rule.inputPattern, testInput);
    return {
      valid: match,
      trace: [{ step: 1, operation: "pattern_match", input: testInput, output: match, confidence: match ? 0.9 : 0.1 }],
    };
  }

  private patternMatch(a: RelationalPattern, b: RelationalPattern): boolean {
    return JSON.stringify(a.nodes.sort()) === JSON.stringify(b.nodes.sort());
  }
}
