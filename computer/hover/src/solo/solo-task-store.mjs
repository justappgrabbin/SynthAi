import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function freeze(value) { return Object.freeze(value); }

export class SoloTaskStore {
  constructor({ persistenceDir = '.synthia-state' } = {}) {
    this.path = join(persistenceDir, 'solo-hover-tasks.json');
    this.loaded = false;
    this.loading = null;
    this.writes = Promise.resolve();
    this.state = { schemaVersion: 1, sequence: 0, tasks: [] };
  }

  async load() {
    if (this.loaded) return this;
    if (this.loading) return this.loading;
    this.loading = this.readState();
    return this.loading;
  }

  async readState() {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8'));
      if (parsed?.schemaVersion === 1 && Array.isArray(parsed.tasks)) this.state = parsed;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    this.loaded = true;
    return this;
  }

  async list() {
    await this.load();
    return freeze(clone(this.state.tasks));
  }

  async add({ text, source = 'user', context = {} } = {}) {
    await this.load();
    const clean = String(text ?? '').trim();
    if (!clean) throw new TypeError('task text required');
    const now = new Date().toISOString();
    const task = {
      id: `task-${++this.state.sequence}`,
      text: clean,
      done: false,
      source: String(source || 'user'),
      context: clone(context || {}),
      createdAt: now,
      updatedAt: now,
    };
    this.state.tasks.unshift(task);
    await this.save();
    return freeze(clone(task));
  }

  async update(id, patch = {}) {
    await this.load();
    const task = this.state.tasks.find((entry) => entry.id === id);
    if (!task) throw new Error(`unknown task: ${id}`);
    if (Object.prototype.hasOwnProperty.call(patch, 'text')) {
      const clean = String(patch.text ?? '').trim();
      if (!clean) throw new TypeError('task text required');
      task.text = clean;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'done')) task.done = Boolean(patch.done);
    for (const key of ['status', 'result', 'error', 'startedAt', 'finishedAt']) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) task[key] = String(patch[key] ?? '');
    }
    task.updatedAt = new Date().toISOString();
    await this.save();
    return freeze(clone(task));
  }

  async remove(id) {
    await this.load();
    const index = this.state.tasks.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    this.state.tasks.splice(index, 1);
    await this.save();
    return true;
  }

  async save() {
    const snapshot = JSON.stringify(this.state, null, 2);
    const write = this.writes.then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const tmp = `${this.path}.tmp`;
      await writeFile(tmp, snapshot);
      await rename(tmp, this.path);
    });
    this.writes = write.catch(() => {});
    return write;
  }
}

export default SoloTaskStore;
