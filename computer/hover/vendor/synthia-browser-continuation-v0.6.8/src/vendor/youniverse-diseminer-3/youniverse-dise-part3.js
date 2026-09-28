<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
// DISEMINER ENGINE — Embedded (Sheldon Klein, 1965-1973)
// ============================================================

const BASE_VOICES = { 1: "I Define", 2: "I Remember", 3: "I Am", 4: "I Design", 5: "I Think" };
const BASE_DIMS = { 1: "Movement", 2: "Evolution", 3: "Being", 4: "Design", 5: "Space" };
const TONE_NATURES = { 1: "Smell", 2: "Taste", 3: "Sound", 4: "Touch", 5: "Inner Vision", 6: "Outer Vision" };
const COLOR_MOTS = { 1: "Fear", 2: "Hope", 3: "Desire", 4: "Need", 5: "Guilt", 6: "Innocence" };

const GATES = {
  1: { p: "creative spark", proc: "direction", res: "initiation" },
  2: { p: "receptivity", proc: "guidance", res: "orientation" },
  3: { p: "chaos", proc: "mutation", res: "stabilization" },
  4: { p: "mental pressure", proc: "logic", res: "answers" },
  5: { p: "rhythm", proc: "patterning", res: "consistency" },
  6: { p: "friction", proc: "boundary testing", res: "resolution" },
  7: { p: "leadership pull", proc: "direction setting", res: "guidance" },
  8: { p: "expression", proc: "contribution", res: "influence" },
  9: { p: "focus", proc: "concentration", res: "completion" },
  10: { p: "identity tension", proc: "behavior shaping", res: "authenticity" },
  11: { p: "ideas", proc: "conceptualizing", res: "clarity" },
  12: { p: "caution", proc: "pause", res: "expression" },
  13: { p: "listening", proc: "collecting stories", res: "understanding" },
  14: { p: "resources", proc: "direction of energy", res: "empowerment" },
  15: { p: "extremes", proc: "balancing", res: "harmony" },
  16: { p: "enthusiasm", proc: "skill building", res: "mastery" },
  17: { p: "opinions", proc: "logic", res: "pattern insight" },
  18: { p: "correction", proc: "discernment", res: "improvement" },
  19: { p: "need", proc: "sensitivity", res: "support" },
  20: { p: "now", proc: "presence", res: "expression" },
  21: { p: "control", proc: "management", res: "allocation" },
  22: { p: "emotion", proc: "grace", res: "openness" },
  23: { p: "explanation", proc: "simplifying", res: "clarity" },
  24: { p: "mental return", proc: "processing", res: "realization" },
  25: { p: "innocence", proc: "universalizing", res: "acceptance" },
  26: { p: "ego tension", proc: "influence", res: "persuasion" },
  27: { p: "care", proc: "nurturing", res: "sustainability" },
  28: { p: "struggle", proc: "risk", res: "purpose" },
  29: { p: "commitment", proc: "perseverance", res: "follow-through" },
  30: { p: "desire", proc: "feeling", res: "experience" },
  31: { p: "influence", proc: "leadership", res: "direction" },
  32: { p: "continuity", proc: "evaluation", res: "preservation" },
  33: { p: "privacy", proc: "retreat", res: "reflection" },
  34: { p: "power", proc: "action", res: "impact" },
  35: { p: "change", proc: "experience", res: "progress" },
  36: { p: "crisis", proc: "emotion", res: "resolution" },
  37: { p: "family tension", proc: "bonding", res: "peace" },
  38: { p: "fight", proc: "challenge", res: "purpose" },
  39: { p: "provocation", proc: "stimulation", res: "release" },
  40: { p: "willpower", proc: "deliverance", res: "rest" },
  41: { p: "compression", proc: "imagination", res: "experience" },
  42: { p: "growth", proc: "expansion", res: "completion" },
  43: { p: "insight", proc: "breakthrough", res: "clarity" },
  44: { p: "alertness", proc: "recognition", res: "pattern memory" },
  45: { p: "command", proc: "distribution", res: "organization" },
  46: { p: "embodiment", proc: "alignment", res: "serendipity" },
  47: { p: "mental pressure", proc: "realization", res: "insight" },
  48: { p: "depth", proc: "resourcefulness", res: "solution" },
  49: { p: "principles", proc: "reaction", res: "reformation" },
  50: { p: "values", proc: "responsibility", res: "protection" },
  51: { p: "shock", proc: "initiation", res: "awakening" },
  52: { p: "stillness", proc: "focus", res: "concentration" },
  53: { p: "beginning", proc: "development", res: "momentum" },
  54: { p: "ambition", proc: "drive", res: "ascent" },
  55: { p: "emotion", proc: "mood", res: "spirit" },
  56: { p: "stimulation", proc: "storytelling", res: "meaning" },
  57: { p: "instinct", proc: "clarity", res: "intuition" },
  58: { p: "vitality", proc: "joy", res: "improvement" },
  59: { p: "intimacy", proc: "fusion", res: "connection" },
  60: { p: "limitation", proc: "restriction", res: "innovation" },
  61: { p: "mystery", proc: "inner truth", res: "knowing" },
  62: { p: "details", proc: "naming", res: "precision" },
  63: { p: "doubt", proc: "questioning", res: "clarity" },
  64: { p: "confusion", proc: "processing", res: "realization" }
};

