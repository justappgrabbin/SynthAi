import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8798';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) Object.freeze(value);
  return value;
}

function normalBaseUrl(value) {
  const url = new URL(String(value || DEFAULT_BASE_URL));
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Mac bridge must use http or https');
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.href.replace(/\/$/, '');
}

function loadPairing(path) {
  if (!path) return {};
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export class MacHandBridge {
  constructor({ baseUrl, token, timeoutMs = 2200, persistencePath = null } = {}) {
    this.persistencePath = persistencePath ? resolve(String(persistencePath)) : null;
    const saved = loadPairing(this.persistencePath);
    const environmentBase = process.env.SYNTHIA_MAC_BRIDGE_URL || '';
    const environmentToken = process.env.SYNTHIA_MAC_BRIDGE_TOKEN || '';
    this.baseUrl = normalBaseUrl(baseUrl || environmentBase || saved.baseUrl || DEFAULT_BASE_URL);
    this.token = String(token || environmentToken || saved.token || '');
    this.timeoutMs = timeoutMs;
  }

  configure({ baseUrl = this.baseUrl, token = this.token } = {}) {
    this.baseUrl = normalBaseUrl(baseUrl);
    this.token = String(token || '');
    if (this.persistencePath) {
      mkdirSync(dirname(this.persistencePath), { recursive: true });
      writeFileSync(
        this.persistencePath,
        JSON.stringify({ baseUrl: this.baseUrl, token: this.token }, null, 2) + '\n',
        { encoding: 'utf8', mode: 0o600 },
      );
    }
    return freeze({ ok: true, baseUrl: this.baseUrl, paired: Boolean(this.token), persisted: Boolean(this.persistencePath) });
  }

  async request(path, { method = 'GET', body = null } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    timer.unref?.();
    try {
      const headers = {};
      if (body !== null) headers['content-type'] = 'application/json';
      if (this.token) headers.authorization = `Bearer ${this.token}`;
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === null ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload = {};
      try { payload = text ? JSON.parse(text) : {}; }
      catch { payload = { ok: false, error: text || `HTTP ${response.status}` }; }
      if (!response.ok) {
        const error = new Error(payload.error || `Mac bridge HTTP ${response.status}`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }
      return freeze(payload);
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeout = new Error(`Mac bridge timed out after ${this.timeoutMs}ms`);
        timeout.code = 'MAC_BRIDGE_TIMEOUT';
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async status() {
    try {
      const status = await this.request('/status');
      return freeze({ available: true, reachable: true, paired: Boolean(this.token), baseUrl: this.baseUrl, ...status });
    } catch (error) {
      return freeze({
        available: false,
        reachable: false,
        paired: Boolean(this.token),
        baseUrl: this.baseUrl,
        error: error.message,
        code: error.code ?? null,
      });
    }
  }

  apps() { return this.request('/apps'); }
  openApp({ name = '', bundleId = '' } = {}) {
    return this.request('/open-app', { method: 'POST', body: { name: String(name || ''), bundleId: String(bundleId || '') } });
  }
  openUrl(url) { return this.request('/open-url', { method: 'POST', body: { url: String(url || '') } }); }

  async command(message) {
    const raw = String(message ?? '').trim();
    let match;
    if ((match = raw.match(/^open\s+(?:mac\s+)?app\s+(.+)$/i))) {
      return freeze({ action: 'open-app', ...(await this.openApp({ name: match[1] })) });
    }
    if ((match = raw.match(/^open\s+(https?:\/\/\S+)$/i))) {
      return freeze({ action: 'open-url', ...(await this.openUrl(match[1])) });
    }
    if (/^(?:list|show)\s+(?:mac\s+)?apps$/i.test(raw)) {
      return freeze({ action: 'apps', ...(await this.apps()) });
    }
    return freeze({ ok: true, status: 'NO_DIRECT_MAC_ACTION', action: null, message: raw });
  }
}

export function macPairingPath(persistenceDir) {
  return resolve(String(persistenceDir || '.synthia-state'), 'mac-bridge.json');
}

export default MacHandBridge;
