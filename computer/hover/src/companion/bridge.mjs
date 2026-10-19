import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createContinuityLedger } from './continuity.mjs';
import { createGitHubContinuityBridge } from './github-bridge.mjs';
import { createRepoHub } from './repo-hub.mjs';
import { createProjectContexts } from './project-context.mjs';
import { createArtifactLibrary } from './artifact-library.mjs';
import { createConversationLearning } from './conversation-learning.mjs';

const TOOL_DEFS = [
  { name: 'continuity_status', description: 'Read the current Synthia/GPT continuity position and true runtime type.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'continuity_read', description: 'Read verified append-only handoff records. Nothing is inferred or invented.', inputSchema: { type: 'object', properties: { after: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 200 } } }, annotations: { readOnlyHint: true } },
  { name: 'continuity_note', description: 'Write a durable checkpoint, decision, receipt or next-step handoff for Cynthia and ChatGPT.', inputSchema: { type: 'object', properties: { content: { type: 'string' }, type: { type: 'string', enum: ['note', 'checkpoint', 'receipt', 'decision', 'handoff'] }, ref: { type: 'string' } }, required: ['content'] } },
  { name: 'continuity_propose', description: 'Queue an action for review on the phone. Does not run shell commands or control the device.', inputSchema: { type: 'object', properties: { description: { type: 'string' }, suggestedCommand: { type: 'string' } }, required: ['description'] } },
];

async function payload(request) {
  let data = '';
  for await (const chunk of request) {
    data += chunk;
    if (Buffer.byteLength(data) > 32000) throw new Error('Request body exceeds 32 KiB');
  }
  return data ? JSON.parse(data) : {};
}
function bearer(request) {
  const header = String(request.headers.authorization || '');
  if (header.startsWith('Bearer ')) return header.slice(7);
  return request.headers['x-synthia-access-key'];
}
function terminalStatus() {
  const insideAndroidGuest = !!process.env.SYNTHIA_ANDROID_BRIDGE_URL;
  return {
    available: process.platform !== 'win32',
    actual: insideAndroidGuest ? 'PRoot Alpine userspace on Android' : process.platform + ' process host',
    virtualMachine: false,
    note: 'No guest Linux kernel is booted by this runtime. A QEMU/AVF backend is required to label it a VM.',
  };
}
async function terminal(command, workspace) {
  if (typeof command !== 'string' || !command.trim() || command.length > 1200) throw new Error('Shell command must be 1-1200 characters');
  if (typeof workspace !== 'string' || !workspace) throw new Error('Terminal workspace unavailable');
  const timeoutMs = 20000;
  return await new Promise((resolve) => {
    const child = spawn('/bin/sh', ['-lc', command], {
      cwd: workspace,
      env: { ...process.env, HOME: process.env.HOME || '/root' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '', timedOut = false, finished = false;
    function clip(chunk, current) { return (current + chunk.toString('utf8')).slice(0, 65536); }
    child.stdout?.on('data', chunk => { stdout = clip(chunk, stdout); });
    child.stderr?.on('data', chunk => { stderr = clip(chunk, stderr); });
    const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    function finish(code, signal, error) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({ ok: !error && code === 0 && !timedOut, code, signal, stdout, stderr: error ? String(error.message) : stderr, timedOut });
    }
    child.once('error', error => finish(null, null, error));
    child.once('close', (code, signal) => finish(code, signal));
  });
}

function mcp(id, result) { return { jsonrpc: '2.0', id, result }; }
function mcpError(id, code, message) { return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }; }
function mcpText(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], isError: false };
}

