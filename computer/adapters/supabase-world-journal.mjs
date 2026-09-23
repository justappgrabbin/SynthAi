const clone = value => value === undefined ? undefined : structuredClone(value);
const safe = value => String(value ?? 'event').replace(/[^A-Za-z0-9_-]/g, '_');

const SENSITIVE_KEY = /(password|secret|token|authorization|cookie|credential|api[_-]?key)/i;
const PRIVATE_TEXT_KEY = /^(text|body|content|message|messages|conversation|transcript)$/i;

function scrub(value, { includePrivateText = false, depth = 0 } = {}) {
  if (depth > 8) return '[depth-limit]';
  if (Array.isArray(value)) return value.map(item => scrub(item, { includePrivateText, depth: depth + 1 }));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (!includePrivateText && PRIVATE_TEXT_KEY.test(key)) {
      out[key] = '[private]';
      continue;
    }
    out[key] = scrub(item, { includePrivateText, depth: depth + 1 });
  }
  return out;
}

function significanceFor(type) {
  if (type === 'phone:app-entered' || type === 'phone:route-entered') return 'medium';
  return 'quiet';
}

function worldRows(event = {}, { workspaceId, includeRouteTitles = false } = {}) {
  const payload = event.payload ?? {};
  const pkg = payload.packageName ?? payload.route?.metadata?.packageName ?? null;
  const experienceId = payload.experienceId ?? null;
  const appKey = pkg ? `app:${pkg}` : null;
  let place = null;
  let actionKind = 'observe';
  let placeKind = experienceId ?? 'phone-world';
  let placeName = null;
  let sourceKey = appKey;
  let resourceType = 'application';

  if (event.type === 'phone:app-entered') {
    actionKind = 'enter';
    placeName = payload.label ?? pkg ?? 'Application';
    placeKind = experienceId ?? 'application-place';
    place = {
      workspace_id: workspaceId,
      source_key: appKey,
      source_address: pkg,
      canonical_url: null,
      domain: pkg,
      title: placeName,
      ownership: 'external',
      resource_type: placeKind,
      last_visited: event.at ?? new Date().toISOString(),
      metadata: {
        experienceId,
        source: 'android-phone-world',
      },
    };
  } else if (event.type === 'phone:route-entered') {
    actionKind = 'enter-route';
    const route = payload.route ?? {};
    sourceKey = route.id ?? appKey;
    placeKind = route.kind ?? 'room';
    placeName = includeRouteTitles ? route.presentation?.label ?? placeKind : placeKind;
    resourceType = 'application-route';
  } else if (event.type === 'phone:notification') {
    actionKind = 'notification';
    placeKind = 'notification-event';
    placeName = pkg ?? 'Phone';
    resourceType = 'notification';
  }

  const row = {
    workspace_id: workspaceId,
    event_kind: event.type ?? 'phone:event',
    significance: significanceFor(event.type),
    actor_ref: event.actor ?? 'synthia',
    source_ref: event.source ?? 'phone:world',
    source_key: sourceKey,
    source_address: pkg,
    source_url: null,
    ownership: 'external',
    resource_type: resourceType,
    action_kind: actionKind,
    place_kind: placeKind,
    place_name: placeName,
    dimension: null,
    gate: null,
    ato_address: {},
    payload: scrub({
      eventId: event.id ?? null,
      summary: event.summary ?? null,
      packageName: pkg,
      experienceId,
      route: event.type === 'phone:route-entered' ? payload.route ?? null : null,
      notification: event.type === 'phone:notification'
        ? {
            packageName: payload.packageName ?? null,
            title: payload.title ?? null,
            category: payload.category ?? null,
            text: payload.text ?? null,
          }
        : null,
    }),
  };
  return { event: row, place };
}

export class SupabaseWorldJournal {
  constructor({
    state,
    bus,
    fetchImpl = globalThis.fetch,
    projectUrl = null,
    runtimeToken = null,
    workspaceId = null,
    endpoint = null,
    clock = () => Date.now(),
    syncPolicy = {},
  } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('SupabaseWorldJournal requires StateStore-like state');
    if (!bus?.on) throw new TypeError('SupabaseWorldJournal requires EventBus');
    Object.assign(this, { state, bus, fetchImpl, projectUrl, runtimeToken, workspaceId, endpoint, clock });
    this.syncPolicy = {
      appEntries: syncPolicy.appEntries !== false,
      routes: syncPolicy.routes !== false,
      notifications: syncPolicy.notifications === true,
      includeRouteTitles: syncPolicy.includeRouteTitles === true,
    };
    this.unsubscribers = [];
    this.tail = Promise.resolve();
    this.counters = { captured: 0, sent: 0, failed: 0, skipped: 0 };
  }

