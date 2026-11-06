export class LocalComputerBackendAdapter {
  constructor({ baseUrl = 'http://127.0.0.1:17380', token = '', timeoutMs = 5000 } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.healthSnapshot = null;
    this.verified = false;
  }

  headers(json = false) {
    const headers = {};
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async fetchJson(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.baseUrl + path, { ...options, signal: controller.signal });
      const text = await response.text();
      let body;
      try { body = text ? JSON.parse(text) : {}; }
      catch { throw new Error('local backend returned non-JSON response'); }
      if (!response.ok || body.ok === false) {
        throw new Error(body && body.error && body.error.message || ('local backend HTTP ' + response.status));
      }
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  async health() {
    const body = await this.fetchJson('/health', { headers: this.headers(false) });
    this.healthSnapshot = body;
    return body;
  }

  async rpc(method, ...args) {
    const body = await this.fetchJson('/rpc', {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({ method, args })
    });
    return body.result;
  }

  async verify() {
    const health = await this.health();
    const snapshot = await this.rpc('snapshot');
    if (!snapshot || !snapshot.version) throw new Error('local Computer snapshot probe failed');
    this.verified = true;
    return { health, snapshot };
  }

  async request(payload = {}) {
    if (payload.action === 'status') return this.health();
    if (payload.action === 'rpc') return this.rpc(payload.method, ...(payload.args || []));
    throw new Error('local Computer backend action unsupported: ' + String(payload.action || ''));
  }
}

export default LocalComputerBackendAdapter;
