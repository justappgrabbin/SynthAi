const FORBIDDEN_PRIVATE_KEYS = new Set([
    'degree', 'minute', 'second', 'arc', 'zodiac', 'house', 'privateCoordinates',
    'conversation', 'document', 'rawText', 'userId', 'sessionId'
]);
export class AnticipatoryMeshMemory {
    provider = null;
    cache = new Map();
    pendingPublications = new Map();
    lastPreload = null;
    constructor(provider) { this.provider = provider || null; }
    setProvider(provider) { this.provider = provider; return this; }
    async preload(request) {
        const now = request.preparedAt ?? Date.now();
        const expiredRemoved = this.purgeExpired(now);
        const reachable = await this.reachable();
        const flushed = reachable ? await this.flushPendingPublications() : 0;
        const publicAddresses = this.uniqueAddresses(request.candidates.flatMap(c => c.activeAddresses.map(a => this.sanitizeAddress(a))));
        let received = [];
        if (reachable && this.provider && publicAddresses.length) {
            const raw = await this.provider.queryPrecedents(publicAddresses, Math.max(1, request.maxPrecedents || 128));
            received = raw.map(p => this.sanitizePrecedent(p)).filter((p) => Boolean(p));
        }
        for (const precedent of received) {
            const matches = request.candidates.filter(c => this.patternMatches(precedent.triggerAddresses, c.activeAddresses));
            if (!matches.length)
                continue;
            const expiresAt = Math.max(...matches.map(c => c.expiresAt));
            const existing = this.cache.get(precedent.precedentId);
            this.cache.set(precedent.precedentId, {
                precedent,
                preloadedAt: existing?.preloadedAt || now,
                expiresAt: Math.max(existing?.expiresAt || 0, expiresAt),
                candidateIds: [...new Set([...(existing?.candidateIds || []), ...matches.map(c => c.candidateId)])]
            });
        }
        this.lastPreload = {
            meshReachable: reachable, queriedAddresses: publicAddresses.length,
            receivedPrecedents: received.length, cachedPrecedents: this.cache.size,
            expiredRemoved, pendingPublicationsFlushed: flushed,
            horizonStart: request.startAt, horizonEnd: request.endAt
        };
        return { ...this.lastPreload };
    }
    /** Local-only recall; no mesh call occurs when the event actually fires. */
    recall(trigger, now = trigger.occurredAt) {
        this.purgeExpired(now);
        return [...this.cache.values()]
            .filter(e => this.patternMatches(e.precedent.triggerAddresses, trigger.activeAddresses))
            .map(e => e.precedent)
            .sort((a, b) => b.confidence * Math.log2(b.evidenceCount + 1) - a.confidence * Math.log2(a.evidenceCount + 1));
    }
    /** Publish only structural precedent; never raw intent/output/session/fine coordinates. */
    async observeSchedule(state, report, channels) {
        let published = 0;
        const seen = new Set();
        for (const record of report.records) {
            const source = state.activeNodes.get(record.sourceStateId);
            const target = state.activeNodes.get(record.targetStateId);
            if (!source || !target)
                continue;
            const triggerAddresses = this.uniqueAddresses([this.publicAddressOf(source.address), this.publicAddressOf(target.address)]);
            const channel = channels.getChannel(record.definitionId);
            const responseClass = record.correctionAttempt ? 'CORRECTION_PATH' : record.generated ? 'GENERATED_PATH' : 'EXISTING_PATH';
            const outcome = record.success ? 'SUCCESS' : 'FAILURE';
            const signature = this.precedentSignature(triggerAddresses, record.definitionId, record.capabilities, outcome, responseClass);
            if (seen.has(signature))
                continue;
            seen.add(signature);
            const precedent = {
                precedentId: `precedent_${this.hash(signature)}`,
                triggerAddresses,
                channelId: this.safeIdentifier(record.definitionId, 40),
                circuit: channel?.circuit ? this.safeIdentifier(channel.circuit, 40) : undefined,
                capabilityPath: [...new Set(record.capabilities.map(v => this.safeIdentifier(v, 80)))].sort(),
                outcome, responseClass,
                confidence: this.clamp(record.success ? 0.65 + (record.correctionAttempt ? 0.15 : 0.05) : 0.35),
                evidenceCount: 1
            };
            this.assertPublicOnly(precedent);
            if (await this.reachable() && this.provider) {
                await this.provider.publishPrecedent(precedent);
                published++;
            }
            else
                this.queuePending(precedent);
        }
        return published;
    }
    snapshot() {
        return {
            cached: [...this.cache.values()].map(e => ({ ...e, precedent: this.sanitizePrecedent(e.precedent) })),
            pendingPublications: [...this.pendingPublications.values()].map(p => this.sanitizePrecedent(p)),
            lastPreload: this.lastPreload ? { ...this.lastPreload } : null
        };
    }
    queuePending(precedent) {
        const existing = this.pendingPublications.get(precedent.precedentId);
        if (!existing) {
            this.pendingPublications.set(precedent.precedentId, precedent);
            return;
        }
        const total = existing.evidenceCount + precedent.evidenceCount;
        existing.confidence = ((existing.confidence * existing.evidenceCount) + (precedent.confidence * precedent.evidenceCount)) / total;
        existing.evidenceCount = total;
        this.pendingPublications.set(existing.precedentId, existing);
    }
    async flushPendingPublications() {
        if (!this.provider || !(await this.reachable()))
            return 0;
        let count = 0;
        for (const [id, p] of [...this.pendingPublications]) {
            await this.provider.publishPrecedent(p);
            this.pendingPublications.delete(id);
            count++;
        }
        return count;
    }
    purgeExpired(now) { let n = 0; for (const [id, e] of this.cache)
        if (e.expiresAt < now) {
            this.cache.delete(id);
            n++;
        } return n; }
    async reachable() { if (!this.provider)
        return false; try {
        return Boolean(await this.provider.isReachable());
    }
    catch {
        return false;
    } }
    publicAddressOf(a) { return this.sanitizeAddress({ gate: a.gateLine.gate, line: a.gateLine.line, color: a.color, tone: a.tone, base: a.base }); }
    sanitizeAddress(a) { return { gate: this.integer(a.gate, 1, 64), line: this.integer(a.line, 1, 6), color: this.integer(a.color, 1, 6), tone: this.integer(a.tone, 1, 6), base: this.integer(a.base, 1, 5) }; }
    sanitizePrecedent(raw) {
        if (!raw || typeof raw !== 'object' || !Array.isArray(raw.triggerAddresses) || !raw.triggerAddresses.length)
            return null;
        const clean = {
            precedentId: this.safeIdentifier(String(raw.precedentId || `precedent_${this.hash(JSON.stringify(raw.triggerAddresses))}`), 96),
            triggerAddresses: this.uniqueAddresses(raw.triggerAddresses.map(a => this.sanitizeAddress(a))),
            channelId: raw.channelId ? this.safeIdentifier(String(raw.channelId), 40) : undefined,
            circuit: raw.circuit ? this.safeIdentifier(String(raw.circuit), 40) : undefined,
            capabilityPath: Array.isArray(raw.capabilityPath) ? [...new Set(raw.capabilityPath.map(v => this.safeIdentifier(String(v), 80)))].sort() : [],
            outcome: raw.outcome === 'FAILURE' ? 'FAILURE' : 'SUCCESS',
            responseClass: raw.responseClass === 'CORRECTION_PATH' ? 'CORRECTION_PATH' : raw.responseClass === 'GENERATED_PATH' ? 'GENERATED_PATH' : 'EXISTING_PATH',
            confidence: this.clamp(Number(raw.confidence) || 0), evidenceCount: Math.max(1, Math.floor(Number(raw.evidenceCount) || 1))
        };
        this.assertPublicOnly(clean);
        return clean;
    }
    patternMatches(pattern, active) { const keys = new Set(active.map(a => this.addressKey(this.sanitizeAddress(a)))); return pattern.every(a => keys.has(this.addressKey(this.sanitizeAddress(a)))); }
    uniqueAddresses(addresses) { const m = new Map(); for (const a of addresses) {
        const c = this.sanitizeAddress(a);
        m.set(this.addressKey(c), c);
    } return [...m.values()]; }
    addressKey(a) { return `${a.gate}.${a.line}.${a.color}.${a.tone}.${a.base}`; }
    precedentSignature(a, c, caps, o, r) { return `${a.map(x => this.addressKey(x)).sort().join('|')}::${c}::${[...caps].sort().join(',')}::${o}::${r}`; }
    assertPublicOnly(value) { const walk = (n) => { if (!n || typeof n !== 'object')
        return; for (const [k, v] of Object.entries(n)) {
        if (FORBIDDEN_PRIVATE_KEYS.has(k))
            throw new Error(`Private field '${k}' crossed the Base privacy boundary`);
        walk(v);
    } }; walk(value); }
    safeIdentifier(text, max) { return text.replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, max); }
    hash(text) { let h = 2166136261 >>> 0; for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    } return h.toString(16).padStart(8, '0'); }
    integer(v, min, max) { const n = Math.floor(Number(v)); return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min)); }
    clamp(v) { return Math.max(0, Math.min(1, v)); }
}
/** Local deterministic provider for tests/mesh-host integration. */
export class InMemoryPrecedentMesh {
    reachable = true;
    store = new Map();
    setReachable(v) { this.reachable = v; return this; }
    isReachable() { return this.reachable; }
    async queryPrecedents(addresses, limit) {
        if (!this.reachable)
            return [];
        const keys = new Set(addresses.map(a => `${a.gate}.${a.line}.${a.color}.${a.tone}.${a.base}`));
        return [...this.store.values()].filter(p => p.triggerAddresses.every(a => keys.has(`${a.gate}.${a.line}.${a.color}.${a.tone}.${a.base}`))).sort((a, b) => b.evidenceCount - a.evidenceCount || b.confidence - a.confidence).slice(0, Math.max(1, limit)).map(p => ({ ...p, triggerAddresses: p.triggerAddresses.map(a => ({ ...a })), capabilityPath: [...p.capabilityPath] }));
    }
    async publishPrecedent(p) {
        if (!this.reachable)
            throw new Error('mesh unreachable');
        const e = this.store.get(p.precedentId);
        if (!e) {
            this.store.set(p.precedentId, { ...p, triggerAddresses: p.triggerAddresses.map(a => ({ ...a })), capabilityPath: [...p.capabilityPath] });
            return;
        }
        const total = e.evidenceCount + p.evidenceCount;
        e.confidence = ((e.confidence * e.evidenceCount) + (p.confidence * p.evidenceCount)) / total;
        e.evidenceCount = total;
    }
    seed(p) { this.store.set(p.precedentId, { ...p, triggerAddresses: p.triggerAddresses.map(a => ({ ...a })), capabilityPath: [...p.capabilityPath] }); return this; }
    all() { return [...this.store.values()].map(p => ({ ...p, triggerAddresses: p.triggerAddresses.map(a => ({ ...a })), capabilityPath: [...p.capabilityPath] })); }
}
export default AnticipatoryMeshMemory;
