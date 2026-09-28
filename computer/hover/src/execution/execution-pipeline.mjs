import { CrossScaleExperiment } from '../primitives/index.mjs';
import { detectExecutionKind } from '../../vendor/execution-spine-v0.4.0/src/pure-synthia/integration/universal-execution-bridge.js';
import { safe } from '../util.mjs';

const decoder = new TextDecoder();

function artifactText(artifact = {}) {
  if (typeof artifact.content === 'string') return artifact.content;
  if (typeof artifact.originalContent === 'string') return artifact.originalContent;
  if (artifact.bytes instanceof Uint8Array) return decoder.decode(artifact.bytes);
  return '';
}

const capabilityPattern = (kind) => {
  if (kind === 'json') return { strategy: 'internal', features: ['scale:automaton', 'kind:json', 'operation:parse'] };
  if (kind === 'data') return { strategy: 'internal', features: ['scale:automaton', 'kind:data', 'operation:read'] };
  if (kind === 'javascript') return { strategy: 'hybrid', features: ['scale:automaton', 'kind:javascript', 'operation:execute'] };
  return { strategy: 'external', features: ['scale:automaton', `kind:${kind}`, 'operation:runtime'] };
};

function artifactFeatures(kind) {
  if (kind === 'json') return ['scale:automaton', 'kind:json', 'operation:parse'];
  if (kind === 'data') return ['scale:automaton', 'kind:data', 'operation:read'];
  if (kind === 'javascript') return ['scale:automaton', 'kind:javascript', 'operation:execute'];
  return ['scale:automaton', `kind:${kind}`, 'operation:runtime'];
}

function genomeFeatures(genome) {
  if (!genome?.address || !genome?.codon) return [];
  const activeAspectIds = (genome.codon.sparseSemanticVector ?? [])
    .map((value, index) => value > 0 ? genome.codon.semanticAspectIds?.[index] : null)
    .filter(Boolean)
    .slice(0, 4);
  return [
    `genome:gate-${genome.address.gate}`,
    `genome:line-${genome.address.line}`,
    `dimension:${genome.address.dimension}`,
    `center:${genome.center}`,
    `swarm-regime:${genome.codon.regime}`,
    `manifestation:${genome.manifestationClass}`,
    `coding:${genome.agentCapabilities?.codingStyle ?? 'unresolved'}`,
    `toolmaking:${genome.agentCapabilities?.toolmakingMode ?? 'unresolved'}`,
    `construction:${genome.agentCapabilities?.constructionMode ?? 'unresolved'}`,
    ...activeAspectIds.map((id) => `aspect:${id}`),
  ];
}

/** Primitive analysis selects execution strategy before the preserved bridge. */
export class ExecutionPipeline {
  constructor({ engine, bridge, resolver, scientist, appRegistry = null, proposalHandler = null } = {}) {
    if (!engine?.mesh) throw new TypeError('ExecutionPipeline requires the live Synthia engine');
    if (!bridge?.execute) throw new TypeError('ExecutionPipeline requires UniversalExecutionBridge');
    if (!resolver?.resolve) throw new TypeError('ExecutionPipeline requires IntegratedExecutionAddressResolver');
    if (!scientist?.experiment) throw new TypeError('ExecutionPipeline requires ScientistLoop');
    this.engine = engine;
    this.bridge = bridge;
    this.resolver = resolver;
    this.scientist = scientist;
    this.appRegistry = appRegistry;
    this.proposalHandler = proposalHandler;
    this.history = [];
  }

  analyze(artifact, resolution, semanticGenome = null) {
    const registration = this.appRegistry?.resolve(artifact) ?? null;
    const kind = registration?.kind ?? detectExecutionKind(artifact);
    const pattern = registration
      ? { strategy: 'internal', features: ['scale:automaton', `registered:${registration.id}`, 'operation:execute'] }
      : capabilityPattern(kind);
    const top = resolution.topPrimitive;
    const crossScale = new CrossScaleExperiment({ operators: this.resolver.operators });
    const eligible = pattern.strategy === 'internal' ? [true, true]
      : pattern.strategy === 'hybrid' ? [true, false]
        : [false, false];
    const transfer = crossScale.testTransfer('live_sequence', 'artifact', 'automaton', eligible.map((transferEligible, index) => ({
      id: `strategy-probe-${index + 1}`,
      operands: [top],
      context: { transferEligible, artifactKind: kind },
      expected: { operator: 'live_sequence' },
    })));

    const klein = this.engine.mesh.get('klein-analogy');
    if (!klein) throw new Error('klein-analogy is not mounted');
    const semanticFeatures = genomeFeatures(semanticGenome);
    const observed = registration
      ? ['scale:automaton', `registered:${registration.id}`, 'operation:execute']
      : artifactFeatures(kind);
    observed.push(...semanticFeatures);
    const vocab = [...new Set([...pattern.features, ...observed, `strategy:${pattern.strategy}`])];
    const analogyRun = klein.run({
      vocab,
      A: pattern.features,
      B: [`strategy:${pattern.strategy}`],
      C: observed,
      mode: 'xor',
    }, { source: 'execution-strategy' });
    const analogy = analogyRun.output;
    const match = analogy.ok && analogy.result.includes(`strategy:${pattern.strategy}`);
    let strategy = 'external';
    if (transfer.transferRate >= 1 && match && pattern.strategy === 'internal') strategy = 'internal';
    else if (transfer.transferRate > 0 && match) strategy = 'hybrid';
    return Object.freeze({
      kind,
      strategy,
      registeredApp: registration ? safe({
        id: registration.id,
        kind: registration.kind,
        singlePlayer: registration.singlePlayer,
        backendRequired: registration.backendRequired,
        capabilities: registration.capabilities,
      }) : null,
      operatorTransfer: safe(transfer),
      analogy: safe(analogy),
      analogyAccepted: analogyRun.accepted,
      semanticGenome: safe(semanticGenome),
      semanticFeatures: Object.freeze(semanticFeatures),
      featureVector: Object.freeze([...this.resolver.featureVector(resolution), ...observed]),
      rationale: strategy === 'internal'
        ? 'operator transfer is complete and Klein resolved an internal capability pattern'
        : strategy === 'hybrid'
          ? 'operator transfer is partial and Klein resolved a mixed internal/runtime pattern'
          : 'no transferable internal reconstruction pattern; external runtime is required',
    });
  }

