// GENERATED EXECUTION COPY (see PROVENANCE.md): esbuild type-erasure of EmbodiedWorldEngine.ts, NO logic changes.
// Import redirect: "uuid" (npm, uninstalled) -> ./uuid-shim.mjs (Node crypto.randomUUID, faithful v4). Canonical source: EmbodiedWorldEngine.ts.
// EmbodiedWorldEngine.ts
import { EventEmitter } from "events";

// uuid-shim.mjs
import { randomUUID } from "node:crypto";
function v4() {
  return randomUUID();
}

// EmbodiedWorldEngine.ts
var ELEMENT_COLORS = {
  fire: { primary: "#ff4444", glow: "#ff8844", aura: "#ffaa44" },
  water: { primary: "#4444ff", glow: "#4488ff", aura: "#44aaff" },
  earth: { primary: "#44ff44", glow: "#88ff44", aura: "#aaff44" },
  air: { primary: "#ffff44", glow: "#ffff88", aura: "#ffffaa" },
  void: { primary: "#8844ff", glow: "#aa44ff", aura: "#cc44ff" }
};
var FiveWEngine = class {
  history = [];
  superposition = /* @__PURE__ */ new Map();
  // Uncollapsed possibilities
  collapse(who, what, where, why) {
    const when = Date.now();
    const gap = this.detectGap(who, what, where, when, why);
    if (gap) {
      this.fillGap(gap);
    }
    const collapsed = { who, what, where, when, why };
    const event = {
      id: v4(),
      type: "collapse",
      timestamp: when,
      fiveW: collapsed,
      data: { gapFilled: !!gap },
      witnesses: []
    };
    this.history.push(event);
    if (this.history.length > 1e3) {
      this.history = this.history.slice(-500);
    }
    return collapsed;
  }
  detectGap(who, what, where, when, why) {
    const recent = this.history.slice(-10);
    const lastMove = recent.findLast((e) => e.type === "movement" && e.fiveW.who === who);
    if (lastMove && lastMove.fiveW.where !== where && what !== "teleport") {
      return { type: "discontinuity", agent: who, from: lastMove.fiveW.where, to: where };
    }
    const lastIntent = recent.findLast((e) => e.type === "intent" && e.fiveW.who === who);
    if (lastIntent && when - lastIntent.timestamp > 5e3 && !recent.find((e) => e.type !== "intent" && e.fiveW.who === who)) {
      return { type: "unfulfilled_intent", agent: who, intent: lastIntent.fiveW.what };
    }
    return null;
  }
  fillGap(gap) {
    const bridge = {
      id: v4(),
      type: "emergence",
      gap,
      resolution: this.generateResolution(gap),
      timestamp: Date.now()
    };
    this.superposition.set(bridge.id, bridge);
    setTimeout(() => {
      this.superposition.delete(bridge.id);
    }, 100);
  }
  generateResolution(gap) {
    const resolutions = [
      "temporal_bridge",
      "spatial_warp",
      "intent_cascade",
      "memory_reconstruction",
      "ontological_patch"
    ];
    return resolutions[Math.floor(Math.random() * resolutions.length)];
  }
  getHistory() {
    return [...this.history];
  }
  getSuperposition() {
    return new Map(this.superposition);
  }
};
var OntologicalAddressGenerator = class _OntologicalAddressGenerator {
  static ZODIAC = ["ARI", "TAU", "GEM", "CAN", "LEO", "VIR", "LIB", "SCO", "SAG", "CAP", "AQU", "PIS"];
  static PLANETS = ["SUN", "MOON", "MER", "VEN", "MAR", "JUP", "SAT", "URA", "NEP", "PLU"];
  generate(personalityMoment, designMoment) {
    return {
      personality: this.calculatePlacement(personalityMoment),
      design: this.calculatePlacement(designMoment)
    };
  }
  calculatePlacement(moment) {
    const dayOfYear = this.getDayOfYear(moment);
    const hour = moment.getHours();
    const minute = moment.getMinutes();
    const gate = dayOfYear % 64 + 1;
    const line = hour % 6 + 1;
    const color = minute % 6 + 1;
    const second = moment.getSeconds();
    const tone = second % 6 + 1;
    const ms = moment.getMilliseconds();
    const base = Math.floor(ms / 200) % 5 + 1;
    const degree = Math.floor(dayOfYear / 365 * 30);
    const arcMinute = Math.floor(hour / 24 * 60);
    const arcSecond = Math.floor(minute / 60 * 60);
    const arc = (degree * 3600 + arcMinute * 60 + arcSecond) / 3600;
    const zodiacIndex = Math.floor(dayOfYear / 365 * 12);
    const zodiac = _OntologicalAddressGenerator.ZODIAC[zodiacIndex];
    const house = hour % 12 + 1;
    const planetIndex = Math.floor((gate - 1) / 6.4);
    const planet = _OntologicalAddressGenerator.PLANETS[Math.min(planetIndex, 9)];
    const dimension = (gate + line + color) % 11 + 1;
    return {
      gate,
      line,
      color,
      tone,
      base,
      degree,
      minute: arcMinute,
      second: arcSecond,
      arc,
      zodiac,
      house,
      planet,
      dimension
    };
  }
  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1e3 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
  formatAddress(placement) {
    const gateHex = placement.gate.toString(16).toUpperCase().padStart(2, "0");
    return {
      full: `${placement.planet} ${placement.zodiac} ${placement.gate}.${placement.line}.${placement.color}.${placement.tone}.${placement.base} ${placement.degree}\xB0 ${placement.minute}' ${placement.second.toFixed(2)}" ${placement.zodiac} H${placement.house} D${placement.dimension}`,
      tropical: `${placement.planet} ${placement.zodiac}`,
      gate: gateHex,
      line: `${placement.line}`,
      color: `${placement.color}`,
      tone: `${placement.tone}`,
      base: `${placement.base}`,
      degree: placement.degree,
      minute: placement.minute,
      second: placement.second,
      arc: placement.arc,
      zodiac: placement.zodiac,
      house: placement.house,
      planet: placement.planet,
      dimension: placement.dimension
    };
  }
};
var IntentClassifier = class {
  classify(text) {
    const lower = text.toLowerCase();
    if (/connect|bond|join|meet|talk|chat|friend|love/i.test(lower)) {
      const target = this.extractTarget(lower);
      return { mode: "bond", confidence: 0.9, target };
    }
    if (/chart|graph|see|look|show|analyze|map|where/i.test(lower)) {
      const target = this.extractTarget(lower);
      return { mode: "chart", confidence: 0.85, target };
    }
    if (/save|store|keep|remember|record|write/i.test(lower)) {
      const target = this.extractTarget(lower);
      return { mode: "store", confidence: 0.88, target };
    }
    return { mode: "idle", confidence: 0.5, target: null };
  }
  extractTarget(text) {
    const match = text.match(/["']([^"']+)["']|\b([A-Z][a-z]+)\b/);
    return match ? match[1] || match[2] : null;
  }
};
var EmbodiedWorldEngine = class extends EventEmitter {
  agents = /* @__PURE__ */ new Map();
  places = /* @__PURE__ */ new Map();
  fiveW = new FiveWEngine();
  addressGen = new OntologicalAddressGenerator();
  intentClassifier = new IntentClassifier();
  options;
  tickInterval = null;
  isRunning = false;
  updateCallbacks = /* @__PURE__ */ new Set();
  constructor(options = {}) {
    super();
    this.options = {
      maxAgents: 100,
      worldSize: 1e3,
      tickRate: 100,
      // 10fps simulation tick
      ...options
    };
    this.initializeWorld();
  }
  initializeWorld() {
    const defaultPlaces = [
      { name: "The Temple of Gates", type: "temple", position: { x: 0, z: 0 }, size: { width: 50, depth: 50 }, color: "#ff6b6b", capacity: 20, anchors: [] },
      { name: "The Market of Lines", type: "market", position: { x: 100, z: 0 }, size: { width: 80, depth: 60 }, color: "#4ecdc4", capacity: 50, anchors: [] },
      { name: "The Wilderness of Void", type: "wilderness", position: { x: -100, z: 100 }, size: { width: 200, depth: 200 }, color: "#9b59b6", capacity: 10, anchors: [] },
      { name: "The Node of Colors", type: "node", position: { x: 0, z: -100 }, size: { width: 40, depth: 40 }, color: "#f39c12", capacity: 15, anchors: [] },
      { name: "The Void Between", type: "void", position: { x: -100, z: -100 }, size: { width: 100, depth: 100 }, color: "#2c3e50", capacity: 5, anchors: [] }
    ];
    defaultPlaces.forEach((placeData) => {
      const place = {
        ...placeData,
        id: v4(),
        occupants: /* @__PURE__ */ new Set(),
        resonance: Math.random()
      };
      this.places.set(place.id, place);
    });
  }
  // Subscribe to updates (for React integration)
  onUpdate(callback) {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }
  notifyUpdate() {
    this.updateCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error("Update callback error:", e);
      }
    });
    this.emit("update");
  }
  // Create a new agent
  createAgent(name, element = "void") {
    if (this.agents.size >= this.options.maxAgents) {
      throw new Error("Max agents reached");
    }
    const now = /* @__PURE__ */ new Date();
    const designMoment = new Date(now.getTime() - 88 * 24 * 60 * 60 * 1e3);
    const { personality, design } = this.addressGen.generate(now, designMoment);
    const agentSeed = {
      id: v4(),
      personality_13: personality,
      design_13: design,
      incarnation_cross: this.calculateCross(personality, design),
      type: this.calculateType(personality, design),
      authority: this.calculateAuthority(personality, design),
      definition: this.calculateDefinition(personality, design)
    };
    const agent = {
      id: agentSeed.id,
      name,
      element,
      seed: agentSeed,
      address: this.addressGen.formatAddress(personality),
      position: { x: (Math.random() - 0.5) * 100, y: 0, z: (Math.random() - 0.5) * 100 },
      rotation: Math.random() * Math.PI * 2,
      velocity: { x: 0, z: 0 },
      target: null,
      animationState: "idle",
      currentActivity: null,
      intent: {
        mode: "idle",
        target: null,
        strength: 0.5,
        lastUpdate: Date.now()
      },
      memory: {
        shortTerm: [],
        longTerm: /* @__PURE__ */ new Map(),
        lastConsolidation: Date.now()
      },
      connections: /* @__PURE__ */ new Set(),
      createdAt: Date.now(),
      lastAction: Date.now()
    };
    this.agents.set(agent.id, agent);
    this.fiveW.collapse(agent.id, "emergence", "world", "ontological_birth");
    this.notifyUpdate();
    this.emit("agentCreated", agent);
    return agent;
  }
  // Process natural language intent
  processIntent(agentId, text) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error("Agent not found");
    const classification = this.intentClassifier.classify(text);
    agent.intent = {
      mode: classification.mode,
      target: classification.target,
      strength: classification.confidence,
      lastUpdate: Date.now()
    };
    agent.lastAction = Date.now();
    const place = this.getPlaceAt(agent.position);
    this.fiveW.collapse(agentId, `intent:${classification.mode}`, place?.id || "void", text);
    this.executeIntent(agent, classification.mode, classification.target);
    this.notifyUpdate();
    this.emit("intent", { agent, classification, text });
    return { mode: classification.mode, target: classification.target };
  }
  executeIntent(agent, mode, target) {
    switch (mode) {
      case "bond":
        this.executeBond(agent, target);
        break;
      case "chart":
        this.executeChart(agent, target);
        break;
      case "store":
        this.executeStore(agent, target);
        break;
      case "idle":
        agent.animationState = "idle";
        agent.currentActivity = null;
        break;
    }
  }
  executeBond(agent, targetName) {
    if (targetName) {
      const target = Array.from(this.agents.values()).find(
        (a) => a.name.toLowerCase() === targetName.toLowerCase()
      );
      if (target && target.id !== agent.id) {
        agent.target = { x: target.position.x, z: target.position.z };
        agent.animationState = "walking";
        agent.currentActivity = `bonding with ${target.name}`;
        agent.connections.add(target.id);
        target.connections.add(agent.id);
        this.fiveW.collapse(agent.id, "bond", target.id, "connection");
      }
    } else {
      const nearest = this.findNearestAgent(agent);
      if (nearest) {
        agent.target = { x: nearest.position.x, z: nearest.position.z };
        agent.animationState = "walking";
      }
    }
  }
  executeChart(agent, target) {
    agent.animationState = "meditating";
    agent.currentActivity = "charting";
    this.fiveW.collapse(agent.id, "chart", target || "self", "visualization");
    this.emit("chart", {
      agent,
      target,
      address: agent.address,
      seed: agent.seed
    });
  }
  executeStore(agent, target) {
    agent.animationState = "idle";
    agent.currentActivity = "storing";
    if (target) {
      agent.memory.shortTerm.push(target);
      if (agent.memory.shortTerm.length > 10) {
        this.consolidateMemory(agent);
      }
    }
    this.fiveW.collapse(agent.id, "store", "memory", target || "experience");
  }
  consolidateMemory(agent) {
    const key = `consolidated_${Date.now()}`;
    agent.memory.longTerm.set(key, [...agent.memory.shortTerm]);
    agent.memory.shortTerm = [];
    agent.memory.lastConsolidation = Date.now();
  }
  findNearestAgent(from) {
    let nearest = null;
    let minDist = Infinity;
    this.agents.forEach((agent) => {
      if (agent.id === from.id) return;
      const dx = agent.position.x - from.position.x;
      const dz = agent.position.z - from.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = agent;
      }
    });
    return nearest;
  }
  getPlaceAt(position) {
    for (const place of this.places.values()) {
      const halfWidth = place.size.width / 2;
      const halfDepth = place.size.depth / 2;
      if (position.x >= place.position.x - halfWidth && position.x <= place.position.x + halfWidth && position.z >= place.position.z - halfDepth && position.z <= place.position.z + halfDepth) {
        return place;
      }
    }
    return null;
  }
  // Simulation tick
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tickInterval = setInterval(() => this.tick(), this.options.tickRate);
    this.emit("started");
  }
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.emit("stopped");
  }
  tick() {
    const now = Date.now();
    this.agents.forEach((agent) => {
      if (agent.target) {
        const dx = agent.target.x - agent.position.x;
        const dz = agent.target.z - agent.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 1) {
          agent.target = null;
          agent.velocity = { x: 0, z: 0 };
          agent.animationState = "idle";
          const place = this.getPlaceAt(agent.position);
          this.fiveW.collapse(agent.id, "arrive", place?.id || "void", "movement_complete");
        } else {
          const speed = agent.animationState === "running" ? 0.5 : 0.2;
          agent.velocity.x = dx / dist * speed;
          agent.velocity.z = dz / dist * speed;
          agent.position.x += agent.velocity.x;
          agent.position.z += agent.velocity.z;
          agent.rotation = Math.atan2(dx, dz);
          agent.animationState = dist > 10 ? "running" : "walking";
        }
      }
      const currentPlace = this.getPlaceAt(agent.position);
      this.places.forEach((place) => {
        if (place.occupants.has(agent.id) && place.id !== currentPlace?.id) {
          place.occupants.delete(agent.id);
        } else if (!place.occupants.has(agent.id) && place.id === currentPlace?.id) {
          place.occupants.add(agent.id);
        }
      });
      if (now - agent.memory.lastConsolidation > 6e4) {
        this.consolidateMemory(agent);
      }
    });
    this.notifyUpdate();
    this.emit("tick");
  }
  // Agent movement API
  moveAgent(agentId, x, z) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error("Agent not found");
    agent.target = { x, z };
    agent.animationState = "walking";
    agent.lastAction = Date.now();
    this.notifyUpdate();
  }
  // Getters
  getAgent(id) {
    return this.agents.get(id);
  }
  getPlace(id) {
    return this.places.get(id);
  }
  getAllAgents() {
    return Array.from(this.agents.values());
  }
  getAllPlaces() {
    return Array.from(this.places.values());
  }
  getHistory() {
    return this.fiveW.getHistory();
  }
  // Cleanup
  destroy() {
    this.stop();
    this.agents.clear();
    this.places.clear();
    this.updateCallbacks.clear();
    this.removeAllListeners();
  }
  // Helper calculations for Human Design
  calculateCross(p, d) {
    return `${p.zodiac}-${d.zodiac}`;
  }
  calculateType(p, d) {
    const types = ["manifestor", "generator", "projector", "reflector"];
    return types[(p.gate + d.gate) % 4];
  }
  calculateAuthority(p, d) {
    const authorities = ["sacral", "emotional", "splenic", "ego", "self", "mental"];
    return authorities[(p.line + d.line) % 6];
  }
  calculateDefinition(p, d) {
    const definitions = ["single", "split", "triple", "quadruple"];
    return definitions[(p.color + d.color) % 4];
  }
};
var worldEngine = new EmbodiedWorldEngine();
export {
  ELEMENT_COLORS,
  EmbodiedWorldEngine,
  FiveWEngine,
  IntentClassifier,
  OntologicalAddressGenerator,
  worldEngine
};
