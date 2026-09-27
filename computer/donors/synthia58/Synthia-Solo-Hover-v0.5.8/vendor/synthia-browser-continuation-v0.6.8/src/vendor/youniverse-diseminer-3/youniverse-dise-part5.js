
// ============================================================
// ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  orbitalRings.forEach(ring => {
    ring.rotation.x += ring.userData.spinX;
    ring.rotation.y += ring.userData.spinY;
    ring.rotation.z += ring.userData.spinZ;
  });
  electrons.forEach(e => {
    e.userData.angle += e.userData.speed;
    e.position.x = e.userData.orbitRadius * Math.cos(e.userData.angle);
    e.position.z = e.userData.orbitRadius * Math.sin(e.userData.angle);
    e.position.y = e.userData.baseY + Math.sin(e.userData.angle * 3) * 0.2;
  });
  if (bodyPlane) bodyPlane.lookAt(camera.position);
  const positions = particleSystem.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    positions[i*3] += pVelocities[i].x;
    positions[i*3+1] += pVelocities[i].y;
    positions[i*3+2] += pVelocities[i].z;
    const dist = Math.sqrt(positions[i*3]**2 + positions[i*3+1]**2 + positions[i*3+2]**2);
    if (dist > 7) { positions[i*3] *= 0.5; positions[i*3+1] *= 0.5; positions[i*3+2] *= 0.5; }
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;
  const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.1;
  nucleus.scale.setScalar(pulse);
  nucleus.children[0].scale.setScalar(pulse * 1.3);
  controls.update();
  renderer.render(scene, camera);
}

// ============================================================
// INIT
// ============================================================
window.addEventListener("load", () => {
  loadBodyImage("action");
  animate();
});

window.addEventListener("resize", () => {
  if (document.getElementById("tab-3d").classList.contains("active")) {
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
});

// ============================================================
// CHAT — DISEMINER-powered
// ============================================================
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

function addChat(html, type) {
  const div = document.createElement("div");
  div.className = `msg msg-${type}`;
  div.innerHTML = html;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleSend() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  addChat(text, "user");

  // DISEMINER pipeline
  const result = diseminerEngine.processQuery(text);
  const wDims = wEngine;

  const gate = result.gateActivations[0] || 6;
  pingGate(gate);

  setTimeout(() => {
    // Main narrative
    addChat(result.narrative.replace(/\n/g, '<br>'), "system");

    // Monte Carlo report
    const confidence = Math.round(result.confidence * 100);
    const bypass = Math.round(wDims.getBypassFactor() * 100);
    const mcReport = `Monte Carlo: ${result.monteCarloRuns} runs | Confidence: ${confidence}% | W-Bypass: ${bypass}%`;
    addChat(`<em>${mcReport}</em>`, "dise");

    // Emotional trajectory bars
    const trajHTML = result.emotionalTrajectory.map(v => {
      const color = v > 5 ? '#4ecdc4' : v > 0 ? '#9fd5ff' : v > -5 ? '#ffd54f' : '#ff6b6b';
      const h = Math.max(4, Math.abs(v) * 4 + 4);
      return `<span style="display:inline-block;width:10px;height:${h}px;background:${color};border-radius:2px 2px 0 0;margin:0 2px;vertical-align:bottom;" title="${v.toFixed(1)}"></span>`;
    }).join('');
    addChat(`<div style="display:flex;align-items:flex-end;gap:2px;padding:0.3rem 0;height:50px;">${trajHTML}</div>`, "dise");

    // W-Dimensions
    const d = wDims.dims;
    const wReport = `W1=${d.w1.toFixed(2)} W2=${d.w2.toFixed(2)} W3=${d.w3.toFixed(2)} W4=${d.w4.toFixed(2)} W5=${d.w5.toFixed(2)}`;
    addChat(`<span class="msg-meta">${wReport}</span>`, "dise");

    // RP encoding
    const rp = `RP|BASE:B${PERSONAL_PROFILE.base}|TONE:T${PERSONAL_PROFILE.tone}|COLOR:C${PERSONAL_PROFILE.color}|GLC:G${gate}.4.${PERSONAL_PROFILE.color}|AX:AX92|ZOD:VIR|DEG:25|MIN:59|SEC:31.92|H:5|DISEMINER:v1.0`;
    addChat(`<span class="msg-meta">${rp}</span>`, "dise");

  }, 300);
}

chatSend.addEventListener("click", handleSend);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSend(); });

addChat(`Welcome, ${PERSONAL_PROFILE.name}. Your DISEMINER Living Mirror is active. What is happening right now?`, "system");