  get configured() {
    return Boolean(this.fetchImpl && this.runtimeToken && this.workspaceId && (this.endpoint || this.projectUrl));
  }

  async mount() {
    if (this.unsubscribers.length) return this.snapshot();
    const listen = type => this.bus.on(type, envelope => {
      this.tail = this.tail.then(() => this.capture(envelope.payload)).catch(async error => {
        this.counters.failed += 1;
        await this.state.set('worldJournal.lastError', {
          message: String(error?.message ?? error),
          type,
          at: this.clock(),
        }, { source: 'supabase-world-journal' });
      });
    });
    this.unsubscribers = [
      listen('phone-world:app-entered'),
      listen('phone-world:route-entered'),
      listen('phone-world:notification'),
    ];
    await this.state.set('worldJournal.status', {
      mounted: true,
      configured: this.configured,
      workspaceId: this.workspaceId,
      at: this.clock(),
    }, { source: 'supabase-world-journal' });
    return this.snapshot();
  }

  unmount() {
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe?.();
    return this.snapshot();
  }

  async drain() {
    await this.tail;
    return this.snapshot();
  }

  shouldExport(event = {}) {
    if (event.type === 'phone:app-entered') return this.syncPolicy.appEntries;
    if (event.type === 'phone:route-entered') return this.syncPolicy.routes;
    if (event.type === 'phone:notification') return this.syncPolicy.notifications;
    return false;
  }

  async capture(event = {}) {
    if (!this.shouldExport(event)) {
      this.counters.skipped += 1;
      return { accepted: false, reason: 'SYNC_POLICY', type: event.type ?? null };
    }
    const record = {
      id: event.id ?? `world-journal-${this.clock()}`,
      event: clone(event),
      status: this.configured ? 'pending' : 'local-only',
      capturedAt: this.clock(),
    };
    const key = safe(record.id);
    await this.state.set(`worldJournal.outbox.${key}`, record, { source: 'supabase-world-journal' });
    this.counters.captured += 1;

    if (!this.configured) return { accepted: true, queued: true, reason: 'NOT_CONFIGURED', id: record.id };

    try {
      const rows = worldRows(event, {
        workspaceId: this.workspaceId,
        includeRouteTitles: this.syncPolicy.includeRouteTitles,
      });
      const response = await this.fetchImpl(this.endpoint ?? `${String(this.projectUrl).replace(/\/$/, '')}/functions/v1/synthia-world-ingest`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-synthia-runtime-token': this.runtimeToken,
        },
        body: JSON.stringify({
          workspace_id: this.workspaceId,
          event: rows.event,
          place: rows.place,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) throw new Error(body?.error ?? `world ingest HTTP ${response.status}`);
      this.counters.sent += 1;
      await this.state.set(`worldJournal.outbox.${key}`, {
        ...record,
        status: 'sent',
        sentAt: this.clock(),
        receipt: clone(body),
      }, { source: 'supabase-world-journal' });
      return { accepted: true, queued: false, receipt: body };
    } catch (error) {
      this.counters.failed += 1;
      await this.state.set(`worldJournal.outbox.${key}`, {
        ...record,
        status: 'failed',
        failedAt: this.clock(),
        error: String(error?.message ?? error),
      }, { source: 'supabase-world-journal' });
      throw error;
    }
  }

  snapshot() {
    return {
      id: 'supabase-world-journal',
      configured: this.configured,
      workspaceId: this.workspaceId,
      endpoint: this.endpoint ?? (this.projectUrl ? `${String(this.projectUrl).replace(/\/$/, '')}/functions/v1/synthia-world-ingest` : null),
      policy: clone(this.syncPolicy),
      counters: clone(this.counters),
      lastError: this.state.get('worldJournal.lastError', null),
      authority: 'outbound-world-journal-only',
    };
  }
}

export { scrub as scrubWorldPayload, worldRows as mapPhoneWorldEventToSupabase };
export default SupabaseWorldJournal;
