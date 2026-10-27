/**
 * Opt-in local Ollama chat adapter for Synthia.
 * The archive Super-Polo-Custom-LLM-Builder provides the deployment concept,
 * not pretrained weights. This adapter never bundles or trains an LLM.
 * Only caller-configured model tags are accepted; endpoint is fixed to loopback.
 */
const ENDPOINT = 'http://127.0.0.1:11434/api/chat';
const MAX_MESSAGE = 12000;
const ALLOWED_MODEL = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,127}(?::[a-zA-Z0-9][a-zA-Z0-9._-]{0,63})?$/;

export class LocalOllamaLlm {
  constructor({ model = null, fetchImpl = globalThis.fetch, timeoutMs = 45000 } = {}) {
    if (model !== null && (typeof model !== 'string' || !ALLOWED_MODEL.test(model))) {
      throw new TypeError('Ollama model must be a nonempty local model tag (no URL).');
    }
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation required');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000)
      throw new RangeError('LLM request timeout must be 1000–120000 ms');
    this.model = model;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  get configured() { return this.model !== null; }

  status() {
    return { provider: 'ollama-local', configured: this.configured,
      model: this.model, endpoint: 'loopback-only', reachable: 'not-checked' };
  }

  async chat({ text, history = [] } = {}) {
    if (!this.configured) throw new Error('Local LLM is not configured; set SYNTHIA_LLM_MODEL and run Ollama.');
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_MESSAGE)
      throw new TypeError('A nonempty bounded message is required.');
    if (!Array.isArray(history)) throw new TypeError('History must be an array.');
    const context = history.slice(-6).flatMap(item => [
      { role: 'user', content: String(item?.input ?? '').slice(0, MAX_MESSAGE) },
      { role: 'assistant', content: String(item?.text ?? '').slice(0, MAX_MESSAGE) },
    ]).filter(m => m.content.trim());
    const messages = [
      { role: 'system', content: 'You are Synthia, the Adaptive Computer assistant. ' +
        'Answer the user directly, without pretending to have performed actions, run tools, or verified facts. ' +
        'Existing Computer services own tools and persistent state; this language model only generates text.' },
      ...context,
      { role: 'user', content: text },
    ];
    let response;
    try {
      response = await this.fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages, stream: false,
          options: { num_predict: 512 } }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new Error(`Local Ollama unreachable: ${String(error?.message ?? error)}`);
    }
    if (!response?.ok) {
      throw new Error(`Local Ollama returned HTTP ${response?.status ?? 'unknown'}; check whether model ${this.model} is installed.`);
    }
    const payload = await response.json();
    const answer = payload?.message?.content;
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 12000)
      throw new Error('Local Ollama returned no valid bounded text.');
    return { text: answer.trim(), provider: 'ollama-local', model: this.model };
  }
}
