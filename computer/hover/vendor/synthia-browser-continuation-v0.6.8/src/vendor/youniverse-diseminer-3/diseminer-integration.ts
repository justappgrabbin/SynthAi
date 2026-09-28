/**
 * YOU-N-I-VERSE DISEMINER Integration
 * Replaces the simple resonance engine with full Sheldon Klein DISEMINER
 * Monte Carlo narrative simulation, semantic triple networks, style control
 *
 * Drop this into your existing app as a module import.
 */

import {
  DiseminerEngine,
  WDimensionEngine,
  createDiseminerEngine,
  createWEngine,
  GATES_64
} from './diseminer-engine.js';

// ============================================================
// GLOBAL ENGINE INSTANCE (persists across sessions)
// ============================================================

let diseminerEngine: DiseminerEngine | null = null;
let wEngine: WDimensionEngine | null = null;

function getDiseminerEngine(): DiseminerEngine {
  if (!diseminerEngine) {
    const profile = JSON.parse(localStorage.getItem("youniverse_profile") || '{}');
    const userProfile = {
      base: profile.base || 3,
      tone: profile.tone || 4,
      color: profile.color || 2,
      name: profile.name || "You",
      activeGates: profile.activeGates || [],
      definedChannels: profile.definedChannels || []
    };
    diseminerEngine = createDiseminerEngine(userProfile);
    wEngine = createWEngine(userProfile);
  }
  return diseminerEngine;
}

function getWEngine(): WDimensionEngine {
  if (!wEngine) {
    const profile = JSON.parse(localStorage.getItem("youniverse_profile") || '{}');
    const userProfile = {
      base: profile.base || 3,
      tone: profile.tone || 4,
      color: profile.color || 2,
      name: profile.name || "You",
      activeGates: [],
      definedChannels: []
    };
    wEngine = createWEngine(userProfile);
  }
  return wEngine;
}

// ============================================================
// REPLACEMENT FUNCTIONS (drop-in for existing chat handler)
// ============================================================

/**
 * Replaces the old inferResonance() function.
 * Now uses DISEMINER semantic triple decomposition + Monte Carlo simulation.
 */
export function inferResonanceDISEMINER(text: string): {
  gate: number;
  perspective: number;
  narrative: string;
  artifact: string;
  confidence: number;
  emotionalTrajectory: number[];
  mcRuns: number;
  wDimensions: any;
} {
  const engine = getDiseminerEngine();
  const wEng = getWEngine();

  // Run the full DISEMINER pipeline
  const result = engine.processQuery(text);

  // Get W-dimensions for doubt bypass
  const wDims = wEng.getDimensions();
  const bypassFactor = wEng.getDoubtBypassFactor();
  const influencePotential = wEng.getInfluencePotential();

  // Map narrative result back to gate/perspective for compatibility
  const gate = result.gateActivations[0] || 6;
  const perspective = inferPerspectiveFromQuery(text);

  return {
    gate,
    perspective,
    narrative: result.narrative,
    artifact: extractArtifact(result.narrative),
    confidence: result.confidence * bypassFactor, // Scale by doubt bypass
    emotionalTrajectory: result.emotionalTrajectory,
    mcRuns: result.monteCarloRuns,
    wDimensions: { ...wDims, bypassFactor, influencePotential }
  };
}

/**
 * Replaces the old buildSentence() function.
 * Now returns the full DISEMINER-generated narrative.
 */
export function buildSentenceDISEMINER(gate: number, perspective: number, query: string): string {
  const engine = getDiseminerEngine();
  const result = engine.processQuery(query);
  return result.narrative;
}

/**
 * Replaces the old artifactForGate() function.
 * Now extracts artifact from DISEMINER narrative.
 */