export async function createCompanionBridge({ persistenceDir }) {
  const ledger = await createContinuityLedger({ dataDir: persistenceDir });
  const github = await createGitHubContinuityBridge({ ledger });
  const repos = await createRepoHub({ ledger, github: github.request, token: github.accessToken });
  const contexts = createProjectContexts({ ledger });
  const library = await createArtifactLibrary({ ledger });
  const learning = createConversationLearning({ ledger, library });

  async function handle(request, url) {
    if (!url.pathname.startsWith('/api/companion/') && url.pathname !== '/mcp') return null;
    // Status contains no private content. All other operations require a per-install secret.
    if (request.method === 'GET' && url.pathname === '/api/companion/status') {
      const state = ledger.status();
      return { code: 200, data: {
        ok: true, authenticated: false, continuity: { count: state.count, seq: state.seq, head: state.head },
        terminal: terminalStatus(), mcp: { configuredOnPhone: true, reachableFromChatGPT: false },
      } };
    }
    if (!ledger.authorized(bearer(request))) return { code: 401, data: { ok: false, error: 'Companion access key required' } };

    if (url.pathname === '/mcp' && request.method === 'POST') {
      const rpc = await payload(request);
      if (rpc.method === 'notifications/initialized') return { code: 202, data: {} };
      if (rpc.method === 'initialize') return { code: 200, data: mcp(rpc.id, {
        protocolVersion: '2025-06-18', capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'gpt-synthai-continuity', version: '0.1.0' },
      }) };
      if (rpc.method === 'ping') return { code: 200, data: mcp(rpc.id, {}) };
      if (rpc.method === 'tools/list') return { code: 200, data: mcp(rpc.id, { tools: TOOL_DEFS }) };
      if (rpc.method === 'tools/call') {
        const { name, arguments: args = {} } = rpc.params || {};
        try {
          let result;
          if (name === 'continuity_status') result = { ...ledger.status(), terminal: terminalStatus(), github: github.status() };
          else if (name === 'continuity_read') result = { events: ledger.read({ after: args.after || 0, limit: Math.min(args.limit || 100, 200) }) };
          else if (name === 'continuity_note') result = await ledger.append({ type: args.type || 'handoff', actor: 'gpt', content: args.content, ref: args.ref });
          else if (name === 'continuity_propose') result = await ledger.append({ type: 'proposal', actor: 'gpt', content: JSON.stringify({ description: args.description, suggestedCommand: args.suggestedCommand || null, requiresLocalApproval: true }) });
          else return { code: 200, data: mcpError(rpc.id, -32601, 'Unknown continuity tool') };
          return { code: 200, data: mcp(rpc.id, mcpText(result)) };
        } catch (error) {
          return { code: 200, data: mcp(rpc.id, { content: [{ type: 'text', text: String(error.message) }], isError: true }) };
        }
      }
      return { code: 200, data: mcpError(rpc.id, -32601, 'Method not found') };
    }
    if (url.pathname === '/api/companion/events' && request.method === 'GET') {
      return { code: 200, data: { ok: true, events: ledger.read({ after: Number(url.searchParams.get('after') || 0), limit: Number(url.searchParams.get('limit') || 100) }), state: ledger.status() } };
    }
    if (url.pathname === '/api/companion/events' && request.method === 'POST') {
      const data = await payload(request);
      const event = await ledger.append({ type: data.type || 'note', actor: data.actor || 'human', content: data.content, ref: data.ref });
      return { code: 201, data: { ok: true, event } };
    }
    if (url.pathname === '/api/companion/export' && request.method === 'GET') {
      return { code: 200, data: { ok: true, snapshot: ledger.snapshot({ limit: 2000 }) } };
    }
    if (url.pathname === '/api/companion/terminal' && request.method === 'POST') {
      const data = await payload(request);
      const result = await terminal(data.command, ledger.root);
      await ledger.append({ type: 'receipt', actor: 'terminal', content: JSON.stringify({
        commandSha256: createHash('sha256').update(String(data.command || '')).digest('hex'),
        exitCode: result.code, timedOut: result.timedOut,
        stdoutSha256: createHash('sha256').update(result.stdout).digest('hex'),
        stderrSha256: createHash('sha256').update(result.stderr).digest('hex'),
      }) });
      return { code: 200, data: { ...result, realExecution: true, runtime: terminalStatus() } };
    }



    if (url.pathname === '/api/companion/learn/status' && request.method === 'GET') {
      return { code: 200, data: { ok:true, learning: learning.stats(), reviews: learning.list() } };
    }
    if (url.pathname === '/api/companion/learn/text' && request.method === 'POST') {
      return { code: 200, data: { ok:true, review: await learning.reviewText(await payload(request)) } };
    }
    if (url.pathname === '/api/companion/learn/artifact' && request.method === 'POST') {
      return { code: 200, data: { ok:true, review: await learning.reviewArtifact(await payload(request)) } };
    }
    if (url.pathname === '/api/companion/learn/feedback' && request.method === 'POST') {
      return { code: 200, data: { ok:true, feedback: await learning.feedback(await payload(request)) } };
    }

    if (url.pathname === '/api/companion/library' && request.method === 'GET') {
      return {code:200,data:{ok:true,items:library.list({project:url.searchParams.get('project')||undefined})}};
    }
    if (url.pathname === '/api/companion/library/start' && request.method === 'POST') {
      return {code:201,data:{ok:true,...await library.begin(await payload(request))}};
    }
    if (url.pathname === '/api/companion/library/chunk' && request.method === 'POST') {
      // Raw binary. The upload is admitted only after SHA-256 identity is computed.
      return {code:200,data:{ok:true,...await library.chunk(url.searchParams.get('uploadId'),request)}};
    }
    if (url.pathname === '/api/companion/library/complete' && request.method === 'POST') {
      const data=await payload(request);
      return {code:201,data:{ok:true,artifact:await library.finish(data.uploadId)}};
    }
    if (url.pathname === '/api/companion/library/update' && request.method === 'POST') {
      return {code:200,data:{ok:true,artifact:await library.update(await payload(request))}};
    }
    if (url.pathname === '/api/companion/library/manifest' && request.method === 'GET') {
      return {code:200,data:{ok:true,manifest:library.buildManifest(url.searchParams.get('project'))}};
    }
    if (url.pathname === '/api/companion/library/download' && request.method === 'GET') {
      const item=await library.read(url.searchParams.get('address'));
      return {code:200,localFile:item};
    }

    if (url.pathname === '/api/companion/repos' && request.method === 'GET') {
      return { code: 200, data: { ok: true, ...await repos.list({ page: Number(url.searchParams.get('page') || 1) }) } };
    }
    if (url.pathname === '/api/companion/repos/watched' && request.method === 'GET') {
      return { code: 200, data: { ok: true, watched: repos.selected(), contexts: contexts.all() } };
    }
    if (url.pathname === '/api/companion/repos/select' && request.method === 'POST') {
      return { code: 200, data: { ok: true, ...await repos.select(await payload(request)) } };
    }
    if (url.pathname === '/api/companion/repos/refresh' && request.method === 'POST') {
      return { code: 200, data: { ok: true, ...await repos.refresh() } };
    }
    if (url.pathname === '/api/companion/repos/inspect' && request.method === 'GET') {
      const repository = url.searchParams.get('repository');
      return { code: 200, data: { ok: true, ...(await repos.inspect(repository)), context: contexts.one(repository) } };
    }
    if (url.pathname === '/api/companion/repos/context' && request.method === 'POST') {
      return { code: 201, data: { ok: true, context: await contexts.save(await payload(request)) } };
    }
    if (url.pathname === '/api/companion/repos/dispatch' && request.method === 'POST') {
      return { code: 202, data: { ok: true, ...await repos.dispatch(await payload(request)) } };
    }
    if (url.pathname === '/api/companion/repos/download' && request.method === 'GET') {
      return { code: 200, download: await repos.download({
        repository: url.searchParams.get('repository'),
        artifact: url.searchParams.get('artifact'),
      }) };
    }
    if (url.pathname === '/api/companion/github/status' && request.method === 'GET') {
      return { code: 200, data: { ok: true, ...github.status() } };
    }
    if (url.pathname === '/api/companion/github/config' && request.method === 'POST') {
      return { code: 200, data: { ok: true, ...await github.configure(await payload(request)) } };
    }
    if (url.pathname === '/api/companion/github/push' && request.method === 'POST') {
      return { code: 200, data: { ok: true, ...await github.push() } };
    }
    if (url.pathname === '/api/companion/github/pull' && request.method === 'POST') {
      return { code: 200, data: { ok: true, ...await github.pull() } };
    }
    return { code: 404, data: { ok: false, error: 'Unknown companion operation' } };
  }
  return Object.freeze({ handle, ledger, github });
}
