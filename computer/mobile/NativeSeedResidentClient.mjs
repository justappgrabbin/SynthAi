async function decode(response) {
  const text = await response.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = { text }; } }
  if (!response.ok) throw new Error(body?.error ?? body?.text ?? `native resident request failed (${response.status})`);
  return body;
}

export class NativeSeedResidentClient {
  constructor({ baseUrl = 'http://127.0.0.1:17757', fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('NativeSeedResidentClient requires fetch');
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
  }

  async health() { return decode(await this.fetchImpl(this.baseUrl + '/health')); }

  async install(source, { sourceLabel = 'mobile-synthimg-runtime' } = {}) {
    const body = source instanceof ArrayBuffer ? new Uint8Array(source) : source;
    return decode(await this.fetchImpl(this.baseUrl + '/packages/resident-image/install', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', 'x-synthai-source': sourceLabel },
      body,
    }));
  }

  async mount(imageId, { residentId = null } = {}) {
    return decode(await this.fetchImpl(this.baseUrl + '/resident-image/mount', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageId, residentId }),
    }));
  }

  async request(residentId, operation, payload = {}) {
    return decode(await this.fetchImpl(this.baseUrl + '/resident-image/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ residentId, operation, payload }),
    }));
  }

  async unmount(residentId) {
    return decode(await this.fetchImpl(this.baseUrl + '/resident-image/unmount', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ residentId }),
    }));
  }
}

export default NativeSeedResidentClient;
