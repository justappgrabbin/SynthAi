const STOPWORDS = new Set('i me my we our you your the a an to for of on in at with and or but need want please can could would should just this that it something site website page'.split(/\s+/));
const BINDING = /\b(submit|place\s+order|pay|purchase|confirm|authorize|agree|accept\s+terms|e-?sign|sign\s+now|delete|remove\s+account|send\s+application)\b/i;

const TASK_TERMS = Object.freeze({
  'form-workflow': ['apply','application','form','register','registration','signup','sign up','career','careers','job','jobs','employment','work','join','candidate','open roles','continue','next','start'],
  'purchase-workflow': ['shop','store','product','products','order','buy','item','catalog','cart','food','supplies','search'],
  'booking-workflow': ['book','booking','reserve','reservation','appointment','schedule','availability','calendar','time','slot'],
  'navigation-workflow': ['open','visit','learn','more','continue','next']
});

function words(text) {
  return String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function uniq(values) { return [...new Set(values.filter(Boolean))]; }

export class BrowserPerceptionNavigator {
  constructor({ maxSteps = 8, minimumScore = 1.25 } = {}) {
    this.maxSteps = maxSteps;
    this.minimumScore = minimumScore;
  }

  termsFor(message, route = {}) {
    const direct = words(message).filter((word) => word.length > 2 && !STOPWORDS.has(word));
    const task = TASK_TERMS[route.task] || [];
    return uniq([...direct, ...task.flatMap(words)]);
  }

  goalReached(page, route = {}) {
    const forms = page?.forms || [];
    if (route.task === 'form-workflow') {
      const useful = forms.find((form) => (form.fields || []).some((field) => !['search','hidden'].includes(field.type) && !/search/i.test(`${field.name} ${field.label}`)));
      if (useful) return { reached: true, reason: 'fillable-form-found', formId: useful.id };
    }
    if (route.task === 'purchase-workflow') {
      const action = (page?.actions || []).find((item) => /add\s+to\s+cart|choose|select\s+item/i.test(item.text));
      if (action) return { reached: true, reason: 'product-action-surface-found', actionId: action.id };
    }
    if (route.task === 'booking-workflow') {
      const action = (page?.actions || []).find((item) => /select\s+(time|slot)|availability|choose\s+time/i.test(item.text));
      if (action || forms.length) return { reached: true, reason: action ? 'booking-action-surface-found' : 'booking-form-found', actionId: action?.id || null };
    }
    return { reached: false, reason: null };
  }

  rankActions(page, message, route = {}, visited = new Set(), memoryHints = []) {
    const terms = this.termsFor(message, route);
    const remembered = new Set((memoryHints || []).map((value) => String(value || '').trim()).filter(Boolean));
    const ranked = [];
    for (const action of page?.actions || []) {
      const haystack = `${action.text || ''} ${action.href || ''} ${action.context || ''}`.toLowerCase();
      const key = `${page?.title || ''}|${action.text || ''}|${action.href || ''}`;
      const binding = BINDING.test(`${action.text || ''} ${action.context || ''}`);
      let score = 0;
      const matched = [];
      for (const term of terms) {
        if (haystack.includes(term)) {
          matched.push(term);
          score += (action.text || '').toLowerCase().includes(term) ? 1.5 : 0.45;
        }
      }
      if (/\b(apply|application|careers?|jobs?|open roles)\b/i.test(action.text || '') && route.task === 'form-workflow') score += 2.5;
      if (/\b(shop|products?|store|cart)\b/i.test(action.text || '') && route.task === 'purchase-workflow') score += 2;
      if (/\b(book|reserve|appointment|schedule|availability)\b/i.test(action.text || '') && route.task === 'booking-workflow') score += 2;
      if (/\b(next|continue|start)\b/i.test(action.text || '')) score += 0.4;
      const memoryMatched = remembered.has(String(action.text || '').trim());
      if (memoryMatched) score += 8;
      if (visited.has(key)) score -= 100;
      if (binding) score -= 1000;
      ranked.push(Object.freeze({ action, score, matched: Object.freeze(uniq(matched)), binding, key, memoryMatched }));
    }
    ranked.sort((a, b) => b.score - a.score || String(a.action.text).localeCompare(String(b.action.text)));
    return Object.freeze(ranked);
  }

  async navigate({ executor, message, route, maxSteps = this.maxSteps, memory = null, url = null } = {}) {
    if (!executor) throw new Error('BrowserPerceptionNavigator requires an executor');
    const trace = [];
    const visited = new Set();
    let lastFingerprint = null;

    for (let step = 0; step <= maxSteps; step++) {
      const page = await executor.inspectPage();
      const fingerprint = `${page.title}|${page.headings?.join('|') || ''}|${page.text?.slice(0, 500) || ''}`;
      const goal = this.goalReached(page, route);
      if (goal.reached) {
        return Object.freeze({ status: 'goal-reached', reason: goal.reason, page, trace: Object.freeze(trace), steps: trace.length, goal });
      }
      if (step === maxSteps) return Object.freeze({ status: 'navigation-limit', page, trace: Object.freeze(trace), steps: trace.length });

      const memoryHints = memory?.recommendActions?.({ url: url || page?.url, page, message, route }) || [];
      const ranked = this.rankActions(page, message, route, visited, memoryHints);
      const best = ranked.find((candidate) => !candidate.binding && candidate.score >= this.minimumScore);
      if (!best) {
        return Object.freeze({ status: 'needs-guidance', reason: 'no-safe-relevant-action', page, trace: Object.freeze(trace), ranked: Object.freeze(ranked.slice(0, 5)) });
      }

      visited.add(best.key);
      const click = await executor.clickAction(best.action.id);
      trace.push(Object.freeze({
        step: trace.length + 1,
        pageTitle: page.title,
        actionId: best.action.id,
        actionText: best.action.text,
        score: best.score,
        matched: best.matched,
        memoryMatched: best.memoryMatched,
        memoryHints: Object.freeze([...memoryHints]),
        result: click
      }));
      if (!click?.ok) return Object.freeze({ status: 'action-failed', page, trace: Object.freeze(trace), failed: best.action });
      const after = await executor.inspectPage();
      const afterFingerprint = `${after.title}|${after.headings?.join('|') || ''}|${after.text?.slice(0, 500) || ''}`;
      if (afterFingerprint === fingerprint && lastFingerprint === fingerprint) {
        return Object.freeze({ status: 'stalled', reason: 'page-did-not-change', page: after, trace: Object.freeze(trace) });
      }
      lastFingerprint = fingerprint;
    }
    throw new Error('unreachable');
  }
}

export default BrowserPerceptionNavigator;
