import { SynthiaSwarmBody } from '../../src/synthia/swarm/swarmBody.mjs';
import { FileCheckpointStore } from '../../src/synthia/swarm/checkpointStores.mjs';
const [mode, directory] = process.argv.slice(2);
const store = new FileCheckpointStore({ directory });
const swarm = new SynthiaSwarmBody({ store, checkpointKey: 'hard-kill-test' });
if (mode === 'crash') {
  swarm.registerExternal({ id: 'slow-worker', capabilities: ['test.sleep'], execute: async () => {
    console.log('INFLIGHT_JOURNALED');
    await new Promise(resolve => setTimeout(resolve, 60000));
    return { shouldNotFinish: true };
  }});
  await swarm.wake();
  await swarm.submit([{ id: 'recover-me', capability: 'test.sleep', input: { value: 7 }, meta: { replaySafe: true } }]);
} else if (mode === 'resume') {
  swarm.registerExternal({ id: 'slow-worker', capabilities: ['test.sleep'], execute: async (input) => ({ replayed: true, input }) });
  await swarm.wake();
  const before = swarm.recoverableTasks();
  const resumed = await swarm.resumeRecovered({ replaySafeOnly: true, checkpoint: true });
  console.log(JSON.stringify({ before, resumed, after: swarm.recoverableTasks() }));
} else process.exit(2);
