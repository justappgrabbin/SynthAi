import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { bootstrapCurrentSynthiaSwarm } from '../src/synthia/swarm/bootstrap.mjs';
import { FileCheckpointStore } from '../src/synthia/swarm/checkpointStores.mjs';
import { bindSelfhostedToSwarm } from '../host/selfhostedSwarmHand.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const stateDir = process.env.SYNTHIA_STATE_DIR || path.join(root, '.state');
const tickMs = Math.max(1000, Number(process.env.SYNTHIA_TICK_MS || 5000));
const store = new FileCheckpointStore({ directory: stateDir });
const { swarm, physiology, worldPort } = await bootstrapCurrentSynthiaSwarm({ store });
bindSelfhostedToSwarm(swarm);
await swarm.resumeRecovered({ replaySafeOnly: true, checkpoint: true });

const statusFile = path.join(stateDir, 'daemon-status.json');
let stopping = false;
let ticks = 0;

async function writeStatus(extra = {}) {
  await fs.mkdir(stateDir, { recursive: true });
  const snapshot = swarm.snapshot();
  await fs.writeFile(statusFile, JSON.stringify({
    status: stopping ? 'stopping' : 'online', pid: process.pid, at: new Date().toISOString(),
    ticks, processCount: snapshot.processCount, cycle: snapshot.cycle,
    physiology: physiology.context(), worldPort: worldPort.snapshot(), ...extra,
  }, null, 2));
}

async function tick() {
  if (stopping) return;
  ticks += 1;
  await swarm.submit([
    { id: `daemon-physiology-${ticks}`, capability: 'physiology.tick', input: { op: 'tick' }, meta: { replaySafe: true } },
  ], { checkpoint: false });
  if (ticks % 6 === 0) await swarm.checkpoint('daemon-autonomy');
  await writeStatus();
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  try { await swarm.checkpoint(`daemon-${signal}`); await writeStatus({ signal }); } catch {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
process.on('uncaughtException', async (error) => {
  try { await swarm.checkpoint('daemon-uncaughtException'); await writeStatus({ error: error.message }); } catch {}
  console.error(error); process.exit(1);
});
process.on('unhandledRejection', async (error) => {
  try { await swarm.checkpoint('daemon-unhandledRejection'); await writeStatus({ error: String(error) }); } catch {}
  console.error(error); process.exit(1);
});

await writeStatus({ boot: true });
const timer = setInterval(() => tick().catch((error) => console.error('daemon tick', error)), tickMs);
console.log(`Pure Synthia daemon online · ${swarm.snapshot().processCount} processes · state ${stateDir}`);
