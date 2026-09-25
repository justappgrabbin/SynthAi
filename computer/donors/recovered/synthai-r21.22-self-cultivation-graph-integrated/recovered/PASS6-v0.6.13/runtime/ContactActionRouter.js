const DIMENSIONS = Object.freeze({
  who: 'SPACE',
  what: 'MOVEMENT',
  where: 'BEING',
  when: 'EVOLUTION',
  why: 'DESIGN'
});

const normalize = (text) => String(text || '').trim();

export class ContactActionRouter {
  route(message, comprehension = {}) {
    const text = normalize(message);
    const lower = text.toLowerCase();
    const dimension = this.dimensionFor(lower);

    const browser = this.browserIntent(lower);
    if (browser) {
      return Object.freeze({
        kind: 'browser',
        task: browser,
        dimension,
        reason: 'message requests an external-site action',
        comprehension
      });
    }

    const expression = this.expressionIntent(lower);
    if (expression) {
      return Object.freeze({
        kind: 'expression',
        task: expression,
        dimension,
        reason: 'message requests a constructed or strong expression',
        comprehension
      });
    }

    return Object.freeze({
      kind: 'chat',
      task: 'basic-contact',
      dimension,
      reason: 'no external action or constructed expression required',
      comprehension
    });
  }

  dimensionFor(lower) {
    for (const [root, dimension] of Object.entries(DIMENSIONS)) {
      if (new RegExp(`\\b${root}\\b`, 'i').test(lower)) return dimension;
    }
    if (/\b(fill|submit|apply|application|order|buy|purchase|book|reserve|open|website|site|form)\b/.test(lower)) return 'BEING';
    if (/\b(create|make|build|draw|render|show|visualize|write|generate)\b/.test(lower)) return 'DESIGN';
    return 'MOVEMENT';
  }

  browserIntent(lower) {
    if (/\b(application|apply|fill(?:\s+out)?|form|paperwork|sign\s*up|register)\b/.test(lower)) return 'form-workflow';
    if (/\b(order|buy|purchase|checkout|cart|shop|shopping)\b/.test(lower)) return 'purchase-workflow';
    if (/\b(book|reserve|reservation|appointment|schedule)\b/.test(lower)) return 'booking-workflow';
    if (/\b(open|visit|go to|website|site|web page|browser)\b/.test(lower)) return 'navigation-workflow';
    return null;
  }

  expressionIntent(lower) {
    if (/\b(video|animation|animate|clip|movie)\b/.test(lower)) return 'video';
    if (/\b(image|picture|photo|diagram|visual|draw|illustration)\b/.test(lower)) return 'image';
    if (/\b(code|app|tool|script|program|website|webapp|apk)\b/.test(lower) && /\b(create|make|build|write|generate)\b/.test(lower)) return 'code';
    if (/\b(document|report|essay|letter|portfolio|pdf)\b/.test(lower) && /\b(create|make|build|write|generate|prepare)\b/.test(lower)) return 'document';
    if (/\b(show me|visualize|strong expression|express this)\b/.test(lower)) return 'rich-expression';
    return null;
  }
}

export default ContactActionRouter;
