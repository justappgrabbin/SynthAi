import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const iso = () => new Date().toISOString();
const fresh = () => ({ version: 1, jobs: [], events: [], outbox: [], lastScan: null });
const MAX_FILES = 250;

function inspect(records) {
  const findings = [];
  for (const item of records.slice(0, MAX_FILES)) {
    if (!item || typeof item.path !== 'string' || typeof item.content !== 'string') continue;
    if (item.content.length > 65000 || item.meta?.encoding === 'base64') continue;
    const path = item.path;
    if (!path.startsWith('/home/user/')) continue;
    if (path.endsWith('.json')) {
      try { JSON.parse(item.content); }
      catch (error) {
        const candidate = item.content.replace(/,\s*([}\]])/g, '$1');
        let proposedFix = null;
        if (candidate !== item.content) {
          try { JSON.parse(candidate); proposedFix = candidate; } catch { /* no safe candidate */ }
        }
        findings.push({ type: 'json-parse', path, message: String(error.message), proposedFix });
      }
    }
    const lines = item.content.split('\n');
    for (let i = 0, found = 0; i < lines.length && found < 3; i++) {
      if (/\b(?:TODO|FIXME)\b/i.test(lines[i])) {
        findings.push({ type: 'todo', path, line: i + 1, message: lines[i].trim().slice(0, 180) });
        found++;
      }
    }
    if (findings.length >= 120) break;
  }
  return findings;
}

export class MajikiLoop {
  constructor({ file, listFiles, intervalMs = 2500 } = {}) {
    if (!file || typeof listFiles !== 'function') throw new TypeError('A private state file and file source are required');
    this.file = file;
    this.listFiles = listFiles;
    this.intervalMs = intervalMs;
    this.data = fresh();
    this.timer = null;
    this.busy = false;
    this.pendingSave = Promise.resolve();
    this.initialized = false;
  }
  async boot({ automatic = true } = {}) {
    try {
      const saved = JSON.parse(await readFile(this.file, 'utf8'));
      if (saved?.version === 1 && Array.isArray(saved.jobs) && Array.isArray(saved.outbox)) {
        this.data = { ...fresh(), ...saved };
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    this.initialized = true;
    for (const job of this.data.jobs) {
      if (job.stage === 'running') job.stage = job.resumeStage || 'research';
    }
    await this.persist();
    if (automatic) {
      this.timer = setInterval(() => { void this.tick().catch(() => {}); }, this.intervalMs);
      this.timer.unref?.();
    }
    return this;
  }
  close() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  snapshot() {
    return {
      ready: this.initialized, automatic: Boolean(this.timer),
      jobs: this.data.jobs.map(({ id, goal, stage, createdAt, updatedAt, findings, plan, error, outboxIds }) =>
        ({ id, goal, stage, createdAt, updatedAt, findings: findings || [], plan: plan || [], error: error || null, outboxIds: outboxIds || [] })),
      outbox: this.data.outbox.map(x => ({ ...x })), events: this.data.events.slice(-40),
      lastScan: this.data.lastScan, busy: this.busy,
    };
  }
  async persist() {
    const value = JSON.stringify(this.data);
    this.pendingSave = this.pendingSave.catch(() => {}).then(async () => {
      await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
      const tmp = this.file + '.' + process.pid + '.tmp';
      await writeFile(tmp, value, { encoding: 'utf8', mode: 0o600 });
      await rename(tmp, this.file);
    });
    return this.pendingSave;
  }
  event(type, job, detail = '') {
    this.data.events.push({ at: iso(), type, jobId: job?.id ?? null, detail });
    if (this.data.events.length > 250) this.data.events.splice(0, this.data.events.length - 250);
  }
  async enqueue(goal) {
    if (typeof goal !== 'string' || goal.trim().length < 3 || goal.length > 2000)
      throw new TypeError('Describe a goal between 3 and 2000 characters');
    const job = { id: randomUUID(), goal: goal.trim(), stage: 'research', createdAt: iso(),
      updatedAt: iso(), findings: [], plan: [], outboxIds: [] };
    this.data.jobs.push(job);
    this.event('task:created', job, job.goal.slice(0, 100));
    await this.persist();
    return { id: job.id, stage: job.stage };
  }
  async tick() {
    if (this.busy) return { busy: true };
    const job = this.data.jobs.find(x => !['complete', 'needs-input', 'failed'].includes(x.stage));
    if (!job) return { idle: true };
    this.busy = true;
    try {
      if (job.stage === 'research') {
        const records = await this.listFiles();
        job.findings = inspect(Array.isArray(records) ? records : []);
        job.stage = 'plan';
        this.event('research:completed', job, String(job.findings.length) + ' local findings');
      } else if (job.stage === 'plan') {
        job.plan = job.findings.filter(x => x.type === 'json-parse' && x.proposedFix)
          .map(x => ({ action: 'draft-verified-json-fix', path: x.path }));
        job.stage = 'implement';
        this.event('plan:completed', job, String(job.plan.length) + ' reproducible candidate repairs');
      } else if (job.stage === 'implement') {
        for (const issue of job.findings) {
          if (!issue.proposedFix) continue;
          const artifact = { id: randomUUID(), jobId: job.id, name: issue.path.split('/').at(-1),
            originalPath: issue.path, kind: 'json-repair-draft', content: issue.proposedFix,
            status: 'pending-verification', at: iso() };
          this.data.outbox.push(artifact);
          job.outboxIds.push(artifact.id);
        }
        job.stage = 'verify';
        this.event('implementation:drafted', job, String(job.outboxIds.length) + ' non-destructive candidates');
      } else if (job.stage === 'verify') {
        let verified = 0;
        for (const artifact of this.data.outbox.filter(x => x.jobId === job.id)) {
          try {
            JSON.parse(artifact.content);
            artifact.status = 'verified-json-parse';
            verified++;
          } catch (error) { artifact.status = 'failed'; artifact.error = String(error.message); }
        }
        // A repaired JSON parse is a verified syntax repair, not a full product verification.
        job.stage = verified > 0 ? 'complete' : 'needs-input';
        job.error = verified ? null : 'No deterministic repair could be proven. Source inspection and a coder/model are required.';
        this.event('verification:finished', job, String(verified) + ' JSON syntax checks passed');
      } else {
        job.stage = 'failed';
        job.error = 'Unknown stage';
      }
    } catch (error) {
      job.stage = 'failed';
      job.error = String(error?.message || error);
      this.event('task:failed', job, job.error.slice(0, 220));
    } finally {
      job.updatedAt = iso();
      this.busy = false;
      await this.persist();
    }
    return { jobId: job.id, stage: job.stage };
  }
  async scan() {
    if (this.busy) return { busy: true };
    const findings = inspect(await this.listFiles());
    this.data.lastScan = { at: iso(), count: findings.length, findings: findings.map(x => ({ ...x, proposedFix: undefined })) };
    this.event('scan:completed', null, String(findings.length) + ' findings');
    await this.persist();
    return this.data.lastScan;
  }
}
export { inspect as inspectMajikiSources };
