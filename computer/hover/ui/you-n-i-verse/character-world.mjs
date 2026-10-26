// Camera and avatar state for the existing Agentomagotchi World runtime.
// Pure helpers: safe to test without a browser or rendering context.
export const STORAGE_KEY = 'synthia-hover-playable-world-v1';
export const FORM_NAMES = Object.freeze(['Human', 'Astral', 'Prismatic', 'Living Light']);
export const FORM_COLORS = Object.freeze(['#f0a8d7', '#b68bff', '#63e7db', '#ffd78a']);
export const limit = (value, min, max) => Math.max(min, Math.min(max, value));

export function cameraStep(camera, player, follow, dt = 1 / 60) {
  const aim = follow ? player : { x: 0, z: 0 };
  const fraction = 1 - Math.exp(-limit(dt, 0, 0.2) * 9);
  return { x: camera.x + (aim.x - camera.x) * fraction, z: camera.z + (aim.z - camera.z) * fraction };
}
export function worldToScreen(x, z, camera, width, height, scale) {
  return { x: width / 2 + (x - camera.x) * scale, y: height / 2 + (z - camera.z) * scale };
}
export function screenToWorld(x, y, camera, width, height, scale) {
  return { x: camera.x + (x - width / 2) / scale, z: camera.z + (y - height / 2) / scale };
}
export function direction(input) {
  const dx = Number(!!input.right) - Number(!!input.left);
  const dz = Number(!!input.down) - Number(!!input.up);
  const magnitude = Math.hypot(dx, dz);
  return magnitude ? { dx: dx / magnitude, dz: dz / magnitude } : { dx: 0, dz: 0 };
}
export function nearestReachable(world, distance = 1.85) {
  const player = world.agents.find(agent => agent.player);
  if (!player) return null;
  return world.visibleObjects().map(object => ({
    object, distance: Math.hypot(player.position.x - object.x, player.position.z - object.z)
  })).filter(result => result.distance <= distance).sort((a, b) => a.distance - b.distance)[0]?.object ?? null;
}
export function nextForm(index) {
  return (Number.isInteger(index) && index >= 0 ? index + 1 : 1) % FORM_NAMES.length;
}
export function recordSnapshot(world, formIndex, companion, following) {
  const player = world.agents.find(agent => agent.player);
  return {
    version: 1,
    player: { x: player.position.x, z: player.position.z },
    formIndex: limit(Math.trunc(formIndex) || 0, 0, FORM_NAMES.length - 1),
    companion: !!companion, following: !!following,
    selectedId: world.selectedId,
    objects: world.objects.map(object => ({ id: object.id, x: object.x, z: object.z, morphState: object.morphState, sy: object.sy, removed: !!object.removed })),
    worldEvents: world.worldLedger.slice(-60).filter(event => event.type !== 'GENESIS')
  };
}
export function restoreSnapshot(world, saved) {
  if (!saved || saved.version !== 1 || !saved.player || !Number.isFinite(saved.player.x) || !Number.isFinite(saved.player.z)) return null;
  const player = world.agents.find(agent => agent.player);
  if (!player) return null;
  player.position.x = limit(saved.player.x, -4.25, 4.25);
  player.position.z = limit(saved.player.z, -4.25, 4.25);
  player.target = { x: player.position.x, z: player.position.z };
  const props = new Map(Array.isArray(saved.objects) ? saved.objects.map(o => [o.id, o]) : []);
  for (const object of world.objects) {
    const stored = props.get(object.id);
    if (!stored) continue;
    if (Number.isFinite(stored.x)) object.x = limit(stored.x, -5, 5);
    if (Number.isFinite(stored.z)) object.z = limit(stored.z, -5, 5);
    if (Number.isInteger(stored.morphState)) object.morphState = limit(stored.morphState, 0, 2);
    if (Number.isFinite(stored.sy)) object.sy = limit(stored.sy, 0.1, 5);
    object.removed = stored.removed === true;
  }
  if (world.entity(saved.selectedId)) world.select(saved.selectedId);
  return {
    formIndex: limit(Number.isInteger(saved.formIndex) ? saved.formIndex : 0, 0, FORM_NAMES.length - 1),
    companion: saved.companion !== false, following: saved.following !== false,
    worldEvents: Array.isArray(saved.worldEvents) ? saved.worldEvents.slice(-60) : []
  };
}
