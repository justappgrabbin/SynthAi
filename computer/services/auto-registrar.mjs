const clone = value => value === undefined ? undefined : structuredClone(value);

const ACCEPTED_EVENTS = new Map([
  ['artifact:ingested', 'artifact'],
  ['vfs:write', 'file'],
  ['project:created', 'project'],
  ['project:file-written', 'file'],
  ['project:published', 'publication'],
  ['app:mounted', 'mount'],
  ['app:contract-issued', 'contract'],
  ['mutation:applied', 'mutation'],
  ['automata:complete', 'automata-run'],
  ['process:complete', 'process-run'],
  ['github:configured', 'connector']
]);

const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');

function identityFor(kind, payload = {}, event = {}) {
  const record = payload.record ?? payload.artifact ?? payload;
  return String(first(
    record.id,
    payload.id,
    payload.artifactId,
    payload.mountId,
    payload.runId,
    payload.projectId && payload.path ? `${payload.projectId}:${payload.path}` : undefined,
    payload.projectId,
    payload.path,
    payload.appId,
    payload.baseUrl,
    `${event.type}:${event.at}`
  ));
}

function normalizeCapabilities(record = {}) {
  const raw = first(record.capabilities, record.providers, record.requires, []);
  return Array.isArray(raw) ? [...raw] : raw ? [raw] : [];
}

function normalizeRelationships(payload = {}) {
  const keys = ['artifactId', 'projectId', 'mountId', 'appId', 'backend', 'shell', 'provider_id'];
  return keys.filter(key => payload[key] !== undefined && payload[key] !== null)
    .map(key => ({ type: key, target: String(payload[key]) }));
}

function locationFor(record = {}, payload = {}) {
  return first(record.path, payload.vfsPath, payload.path, payload.baseUrl, record.url, null);
}

export class AutoRegistrar {
  constructor({ bus, state } = {}) {
    if (!bus) throw new Error('AutoRegistrar bus required');
    if (!state) throw new Error('AutoRegistrar state required');
    this.bus = bus;
    this.state = state;
    this.entries = new Map();
    this.queue = Promise.resolve();
    this.unsubscribe = null;
  }

  start() {
    if (this.unsubscribe) return this;
    const persisted = this.state.get('registrations.entries', {});
    for (const entry of Object.values(persisted || {})) {
      if (entry?.key) this.entries.set(entry.key, entry);
    }
    this.unsubscribe = this.bus.on('*', event => this.#onEvent(event));
    return this;
  }

  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  #onEvent(event) {
    if (!event?.type || event.type.startsWith('registration:')) return;

    const registryMatch = event.type.match(/^([^:]+):registered$/);
    if (registryMatch) {
      const payload = event.payload ?? {};
      const record = payload.record ?? payload;
      this.registerAccepted({
        kind: registryMatch[1],
        identity: identityFor(registryMatch[1], payload, event),
        status: record.status ?? 'REGISTERED',
        origin: {
          source: 'runtime-registry',
          event: event.type,
          at: event.at
        },
        capabilities: normalizeCapabilities(record),
        relationships: normalizeRelationships(payload),
        location: locationFor(record, payload),
        verification: [{ kind: 'event', ref: event.type, status: 'observed', at: event.at }],
        metadata: record
      });
      return;
    }

    const kind = ACCEPTED_EVENTS.get(event.type);
    if (!kind) return;

    const payload = event.payload ?? {};
    const record = payload.record ?? payload.artifact ?? payload;
    this.registerAccepted({
      kind,
      identity: identityFor(kind, payload, event),
      status: first(record.status, payload.status, event.type.endsWith(':complete') ? 'VERIFIED' : 'REGISTERED'),
      origin: {
        source: first(record.source, payload.meta?.source, event.type),
        event: event.type,
        at: event.at
      },
      capabilities: normalizeCapabilities(record),
      relationships: normalizeRelationships(payload),
      location: locationFor(record, payload),
      verification: [{
        kind: 'event',
        ref: event.type,
        status: event.type.endsWith(':complete') || event.type === 'mutation:applied' ? 'verified-by-runtime' : 'observed',
        at: event.at
      }],
      metadata: record
    });
  }

  registerAccepted({
    kind,
    identity,
    status = 'REGISTERED',
    origin = {},
    capabilities = [],
    relationships = [],
    location = null,
    verification = [],
    metadata = {}
  } = {}) {
    if (!kind) throw new Error('registration kind required');
    const assignedIdentity = String(identity || `${kind}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`);
    const key = `${kind}:${assignedIdentity}`;
    const previous = this.entries.get(key);

    const entry = Object.freeze({
      key,
      kind,
      identity: assignedIdentity,
      status,
      origin: clone(origin),
      capabilities: [...new Set([...(previous?.capabilities ?? []), ...capabilities].map(String))],
      relationships: clone(relationships),
      location,
      verification: clone(verification),
      metadata: clone(metadata),
      firstRegisteredAt: previous?.firstRegisteredAt ?? Date.now(),
      updatedAt: Date.now()
    });

    this.entries.set(key, entry);
    const path = `registrations.entries.${encodeURIComponent(key)}`;
    this.queue = this.queue.then(() => this.state.set(path, entry, { source: 'auto-registrar' }));
    this.bus.emit('registration:accepted', { key, kind, identity: assignedIdentity, status, location });
    return entry;
  }

  get(kind, identity) {
    return this.entries.get(`${kind}:${identity}`) ?? null;
  }

  list({ kind = null } = {}) {
    return [...this.entries.values()]
      .filter(entry => !kind || entry.kind === kind)
      .sort((a, b) => a.firstRegisteredAt - b.firstRegisteredAt)
      .map(clone);
  }

  async flush() {
    await this.queue;
    return this.list();
  }
}
