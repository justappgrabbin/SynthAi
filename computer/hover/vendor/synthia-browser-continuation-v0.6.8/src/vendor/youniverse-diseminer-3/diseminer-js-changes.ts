// ============================================================
// DISEMINER INTEGRATION — Add these changes to your existing app
// ============================================================

// 1. ADD TO TAB STRIP (after "Ports"):
// <div class="tab" data-tab="diseminer">DISEMINER</div>

// 2. ADD TO CONTENT (after "tab-ports"):
/*
<div class="tab-content" id="tab-diseminer">
  <div class="diseminer-panel">
    <div class="diseminer-header">
      <div class="diseminer-title">DISEMINER Engine</div>
      <div class="diseminer-subtitle">Monte Carlo Narrative Simulation</div>
    </div>
    <div class="diseminer-query">
      <input class="diseminer-input" id="diseminer-input" placeholder="Enter a query for narrative simulation..." />
      <button class="diseminer-run" onclick="runDiseminer()">Run Simulation</button>
    </div>
    <div class="diseminer-results" id="diseminer-results"></div>
    <div class="diseminer-visualization" id="diseminer-viz">
      <canvas id="diseminer-canvas"></canvas>
    </div>
    <div class="diseminer-stats" id="diseminer-stats"></div>
  </div>
</div>
*/

// 3. ADD STYLES:
const diseminerStyles = `
.diseminer-panel { display: flex; flex-direction: column; height: 100%; padding: 0.8rem; gap: 0.8rem; overflow-y: auto; }
.diseminer-header { text-align: center; padding: 1rem 0; border-bottom: 1px solid var(--border); }
.diseminer-title { font-size: 1.2rem; color: var(--accent); font-weight: 600; }
.diseminer-subtitle { font-size: 0.75rem; color: var(--text-dim); margin-top: 0.3rem; }
.diseminer-query { display: flex; gap: 0.5rem; }
.diseminer-input { flex: 1; background: var(--bg-input); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 1rem; color: var(--text); font-size: 0.9rem; outline: none; }
.diseminer-run { padding: 0.7rem 1.2rem; background: var(--accent); color: #000; border: none; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.diseminer-results { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; min-height: 100px; }
.diseminer-result-item { padding: 0.6rem; border-bottom: 1px solid var(--border); font-size: 0.8rem; line-height: 1.5; }
.diseminer-result-item:last-child { border-bottom: none; }
.diseminer-result-narrative { color: var(--text); margin-bottom: 0.4rem; }
.diseminer-result-meta { color: var(--text-dim); font-size: 0.7rem; }
.diseminer-result-confidence { color: var(--accent); font-weight: 600; }
.diseminer-visualization { flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; min-height: 200px; position: relative; }
.diseminer-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.diseminer-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem; text-align: center; }
.diseminer-stat-label { font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; }
.diseminer-stat-value { font-size: 1rem; color: var(--accent); font-weight: 600; margin-top: 0.2rem; }
.diseminer-trajectory { display: flex; align-items: center; gap: 2px; margin-top: 0.5rem; }
.diseminer-traj-point { width: 8px; height: 8px; border-radius: 50%; }
`;

// 4. REPLACE handleSend FUNCTION:
function handleSend() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  addChat(text, "user");

  // Use DISEMINER instead of old resonance engine
  const result = window.diseminerEngine.processQuery(text);
  const wDims = window.wEngine.getDimensions();

  const gate = result.gateActivations[0] || 6;
  pingGate(gate);

  setTimeout(() => {
    // Main DISEMINER narrative
    addChat(result.narrative, "system");

    // Monte Carlo report
    const confidence = Math.round(result.confidence * 100);
    const mcReport = `Monte Carlo: ${result.monteCarloRuns} runs | Confidence: ${confidence}% | W-Bypass: ${Math.round(wDims.bypassFactor * 100)}%`;
    addChat(`<em>${mcReport}</em>`, "system");

    // Emotional trajectory
    const trajHTML = result.emotionalTrajectory.map((v, i) => {
      const color = v > 5 ? '#4ecdc4' : v > 0 ? '#9fd5ff' : v > -5 ? '#ffd54f' : '#ff6b6b';
      return `<span style="display:inline-block;width:12px;height:${Math.abs(v)*3+4}px;background:${color};border-radius:2px;margin:0 1px;" title="${v.toFixed(1)}"></span>`;
    }).join('');
    addChat(`<div style="display:flex;align-items:flex-end;gap:2px;padding:0.5rem 0;">${trajHTML}</div>`, "system");

    // W-Dimensions
    const wReport = `W1=${wDims.w1.toFixed(2)} W2=${wDims.w2.toFixed(2)} W3=${wDims.w3.toFixed(2)} W4=${wDims.w4.toFixed(2)} W5=${wDims.w5.toFixed(2)}`;
    addChat(`<span class="msg-meta">${wReport}</span>`, "system");

    // RP encoding
    const rp = encodeRP(gate, 4);
    addChat(`<span class="msg-meta">${rp}</span>`, "system");

  }, 300);
}

