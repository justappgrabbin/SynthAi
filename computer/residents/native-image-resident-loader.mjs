import os from 'node:os';
import path from 'node:path';

const clone = value => value === undefined ? undefined : structuredClone(value);

function descriptorFor(record, { residentId = null } = {}) {
  const type = record.residentType;
  const manifest = record.manifest ?? {};
  const entry = path.join(record.base, record.residentEntry);
  if (type === 'echo') {
    const port = Number(manifest.control_port ?? manifest.controlPort ?? 4580);
    return {
      residentId: residentId ?? manifest.resident_id ?? manifest.residentId ?? 'echo',
      type,
      name: String(manifest.name ?? 'Echo'),
      hostId: `resident-echo-${record.payloadSha256.slice(0, 12)}`,
      argv: [process.execPath, entry],
      cwd: record.base,
      env: { STELLAR_CONTROL_HOST: '127.0.0.1', STELLAR_CONTROL_PORT: String(port) },
      port,
      url: `http://127.0.0.1:${port}`,
      healthPath: '/health',
      statusPath: '/status',
      capabilities: ['resident.echo', 'computer.machine', 'machine.control', 'machine.status', 'machine.start', 'machine.stop'],
      operations: {
        health: ['GET', '/health'],
        status: ['GET', '/status'],
        'machine.status': ['GET', '/status'],
        'machine.plan': ['GET', '/plan'],
        'machine.doctor': ['GET', '/doctor'],
        'machine.init': ['POST', '/init'],
        'machine.download': ['POST', '/download'],
        'machine.start': ['POST', '/start'],
        'machine.start-installer': ['POST', '/start-installer'],
        'machine.stop': ['POST', '/stop'],
      },
    };
  }
  if (type === 'synthia58') {
    const port = Number(manifest.port ?? manifest.resident_port ?? manifest.residentPort ?? 17759);
    const dataDir = manifest.data_dir ?? manifest.dataDir ?? process.env.SYNTHIA58_DATA_DIR ?? path.join(os.homedir(), '.synthai', 'residents', 'synthia58', 'state');
    return {
      residentId: residentId ?? manifest.resident_id ?? manifest.residentId ?? 'synthia-prime',
      type,
      name: String(manifest.name ?? 'Synthia Prime'),
      hostId: `resident-synthia58-${record.payloadSha256.slice(0, 12)}`,
      argv: [process.execPath, entry],
      cwd: record.base,
      env: { PORT: String(port), SYNTHIA_DATA_DIR: String(dataDir) },
      port,
      url: `http://127.0.0.1:${port}`,
      healthPath: '/api/status',
      statusPath: '/api/status',
      capabilities: ['resident.synthia58', 'chat', 'artifact.execute', 'morph', 'browser.hand', 'state.persist'],
      operations: {
        health: ['GET', '/api/status'],
        status: ['GET', '/api/status'],
        chat: ['POST', '/api/chat'],
        execute: ['POST', '/api/execute'],
        tray: ['POST', '/api/tray'],
        'identity.configure': ['POST', '/api/identity/configure'],
        'identity.status': ['GET', '/api/identity'],
        'morph.status': ['GET', '/api/solo/morph-state'],
        'solo.status': ['GET', '/api/solo/status'],
        'solo.world': ['GET', '/api/solo/world'],
        'solo.tasks': ['GET', '/api/solo/tasks'],
      },
    };
  }
  throw new Error(`No native resident descriptor is registered for ${type || 'unknown resident type'}`);
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { text }; }
}

export class NativeImageResidentLoader {
  constructor({ computer, packageStore, bus = null, fetchImpl = globalThis.fetch, clock = () => Date.now() } = {}) {
    if (!computer?.meshKernel || !computer?.registerResident) throw new TypeError('NativeImageResidentLoader requires native Computer runtime');
    if (!packageStore?.verify) throw new TypeError('NativeImageResidentLoader requires resident image package store');
    if (typeof fetchImpl !== 'function') throw new TypeError('NativeImageResidentLoader requires fetch implementation');
    Object.assign(this, { computer, packageStore, bus: bus ?? computer.bus, fetchImpl, clock });
    this.mounts = new Map();
  }

  async #request(descriptor, method, route, body = undefined) {
    const response = await this.fetchImpl(descriptor.url + route, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const parsed = await responseBody(response);
    if (!response.ok) throw new Error(`${descriptor.type} resident request failed ${response.status}: ${parsed?.error ?? parsed?.text ?? response.statusText}`);
    return parsed;
  }

