
// ============================================================================
// meshServer.js (Updated with SynthiaSubstrate)
// ============================================================================
// The NERVOUS SYSTEM of the organism.
//
// Connects all organs through the Synthia coordinate substrate:
//   - SurfaceTransformEngine (Body/Root)
//   - StyleControlEngine (Heartfield)
//   - DeepStructureLearner (Mind/Ajna)
//   - InteractiveLearner (Throat/Communication)
//   - SacralAnalogyEngine (Sacral/Creation)
//
// All tools share ONE SynthiaSubstrate instance.
// States flow through coordinates, not messages.
// The mesh carries signals with intent, not just logs.
// ============================================================================

import { createServer } from "http";
import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import { EventMesh } from "./EventMesh.js";
import { SynthiaSubstrate } from "./SynthiaSubstrate.js";
import { SurfaceTransformEngine } from "./SurfaceTransformEngine.js";
import { StyleControlEngine } from "./StyleControlEngine.js";
import { DeepStructureLearner } from "./DeepStructureLearner.js";
import { InteractiveLearner } from "./InteractiveLearner.js";
import { SacralAnalogyEngine } from "./SacralAnalogyEngine.js";
import { Head } from "./head.js";
import { AutoLing } from "./autoling.js";
import { Diseminer } from "./diseminer.js";
import { AnalogyEngine } from "./analogyEngine.js";
import { IChingGrammar } from "./iChingGrammar.js";
import { HistoricalMonteCarlo } from "./historicalMonteCarlo.js";
import { LanguageContact } from "./languageContact.js";
import { Messy } from "./messy.js";
import { NovelWriter } from "./novelWriter.js";

// ============================================================================
// CREATE SYNTHIA SUBSTRATE (Shared by all organs)
// ============================================================================

const substrate = new SynthiaSubstrate();
console.log("[Synthia] Substrate initialized");
console.log(`[Synthia] Total nodes: ${substrate.getActivationArray().length}`);
console.log(`[Synthia] Nodes per side: ${substrate.getActivationArray().length / 2}`);

// ============================================================================
// CREATE EVENT MESH (Nervous system)
// ============================================================================

const mesh = new EventMesh();

mesh.onEmergence(({ channel, firstSource }) => {
  console.log(`[mesh] EMERGENT CHANNEL "${channel}" created by ${firstSource}`);
});

// ============================================================================
// INSTANTIATE ALL ORGANS (Tools)
// ============================================================================

// Core organs (Synthia-aware)
const surfaceTransform = new SurfaceTransformEngine(mesh);
const styleControl = new StyleControlEngine(mesh);
const deepLearner = new DeepStructureLearner(mesh);
const interactiveLearner = new InteractiveLearner(mesh);
const sacralEngine = new SacralAnalogyEngine(mesh);

// Legacy Klein tools (connected through mesh)
const autoLing = new AutoLing(mesh);
const diseminer = new Diseminer(mesh);
const analogyEngine = new AnalogyEngine(mesh);
const iching = new IChingGrammar(mesh);
const monteCarlo = new HistoricalMonteCarlo(mesh);
const langContact = new LanguageContact(mesh);
const messy = new Messy(mesh);
const novelWriter = new NovelWriter(mesh);

// Head dispatcher
const head = new Head(mesh);
head.register("SurfaceTransformEngine", surfaceTransform);
head.register("StyleControlEngine", styleControl);
head.register("DeepStructureLearner", deepLearner);
head.register("InteractiveLearner", interactiveLearner);
head.register("SacralAnalogyEngine", sacralEngine);
head.register("AutoLing", autoLing);
head.register("Diseminer", diseminer);
head.register("AnalogyEngine", analogyEngine);
head.register("IChingGrammar", iching);
head.register("HistoricalMonteCarlo", monteCarlo);
head.register("LanguageContact", langContact);
head.register("Messy", messy);
head.register("NovelWriter", novelWriter);

console.log("[mesh] All organs registered with Head dispatcher");

// ============================================================================
// SYNTHIA-SPECIFIC MESH ROUTING
// ============================================================================

