/**
 * Minimal MCP Streamable HTTP client implementing the same small contract
 * consumed by SynthiaToolbox: initialize(), listTools(), callTool(), close().
 *
 * Provider credentials stay outside Synthia core. Config can reference
 * environment variables via headerEnv; the resolved secret is held only in
 * this process and is never written into the opportunity ledger.
 */
export class McpStreamableHttpClient {
  constructor({ url, headers = {}, headerEnv = {}, requestTimeoutMs = 10000, fetchImpl = fetch } = {}) {
    if (!url) throw new Error('MCP HTTP URL is required');
    this.url = url;
    this.staticHeaders = headers;
    this.headerEnv = headerEnv;
    this.requestTimeoutMs = requestTimeoutMs;
    this.fetchImpl = fetchImpl;
    this.nextId = 1;
    this.sessionId = null;
    this.initialized = false;
  }
  async start() {}
  resolveHeaders() {
    const out = { ...this.staticHeaders };
    for (const [name, envName] of Object.entries(this.headerEnv || {})) {
      const value = process.env[envName];
      if (value) out[name] = value;
    }
    return out;
  }
  async initialize(clientInfo = { name: 'synthia-toolbox', version: '0.1.0' }) {
    if (this.initialized) return;
    await this.request('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo });
    await this.notify('notifications/initialized', {});
    this.initialized = true;
  }
  async listTools() {
    if (!this.initialized) await this.initialize();
    const result = await this.request('tools/list', {});
    return result?.tools || [];
  }
  async callTool(name, args) {
    if (!this.initialized) await this.initialize();
    return await this.request('tools/call', { name, arguments: args });
  }
  async close() {
    this.initialized = false;
    this.sessionId = null;
  }
  async notify(method, params) {
    const message = { jsonrpc: '2.0', method, params };
    await this.post(message, false);
  }
  async request(method, params) {
    const id = this.nextId++;
    const message = { jsonrpc: '2.0', id, method, params };
    const response = await this.post(message, true);
    if (response?.error) throw new Error(response.error.message || `MCP ${method} failed`);
    return response?.result;
  }
  async post(message, expectResponse) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const headers = {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
        ...this.resolveHeaders(),
        ...(this.sessionId ? { 'mcp-session-id': this.sessionId } : {})
      };
      const res = await this.fetchImpl(this.url, { method: 'POST', headers, body: JSON.stringify(message), signal: controller.signal });
      const session = res.headers.get('mcp-session-id');
      if (session) this.sessionId = session;
      if (!res.ok) throw new Error(`MCP HTTP ${res.status}: ${await res.text()}`);
      if (!expectResponse || res.status === 202 || res.status === 204) return null;
      const text = await res.text();
      if (!text.trim()) return null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/event-stream')) {
        const events = text.split(/\r?\n\r?\n/).flatMap(block => block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim())).filter(Boolean);
        for (const data of events) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.id === message.id || parsed.error || parsed.result) return parsed;
          } catch {}
        }
        throw new Error('MCP HTTP stream did not contain a JSON-RPC response');
      }
      return JSON.parse(text);
    } finally {
      clearTimeout(timer);
    }
  }
}
