import '../donors/phone-morph/surface-morph.js';

export const CORE_STATES = ['idle', 'walk', 'turn', 'reach', 'scan', 'navigate', 'activate', 'sit', 'stand', 'lift', 'throw', 'return'];
const lib = globalThis.MorphEngineLib;

function statePose(name) {
  const pose = lib.poseIdle();
  const move = (key, x, y) => { pose[key][0] += x; pose[key][1] += y; };
  if (['reach', 'scan', 'activate', 'lift', 'throw'].includes(name)) {
    const reach = lib.poseReach();
    for (const key of Object.keys(pose)) pose[key] = reach[key];
  }
  if (['walk', 'navigate'].includes(name)) { move('knee_l', -17, -8); move('ankle_l', -28, -6); move('knee_r', 14, 4); move('ankle_r', 24, -12); move('wrist_l', 8, -12); move('wrist_r', -8, 12); }
  if (name === 'turn') for (const key of Object.keys(pose)) pose[key][0] = 128 + (pose[key][0] - 128) * .58;
  if (name === 'sit') { move('knee_l', -25, -37); move('knee_r', 25, -37); move('ankle_l', -22, -36); move('ankle_r', 22, -36); }
  if (name === 'lift') { move('wrist_l', 15, -40); move('wrist_r', 40, -75); }
  if (name === 'throw') { move('wrist_l', -14, -38); move('wrist_r', 55, -25); }
  return pose;
}

function photoFace(ctx, bitmap, point) {
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.save(); ctx.beginPath(); ctx.ellipse(point[0], point[1], 22, 27, 0, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, Math.max(0, (bitmap.height - side) * .18), side, side, point[0] - 22, point[1] - 27, 44, 54); ctx.restore();
}

export async function createPhotoAvatar(photo, { accent = '#ed72c8', material = 'metal' } = {}) {
  const bitmap = await createImageBitmap(await (await fetch(photo)).blob());
  const rgb = accent.match(/\w\w/g)?.map(value => parseInt(value, 16)) ?? [237, 114, 200];
  const dark = material === 'organic' ? [51, 83, 61] : [32, 25, 46];
  for (const key of ['torso', 'arm_l', 'arm_r', 'fore_l', 'fore_r', 'leg_l', 'leg_r']) lib.COLORS[key] = [...dark, 255];
  for (const key of ['stripe', 'joint_core', 'skirt']) lib.COLORS[key] = [...rgb, 255];
  const states = Object.fromEntries(CORE_STATES.map(name => [name, lib.renderCharacter(statePose(name), name)]));
  const engine = new lib.MorphEngine();
  engine.canonical = states.idle; engine.atlas = lib.extractAtlas(states.idle);
  for (const state of Object.values(states)) engine.registerState(state);
  const sheet = document.createElement('canvas'); sheet.width = lib.W * CORE_STATES.length; sheet.height = lib.H;
  const ctx = sheet.getContext('2d');
  CORE_STATES.forEach((name, i) => { ctx.save(); ctx.translate(i * lib.W, 0); ctx.drawImage(states[name].canvas, 0, 0); photoFace(ctx, bitmap, states[name].landmarks.head); ctx.restore(); });
  return { sheet: sheet.toDataURL('image/png'), states, engine, bitmap, source: 'photo + supplied skeletal surface morph; no generative model' };
}

export async function createPhotoMorphPlayer(photo, canvas, theme) {
  const avatar = await createPhotoAvatar(photo, theme);
  canvas.width = lib.W; canvas.height = lib.H;
  const ctx = canvas.getContext('2d');
  let state = 'idle', transition = null, start = 0, running = false, raf;
  const render = now => {
    if (!running) return;
    ctx.clearRect(0, 0, lib.W, lib.H);
    const t = Math.max(0, Math.min(1, (now - start) / 450));
    if (transition && t < 1) {
      const index = Math.round(t * (transition.frames.length - 1));
      ctx.drawImage(transition.frames[index].canvas, 0, 0);
      const a = transition.endpoints[0].landmarks.head, b = transition.endpoints[1].landmarks.head;
      photoFace(ctx, avatar.bitmap, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    } else {
      ctx.save(); if (state === 'walk' || state === 'navigate') ctx.translate(0, Math.sin(now / 90) * 3);
      ctx.drawImage(avatar.states[state].canvas, 0, 0); photoFace(ctx, avatar.bitmap, avatar.states[state].landmarks.head); ctx.restore();
    }
    raf = requestAnimationFrame(render);
  };
  return { bitmap: avatar.bitmap,
    setState(next) { next = next === 'talk' ? 'scan' : CORE_STATES.includes(next) ? next : 'idle'; if (next === state) return;
      transition = avatar.engine.morph(state, next, { frames: 4, learn: true }); start = performance.now(); state = next; },
    start() { if (!running) { running = true; raf = requestAnimationFrame(render); } },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}

export async function createHostSpriteSheet(photo, { kind = 'human', accent = '#e8a3df', material } = {}) {
  if (kind === 'human') {
    const avatar = await createPhotoAvatar(photo, { accent, material });
    avatar.bitmap.close(); return avatar.sheet;
  }
  const bitmap = await createImageBitmap(await (await fetch(photo)).blob());
  try {
    const sheet = document.createElement('canvas'); sheet.width = lib.W * CORE_STATES.length; sheet.height = lib.H;
    const ctx = sheet.getContext('2d');
    CORE_STATES.forEach((name, index) => {
      const pose = statePose(name);
      const center = pose.torso;
      ctx.save(); ctx.translate(index * lib.W, 0);
      ctx.fillStyle = accent;
      if (kind === 'butterfly') {
        const spread = name === 'sit' ? .65 : ['lift', 'reach', 'activate'].includes(name) ? 1.2 : 1;
        for (const side of [-1, 1]) for (const lobe of [0, 1]) {
          ctx.beginPath(); ctx.ellipse(center[0] + side * (42 - lobe * 8), center[1] - 18 + lobe * 55, (43 - lobe * 8) * spread, 42 - lobe * 6, side * (lobe ? -.4 : .4), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#3c294d'; ctx.beginPath(); ctx.ellipse(center[0], center[1], 9, 56, 0, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'flower') {
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.ellipse(center[0] + Math.cos(a) * 39, center[1] + Math.sin(a) * 39, 35, 18, a, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.arc(center[0], center[1], 22, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'star' || kind === 'crystal') {
        ctx.beginPath(); const sides = kind === 'star' ? 10 : 4;
        for (let i = 0; i < sides; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / sides; const r = kind === 'star' && i % 2 ? 30 : 72; const x = center[0] + Math.cos(a) * r, y = center[1] + Math.sin(a) * r; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.closePath(); ctx.fill();
      } else throw new Error('No sprite generator for this host form');
      photoFace(ctx, bitmap, pose.head);
      ctx.restore();
    });
    return sheet.toDataURL('image/png');
  } finally { bitmap.close(); }
}
