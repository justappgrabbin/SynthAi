/**
 * IndexedDBPersistence — phone/browser persistence adapter for SynthAI Computer.
 *
 * Same StateStore contract as MemoryPersistence/LocalStoragePersistence:
 *   load(namespace) -> object | undefined
 *   save(namespace, value) -> true
 *
 * Uses IndexedDB so the mobile Computer is not constrained by localStorage's
 * small quota. Falls back only when IndexedDB is unavailable.
 */
export class IndexedDBPersistence {
  constructor({ dbName = 'synthai-computer', storeName = 'state', version = 1 } = {}) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this._db = null;
  }

  async _open() {
    if (this._db) return this._db;
    if (!globalThis.indexedDB) throw new Error('IndexedDB unavailable');
    this._db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    });
    return this._db;
  }

  async load(key) {
    const db = await this._open();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
    });
  }

  async save(key, value) {
    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(structuredClone(value), key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
    });
    return true;
  }
}

/**
 * Small adapter for environments where IndexedDB is unavailable.
 * Primarily useful for tests and very small shells.
 */
export class BrowserLocalStoragePersistence {
  constructor(storage = globalThis.localStorage) {
    if (!storage) throw new Error('localStorage unavailable');
    this.storage = storage;
  }
  async load(key) {
    const raw = this.storage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  }
  async save(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
    return true;
  }
}

export function createMobilePersistence(options = {}) {
  if (globalThis.indexedDB) return new IndexedDBPersistence(options);
  if (globalThis.localStorage) return new BrowserLocalStoragePersistence();
  return null;
}
