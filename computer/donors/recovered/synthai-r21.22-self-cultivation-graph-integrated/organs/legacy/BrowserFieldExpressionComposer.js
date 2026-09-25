const EXPRESSION_FIELD = /\b(describe|experience|statement|essay|cover|letter|motivation|why|summary|about|bio|background|accomplishment|qualification)\b/i;
const freeze = (value) => Object.freeze(value);

function factsFor(field, profile = {}) {
  const name = String(field?.name || field?.id || '');
  const label = String(field?.label || '');
  const exact = profile[name];
  if (typeof exact === 'string' && exact.trim()) return [{ ref: `profile.${name}`, text: exact.trim() }];

  const pools = [];
  if (/experience|background|qualification|accomplishment/i.test(`${name} ${label}`)) pools.push(['experienceFacts', profile.experienceFacts], ['experience', profile.experience]);
  if (/why|motivation/i.test(`${name} ${label}`)) pools.push(['motivationFacts', profile.motivationFacts], ['motivation', profile.motivation]);
  if (/bio|about|summary/i.test(`${name} ${label}`)) pools.push(['bioFacts', profile.bioFacts], ['bio', profile.bio]);
  if (/cover|letter|statement|essay/i.test(`${name} ${label}`)) pools.push(['statementFacts', profile.statementFacts], ['facts', profile.facts]);
  pools.push(['facts', profile.facts]);

  const seen = new Set();
  const facts = [];
  for (const [key, value] of pools) {
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    for (const item of values) {
      const text = String(item || '').trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      facts.push({ ref: `profile.${key}`, text });
    }
  }
  return facts;
}

function realize(facts) {
  return facts.map((fact) => fact.text.replace(/[.\s]+$/g, '')).filter(Boolean).map((text) => `${text}.`).join(' ');
}

export class BrowserFieldExpressionComposer {
  constructor({ autoNovel, messy } = {}) {
    if (!autoNovel || !messy) throw new Error('BrowserFieldExpressionComposer requires AutoNovel and MESSY roles');
    this.autoNovel = autoNovel;
    this.messy = messy;
  }

  isExpressionField(field = {}) {
    return field.type === 'textarea' || EXPRESSION_FIELD.test(`${field.name || ''} ${field.label || ''}`);
  }

  compose({ field, message, route, comprehension, profile = {}, page = null } = {}) {
    if (!this.isExpressionField(field)) return freeze({ status: 'not-expression-field', name: field?.name || null });
    const facts = factsFor(field, profile);
    if (!facts.length) {
      return freeze({ status: 'insufficient-evidence', name: field.name, evidenceRefs: freeze([]), text: null });
    }
    const prompt = `Answer browser field "${field.label || field.name}" for task: ${message}`;
    const expressionPlan = this.autoNovel.plan(prompt, { kind: 'expression', task: 'browser-field', dimension: route?.dimension || null }, comprehension);
    const morph = this.messy.route(expressionPlan);
    const text = realize(facts);
    return freeze({
      status: 'composed',
      name: field.name,
      text,
      evidenceRefs: freeze(facts.map((fact) => fact.ref)),
      expressionPlan,
      morph,
      pageTitle: page?.title || null
    });
  }

  composeForPage({ page, message, route, comprehension, profile = {} } = {}) {
    const form = page?.forms?.[0];
    if (!form) return freeze({ values: freeze({}), sources: freeze({}), fields: freeze([]) });
    const values = {};
    const sources = {};
    const fields = [];
    for (const field of form.fields || []) {
      if (field.value !== null && field.value !== undefined && field.value !== '') continue;
      const result = this.compose({ field, message, route, comprehension, profile, page });
      fields.push(result);
      if (result.status !== 'composed') continue;
      values[field.name] = result.text;
      sources[field.name] = { kind: 'generated-expression', ref: `autonovel+messy:${field.name}`, evidenceRefs: result.evidenceRefs };
    }
    return freeze({ values: freeze(values), sources: freeze(sources), fields: freeze(fields) });
  }
}

export default BrowserFieldExpressionComposer;
