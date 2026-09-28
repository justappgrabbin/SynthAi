import { asBytes, sha256Hex } from './ContentHash.mjs';

const MEMORY = new Map();
const DB_NAME = 'synthia-exact-artifacts-v1';
const STORE = 'by_sha256';

function canUseIDB() { return typeof indexedDB !== 'undefined'; }
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'sha256' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class ExactArtifactStore {
  async put(value, metadata = {}) {
    const bytes = asBytes(value);
    const sha256 = await sha256Hex(bytes);
    const record = { sha256, bytes: bytes.slice(), metadata: structuredClone(metadata), storedAt: Date.now() };
    MEMORY.set(sha256, record);
    if (canUseIDB()) {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }
    return Object.freeze({ sha256, byteLength: bytes.byteLength });
  }

  async get(sha256) {
    const key = String(sha256 || '').toLowerCase();
    if (MEMORY.has(key)) return MEMORY.get(key).bytes.slice();
    if (!canUseIDB()) return null;
    const db = await openDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record) return null;
    const bytes = new Uint8Array(record.bytes);
    MEMORY.set(key, { ...record, bytes });
    return bytes.slice();
  }

  async has(sha256) { return Boolean(await this.get(sha256)); }
}
export default ExactArtifactStore;