// ============================================================
// DISEMINER TAB
// ============================================================
window.runDiseminer = function() {
  const input = document.getElementById("diseminer-input");
  const text = input.value.trim();
  if (!text) return;

  const resultsDiv = document.getElementById("diseminer-results");
  const statsDiv = document.getElementById("diseminer-stats");
  const canvas = document.getElementById("diseminer-canvas");

  resultsDiv.innerHTML = '<div style="color:var(--text-dim);font-size:0.75rem;text-align:center;padding:1rem;"><em>Running Monte Carlo simulation...</em></div>';
  statsDiv.innerHTML = '';

  setTimeout(() => {
    const result = diseminerEngine.processQuery(text);
    const wDims = wEngine;

    // Narrative
    const narrativeHTML = result.narrative.split('\n').map(line => {
      if (line.startsWith('Artifact:')) {
        return `<div class="artifact"><strong>Artifact:</strong> ${line.replace('Artifact: ', '')}</div>`;
      }
      return `<div style="margin-bottom:0.4rem;">${line}</div>`;
    }).join('');

    resultsDiv.innerHTML = `
      <div class="narrative">${narrativeHTML}</div>
      <div class="meta" style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid var(--border);">
        <strong style="color:var(--accent);">Confidence: ${Math.round(result.confidence * 100)}%</strong> |
        Runs: ${result.monteCarloRuns} |
        Gate: ${result.gateActivations[0]} (${result.gateInfo.p}) |
        Impulse: ${result.impulse.type}
      </div>
    `;

    // Stats
    statsDiv.innerHTML = `
      <div class="diseminer-stat">
        <div class="diseminer-stat-label">W-Bypass</div>
        <div class="diseminer-stat-value">${Math.round(wDims.getBypassFactor() * 100)}%</div>
      </div>
      <div class="diseminer-stat">
        <div class="diseminer-stat-label">Influence</div>
        <div class="diseminer-stat-value">${Math.round(wDims.getInfluencePotential() * 100)}%</div>
      </div>
      <div class="diseminer-stat">
        <div class="diseminer-stat-label">Gates</div>
        <div class="diseminer-stat-value">${result.gateActivations.length}</div>
      </div>
    `;

    // Draw trajectory
    drawDiseminerTrajectory(result.emotionalTrajectory);

  }, 400);
};