  async #waitHealthy(descriptor, timeoutMs = 15000) {
    const deadline = this.clock() + timeoutMs;
    let lastError = null;
    while (this.clock() <= deadline) {
      try {
        const result = await this.#request(descriptor, 'GET', descriptor.healthPath);
        return result;
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    throw new Error(`${descriptor.name} did not become healthy: ${lastError?.message ?? 'timeout'}`);
  }

  async mount({ imageId, residentId = null, timeoutMs = 15000 } = {}) {
    if (!imageId) throw new Error('resident image id required');
    const verified = await this.packageStore.verify(imageId);
    if (!verified.installed) throw new Error(`resident image unavailable: ${imageId} (${verified.reason ?? 'not installed'})`);
    if (!this.computer.terminal?.hostApp) throw new Error('native process host is not bound');
    const record = verified.record;
    const descriptor = descriptorFor(record, { residentId });
    const previous = this.mounts.get(descriptor.residentId);
    previous?.unbind?.();

    const host = await this.computer.terminal.hostApp({
      id: descriptor.hostId,
      label: descriptor.name,
      argv: descriptor.argv,
      cwd: descriptor.cwd,
      env: descriptor.env,
      port: descriptor.port,
      url: descriptor.url,
    });
    const health = await this.#waitHealthy(descriptor, timeoutMs);

    await this.computer.registerResident(descriptor.residentId, {
      publicState: {
        name: descriptor.name,
        residentType: descriptor.type,
        imageId: record.id,
        url: descriptor.url,
        healthy: true,
      },
      capabilities: descriptor.capabilities,
      metadata: {
        residentImage: true,
        imageId: record.id,
        imageSha256: record.payloadSha256,
        residentEntry: record.residentEntry,
        hostId: descriptor.hostId,
      },
    });
    await this.computer.meshKernel.setResidency(descriptor.residentId, 'active');
    if (this.computer.meshKernel.participant('computer:self') && !this.computer.meshKernel.relationshipsFor(descriptor.residentId).some(edge => edge.type === 'resident-of' && edge.to === 'computer:self')) {
      await this.computer.meshKernel.connect(descriptor.residentId, 'computer:self', {
        type: 'resident-of',
        evidence: { imageId: record.id, residentType: descriptor.type },
      });
    }

    const unbind = this.computer.meshKernel.bindHandler(descriptor.residentId, async envelope => {
      if (envelope.operation === 'request') {
        const payload = envelope.payload ?? {};
        const route = String(payload.path ?? '/');
        if (!route.startsWith('/') || route.includes('..')) throw new Error('resident request path must be a safe absolute path');
        const method = String(payload.method ?? 'GET').toUpperCase();
        if (!['GET', 'POST'].includes(method)) throw new Error('resident request method must be GET or POST');
        return this.#request(descriptor, method, route, payload.body);
      }
      if (envelope.operation === 'process.stop') return this.stop(descriptor.residentId);
      const operation = descriptor.operations[envelope.operation];
      if (!operation) throw new Error(`unsupported ${descriptor.type} resident operation: ${envelope.operation}`);
      const [method, route] = operation;
      return this.#request(descriptor, method, route, method === 'POST' ? (envelope.payload ?? {}) : undefined);
    });

    const mounted = {
      residentId: descriptor.residentId,
      imageId: record.id,
      residentType: descriptor.type,
      name: descriptor.name,
      url: descriptor.url,
      host: clone(host),
      health: clone(health),
      descriptor,
      unbind,
      mountedAt: this.clock(),
    };
    this.mounts.set(descriptor.residentId, mounted);
    this.bus?.emit('resident-image:mounted', this.#public(mounted));
    return this.#public(mounted);
  }

  async stop(residentId) {
    const mounted = this.mounts.get(String(residentId));
    if (!mounted) return { stopped: false, reason: 'NOT_MOUNTED', residentId: String(residentId) };
    const result = await this.computer.terminal.stopApp(mounted.descriptor.hostId);
    await this.computer.meshKernel.setResidency(mounted.residentId, 'warm');
    await this.computer.meshKernel.publishPresence(mounted.residentId, { healthy: false });
    this.bus?.emit('resident-image:stopped', { residentId: mounted.residentId, residentType: mounted.residentType });
    return { stopped: true, residentId: mounted.residentId, result };
  }

  async unmount(residentId) {
    const mounted = this.mounts.get(String(residentId));
    if (!mounted) return false;
    await this.stop(residentId);
    mounted.unbind?.();
    await this.computer.meshKernel.setResidency(mounted.residentId, 'offline');
    this.mounts.delete(String(residentId));
    this.bus?.emit('resident-image:unmounted', { residentId: String(residentId) });
    return true;
  }

  get(residentId) { const mounted = this.mounts.get(String(residentId)); return mounted ? this.#public(mounted) : null; }
  snapshot() { return [...this.mounts.values()].map(mounted => this.#public(mounted)); }

  #public(mounted) {
    return {
      residentId: mounted.residentId,
      imageId: mounted.imageId,
      residentType: mounted.residentType,
      name: mounted.name,
      url: mounted.url,
      host: clone(mounted.host),
      health: clone(mounted.health),
      mountedAt: mounted.mountedAt,
    };
  }
}

export default NativeImageResidentLoader;
