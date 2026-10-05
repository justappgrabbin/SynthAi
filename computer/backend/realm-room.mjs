import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { networkInterfaces } from 'node:os';

const token = () => randomBytes(24).toString('base64url');
const matches = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function actor(record) {
  if (!record?.id || !Array.isArray(record.addresses) || record.addresses.length > 64) throw new Error('Resolved avatar identity required');
  const position = record.position ?? [0, 1, 0];
  if (position.length !== 3 || !position.every(value => Number.isFinite(value) && Math.abs(value) < 10000)) throw new Error('Invalid world position');
  // Only the resolved public expression is shared, never birth data or photo.
  return { id: String(record.id).slice(0, 128), name: String(record.name ?? 'Visitor').slice(0, 100),
    addresses: record.addresses.map(item => ({ id: String(item.id).slice(0, 100), expression: { address: item.expression.address } })), position, motion: String(record.motion ?? 'idle').slice(0, 30) };
}

export class RealmRoom {
  constructor({ host = '0.0.0.0', port = 17384, clock = Date.now } = {}) {
    Object.assign(this, { host, port, clock }); this.peers = new Map(); this.mode = 'local';
  }
  async hostWorld({ world, participant }) {
    await this.leave(); this.secret = token(); this.roomId = randomUUID(); this.world = world; this.owner = actor(participant); this.mode = 'host';
    this.server = createServer(async (req, res) => {
      const respond = (code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
      try {
        if (req.method !== 'POST' || !['/join', '/sync', '/leave'].includes(req.url)) return respond(404, { error: 'Route not found' });
        let body = '', bytes = 0;
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 256000) throw new Error('Room packet too large'); body += chunk; }
        const input = JSON.parse(body);
        const credential = String(req.headers.authorization ?? '').replace(/^Bearer /i, '');
        if (req.url === '/join') {
          if (!matches(credential, this.secret)) return respond(401, { error: 'Invalid world invitation' });
          if (this.peers.size >= 16) return respond(409, { error: 'World is full' });
          const participant = actor(input.participant), id = randomUUID(), key = token();
          if (participant.id === this.owner.id) throw new Error('This avatar already owns the world');
          this.peers.set(id, { participant, key, seenAt: this.clock() });
          return respond(200, { peerId: id, key, ...this.snapshot() });
        }
        const peer = this.peers.get(input.peerId);
        if (!peer || !matches(credential, peer.key)) return respond(401, { error: 'Invalid participant session' });
        if (req.url === '/leave') { this.peers.delete(input.peerId); return respond(200, { left: true }); }
        const participant = actor(input.participant);
        if (participant.id !== peer.participant.id) throw new Error('Avatar identity cannot change within a session');
        peer.participant = participant; peer.seenAt = this.clock();
        respond(200, this.snapshot());
      } catch (error) { respond(400, { error: error.message }); }
    });
    this.server.requestTimeout = 10000; this.server.headersTimeout = 10000;
    await new Promise((resolve, reject) => { this.server.once('error', reject); this.server.listen(this.port, this.host, resolve); });
    const port = this.server.address().port;
    const addresses = Object.values(networkInterfaces()).flat().filter(address => address && address.family === 'IPv4' && !address.internal).map(address => address.address);
    this.invite = `http://${addresses[0] ?? '127.0.0.1'}:${port}/#${this.secret}`;
    return this.status();
  }
  snapshot() {
    for (const [id, peer] of this.peers) if (this.clock() - peer.seenAt > 30000) this.peers.delete(id);
    return { roomId: this.roomId, world: this.world, participants: [this.owner, ...[...this.peers.values()].map(peer => peer.participant)].filter(Boolean) };
  }
  status() { return { mode: this.mode, invite: this.mode === 'host' ? this.invite : null, peers: this.mode === 'host' ? this.peers.size : this.last?.participants?.length ?? 0 }; }
  async request(path, credential, body) {
    const response = await fetch(this.base + path, { method: 'POST', headers: { authorization: `Bearer ${credential}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error ?? `Shared world unavailable (${response.status})`); return value;
  }
  async join(invitation, participant) {
    await this.leave(); const url = new URL(invitation);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hash) throw new Error('Use the host’s world invitation');
    this.base = url.origin;
    const result = await this.request('/join', url.hash.slice(1), { participant: actor(participant) });
    this.peerId = result.peerId; this.key = result.key; this.last = result; this.mode = 'guest';
    return result;
  }
  async sync(participant, world) {
    if (this.mode === 'host') { this.owner = actor(participant); this.world = world; return this.snapshot(); }
    if (this.mode === 'guest') { this.last = await this.request('/sync', this.key, { peerId: this.peerId, participant: actor(participant) }); return this.last; }
    return null;
  }
  async leave() {
    if (this.mode === 'guest') { try { await this.request('/leave', this.key, { peerId: this.peerId }); } catch { /* Offline guests expire on the host. */ } }
    if (this.server) { this.server.closeAllConnections(); await new Promise(resolve => this.server.close(resolve)); this.server = null; }
    this.mode = 'local'; this.peers.clear(); this.last = null; this.invite = null; this.key = null; this.secret = null;
  }
}
