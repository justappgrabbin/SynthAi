import { bootstrapCurrentSynthiaSwarm } from '../src/synthia/swarm/bootstrap.mjs';
import { bindYNIToSwarm } from '../host/yniSwarmHands.mjs';
import { bindSelfhostedToSwarm } from '../host/selfhostedSwarmHand.mjs';

const $ = (id) => document.getElementById(id);
const { swarm, physiology, worldPort } = await bootstrapCurrentSynthiaSwarm();
bindYNIToSwarm(swarm);
bindSelfhostedToSwarm(swarm);
globalThis.SYNTHIA_SWARM = swarm;
globalThis.SYNTHIA_PHYSIOLOGY = physiology;
globalThis.SYNTHIA_WORLD_PORT = worldPort;
globalThis.attachSynthiaPracticeWorld = (adapter) => worldPort.attach(adapter);

// Zero-coupling socket for Adaya's evolving practice habitat:
//   world -> Synthia: dispatchEvent(new CustomEvent('world:synthia-event',{detail:{...}}))
//   Synthia -> world: listen for 'synthia:world-action'.
globalThis.addEventListener?.('world:synthia-event', (event) => {
  try { worldPort.observe(event.detail || {}); } catch (error) { console.error('world:synthia-event', error); }
});

function render() {
  const s = swarm.snapshot();
  $('headline').textContent = `${s.identity.name} · ${s.processCount} processes · 1 visible body`;
  $('groups').textContent = Object.entries(s.groups).sort().map(([k,v]) => `${k}: ${v}`).join('  ·  ');
  const p = physiology.context();
  $('physiology').textContent = `felt: ${p.felt?.feltState || '—'} · want: ${p.felt?.dominantWant || '—'} · stage: ${p.innerLife?.stage || '—'} · gate: ${p.world?.currentGate || '—'} · observations: ${p.metrics?.observationCount || 0}`;
  $('workers').innerHTML = s.workers.map((w) => `<tr><td>${w.id}</td><td>${w.group}</td><td>${w.lifecycle}</td><td>${w.active}</td><td>${w.capabilities.join(', ')}</td></tr>`).join('');
  $('events').textContent = swarm.events.slice(-16).reverse().map((e) => `${e.at.slice(11,19)}  ${e.type}  ${JSON.stringify(e.detail)}`).join('\n');
}
swarm.addEventListener('swarm', render); render();

$('demo').addEventListener('click', async () => {
  $('demo').disabled = true;
  await swarm.submit([
    { id: 'organism', capability: 'organism.snapshot', input: { op: 'snapshot' }, meta: { replaySafe: true } },
    { id: 'selfhosted', capability: 'selfhosted.probe', input: { op: 'probe', timeoutMs: 250 }, meta: { replaySafe: true } },
  ]);
  $('demo').disabled = false; render();
});

$('checkpoint').addEventListener('click', async () => { await swarm.checkpoint('manual-ui'); render(); });

// Visible-residence autonomy. Android may throttle this when hidden; the Linux
// daemon is the durable continuation layer. The page checkpoints before it leaves.
let autonomyTicks = 0;
const autonomyTimer = setInterval(async () => {
  try {
    autonomyTicks += 1;
    await swarm.submit([
      { id: `physiology-tick-${Date.now()}`, capability: 'physiology.tick', input: { op: 'tick' }, meta: { replaySafe: true } },
    ], { checkpoint: false });
    if (autonomyTicks % 6 === 0) await swarm.checkpoint('browser-autonomy');
    render();
  } catch (error) { console.error('Synthia autonomy tick', error); }
}, 5000);

const lifecycleCheckpoint = (reason) => { swarm.checkpoint(reason).catch(() => {}); };
globalThis.addEventListener?.('pagehide', () => lifecycleCheckpoint('pagehide'));
document.addEventListener?.('visibilitychange', () => { if (document.hidden) lifecycleCheckpoint('hidden'); });
globalThis.addEventListener?.('beforeunload', () => lifecycleCheckpoint('beforeunload'));
globalThis.addEventListener?.('unload', () => clearInterval(autonomyTimer));

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