// ============================================================
// SEMANTIC NETWORK (Klein 1973: O-R-O triples with time)
// ============================================================

class SemanticNetwork {
  constructor() {
    this.nodes = new Map();
    this.triples = new Map();
    this.nextNodeId = 1;
    this.nextTripleId = 1;
    this.clock = 0;
    this.initCore();
  }

  initCore() {
    const rels = [
      ['break', 'verb', -3], ['love', 'verb', 9], ['know', 'verb', 2],
      ['feel', 'verb', 5], ['create', 'verb', 8], ['struggle', 'verb', -4],
      ['accept', 'verb', 6], ['resist', 'verb', -5], ['transform', 'verb', 7],
      ['in', 'prep', 0], ['with', 'prep', 0], ['through', 'prep', 0]
    ];
    rels.forEach(([stem, pos, val]) => {
      this.createNode('relation', [{stem, partOfSpeech: pos, probability: 1, emotionalValence: val, contextualTags: ['core']}]);
    });
  }

  createNode(type, lexicalList) {
    const id = this.nextNodeId++;
    this.nodes.set(id, { id, type, lexicalList, triplePointers: [], numericalValue: null });
    return id;
  }

  createTriple(alpha, gamma, beta) {
    const id = this.nextTripleId++;
    this.triples.set(id, {
      alpha, gamma: gamma || 0, beta: beta || 0,
      timeCreated: this.clock, timeDeleted: null,
      lexicalExpressions: [], frequencyWeight: 1, contextualMarkings: []
    });
    const a = this.nodes.get(alpha);
    if (a) a.triplePointers.push(id);
    const g = this.nodes.get(gamma);
    if (g) g.triplePointers.push(id);
    const b = this.nodes.get(beta);
    if (b) b.triplePointers.push(id);
    return id;
  }

  setEmotionalValence(nodeId, valence) {
    const node = this.nodes.get(nodeId);
    if (node) node.numericalValue = Math.max(-10, Math.min(10, valence));
  }

  getEmotionalValence(tripleId) {
    const triple = this.triples.get(tripleId);
    if (!triple) return 0;
    const rel = this.nodes.get(triple.gamma);
    return rel?.numericalValue || 0;
  }

  advanceClock() { this.clock++; }
  getClock() { return this.clock; }
}

// ============================================================
// MONTE CARLO SIMULATOR (Klein 1972)
// ============================================================

