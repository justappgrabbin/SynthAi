import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const keyName = key => Buffer.from(String(key)).toString('base64url') + '.json';

export class FilePersistence {
  constructor(root = process.env.SYNTHAI_STATE_DIR || '/var/lib/synthai') {
    this.root = root;
    this.saves = new Map();
  }

  pathFor(key) {
    return join(this.root, keyName(key));
  }

  async load(key) {
    try {
      const raw = await readFile(this.pathFor(key), 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async save(key, value) {
    const contents = JSON.stringify(value);
    const running = (this.saves.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
      await mkdir(this.root, { recursive: true });
      const target = this.pathFor(key);
      const temp = target + '.tmp-' + process.pid + '-' + randomUUID();
      await writeFile(temp, contents, { encoding: 'utf8', mode: 0o600 });
      await rename(temp, target);
      return true;
    });
    this.saves.set(key, running);
    try { return await running; }
    finally { if (this.saves.get(key) === running) this.saves.delete(key); }
  }
}

export default FilePersistence;