// Route: system.state → activate in substrate
mesh.subscribe("system.state", (message) => {
  const state = message.payload;
  if (state && state.synthiaAddress) {
    substrate.activate(state.synthiaAddress, 0.5);

    // Check which centers are defined
    const centers = substrate.computeCenters(state.synthiaAddress);

    // Publish center activation
    mesh.publish("system.centers", "SynthiaSubstrate", {
      stateHash: state.hash,
      centers,
      gates: [state.synthiaAddress.gate + 1],
      channels: substrate.getChannels().filter(([g1, g2]) => 
        g1 === state.synthiaAddress.gate + 1 || g2 === state.synthiaAddress.gate + 1
      ).map(([g1, g2]) => `${g1}-${g2}`),
    });
  }
});

// Route: transform.surface → update substrate
mesh.subscribe("transform.surface", (message) => {
  if (message.payload?.state?.synthiaAddress) {
    substrate.activate(message.payload.state.synthiaAddress, message.payload.confidence || 0.5);
  }
});

// Route: style.control → update substrate
mesh.subscribe("style.control", (message) => {
  if (message.payload?.profile?.synthiaDimension !== undefined) {
    // Activate the profile's target dimension
    const profileAddr = {
      side: 0, planet: 0,
      dimension: message.payload.profile.synthiaDimension,
      base: message.payload.profile.synthiaBase || 0,
      gate: 0, line: 0, color: 0, tone: 0,
      degree: 0, minute: 0, second: 0, arc: 0,
      zodiac: 0, season: 0, houseZodiac: 0, houseSeason: 0,
    };
    substrate.activate(profileAddr, 0.7);
  }
});

// Route: create.analogy → update substrate
mesh.subscribe("create.analogy", (message) => {
  if (message.payload?.synthiaAddress) {
    substrate.activate(message.payload.synthiaAddress, message.payload.energy || 0.5);
  }
});

// Route: mind.learn → convergence check
mesh.subscribe("mind.learn", (message) => {
  if (message.payload?.type === "inference_complete") {
    console.log(`[MIND] Inference complete: ${message.payload.newRules} new rules, depth: ${message.payload.recursiveDepth}`);
  }
});

// ============================================================================
// HTTP SERVER + WEBSOCKET
// ============================================================================

const server = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(readFileSync("./index.html", "utf-8"));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[ws] Client connected");

  // Send initial substrate state
  ws.send(JSON.stringify({
    type: "substrate_init",
    totalNodes: substrate.getActivationArray().length,
    activeNodes: substrate.getActiveCount(),
    channels: substrate.getChannels().length,
  }));

  // Forward mesh events to client
  const forwarder = (message) => {
    ws.send(JSON.stringify({
      type: "mesh_event",
      channel: message.channel,
      source: message.source,
      payload: message.payload,
    }));
  };

  // Subscribe to all channels
  mesh.subscribe("system.state", forwarder);
  mesh.subscribe("system.centers", forwarder);
  mesh.subscribe("transform.surface", forwarder);
  mesh.subscribe("style.control", forwarder);
  mesh.subscribe("create.analogy", forwarder);
  mesh.subscribe("mind.learn", forwarder);
  mesh.subscribe("learn.interactive", forwarder);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "resolve") {
        // Human input: resolve through W-H
        const result = surfaceTransform.resolve({
          text: msg.text,
          domain: msg.domain || "language",
        });
        ws.send(JSON.stringify({
          type: "resolved",
          state: result.state,
          centers: surfaceTransform.getDefinedCenters(result.state),
          resonance: result.state.synthiaAddress ? 
            substrate.resonance(result.state.synthiaAddress, result.state.synthiaAddress) : 0,
        }));
      }

      else if (msg.type === "transform") {
        // Apply transformation
        const state = msg.state;
        const result = surfaceTransform.run({
          state,
          domain: msg.domain || state.domain,
          constraint: msg.constraint,
        });
        ws.send(JSON.stringify({
          type: "transformed",
          result,
        }));
      }

      else if (msg.type === "style") {
        // Apply style control
        const profile = styleControl.getProfile(msg.profileName);
        if (profile) {
          const result = styleControl.run({
            state: msg.state,
            profile,
            depth: msg.depth || 3,
            temperature: msg.temperature || 0.5,
          });
          ws.send(JSON.stringify({
            type: "styled",
            result,
          }));
        }
      }

      else if (msg.type === "create") {
        // Sacral creation
        const result = sacralEngine.run({
          state: msg.state,
          domain: msg.domain || "language",
          depth: msg.depth || 1,
        });
        ws.send(JSON.stringify({
          type: "created",
          result,
        }));
      }

      else if (msg.type === "teach") {
        // Interactive teaching
        const testCase = interactiveLearner.run({
          who: msg.who || "user",
          what: msg.what,
          where: msg.domain || "language",
          when: Date.now(),
          why: msg.why || "learning",
        });
        ws.send(JSON.stringify({
          type: "test_proposed",
          testCase,
        }));
      }

      else if (msg.type === "feedback") {
        // Teaching feedback
        interactiveLearner.receiveFeedback({
          testId: msg.testId,
          response: msg.response,
          correction: msg.correction,
          explanation: msg.explanation,
        });
        ws.send(JSON.stringify({ type: "feedback_received" }));
      }

      else if (msg.type === "infer") {
        // Deep structure inference
        const result = deepLearner.run({
          domain: msg.domain,
          force: msg.force || false,
        });
        ws.send(JSON.stringify({
          type: "inferred",
          result,
        }));
      }

      else if (msg.type === "substrate_state") {
        // Request full substrate state
        ws.send(JSON.stringify({
          type: "substrate_state",
          activeNodes: substrate.getActiveCount(),
          activationArray: Array.from(substrate.getActivationArray().slice(0, 100)), // First 100 for perf
        }));
      }

    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: err.message }));
    }
  });

  ws.on("close", () => {
    console.log("[ws] Client disconnected");
  });
});

