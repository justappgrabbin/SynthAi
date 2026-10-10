import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { RelayBuilder } from '../runtime/relay-builder.mjs';
import { atomicJSON, JobStore } from './store.mjs';

const directory = resolve(process.env.RELAY_DATA_DIR || './relay-data');
const store = await new JobStore(join(directory, 'jobs')).init();
const lock = join(directory, 'worker.lock');
try { await mkdir(lock); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  let owner;
  try { owner = JSON.parse(await readFile(join(lock, 'owner.json'), 'utf8')); }
  catch (missing) {
    if (missing.code !== 'ENOENT') throw missing;
    // Allow an interrupted initial lock write to settle before reclaiming.
    await new Promise(resolve => setTimeout(resolve, 1500));
    try { owner = JSON.parse(await readFile(join(lock, 'owner.json'), 'utf8')); }
    catch (retry) { if (retry.code !== 'ENOENT') throw retry; owner = { pid: -1 }; }
  }
  if (owner.pid <= 0 || owner.pid === process.pid) { await rm(lock, { recursive: true }); await mkdir(lock); }
  else {
  try { process.kill(owner.pid, 0); throw new Error('Another worker is already active'); }
  catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
  await rm(lock, { recursive: true }); await mkdir(lock);
  }
}
await atomicJSON(join(lock, 'owner.json'), { pid: process.pid, startedAt: Date.now() });
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
const execFileAsync = promisify(execFile);
const verifier = fileURLToPath(new URL('./verify-app.mjs', import.meta.url));

async function checkpoint(job, stage, extra = {}) {
  Object.assign(job, extra, { stage, updatedAt: Date.now() });
  job.events.push({ at: Date.now(), stage });
  await store.put(job);
  console.log(JSON.stringify({ jobId: job.id, stage, status: job.status }));
}

try {
  while (!stopping) {
    const job = (await store.list()).find(job => ['queued', 'running'].includes(job.status));
    if (!job) { await new Promise(resolve => setTimeout(resolve, 300)); continue; }
    job.attempts++;
    try {
      await checkpoint(job, 'claimed', { status: 'running' });
      if (!job.output) {
        // The constructor provides the actual workspace without mounting unrelated server providers.
        const computer = new ComputerRuntime();
        const builder = new RelayBuilder(computer);
        const project = await builder.build(job.spec);
        await checkpoint(job, 'built', { output: computer.projects.snapshot(project.id) });
      }
      const appPath = join(directory, `${job.id}.html`);
      await writeFile(appPath, job.output.files.find(file => file.path === 'index.html').content, { mode: 0o600 });
      await checkpoint(job, 'verifying');
      const env = { PATH: process.env.PATH, HOME: process.env.HOME, CHROMIUM_PATH: process.env.CHROMIUM_PATH, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH };
      const result = await execFileAsync(process.execPath, [verifier, appPath], { env, timeout: 60000, maxBuffer: 100000 });
      const verification = JSON.parse(result.stdout.trim());
      if (verification.ok !== true) throw new Error('Artifact verification failed');
      await checkpoint(job, 'verified', { status: 'verified', verification, finishedAt: Date.now() });
    } catch (error) {
      await checkpoint(job, 'failed', { status: 'failed', error: String(error.stderr || error.message).slice(0, 3000), finishedAt: Date.now() });
    }
  }
} finally { await rm(lock, { recursive: true, force: true }); }
