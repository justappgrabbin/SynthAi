import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { IndiVerseRuntime } from '../worlds/indiverse.mjs';
import { expressAddress } from '../runtime/address-expression.mjs';
import { HumanDesignGNNRuntime } from '../donors/phone-neural/humanDesignGNN.mjs';
import { ConnectionFieldRuntime } from '../donors/phone-neural/connectionField.mjs';
import { WORLD_THEMES } from '../runtime/world-themes.mjs';
import { resolveRealmSwarm } from '../runtime/realm-swarm.mjs';
import { RealmRoom } from './realm-room.mjs';
import { compileWorldRequest } from '../runtime/world-request.mjs';

const WORLD = 'reality:consciousness-realm';
const signs = 'Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces'.split(' ');

export function placementAddress(placement) {
  const arc = Math.round(placement.longitude * 3600) % 1296000;
  const within = arc % 108000;
  return {
    planetary: placement.body, dimension: null,
    gate: placement.gate, line: placement.line, color: placement.color,
    tone: placement.tone, base: placement.base,
    degree: Math.floor(within / 3600), minute: Math.floor(within / 60) % 60,
    second: within % 60, arc, zodiac: signs[Math.floor(arc / 108000)], house: null,
  };
}

export class PhoneWorldSession {
  constructor({ state, bus, fetchImpl = globalThis.fetch } = {}) {
    Object.assign(this, { state, bus, fetchImpl });
    this.mesh = new RelationalMeshKernel({ state, bus });
    this.worlds = new IndiVerseRuntime({ state, bus, mesh: this.mesh });
    this.gnn = new HumanDesignGNNRuntime();
    this.connections = new ConnectionFieldRuntime();
    this.pending = Promise.resolve();
    this.worldRequests = Promise.resolve();
    this.room = new RealmRoom();
    this.sharedParticipants = [];
    this.sharedRelationships = new Set();
  }

  async boot() {
    await this.mesh.boot();
    const saved = this.state.get('phone.neural.connections');
    if (saved) this.connections.model = structuredClone(saved);
    if (!this.worlds.world(WORLD)) await this.worlds.createWorld('computer', { id: WORLD, name: 'Shared Realm', grammar: { atmosphere: { world: WORLD_THEMES.cosmic }, materials: { world: 'metal' } } });
    if (!this.worlds.canonicalObject(WORLD)) await this.worlds.registerCanonicalObject({
      id: WORLD, kind: 'world', function: 'consciousness-realm',
      affordances: [{ id: 'play', requires: ['world.move', 'world.interact'] }],
      presentation: { color: '#0a0a0f', scale: 1 },
    });
    return this;
  }

  async bindProfile(userId) {
    if (this.state.get('phone.profile')?.id !== userId) { await this.room.leave(); this.sharedParticipants = []; }
    if (!userId) { await this.state.set('phone.profile', null); return this.snapshot(); }
    // Resolve from the running application, never trust a caller-supplied chart.
    const response = await this.fetchImpl(`http://127.0.0.1:17383/api/profile/${encodeURIComponent(userId)}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Resonance profile unavailable (${response.status})`);
    const profile = await response.json();
    const placements = profile.natal_report?.charts?.tropical;
    if (!Array.isArray(placements) || !placements.length) throw new Error('Profile has no resolved chart');
    const neural = await this.gnn.call({ placements: placements.map(p => ({ ...p, planet: p.body, stream: p.stream === 'personality' ? 'body' : p.stream })) });
    const addresses = placements.map(p => ({ id: `${p.stream}:${p.body}`, stream: p.stream, expression: expressAddress(placementAddress(p)) }));
    const identity = { id: String(userId), name: profile.display_name ?? profile.profile?.display_name ?? 'You', addresses, neural };
    await this.state.set('phone.profile', identity);
    const ownWorld = `indiverse:${userId}`;
    if (!this.worlds.world(ownWorld)) await this.worlds.createWorld(userId, { id: ownWorld, name: 'My IndiVerse', grammar: {
      colors: { world: WORLD_THEMES.cosmic.accent }, materials: { world: WORLD_THEMES.cosmic.material }, atmosphere: { world: { ...WORLD_THEMES.cosmic, theme: 'cosmic' } },
    } });
    await this.mesh.registerParticipant(userId, {
      kind: 'human-avatar', address: addresses[0].expression.address,
      publicState: { name: identity.name, neural, addresses }, capabilities: ['world.move', 'world.interact'], residency: 'active',
    });
    return this.enterWorld(ownWorld);
  }

