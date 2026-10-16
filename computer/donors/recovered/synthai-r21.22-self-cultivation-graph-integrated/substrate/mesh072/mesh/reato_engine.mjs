import { ATORecall } from './ato_recall.mjs';
import { FIVE_FIELDS, completeFiveFieldState, meanFiveFieldStates, fieldsFromCapabilities } from '../core/five_field_state.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const safe = value => String(value ?? '').replace(/[^a-zA-Z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '') || 'trace';

function tokens(value) {
  return [...new Set(String(value ?? '').toLowerCase().match(/[a-z0-9][a-z0-9_-]{1,}/g) || [])];
}

function compactAddress(nodes = []) {
  const out = {};
  const keys = ['planet','dimension','gate','line','color','tone','base','degree','minute','second','arc','zodiac','house','task','stepKey','toolId','capability'];
  for (const key of keys) {
    const values = [...new Set(nodes.map(node => node?.address?.[key]).filter(value => value !== undefined && value !== null).map(String))];
    if (values.length === 1) out[key] = values[0];
  }
  return out;
}

function semanticKeys(nodes = [], cue = '') {
  const all = new Set(tokens(cue));
  for (const node of nodes) {
    for (const token of tokens([node?.kind,node?.text,JSON.stringify(node?.address || {}),JSON.stringify(node?.attributes || {})].join(' '))) all.add(token);
  }
  return [...all].slice(0,96);
}

function epistemic(node) {
  return String(node?.attributes?.epistemicStatus || node?.attributes?.epistemic_status || 'recorded');
}

/**
 * ReATO is the reconstructive face of ATO.
 * It never fabricates a remembered fact. It reconstructs a minimum working
 * neighborhood from recorded mesh anchors, derived relations and explicitly
 * marked semantic-completion candidates.
 */
export class ReATOEngine {
  constructor(mesh, { ato = null, recall = null, functional = null } = {}) {
    if (!mesh?.addState || !mesh?.neighborhood) throw new TypeError('ReATO requires an EmergentMesh');
    this.mesh = mesh;
    this.ato = ato;
    this.recall = recall || new ATORecall(mesh, ato);
    this.functional = functional;
    this.seq = 0;
  }

  attachFunctional(functional) { this.functional = functional; return this; }

  shouldReconstruct(cue, context = {}) {
    if (context?.trace || context?.compressedTrace || context?.reconstruct === true || context?.resume === true) return true;
    return /\b(continue|resume|restore|reconstruct|remember|recall|pick up|where (?:we|i) left|install yourself|rebuild yourself|recover|previous|checkpoint)\b/i.test(String(cue || ''));
  }

  compress({ sourceIds = [], cue = '', id = null, residency = 'warm', provenance = [], attributes = {} } = {}) {
    const sources = [...new Set(sourceIds)].map(sourceId => this.mesh.node(sourceId)).filter(Boolean);
    if (!sources.length) throw new Error('ReATO compression requires at least one existing mesh source');
    const fields = meanFiveFieldStates(sources.map(node => node.fields));
    const anchors = sources.map(node => ({
      id: node.id,
      kind: node.kind,
      epistemicStatus: epistemic(node),
      residency: node.attributes?.residency || null,
    }));
    const traceId = id || `reato-trace:${++this.mesh.seq}:${safe(cue).slice(0,48)}`;
    const payload = Object.freeze({
      version: 1,
      kind: 'reato-compressed-trace',
      cue: String(cue || sources.map(node => node.text || node.kind).join(' ')).trim(),
      fields: clone(fields),
      address: compactAddress(sources),
      anchors,
      semanticKeys: semanticKeys(sources, cue),
      provenance: [...new Set([...provenance, ...sources.flatMap(node => node.provenance || [])])],
      createdFrom: sources.map(node => node.id),
    });

    const node = this.mesh.addState({
      id: traceId,
      kind: 'compressed-trace',
      scale: 'memory',
      text: payload.cue || 'compressed 5D trace',
      fields,
      address: { ...payload.address, reato: true, canonicalAddressStatus: 'trace-derived' },
      source: { type: 'reato', operation: 'compress' },
      residency,
      provenance: payload.provenance,
      attributes: {
        payload,
        epistemicStatus: 'derived',
        compression: 'five-field-semantic-trace',
        sourceCount: sources.length,
        ...attributes,
      },
    });
    for (const source of sources) {
      this.mesh.addEdge({ from: node.id, to: source.id, type: 'trace-anchor', status: 'derived', evidence: payload.provenance, dedupe: true });
    }
    return Object.freeze({ trace: payload, nodeId: node.id });
  }

  _normalizeTrace(traceOrCue) {
    if (typeof traceOrCue === 'string') return { cue: traceOrCue };
    if (traceOrCue?.trace) return clone(traceOrCue.trace);
    if (traceOrCue?.attributes?.payload) return clone(traceOrCue.attributes.payload);
    return clone(traceOrCue || {});
  }

