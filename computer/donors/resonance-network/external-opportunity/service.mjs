import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createExternalRelationshipOrganism } from './core/src/index.js';
import { McpStreamableHttpClient } from './mcp-http-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { SynthiaToolbox, McpStdioClient } = require('./vendor/synthia-toolbox-cjs/index.js');

const PORT = Number(process.env.SYNTHIA_OPPORTUNITY_PORT || 8812);
const STATE_DIR = process.env.SYNTHIA_OPPORTUNITY_STATE_DIR || path.join(__dirname, 'state');
const STATE_FILE = path.join(STATE_DIR, 'external-opportunity-state.json');
const SECRET_FILE = path.join(STATE_DIR, 'consent-secret.txt');
const CONFIG_FILE = process.env.SYNTHIA_MCP_SERVERS_FILE || path.join(__dirname, 'config', 'mcp-servers.json');
const ALLOWED_PACKAGES = String(process.env.SYNTHIA_ALLOWED_PACKAGES || 'synthia-lite,synthia-computer')
  .split(',').map(s => s.trim()).filter(Boolean);

fs.mkdirSync(STATE_DIR, { recursive: true });

function loadJsonFile(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function loadConfig() {
  if (process.env.SYNTHIA_MCP_SERVERS_JSON) {
    return JSON.parse(process.env.SYNTHIA_MCP_SERVERS_JSON);
  }
  return loadJsonFile(CONFIG_FILE, { servers: [] });
}
function loadOrCreateSecret() {
  if (process.env.SYNTHIA_CONSENT_SECRET) return process.env.SYNTHIA_CONSENT_SECRET;
  try { return fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch {}
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}
function jsonText(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = (result?.content || []).filter(x => x?.type === 'text').map(x => x.text || '').join('\n').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { text }; }
}
function asCandidateArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  for (const key of ['candidates','opportunities','results','matches']) if (Array.isArray(data[key])) return data[key];
  if (data.candidate) return [data.candidate];
  return [];
}
function buildDiscoveryArgs(tool, need) {
  const props = tool.inputSchema?.properties || {};
  const args = {};
  if ('need' in props) args.need = need;
  if ('query' in props) args.query = need.description || '';
  if ('description' in props) args.description = need.description || '';
  if ('requiredCapabilities' in props) args.requiredCapabilities = need.requiredCapabilities || [];
  if ('capabilities' in props) args.capabilities = need.requiredCapabilities || [];
  if ('urgency' in props) args.urgency = need.urgency ?? 0.5;
  if ('owner' in props) args.owner = need.owner || 'resonance-network';
  if (!Object.keys(args).length) args.need = need;
  return args;
}

class MCPExternalResolver {
  constructor(toolbox, configs) { this.toolbox = toolbox; this.configs = new Map(configs.map(c => [c.id,c])); }
  async resolve(need) {
    const candidates = [];
    const errors = [];
    for (const cfg of this.configs.values()) {
      let tools = this.toolbox.listTools({ serverId: cfg.id });
      const wanted = new Set(cfg.discoveryTools || ['find_opportunities','search_opportunities','find_providers','capability_match']);
      tools = tools.filter(t => wanted.has(t.originalName) || t.inputSchema?.properties?.need || /opportun|provider|capabil|match/i.test(`${t.originalName} ${t.description}`));
      for (const tool of tools) {
        try {
          const preview = this.toolbox.previewCall({ tool: tool.name, arguments: buildDiscoveryArgs(tool, need) });
          if (preview.requiresApproval) continue; // discovery must be read-only
          const result = await this.toolbox.call({
            tool: tool.name,
            task: `Discover external opportunity for: ${need.description || 'capability need'}`,
            arguments: buildDiscoveryArgs(tool, need),
            context: { source: 'resonance-network', need }
          });
          const parsed = jsonText(result);
          for (const raw of asCandidateArray(parsed)) {
            const availableCapabilities = raw.availableCapabilities || raw.capabilities || raw.offers || [];
            candidates.push({
              ...raw,
              id: raw.id || `${cfg.id}:${raw.name || raw.organization || crypto.randomUUID()}`,
              type: raw.type || 'external_mcp_participant',
              name: raw.name || raw.organization || cfg.name || cfg.id,
              availableCapabilities: Array.isArray(availableCapabilities) ? availableCapabilities : [availableCapabilities].filter(Boolean),
              source: 'mcp',
              mcpServerId: cfg.id,
              discoveryTool: tool.name,
              invitationTool: raw.invitationTool || cfg.invitationTool || null,
              installationTool: raw.installationTool || cfg.installationTool || null,
              publicOrAuthorizedContext: raw.publicOrAuthorizedContext || `Authorized MCP server ${cfg.id}`,
              networkMember: false
            });
          }
        } catch (error) {
          errors.push({ serverId: cfg.id, tool: tool.name, error: error?.message || String(error) });
        }
      }
    }
    return { satisfied: candidates.length > 0, candidates, errors };
  }
}

