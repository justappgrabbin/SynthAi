import {
  DiseminerEngine,
  WDimensionEngine,
  createDiseminerEngine,
  createWEngine,
  GATES_64
} from "./diseminer-engine.js";
let diseminerEngine = null;
let wEngine = null;
function getDiseminerEngine() {
  if (!diseminerEngine) {
    const profile = JSON.parse(localStorage.getItem("youniverse_profile") || "{}");
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
function getWEngine() {
  if (!wEngine) {
    const profile = JSON.parse(localStorage.getItem("youniverse_profile") || "{}");
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
function inferResonanceDISEMINER(text) {
  const engine = getDiseminerEngine();
  const wEng = getWEngine();
  const result = engine.processQuery(text);
  const wDims = wEng.getDimensions();
  const bypassFactor = wEng.getDoubtBypassFactor();
  const influencePotential = wEng.getInfluencePotential();
  const gate = result.gateActivations[0] || 6;
  const perspective = inferPerspectiveFromQuery(text);
  return {
    gate,
    perspective,
    narrative: result.narrative,
    artifact: extractArtifact(result.narrative),
    confidence: result.confidence * bypassFactor,
    // Scale by doubt bypass
    emotionalTrajectory: result.emotionalTrajectory,
    mcRuns: result.monteCarloRuns,
    wDimensions: { ...wDims, bypassFactor, influencePotential }
  };
}
function buildSentenceDISEMINER(gate, perspective, query) {
  const engine = getDiseminerEngine();
  const result = engine.processQuery(query);
  return result.narrative;
}
function artifactForGateDISEMINER(gate, query) {
  const engine = getDiseminerEngine();
  const result = engine.processQuery(query);
  return extractArtifact(result.narrative);
}
function inferPerspectiveFromQuery(text) {
  const t = text.toLowerCase();
  if (t.includes("who") || t.includes("am i")) return 0;
  if (t.includes("what") || t.includes("happening")) return 1;
  if (t.includes("when") || t.includes("time")) return 2;
  if (t.includes("why") || t.includes("because")) return 3;
  if (t.includes("how") || t.includes("do i")) return 4;
  return 1;
}
function extractArtifact(narrative) {
  const artifactMatch = narrative.match(/<strong>Artifact:<\/strong>\s*(.+)/);
  return artifactMatch ? artifactMatch[1] : "Sit for 60 seconds and feel where this lives in your body.";
}
function handleSendDISEMINER(text, addChat, pingGate) {
  const engine = getDiseminerEngine();
  const wEng = getWEngine();
  addChat(text, "user");
  const result = engine.processQuery(text);
  const wDims = wEng.getDimensions();
  const gate = result.gateActivations[0] || 6;
  pingGate(gate);
  setTimeout(() => {
    addChat(result.narrative, "system");
    const confidence = Math.round(result.confidence * 100);
    const mcReport = `
<em>Monte Carlo: ${result.monteCarloRuns} runs | Confidence: ${confidence}% | W-Bypass: ${Math.round(wDims.bypassFactor * 100)}%</em>`;
    addChat(mcReport, "system");
    const traj = result.emotionalTrajectory.map((v) => {
      const bar = "\u2588".repeat(Math.max(0, Math.round((v + 10) / 2)));
      return `${v > 0 ? "+" : ""}${v.toFixed(1)} ${bar}`;
    }).join("\n");
    addChat(`<pre style="font-size:0.7rem;color:var(--text-dim)">${traj}</pre>`, "system");
    const wReport = `W-Dimensions: W1=${wDims.w1.toFixed(2)} W2=${wDims.w2.toFixed(2)} W3=${wDims.w3.toFixed(2)} W4=${wDims.w4.toFixed(2)} W5=${wDims.w5.toFixed(2)}`;
    addChat(`<span class="msg-meta">${wReport}</span>`, "system");
    const rp = encodeRP(gate, 4);
    addChat(`<span class="msg-meta">${rp}</span>`, "system");
  }, 300);
}
function encodeRP(gate, line) {
  const profile = JSON.parse(localStorage.getItem("youniverse_profile") || "{}");
  return `RP|BASE:B${profile.base || 3}|TONE:T${profile.tone || 4}|COLOR:C${profile.color || 2}|GLC:G${gate}.${line}.${profile.color || 2}|AX:AX92|ZOD:VIR|DEG:25|MIN:59|SEC:31.92|H:5|DISEMINER:v1.0`;
}
function getAurynResponseDISEMINER(text) {
  const engine = getDiseminerEngine();
  const result = engine.processQuery(text);
  const lines = result.narrative.split("\n");
  const insight = lines.find((l) => l.includes("converged") || l.includes("ambiguity") || l.includes("divergence")) || lines.find((l) => l.length > 20 && !l.includes("Artifact")) || lines[0];
  return insight || "I feel the threads of your consciousness weaving...";
}
function pingGateEnhanced(gate, confidence, wBypass) {
  if (typeof window.pingGate === "function") {
    window.pingGate(gate);
  }
  console.log(`[DISEMINER] Gate ${gate} activated | Confidence: ${confidence} | W-Bypass: ${wBypass}`);
}
function updateProfileDISEMINER(profile) {
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
  localStorage.setItem("youniverse_profile", JSON.stringify(profile));
}
export {
  DiseminerEngine,
  GATES_64,
  WDimensionEngine,
  artifactForGateDISEMINER,
  buildSentenceDISEMINER,
  createDiseminerEngine,
  createWEngine,
  getAurynResponseDISEMINER,
  handleSendDISEMINER,
  inferResonanceDISEMINER,
  pingGateEnhanced,
  updateProfileDISEMINER
};
