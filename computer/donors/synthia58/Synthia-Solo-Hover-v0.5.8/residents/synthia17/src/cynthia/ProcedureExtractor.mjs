const ACTIONS = /\b(construct|draw|describe|join|connect|bisect|extend|intersect|compare|measure|rotate|translate|scale|render|verify|retain|create|make|place|apply)\b/i;

const normalize = (text) => String(text || '').replace(/\s+/g, ' ').trim();

export function extractProcedures(text) {
  const sentences = normalize(text).split(/(?<=[.!?;])\s+|\n+/).map(normalize).filter(Boolean);
  const steps = sentences.flatMap((sentence, sentenceIndex) => {
    const clauses = sentence.split(/\b(?:then|next|after that|and then)\b|,/i).map(normalize).filter(Boolean);
    return clauses.map((clause, clauseIndex) => {
      const action = clause.match(ACTIONS)?.[1]?.toLowerCase() || null;
      return action ? Object.freeze({ action, clause, sentenceIndex, clauseIndex }) : null;
    }).filter(Boolean);
  });
  const counts = new Map();
  for (const step of steps) counts.set(step.action, (counts.get(step.action) || 0) + 1);
  const candidates = [...counts.entries()].map(([action, count]) => Object.freeze({ action, count, repeated: count > 1 }));
  return Object.freeze({ sentences: Object.freeze(sentences), steps: Object.freeze(steps), candidates: Object.freeze(candidates) });
}

