/**
 * JsonFilePersistence — file-backed StateStore persistence.
 * Serializes saves within this instance and publishes complete JSON atomically.
 * An interrupted write never truncates the previous checkpoint.
 */
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export class JsonFilePersistence {
  constructor(filePath) {
    if (!filePath) throw new Error('JsonFilePersistence: filePath required');
    this.filePath = filePath;
    this.pending = Promise.resolve();
  }

  async load(key) {
    const text = await readFile(this.filePath, 'utf8').catch(error => {
      if (error?.code === 'ENOENT') return '{}';
      throw error;
    });
    return JSON.parse(text || '{}')[key];
  }

  async save(key, value) {
    // StateStore passes a mutable object; snapshot it before awaiting other writes.
    const snapshot = structuredClone(value);
    const write = async () => {
      const text = await readFile(this.filePath, 'utf8').catch(error => {
        if (error?.code === 'ENOENT') return '{}';
        throw error;
      });
      const db = JSON.parse(text || '{}');
      db[key] = snapshot;
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporary = `${this.filePath}.tmp-${process.pid}-${randomUUID()}`;
      try {
        await writeFile(temporary, JSON.stringify(db), 'utf8');
        await rename(temporary, this.filePath);
      } finally {
        await rm(temporary, { force: true }).catch(() => {});
      }
      return true;
    };
    const result = this.pending.then(write, write);
    this.pending = result.catch(() => {});
    return result;
  }
}

export default JsonFilePersistence;
