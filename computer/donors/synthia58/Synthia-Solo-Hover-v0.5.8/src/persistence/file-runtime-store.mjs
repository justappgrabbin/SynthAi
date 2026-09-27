import { mkdir, readFile, appendFile, writeFile, rename, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

function clone(value) {
  if (value == null) return value;
  return structuredClone(value);
}

function json(value, spacing = 0) {
  return JSON.stringify(value, (_key, member) => {
    if (typeof member === 'bigint') return member.toString();
    if (member instanceof Map) return { $synthiaRuntimeType: 'Map', entries: [...member.entries()] };
    if (member instanceof Set) return { $synthiaRuntimeType: 'Set', values: [...member.values()] };
    return member;
  }, spacing);
}

function revive(_key, member) {
  if (member?.$synthiaRuntimeType === 'Map' && Array.isArray(member.entries)) return new Map(member.entries);
  if (member?.$synthiaRuntimeType === 'Set' && Array.isArray(member.values)) return new Set(member.values);
  return member;
}

export class RuntimePersistenceError extends Error {
  constructor(message, { code = 'RUNTIME_PERSISTENCE_ERROR', cause = null, path = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RuntimePersistenceError';
    this.code = code;
    this.path = path;
  }
}

/**
 * Durable, address-friendly state storage for the Linux residence.
 *
 * "Atomic" here means that a complete temporary file is renamed over the
 * previous snapshot. It does not create a content hash, hash chain, or a new
 * identity layer. The journal uses deterministic sequence numbers and keeps
 * the stored ontological addresses untouched.
 */
export class FileRuntimeStore {
  constructor({
    directory = '.synthia-state',
    filename = 'runtime-state.json',
    journalFilename = 'runtime-journal.ndjson',
  } = {}) {
    this.directory = resolve(String(directory));
    this.filename = String(filename);
    this.journalFilename = String(journalFilename);
    this.snapshotPath = join(this.directory, this.filename);
    this.journalPath = join(this.directory, this.journalFilename);
    this.state = null;
    this.queue = Promise.resolve();
    this.opened = false;
    this.restoreReceipt = null;
  }

  async open() {
    await mkdir(this.directory, { recursive: true });
    let snapshot = null;
    let snapshotExists = true;
    try {
      snapshot = JSON.parse(await readFile(this.snapshotPath, 'utf8'), revive);
    } catch (error) {
      if (error?.code === 'ENOENT') snapshotExists = false;
      else if (error instanceof SyntaxError) {
        throw new RuntimePersistenceError(`runtime snapshot is invalid JSON: ${this.snapshotPath}`, {
          code: 'RUNTIME_SNAPSHOT_CORRUPT', cause: error, path: this.snapshotPath,
        });
      } else {
        throw new RuntimePersistenceError(`runtime snapshot could not be read: ${this.snapshotPath}`, {
          code: 'RUNTIME_SNAPSHOT_READ_FAILED', cause: error, path: this.snapshotPath,
        });
      }
    }

    if (snapshotExists) this.#validateSnapshot(snapshot);
    this.state = snapshotExists ? snapshot : {
      schema: 'synthia.runtime-state.v1',
      sequence: 0,
      records: {},
    };

    const replay = await this.#readJournal();
    let replayed = 0;
    for (const entry of replay) {
      if (entry.sequence <= this.state.sequence) continue;
      if (entry.sequence !== this.state.sequence + 1) {
        throw new RuntimePersistenceError(
          `runtime journal sequence gap: expected ${this.state.sequence + 1}, got ${entry.sequence}`,
          { code: 'RUNTIME_JOURNAL_SEQUENCE_GAP', path: this.journalPath },
        );
      }
      this.#applyEntry(entry);
      replayed += 1;
    }
    if (replayed) await this.#flushSnapshot();
    this.opened = true;
    this.restoreReceipt = Object.freeze({
      opened: true,
      durable: true,
      snapshotExisted: snapshotExists,
      restoredRecords: Object.keys(this.state.records).length,
      sequence: this.state.sequence,
      journalEntries: replay.length,
      replayedEntries: replayed,
      addressIdentityPreserved: true,
      hashLayerAdded: false,
    });
    return this;
  }

  #validateSnapshot(snapshot) {
    if (!snapshot || snapshot.schema !== 'synthia.runtime-state.v1') {
      throw new RuntimePersistenceError(`unsupported runtime snapshot schema: ${snapshot?.schema ?? 'missing'}`, {
        code: 'RUNTIME_SNAPSHOT_SCHEMA_INVALID', path: this.snapshotPath,
      });
    }
    if (!Number.isInteger(snapshot.sequence) || snapshot.sequence < 0 || !snapshot.records || typeof snapshot.records !== 'object') {
      throw new RuntimePersistenceError('runtime snapshot structure is invalid', {
        code: 'RUNTIME_SNAPSHOT_STRUCTURE_INVALID', path: this.snapshotPath,
      });
    }
  }

  async #readJournal() {
    let raw;
    try {
      raw = await readFile(this.journalPath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw new RuntimePersistenceError(`runtime journal could not be read: ${this.journalPath}`, {
        code: 'RUNTIME_JOURNAL_READ_FAILED', cause: error, path: this.journalPath,
      });
    }
    if (!raw.trim()) return [];
    return raw.trimEnd().split('\n').map((line, index) => {
      try {
        const entry = JSON.parse(line, revive);
        if (!Number.isInteger(entry.sequence) || !['put', 'delete'].includes(entry.operation) || typeof entry.key !== 'string') {
          throw new Error('invalid journal entry fields');
        }
        return entry;
      } catch (error) {
        throw new RuntimePersistenceError(`runtime journal entry ${index + 1} is invalid`, {
          code: 'RUNTIME_JOURNAL_CORRUPT', cause: error, path: this.journalPath,
        });
      }
    });
  }

  #applyEntry(entry) {
    if (entry.operation === 'put') this.state.records[entry.key] = clone(entry.value);
    else delete this.state.records[entry.key];
    this.state.sequence = entry.sequence;
  }

  async #append(entry) {
    try {
      await appendFile(this.journalPath, `${json(entry)}\n`, 'utf8');
    } catch (error) {
      throw new RuntimePersistenceError(`runtime journal could not be written: ${this.journalPath}`, {
        code: 'RUNTIME_JOURNAL_WRITE_FAILED', cause: error, path: this.journalPath,
      });
    }
  }

  async #flushSnapshot() {
    const temporary = `${this.snapshotPath}.tmp-${process.pid}-${this.state.sequence}`;
    try {
      await writeFile(temporary, json(this.state, 2), 'utf8');
      await rename(temporary, this.snapshotPath);
    } catch (error) {
      throw new RuntimePersistenceError(`runtime snapshot could not be written atomically: ${this.snapshotPath}`, {
        code: 'RUNTIME_SNAPSHOT_WRITE_FAILED', cause: error, path: this.snapshotPath,
      });
    }
  }

  async #mutate(operation, key, value = undefined) {
    if (!this.opened) await this.open();
    const entry = Object.freeze({
      sequence: this.state.sequence + 1,
      operation,
      key: String(key),
      ...(operation === 'put' ? { value: clone(value) } : {}),
    });
    await this.#append(entry);
    this.#applyEntry(entry);
    await this.#flushSnapshot();
    return true;
  }

  async get(key) {
    if (!this.opened) await this.open();
    return clone(this.state.records[String(key)] ?? null);
  }

  async put(key, value) {
    this.queue = this.queue.then(() => this.#mutate('put', key, value));
    return this.queue;
  }

  async delete(key) {
    if (!this.opened) await this.open();
    const exists = Object.prototype.hasOwnProperty.call(this.state.records, String(key));
    this.queue = this.queue.then(() => this.#mutate('delete', key));
    await this.queue;
    return exists;
  }

  async audit() {
    if (!this.opened) await this.open();
    let snapshotBytes = 0;
    let journalBytes = 0;
    try { snapshotBytes = (await stat(this.snapshotPath)).size; } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    try { journalBytes = (await stat(this.journalPath)).size; } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    return Object.freeze({
      configured: true,
      durable: true,
      opened: this.opened,
      directory: this.directory,
      sequence: this.state.sequence,
      records: Object.keys(this.state.records).length,
      snapshotBytes,
      journalBytes,
      restoreReceipt: this.restoreReceipt,
      atomicSnapshotReplacement: true,
      appendOnlySequenceJournal: true,
      hashChain: false,
      surfaceIdentity: 'ontological-address',
    });
  }
}

export default FileRuntimeStore;
