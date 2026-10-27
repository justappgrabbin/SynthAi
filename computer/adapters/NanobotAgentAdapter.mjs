/**
 * Opt-in loopback-only delegation from SynthAI Computer to a running nanobot.
 * Synthia remains the source of identity, language analysis and owner policy.
 * Nanobot receives one explicit user turn per request and keeps session state.
 */
export class NanobotAgentAdapter {
  constructor({ baseUrl = 'http://127.0.0.1:8900', apiKey = null, timeoutMs = 20000,
    fetchImpl = globalThis.fetch } = {}) {
    let url;
    try { url = new URL(baseUrl); }
    catch { throw new TypeError('Nanobot agent bridge requires a loopback HTTP origin.'); }
    if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new TypeError('Nanobot agent bridge requires a loopback HTTP origin.');
    }
    if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) {
      throw new RangeError('Nanobot timeout must be 100–120000 ms.');
    }
    this.baseUrl = url.origin;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async request({ action = 'chat', message, sessionId = 'synthia:computer', ownerApproved = false } = {}) {
    // This flag must be passed by a privileged caller, not a public endpoint.
    // A boolean alone is NOT a verification of user identity.
    if (ownerApproved !== true) throw new Error('Nanobot execution requires an explicit owner-approved request.');
    if (action !== 'chat') throw new TypeError('Unsupported nanobot operation.');
    if (typeof message !== 'string' || !message.trim() || message.length > 12000) {
      throw new TypeError('A nonempty message of at most 12000 characters is required.');
    }
    if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9:_./-]{1,128}$/.test(sessionId)) {
      throw new TypeError('An opaque, bounded session identifier is required.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers.Authorization = 'Bearer ' + this.apiKey;
      const response = await this.fetchImpl(this.baseUrl + '/v1/chat/completions', {
        method: 'POST', headers,
        body: JSON.stringify({ messages: [{ role: 'user', content: message }], session_id: sessionId }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Nanobot agent returned HTTP ' + response.status + '.');
      const payload = await response.json();
      const text = payload?.choices?.[0]?.message?.content;
      if (typeof text !== 'string') throw new Error('Nanobot agent returned no valid assistant message.');
      return { provider: 'nanobot-agent', sessionId, text, usage: payload.usage ?? null };
    } finally {
      clearTimeout(timeout);
    }
  }
}
