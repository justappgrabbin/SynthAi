import { createRequire } from 'node:module';
import { safe } from '../util.mjs';

const require = createRequire(import.meta.url);
const gameMeshModule = require('../../vendor/klein-mesh-game-engine-v5.1/kmge_v5_fixed/dist/klein-mesh-game-engine.js');
const gameNGenModule = require('../../vendor/klein-mesh-game-engine-v5.1/kmge_v5_fixed/dist/gamengen-adapter.js');

const { KleinMeshGameEngine } = gameMeshModule;
const { GameNGenEngine, MockDiffusionBackend } = gameNGenModule;

/**
 * Local registry for apps whose complete single-player execution capability is
 * already present. Registered apps are internal instruments, not remote jobs.
 */
export class RegisteredAppRuntime {
  constructor({ registerDefaults = true } = {}) {
    this.apps = new Map();
    this.aliases = new Map();
    this.history = [];
    if (registerDefaults) this.#registerGameNGen();
  }

  register(spec = {}) {
    if (!spec.id || typeof spec.execute !== 'function') throw new TypeError('registered app requires id and execute()');
    const record = Object.freeze({
      id: spec.id,
      name: spec.name ?? spec.id,
      aliases: Object.freeze([...(spec.aliases ?? [])]),
      kind: spec.kind ?? 'app',
      singlePlayer: spec.singlePlayer !== false,
      backendRequired: spec.backendRequired === true,
      capabilities: Object.freeze([...(spec.capabilities ?? ['execute'])]),
      address: safe(spec.address ?? null),
      provenance: safe(spec.provenance ?? null),
      execute: spec.execute,
    });
    this.apps.set(record.id, record);
    for (const alias of [record.id, record.name, ...record.aliases]) this.aliases.set(String(alias).toLowerCase(), record.id);
    return record;
  }

  resolve(artifact = {}) {
    const names = [artifact.appId, artifact.registeredApp, artifact.id, artifact.name, artifact.originalName]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    for (const name of names) {
      const direct = this.aliases.get(name);
      if (direct) return this.apps.get(direct);
      const stem = name.replace(/\.[^.]+$/, '');
      const byStem = this.aliases.get(stem);
      if (byStem) return this.apps.get(byStem);
      for (const [alias, id] of this.aliases) if (name.includes(alias)) return this.apps.get(id);
    }
    return null;
  }

  async execute(artifact, context = {}) {
    const app = this.resolve(artifact);
    if (!app) return { ok: false, path: 'registered-app-not-found', kind: 'app', error: 'app is not registered' };
    if (app.backendRequired) return { ok: false, path: 'registered-app-backend-required', kind: app.kind, error: 'registered app declares an external backend requirement' };
    const returnValue = await app.execute(artifact, context);
    const result = Object.freeze({
      ok: true,
      path: 'registered-local-app',
      kind: app.kind,
      appId: app.id,
      singlePlayer: app.singlePlayer,
      backendUsed: false,
      result: { engine: 'synthia-registered-app-runtime', stdout: [], returnValue: safe(returnValue) },
    });
    this.history.push(result);
    return result;
  }

  list() {
    return Object.freeze([...this.apps.values()].map(({ execute, ...record }) => record));
  }

  #registerGameNGen() {
    let initialized = false;
    const backend = new MockDiffusionBackend({ device: 'local', deterministic: true });
    const frames = new GameNGenEngine(backend, null);
    const kleinMesh = new KleinMeshGameEngine();
    kleinMesh.createGame('gamegan-single-player', 'GameGAN Single Player', 'generative-game');
    this.register({
      id: 'gamegan-single-player',
      name: 'GameGAN',
      aliases: ['gamegan', 'gamengen', 'game-ngen', 'gamegan-app'],
      kind: 'game',
      singlePlayer: true,
      backendRequired: false,
      capabilities: ['execute', 'generate-frame', 'rollout', 'ingest-gameplay', 'generate-action'],
      address: { dimension: 'Being', gate: 14 },
      provenance: {
        source: 'Pure-Synthia-Trainable-Assembly-v0.4.2/donors/klein-mesh-game-engine-v5.1-FIXED(2).zip',
        frameSurface: 'donor MockDiffusionBackend (deterministic local frame-pattern implementation)',
      },
      execute: async (artifact, context) => {
        if (!initialized) {
          await frames.initialize();
          initialized = true;
        }
        const input = artifact.input ?? context.input ?? {};
        const operation = input.operation ?? artifact.operation ?? 'generate-frame';
        if (input.session) kleinMesh.ingestGameplay('gamegan-single-player', input.session);
        kleinMesh.switchGame('gamegan-single-player');
        if (operation === 'rollout') {
          const rollout = await frames.autoregressiveRollout(input.actions ?? [0]);
          return { operation, frames: rollout, nextAction: kleinMesh.generateNextAction() };
        }
        if (operation === 'ingest') {
          return { operation, games: kleinMesh.listGames(), nextAction: kleinMesh.generateNextAction() };
        }
        const frame = await frames.generateFrame(Number(input.action ?? 0), input.seed ?? 1);
        return { operation: 'generate-frame', frame, nextAction: kleinMesh.generateNextAction(), games: kleinMesh.listGames() };
      },
    });
  }
}

export { KleinMeshGameEngine, GameNGenEngine, MockDiffusionBackend };
export default RegisteredAppRuntime;
