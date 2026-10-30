/**
 * Shared Synthia character-morph capability: a provider router, not a renderer.
 * Real pixels stay inside the local provider (Simlish, desktop, etc.). Neither
 * request images nor output data URLs are written into Computer state or events.
 */
const FORMATS = new Set(['portrait', 'animated', 'rigged']);
const INTENTS = new Set(['auto', ...FORMATS]);
const SUBJECT = /^[a-zA-Z0-9_-]{1,100}$/;

export class MorphCapability {
  constructor({ bus = null, state = null, onProvidersChanged = null } = {}) {
    this.bus = bus;
    this.state = state;
    this.onProvidersChanged = onProvidersChanged;
    this.providers = new Map();
  }

  registerProvider(id, adapter, { formats = ['portrait'], priority = 0 } = {}) {
    if (typeof id !== 'string' || !SUBJECT.test(id)) throw new TypeError('A stable morph provider ID is required');
    if (!adapter || typeof adapter.prepare !== 'function') throw new TypeError('Morph provider must implement prepare(request)');
    if (!Array.isArray(formats) || !formats.length || formats.some(f => !FORMATS.has(f))) throw new TypeError('Morph provider formats must be portrait, animated, or rigged');
    if (!Number.isFinite(priority)) throw new TypeError('Morph provider priority must be finite');
    if (this.providers.has(id)) throw new Error(`Morph provider already registered: ${id}`);
    this.providers.set(id, { id, adapter, formats: [...formats], priority });
    this.bus?.emit('morph:provider-registered', { provider: id, formats });
    this.onProvidersChanged?.(this.listProviders());
    return id;
  }

  listProviders() {
    return [...this.providers.values()].map(({ id, formats, priority }) => ({ id, formats: [...formats], priority }));
  }

  async prepare(request = {}) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) throw new TypeError('Morph request must be an object');
    const subjectId = request.subjectId ?? 'player';
    const intent = request.intent ?? 'auto';
    if (typeof subjectId !== 'string' || !SUBJECT.test(subjectId)) throw new TypeError('Morph subject ID must be 1–100 letters, digits, _ or -');
    if (!INTENTS.has(intent)) throw new TypeError('Unknown morph intent');
    const candidates = [...this.providers.values()]
      .filter(p => (intent === 'auto' || p.formats.includes(intent)) && (typeof p.adapter.supports !== 'function' || p.adapter.supports(request) === true))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    const provider = candidates[0];
    if (!provider) return { status: 'unavailable', reason: 'no-compatible-local-provider', subjectId, intent };
    this.bus?.emit('morph:requested', { subjectId, intent, provider: provider.id });
    let result;
    try {
      result = await provider.adapter.prepare(request);
    } catch (error) {
      this.bus?.emit('morph:failed', { subjectId, provider: provider.id, reason: 'provider-failed' });
      throw error;
    }
    const statuses = new Set(['ready', 'needs_input', 'needs_asset', 'needs_consent', 'unavailable']);
    if (!result || !statuses.has(result.status)) throw new Error('Morph provider returned an invalid status');
    if (result.status === 'ready' && !result.output) throw new Error('Morph provider reported ready without output');
    // Never persist request, output, photo bytes, data URLs, or opaque metadata.
    const receipt = {
      subjectId, provider: provider.id, status: result.status,
      mode: result.kind ?? intent,
      source: ['saved-morph', 'saved-poses', 'existing-body-art', 'existing-pose-sheet'].includes(result.receipt?.source) ? result.receipt.source : 'unspecified',
      reused: result.receipt?.reused === true,
      offline: result.receipt?.offline === true,
      at: Date.now(),
    };
    if (result.status === 'ready') await this.state?.set(`morph.receipts.${subjectId}`, receipt, { source: 'character-morph' });
    this.bus?.emit('morph:result', receipt);
    return { ...result, provider: provider.id, receipt };
  }

  getReceipt(subjectId = 'player') {
    if (!SUBJECT.test(subjectId)) throw new TypeError('Invalid morph subject ID');
    return this.state?.get(`morph.receipts.${subjectId}`) ?? null;
  }
}
