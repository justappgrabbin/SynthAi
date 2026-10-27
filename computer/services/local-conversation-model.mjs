/**
 * Conversational model adapter for the EXISTING Synthia Computer.
 * No new consciousness graph, no API key, no remote hosted provider.
 * AutoLing, DISEMINER, semantic state, provenance, and history stay in
 * the established ConversationExecution pipeline.
 */
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
const DEFAULT_ENDPOINT = 'http://127.0.0.1:11434';
const clean = (text, cap = 4000) => String(text ?? '').slice(0, cap);

export class LocalConversationModel {
  constructor({
    endpoint = process.env.SYNTHIA_OLLAMA_URL || DEFAULT_ENDPOINT,
    model = process.env.SYNTHIA_OLLAMA_MODEL || '',
    fetcher = globalThis.fetch,
    timeoutMs = 90000,
  } = {}) {
    this.endpoint = new URL(endpoint);
    if (this.endpoint.protocol !== 'http:' || !LOOPBACK.has(this.endpoint.hostname)
      || this.endpoint.username || this.endpoint.password || this.endpoint.search
      || this.endpoint.hash || (this.endpoint.pathname !== '/' && this.endpoint.pathname !== '')) {
      throw new TypeError('Local model URL must be an HTTP loopback address without credentials.');
    }
    if (typeof fetcher !== 'function') throw new TypeError('An HTTP fetch implementation is required.');
    this.fetcher = fetcher;
    this.model = String(model).trim();
    this.timeoutMs = timeoutMs;
  }

  async available() {
    try {
      const response = await this.fetcher(new URL('/api/tags', this.endpoint), {
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 2500)),
      });
      if (!response.ok) throw new Error('model service HTTP ' + response.status);
      const data = await response.json();
      const installed = (Array.isArray(data.models) ? data.models : [])
        .filter(item => typeof item?.name === 'string' && item.name)
        .map(item => ({ name: item.name, size: Number(item.size) || 0 }));
      const selected = this.model
        ? installed.find(item => item.name === this.model || item.name.split(':')[0] === this.model)?.name
        : installed.find(item => /^qwen3:.*[134]b/i.test(item.name))?.name
          ?? installed.find(item => /^llama3\.2(?::|$)/i.test(item.name))?.name
          ?? installed.filter(item => !item.size || item.size < 7000000000)
            .sort((a, b) => (a.size || Infinity) - (b.size || Infinity))[0]?.name;
      return {
        ready: Boolean(selected), provider: 'local:ollama', model: selected || null,
        installed: installed.map(x => x.name),
        note: selected ? 'Local language generation ready.' :
          (this.model ? 'Requested model is not installed in Ollama.' :
          'Ollama is available but no suitable small local model is installed.'),
      };
    } catch (error) {
      return {
        ready: false, provider: 'local:ollama', model: null, installed: [],
        note: 'Local Ollama service is not available. Start Ollama and install a conversational model.',
      };
    }
  }

  async reply({ input, history = [], reading = null } = {}) {
    const status = await this.available();
    if (!status.ready) {
      return {
        text: status.note + ' Synthia has not generated a conversational answer to this turn.',
        kind: 'conversation-model-unavailable', provider: 'computer:local-model-unavailable',
        evidence: [], llm: false,
      };
    }
    const context = {
      perception: 'Language tools have analyzed this message; results are evidence, not objective proof.',
      grammar: reading?.grammarFrame ?? null,
      provisionalClaims: (reading?.candidateClaims ?? []).slice(0, 6)
        .map(x => ({ text: clean(x.text, 180), status: 'reported-not-verified' })),
    };
    const messages = [{
      role: 'system',
      content: 'You are Synthia speaking through the existing SynthAI Computer. Respond naturally and substantively to the human, including multi-turn context. You are assisted by the existing AutoLing, DISEMINER and semantic-spacetime state, but their proposed claims are not verified facts. Preserve distinctions between the human’s words, your inferences, and external evidence. Respect corrections. Never claim to have performed an action, consulted a tool, verified a chart, sensed a physical environment, or changed a file unless direct evidence is present. Do not give canned keyword-based responses. If information is missing, acknowledge it precisely. This is a local conversational model, not consciousness or a guarantee of understanding.',
    }, {
      role: 'system', content: 'Current linguistic context (unverified unless explicitly tagged): ' + JSON.stringify(context).slice(0, 2100),
    }];
    for (const turn of history.slice(-8)) {
      if (turn?.input) messages.push({ role:'user', content:clean(turn.input) });
      if (turn?.text && turn.answerKind !== 'conversation-model-unavailable')
        messages.push({ role:'assistant', content:clean(turn.text) });
    }
    messages.push({ role: 'user', content: clean(input, 12000) });
    try {
      const response = await this.fetcher(new URL('/api/chat', this.endpoint), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ model:status.model, messages, stream:false,
          options:{temperature:0.65, num_predict:768} }),
        signal:AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new Error('model generation HTTP ' + response.status);
      const payload = await response.json();
      const text = String(payload?.message?.content ?? '').trim();
      if (!text) throw new Error('model returned no reply');
      return { text, kind:'local-generative-dialogue', provider:'local:ollama:' + status.model,
        evidence:[], llm:true };
    } catch (error) {
      return {
        text:'The local conversation model was detected but could not complete this reply (' +
          clean(error?.message, 180) + '). No substitute answer was invented.',
        kind:'conversation-model-unavailable', provider:'computer:local-model-unavailable',
        evidence:[], llm:false,
      };
    }
  }
}
export default LocalConversationModel;