  async enterWorld(worldId) {
    const profile = this.state.get('phone.profile');
    if (!profile) throw new Error('Create or load your Resonance profile first');
    const world = this.worlds.world(worldId);
    if (!world) throw new Error('World is not registered on this computer');
    if (this.room.mode !== 'local' && this.state.get('phone.world')?.worldId !== worldId) { await this.room.leave(); this.sharedParticipants = []; }
    const contract = this.worlds.visitorContract({
      worldId, objectId: WORLD,
      visitor: { identity: { id: profile.id, address: profile.addresses[0].expression.address }, capabilities: ['world.move', 'world.interact'] },
    });
    await this.mesh.connect(profile.id, worldId, { type: 'visiting', context: { contract } });
    await this.mesh.publishPresence(profile.id, { worldId });
    const observation = await this.connections.call({ operation: 'observe', address: profile.addresses[0].expression.address, signal: 1 });
    await this.state.set('phone.neural.connections', this.connections.model);
    await this.state.set('phone.world', { worldId, contract, neural: observation });
    return this.snapshot();
  }

  roomParticipant() {
    const profile = this.state.get('phone.profile');
    if (!profile) throw new Error('Create or load your Resonance profile first');
    const presence = this.mesh.participant(profile.id)?.publicState?.realmState;
    return { id: profile.id, name: profile.name, addresses: profile.addresses, position: presence?.position ?? [0, 1, 0], motion: presence?.motion ?? 'idle' };
  }

  async hostRoom() {
    const profile = this.state.get('phone.profile');
    if (!profile) throw new Error('Create or load your Resonance profile first');
    if (!this.worlds.world(`indiverse:${profile.id}`)?.metadata?.worldChoice) throw new Error('Choose your world before inviting visitors');
    await this.enterWorld(`indiverse:${profile.id}`);
    await this.room.hostWorld({ world: this.worlds.world(`indiverse:${profile.id}`), participant: this.roomParticipant() });
    return this.runtime();
  }

  async joinRoom(invitation) {
    const shared = await this.room.join(invitation, this.roomParticipant());
    const worldId = `room:${shared.roomId}`;
    await this.worlds.createWorld(shared.world.ownerId, { id: worldId, name: shared.world.name, grammar: shared.world.grammar });
    // enterWorld normally leaves the previous session when switching; this
    // transition is the join itself, so establish its world before applying it.
    await this.state.set('phone.world', { worldId });
    await this.enterWorld(worldId);
    this.sharedParticipants = shared.participants;
    return this.runtime();
  }

  async leaveRoom() {
    await this.room.leave(); this.sharedParticipants = []; this.roomError = null;
    const profile = this.state.get('phone.profile');
    return profile ? this.enterWorld(`indiverse:${profile.id}`) : this.snapshot();
  }

