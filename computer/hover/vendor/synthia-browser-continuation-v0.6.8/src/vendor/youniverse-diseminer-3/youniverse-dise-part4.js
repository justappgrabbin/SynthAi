
// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabId));
  const chatInputWrap = document.getElementById("chat-input-wrap");
  chatInputWrap.style.display = tabId === "chat" ? "flex" : "none";
  if (tabId === "sketch") resizeSketch();
  if (tabId === "3d" && renderer) {
    const canvas = document.getElementById("three-canvas");
    const parent = canvas.parentElement;
    renderer.setSize(parent.clientWidth, parent.clientHeight);
    camera.aspect = parent.clientWidth / parent.clientHeight;
    camera.updateProjectionMatrix();
  }
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => switchTab(t.dataset.tab));
});

// ============================================================
// 3D SCENE SETUP
// ============================================================
const canvas = document.getElementById("three-canvas");
const parent = canvas.parentElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(50, parent.clientWidth / parent.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(parent.clientWidth, parent.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 8;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const pl1 = new THREE.PointLight(0xffd700, 1.5, 20);
pl1.position.set(3, 3, 3); scene.add(pl1);
const pl2 = new THREE.PointLight(0x00d4ff, 1, 20);
pl2.position.set(-3, -2, 2); scene.add(pl2);
const pl3 = new THREE.PointLight(0xff1493, 0.5, 20);
pl3.position.set(0, 3, -3); scene.add(pl3);

// ============================================================
// ANATOMICAL BODY IMAGES (procedural since no PNGs available)
// ============================================================
const bodyDescriptions = {
  action: { name: "Action Body", desc: "Circulatory system — blood, flow, physical doing" },
  mind: { name: "Mind Body", desc: "Skeletal system — structure, framework, architecture of thought" },
  emotion: { name: "Emotion Body", desc: "Nervous system — electrical signals, feeling, the body as sensor" }
};

let currentBodyImage = "action";
let bodyPlane = null;

function loadBodyImage(body) {
  currentBodyImage = body;

  // Create procedural body visualization
  if (bodyPlane) scene.remove(bodyPlane);

  const group = new THREE.Group();

  // Body outline (simplified human silhouette)
  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.2, 2.5, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: body === 'action' ? 0xff6b6b : body === 'mind' ? 0x4ecdc4 : 0x45b7d1,
    transparent: true, opacity: 0.3, emissive: body === 'action' ? 0xff6b6b : body === 'mind' ? 0x4ecdc4 : 0x45b7d1,
    emissiveIntensity: 0.3, wireframe: true
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0;
  group.add(bodyMesh);

  // Head
  const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, transparent: true, opacity: 0.4, wireframe: true
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.5;
  group.add(head);

  // Center glow
  const glowGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: body === 'action' ? 0xff6b6b : body === 'mind' ? 0x4ecdc4 : 0x45b7d1,
    transparent: true, opacity: 0.1
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  bodyPlane = group;
  scene.add(bodyPlane);

  const info = bodyDescriptions[body];
  document.getElementById("three-field-name").textContent = info.name;
  document.getElementById("three-field-desc").textContent = info.desc;

  document.querySelectorAll('.body-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.classList.contains(body));
  });
}

window.switchBodyImage = (body) => loadBodyImage(body);

// ============================================================
// 3D ORBITAL ATOM
// ============================================================
const orbitalGroup = new THREE.Group();
scene.add(orbitalGroup);
const orbitalRings = [];

function createOrbitalRing(radius, tube, color, rotX, rotY, rotZ, speed) {
  const geometry = new THREE.TorusGeometry(radius, tube, 16, 100);
  const material = new THREE.MeshStandardMaterial({
    color: color, transparent: true, opacity: 0.35,
    emissive: color, emissiveIntensity: 0.4, side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = rotX; ring.rotation.y = rotY; ring.rotation.z = rotZ;
  ring.userData = { spinX: speed * 0.3, spinY: speed * 0.5, spinZ: speed };
  orbitalGroup.add(ring);
  orbitalRings.push(ring);
  return ring;
}

const shell1 = createOrbitalRing(1.4, 0.025, 0xff6b6b, 0, 0, 0, 0.008);
const shell2 = createOrbitalRing(1.9, 0.02, 0x4ecdc4, Math.PI / 3, Math.PI / 5, 0, 0.005);
const shell3 = createOrbitalRing(2.4, 0.015, 0x45b7d1, Math.PI / 6, Math.PI / 3, Math.PI / 8, 0.003);

// ============================================================
// 3D ELECTRONS
// ============================================================
const electronGroup = new THREE.Group();
scene.add(electronGroup);
const electrons = [];

function createElectron(orbitRadius, speed, color, startAngle, yOffset) {
  const geometry = new THREE.SphereGeometry(0.05, 16, 16);
  const material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.5 });
  const electron = new THREE.Mesh(geometry, material);
  const glowGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.2 });
  electron.add(new THREE.Mesh(glowGeo, glowMat));
  electron.userData = { orbitRadius, speed, angle: startAngle, baseY: yOffset };
  electronGroup.add(electron);
  electrons.push(electron);
  return electron;
}

