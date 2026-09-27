import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FederatedSynthia } from '../federated-synthia.mjs';
import { talkReply } from '../solo/talk-adapter.mjs';
import { SoloHoverRuntime } from '../solo/solo-runtime.mjs';

const UI_ROOT = fileURLToPath(new URL('../../ui/', import.meta.url));
const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
});

function stringify(value) {
  return JSON.stringify(value, (_key, member) => {
    if (typeof member === 'bigint') return member.toString();
    if (member instanceof Uint8Array) return { type: 'Uint8Array', length: member.length, values: [...member.slice(0, 256)] };
    if (member instanceof Map) return Object.fromEntries(member);
    if (member instanceof Set) return [...member];
    return member;
  });
}

function reply(response, status, value, contentType = 'application/json; charset=utf-8') {
  const body = contentType.startsWith('application/json') ? stringify(value) : value;
  response.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

async function bodyOf(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw new RangeError('request body exceeds 5 MiB');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function startSynthiaFrontScreen({
  port = Number(process.env.PORT ?? 4173),
  host = '127.0.0.1',
  synthia = null,
  persistenceDir = process.env.SYNTHIA_DATA_DIR ?? '.synthia-state',
} = {}) {
  const organism = synthia ?? await FederatedSynthia.create({ persistenceDir });
  const solo = new SoloHoverRuntime({ organism, persistenceDir });
  await solo.startTasks();
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'POST' && url.pathname === '/api/solo/talk/chat') {
        return reply(response, 200, await talkReply(await bodyOf(request)));
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/status') {
        return reply(response, 200, { ok: true, ...(await solo.status()) });
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/surface') {
        const body = await bodyOf(request);
        return reply(response, 200, { ok: true, surface: solo.setSurface(String(body.surface ?? 'chat')) });
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/tasks') {
        return reply(response, 200, { ok: true, tasks: await solo.tasks.list() });
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/tasks') {
        const body = await bodyOf(request);
        return reply(response, 200, { ok: true, task: await solo.tasks.add(body) });
      }
      if (request.method === 'POST' && /^\/api\/solo\/tasks\/[^/]+\/run$/.test(url.pathname)) {
        const id = decodeURIComponent(url.pathname.split('/')[4]);
        return reply(response, 200, { ok: true, task: await solo.queueTask(id) });
      }
      if (url.pathname.startsWith('/api/solo/tasks/') && ['PATCH','DELETE'].includes(request.method)) {
        const id = decodeURIComponent(url.pathname.slice('/api/solo/tasks/'.length));
        if (request.method === 'DELETE') return reply(response, 200, { ok: true, removed: await solo.tasks.remove(id) });
        const body = await bodyOf(request);
        return reply(response, 200, { ok: true, task: await solo.tasks.update(id, body) });
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/browser/status') {
        return reply(response, 200, { ok: true, ...solo.browser.status() });
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/browser') {
        return reply(response, 200, await solo.browser.bundle());
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/navigate') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.browser.navigate(body.url));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/back') {
        return reply(response, 200, await solo.browser.back());
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/forward') {
        return reply(response, 200, await solo.browser.forward());
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/reload') {
        return reply(response, 200, await solo.browser.reload());
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/click') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.browser.clickPoint(body.x, body.y));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/command') {
        const body = await bodyOf(request);
        const browserResult = await solo.browser.command(body.message ?? '');
        if (browserResult.action || browserResult.status !== 'NO_DIRECT_BROWSER_ACTION') return reply(response, 200, browserResult);
        const page = browserResult.page ?? null;
        const chat = await organism.chat(body.message ?? '', { ...(body.context ?? {}), surface: 'browser', browserPage: page ? { url: page.url, title: page.title, headings: page.headings, text: page.text?.slice(0, 4000) } : null });
        await organism.dnaPerception.flush();
        return reply(response, 200, { ...browserResult, action: 'chat-about-page', chat, dnaPerception: organism.dnaPerception.latest() });
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/morph') {
        const identity = organism.identityStatus();
        const morph = organism.morphState({}, { personId: identity?.personId ?? undefined, agentId: identity?.agentId ?? undefined, surface: 'browser' });
        return reply(response, 200, await solo.browser.morphPageFromPacket(morph));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/fill') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.browser.fillFields(body.values ?? {}));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/browser/submit') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.browser.submit({ confirmed: body.confirmed === true }));
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/android/status') {
        return reply(response, 200, { ok: true, ...(await solo.android.status()) });
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/android/screen') {
        return reply(response, 200, await solo.android.screen());
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/tap') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.tap(body.x, body.y));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/swipe') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.swipe(body.x1, body.y1, body.x2, body.y2, body.durationMs));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/scroll') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.scroll(body.direction ?? 'down'));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/click-text') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.clickText(body.text));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/type') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.typeText(body.text));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/global') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.global(body.action));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/open-app') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.openApp(body.packageName));
      }
      if (request.method === 'POST' && url.pathname === '/api/solo/android/command') {
        const body = await bodyOf(request);
        return reply(response, 200, await solo.android.command(body.message ?? ''));
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/world') {
        return reply(response, 200, {
          ok: true,
          status: organism.wiringAudit(),
          perception: organism.dnaPerception.snapshot(),
          morph: organism.canonicalMorph.snapshot(),
          temporalMesh: null,
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/solo/morph-state') {
        try {
          return reply(response, 200, { ok: true, morph: organism.morphState({}, { personId: organism.identityStatus()?.personId ?? undefined, agentId: organism.identityStatus()?.agentId ?? undefined }) });
        } catch (error) {
          return reply(response, 200, { ok: false, status: 'NOT_READY', error: error.message, morph: organism.canonicalMorph.snapshot() });
        }
      }
      if (request.method === 'GET' && url.pathname === '/api/status') {
        const audit = organism.wiringAudit();
        const identity = organism.identityStatus();
        const readyFields = [
          'oneSemanticEngine', 'localMeshCoordination',
          'independentHands', 'chatPipeline', 'executionAddressResolver',
          'executionTray', 'frontScreenSurface', 'exactAddressRecall',
          'fiveLevelStateSpaceLive', 'nineCenterBody', 'channelMeshBody',
          'semanticGenomeLive', 'persistentAspectPrimitives768',
          'nineCenterGenomeClusters', 'channelGenomeExchange', 'dnaPerceptionRuntime',
        ];
        const structurallyReady = readyFields.every((field) => audit[field] === true)
          && audit.federation?.links > 0
          && audit.localMeshes > 1;
        const ready = structurallyReady && identity.configured === true;
        return reply(response, 200, {
          ok: true,
          ready,
          structurallyReady,
          personalizedReady: identity.configured === true,
          auditComplete: audit.ok,
          feedbackCycleActivated: audit.autonomyLoop,
          identity: 'Synthia',
          purpose: 'cultivation',
          audit,
          identity,
          counts: {
            liveProcesses: audit.liveProcessCount,
            hands: audit.integratedHandCount,
            meshes: audit.localMeshes,
            channels: audit.channelBody.channelMeshes,
            centers: audit.centerBody.centers,
            instruments: organism.hands().stateSpaceInstruments.length,
            aspects: audit.semanticGenome.persistentAspectPrimitives,
            codons: audit.semanticGenome.hexagramCodons,
            dnaPerceptionObservations: audit.dnaPerception?.observations ?? 0,
          },
          dimensions: ['Movement', 'Evolution', 'Being', 'Design', 'Space'],
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/identity') {
        return reply(response, 200, { ok: true, identity: organism.identityStatus(), persistence: organism.persistenceStatus });
      }
      if (request.method === 'GET' && url.pathname === '/api/tray') {
        return reply(response, 200, { ok: true, instruments: organism.trayCatalog() });
      }
      if (request.method === 'GET' && url.pathname === '/api/channels') {
        return reply(response, 200, { ok: true, ...organism.channelBody.snapshot() });
      }
      if (request.method === 'GET' && url.pathname === '/api/perception') {
        return reply(response, 200, { ok: true, ...organism.dnaPerception.snapshot() });
      }
      if (request.method === 'GET' && url.pathname === '/api/genome') {
        return reply(response, 200, {
          ok: true,
          snapshot: organism.semanticGenome.snapshot({ includeCodons: url.searchParams.get('codons') === 'true' }),
          catalog: organism.semanticGenome.catalog(),
          recent: organism.semanticGenome.history.slice(-8),
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/proposals') {
        return reply(response, 200, {
          ok: true,
          audit: organism.system.proposals.audit(),
          proposals: organism.system.proposals.records,
        });
      }
      if (request.method === 'POST' && url.pathname === '/api/chat') {
        const body = await bodyOf(request);
        const result = await organism.chat(body.message ?? '', body.context ?? {});
        await organism.dnaPerception.flush();
        return reply(response, 200, { ...result, dnaPerception: organism.dnaPerception.latest() });
      }
      if (request.method === 'POST' && url.pathname === '/api/identity/configure') {
        const body = await bodyOf(request);
        return reply(response, 200, await organism.configureBirthMirror(body));
      }
      if (request.method === 'POST' && url.pathname === '/api/execute') {
        const body = await bodyOf(request);
        const result = await organism.executeArtifact(body.artifact ?? body, body.context ?? {});
        await organism.dnaPerception.flush();
        return reply(response, 200, { ...result, dnaPerception: organism.dnaPerception.latest() });
      }
      if (request.method === 'POST' && url.pathname === '/api/tray') {
        const result = await organism.executeTray(await bodyOf(request));
        await organism.dnaPerception.flush();
        return reply(response, 200, { ...result, dnaPerception: organism.dnaPerception.latest() });
      }
      if (request.method === 'POST' && url.pathname === '/api/genome') {
        const body = await bodyOf(request);
        const result = organism.semanticGenome.run(body.input ?? body, body.context ?? {});
        await organism.dnaPerception.flush();
        await organism.flushPersistence();
        return reply(response, 200, {
          ok: true,
          result,
          dnaPerception: organism.dnaPerception.latest(),
          persistence: organism.persistenceStatus,
        });
      }
      if (request.method === 'POST' && url.pathname === '/api/proposals') {
        const body = await bodyOf(request);
        const result = body.operation === 'accept'
          ? organism.system.proposals.accept(body.proposalId, { actor: 'user' })
          : body.operation === 'dismiss'
            ? organism.system.proposals.dismiss(body.proposalId, body.reason, { actor: 'user' })
            : body.operation === 'rollback'
              ? organism.system.proposals.rollback(body.proposalId)
              : { ok: false, error: 'unknown proposal operation' };
        return reply(response, result.ok === false ? 400 : 200, result);
      }
      if (request.method !== 'GET') return reply(response, 405, { ok: false, error: 'method not allowed' });
      const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (!/^[a-zA-Z0-9._/-]+$/.test(requested) || requested.includes('..')) {
        return reply(response, 400, { ok: false, error: 'invalid path' });
      }
      const bytes = await readFile(join(UI_ROOT, requested));
      return reply(response, 200, bytes, MIME[extname(requested)] ?? 'application/octet-stream');
    } catch (error) {
      const status = error?.code === 'ENOENT' ? 404
        : ['BIRTH_CONFIGURATION_REQUIRED', 'BIRTH_CONFIGURATION_SCOPE_MISMATCH'].includes(error?.code) ? 409
          : error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError ? 400 : 500;
      return reply(response, status, { ok: false, error: error.message, code: error.code ?? null });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  server.on('close', () => { solo.stopTasks(); solo.browser.close().catch(() => {}); });
  const address = server.address();
  const actualPort = typeof address === 'object' ? address.port : port;
  return Object.freeze({ server, synthia: organism, solo, url: `http://${host}:${actualPort}` });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const started = await startSynthiaFrontScreen();
  console.log(`Synthia front screen: ${started.url}`);
}

export default startSynthiaFrontScreen;
