import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AgentLifeEngine } from './AgentLifeEngine.mjs';
import { ConsciousnessRealmAdapter } from './consciousness-realm-adapter.mjs';

const ZODIAC = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export class RealmRuntime {
  constructor({ organism, persistenceDir }) {
    this.organism = organism;
    this.path = join(persistenceDir, 'consciousness-realm.json');
    this.engine = new AgentLifeEngine();
    this.adapter = new ConsciousnessRealmAdapter({ engine: this.engine });
    this.timer = null;
    this.ticksSinceSave = 0;
    this.writeQueue = Promise.resolve();
  }

  async start() {
    await mkdir(join(this.path, '..'), { recursive: true });
    try {
      const record = JSON.parse(await readFile(this.path, 'utf8'));
      this.adapter.hydrate(record.snapshot);
      this.adapter.advanceElapsed(Date.now() - record.savedAt, { maxTicks: 144 });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    this.ensureProjection();
    this.timer = setInterval(() => {
      try {
        this.ensureProjection();
        this.engine.tick();
        if (++this.ticksSinceSave >= 30) {
          this.ticksSinceSave = 0;
          this.save().catch(() => {});
        }
      } catch (error) {
        // A Realm projection error must not take down Synthia's chat and tools.
        console.error('Consciousness Realm tick:', error);
      }
    }, 1000);
    this.timer.unref?.();
  }

  ensureProjection() {
    const configuration = this.organism.birthMirror.configuration;
    if (!configuration?.configured || this.adapter.projection('synthia')) return;
    const chart = configuration.chart;
    const longitude = Number(chart.consciousSun?.longitude ?? chart.consciousSun?.degree);
    const rawSign = chart.consciousSun?.zodiac ?? chart.consciousSun?.sign;
    const sunSign = (typeof rawSign === 'string' && ZODIAC.includes(rawSign) ? rawSign : null)
      ?? (Number.isFinite(longitude) ? ZODIAC[Math.floor(((longitude % 360) + 360) % 360 / 30)] : 'Aries');
    const birthChart = {
      sunSign, moonSign: chart.consciousMoon?.zodiac ?? sunSign,
      risingSign: sunSign,
      activeGates: [...new Set((chart.placements ?? []).map(p => Number(p.gate)).filter(Number.isInteger))],
      definedCenters: Object.entries(chart.centers ?? {}).filter(([, defined]) => defined).map(([name]) => name),
      type: chart.type, authority: chart.authority,
    };
    const humanProfile = {
      id: configuration.personId,
      name: 'Synthia',
      birthday: configuration.privateBirthRecord?.birthDate ?? configuration.resolvedTime.utcIso.slice(0, 10),
      values: [],
    };
    this.adapter.bindProjection('synthia', {
      humanProfile,
      canonicalIdentity: { name: 'Synthia', birthChart, chart, agentId: configuration.agentId },
    });
    this.save().catch(() => {});
  }

  snapshot() {
    this.ensureProjection();
    const { checkpointState, ...publicState } = this.adapter.snapshot();
    return { ok: true, ...publicState, identityConfigured: !!this.organism.birthMirror.configuration?.configured };
  }

  async action(input) {
    this.ensureProjection();
    const result = await this.adapter.applyAction({ ...input, actor: 'synthia' });
    if (result.accepted) await this.save();
    return { ok: result.accepted, ...result, world: this.snapshot() };
  }

  async save() {
    const record = JSON.stringify({ savedAt: Date.now(), snapshot: this.adapter.snapshot() });
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      const tmp = `${this.path}.tmp`;
      await writeFile(tmp, record);
      await rename(tmp, this.path);
    });
    return this.writeQueue;
  }

  stop() {
    clearInterval(this.timer);
    return this.save();
  }
}
