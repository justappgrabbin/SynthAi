import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'gpt-synthai-continuity';
function checkRepo(repo) {
  if (typeof repo !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Expected GitHub owner/repository');
  return repo;
}
function checkBranch(branch) {
  if (typeof branch !== 'string' || !/^[A-Za-z0-9_./-]{1,160}$/.test(branch) || branch.includes('..')) throw new Error('Invalid GitHub branch');
  return branch;
}
function encode(value) { return encodeURIComponent(value); }
export async function createGitHubContinuityBridge({ ledger }) {
  const configFile = join(ledger.root, 'github-connection.json');
  let config = null;
  try { config = JSON.parse(await readFile(configFile, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }

  async function github(method, route, body, accept404 = false) {
    if (!config?.token) throw new Error('GitHub continuity connection is not configured');
    const response = await fetch('https://api.github.com' + route, {
      method, headers: {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.token,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'synthai-gpt-companion',
      },
      body: body == null ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 404 && accept404) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error('GitHub returned ' + response.status + ': ' + String(data.message || 'unknown error'));
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function configure(input) {
    const repo = checkRepo(input?.repository);
    const branch = checkBranch(input?.branch || 'main');
    const token = String(input?.token || '').trim();
    if (token.length < 15 || token.length > 500 || /[\r\n]/.test(token)) throw new Error('GitHub credential required');
    const allowPublic = input.allowPublic === true;
    const next = { repository: repo, branch, token, allowPublic };
    const previous = config;
    config = next;
    try {
      const metadata = await github('GET', '/repos/' + repo);
      if (!metadata.private && !allowPublic) throw new Error('Repository is public. For private continuity, choose a private repo; publishing to a public repo requires explicit consent.');
      await github('GET', '/repos/' + repo + '/branches/' + branch.split('/').map(encode).join('/'));
      await mkdir(ledger.root, { recursive: true, mode: 0o700 });
      await writeFile(configFile, JSON.stringify(next), { mode: 0o600 });
    } catch (e) { config = previous; throw e; }
    return status();
  }

  function status() {
    return { configured: Boolean(config?.token), repository: config?.repository || null, branch: config?.branch || null, publicApproved: config?.allowPublic === true, direction: 'outbound snapshot + inbound human-approved proposals; no automatic command execution' };
  }

  async function push() {
    if (!config) throw new Error('Connect a private GitHub repository first');
    const snap = ledger.snapshot({ limit: 2000 });
    if (snap.seq === 0) return { pushed: false, reason: 'no continuity events yet' };
    const name = String(snap.seq).padStart(9, '0') + '-' + snap.head.slice(0, 16) + '.json';
    const path = ROOT + '/exports/' + name;
    const url = '/repos/' + config.repository + '/contents/' + path;
    const current = await github('GET', url + '?ref=' + encode(config.branch), undefined, true);
    if (current) return { pushed: true, existing: true, path, head: snap.head };
    await github('PUT', url, {
      message: 'Synthia/GPT continuity snapshot #' + snap.seq,
      branch: config.branch,
      content: Buffer.from(JSON.stringify(snap, null, 2)).toString('base64'),
    });
    await ledger.append({ type: 'sync', actor: 'synthia', content: 'Exported continuity snapshot to GitHub ' + config.repository + ':' + config.branch, ref: path });
    return { pushed: true, existing: false, path, head: snap.head };
  }

  async function pull() {
    if (!config) throw new Error('Connect a private GitHub repository first');
    const route = '/repos/' + config.repository + '/contents/' + ROOT + '/inbox?ref=' + encode(config.branch);
    const items = await github('GET', route, undefined, true);
    if (!items) return { received: 0, skipped: 0 };
    if (!Array.isArray(items)) throw new Error('The GitHub inbox path must be a directory');
    const known = new Set(ledger.read({ after: 0, limit: 2000 }).filter(e => e.type === 'proposal').map(e => e.ref));
    let received = 0, skipped = 0;
    for (const item of items.slice(0, 50)) {
      if (item.type !== 'file' || !item.name.endsWith('.json')) continue;
      const ref = 'github:' + config.repository + ':' + config.branch + ':' + item.path + '@' + item.sha;
      if (known.has(ref)) { skipped++; continue; }
      const raw = await github('GET', '/repos/' + config.repository + '/contents/' + item.path + '?ref=' + encode(config.branch));
      if (!raw?.content) continue;
      const input = JSON.parse(Buffer.from(raw.content.replace(/\s/g, ''), 'base64').toString('utf8'));
      if (input.schema !== 'gpt-synthai-handoff/v1' || typeof input.description !== 'string' || !input.description.trim()) continue;
      if (JSON.stringify(input).length > 16000) continue;
      // Never execute inbox content. It is an untrusted proposed task awaiting local review.
      await ledger.append({
        type: 'proposal', actor: 'gpt-inbox', ref,
        content: JSON.stringify({ id: String(input.id || item.name).slice(0, 150), description: input.description, suggestedCommand: input.command || null, requiresLocalApproval: true }),
      });
      known.add(ref);
      received++;
    }
    return { received, skipped };
  }

  return Object.freeze({ configure, status, push, pull, request: github, accessToken: () => config?.token || null });
}