/**
 * node-local-storage-shim.mjs
 *
 * SynthiaUnit's memory (organs/LocalMemory.js) reads/writes globalThis.localStorage
 * and silently no-ops if it's missing (try/catch swallows the error). That means
 * running SynthiaUnit under plain Node "works" but doesn't actually persist anything.
 *
 * This installs a minimal, synchronous, file-backed localStorage-alike on globalThis
 * BEFORE SynthiaUnit is imported, so the existing LocalMemory code works unmodified
 * and actually persists to disk between daemon restarts.
 */
import fs from 'node:fs';
import path from 'node:path';

export function installLocalStorageShim(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  let store = {};
  if (fs.existsSync(filePath)) {
    try {
      store = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      // corrupt/empty state file — start fresh rather than crash the daemon
      store = {};
    }
  }

  const persist = () => {
    // Synchronous write is fine here: LocalMemory calls save() on every mutation,
    // and state files stay small (LocalMemory trims each list to 500 records).
    fs.writeFileSync(filePath, JSON.stringify(store));
  };

  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); persist(); },
    removeItem: (k) => { delete store[k]; persist(); },
    clear: () => { store = {}; persist(); },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
  };

  return { path: filePath };
}

export default installLocalStorageShim;
