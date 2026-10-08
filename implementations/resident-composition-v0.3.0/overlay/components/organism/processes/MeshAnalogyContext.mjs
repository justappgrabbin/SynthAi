import { completeAnalogy, retargetPlan, normalizeVector, toBitString } from '../vendor/ato-core/src/boolean-ato.mjs';
const clone = value => structuredClone(value);
const named = value => typeof value === 'string' && value.trim().length > 0;

/** Feature meanings belong to an explicitly identified source, never to a guessed gate mapping. */
export function deriveMeshAnalogy(spec) {
  if (!named(spec?.source?.id) || !named(spec?.source?.revision)) {
    throw new TypeError('analogy source id and revision required');
  }
  const { features, examples, candidates = [], plan, mode } = spec;
  if (!['xor', 'equivalence'].includes(mode)) throw new TypeError('explicit analogy operator required');
  if (!Array.isArray(features) || !features.length || features.some(f => !named(f.id) || !named(f.zero) || !named(f.one)) ||
      new Set(features.map(f => f.id)).size !== features.length) {
    throw new TypeError('unique features with explicit zero and one meanings required');
  }
  const normalize = entry => {
    if (!named(entry?.id)) throw new TypeError('feature entry id required');
    return { ...clone(entry), vector: toBitString(normalizeVector(entry.vector, features.length)) };
  };
  const [a, b, c] = ['a', 'b', 'c'].map(key => normalize(examples?.[key]));
  if (!Array.isArray(candidates)) throw new TypeError('candidate array required');
  const known = candidates.map(normalize);
  if (new Set(known.map(entry => entry.id)).size !== known.length) throw new TypeError('duplicate candidate id');
  const derived = completeAnalogy(a.vector, b.vector, c.vector, mode);
  const result = toBitString(derived.result);
  const matches = known.filter(entry => entry.vector === result);
  // Exact ambiguity is retained; nearest neighbors cannot silently acquire meaning.
  const interpretation = features.map((feature, index) => ({
    featureId: feature.id, value: Number(result[index]), meaning: result[index] === '1' ? feature.one : feature.zero
  }));
  let retargeted = null;
  if (plan !== undefined) {
    if (!Array.isArray(plan?.states)) throw new TypeError('plan states required');
    const transformed = retargetPlan(plan.states.map(s => normalizeVector(s, features.length)), result, mode);
    retargeted = { source: transformed.source.map(toBitString), target: result,
      operator: toBitString(transformed.transform), states: transformed.result.map(toBitString) };
  }
  return {
    source: clone(spec.source), features: clone(features), examples: { a, b, c }, mode,
    operator: toBitString(derived.relation), result, interpretation, matches,
    matchStatus: matches.length === 1 ? 'unique' : matches.length ? 'ambiguous' : 'unmapped', plan: retargeted
  };
}
export default deriveMeshAnalogy;