  async #internal(artifact, kind, context) {
    if (this.appRegistry?.resolve(artifact)) return this.appRegistry.execute(artifact, context);
    if (typeof artifact?.internalExecute === 'function') {
      const returnValue = await artifact.internalExecute(context);
      return { ok: true, path: 'internal-reconstruction', kind, result: { engine: 'synthia-internal-capability', stdout: [], returnValue } };
    }
    const text = artifactText(artifact);
    if (kind === 'json') {
      return { ok: true, path: 'internal-reconstruction', kind, result: { engine: 'synthia-json-primitive', stdout: [], returnValue: JSON.parse(text) } };
    }
    if (kind === 'data') {
      return { ok: true, path: 'internal-reconstruction', kind, result: { engine: 'synthia-data-primitive', stdout: [], returnValue: text } };
    }
    return { ok: false, path: 'internal-reconstruction-unavailable', kind, error: `no internal reconstruction for ${kind}` };
  }

  #recordGap(artifact, result, analysis) {
    const intent = this.engine.intent;
    const gap = {
      id: `gap-execution-${intent.gaps.length + 1}`,
      intentType: 'compute',
      gapType: 'computation_failure',
      missing: [`execute:${analysis.kind}`],
      request: artifact?.name ?? artifact?.originalName ?? analysis.kind,
      derivationId: null,
      seq: intent.gaps.length + 1,
      evidence: safe({ analysis, result }),
    };
    const proposal = {
      id: `proposal-execution-${intent.proposals.length + 1}`,
      kind: 'primitive',
      spec: {
        description: `Add a reusable capability for ${analysis.kind} execution`,
        identity: `execution_${analysis.kind}`,
        missing: [...gap.missing],
      },
      confidence: 0.7,
      evidenceDerivationIds: [],
      gapId: gap.id,
      seq: intent.proposals.length + 1,
      applied: null,
    };
    intent.gaps.push(gap);
    intent.proposals.push(proposal);
    return { gap, proposal };
  }

  async run(artifact, context = {}) {
    const decomposition = this.resolver.descend(artifact);
    const preExecution = this.resolver.resolve({ artifact, decomposition });
    const analysis = this.analyze(artifact, preExecution, context.semanticGenome ?? null);
    let result;
    let bridgeUsed = false;
    let internalAttempt = null;
    try {
      if (analysis.strategy === 'internal') {
        result = await this.#internal(artifact, analysis.kind, context);
      } else if (analysis.strategy === 'hybrid') {
        internalAttempt = await this.#internal(artifact, analysis.kind, context);
        bridgeUsed = true;
        result = await this.bridge.execute(artifact, {
          ...context,
          analysis,
          internalAttempt,
          executionDecomposition: decomposition,
          semanticGenome: context.semanticGenome ?? null,
        });
      } else {
        bridgeUsed = true;
        result = await this.bridge.execute(artifact, {
          ...context,
          analysis,
          executionDecomposition: decomposition,
          semanticGenome: context.semanticGenome ?? null,
        });
      }
    } catch (error) {
      result = { ok: false, path: `${analysis.strategy}-execution-threw`, kind: analysis.kind, error: String(error?.message ?? error) };
    }
    result = { ...result, strategy: analysis.strategy };
    const resolution = this.resolver.resolve({ artifact, execution: result, decomposition });
    const question = this.scientist.question(`Will ${analysis.strategy} execute ${analysis.kind} successfully?`, {
      hypothesis: `Primitive transfer and analogy select ${analysis.strategy}.`,
      method: 'descent -> scale ladder -> transfer -> analogy -> execution',
      address: resolution.address,
      source: ['execution-pipeline'],
    });
    const experiment = this.scientist.experiment(question.id, {
      action: 'execution-strategy',
      predicted: analysis.strategy,
      actual: result.ok ? analysis.strategy : 'failed',
      beforeAddress: preExecution.address,
      afterAddress: resolution.address,
      toolPath: ['primitive-descent', 'scale-ladder', 'cross-scale', 'klein-analogy', analysis.strategy],
    });

    let gap = null;
    let proposal = null;
    let proposalApplication = null;
    if (!result.ok && context.learnOnFailure !== false) {
      ({ gap, proposal } = this.#recordGap(artifact, result, analysis));
      if (proposal.confidence >= this.engine.intent.confidenceThreshold) {
        proposalApplication = this.proposalHandler
          ? await this.proposalHandler(proposal, { gap, artifact, result, analysis })
          : this.engine.intent.applyProposal(proposal.id);
      }
    }

    const record = Object.freeze({
      id: `execution-pipeline-${this.history.length + 1}`,
      ok: Boolean(result.ok),
      path: result.path,
      strategy: analysis.strategy,
      bridgeUsed,
      decomposition,
      preExecution,
      analysis,
      internalAttempt: safe(internalAttempt),
      result: safe(result),
      resolution,
      experiment: safe(experiment),
      gap: safe(gap),
      proposal: safe(proposal),
      proposalApplication: safe(proposalApplication),
      semanticGenome: safe(context.semanticGenome ?? null),
    });
    this.history.push(record);
    return record;
  }
}

export default ExecutionPipeline;
