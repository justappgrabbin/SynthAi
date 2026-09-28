const clone = (value) => structuredClone(value);

export class MemorySnapshotStore {
  constructor(seed = {}) { this.records = new Map(Object.entries(clone(seed))); }
  async save(key, value) { this.records.set(key, clone(value)); return clone(value); }
  async load(key) { return this.records.has(key) ? clone(this.records.get(key)) : null; }
  async remove(key) { return this.records.delete(key); }
}

export class IndexedDbSnapshotStore {
  constructor({ database = 'cynthia-sovereign', objectStore = 'snapshots', version = 1 } = {}) {
    this.database = database; this.objectStore = objectStore; this.version = version;
  }
  async #db() {
    if (!globalThis.indexedDB) throw new Error('INDEXED_DB_UNAVAILABLE');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.database, this.version);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(this.objectStore)) request.result.createObjectStore(this.objectStore); };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
  }
  async #request(mode, operation) {
    const db = await this.#db();
    try { return await new Promise((resolve, reject) => { const tx = db.transaction(this.objectStore, mode); const request = operation(tx.objectStore(this.objectStore)); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); }
    finally { db.close(); }
  }
  async save(key, value) { await this.#request('readwrite', store => store.put(clone(value), key)); return clone(value); }
  async load(key) { const value = await this.#request('readonly', store => store.get(key)); return value === undefined ? null : clone(value); }
  async remove(key) { await this.#request('readwrite', store => store.delete(key)); return true; }
}
