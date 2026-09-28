import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createIntegratedSynthia } from '../../residents/synthia17/src/cynthia/IntegratedSynthiaRuntime.mjs';

class FileSnapshotStore {
  constructor(file) {
    this.file = file;
    this.pending = Promise.resolve();
  }

  async load(key) {
    await this.pending;
    try {
      const records = JSON.parse(await readFile(this.file, 'utf8'));
      return records[key] == null ? null : structuredClone(records[key]);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async save(key, value) {
    this.pending = this.pending.catch(() => {}).then(async () => {
      let records = {};
      try { records = JSON.parse(await readFile(this.file, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      records[key] = structuredClone(value);
      await mkdir(dirname(this.file), { recursive: true });
      const temporary = `${this.file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(records));
      await rename(temporary, this.file);
    });
    await this.pending;
    return structuredClone(value);
  }

  async remove(key) {
    this.pending = this.pending.catch(() => {}).then(async () => {
      let records = {};
      try { records = JSON.parse(await readFile(this.file, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      delete records[key];
      await mkdir(dirname(this.file), { recursive: true });
      const temporary = `${this.file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(records));
      await rename(temporary, this.file);
    });
    await this.pending;
    return true;
  }
}

export async function createSynthia17Resident({ persistenceDir }) {
  const store = new FileSnapshotStore(join(persistenceDir, 'synthia17-capsule.json'));
  const runtime = await createIntegratedSynthia({ store });
  return Object.freeze({
    runtime,
    status: () => runtime.diagnostics(),
    process: (input) => runtime.process(input),
    activeTools: (context = {}) => runtime.activeTools(context),
    growTool: (request) => runtime.growTool(request),
    registerProgram: async (program) => {
      const result = runtime.registerProgram(program);
      await runtime.persist();
      return result;
    },
    // An ordinary saved program runs over the available repertoire. Callers can
    // supply a focal gate when they specifically want state activation limits.
    runProgram: (id, input, context = {}) => runtime.runProgram(id, input, { gate: null, activeGates: [], ...context }),
    evaluateBusiness: async (opportunities, context = {}) => {
      const decision = runtime.nervousSystem.business.evaluate(opportunities, context);
      await runtime.persist();
      return { decision, explanation: runtime.nervousSystem.business.explain(decision) };
    },
  });
}
