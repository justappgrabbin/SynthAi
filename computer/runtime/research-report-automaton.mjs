const clone = value => value === undefined ? undefined : structuredClone(value);

export const RESEARCH_REPORT_STAGES = Object.freeze([
  ['research-scout', 'ResearchScout'],
  ['evidence-miner', 'EvidenceMiner'],
  ['scientist-loop', 'ScientistLoop'],
  ['report-planner', 'ReportPlanner'],
  ['report-writer', 'ReportWriter'],
  ['report-verifier', 'ReportVerifier'],
  ['publisher', 'Publisher'],
]);

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
}

function digest(value) {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return 'fnv1a32:' + hash.toString(16).padStart(8, '0');
}

function slug(value, fallback) {
  const normalized = String(value ?? '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || fallback;
}

function normalizeSource(source, index) {
  const content = String(source?.content ?? source?.text ?? '').trim();
  if (!content) return null;
  const id = String(source?.id ?? slug(source?.title, 'source-' + (index + 1)));
  return {
    id,
    title: String(source?.title ?? id),
    url: source?.url ? String(source.url) : null,
    kind: String(source?.kind ?? 'local'),
    content,
    contentDigest: digest(content),
    provenance: clone(source?.provenance ?? {}),
  };
}

function packet(input = {}) {
  if (input?.schema === 'synthia.research-report-run/v1') return clone(input);
  const request = clone(input?.request ?? input);
  return {
    schema: 'synthia.research-report-run/v1',
    version: '0.1.0',
    request: {
      query: String(request?.query ?? '').trim(),
      title: String(request?.title ?? request?.query ?? 'Research report').trim(),
      sources: Array.isArray(request?.sources) ? clone(request.sources) : [],
      claims: Array.isArray(request?.claims) ? clone(request.claims) : [],
    },
    sources: [],
    evidence: [],
    findings: [],
    rejectedClaims: [],
    plan: null,
    draft: null,
    verification: null,
    publication: null,
    warnings: [],
    trace: [],
  };
}

function traced(value, stage, at) {
  value.trace.push({ stage, at, stateDigest: digest({
    sources: value.sources,
    evidence: value.evidence,
    findings: value.findings,
    rejectedClaims: value.rejectedClaims,
    plan: value.plan,
    draft: value.draft,
    verification: value.verification,
  }) });
  return value;
}

export function detectSynthiaResearchBridge(scope = globalThis) {
  const bridge = scope?.SynthiaResearchBridge;
  if (!bridge) return null;
  if (typeof bridge.research === 'function' || typeof bridge.search === 'function') return bridge;
  return null;
}

export class ResearchReportAutomaton {
  constructor({ bridge = detectSynthiaResearchBridge(), clock = () => Date.now() } = {}) {
    this.bridge = bridge;
    this.clock = clock;
  }

  async execute(operation, input = {}, context = {}) {
    const value = packet(input);
    switch (operation) {
      case 'research-scout': return this.researchScout(value, context);
      case 'evidence-miner': return this.evidenceMiner(value);
      case 'scientist-loop': return this.scientistLoop(value);
      case 'report-planner': return this.reportPlanner(value);
      case 'report-writer': return this.reportWriter(value);
      case 'report-verifier': return this.reportVerifier(value);
      case 'publisher': return this.publisher(value);
      default: throw new Error('unsupported research-report operation: ' + operation);
    }
  }

  async researchScout(input, context = {}) {
    const value = packet(input);
    const gathered = [...value.request.sources];
    if (value.request.query && this.bridge) {
      const search = this.bridge.research ?? this.bridge.search;
      const response = await search.call(this.bridge, {
        query: value.request.query,
        context: clone(context),
      });
      const bridgeSources = Array.isArray(response) ? response : response?.sources;
      if (Array.isArray(bridgeSources)) gathered.push(...bridgeSources.map(source => ({
        ...source,
        kind: source?.kind ?? 'synthia-research-bridge',
        provenance: { ...(source?.provenance ?? {}), bridge: true },
      })));
    }
    const seen = new Set();
    value.sources = gathered.map(normalizeSource).filter(source => {
      if (!source || seen.has(source.id)) return false;
      seen.add(source.id);
      return true;
    });
    if (!value.sources.length) value.warnings.push('NO_RESEARCH_SOURCES');
    return traced(value, 'ResearchScout', this.clock());
  }

  evidenceMiner(input) {
    const value = packet(input);
    value.evidence = value.sources.flatMap(source => {
      const parts = source.content.split(/(?<=[.!?])\s+|\n+/).map(item => item.trim()).filter(Boolean);
      return parts.slice(0, 50).map((excerpt, index) => ({
        id: `evidence:${source.id}:${index + 1}`,
        sourceId: source.id,
        excerpt,
        location: { segment: index + 1 },
        evidenceClass: 'observed-source-text',
      }));
    });
    return traced(value, 'EvidenceMiner', this.clock());
  }

  scientistLoop(input) {
    const value = packet(input);
    const evidenceIds = new Set(value.evidence.map(item => item.id));
    const bySource = new Map();
    for (const item of value.evidence) {
      if (!bySource.has(item.sourceId)) bySource.set(item.sourceId, []);
      bySource.get(item.sourceId).push(item.id);
    }
    const claims = value.request.claims.map((claim, index) => {
      const ids = new Set((Array.isArray(claim?.evidenceIds) ? claim.evidenceIds : []).map(String));
      for (const sourceId of Array.isArray(claim?.sourceIds) ? claim.sourceIds : []) {
        for (const id of bySource.get(String(sourceId)) ?? []) ids.add(id);
      }
      const valid = [...ids].filter(id => evidenceIds.has(id));
      return {
        id: String(claim?.id ?? 'claim-' + (index + 1)),
        text: String(claim?.text ?? '').trim(),
        evidenceIds: valid,
        classification: valid.length ? 'source-supported' : 'unsupported',
      };
    }).filter(claim => claim.text);
    value.findings = claims.filter(claim => claim.classification === 'source-supported');
    value.rejectedClaims = claims.filter(claim => claim.classification === 'unsupported');
    if (value.rejectedClaims.length) value.warnings.push('UNSUPPORTED_CLAIMS_EXCLUDED');
    return traced(value, 'ScientistLoop', this.clock());
  }

  reportPlanner(input) {
    const value = packet(input);
    value.plan = {
      title: value.request.title,
      sections: ['Overview', 'Evidence', 'Findings', 'Limitations', 'Sources'],
      findingIds: value.findings.map(item => item.id),
      rejectedClaimIds: value.rejectedClaims.map(item => item.id),
    };
    return traced(value, 'ReportPlanner', this.clock());
  }

  reportWriter(input) {
    const value = packet(input);
    if (!value.plan) throw new Error('ReportPlanner output required');
    const sourceMap = new Map(value.sources.map(source => [source.id, source]));
    const evidenceMap = new Map(value.evidence.map(item => [item.id, item]));
    const lines = [`# ${value.plan.title}`, '', '## Overview',
      value.request.query ? `Research question: ${value.request.query}` : 'Research compiled from supplied sources.',
      '', '## Evidence'];
    for (const item of value.evidence) lines.push(`- ${item.excerpt} [source:${item.sourceId}]`);
    lines.push('', '## Findings');
    if (!value.findings.length) lines.push('- No source-supported claims were supplied.');
    for (const finding of value.findings) {
      const citations = [...new Set(finding.evidenceIds.map(id => evidenceMap.get(id)?.sourceId).filter(id => sourceMap.has(id)))];
      lines.push(`- ${finding.text} ${citations.map(id => `[source:${id}]`).join(' ')}`);
    }
    lines.push('', '## Limitations');
    if (!value.rejectedClaims.length && !value.warnings.length) lines.push('- No pipeline limitations recorded.');
    for (const claim of value.rejectedClaims) lines.push(`- Excluded unsupported claim: ${claim.text}`);
    for (const warning of [...new Set(value.warnings)]) lines.push(`- ${warning}`);
    lines.push('', '## Sources');
    for (const source of value.sources) lines.push(`- [source:${source.id}] ${source.title}${source.url ? ' — ' + source.url : ''}`);
    value.draft = lines.join('\n');
    return traced(value, 'ReportWriter', this.clock());
  }

  reportVerifier(input) {
    const value = packet(input);
    const known = new Set(value.sources.map(source => source.id));
    const cited = [...String(value.draft ?? '').matchAll(/\[source:([^\]]+)\]/g)].map(match => match[1]);
    const missingCitations = [...new Set(cited.filter(id => !known.has(id)))];
    const uncitedFindings = value.findings.filter(finding => !finding.evidenceIds.length).map(finding => finding.id);
    value.verification = {
      passed: value.sources.length > 0 && Boolean(value.draft) && !missingCitations.length && !uncitedFindings.length,
      checks: {
        hasSources: value.sources.length > 0,
        hasDraft: Boolean(value.draft),
        citedSourcesExist: !missingCitations.length,
        findingsHaveEvidence: !uncitedFindings.length,
        unsupportedClaimsExcluded: value.rejectedClaims.every(claim => !value.findings.some(item => item.id === claim.id)),
      },
      missingCitations,
      uncitedFindings,
      verifiedAt: this.clock(),
    };
    return traced(value, 'ReportVerifier', this.clock());
  }

  publisher(input) {
    const value = packet(input);
    if (!value.verification?.passed) throw new Error('report verification required before publication');
    value.publication = {
      schema: 'synthia.research-report-publication/v1',
      title: value.plan.title,
      mimeType: 'text/markdown',
      content: value.draft,
      contentDigest: digest(value.draft),
      sourceIds: value.sources.map(source => source.id),
      findingIds: value.findings.map(finding => finding.id),
      publishedAt: this.clock(),
      acceptance: 'statically-verified-not-user-accepted',
    };
    return traced(value, 'Publisher', this.clock());
  }

  async run(request, context = {}) {
    let value = packet(request);
    for (const [operation] of RESEARCH_REPORT_STAGES) value = await this.execute(operation, value, context);
    return value;
  }
}

export function researchReportCartridgeManifest() {
  return {
    id: 'research-report-automaton-v0.1.0',
    name: 'ResearchReportAutomaton',
    version: '0.1.0',
    capability: 'research.report',
    priority: 58,
    dependencies: [],
    health: { maxConsecutiveFailures: 1 },
    provenance: {
      lineage: 'additive bounded automata cartridge',
      protectedPrime58Modified: false,
      lifeProcessSwarmRepurposed: false,
    },
    automata: RESEARCH_REPORT_STAGES.map(([operation, name]) => ({
      id: 'research-report:' + operation,
      name,
      capabilities: ['research.report', 'research.report.' + operation],
      runner: {
        kind: 'mesh',
        target: 'system:research-report',
        operation,
        payload: {},
      },
    })),
  };
}

export default ResearchReportAutomaton;