  reconstruct(traceOrCue, { cue = null, hops = 2, maxNodes = 64, hydrate = true, record = true, kinds = null } = {}) {
    const trace = this._normalizeTrace(traceOrCue);
    const resolvedCue = String(cue ?? trace.cue ?? '').trim();
    const anchorIds = [...new Set((trace.anchors || []).map(anchor => anchor.id).filter(id => this.mesh.node(id)))];
    const nodeMap = new Map();
    const edgeMap = new Map();

    for (const anchorId of anchorIds) {
      const neighborhood = this.mesh.neighborhood(anchorId, { hops, maxNodes });
      for (const node of neighborhood.nodes) nodeMap.set(node.id, node);
      for (const edge of neighborhood.edges) edgeMap.set(edge.id, edge);
      if (hydrate) this.mesh.setResidency(anchorId, 'hot');
    }

    const recall = this.recall.recall(resolvedCue, {
      address: trace.address || null,
      fields: trace.fields || null,
      kinds,
      hops,
      maxSeeds: anchorIds.length ? 2 : 5,
      maxNodes,
      hydrate,
    });
    for (const node of recall.nodes) nodeMap.set(node.id, node);
    for (const edge of recall.edges) edgeMap.set(edge.id, edge);

    const nodes = [...nodeMap.values()].slice(0, maxNodes);
    const requestedCapabilities = this.functional?.activeRouter?.route?.(resolvedCue, {}) || [];
    const capabilityNodes = [];
    for (const capability of requestedCapabilities) {
      const id = `capability:${String(capability).replace(/[^a-zA-Z0-9._:-]+/g,'-')}`;
      const node = this.mesh.node(id);
      if (node) {
        capabilityNodes.push(node);
        if (!nodeMap.has(node.id)) nodes.push({ ...node, depth: 0 });
        if (hydrate) this.mesh.setResidency(node.id, 'hot');
      }
    }

    const fields = nodes.length ? meanFiveFieldStates(nodes.map(node => node.fields)) : completeFiveFieldState(trace.fields || fieldsFromCapabilities([resolvedCue]));
    const evidence = [...new Set([...anchorIds, ...recall.evidence])];
    const semanticCompletion = capabilityNodes.map(node => ({
      id: node.id,
      kind: node.kind,
      status: 'semantically-completed',
      basis: 'request-capability-match',
    }));

    let stateNode = null;
    if (record) {
      stateNode = this.mesh.addState({
        id: `reato-state:${++this.mesh.seq}`,
        kind: 'reconstructed-state',
        scale: 'working',
        text: resolvedCue || 'ReATO reconstructed working state',
        fields,
        address: { ...(trace.address || {}), reato: true, canonicalAddressStatus: 'reconstructed' },
        source: { type: 'reato', operation: 'reconstruct' },
        residency: 'hot',
        provenance: evidence,
        attributes: {
          epistemicStatus: 'derived',
          recordedAnchors: anchorIds,
          derivedNeighborhood: recall.nodes.map(node => node.id),
          semanticCompletion,
          requestedCapabilities,
          traceVersion: trace.version || null,
        },
      });
      for (const id of evidence) if (this.mesh.node(id)) this.mesh.addEdge({ from: stateNode.id, to: id, type: 'reconstructed-from', status: 'derived', evidence, dedupe: true });
      for (const completion of semanticCompletion) this.mesh.addEdge({ from: stateNode.id, to: completion.id, type: 'semantic-completion-candidate', status: 'candidate', evidence, dedupe: true });
    }

    return Object.freeze({
      mode: 'ReATO',
      epistemicStatus: 'derived',
      cue: resolvedCue,
      fields: clone(fields),
      address: clone(trace.address || {}),
      recordedAnchors: anchorIds,
      evidence,
      nodes,
      edges: [...edgeMap.values()],
      requestedCapabilities,
      semanticCompletion,
      meshStateId: stateNode?.id || null,
    });
  }

  async resume(traceOrCue, request = null, options = {}) {
    if (!this.functional?.runIntent) throw new Error('ReATO resume requires the functional ATO runtime');
    const trace = this._normalizeTrace(traceOrCue);
    const intent = String(request ?? trace.cue ?? '').trim();
    if (!intent) throw new Error('ReATO resume requires a request/cue');
    const reconstructed = this.reconstruct(trace, { cue: intent, hydrate: true, record: true, ...(options.reconstruct || {}) });
    const execution = await this.functional.runIntent(intent, {
      ...(options.execute || {}),
      executionContext: {
        ...(options.execute?.executionContext || {}),
        reatoPreflight: false,
        reato: {
          stateId: reconstructed.meshStateId,
          evidence: reconstructed.evidence,
          requestedCapabilities: reconstructed.requestedCapabilities,
          epistemicStatus: reconstructed.epistemicStatus,
        },
      },
    });
    if (reconstructed.meshStateId && execution.meshIntentId) {
      this.mesh.addTransition(reconstructed.meshStateId, execution.meshIntentId, { operator: 'reato-handoff-to-ato', evidence: reconstructed.evidence });
    }
    const sources = [reconstructed.meshStateId, execution.meshIntentId, execution.meshExecutionId].filter(Boolean);
    const compressed = this.compress({ sourceIds: sources, cue: intent, provenance: reconstructed.evidence, attributes: { cycle: 'ReATO->ATO->trace' } });
    if (execution.meshExecutionId) this.mesh.addTransition(execution.meshExecutionId, compressed.nodeId, { operator: 'reato-compress-outcome', evidence: [execution.meshExecutionId] });
    return Object.freeze({ reconstructed, execution, compressed });
  }
}

export default ReATOEngine;
