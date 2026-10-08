import { requireIntroductionAddress } from '../components/organism/integration/IntroductionAddress.mjs';
import MeshArtifactGenerator from '../components/organism/processes/MeshArtifactGenerator.mjs';
import BehaviorArtifactProducer from '../components/organism/processes/BehaviorArtifactProducer.mjs';
import WorldEmbodiment from '../components/organism/integration/WorldEmbodiment.mjs';
import SynthiaUnit from '../components/organism/core/SynthiaUnit.mjs';
import { DIMENSION_ORDER, AXES as ORGANISM_AXES } from '../components/organism/state-space/state-space-foundation.mjs';
import { ProcessFabric as ProcessPhysicsFabric } from '../components/process-physics/multiprocess/ProcessFabric.mjs';
import { createDefaultProcessField } from '../components/process-knowledge/src/processes/createDefaultProcessField.js';
import stateMath from '../components/state-math/src/sovereign-entry.js';
import { PROJECTIONS } from '../components/state-math/src/mesh/mesh.js';
import { projectDimension } from '../components/state-math/src/state-space/dimensions.js';
import { SynthiaSystem as ExecutionSystem } from '../components/execution-spine/src/synthia-system.mjs';
import {
  AutomataIngestionExecutionKernel,
  BrowserExecutionSurface,
  BrowserAutomataStore,
} from '../components/automata-ingestion/src/automata/index.mjs';
import { auditAddress, validateFullOrganismAddress } from './address-interop.mjs';
import { SymbolCompositionGraph } from '../components/organism/integration/SymbolCompositionGraph.mjs';
import { UniversalExecutionBridge as ResidentExecutionBridge } from '../components/state-math/src/integration/universal-execution-bridge.js';

const safe = (value) => {
  try { return structuredClone(value); }
  catch { try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); } }
};

function toolDescriptor(tool, prefix = '') {
  const id = `${prefix}${tool.toolId ?? tool.id}`;
  return {
    id,
    name: tool.name ?? tool.toolId ?? tool.id,
    provides: [...(tool.provides ?? tool.capabilities ?? [])],
  };
}

/**
 * Composition root. It does not replace any supplied engine.
 *
 * Existing authorities stay in their own domains:
 * - R21.22 organism owns the living 64x5 state substrate and deep coordinate space.
 * - v0.8.8 ProcessFabric owns typed process-formation evidence.
 * - v1.4 owns the supplied dimensional projection/math laboratory.
 * - v0.3 Execution Spine owns universal artifact execution.
 * - v0.5.1 Automata Kernel owns ingestion/decomposition/five-field compilation.
 * - cleaned process field retains CHNOPS/Codon/Klein/Ingestion/Dyad peer processes.
 *
 * New code here is only boundary glue and provenance recording.
 */
export class ScientificSynthiaAssembly {
  constructor(options = {}) {
    this.version = '0.3.0';
    this.organism = options.organism ?? new SynthiaUnit({
      ...(options.organismOptions ?? {}),
      autoStart: options.autoStart ?? false,
    });
    this.embodiment = this.organism.embodiment ??= new WorldEmbodiment({unit:this.organism});
    this.executionMode = options.executionMode ?? 'supplied-spine';
    if (!['supplied-spine','resident'].includes(this.executionMode)) throw new TypeError('Unknown execution mode');
    const executionOptions = { remember: false, ...(options.executionOptions ?? {}) };
    if (this.executionMode === 'resident' && !options.execution && !executionOptions.executionBridge) {
      executionOptions.executionBridge = new ResidentExecutionBridge(options.residentExecutionOptions ?? {});
    }
    this.execution = options.execution ?? new ExecutionSystem(executionOptions);
    this.stateMath = options.stateMath ?? stateMath;
    this.compositions = this.organism.compositions ??= new SymbolCompositionGraph({ memory: this.organism.memory });
    this.processKnowledge = options.processKnowledge ?? createDefaultProcessField(options.processKnowledgeOptions ?? {});
    this.processPhysics = options.processPhysics ?? new ProcessPhysicsFabric(options.processPhysicsOptions ?? {});

    const executionSurface = options.executionSurface ?? new BrowserExecutionSurface();
    executionSurface.register({
      id: 'assembled-universal-execution-spine',
      canExecute: async () => true,
      execute: async (normalized, context = {}) => {
        const executionContext = { ...context };
        // The execution-spine canonical address has an arcAxis schema. Do not
        // pass an organism `arc` address into it by analogy.
        if (executionContext.executionAddress) {
          executionContext.canonicalAddress = executionContext.executionAddress;
        } else {
          delete executionContext.canonicalAddress;
        }
        return this.execution.execution.execute({
          name: normalized.name,
          type: normalized.kind,
          bytes: normalized.bytes,
          content: normalized.text,
          originalContent: normalized.text,
        }, executionContext);
      },
    });
    this.executionSurface = executionSurface;
    const transientStore = options.transientStore ?? {
      async get() { return null; },
      async put() { return true; },
      async delete() { return true; },
      async audit() { return Object.freeze({ configured: true, mode: 'transient-no-commit', durable: false }); },
    };
    this.ingestion = options.ingestion ?? new AutomataIngestionExecutionKernel({ executionSurface, store: transientStore });
    this.admissionStore = options.admissionStore ?? new BrowserAutomataStore({
      databaseName: 'synthia-addressed-admission-v0.3',
      storeName: 'addressed-records',
    });

    this.events = [];
    this.artifactGenerator = null;
    if (options.artifactGeneration) this.mountArtifactGenerator(options.artifactGeneration);
    this.#bootProcessPhysics();
    this.#registerExistingExternalProcesses();
  }

