import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const MAX_TEXT = 16000;
const MAX_EVENTS_READ = 2000;
function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function fail(message) { const error = new Error(message); error.code = 'COMPANION_BAD_INPUT'; throw error; }
function clean(value, max = MAX_TEXT) {
  if (typeof value !== 'string') fail('Expected text');
  if (value.length > max) fail('Text exceeds ' + max + ' characters');
  return value;
}
export function verifyLedger(events) {
  let prev = 'GENESIS';
  let seq = 0;
  for (const event of events) {
    if (event.seq !== ++seq || event.prev !== prev) throw new Error('Continuity ledger order/hash chain broken at entry ' + seq);
    const { hash: got, ...unsigned } = event;
    const computed = hash(JSON.stringify(unsigned));
    if (got !== computed) throw new Error('Continuity ledger hash mismatch at entry ' + seq);
    prev = got;
  }
  return { seq, head: prev };
}
export async function createContinuityLedger({ dataDir }) {
  const root = resolve(dataDir, 'gpt-companion');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const logFile = join(root, 'events.ndjson');
  const secretFile = join(root, 'access-key');
  let key;
  try { key = (await readFile(secretFile, 'utf8')).trim(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    key = randomBytes(32).toString('hex');
    try { await writeFile(secretFile, key + '\n', { flag: 'wx', mode: 0o600 }); }
    catch (race) { if (race.code !== 'EEXIST') throw race; key = (await readFile(secretFile, 'utf8')).trim(); }
  }
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid existing continuity access key: refusing to replace it');
  let lines = '';
  try { lines = await readFile(logFile, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const events = lines.trim() ? lines.trimEnd().split('\n').map(line => JSON.parse(line)) : [];
  verifyLedger(events); // fail closed; never discard or silently repair journal data
  let queue = Promise.resolve();
  function authorized(candidate) {
    if (typeof candidate !== 'string' || !/^[a-f0-9]{64}$/.test(candidate)) return false;
    return timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(key, 'hex'));
  }
  function read({ after = 0, limit = 100 } = {}) {
    const n = Number(after), count = Number(limit);
    if (!Number.isSafeInteger(n) || n < 0 || !Number.isSafeInteger(count) || count < 1) fail('Invalid pagination');
    return events.filter(event => event.seq > n).slice(0, Math.min(count, MAX_EVENTS_READ));
  }
  async function append(input) {
    const run = async () => {
      if (!input || typeof input !== 'object') fail('Event object is required');
      const type = clean(input.type || 'note', 48);
      const actor = clean(input.actor || 'human', 48);
      if (!/^[a-z][a-z0-9_.-]{0,47}$/.test(type) || !/^[a-z][a-z0-9_.-]{0,47}$/.test(actor)) fail('Invalid event type or actor');
      const content = clean(input.content ?? '');
      if (!content.trim()) fail('Event content is required');
      const ref = input.ref == null ? null : clean(input.ref, 400);
      const previous = events.length ? events[events.length - 1].hash : 'GENESIS';
      const unsigned = {
        seq: events.length + 1, timestamp: new Date().toISOString(),
        type, actor, content, ref, prev: previous,
      };
      const event = { ...unsigned, hash: hash(JSON.stringify(unsigned)) };
      const handle = await open(logFile, 'a', 0o600);
      try { await handle.writeFile(JSON.stringify(event) + '\n'); await handle.sync(); }
      finally { await handle.close(); }
      events.push(event);
      return event;
    };
    const result = queue.then(run);
    queue = result.then(() => {}, () => {});
    return result;
  }
  function snapshot({ limit = 100 } = {}) {
    const verified = verifyLedger(events);
    return {
      schema: 'gpt-synthai-continuity/v1',
      exportedAt: new Date().toISOString(),
      count: events.length, ...verified,
      events: events.slice(-Math.min(Math.max(Number(limit) || 100, 1), MAX_EVENTS_READ)),
    };
  }
  function status() {
    const last = events.at(-1);
    return { ready: true, count: events.length, seq: last?.seq || 0, head: last?.hash || 'GENESIS', directory: root };
  }
  return Object.freeze({ root, secretFile, authorized, read, append, snapshot, status });
}