class MCPInvitationTransport {
  constructor(toolbox, responseTokenFor) { this.toolbox = toolbox; this.responseTokenFor = responseTokenFor; }
  async send({ candidate, message, opportunityId }) {
    const tool = candidate?.invitationTool;
    if (!tool) return { ok: false, error: 'External candidate has no MCP invitation tool' };
    try {
      const result = await this.toolbox.call({
        tool,
        task: `Send one consent-gated opportunity invitation ${opportunityId}`,
        approve: true,
        arguments: { opportunityId, message, candidateId: candidate.id, responseToken: this.responseTokenFor(opportunityId), callbackUrl: process.env.SYNTHIA_PUBLIC_OPPORTUNITY_BASE_URL ? `${process.env.SYNTHIA_PUBLIC_OPPORTUNITY_BASE_URL.replace(/\/$/, '')}/api/opportunities/respond` : null },
        context: { opportunityId, candidate: { id: candidate.id, name: candidate.name } }
      });
      return { ok: result.isError !== true, ref: result.delegationId, result };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  }
}

class MCPProvisioner {
  constructor(toolbox, opportunityLookup) { this.toolbox = toolbox; this.opportunityLookup = opportunityLookup; }
  async deploy(plan) {
    const opportunity = this.opportunityLookup(plan.opportunityId);
    const tool = plan.installationTool || opportunity?.candidate?.installationTool;
    if (!tool) return { ok: false, error: 'No authorized MCP installation/onboarding tool is available' };
    const result = await this.toolbox.call({
      tool,
      task: `Offer/install Synthia for consented opportunity ${plan.opportunityId}`,
      approve: true,
      arguments: { ...plan, consentId: plan.consentId },
      context: { opportunityId: plan.opportunityId, deviceOwnerId: plan.deviceOwnerId }
    });
    return { ok: result.isError !== true, runtimeId: result.delegationId, result };
  }
}

const config = loadConfig();
const serverConfigs = Array.isArray(config.servers) ? config.servers : [];
const toolbox = new SynthiaToolbox({
  policy: { allowedServers: serverConfigs.map(s => s.id), allowDestructive: false }
});
const connectionStatus = [];
for (const cfg of serverConfigs) {
  let client;
  if (cfg.transport === 'stdio') {
    client = new McpStdioClient({ command: cfg.command, args: cfg.args || [], env: cfg.env || {}, cwd: cfg.cwd, stderr: cfg.stderr || 'inherit' });
  } else if (cfg.transport === 'http' || cfg.transport === 'streamable-http') {
    client = new McpStreamableHttpClient({ url: cfg.url, headers: cfg.headers || {}, headerEnv: cfg.headerEnv || {}, requestTimeoutMs: cfg.requestTimeoutMs || 10000 });
  } else {
    connectionStatus.push({ id: cfg.id, connected: false, error: `Unsupported transport ${cfg.transport}` });
    continue;
  }
  await toolbox.addServer({
    id: cfg.id,
    name: cfg.name || cfg.id,
    client,
    metadata: cfg.metadata || {}
  });
  try {
    const tools = await toolbox.connect(cfg.id);
    connectionStatus.push({ id: cfg.id, connected: true, tools: tools.map(t => t.name) });
  } catch (error) {
    connectionStatus.push({ id: cfg.id, connected: false, error: error?.message || String(error) });
  }
}

async function refreshMcpConnections() {
  for (const cfg of serverConfigs) {
    const status = connectionStatus.find(s => s.id === cfg.id);
    if (status?.connected) continue;
    try {
      const tools = await toolbox.connect(cfg.id);
      const next = { id: cfg.id, connected: true, tools: tools.map(t => t.name) };
      const idx = connectionStatus.findIndex(s => s.id === cfg.id);
      if (idx >= 0) connectionStatus[idx] = next; else connectionStatus.push(next);
    } catch (error) {
      const next = { id: cfg.id, connected: false, error: error?.message || String(error) };
      const idx = connectionStatus.findIndex(s => s.id === cfg.id);
      if (idx >= 0) connectionStatus[idx] = next; else connectionStatus.push(next);
    }
  }
}

const opportunities = new Map();
const responseTokenHashes = new Map();
const responseTokensForDelivery = new Map();
const mcpResolver = new MCPExternalResolver(toolbox, serverConfigs);
let system;
const provisioner = new MCPProvisioner(toolbox, id => opportunities.get(id));
system = createExternalRelationshipOrganism({
  mcpResolver,
  transports: { mcp: new MCPInvitationTransport(toolbox, id => responseTokensForDelivery.get(id) || null) },
  channelPolicy: (source, context) => source === 'mcp' && Boolean(context),
  provisioner,
  allowedPackages: ALLOWED_PACKAGES,
  consentSecret: loadOrCreateSecret(),
  minimumMutualBenefit: Number(process.env.SYNTHIA_MIN_MUTUAL_BENEFIT || 0.55)
});

function restoreState() {
  const saved = loadJsonFile(STATE_FILE, null);
  if (!saved) return;
  for (const opp of saved.opportunities || []) opportunities.set(opp.opportunityId, opp);
  for (const [id, hash] of saved.responseTokenHashes || []) responseTokenHashes.set(id, hash);
  system.ledger.entries = (saved.ledgerEntries || []).map(e => Object.freeze({ ...e, payload: Object.freeze(e.payload || {}) }));
  system.ledger.byId = new Map();
  for (const e of system.ledger.entries) {
    const arr = system.ledger.byId.get(e.opportunityId) || [];
    arr.push(e); system.ledger.byId.set(e.opportunityId, arr);
  }
  system.consent.records = new Map(saved.consentRecords || []);
}
function persistState() {
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({
    opportunities: [...opportunities.values()],
    ledgerEntries: system.ledger.entries,
    consentRecords: [...system.consent.records.entries()],
    responseTokenHashes: [...responseTokenHashes.entries()]
  }, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}
restoreState();

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) });
  res.end(data);
}
function getOpportunity(id) {
  const opp = opportunities.get(id);
  if (!opp) throw Object.assign(new Error(`Unknown opportunity ${id}`), { statusCode: 404 });
  return opp;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { status: 'ok', service: 'synthia-mcp-opportunity-consent', connections: connectionStatus, ledgerVerified: system.ledger.verify(), opportunityCount: opportunities.size });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/history/')) {
      const id = decodeURIComponent(url.pathname.slice('/history/'.length));
      return send(res, 200, { opportunityId: id, history: system.ledger.history(id) });
    }
    const body = await readBody(req);
    if (req.method === 'POST' && url.pathname === '/discover') {
      const need = body.need || {};
      await refreshMcpConnections();
      const resolution = await system.orchestrator.find(need);
      const rawCandidates = resolution?.result?.candidates || [];
      const created = [];
      for (const candidate of rawCandidates) {
        const evidence = body.evidence?.length ? body.evidence : [{ relevance: 0.75, confidence: 0.75, source: `MCP:${candidate.mcpServerId}` }];
        const opp = system.orchestrator.createOpportunity({ need, candidate, networkOffer: body.networkOffer || [], evidence });
        opportunities.set(opp.opportunityId, opp);
        created.push(opp);
      }
      persistState();
      return send(res, 200, { layer: resolution.layer, opportunities: created, attempts: resolution.attempts?.map(a => ({ layer: a.layer, candidateCount: a.result?.candidates?.length || 0, satisfied: Boolean(a.result?.satisfied) })) || [] });
    }
    if (req.method === 'POST' && url.pathname === '/invite') {
      const opp = getOpportunity(body.opportunityId);
      const responseToken = crypto.randomBytes(32).toString('base64url');
      responseTokensForDelivery.set(opp.opportunityId, responseToken);
      responseTokenHashes.set(opp.opportunityId, crypto.createHash('sha256').update(responseToken).digest('hex'));
      const result = await system.orchestrator.invite(opp, { channel: body.channel || 'mcp', message: body.message || `Resonance Network opportunity: ${opp.need?.description || ''}` });
      responseTokensForDelivery.delete(opp.opportunityId);
      if (!result.sent) responseTokenHashes.delete(opp.opportunityId);
      persistState(); return send(res, result.sent ? 200 : 409, result);
    }
    if (req.method === 'POST' && url.pathname === '/respond') {
      const opp = getOpportunity(body.opportunityId);
      const expected = responseTokenHashes.get(opp.opportunityId);
      const actual = body.responseToken ? crypto.createHash('sha256').update(String(body.responseToken)).digest('hex') : null;
      if (!expected || !actual || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
        throw Object.assign(new Error('External response is not authorized for this invitation'), { statusCode: 403 });
      }
      if (body.response === 'accepted') {
        const grant = system.orchestrator.acceptCollaboration(opp, body.subjectId || opp.candidate?.id, body.scope || ['collaboration']);
        responseTokenHashes.delete(opp.opportunityId);
        persistState(); return send(res, 200, { response: 'accepted', collaborationConsent: grant });
      }
      if (body.response === 'declined') system.orchestrator.decline(body.opportunityId);
      else if (body.response === 'expired') system.orchestrator.expire(body.opportunityId);
      else throw Object.assign(new Error('response must be accepted, declined, or expired'), { statusCode: 400 });
      responseTokenHashes.delete(opp.opportunityId);
      persistState(); return send(res, 200, { response: body.response });
    }
    if (req.method === 'POST' && url.pathname === '/install/approve') {
      const opp = getOpportunity(body.opportunityId);
      const collab = system.consent.verify(body.collaborationConsentToken, { kind: 'collaboration' });
      if (!collab.valid || collab.record.subjectId !== (body.subjectId || opp.candidate?.id)) {
        throw Object.assign(new Error(`Installation offer blocked: ${collab.reason || 'collaboration consent subject mismatch'}`), { statusCode: 403 });
      }
      const grant = system.orchestrator.approveInstall(opp.opportunityId, body.subjectId || opp.candidate?.id, body.scope || ['local_runtime']);
      persistState(); return send(res, 200, grant);
    }
    if (req.method === 'POST' && url.pathname === '/install/deploy') {
      const opp = getOpportunity(body.opportunityId);
      const plan = {
        opportunityId: opp.opportunityId,
        deviceOwnerId: body.deviceOwnerId || opp.candidate?.id,
        packageId: body.packageId || 'synthia-lite',
        requiredScopes: body.requiredScopes || ['local_runtime'],
        installationTool: body.installationTool || opp.candidate?.installationTool
      };
      const result = await system.deployment.deploy(plan, body.installationConsentToken);
      persistState(); return send(res, result.ok ? 200 : 502, result);
    }
    if (req.method === 'POST' && url.pathname === '/outcome') {
      const opp = getOpportunity(body.opportunityId);
      const outcome = await system.orchestrator.recordOutcome(opp, body.outcome || {});
      persistState(); return send(res, 200, { opportunityId: opp.opportunityId, outcome });
    }
    return send(res, 404, { error: 'not found' });
  } catch (error) {
    return send(res, error?.statusCode || 500, { error: error?.message || String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[external-opportunity] listening on http://127.0.0.1:${PORT}; MCP servers=${serverConfigs.length}`);
});

for (const sig of ['SIGINT','SIGTERM']) process.on(sig, async () => { try { persistState(); await toolbox.close(); } finally { server.close(() => process.exit(0)); } });