  get dimensions() { return Object.freeze([...DIMENSION_ORDER]); }
  get graphProjections() { return Object.freeze([...PROJECTIONS]); }
  get addressAxes() { return Object.freeze(ORGANISM_AXES.map(([name, min, max]) => Object.freeze({ name, min, max }))); }

  #bootProcessPhysics() {
    const descriptors = [];
    for (const organ of this.organism.registry.list()) descriptors.push(toolDescriptor(organ, 'organ:'));
    for (const tool of this.organism.runtime.getRegisteredTools()) descriptors.push(toolDescriptor(tool, 'runtime:'));
    for (const tool of this.execution.engine?.tools ?? []) descriptors.push(toolDescriptor(tool, 'execution:'));
    descriptors.push(
      { id: 'assembly:automata-ingestion', name: 'Automata Ingestion Execution Kernel', provides: ['ingest', 'normalize', 'primitive-reduction', 'five-field-compilation'] },
      { id: 'assembly:execution-spine', name: 'Universal Execution Spine', provides: ['artifact-execution', 'runtime-adapter', 'mesh-sharing'] },
      { id: 'assembly:organism-state', name: 'R21.22 Authoritative Organism State', provides: ['64-codons', 'five-dimensions', 'deep-coordinate-state'] },
    );
    const unique = [...new Map(descriptors.filter((x) => x.id).map((x) => [x.id, x])).values()];
    this.processPhysics.boot(unique);
  }

  #registerExistingExternalProcesses() {
    const registrations = [
      ['process:assembly-organism', 'living-organism', ['assembly:organism-state'], 'R21.22 SynthiaUnit'],
      ['process:assembly-ingestion', 'ingestion-execution', ['assembly:automata-ingestion'], 'v0.5.1 AutomataIngestionExecutionKernel'],
      ['process:assembly-execution', 'artifact-execution', ['assembly:execution-spine'], 'Universal Execution Spine v0.3.0'],
    ];
    for (const [id, role, members, source] of registrations) {
      if (!this.processPhysics.inspect(id)) {
        this.processPhysics.registerExternalProcess({ id, role, members, origin: { type: 'supplied-component', source } });
      }
    }
    for (const process of this.processKnowledge.listProcesses()) {
      const id = `process-knowledge:${process.id}`;
      if (!this.processPhysics.inspect(id)) {
        this.processPhysics.registerExternalProcess({
          id,
          role: process.kind ?? 'peer-process',
          members: [...(process.capabilities ?? [])],
          origin: { type: 'supplied-process-field', source: 'synthia-processes-cleaned-1' },
        });
      }
    }
  }

  /** The five supplied dimensional perspective transforms, identity-preserving. */
  projectAcrossDimensions(state, fromDimension = state?.dimension ?? null) {
    return Object.freeze(Object.fromEntries(
      DIMENSION_ORDER.map((dimension) => [dimension, projectDimension(state, fromDimension, dimension)]),
    ));
  }

  /** The five supplied mesh graph projections remain separate from dimensions. */
  graphView(stateId) {
    return Object.freeze(Object.fromEntries(
      PROJECTIONS.map((projection) => [projection, this.execution.mesh.neighbors(stateId, projection)]),
    ));
  }

  addressAudit(address) { return auditAddress(address); }

  registerSymbol(occurrence) { return this.compositions.occurrence(occurrence); }
  composeSymbols(memberIds, options) { return this.compositions.compose(memberIds, options); }

  registerResidentCapability(capability, { organismAddress = capability?.address } = {}) {
    const addressBinding = requireIntroductionAddress({address:organismAddress},null,`resident-capability:${capability?.name ?? capability?.id ?? 'unnamed'}`);
    if (!(this.execution.execution instanceof ResidentExecutionBridge)) throw new Error('Resident execution mode is not mounted');
    return this.execution.execution.register({...capability, address:addressBinding.address, addressBinding});
  }

  /** Neural or authored producers share the existing address-first boundary. */
  mountArtifactGenerator({ propose, verify, resolve } = {}) {
    if (this.artifactGenerator) throw new Error('Artifact generator already mounted');
    const producer = new BehaviorArtifactProducer();
    this.artifactGenerator = new MeshArtifactGenerator({
      world: this.embodiment.world,
      memory: this.organism.memory,
      coder: this.organism.autoCoder,
      resolve: async (source) => {
        const validation = validateFullOrganismAddress(source?.address ?? {}, { calculation: 'mesh-artifact-generation' });
        if (!validation.complete) return { ...validation, source };
        if (!resolve) return { ...validation, source };
        const interpreted = await resolve(source, validation);
        return { ...interpreted, complete: interpreted?.complete === true, address: validation.address, source };
      },
      propose: propose ?? (request => producer.propose(request)),
      verify,
    });
    return this.artifactGenerator;
  }

  async generateArtifact(request = {}) {
    if (!this.artifactGenerator) throw new Error('Mount an artifact producer and behavioral verifier first');
    const session = this.embodiment.snapshot();
    const record = await this.artifactGenerator.generate({
      ...request, context: { ...(request.context ?? {}), identityId: session.identityId, worldId: session.activeWorld }
    });
    this.events.push(Object.freeze({ type: 'artifact-generation', id: record.id, status: record.status, at: Date.now() }));
    return record;
  }

  async ask(intent, options = {}) {
    const result = await this.organism.ask(intent, options);
    const sessionId = `organism:${result.cycle ?? Date.now()}`;
    const route = [...(result.route ?? [])];
    const context = {
      sessionId,
      inputValues: { intentRecord: { executionContext: { runId: sessionId, lane: 'organism-route' } } },
      expression: { capabilities: [] },
    };
    for (let i = 1; i < route.length; i += 1) {
      const a = `organ:${route[i - 1]}`;
      const b = `organ:${route[i]}`;
      try {
        this.processPhysics.recordRelationEvidence(a, b, context, {
          type: 'dataflow',
          details: { source: 'R21.22 organism collective route', collectiveId: result.collective?.id ?? null },
        });
        this.processPhysics.recordRelationEvidence(a, b, context, {
          type: result.outputs?.every((x) => x.out?.ok !== false) ? 'success_correlation' : 'failure_correlation',
          details: { source: 'R21.22 organism collective result' },
        });
      } catch {
        // Unknown route participants remain in the original organism result;
        // the bridge does not invent catalog identities for them.
      }
    }
    this.execution.shareKnowledge({
      kind: 'organism-collective-result',
      address: safe(result.address),
      route,
      ok: result.ok,
      stateSpace: safe(result.stateSpace),
    }, { source: 'assembled-organism', kind: 'state-evidence' });
    this.events.push(Object.freeze({ type: 'ask', sessionId, route, at: Date.now() }));
    return result;
  }

  /**
   * Address-first admission boundary.
   *
   * External material may be normalized, reduced, and compiled in a
   * transient non-interactive work session. Execution and admission are held until
   * the complete 13-part organism address has been accepted.
   */
  async executeArtifact(artifact, context = {}) {
    const full = validateFullOrganismAddress(context.organismAddress ?? {});
    const session = await this.ingestion.prepare(artifact, context);
    const execution = !full.complete
      ? { ok:false, path:'address-held', executed:false, backendUsed:false, workerUsed:false, result:null }
      : context.execute === false
      ? {
          ok: true,
          kind: session.normalized.kind,
          path: 'compiled-without-execution',
          backendUsed: false,
          workerUsed: false,
          result: { engine: 'synthia-address-first-boundary', stdout: [], returnValue: null },
        }
      : await this.executionSurface.execute(session.normalized, context);

    if (!full.ok) {
      return Object.freeze({
        schema: 'synthia.transient-admission.v0.3',
        status: 'unresolved-address',
        admitted: false,
        stored: false,
        fingerprint: session.fingerprint,
        artifact: safe(session.decomposition.artifact),
        decomposition: safe(session.decomposition),
        fields: safe(session.fieldMap),
        plan: safe(session.plan),
        execution: safe(execution),
        addressResolution: safe(full),
        next: 'resolve the complete planetary→dimension→gate→line→color→tone→base→degree→minute→second→arc→zodiac→house address, then admit',
      });
    }

    // Finalize only after the full organism address exists. The ingestion
    // kernel's own store is transient/no-commit; durable retention happens
    // below at this admitted boundary.
    const record = await this.ingestion.finalize(session, execution);
    const admitted = Object.freeze({
      ...record,
      schema: 'synthia.addressed-ingestion-execution-record.v0.3',
      organismAddress: safe(full.address),
      organismNumericAddress: safe(full.numeric),
      sourceBytes: new Uint8Array(session.normalized.bytes),
      admitted: true,
      stored: true,
    });

    await this.admissionStore.put(`fingerprint:${record.fingerprint}`, admitted);
    await this.admissionStore.put(`organism:${JSON.stringify(full.numeric)}`, admitted);
    await this.admissionStore.put(`ontological:${record.address.id}`, admitted);

    // A synthesized runtime may be retained only now, after admission.
    const executionArtifact = {
      name: session.normalized.name,
      type: session.normalized.kind,
      bytes: session.normalized.bytes,
      content: session.normalized.text,
      originalContent: session.normalized.text,
    };
    const learnable = execution?.synthesis?.javascript
      ? execution.synthesis
      : execution?.mirror?.javascript
        ? execution.mirror
        : null;
    if (learnable && this.execution.execution?.learned instanceof Map) {
      this.execution.execution.learned.set(this.execution.execution.key(executionArtifact), safe(learnable));
    }

    const sessionId = `execution:${record.fingerprint}`;
    const physicsContext = {
      sessionId,
      inputValues: { intentRecord: { executionContext: { runId: sessionId, lane: 'addressed-artifact-execution' } } },
      expression: { capabilities: ['ingest', 'execute', 'address', 'admit'] },
    };
    this.processPhysics.recordRelationEvidence(
      'assembly:automata-ingestion',
      'assembly:execution-spine',
      physicsContext,
      { type: 'dataflow', details: { addressId: record.address.id, executionPath: record.execution.path, organismAddress: safe(full.address) } },
    );

    this.organism.stateBridge.ingestToolExecution({
      toolId: 'assembly:execution-spine',
      capabilities: ['artifact-execution'],
      request: { address: full.address, artifact: { name: record.artifact?.name ?? null } },
      output: { ok: record.execution.ok, path: record.execution.path, addressId: record.address.id },
    });
    this.organism.checkpoint();

    this.execution.shareKnowledge({
      kind: 'addressed-execution-outcome',
      organismAddress: safe(full.address),
      ontologicalAddress: safe(record.address),
      execution: safe(record.execution),
    }, { source: 'addressed-execution', kind: 'state-evidence' });

    this.events.push(Object.freeze({ type: 'admit-execution', sessionId, addressId: record.address.id, organismAddress: safe(full.address), at: Date.now() }));
    return admitted;
  }

  async recallArtifact(fingerprint) {
    return this.admissionStore.get(`fingerprint:${fingerprint}`);
  }

  async disassembleArtifact(fingerprint) {
    const record = await this.recallArtifact(fingerprint);
    if (!record) return null;
    return Object.freeze({
      fingerprint: record.fingerprint,
      artifact: safe(record.artifact),
      decomposition: safe(record.decomposition),
      fields: safe(record.fields),
      plan: safe(record.plan),
      organismAddress: safe(record.organismAddress),
    });
  }

  async reassembleArtifact(fingerprint) {
    const record = await this.recallArtifact(fingerprint);
    if (!record?.sourceBytes) return null;
    const bytes = record.sourceBytes instanceof Uint8Array
      ? new Uint8Array(record.sourceBytes)
      : new Uint8Array(record.sourceBytes ?? []);
    return Object.freeze({ fingerprint, bytes, byteExact: true, artifact: safe(record.artifact) });
  }

  /** Route directly into the preserved peer process field. */
  processRequest(to, type, payload = {}) {
    return this.processKnowledge.request(to, type, payload);
  }

  async pulse(options = {}) {
    const pulse = await this.organism.pulse(options);
    this.execution.shareKnowledge({ kind: 'organism-pulse', pulse: safe(pulse) }, { source: 'assembled-organism', kind: 'state-evidence' });
    this.events.push(Object.freeze({ type: 'pulse', at: Date.now() }));
    return pulse;
  }

  snapshot() {
    return Object.freeze({
      version: this.version,
      executionMode: this.executionMode,
      architecture: 'non-destructive scientific assembly',
      dimensions: this.dimensions,
      graphProjections: this.graphProjections,
      addressAxes: this.addressAxes,
      compositions: this.compositions.snapshot(),
      artifactGeneration: this.artifactGenerator?.snapshot() ?? [],
      organism: safe(this.organism.snapshot()),
      execution: safe(this.execution.wiringAudit()),
      processPhysics: safe(this.processPhysics.status()),
      processKnowledge: safe(this.processKnowledge.listProcesses()),
      automataIngestion: { admittedHistory: this.ingestion.history.length, policy: 'full-address-before-commit' },
      stateMath: {
        tools: this.stateMath.listTools().length,
        meshMetrics: safe(this.stateMath.meshMetrics()),
      },
      events: safe(this.events.slice(-128)),
    });
  }

  async close() {
    try { this.organism.stopLife(); } catch {}
    await this.processPhysics.close();
  }
}

export default ScientificSynthiaAssembly;
