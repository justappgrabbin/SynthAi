import { mkdir, readFile, writeFile, rename, readdir, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export async function atomicJSON(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await rename(temporary, path);
}

export class JobStore {
  constructor(directory) { this.directory = directory; }
  async init() { await mkdir(this.directory, { recursive: true }); return this; }
  path(id) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid job ID');
    return join(this.directory, `${id}.json`);
  }
  async get(id) {
    try { return JSON.parse(await readFile(this.path(id), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async put(job) { await atomicJSON(this.path(job.id), job); return job; }
  async submit(spec, requestKey) {
    if (!['tasks', 'notes'].includes(spec.kind) || typeof spec.name !== 'string' || !spec.name.trim() || spec.name.length > 200) throw new Error('Provide a name and supported kind: tasks or notes');
    if (typeof requestKey !== 'string' || requestKey.length < 8 || requestKey.length > 200) throw new Error('An idempotency key of 8–200 characters is required');
    const id = createHash('sha256').update(requestKey).digest('hex');
    const clean = { name: spec.name.trim(), description: String(spec.description || '').slice(0, 4000), kind: spec.kind };
    const existing = await this.get(id);
    if (existing) {
      if (JSON.stringify(existing.spec) !== JSON.stringify(clean)) throw new Error('Idempotency key already belongs to a different request');
      return existing;
    }
    const job = { id, spec: clean, status: 'queued', stage: 'queued', attempts: 0, createdAt: Date.now(), events: [{ at: Date.now(), stage: 'queued' }] };
    // Exclusive creation prevents simultaneous retries from replacing a claimed job.
    const temporary = `${this.path(id)}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(job), { mode: 0o600 });
    try { await link(temporary, this.path(id)); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const raced = await this.get(id);
      if (JSON.stringify(raced.spec) !== JSON.stringify(clean)) throw new Error('Idempotency key already belongs to a different request');
      return raced;
    } finally { await unlink(temporary); }
    return job;
  }
  async list() {
    const files = (await readdir(this.directory)).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
    const jobs = await Promise.all(files.map(name => this.get(name.slice(0, -5))));
    return jobs.sort((a, b) => a.createdAt - b.createdAt);
  }
}