// ============================================================================
// DEMO LOOP (Synthia-aware)
// ============================================================================

function runDemo() {
  console.log("\n=== SYNTHIA DEMO ===\n");

  // Demo 1: Resolve a state through W-H
  const text = "I am an observer seeking my purpose in this moment";
  const resolved = surfaceTransform.resolve({ text, domain: "language" });
  console.log(`Resolved: "${text}"`);
  console.log(`  Gate: ${resolved.state.coordinates.gate}, Line: ${resolved.state.coordinates.line}`);
  console.log(`  Synthia Address: ${JSON.stringify(resolved.state.synthiaAddress)}`);
  console.log(`  Defined Centers: ${surfaceTransform.getDefinedCenters(resolved.state).join(", ")}`);

  // Demo 2: Apply style control
  const profile = styleControl.getProfile("poetic_leader");
  if (profile) {
    const styled = styleControl.run({
      state: resolved.state,
      profile,
      depth: 2,
      temperature: 0.7,
    });
    console.log(`\nStyled with ${profile.name}:`);
    console.log(`  Resonance: ${styled.resonanceScore.toFixed(3)}`);
    console.log(`  Feasibility: ${styled.feasibility.toFixed(3)}`);
    console.log(`  Defined Centers: ${styled.definedCenters.join(", ")}`);
  }

  // Demo 3: Sacral creation
  const created = sacralEngine.run({
    state: resolved.state,
    domain: "language",
    depth: 1,
  });
  console.log(`\nSacral Creation:`);
  console.log(`  Activated: ${created.activated}`);
  console.log(`  Energy: ${created.energy.toFixed(3)}`);
  console.log(`  Defined Centers: ${created.definedCenters.join(", ")}`);
  if (created.creations[0]) {
    console.log(`  Surface: ${created.creations[0].surface}`);
  }

  // Demo 4: Substrate state
  console.log(`\nSubstrate State:`);
  console.log(`  Active Nodes: ${substrate.getActiveCount()}`);
  console.log(`  Total Nodes: ${substrate.getActivationArray().length}`);
}

// Run demo after short delay
setTimeout(runDemo, 1000);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 8787;
server.listen(PORT, () => {
  console.log(`\n[Synthia] Server running on http://localhost:${PORT}`);
  console.log(`[Synthia] WebSocket ready for connections`);
  console.log(`[Synthia] All organs connected through substrate`);
});