class MonteCarloSimulator {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.state = { clock: 0, speakers: new Map(), eventQueue: [] };
  }

  random() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  runSimulation(runs, profile) {
    let successful = 0;
    let totalConfidence = 0;
    const trajectories = [];

    for (let i = 0; i < runs; i++) {
      // Simulate interaction between user and mirror
      const impulse = this.detectImpulse(profile.lastQuery || '');
      const valence = impulse.valence;
      const intensity = impulse.intensity;

      // Parse success probability
      const parsed = this.random() > 0.3;
      const accepted = parsed && this.random() > 0.2;

      if (accepted) successful++;
      totalConfidence += parsed ? 1.0 : 0.5;

      // Build emotional trajectory
      const startVal = profile.color === 2 ? 5 : profile.color === 1 ? -5 : 0;
      const midVal = valence * intensity;
      const endVal = midVal * 0.5 + (profile.color === 2 ? 3 : 0);
      trajectories.push([startVal, midVal, endVal]);
    }

    return {
      confidence: (successful / runs) * (totalConfidence / runs),
      trajectories,
      successfulPaths: successful
    };
  }

  detectImpulse(query) {
    const t = (query || '').toLowerCase();
    let type = 'neutral', valence = 0, intensity = 0.5;
    const patterns = {
      fear: { words: ['fear','anxiety','scared','worried'], v: -7, i: 0.8 },
      hope: { words: ['hope','dream','wish','want'], v: 8, i: 0.7 },
      love: { words: ['love','care','connect'], v: 9, i: 0.6 },
      struggle: { words: ['stuck','struggle','hard','pain'], v: -4, i: 0.9 },
      power: { words: ['power','energy','force'], v: 6, i: 0.7 }
    };
    for (const [k, p] of Object.entries(patterns)) {
      if (p.words.some(w => t.includes(w))) { type = k; valence = p.v; intensity = p.i; break; }
    }
    if (t.includes('who') || t.includes('am i')) { type = 'identity'; valence = 2; }
    if (t.includes('what') || t.includes('happening')) { type = 'process'; valence = 1; }
    if (t.includes('when') || t.includes('time')) { type = 'timing'; valence = 0; }
    if (t.includes('why') || t.includes('because')) { type = 'reason'; valence = 3; }
    if (t.includes('how') || t.includes('do i')) { type = 'method'; valence = 4; }
    return { type, valence, intensity };
  }
}

// ============================================================
// W-DIMENSIONS ENGINE
// ============================================================

class WDimensionEngine {
  constructor(profile) {
    this.dims = {
      w1: [0.3,0.5,0.8,0.6,0.4][profile.base-1] || 0.5,
      w2: [0.4,0.5,0.6,0.8,0.7,0.5][profile.tone-1] || 0.5,
      w3: [0.2,0.9,0.6,0.5,0.3,0.8][profile.color-1] || 0.5,
      w4: profile.base === 3 ? 0.9 : profile.base === 1 ? 0.3 : 0.6,
      w5: profile.color === 6 ? 0.9 : profile.color === 2 ? 0.85 : 0.5
    };
  }
  getBypassFactor() { return this.dims.w3 * 0.4 + this.dims.w5 * 0.6; }
  getInfluencePotential() { return this.dims.w1*0.2 + this.dims.w2*0.2 + this.dims.w3*0.3 + this.dims.w4*0.1 + this.dims.w5*0.2; }
}

// ============================================================
// DISEMINER NARRATIVE ENGINE
// ============================================================

class DiseminerEngine {
  constructor(profile) {
    this.profile = profile;
    this.network = new SemanticNetwork();
    this.simulator = new MonteCarloSimulator(profile.name.length + profile.base * 100);
    this.history = [];
    this.gateActivations = new Map();
    this.initUserNetwork();
  }

  initUserNetwork() {
    const baseNode = this.network.createNode('object', [{
      stem: BASE_DIMS[this.profile.base] || "Being",
      partOfSpeech: 'noun', probability: 1, emotionalValence: 5, contextualTags: ['base','identity']
    }]);
    const toneNode = this.network.createNode('object', [{
      stem: TONE_NATURES[this.profile.tone] || "Touch",
      partOfSpeech: 'noun', probability: 1, emotionalValence: 3, contextualTags: ['tone','perception']
    }]);
    const colorNode = this.network.createNode('object', [{
      stem: COLOR_MOTS[this.profile.color] || "Hope",
      partOfSpeech: 'noun', probability: 1,
      emotionalValence: this.profile.color === 2 ? 8 : this.profile.color === 1 ? -6 : 0,
      contextualTags: ['color','motivation']
    }]);
    const isRel = this.network.createNode('relation', [{
      stem: 'is', partOfSpeech: 'verb', probability: 1, emotionalValence: 0, contextualTags: ['identity','being']
    }]);
    this.network.createTriple(baseNode, isRel, toneNode);
    this.network.createTriple(toneNode, isRel, colorNode);
    this.network.setEmotionalValence(baseNode, 5);
    this.network.setEmotionalValence(colorNode, this.profile.color === 2 ? 8 : -3);
  }

