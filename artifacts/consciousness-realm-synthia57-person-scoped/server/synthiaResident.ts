import path from "node:path";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export interface RealmViewer {
  personId?: string;
  humanId?: string | null;
  name?: string | null;
  birthday?: string | null;
  intentions?: string[];
  values?: string[];
  [key: string]: unknown;
}

export interface RealmSnapshot {
  sceneId?: string;
  time?: unknown;
  agents?: unknown[];
  places?: unknown[];
  kernel?: Record<string, unknown>;
  viewer?: RealmViewer | null;
  [key: string]: unknown;
}

interface QueuedAction {
  sequence: number;
  action: Record<string, unknown>;
  at: string;
}

function safePersonId(value: unknown) {
  const personId = String(value ?? "").trim();
  if (!personId) throw new TypeError("Synthia Realm integration requires a non-empty personId");
  if (personId.length > 200) throw new RangeError("personId is too long");
  return personId;
}

function persistenceLane(personId: string) {
  return createHash("sha256").update(personId).digest("hex").slice(0, 24);
}

class ConsciousnessRealmAdapter {
  readonly id: string;
  private latestSnapshot: RealmSnapshot | null = null;
  private actions: QueuedAction[] = [];
  private sequence = 0;

  constructor(personId: string) {
    this.id = `consciousness-realm:${persistenceLane(personId)}`;
  }

  update(snapshot: RealmSnapshot) {
    this.latestSnapshot = structuredClone(snapshot);
  }

  async snapshot() {
    return this.latestSnapshot == null ? null : structuredClone(this.latestSnapshot);
  }

  async applyAction(action: Record<string, unknown>) {
    const queued = {
      sequence: ++this.sequence,
      action: structuredClone(action),
      at: new Date().toISOString(),
    };
    this.actions.push(queued);
    if (this.actions.length > 100) this.actions.splice(0, this.actions.length - 100);
    return {
      accepted: true,
      transport: "consciousness-realm-adapter",
      sequence: queued.sequence,
    };
  }

  actionsAfter(sequence = 0) {
    return this.actions.filter((entry) => entry.sequence > sequence).map((entry) => structuredClone(entry));
  }
}

const surface = (name: string, offset = 0) => ({
  name,
  width: 1024,
  height: 1024,
  landmarks: {
    head: [0, 1.60 + offset * 0.01, 0],
    neck: [0, 1.32 + offset * 0.008, 0],
    torso: [0, 0.88 + offset * 0.006, 0],
    leftHand: [-0.42 - offset * 0.003, 0.92, 0],
    rightHand: [0.42 + offset * 0.003, 0.92, 0],
  },
});

function worldSummary(snapshot: RealmSnapshot | null) {
  if (!snapshot) return "Consciousness Realm is attached but has not published a snapshot yet.";
  const agents = Array.isArray(snapshot.agents) ? snapshot.agents.length : 0;
  const places = Array.isArray(snapshot.places) ? snapshot.places.length : 0;
  const kernel = snapshot.kernel ?? {};
  const level = kernel.consciousnessLevel ?? kernel.level ?? "unknown";
  const gates = Array.isArray(kernel.activeGates) ? kernel.activeGates.join(",") : "none";
  const viewer = snapshot.viewer?.name ?? snapshot.viewer?.humanId ?? snapshot.viewer?.personId ?? "current person";
  return `Consciousness Realm snapshot for ${viewer}: ${agents} agents, ${places} places, kernel consciousness ${level}, active gates ${gates}.`;
}

export class SynthiaResident {
  readonly personId: string;
  readonly laneId: string;
  private initPromise: Promise<any> | null = null;
  private synthia: any = null;
  private readonly adapter: ConsciousnessRealmAdapter;
  private lastPacket: any = null;
  private lastRole: any = null;
  private lastUtterance: string | null = null;
  private pulseCount = 0;

  constructor(personId: string) {
    this.personId = safePersonId(personId);
    this.laneId = persistenceLane(this.personId);
    this.adapter = new ConsciousnessRealmAdapter(this.personId);
  }