  async runtime() {
    if (this.room.mode !== 'local') {
      try {
        const worldId = this.state.get('phone.world')?.worldId;
        const shared = await this.room.sync(this.roomParticipant(), this.worlds.world(worldId));
        this.sharedParticipants = shared.participants;
        for (const peer of shared.participants.filter(peer => peer.id !== this.state.get('phone.profile')?.id)) {
          if (!this.sharedRelationships.has(`${shared.roomId}:${peer.id}`)) {
            const address = peer.addresses[0]?.expression?.address;
            const neural = address ? await this.connections.call({ operation: 'observe', address, signal: .5 }) : null;
            await this.mesh.registerParticipant(peer.id, { kind: 'shared-avatar', address, residency: 'active', publicState: { name: peer.name, worldId, addresses: peer.addresses }, metadata: { roomId: shared.roomId } });
            await this.mesh.connect(this.state.get('phone.profile').id, peer.id, { type: 'shares-world', evidence: { roomId: shared.roomId, neural } });
            await this.state.set('phone.neural.connections', this.connections.model);
            this.sharedRelationships.add(`${shared.roomId}:${peer.id}`);
          }
        }
        this.roomError = null;
        if (this.room.mode === 'guest') {
          await this.worlds.updateGrammar(worldId, shared.world.grammar);
          const profile = this.state.get('phone.profile');
          const contract = this.worlds.visitorContract({ worldId, objectId: WORLD, visitor: { identity: { id: profile.id, address: profile.addresses[0].expression.address }, capabilities: ['world.move', 'world.interact'] } });
          await this.state.set('phone.world', { ...this.state.get('phone.world'), contract });
        }
      } catch (error) { this.roomError = error.message; this.sharedParticipants = []; }
    }
    return this.snapshot();
  }

  chooseWorld(request) {
    const profile = this.state.get('phone.profile');
    const run = this.worldRequests.then(async () => {
      if (!profile) throw new Error('Create or load your Resonance profile first');
      const worldId = `indiverse:${profile.id}`;
      if (this.worlds.world(worldId)?.metadata?.worldChoice) throw new Error('Your world has already been chosen');
      const definition = compileWorldRequest(request);
      if (this.state.get('phone.profile')?.id !== profile.id) throw new Error('Profile changed before the world was chosen');
      await this.worlds.chooseWorld(worldId, profile.id, definition);
      return this.enterWorld(worldId);
    });
    this.worldRequests = run.catch(() => {});
    return run;
  }