  processQuery(query) {
    this.profile.lastQuery = query;
    const impulse = this.simulator.detectImpulse(query);

    // D2: Decompose to semantic triples
    const subjectNode = this.network.createNode('object', [{
      stem: this.profile.name, partOfSpeech: 'noun', probability: 1, emotionalValence: 5, contextualTags: ['user','subject']
    }]);
    const relNode = this.network.createNode('relation', [{
      stem: this.impulseToRelation(impulse.type), partOfSpeech: 'verb', probability: 1,
      emotionalValence: impulse.valence, contextualTags: ['impulse', impulse.type]
    }]);
    const objNode = this.network.createNode('object', [{
      stem: this.extractObject(query), partOfSpeech: 'noun', probability: 0.8,
      emotionalValence: impulse.valence * 0.5, contextualTags: ['object','query-focus']
    }]);
    this.network.createTriple(subjectNode, relNode, objNode);
    this.network.setEmotionalValence(relNode, impulse.valence);

    const gate = this.impulseToGate(impulse.type);
    this.gateActivations.set(gate, impulse.intensity);

    // D3: Monte Carlo simulation
    const mcRuns = 50;
    const simResult = this.simulator.runSimulation(mcRuns, this.profile);

    // D4: Apply context
    const baseWeight = this.profile.base === 3 ? 1.2 : 0.8;
    const toneWeight = this.profile.tone === 4 ? 1.1 : 0.9;
    const colorWeight = this.profile.color === 2 ? 1.3 : 0.7;
    const profileAlignment = (baseWeight + toneWeight + colorWeight) / 3;

    // D5: Generate narrative
    const perspective = this.inferPerspective(query);
    const gInfo = this.getGateInfo(gate);
    const voice = BASE_VOICES[this.profile.base] || "I";
    const dim = BASE_DIMS[this.profile.base] || "Being";
    const tone = TONE_NATURES[this.profile.tone] || "Touch";
    const color = COLOR_MOTS[this.profile.color] || "Hope";

    const templates = {
      who: `${voice} the one shaped by ${gInfo.p}, moving through ${gInfo.proc}, arriving at ${gInfo.res}. At the Base of ${dim}, expressed through ${tone}, responding with ${color}.`,
      what: `This is a process of ${gInfo.proc}, pressured by ${gInfo.p}, resolving into ${gInfo.res}. At the Base of ${dim}, modulated by ${tone}, colored by ${color}.`,
      when: `This emerges when ${gInfo.res} becomes possible, driven by ${gInfo.p}, moving through ${gInfo.proc}. At the Base of ${dim}, sensed through ${tone}, motivated by ${color}.`,
      why: `This exists because of ${gInfo.p}, the force that drives ${gInfo.proc} toward ${gInfo.res}. At the Base of ${dim}, perceived through ${tone}, shaped by ${color}.`,
      how: `It works through ${gInfo.proc}, pressured by ${gInfo.p}, arriving at ${gInfo.res}. At the Base of ${dim}, felt as ${tone}, guided by ${color}.`
    };

    const mainSentence = templates[perspective] || templates.what;

    // Monte Carlo insight
    const confidence = simResult.confidence;
    let mcInsight;
    if (confidence > 0.8) {
      mcInsight = `Across ${mcRuns} simulations, this pattern converged with high certainty. The field is coherent — trust what you feel.`;
    } else if (confidence > 0.5) {
      mcInsight = `After ${mcRuns} runs, the signal is present but mixed. The ambiguity is not noise — it is the space where choice lives.`;
    } else {
      mcInsight = `${mcRuns} simulations show divergence. This is not uncertainty — it is the quantum superposition of your possible selves. Observe without collapsing.`;
    }

    // Artifact
    const artifacts = {
      6: "Have one honest, boundary-clear conversation today. Name what you feel without blaming.",
      10: "Notice one behavior that is not you. Do not judge it — just witness it.",
      28: "Name one struggle that has shaped you. Thank it for the strength it gave.",
      34: "Take one action that uses your power without forcing it. Let it be effortless.",
      35: "Change one small thing in your routine today. Notice how the field responds.",
      41: "Start the smallest version of the dream. One tiny seed is enough.",
      48: "Go one layer deeper than you usually go. The answer is always further down.",
      49: "Say no once today where your body wants to. Let the principle protect you.",
      59: "Share one truth with someone you trust. Intimacy is the highest form of courage.",
      61: "Sit in silence for 3 minutes and let a truth arrive without chasing it."
    };
    const artifact = artifacts[gate] || "Sit for 60 seconds and feel where this lives in your body.";

    const narrative = `${mainSentence}\n\n${mcInsight}\n\nArtifact: ${artifact}`;

    // Emotional trajectory
    const startVal = this.profile.color === 2 ? 5 : this.profile.color === 1 ? -5 : 0;
    const trajectory = [startVal, impulse.valence, impulse.valence * profileAlignment];
    if (trajectory[trajectory.length - 1] < 0) {
      trajectory.push(trajectory[trajectory.length - 1] * 0.5 + 3);
    }

    const result = {
      narrative,
      gateActivations: [gate],
      confidence: confidence * profileAlignment,
      emotionalTrajectory: trajectory,
      monteCarloRuns: mcRuns,
      impulse,
      gateInfo: gInfo
    };

    this.history.push(result);
    return result;
  }