function drawDiseminerTrajectory(trajectory) {
  const canvas = document.getElementById("diseminer-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = 160;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = (h / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Zero line
  ctx.strokeStyle = '#2a2a2a';
  ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

  if (trajectory.length > 1) {
    const stepX = w / (trajectory.length - 1);
    const midY = h / 2;

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#9fd5ff';
    ctx.lineWidth = 2;
    trajectory.forEach((val, i) => {
      const x = i * stepX;
      const y = midY - (val * (h / 5));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    trajectory.forEach((val, i) => {
      const x = i * stepX;
      const y = midY - (val * (h / 5));
      const color = val > 5 ? '#4ecdc4' : val > 0 ? '#9fd5ff' : val > -5 ? '#ffd54f' : '#ff6b6b';
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      // Glow
      ctx.fillStyle = color + '33';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    });
  }
}

// ============================================================
// WRITE
// ============================================================
const writeEditor = document.getElementById("write-editor");
window.saveWriting = () => {
  localStorage.setItem("youniverse-writing", writeEditor.value);
  window.showModal("Saved", "Your writing has been saved.");
};
window.clearWriting = () => { if (confirm("Clear all writing?")) writeEditor.value = ""; };
window.downloadWriting = () => {
  const blob = new Blob([writeEditor.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "notebook-writing.txt"; a.click();
  URL.revokeObjectURL(url);
};
const savedWriting = localStorage.getItem("youniverse-writing");
if (savedWriting) writeEditor.value = savedWriting;

// ============================================================
// SKETCH
// ============================================================
const sketchCanvas = document.getElementById("sketch-canvas");
const sketchCtx = sketchCanvas.getContext("2d");
let sketchDrawing = false, lastPos = null;

function resizeSketch() {
  const container = sketchCanvas.parentElement;
  const rect = container.getBoundingClientRect();
  sketchCanvas.width = rect.width - 2;
  sketchCanvas.height = rect.height - 60;
}
function getTouchPos(e) {
  const rect = sketchCanvas.getBoundingClientRect();
  const touch = e.touches[0];
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}
function startDraw(pos) { sketchDrawing = true; lastPos = pos; }
function moveDraw(pos) {
  if (!sketchDrawing || !lastPos) return;
  sketchCtx.beginPath();
  sketchCtx.moveTo(lastPos.x, lastPos.y);
  sketchCtx.lineTo(pos.x, pos.y);
  sketchCtx.strokeStyle = document.getElementById("sketch-color").value;
  sketchCtx.lineWidth = document.getElementById("sketch-width").value;
  sketchCtx.lineCap = "round"; sketchCtx.lineJoin = "round";
  sketchCtx.stroke();
  lastPos = pos;
}
function endDraw() { sketchDrawing = false; lastPos = null; }

sketchCanvas.addEventListener("mousedown", (e) => startDraw({ x: e.offsetX, y: e.offsetY }));
sketchCanvas.addEventListener("mousemove", (e) => moveDraw({ x: e.offsetX, y: e.offsetY }));
sketchCanvas.addEventListener("mouseup", endDraw);
sketchCanvas.addEventListener("mouseleave", endDraw);
sketchCanvas.addEventListener("touchstart", (e) => { e.preventDefault(); startDraw(getTouchPos(e)); }, { passive: false });
sketchCanvas.addEventListener("touchmove", (e) => { e.preventDefault(); moveDraw(getTouchPos(e)); }, { passive: false });
sketchCanvas.addEventListener("touchend", (e) => { e.preventDefault(); endDraw(); });

window.clearSketch = () => sketchCtx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
window.downloadSketch = () => {
  const link = document.createElement("a");
  link.download = "notebook-sketch.png"; link.href = sketchCanvas.toDataURL(); link.click();
};

// ============================================================
// 64 PORTS
// ============================================================
const PORTS = [
  { id: 1, name: "Origin", archetype: "Identity & Vision", question: "Who am I when I create?" },
  { id: 2, name: "Direction", archetype: "Path & Strategy", question: "Where is this really going?" },
  { id: 3, name: "Mutation", archetype: "Innovation & Disruption", question: "What needs to break so something new can exist?" },
  { id: 4, name: "Logic", archetype: "Answers & Reasoning", question: "What is the actual question here?" },
  { id: 5, name: "Rhythm", archetype: "Consistency & Cadence", question: "What is the right rhythm for this?" },
  { id: 6, name: "Friction", archetype: "Boundaries & Conflict", question: "Where does the friction want to lead?" },
  { id: 7, name: "Leadership", archetype: "Direction & Authority", question: "What is the next right direction?" },
  { id: 8, name: "Expression", archetype: "Contribution & Influence", question: "What wants to be expressed through me?" },
  { id: 9, name: "Focus", archetype: "Precision & Concentration", question: "What deserves my full attention right now?" },
  { id: 10, name: "Behavior", archetype: "Identity & Authenticity", question: "Who am I being right now?" },
  { id: 11, name: "Ideas", archetype: "Inspiration & Narrative", question: "What stories want to be told?" },
  { id: 12, name: "Caution", archetype: "Pause & Reflection", question: "What needs to wait?" },
  { id: 13, name: "Listening", archetype: "Collection & Understanding", question: "What is being said that I am not hearing?" },
  { id: 14, name: "Power", archetype: "Resources & Fuel", question: "What power source is this running on?" },
  { id: 15, name: "Extremes", archetype: "Balance & Harmony", question: "Where am I out of balance?" },
  { id: 16, name: "Enthusiasm", archetype: "Skill & Mastery", question: "What skill wants to be built?" },
  { id: 17, name: "Opinions", archetype: "Pattern & Logic", question: "What pattern am I seeing that others are not?" },
  { id: 18, name: "Correction", archetype: "Discernment & Improvement", question: "What needs to be corrected?" },
  { id: 19, name: "Need", archetype: "Sensitivity & Support", question: "What need is not being met?" },
  { id: 20, name: "Now", archetype: "Presence & Expression", question: "What is happening right now?" },
  { id: 21, name: "Control", archetype: "Management & Allocation", question: "What am I trying to control that I should not?" },
  { id: 22, name: "Emotion", archetype: "Grace & Openness", question: "What emotion wants to be felt?" },
  { id: 23, name: "Explanation", archetype: "Simplification & Clarity", question: "How can this be said more simply?" },
  { id: 24, name: "Mental Return", archetype: "Processing & Realization", question: "What realization is trying to arrive?" },
  { id: 25, name: "Innocence", archetype: "Universalizing & Acceptance", question: "What innocence wants to be protected?" },
  { id: 26, name: "Ego", archetype: "Influence & Persuasion", question: "What influence am I actually having?" },
  { id: 27, name: "Care", archetype: "Nurturing & Sustainability", question: "What needs to be cared for?" },
  { id: 28, name: "Struggle", archetype: "Risk & Purpose", question: "What struggle is worth it?" },
  { id: 29, name: "Commitment", archetype: "Endurance & Devotion", question: "What am I truly willing to stay with?" },
  { id: 30, name: "Desire", archetype: "Feeling & Experience", question: "What do I actually desire?" },
  { id: 31, name: "Influence", archetype: "Leadership & Direction", question: "What direction am I actually leading?" },
  { id: 32, name: "Continuity", archetype: "Evaluation & Preservation", question: "What deserves to continue?" },
  { id: 33, name: "Privacy", archetype: "Retreat & Reflection", question: "What needs privacy to grow?" },
  { id: 34, name: "Power", archetype: "Action & Impact", question: "What action will have the most impact?" },
  { id: 35, name: "Change", archetype: "Experience & Progress", question: "What change is actually ready?" },
  { id: 36, name: "Crisis", archetype: "Emotion & Resolution", question: "What crisis is actually an opportunity?" },
  { id: 37, name: "Family", archetype: "Bonding & Peace", question: "What does family actually mean to me?" },
  { id: 38, name: "Fight", archetype: "Challenge & Purpose", question: "What fight is worth fighting?" },
  { id: 39, name: "Provocation", archetype: "Stimulation & Release", question: "What am I provoking in others?" },
  { id: 40, name: "Willpower", archetype: "Deliverance & Rest", question: "Where is my willpower actually needed?" },
  { id: 41, name: "Imagination", archetype: "Initiation & Fantasy", question: "What is the smallest seed of this dream?" },
  { id: 42, name: "Growth", archetype: "Expansion & Completion", question: "What wants to grow?" },
  { id: 43, name: "Insight", archetype: "Breakthrough & Clarity", question: "What insight is trying to break through?" },
  { id: 44, name: "Alertness", archetype: "Recognition & Memory", question: "What pattern am I not recognizing?" },
  { id: 45, name: "Command", archetype: "Distribution & Organization", question: "What needs to be organized?" },
  { id: 46, name: "Embodiment", archetype: "Alignment & Serendipity", question: "What wants to be embodied?" },
  { id: 47, name: "Realization", archetype: "Insight & Pressure", question: "What realization is pressing?" },
  { id: 48, name: "Depth", archetype: "Resourcefulness & Solution", question: "What depth wants to be explored?" },
  { id: 49, name: "Principles", archetype: "Reaction & Reformation", question: "What principle needs reforming?" },
  { id: 50, name: "Values", archetype: "Responsibility & Protection", question: "What value needs protecting?" },
  { id: 51, name: "Shock", archetype: "Initiation & Awakening", question: "What shock is actually an initiation?" },
  { id: 52, name: "Stillness", archetype: "Focus & Concentration", question: "What wants stillness to grow?" },
  { id: 53, name: "Beginning", archetype: "Development & Momentum", question: "What wants to begin?" },
  { id: 54, name: "Ambition", archetype: "Drive & Ascent", question: "What ambition is actually mine?" },
  { id: 55, name: "Emotion", archetype: "Mood & Spirit", question: "What mood wants to be honored?" },
  { id: 56, name: "Stimulation", archetype: "Storytelling & Meaning", question: "What story wants to be told?" },
  { id: 57, name: "Instinct", archetype: "Clarity & Intuition", question: "What instinct wants to be trusted?" },
  { id: 58, name: "Vitality", archetype: "Joy & Improvement", question: "What brings me joy?" },
  { id: 59, name: "Intimacy", archetype: "Fusion & Connection", question: "What intimacy wants to be created?" },
  { id: 60, name: "Limitation", archetype: "Restriction & Innovation", question: "What limitation is actually a door?" },
  { id: 61, name: "Mystery", archetype: "Inner Truth & Knowing", question: "What mystery wants to be known?" },
  { id: 62, name: "Details", archetype: "Naming & Precision", question: "What detail matters most?" },
  { id: 63, name: "Doubt", archetype: "Questioning & Clarity", question: "What doubt wants to be answered?" },
  { id: 64, name: "Confusion", archetype: "Processing & Realization", question: "What confusion is actually clarity in disguise?" }
];

const portsGrid = document.getElementById("ports-grid");
PORTS.forEach(port => {
  const card = document.createElement("div");
  card.className = "port-card";
  card.innerHTML = `<div class="port-num">Port ${String(port.id).padStart(2, '0')}</div><div class="port-name">${port.name}</div><div class="port-desc">${port.archetype}</div>`;
  card.addEventListener("click", () => {
    window.showModal(`${port.name} — Port ${port.id}`, `<p><strong>${port.question}</strong></p>`);
  });
  portsGrid.appendChild(card);
});

// Init sketch
window.addEventListener("load", () => {
  resizeSketch();
});
window.addEventListener("resize", () => {
  if (document.getElementById("tab-sketch").classList.contains("active")) resizeSketch();
});

let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);

</script>
</body>
</html>