export function artifactForGateDISEMINER(gate: number, query: string): string {
  const engine = getDiseminerEngine();
  const result = engine.processQuery(query);
  return extractArtifact(result.narrative);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function inferPerspectiveFromQuery(text: string): number {
  const t = text.toLowerCase();
  if (t.includes('who') || t.includes('am i')) return 0;
  if (t.includes('what') || t.includes('happening')) return 1;
  if (t.includes('when') || t.includes('time')) return 2;
  if (t.includes('why') || t.includes('because')) return 3;
  if (t.includes('how') || t.includes('do i')) return 4;
  return 1; // default to 'what'
}

function extractArtifact(narrative: string): string {
  // Extract the artifact line from DISEMINER output
  const artifactMatch = narrative.match(/<strong>Artifact:<\/strong>\s*(.+)/);
  return artifactMatch ? artifactMatch[1] : "Sit for 60 seconds and feel where this lives in your body.";
}

// ============================================================
// ENHANCED CHAT HANDLER (replace existing handleSend)
// ============================================================

export function handleSendDISEMINER(
  text: string,
  addChat: (html: string, type: string) => void,
  pingGate: (gate: number) => void
): void {
  const engine = getDiseminerEngine();
  const wEng = getWEngine();

  // D1: Show user message
  addChat(text, 'user');

  // D2-D5: Run DISEMINER pipeline
  const result = engine.processQuery(text);
  const wDims = wEng.getDimensions();

  // Activate gate in 3D visualization
  const gate = result.gateActivations[0] || 6;
  pingGate(gate);

  // Build response with DISEMINER metadata
  setTimeout(() => {
    // Main narrative
    addChat(result.narrative, 'system');

    // Monte Carlo confidence report
    const confidence = Math.round(result.confidence * 100);
    const mcReport = `\n<em>Monte Carlo: ${result.monteCarloRuns} runs | Confidence: ${confidence}% | W-Bypass: ${Math.round(wDims.bypassFactor * 100)}%</em>`;
    addChat(mcReport, 'system');

    // Emotional trajectory visualization
    const traj = result.emotionalTrajectory.map(v => {
      const bar = '█'.repeat(Math.max(0, Math.round((v + 10) / 2)));
      return `${v > 0 ? '+' : ''}${v.toFixed(1)} ${bar}`;
    }).join('\n');
    addChat(`<pre style="font-size:0.7rem;color:var(--text-dim)">${traj}</pre>`, 'system');

    // W-Dimensions report
    const wReport = `W-Dimensions: W1=${wDims.w1.toFixed(2)} W2=${wDims.w2.toFixed(2)} W3=${wDims.w3.toFixed(2)} W4=${wDims.w4.toFixed(2)} W5=${wDims.w5.toFixed(2)}`;
    addChat(`<span class="msg-meta">${wReport}</span>`, 'system');

    // RP encoding (maintain compatibility)
    const rp = encodeRP(gate, 4);
    addChat(`<span class="msg-meta">${rp}</span>`, 'system');

  }, 300);
}

// ============================================================
// RP ENCODING (maintain compatibility with existing system)
// ============================================================

function encodeRP(gate: number, line: number): string {
  const profile = JSON.parse(localStorage.getItem("youniverse_profile") || '{}');
  return `RP|BASE:B${profile.base || 3}|TONE:T${profile.tone || 4}|COLOR:C${profile.color || 2}|GLC:G${gate}.${line}.${profile.color || 2}|AX:AX92|ZOD:VIR|DEG:25|MIN:59|SEC:31.92|H:5|DISEMINER:v1.0`;
}

// ============================================================
// AURYN INTEGRATION — DISEMINER-powered companion
// ============================================================

export function getAurynResponseDISEMINER(text: string): string {
  const engine = getDiseminerEngine();
  const result = engine.processQuery(text);

  // Extract the narrative insight (not the artifact)
  const lines = result.narrative.split('\n');
  const insight = lines.find(l => l.includes('converged') || l.includes('ambiguity') || l.includes('divergence')) ||
    lines.find(l => l.length > 20 && !l.includes('Artifact')) ||
    lines[0];

  return insight || "I feel the threads of your consciousness weaving...";
}

// ============================================================
// 3D VISUALIZATION ENHANCEMENTS
// ============================================================

/**
 * Enhanced gate ping that also shows DISEMINER activation data
 */
export function pingGateEnhanced(
  gate: number,
  confidence: number,
  wBypass: number
): void {
  // Call existing pingGate function
  if (typeof (window as any).pingGate === 'function') {
    (window as any).pingGate(gate);
  }

  // Add DISEMINER-specific visual feedback
  console.log(`[DISEMINER] Gate ${gate} activated | Confidence: ${confidence} | W-Bypass: ${wBypass}`);
}

// ============================================================
// PROFILE UPDATE HOOK
// ============================================================

export function updateProfileDISEMINER(profile: any): void {
  // Reinitialize engines with new profile
  diseminerEngine = createDiseminerEngine({
    base: profile.base,
    tone: profile.tone,
    color: profile.color,
    name: profile.name,
    activeGates: profile.activeGates || [],
    definedChannels: profile.definedChannels || []
  });
  wEngine = createWEngine({
    base: profile.base,
    tone: profile.tone,
    color: profile.color,
    name: profile.name,
    activeGates: [],
    definedChannels: []
  });

  // Persist
  localStorage.setItem("youniverse_profile", JSON.stringify(profile));
}

// ============================================================
// EXPORT
// ============================================================

export {
  DiseminerEngine,
  WDimensionEngine,
  GATES_64,
  createDiseminerEngine,
  createWEngine
};