// 5. ADD DISEMINER TAB FUNCTIONALITY:
window.runDiseminer = function() {
  const input = document.getElementById("diseminer-input");
  const text = input.value.trim();
  if (!text) return;

  const resultsDiv = document.getElementById("diseminer-results");
  const statsDiv = document.getElementById("diseminer-stats");

  // Show loading
  resultsDiv.innerHTML = '<div class="diseminer-result-item"><em>Running Monte Carlo simulation...</em></div>';

  setTimeout(() => {
    const result = window.diseminerEngine.processQuery(text);
    const wDims = window.wEngine.getDimensions();

    // Build results HTML
    let html = '';

    // Narrative
    html += `<div class="diseminer-result-item">
      <div class="diseminer-result-narrative">${result.narrative.replace(/\n/g, '<br>')}</div>
    </div>`;

    // Confidence and stats
    html += `<div class="diseminer-result-item">
      <div class="diseminer-result-meta">
        <span class="diseminer-result-confidence">Confidence: ${Math.round(result.confidence * 100)}%</span> |
        Runs: ${result.monteCarloRuns} |
        Gates: ${result.gateActivations.join(', ')}
      </div>
    </div>`;

    resultsDiv.innerHTML = html;

    // Stats grid
    statsDiv.innerHTML = `
      <div class="diseminer-stat">
        <div class="diseminer-stat-label">W-Bypass</div>
        <div class="diseminer-stat-value">${Math.round(wDims.bypassFactor * 100)}%</div>
      </div>
      <div class="diseminer-stat">
        <div class="diseminer-stat-label">Influence</div>
        <div class="diseminer-stat-value">${Math.round(wDims.influencePotential * 100)}%</div>
      </div>
      <div class="diseminer-stat">
        <div class="diseminer-stat-label">Gates</div>
        <div class="diseminer-stat-value">${result.gateActivations.length}</div>
      </div>
    `;

    // Draw trajectory visualization
    drawDiseminerTrajectory(result.emotionalTrajectory);

  }, 500);
};

function drawDiseminerTrajectory(trajectory: number[]) {
  const canvas = document.getElementById("diseminer-canvas") as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext("2d")!;
  const w = canvas.width = canvas.parentElement!.clientWidth;
  const h = canvas.height = 200;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  // Draw grid
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw trajectory line
  if (trajectory.length > 1) {
    const stepX = w / (trajectory.length - 1);
    const midY = h / 2;

    ctx.beginPath();
    ctx.strokeStyle = '#9fd5ff';
    ctx.lineWidth = 2;

    trajectory.forEach((val, i) => {
      const x = i * stepX;
      const y = midY - (val * (h / 4));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw points
    trajectory.forEach((val, i) => {
      const x = i * stepX;
      const y = midY - (val * (h / 4));
      const color = val > 5 ? '#4ecdc4' : val > 0 ? '#9fd5ff' : val > -5 ? '#ffd54f' : '#ff6b6b';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// 6. INITIALIZE DISEMINER ON LOAD:
// In the window.addEventListener("load") handler, add:
// window.diseminerEngine = createDiseminerEngine(PERSONAL_PROFILE);
// window.wEngine = createWEngine(PERSONAL_PROFILE);

// 7. UPDATE AURYN to use DISEMINER:
function getAurynResponse(text) {
  const result = window.diseminerEngine.processQuery(text);
  const lines = result.narrative.split('\n');
  const insight = lines.find(l => l.includes('converged') || l.includes('ambiguity') || l.includes('divergence')) ||
    lines.find(l => l.length > 20 && !l.includes('Artifact')) ||
    lines[0];
  return insight || "I feel the threads of your consciousness weaving...";
}
