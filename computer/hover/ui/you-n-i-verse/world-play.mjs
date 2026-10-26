import { STORAGE_KEY, FORM_NAMES, FORM_COLORS, cameraStep, direction, worldToScreen, screenToWorld, nearestReachable, nextForm, recordSnapshot, restoreSnapshot, limit } from './character-world.mjs';

export function mountPlayableWorld(root = document) {
  const canvas = root.querySelector('#play-world');
  if (!canvas) return null;
  const status = root.querySelector('#play-status');
  const receipt = root.querySelector('#play-receipt');
  const read = id => root.getElementById(id);
  const Simulator = globalThis.AgentomagotchiSim?.AgentomagotchiWorld;
  if (!Simulator) { status.textContent = 'World simulation failed to load.'; return null; }
  const world = new Simulator({ seed: 777 });
  world.setMode('PLAY');
  const player = world.agents.find(agent => agent.player);
  const state = { formIndex: 0, companion: true, following: true, keys: new Set(), dragging: false, destination: null, facing: 1, moving: false, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const restored = restoreSnapshot(world, saved);
    if (restored) {
      state.formIndex = restored.formIndex;
      state.companion = restored.companion;
      state.following = restored.following;
      world.worldLedger.push(...restored.worldEvents);
      world.events.push(...restored.worldEvents.slice(-40));
    }
  } catch (error) { status.textContent = 'Saved world could not be read; new session opened.'; }
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) { status.textContent = 'Canvas rendering is unavailable.'; return null; }
  let width = 1, height = 1, scale = 55, raf = 0, previousTime = 0, lastSave = 0, lastInfo = 0, running = true, visible = true, camera = { x: player.position.x, z: player.position.z };
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = limit(Math.min(width, height) * .16, 43, 79);
  }
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  function capsule(x, y, w, h, r, color) {
    context.fillStyle = color;
    context.beginPath(); context.roundRect(x, y, w, h, r); context.fill();
  }
  function ellipse(x, y, rx, ry, color) {
    context.fillStyle = color; context.beginPath(); context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); context.fill();
  }
  function line(ax, ay, bx, by, color, size) {
    context.strokeStyle = color; context.lineWidth = size; context.lineCap = 'round'; context.beginPath(); context.moveTo(ax, ay); context.lineTo(bx, by); context.stroke();
  }
  function paintBackground(t) {
    const grad = context.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#140d2b'); grad.addColorStop(.6, '#090a1c'); grad.addColorStop(1, '#080515');
    context.fillStyle = grad; context.fillRect(0, 0, width, height);
    for (let i = 0; i < 38; i++) {
      const x = ((i * 181 + 23) % 997) / 997 * width;
      const y = ((i * 331 + 71) % 997) / 997 * height;
      ellipse(x, y, i % 6 === 0 ? 1.5 : .75, .8, i % 4 === 0 ? '#d3baff88' : '#927ca077');
    }
    const a = worldToScreen(-5, -5, camera, width, height, scale);
    const b = worldToScreen(5, 5, camera, width, height, scale);
    capsule(a.x, a.y, b.x - a.x, b.y - a.y, 32, '#18162b');
    context.strokeStyle = '#7654a944'; context.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      const v = worldToScreen(i, -5, camera, width, height, scale);
      const u = worldToScreen(i, 5, camera, width, height, scale);
      line(v.x, v.y, u.x, u.y, '#8e5fba2b', 1);
      const p = worldToScreen(-5, i, camera, width, height, scale);
      const q = worldToScreen(5, i, camera, width, height, scale);
      line(p.x, p.y, q.x, q.y, '#8e5fba2b', 1);
    }
    context.strokeStyle = '#dba4ff77'; context.lineWidth = 2;
    context.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }
  function paintObject(obj, t) {
    const p = worldToScreen(obj.x, obj.z, camera, width, height, scale);
    if (p.x < -100 || p.x > width + 100 || p.y < -100 || p.y > height + 100) return;
    const pulse = .5 + .5 * Math.sin(t * 2 + obj.x);
    const morph = 1 + (obj.morphState || 0) * .16;
    ellipse(p.x, p.y + 11, 24 * morph, 10, '#05040e8e');
    if (obj.type === 'chair') {
      capsule(p.x - 17, p.y - 23 * morph, 34 * morph, 22 * morph, 6, '#b76e9c');
      capsule(p.x - 19, p.y - 1, 38 * morph, 10, 6, '#e4a2c1');
      line(p.x - 14, p.y + 8, p.x - 17, p.y + 19, '#b76e9c', 4);
      line(p.x + 14, p.y + 8, p.x + 17, p.y + 19, '#b76e9c', 4);
    } else if (obj.type === 'plant') {
      line(p.x, p.y + 6, p.x, p.y - 23 * morph, '#97cba7', 4);
      ellipse(p.x - 8, p.y - 19 * morph, 13, 8, '#37bba0');
      ellipse(p.x + 10, p.y - 28 * morph, 11, 8, '#66d2a9');
      capsule(p.x - 11, p.y + 2, 22, 16, 4, '#a77cba');
    } else if (obj.type === 'table') {
      capsule(p.x - 32, p.y - 12, 64 * morph, 15, 5, '#705f9f');
      line(p.x - 25, p.y, p.x - 25, p.y + 18, '#7b6cac', 5);
      line(p.x + 25, p.y, p.x + 25, p.y + 18, '#7b6cac', 5);
    } else if (obj.type === 'food') {
      ellipse(p.x, p.y, 14, 7, '#e6b68a');
      ellipse(p.x, p.y - 2, 9, 4, '#f4d3a1');
    } else {
      const color = obj.type === 'beacon' ? '#6be8dd' : '#bc8aff';
      context.shadowColor = color; context.shadowBlur = 15 + pulse * 14;
      ellipse(p.x, p.y - 14, 9 * morph, 22 * morph, color);
      context.shadowBlur = 0;
    }
    if (obj.id === world.selectedId) {
      context.strokeStyle = '#ffe2a9'; context.lineWidth = 2;
      context.beginPath(); context.ellipse(p.x, p.y + 16, 26, 10, 0, 0, Math.PI * 2); context.stroke();
    }
    context.fillStyle = '#e8d8f2'; context.textAlign = 'center'; context.font = '11px system-ui';
    context.fillText(obj.name, p.x, p.y + 34);
  }
  function paintPerson(agent, t, isPlayer) {
    const p = worldToScreen(agent.position.x, agent.position.z, camera, width, height, scale);
    if (p.x < -90 || p.y < -100 || p.x > width + 90 || p.y > height + 100) return;
    const shade = isPlayer ? FORM_COLORS[state.formIndex] : '#9bc1df';
    const walking = isPlayer && state.moving;
    const stride = walking && !state.reducedMotion ? Math.sin(t * 13) * 7 : 0;
    const float = !state.reducedMotion && state.formIndex > 0 ? Math.sin(t * 2.8) * 3 : 0;
    ellipse(p.x, p.y + 13, 18, 7, '#02010a9c');
    if (isPlayer && state.formIndex > 0) {
      context.shadowColor = shade; context.shadowBlur = 24;
      ellipse(p.x, p.y - 22 + float, 26 + state.formIndex * 3, 39, shade + '35');
      context.shadowBlur = 0;
    }
    line(p.x - 7, p.y - 15 + float, p.x - 9 + stride, p.y + 12, '#5f466f', 8);
    line(p.x + 7, p.y - 15 + float, p.x + 9 - stride, p.y + 12, '#5f466f', 8);
    line(p.x - 12, p.y - 45 + float, p.x - 17 - stride / 2, p.y - 18 + float, shade, 7);
    line(p.x + 12, p.y - 45 + float, p.x + 17 + stride / 2, p.y - 18 + float, shade, 7);
    capsule(p.x - 14, p.y - 56 + float, 28, 42, 12, shade);
    capsule(p.x - 9, p.y - 52 + float, 18, 22, 7, '#231c49aa');
    ellipse(p.x, p.y - 70 + float, 16, 17, '#f3c3ae');
    ellipse(p.x, p.y - 83 + float, 18, 9, isPlayer ? '#42235e' : '#34425d');
    ellipse(p.x + (state.facing * 5), p.y - 69 + float, 1.6, 1.6, '#2c1c33');
    if (isPlayer && state.formIndex === 3) {
      context.shadowColor = '#ffd78a'; context.shadowBlur = 21;
      ellipse(p.x, p.y - 96 + float, 9, 3, '#ffd78a'); context.shadowBlur = 0;
    }
    context.textAlign = 'center'; context.font = isPlayer ? 'bold 12px system-ui' : '11px system-ui';
    context.fillStyle = isPlayer ? '#fff4ff' : '#a8bad5';
    context.fillText(isPlayer ? 'YOU' : 'MIRROR', p.x, p.y - 107 + float);
  }
  function paintCompanion(t) {
    if (!state.companion) return;
    const p = worldToScreen(player.position.x, player.position.z, camera, width, height, scale);
    const x = p.x + 39, y = p.y - 67 + (state.reducedMotion ? 0 : Math.sin(t * 4) * 7);
    context.shadowColor = '#68e5dc'; context.shadowBlur = 21;
    ellipse(x, y, 13, 13, '#54dccc'); context.shadowBlur = 0;
    ellipse(x - 4, y - 3, 2, 2, '#16142d'); ellipse(x + 4, y - 3, 2, 2, '#16142d');
    line(x - 3, y + 4, x + 3, y + 4, '#1c3153', 1.5);
  }
  function updateUi() {
    const near = nearestReachable(world);
    const form = FORM_NAMES[state.formIndex];
    read('btn-form').textContent = 'Morph: ' + form;
    read('btn-companion').textContent = state.companion ? 'Companion on' : 'Companion off';
    read('btn-follow').textContent = state.following ? 'Camera: Follow' : 'Camera: Fixed';
    read('btn-morph-prop').disabled = !near;
    read('btn-morph-prop').textContent = near ? 'Morph ' + near.name : 'Approach an object';
    read('btn-interact').textContent = near ? 'Interact: ' + near.name : 'Interact';
    status.textContent = form + ' · ' + player.position.x.toFixed(1) + ', ' + player.position.z.toFixed(1) + ' · ' + (near ? 'Near ' + near.name : 'Explore the habitat');
    canvas.style.setProperty('--form-accent', FORM_COLORS[state.formIndex]);
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordSnapshot(world, state.formIndex, state.companion, state.following)));
      receipt.textContent = 'Saved locally on this device.';
      return true;
    } catch (error) { receipt.textContent = 'Could not save locally: ' + error.message; return false; }
  }
  function interact() {
    const near = nearestReachable(world);
    if (!near) { receipt.textContent = 'Move close to an object first.'; return false; }
    world.select(near.id);
    world.interactPlayer();
    receipt.textContent = world.worldLedger.at(-1)?.text || 'Interaction recorded.';
    updateUi(); save(); return true;
  }
  function morphObject() {
    const near = nearestReachable(world);
    if (!near) { receipt.textContent = 'Approach an object to morph it.'; return false; }
    world.select(near.id);
    const changed = world.morphSelected('transform');
    receipt.textContent = changed ? 'Morph applied to ' + near.name + '; world event recorded.' : 'This object cannot be morphed.';
    updateUi(); save(); return changed;
  }
  const button = (id, task) => read(id)?.addEventListener('click', task);
  button('btn-form', () => { state.formIndex = nextForm(state.formIndex); updateUi(); receipt.textContent = 'Avatar form changed to ' + FORM_NAMES[state.formIndex] + '.'; save(); });
  button('btn-companion', () => { state.companion = !state.companion; updateUi(); save(); });
  button('btn-follow', () => { state.following = !state.following; updateUi(); save(); });
  button('btn-save', save);
  button('btn-interact', interact);
  button('btn-morph-prop', morphObject);
  button('btn-reset', () => {
    if (!confirm('Start this world over? Your exported episodes will stay separate.')) return;
    localStorage.removeItem(STORAGE_KEY); location.reload();
  });
  for (const target of root.querySelectorAll('[data-walk]')) {
    const name = target.dataset.walk;
    target.addEventListener('pointerdown', event => { event.preventDefault(); target.setPointerCapture(event.pointerId); state.keys.add(name); state.destination = null; });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) target.addEventListener(type, () => state.keys.delete(name));
  }
  function keyDown(event) {
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
    const key = ({ ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right' })[event.code];
    if (key) { event.preventDefault(); state.keys.add(key); state.destination = null; }
    else if (event.code === 'Space' && !event.repeat) { event.preventDefault(); interact(); }
  }
  function keyUp(event) {
    const key = ({ ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right' })[event.code];
    if (key) state.keys.delete(key);
  }
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => state.keys.clear());
  canvas.addEventListener('pointerup', event => {
    const box = canvas.getBoundingClientRect();
    state.destination = screenToWorld(event.clientX - box.left, event.clientY - box.top, camera, width, height, scale);
    state.destination.x = limit(state.destination.x, -4.25, 4.25);
    state.destination.z = limit(state.destination.z, -4.25, 4.25);
  });
  function frame(timestamp) {
    if (!running) return;
    const dt = previousTime ? Math.min(.05, Math.max(0, (timestamp - previousTime) / 1000)) : 0;
    previousTime = timestamp;
    const keys = { left: state.keys.has('left'), right: state.keys.has('right'), up: state.keys.has('up'), down: state.keys.has('down') };
    let move = direction(keys);
    if (!move.dx && !move.dz && state.destination) {
      const dx = state.destination.x - player.position.x, dz = state.destination.z - player.position.z, dist = Math.hypot(dx, dz);
      if (dist < .12) state.destination = null;
      else move = { dx: dx / dist, dz: dz / dist };
    }
    state.moving = !!(move.dx || move.dz);
    if (state.moving && dt) { state.facing = move.dx < 0 ? -1 : move.dx > 0 ? 1 : state.facing; world.movePlayer(move.dx, move.dz, dt); }
    if (dt) world.step(dt);
    camera = cameraStep(camera, player.position, state.following, dt);
    if (visible) {
      const time = timestamp / 1000;
      paintBackground(time);
      for (const obj of world.visibleObjects()) paintObject(obj, time);
      for (const agent of world.agents) paintPerson(agent, time, !!agent.player);
      paintCompanion(time);
    }
    if (timestamp - lastInfo > 320) { updateUi(); lastInfo = timestamp; }
    if (timestamp - lastSave > 15000) { save(); lastSave = timestamp; }
    raf = requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); }, { threshold: 0 });
    observer.observe(canvas);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { state.keys.clear(); save(); previousTime = 0; } });
  window.addEventListener('pagehide', save);
  updateUi();
  raf = requestAnimationFrame(frame);
  return { world, state, save, refresh: updateUi, morphObject, interact, dispose() { running = false; cancelAnimationFrame(raf); resizeObserver?.disconnect(); window.removeEventListener('resize', resize); document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp); } };
}
