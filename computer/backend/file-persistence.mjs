import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const keyName = key => Buffer.from(String(key)).toString('base64url') + '.json';

export class FilePersistence {
  constructor(root = process.env.SYNTHAI_STATE_DIR || '/var/lib/synthai') {
    this.root = root;
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
    await mkdir(this.root, { recursive: true });
    const target = this.pathFor(key);
    const temp = target + '.tmp-' + process.pid + '-' + Date.now();
    await writeFile(temp, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 });
    await rename(temp, target);
    return true;
  }
}

export default FilePersistence;