  async preferences({ color, theme, appearance, photo, spriteSheet, frameCount } = {}) {
    const profile = this.state.get('phone.profile');
    if (!profile) throw new Error('Create or load your Resonance profile first');
    if ((color !== undefined || theme !== undefined || appearance !== undefined) && this.worlds.world(`indiverse:${profile.id}`)?.metadata?.worldChoice) throw new Error('Your world has already been chosen; photo and animation updates remain available');
    if (theme !== undefined || appearance !== undefined) {
      // Presets are optional starting points, never the boundary of the user's
      // world. A local request resolver may supply its own rendered endpoint.
      const base = WORLD_THEMES[theme] ?? {};
      if (appearance !== undefined && (!appearance || typeof appearance !== 'object' || Array.isArray(appearance))) throw new Error('Morph appearance must be an object');
      const resolved = { ...base, ...appearance };
      if (!Object.keys(resolved).length) throw new Error('This request needs a local morph definition; no change has been applied');
      for (const key of ['background', 'ground', 'path', 'accent', 'light']) {
        if (resolved[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(resolved[key])) throw new Error(`Invalid morph ${key} color`);
      }
      if (resolved.fog !== undefined && (!Number.isFinite(resolved.fog) || resolved.fog < 0 || resolved.fog > 1)) throw new Error('Invalid morph fog density');
      resolved.theme = typeof theme === 'string' ? theme : 'user-defined';
      await this.worlds.updateGrammar(`indiverse:${profile.id}`, {
        ...(resolved.accent ? { colors: { world: resolved.accent } } : {}),
        ...(resolved.material ? { materials: { world: resolved.material } } : {}),
        atmosphere: { world: { ...this.worlds.world(`indiverse:${profile.id}`).grammar.atmosphere.world, ...resolved } },
      });
    }
    if (color !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Choose a valid world color');
      await this.worlds.updateGrammar(`indiverse:${profile.id}`, { colors: { world: color }, atmosphere: { world: { background: color } } });
    }
    const avatar = this.state.get(`phone.avatars.${profile.id}`, {});
    for (const [key, value] of Object.entries({ photo, spriteSheet })) {
      if (value !== undefined) {
        if (typeof value !== 'string' || value.length > 2000000 || (value && !/^data:image\/(png|jpeg|webp);base64,/.test(value))) throw new Error('Avatar image must be a local PNG, JPEG, or WebP');
        avatar[key] = value;
      }
    }
    if (frameCount !== undefined) avatar.frameCount = Math.max(1, Math.min(64, Math.trunc(Number(frameCount) || 1)));
    await this.state.set(`phone.avatars.${profile.id}`, avatar);
    const world = this.state.get('phone.world');
    return this.enterWorld(world?.worldId ?? `indiverse:${profile.id}`);
  }

  observe(event) {
    const run = this.pending.then(async () => {
      const profile = this.state.get('phone.profile');
      if (!profile) return { accepted: false, reason: 'PROFILE_REQUIRED' };
      if (!['movement', 'interaction', 'field-change'].includes(event?.type)) throw new Error('Unknown Realm event');
      const address = profile.addresses[0].expression.address;
      const neural = await this.connections.call({ operation: 'observe', address, signal: event.type === 'interaction' ? 1 : 0.5 });
      const episode = { ...event, actor: profile.id, address, worldId: this.state.get('phone.world')?.worldId, neural, at: Date.now() };
      if (event.type === 'interaction' && typeof event.target === 'string') {
        if (!this.mesh.participant(event.target)) await this.mesh.registerParticipant(event.target, { kind: 'realm-object', publicState: { worldId: episode.worldId }, residency: 'warm' });
        await this.mesh.connect(profile.id, event.target, { type: 'interacts-with', evidence: { action: event.action ?? 'talk', at: episode.at, neural } });
      }
      const episodes = [...this.state.get(`phone.episodes.${profile.id}`, []), episode].slice(-256);
      await this.state.set(`phone.episodes.${profile.id}`, episodes);
      await this.state.set('phone.neural.connections', this.connections.model);
      await this.mesh.publishPresence(profile.id, { realmState: event, neural });
      this.bus?.emit('phone:realm-observation', episode);
      return { accepted: true, episode };
    });
    this.pending = run.catch(() => {});
    return run;
  }

  snapshot() {
    const profile = this.state.get('phone.profile', null);
    const participants = this.room.mode !== 'local' ? this.sharedParticipants : this.mesh.listParticipants().filter(p => p.kind === 'human-avatar' && p.id === profile?.id).map(p => ({ id: p.id, name: p.publicState.name, addresses: p.publicState.addresses, position: p.publicState.realmState?.position, motion: p.publicState.realmState?.motion }));
    const swarm = resolveRealmSwarm(participants, Math.floor(Date.now() / 1000));
    swarm.mode = this.room.mode === 'local' ? 'local-mesh' : this.roomError ? 'shared-offline' : 'shared-world';
    return {
      renderer: '/realm/index.html', profile,
      world: this.state.get('phone.world', null),
      worlds: this.worlds.snapshot().worlds.map(w => ({ id: w.id, name: w.name, ownerId: w.ownerId })),
      avatar: profile ? this.state.get(`phone.avatars.${profile.id}`, {}) : {},
      worldChoice: profile ? this.worlds.world(`indiverse:${profile.id}`)?.metadata?.worldChoice ?? null : null,
      connections: this.connections.snapshot(),
      themes: WORLD_THEMES,
      inhabitants: participants.map(p => ({ id: p.id, name: p.name ?? p.publicState?.name, position: p.position, motion: p.motion })),
      swarm, room: { ...this.room.status(), error: this.roomError ?? null },
      memory: { vqvae: 'TRAINED_CHECKPOINT_REQUIRED', episodes: profile ? this.state.get(`phone.episodes.${profile.id}`, []).length : 0 },
    };
  }
}