  impulseToRelation(type) {
    const map = { fear: 'fear', hope: 'hope', love: 'love', struggle: 'struggle', power: 'empower',
      identity: 'become', process: 'experience', timing: 'wait', reason: 'understand', method: 'navigate', neutral: 'feel' };
    return map[type] || 'experience';
  }

  extractObject(query) {
    const words = (query || '').split(' ').filter(w => w.length > 3);
    return words[words.length - 1] || 'life';
  }

  impulseToGate(type) {
    const map = { fear: 49, hope: 41, love: 59, struggle: 28, power: 34,
      identity: 10, process: 35, timing: 5, reason: 61, method: 48, neutral: 6 };
    return map[type] || 6;
  }

  inferPerspective(query) {
    const t = (query || '').toLowerCase();
    if (t.includes('who') || t.includes('am i')) return 'who';
    if (t.includes('when') || t.includes('time')) return 'when';
    if (t.includes('why') || t.includes('because')) return 'why';
    if (t.includes('how') || t.includes('do i')) return 'how';
    return 'what';
  }

  getGateInfo(gate) {
    return GATES[gate] || { p: 'pressure', proc: 'process', res: 'resolution' };
  }
}

// ============================================================
// PERSONAL PROFILE
// ============================================================
let PERSONAL_PROFILE = JSON.parse(localStorage.getItem("youniverse_profile")) || {
  base: 3, tone: 4, color: 2, name: "Alexis"
};

// Initialize DISEMINER engines
let diseminerEngine = new DiseminerEngine({
  base: PERSONAL_PROFILE.base,
  tone: PERSONAL_PROFILE.tone,
  color: PERSONAL_PROFILE.color,
  name: PERSONAL_PROFILE.name,
  activeGates: [],
  definedChannels: []
});
let wEngine = new WDimensionEngine(PERSONAL_PROFILE);

function updateBadge() {
  document.getElementById("profile-badge").textContent = PERSONAL_PROFILE.name;
}
updateBadge();

window.openProfile = () => {
  document.getElementById("p-name").value = PERSONAL_PROFILE.name;
  document.getElementById("p-base").value = PERSONAL_PROFILE.base;
  document.getElementById("p-tone").value = PERSONAL_PROFILE.tone;
  document.getElementById("p-color").value = PERSONAL_PROFILE.color;
  document.getElementById("profile-modal").classList.add("active");
};

window.saveProfile = () => {
  PERSONAL_PROFILE.name = document.getElementById("p-name").value || "You";
  PERSONAL_PROFILE.base = parseInt(document.getElementById("p-base").value);
  PERSONAL_PROFILE.tone = parseInt(document.getElementById("p-tone").value);
  PERSONAL_PROFILE.color = parseInt(document.getElementById("p-color").value);
  localStorage.setItem("youniverse_profile", JSON.stringify(PERSONAL_PROFILE));
  updateBadge();
  // Reinitialize DISEMINER with new profile
  diseminerEngine = new DiseminerEngine({
    base: PERSONAL_PROFILE.base, tone: PERSONAL_PROFILE.tone,
    color: PERSONAL_PROFILE.color, name: PERSONAL_PROFILE.name,
    activeGates: [], definedChannels: []
  });
  wEngine = new WDimensionEngine(PERSONAL_PROFILE);
  document.getElementById("profile-modal").classList.remove("active");
};

// PWA
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); deferredPrompt = e;
  document.getElementById("install-banner").classList.add("active");
});
window.installApp = () => {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); }
  window.dismissBanner();
};
window.dismissBanner = () => document.getElementById("install-banner").classList.remove("active");

// Modal
window.showModal = (title, body) => {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = body;
  document.getElementById("modal-overlay").classList.add("active");
};
window.closeModal = () => document.getElementById("modal-overlay").classList.remove("active");

document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-overlay")) window.closeModal();
});
document.getElementById("profile-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("profile-modal")) {
    document.getElementById("profile-modal").classList.remove("active");
  }
});
