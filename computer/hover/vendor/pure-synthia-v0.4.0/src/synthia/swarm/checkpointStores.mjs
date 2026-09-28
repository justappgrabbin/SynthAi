const clone = (value) => {
  try { return structuredClone(value); }
  catch { try { return JSON.parse(JSON.stringify(value)); } catch { return null; } }
};

export class MemoryCheckpointStore {
  constructor() { this.data = new Map(); }
  async get(key) { return clone(this.data.get(String(key)) ?? null); }
  async put(key, value) { this.data.set(String(key), clone(value)); return true; }
  async delete(key) { return this.data.delete(String(key)); }
}

export class BrowserCheckpointStore {
  constructor({ dbName = 'pure-synthia-swarm', storeName = 'state', version = 1 } = {}) {
    this.dbName = dbName; this.storeName = storeName; this.version = version; this.db = null; this.fallback = false;
  }
  async open() {
    if (!('indexedDB' in globalThis)) { this.fallback = true; return this; }
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(this.storeName)) req.result.createObjectStore(this.storeName); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    }).catch(() => { this.fallback = true; return null; });
    return this;
  }
  #localKey(key) { return `${this.dbName}:${this.storeName}:${key}`; }
  async get(key) {
    if (this.fallback || !this.db) {
      try { const raw = globalThis.localStorage?.getItem(this.#localKey(key)); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).get(String(key));
      req.onsuccess = () => resolve(req.result ?? null); req.onerror = () => reject(req.error);
    });
  }
  async put(key, value) {
    if (this.fallback || !this.db) {
      globalThis.localStorage?.setItem(this.#localKey(key), JSON.stringify(value)); return true;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite'); tx.objectStore(this.storeName).put(clone(value), String(key));
      tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error);
    });
  }
  async delete(key) {
    if (this.fallback || !this.db) { globalThis.localStorage?.removeItem(this.#localKey(key)); return true; }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite'); tx.objectStore(this.storeName).delete(String(key));
      tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error);
    });
  }
}

// Durable local checkpoint store for the self-hosted Linux residence.
// It is intentionally loaded with dynamic node: imports so browser builds never
// depend on Node merely because the same swarm code can run headlessly.
export class FileCheckpointStore {
  constructor({ directory = '.synthia-state', filename = 'swarm-checkpoints.json' } = {}) {
    this.directory = String(directory);
    this.filename = String(filename);
    this.cache = null;
  }
  async #modules() {
    const [{ default: path }, fs] = await Promise.all([import('node:path'), import('node:fs/promises')]);
    return { path, fs };
  }
  async #path() {
    const { path, fs } = await this.#modules();
    const dir = path.resolve(this.directory);
    await fs.mkdir(dir, { recursive: true });
    return { path: path.join(dir, this.filename), fs };
  }
  async #load() {
    if (this.cache) return this.cache;
    const { path, fs } = await this.#path();
    try { this.cache = JSON.parse(await fs.readFile(path, 'utf8')); }
    catch { this.cache = {}; }
    return this.cache;
  }
  async #flush() {
    const { path, fs } = await this.#path();
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(this.cache || {}, null, 2), 'utf8');
    await fs.rename(tmp, path);
  }
  async get(key) { const data = await this.#load(); return clone(data[String(key)] ?? null); }
  async put(key, value) { const data = await this.#load(); data[String(key)] = clone(value); await this.#flush(); return true; }
  async delete(key) { const data = await this.#load(); const existed = Object.prototype.hasOwnProperty.call(data, String(key)); delete data[String(key)]; await this.#flush(); return existed; }
}

export async function defaultCheckpointStore(options = {}) {
  if ('indexedDB' in globalThis || 'localStorage' in globalThis) return new BrowserCheckpointStore(options.browser).open();
  return new MemoryCheckpointStore();
}
