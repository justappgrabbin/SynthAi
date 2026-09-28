import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { bootstrapCurrentSynthiaSwarm } from '../src/synthia/swarm/bootstrap.mjs';
import { FileCheckpointStore } from '../src/synthia/swarm/checkpointStores.mjs';

test('DURABLE RESTART: full Synthia physiology survives a fresh disk-backed bootstrap', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'synthia-restart-'));
  try {
    const first = await bootstrapCurrentSynthiaSwarm({ store: new FileCheckpointStore({ directory: dir }) });
    await first.synthia.talk('I think Gate 59 connection patterns should be remembered after a restart');
    first.physiology.tick();
    await first.swarm.checkpoint('disk-restart-test');
    const visits = first.physiology.world.node(59).visitCount;
    const obs = first.physiology.hypotheses.state.observations.length;
    const cycle = first.physiology.autonomous.state.cycle;

    const second = await bootstrapCurrentSynthiaSwarm({ store: new FileCheckpointStore({ directory: dir }) });
    assert.equal(second.physiology.world.node(59).visitCount, visits);
    assert.equal(second.physiology.hypotheses.state.observations.length, obs);
    assert.equal(second.physiology.autonomous.state.cycle, cycle);
    assert.ok(second.swarm.snapshot().bootCount >= 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('HARD KILL: in-flight replay-safe work is recovered and resumed after SIGKILL', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'synthia-hardkill-'));
  try {
    const childPath = new URL('./fixtures/recovery-child.mjs', import.meta.url);
    const child = spawn(process.execPath, [childPath.pathname, 'crash', dir], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      let buf = '';
      const timeout = setTimeout(() => reject(new Error(`child did not journal in-flight task: ${buf}`)), 10000);
      child.stdout.on('data', chunk => {
        buf += chunk.toString();
        if (buf.includes('INFLIGHT_JOURNALED')) { clearTimeout(timeout); resolve(); }
      });
      child.on('error', reject);
      child.on('exit', code => { if (code != null && !buf.includes('INFLIGHT_JOURNALED')) reject(new Error(`child exited early ${code}`)); });
    });
    child.kill('SIGKILL');
    await new Promise(resolve => child.once('close', resolve));

    const resumed = spawnSync(process.execPath, [childPath.pathname, 'resume', dir], { encoding: 'utf8' });
    assert.equal(resumed.status, 0, resumed.stderr);
    const line = resumed.stdout.trim().split(/\n/).filter(Boolean).at(-1);
    const parsed = JSON.parse(line);
    assert.equal(parsed.before.length, 1);
    assert.equal(parsed.before[0].task.id, 'recover-me');
    assert.equal(parsed.resumed.resumed, 1);
    assert.equal(parsed.resumed.executions[0].status, 'complete');
    assert.equal(parsed.resumed.executions[0].output.replayed, true);
    assert.equal(parsed.after.length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
