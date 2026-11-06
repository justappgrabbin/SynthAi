/**
 * JsonFilePersistence — file-backed implementation of the existing kernel
 * persistence pattern (same {load(key), save(key, value)} interface as
 * MemoryPersistence / LocalStoragePersistence in core/kernel.mjs).
 *
 * Writes are serialized per file across ALL JsonFilePersistence instances in
 * this process and committed by atomic rename. This matters for the resident
 * Computer because AutoRegistrar and ordinary StateStore writes can otherwise
 * overlap during restart/autoload activity.
 */

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const FILE_QUEUES = new Map();
let tempSequence = 0;

function queueFor(filePath) {
  return FILE_QUEUES.get(filePath) ?? Promise.resolve();
}

export class JsonFilePersistence {
  constructor(filePath) {
    if (!filePath) throw new Error('JsonFilePersistence: filePath required');
    this.filePath = filePath;
  }

  async load(key) {
    await queueFor(this.filePath);
    let text;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return undefined;
      throw error;
    }
    const db = JSON.parse(text || '{}');
    return db[key];
  }

  async save(key, value) {
    const operation = queueFor(this.filePath).catch(() => {}).then(async () => {
      let db = {};
      try {
        db = JSON.parse(await readFile(this.filePath, 'utf8') || '{}');
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }

      db[key] = value;
      await mkdir(dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.tmp-${process.pid}-${++tempSequence}`;
      await writeFile(tempPath, JSON.stringify(db), 'utf8');
      await rename(tempPath, this.filePath);
      return true;
    });

    // Keep later operations moving even when this caller receives a failure.
    FILE_QUEUES.set(this.filePath, operation.catch(() => {}));
    return operation;
  }
}

export default JsonFilePersistence;