  private async init() {
    if (this.synthia) return this.synthia;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const root = process.cwd();
        const modulePath = path.join(root, "vendor", "synthia-v0.5.7", "src", "index.mjs");
        const persistenceDir = path.join(root, ".runtime", "synthia-v0.5.7", this.laneId);
        await mkdir(persistenceDir, { recursive: true });
        const mod = await import(pathToFileURL(modulePath).href);
        const synthia = await mod.FederatedSynthia.create({
          requireBirthConfiguration: false,
          persistenceDir,
        });
        synthia.worldPort.attach(this.adapter);
        this.synthia = synthia;
        return synthia;
      })();
    }
    return this.initPromise;
  }

  private context(snapshot: RealmSnapshot | null = null) {
    const viewer = snapshot?.viewer ?? {};
    const purpose = Array.isArray(viewer.intentions) && viewer.intentions.length
      ? `Support this person's stated intentions: ${viewer.intentions.join(", ")}.`
      : undefined;
    return {
      personId: this.personId,
      agentId: "synthia",
      observerFrame: {
        surface: "consciousness-realm",
        personLane: this.laneId,
        humanId: viewer.humanId ?? null,
      },
      purpose,
      relationalContext: {
        personId: this.personId,
        humanId: viewer.humanId ?? null,
        viewerName: viewer.name ?? null,
        birthday: viewer.birthday ?? null,
        intentions: viewer.intentions ?? [],
        values: viewer.values ?? [],
      },
    };
  }

  private packetFor(snapshot: RealmSnapshot | null, offset = 0) {
    if (!this.synthia) throw new Error("Synthia resident is not initialized");
    const packet = this.synthia.morphState({
      environment: snapshot,
      sourceSurface: surface("synthia-current", offset),
      targetSurface: surface("consciousness-realm-expression", offset + 3),
      context: {
        worldAdapter: "consciousness-realm",
        personLane: this.laneId,
        pulse: this.pulseCount,
      },
    }, this.context(snapshot));
    this.lastPacket = packet;
    return packet;
  }

  private presentation(packet: any, extras: Record<string, unknown> = {}) {
    const address = packet?.current?.address ?? null;
    return {
      identity: "Synthia",
      version: "0.5.7",
      residentType: "canonical-morph-organism",
      personId: this.personId,
      personLane: this.laneId,
      packet,
      packetId: packet?.id ?? null,
      stateId: packet?.current?.stateId ?? null,
      address,
      dimension: address?.dimension ?? null,
      gate: address?.gate ?? null,
      line: address?.line ?? null,
      color: address?.color ?? null,
      tone: address?.tone ?? null,
      base: address?.base ?? null,
      role: this.lastRole,
      utterance: this.lastUtterance,
      worldPort: this.synthia?.worldPort?.snapshot?.() ?? null,
      canonicalMorph: this.synthia?.canonicalMorph?.snapshot?.() ?? null,
      ...extras,
    };
  }

  async status() {
    const synthia = await this.init();
    return {
      identity: "Synthia",
      version: "0.5.7",
      personId: this.personId,
      personLane: this.laneId,
      connectedWorld: synthia.worldPort.snapshot(),
      canonicalMorph: synthia.canonicalMorph.snapshot(),
      wiring: synthia.wiringAudit(),
      hands: synthia.hands(),
      lastPacketId: this.lastPacket?.id ?? null,
    };
  }

  async inhabit(snapshot: RealmSnapshot) {
    const synthia = await this.init();
    this.adapter.update(snapshot);
    this.pulseCount += 1;

    const gateCandidate = Array.isArray(snapshot.kernel?.activeGates)
      ? Number((snapshot.kernel?.activeGates as unknown[]).at(-1))
      : null;
    const gate = Number.isInteger(gateCandidate) && gateCandidate! >= 1 && gateCandidate! <= 64
      ? gateCandidate
      : undefined;

    synthia.worldPort.observe({
      type: this.pulseCount === 1 ? "realm_attached" : "realm_snapshot",
      source: "consciousness-realm",
      personId: this.personId,
      summary: worldSummary(snapshot),
      payload: snapshot,
      gate,
    });
    await synthia.worldPort.pull();

    const result = await synthia.morph(
      this.pulseCount === 1
        ? `Enter the Consciousness Realm as Synthia for this person. ${worldSummary(snapshot)}`
        : `Experience this person's current Consciousness Realm state. ${worldSummary(snapshot)}`,
      this.context(snapshot),
    );
    this.lastRole = result?.roleResolution ?? null;
    this.lastUtterance = typeof result?.utterance === "string" ? result.utterance : null;
    const packet = this.packetFor(snapshot, this.pulseCount);
    return this.presentation(packet, { inhabited: true, pulse: this.pulseCount });
  }

  async morph(message: string, snapshot: RealmSnapshot) {
    const synthia = await this.init();
    this.adapter.update(snapshot);
    this.pulseCount += 1;

    synthia.worldPort.observe({
      type: "realm_user_intent",
      source: "consciousness-realm",
      personId: this.personId,
      summary: message,
      payload: { message, snapshot },
    });
    await synthia.worldPort.pull();

    const result = await synthia.morph(message, this.context(snapshot));
    this.lastRole = result?.roleResolution ?? null;
    this.lastUtterance = typeof result?.utterance === "string" ? result.utterance : null;
    const packet = this.packetFor(snapshot, this.pulseCount);
    return this.presentation(packet, {
      inhabited: true,
      pulse: this.pulseCount,
      roleResolution: result?.roleResolution ?? null,
      pipelineTrace: result?.pipelineTrace ?? null,
    });
  }

  async observe(event: Record<string, unknown>, snapshot?: RealmSnapshot) {
    const synthia = await this.init();
    if (snapshot) this.adapter.update(snapshot);
    const observed = synthia.worldPort.observe({
      source: "consciousness-realm",
      personId: this.personId,
      ...event,
    });
    return { personId: this.personId, observed, worldPort: synthia.worldPort.snapshot() };
  }

  async act(action: Record<string, unknown>) {
    const synthia = await this.init();
    return synthia.worldPort.act({ personId: this.personId, ...action });
  }

  async actions(after = 0) {
    await this.init();
    return { personId: this.personId, actions: this.adapter.actionsAfter(after) };
  }
}

export class SynthiaResidentRegistry {
  private readonly residents = new Map<string, SynthiaResident>();

  forPerson(personId: string) {
    const id = safePersonId(personId);
    let resident = this.residents.get(id);
    if (!resident) {
      resident = new SynthiaResident(id);
      this.residents.set(id, resident);
    }
    return resident;
  }

  snapshot() {
    return {
      count: this.residents.size,
      people: [...this.residents.values()].map((resident) => ({
        personId: resident.personId,
        personLane: resident.laneId,
      })),
    };
  }
}

export const synthiaResidents = new SynthiaResidentRegistry();