const eColors = [0x00d4ff, 0x00d4ff, 0xffd700, 0xffd700, 0xff6b6b, 0xff6b6b];
const eRadii = [1.4, 1.4, 1.9, 1.9, 2.4, 2.4];
const eSpeeds = [0.012, 0.012, 0.008, 0.008, 0.005, 0.005];
const eAngles = [0, Math.PI, Math.PI/2, Math.PI*1.5, Math.PI/4, Math.PI*1.25];
const eYOffsets = [0.2, -0.2, 0.4, -0.4, 0.6, -0.6];
for (let i = 0; i < 6; i++) createElectron(eRadii[i], eSpeeds[i], eColors[i], eAngles[i], eYOffsets[i]);

// ============================================================
// NUCLEUS
// ============================================================
const nucleusGeo = new THREE.SphereGeometry(0.15, 32, 32);
const nucleusMat = new THREE.MeshStandardMaterial({
  color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3
});
const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
const nucleusGlowGeo = new THREE.SphereGeometry(0.3, 32, 32);
const nucleusGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.15 });
nucleus.add(new THREE.Mesh(nucleusGlowGeo, nucleusGlowMat));
scene.add(nucleus);

// ============================================================
// AMBIENT PARTICLE FIELD
// ============================================================
const particleCount = 300;
const particleGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pVelocities = [];
for (let i = 0; i < particleCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const r = 2 + Math.random() * 4;
  pPositions[i*3] = r * Math.sin(phi) * Math.cos(theta);
  pPositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  pPositions[i*3+2] = r * Math.cos(phi);
  pVelocities.push({ x: (Math.random()-0.5)*0.003, y: (Math.random()-0.5)*0.003, z: (Math.random()-0.5)*0.003 });
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const particleMat = new THREE.PointsMaterial({ color: 0x9fd5ff, size: 0.04, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
const particleSystem = new THREE.Points(particleGeo, particleMat);
scene.add(particleSystem);

// ============================================================
// GATE PING EFFECTS
// ============================================================
const REGION_POSITIONS = {
  head: new THREE.Vector3(0, 1.4, 0.2),
  throat: new THREE.Vector3(0, 1.0, 0.1),
  chest: new THREE.Vector3(0, 0.6, 0.1),
  spine: new THREE.Vector3(0, 0.2, 0),
  sacral: new THREE.Vector3(0, -0.2, 0),
  pelvis: new THREE.Vector3(0, -0.5, 0),
  legs: new THREE.Vector3(0, -1.0, 0)
};

const GATETOREGION = {
  1: "head", 24: "head", 47: "head",
  62: "throat", 56: "throat", 35: "throat",
  10: "spine", 15: "spine", 52: "spine",
  21: "chest", 26: "chest", 40: "chest",
  59: "pelvis", 50: "pelvis", 27: "pelvis",
  34: "sacral", 5: "sacral",
  29: "legs", 53: "legs", 54: "legs"
};

window.pingGate = function(gate) {
  const region = GATETOREGION[gate];
  if (!region) return;
  const pos = REGION_POSITIONS[region];
  if (!pos) return;

  const geo = new THREE.SphereGeometry(0.1, 16, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 3, transparent: true, opacity: 0.9 });
  const ping = new THREE.Mesh(geo, mat);
  ping.position.copy(pos);
  scene.add(ping);

  const ringGeo = new THREE.RingGeometry(0.05, 0.1, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.lookAt(camera.position);
  scene.add(ring);

  const burstCount = 30;
  const burstGeo = new THREE.BufferGeometry();
  const burstPos = new Float32Array(burstCount * 3);
  const burstVel = [];
  for (let i = 0; i < burstCount; i++) {
    burstPos[i*3] = pos.x; burstPos[i*3+1] = pos.y; burstPos[i*3+2] = pos.z;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 0.02 + Math.random() * 0.03;
    burstVel.push({ x: speed * Math.sin(phi) * Math.cos(theta), y: speed * Math.sin(phi) * Math.sin(theta), z: speed * Math.cos(phi) });
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  const burstMat = new THREE.PointsMaterial({ color: 0xffd700, size: 0.08, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
  const burst = new THREE.Points(burstGeo, burstMat);
  scene.add(burst);

  let t = 0;
  function animatePing() {
    t += 0.025;
    const scale = 1 + t * 4;
    ping.scale.setScalar(scale);
    ping.material.opacity = 0.9 * (1 - t);
    ping.material.emissiveIntensity = 3 * (1 - t);
    ring.scale.setScalar(scale * 1.5);
    ring.material.opacity = 0.7 * (1 - t);
    ring.lookAt(camera.position);
    const bPos = burst.geometry.attributes.position.array;
    for (let i = 0; i < burstCount; i++) {
      bPos[i*3] += burstVel[i].x; bPos[i*3+1] += burstVel[i].y; bPos[i*3+2] += burstVel[i].z;
    }
    burst.geometry.attributes.position.needsUpdate = true;
    burst.material.opacity = 1 - t;
    if (t < 1) { requestAnimationFrame(animatePing); }
    else { scene.remove(ping); scene.remove(ring); scene.remove(burst); }
  }
  animatePing();
};

// ============================================================
// 3D CONTROLS
// ============================================================
window.resetCamera = () => {
  camera.position.set(0, 0, 4);
  controls.target.set(0, 0, 0);
  controls.update();
};
window.toggleAutoRotate = () => { controls.autoRotate = !controls.autoRotate; };

// ============================================================
// AURYN COMPANION (DISEMINER-powered)
// ============================================================
window.toggleAuryn = () => {
  document.getElementById("auryn-panel").classList.toggle("active");
};

function addAurynMsg(text, sender) {
  const convo = document.getElementById("auryn-convo");
  const div = document.createElement("div");
  div.className = `auryn-msg ${sender}`;
  div.textContent = text;
  convo.appendChild(div);
  convo.scrollTop = convo.scrollHeight;
}

window.aurynSend = () => {
  const input = document.getElementById("auryn-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addAurynMsg(text, "user");

  setTimeout(() => {
    const result = diseminerEngine.processQuery(text);
    const lines = result.narrative.split('\n');
    const insight = lines.find(l => l.includes('converged') || l.includes('ambiguity') || l.includes('divergence')) ||
      lines.find(l => l.length > 20 && !l.includes('Artifact')) || lines[0];
    addAurynMsg(insight, "auryn");
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(insight);
      u.pitch = 1.1; u.rate = 0.9; u.volume = 0.7;
      speechSynthesis.speak(u);
    }
  }, 800);
};

document.getElementById("auryn-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") window.aurynSend();
});
