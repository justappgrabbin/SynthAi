const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const canonical = value => clean(value).replace(/^[,;:.\s]+|[,;:.\s]+$/g, '');
const sentenceParts = text => clean(text).split(/(?<=[.!?;])\s+/).map(canonical).filter(Boolean);

const RELATION_PATTERNS = Object.freeze([
  { predicate: 'is', expression: /^(.+?)\s+is\s+(.+)$/i },
  { predicate: 'becomes', expression: /^(.+?)\s+becomes\s+(.+)$/i },
  { predicate: 'contains', expression: /^(.+?)\s+contains\s+(.+)$/i },
  { predicate: 'requires', expression: /^(.+?)\s+requires\s+(.+)$/i }
]);

const ORDER_MARKER = /^(first|second|third|then|next|after(?:wards)?|finally|lastly)\b[:,]?\s*/i;

export class ConceptProcedureExtractor {
  extract(source, provenance = {}) {
    const text = clean(typeof source === 'string' ? source : source?.text);
    const sentences = sentenceParts(text);
    const triples = [];
    const procedure = [];
    const concepts = new Set();
    const predicateCounts = new Map();

    for (const sentence of sentences) {
      const marker = sentence.match(ORDER_MARKER);
      if (marker) procedure.push(Object.freeze({ order: procedure.length + 1, marker: marker[1].toLowerCase(), action: canonical(sentence.slice(marker[0].length)), evidence: sentence }));
      for (const candidate of sentence.split(/\s*(?:,?\s+and\s+|;)\s*/i)) {
        for (const relation of RELATION_PATTERNS) {
          const match = canonical(candidate).match(relation.expression);
          if (!match) continue;
          const subject = canonical(match[1]), object = canonical(match[2]);
          if (!subject || !object) continue;
          triples.push(Object.freeze({ subject, predicate: relation.predicate, object, evidence: candidate }));
          concepts.add(subject); concepts.add(object);
          predicateCounts.set(relation.predicate, (predicateCounts.get(relation.predicate) ?? 0) + 1);
          break;
        }
      }
    }

    return Object.freeze({
      schema: 'cynthia-concept-procedure/1', text,
      concepts: Object.freeze([...concepts]),
      triples: Object.freeze(triples),
      procedure: Object.freeze(procedure),
      repeatedPredicates: Object.freeze([...predicateCounts].filter(([, count]) => count > 1).map(([predicate, count]) => Object.freeze({ predicate, count }))),
      provenance: Object.freeze(structuredClone(typeof source === 'object' ? source.provenance ?? provenance : provenance))
    });
  }
}
