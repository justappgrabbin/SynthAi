import { ConceptProcedureExtractor } from './ConceptProcedureExtractor.mjs';

export class RelationalKnowledgeInferer {
  constructor({ extractor = new ConceptProcedureExtractor() } = {}) { this.extractor = extractor; }

  infer(source, examples = []) {
    const extraction = this.extractor.extract(source);
    const repeated = extraction.repeatedPredicates.toSorted((a, b) => b.count - a.count)[0];
    if (!repeated || extraction.triples.length < 2) return Object.freeze({ status: 'needs-definition', reason: 'NO_REPEATED_RELATIONAL_STRUCTURE', extraction });
    const plan = Object.freeze({ op: 'relation-program', predicate: repeated.predicate, maxDepth: 32 });
    const contract = Object.freeze({
      inputs: ['triple[]:triples', 'query:{from,to?}'],
      outputs: ['boolean:connected', 'concept[]:path', 'concept[]:reachable', 'triple[]:derived'],
      constraints: ['predicate identity is preserved', 'cycles terminate', 'source triples remain unchanged'],
      dependencies: ['directed adjacency', 'bounded graph traversal'],
      learnedFrom: Object.freeze(extraction.triples.filter(triple => triple.predicate === repeated.predicate))
    });
    return Object.freeze({ status: examples.length ? 'candidate' : 'needs-evidence', extraction, plan, contract, evidence: Object.freeze(examples.map(example => example.condition ?? example.output)) });
  }
}
