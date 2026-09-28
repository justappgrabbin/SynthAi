import { NervousSystem } from './NervousSystem.mjs';
import { ProtectedSettings } from './autonomy/ProtectedSettings.mjs';
import { ApprovalGovernor } from './autonomy/ApprovalGovernor.mjs';
import { ArbitraryCodeSandbox } from './autonomy/ArbitraryCodeSandbox.mjs';
import { ReversibleChangeLedger } from './autonomy/ReversibleChangeLedger.mjs';
import { ToolInstallationController } from './autonomy/ToolInstallationController.mjs';
import { ArtifactCoat } from './security/ArtifactCoat.mjs';
import { DeclarativeOperatorCompiler } from './learning/DeclarativeOperatorCompiler.mjs';
import { PlanSandboxRunner } from './learning/PlanSandboxRunner.mjs';
import { LearnedToolCatalog } from './learning/LearnedToolCatalog.mjs';
import { AutonomousProcedureLearner } from './learning/AutonomousProcedureLearner.mjs';
import { RelationalKnowledgeInferer } from './learning/RelationalKnowledgeInferer.mjs';
import { BookIngestionEngine } from './books/BookIngestionEngine.mjs';
import { DependencyResolver } from './books/DependencyResolver.mjs';
import { GapChannelFactory } from './books/GapChannelFactory.mjs';
import { BookLearningCoordinator } from './books/BookLearningCoordinator.mjs';
import { IndexedDbSnapshotStore, MemorySnapshotStore } from './persistence/SnapshotStores.mjs';
import { StateCapsule } from './persistence/StateCapsule.mjs';
import { IntegratedToolFactory, ATONativeBridge } from '../UPGRADES/vendor/integrated-tool-factory/src/integrated-tool-factory.mjs';
import { Automaton } from '../../vendor/ato-core/src/automaton.mjs';
import { FullArtifactRuntime } from './execution/FullArtifactRuntime.mjs';
import { MCPToolMesh } from './tools/MCPToolMesh.mjs';
import { StateToolField } from './tools/StateToolField.mjs';
import { BrowserActionLoop } from './browser/BrowserActionLoop.mjs';

function defaultStore() {
  return globalThis.indexedDB
    ? new IndexedDbSnapshotStore({ database: 'cynthia-sovereign', objectStore: 'organism-v1' })
    : new MemorySnapshotStore();
}

function summarize(result) {
  const toolId = result.route?.toolId ?? 'unknown';
  const output = result.output ?? {};
  if (typeof output === 'string') return output;
  if (output.utterance) return output.utterance;
  if (output.narrative) return output.narrative;
  if (output.corrected) return output.corrected;
  if (output.kind) return `${toolId} produced ${output.kind}.`;
  return `${toolId} processed the input and preserved its derivation.`;
}

/**
 * One assembled runtime for the complete step-by-step lineage.
 * Modules are mounted as organs around one NervousSystem and one ATO mesh;
 * they are not parallel demo engines.
 */
export async function createIntegratedSynthia(options = {}) {
  const nervousSystem = options.nervousSystem ?? new NervousSystem(options);
  const artifactRuntime = options.artifactRuntime ?? new FullArtifactRuntime(options.execution ?? {});
  const factory = options.factory ?? new IntegratedToolFactory();
  const factoryBridge = new ATONativeBridge({ Automaton, mesh: nervousSystem.ato.mesh, factory });
  const mcpToolMesh = options.mcpToolMesh ?? new MCPToolMesh();
  const toolField = options.toolField ?? new StateToolField({
    stateSpace: nervousSystem.organism.mind.stateSpace,
    atoMesh: nervousSystem.ato.mesh,
    factoryBridge,
    mcpMesh: mcpToolMesh,
  });
  toolField.registerResidentMesh();
  toolField.registerStateSpaceTools();
  nervousSystem.toolFactory = factory;
  nervousSystem.factoryBridge = factoryBridge;
  nervousSystem.mcpToolMesh = mcpToolMesh;
  nervousSystem.toolField = toolField;
  const browserForm = nervousSystem.ato.mesh.automatons.get('browser-form');
  const browserActionLoop = options.browserActionLoop ?? new BrowserActionLoop({ browserForm });
  nervousSystem.browserActionLoop = browserActionLoop;
  const compiler = new DeclarativeOperatorCompiler();
  const coatAuthority = new ArtifactCoat();
  const catalog = new LearnedToolCatalog({ compiler, coatAuthority });
  nervousSystem.learnedTools = catalog;

  const settings = new ProtectedSettings(options.settings);
  const governor = new ApprovalGovernor({ settings });
  const changeLedger = new ReversibleChangeLedger();
  const sandbox = new ArbitraryCodeSandbox({ runner: new PlanSandboxRunner({ compiler }) });
  const installer = new ToolInstallationController({
    mesh: nervousSystem.ato.mesh,
    sandbox,
    governor,
    ledger: changeLedger,
    coatAuthority,
  });
  const identity = await coatAuthority.generateIdentity();
  const learner = new AutonomousProcedureLearner({
    nervousSystem,
    artifactRuntime,
    inferer: new RelationalKnowledgeInferer(),
    compiler,
    installer,
    catalog,
    identity,
  });

  const bookDependencies = new DependencyResolver(options.bookDependencies);
  nervousSystem.bookDependencies = bookDependencies;
  const books = new BookLearningCoordinator({
    ingestion: new BookIngestionEngine(),
    resolver: bookDependencies,
    gapFactory: new GapChannelFactory({ mind: nervousSystem.organism.mind }),
  });

  const capsule = new StateCapsule({ store: options.store ?? defaultStore() });
  const restoration = options.restore === false
    ? Object.freeze({ status: 'skipped' })
    : await capsule.restore(nervousSystem);

  async function persist() {
    return capsule.save(nervousSystem);
  }

  function isArtifactInput(input) {
    return Boolean(input && typeof input === 'object' &&
      (input.name || input.filename || input.path) &&
      (input.bytes || input.content != null || input.source != null || typeof input.arrayBuffer === 'function'));
  }

  async function process(input, context = {}) {
    let artifact = null;
    let semanticInput = input;
    if (isArtifactInput(input)) {
      artifact = await artifactRuntime.ingestArtifact(input, context.execution ?? context);
      semanticInput = typeof input.content === 'string'
        ? input.content
        : typeof input.source === 'string'
          ? input.source
          : `artifact ${artifact.name} kind ${artifact.kind} size ${artifact.size} status ${artifact.status}`;
    }
    const result = await nervousSystem.process(semanticInput, artifact ? { ...context, artifact } : context);
    if (context.persist !== false) await persist();
    return Object.freeze({ ...result, artifact, response: summarize(result) });
  }

  async function executeArtifact(input, context = {}) {
    const result = await artifactRuntime.executeArtifact(input, context);
    if (context.persist !== false) await persist();
    return result;
  }

  async function ingestArtifact(input, context = {}) {
    const result = await artifactRuntime.ingestArtifact(input, context);
    if (context.persist !== false) await persist();
    return result;
  }

  async function teachRelational({ source, examples, name, approval = 'approve' } = {}) {
    const result = await learner.learn({ sourceText: source, examples, name, approval });
    await persist();
    return result;
  }

  async function growTool(request = {}) {
    let result;
    const connection = request.connection || (request.sourceGate && request.targetGate ? [request.sourceGate, request.targetGate] : null);
    if (connection) {
      result = await toolField.emergeFromConnection({
        sourceGate: Number(connection[0]),
        targetGate: Number(connection[1]),
        purpose: request.purpose || request.input || 'connection-born capability',
        input: request.input ?? request.purpose,
        dimension: request.dimension || 'Space',
        level: Number.isInteger(request.level) ? request.level : 6,
        roles: request.roles || ['agent','user'],
        provenance: request.provenance || [],
      });
    } else {
      result = factoryBridge.generateAndMount(request);
      if (result?.automaton) toolField.registerTool(result.automaton, {
        source:'tool-factory',
        availability:'resident',
        capabilities: request.capabilities || [],
        roles: request.roles || ['agent','user'],
        provenance: request.provenance || [],
        metadata:{ generationStatus:result.generationStatus, arisenThrough:'request' },
      });
    }
    await persist();
    return result;
  }

  async function growFromConnection(request = {}) {
    const result = await toolField.emergeFromConnection(request);
    await persist();
    return result;
  }

  function connectGates(sourceGate, targetGate, metadata = {}) {
    return toolField.observeConnection(sourceGate, targetGate, metadata);
  }

  function activeTools(context = {}) {
    return toolField.activate(context);
  }

  function registerMCPTool(descriptor, invoke = null) {
    return toolField.registerMCPTool(descriptor, invoke);
  }

  function registerProgram(program) {
    return toolField.registerProgram(program);
  }

  async function runProgram(programId, input, context = {}) {
    const result = await toolField.runProgram(programId, input, context);
    await persist();
    return result;
  }


  async function startBrowserTask(message, context = {}) {
    const result = await browserActionLoop.run(message, context);
    if (context.persist !== false) await persist();
    return result;
  }

  async function provideBrowserInput(sessionId, values = {}, context = {}) {
    const result = await browserActionLoop.provideInput(sessionId, values);
    if (context.persist !== false) await persist();
    return result;
  }

  async function reviewBrowserSession(sessionId) {
    return browserActionLoop.review(sessionId);
  }

  async function confirmBrowserSubmission(sessionId, options = {}) {
    const result = await browserActionLoop.confirmAndSubmit(sessionId, options);
    await persist();
    return result;
  }

  function diagnostics() {
    return Object.freeze({
      runtime: 'integrated-organism',
      restoration: restoration.status,
      meshTools: nervousSystem.ato.mesh.automatons.size,
      learnedTools: catalog.records.size,
      generatedTools: factory.tools.size,
      stateToolField: {
        registeredTools: toolField.tools.size,
        programs: toolField.programs.size,
        connections: toolField.connections.size,
        active: toolField.activate({ ...toolField.current }).tools.length,
      },
      mcpToolMesh: {
        knownTools: mcpToolMesh.tools.size,
        connectedProviders: [...mcpToolMesh.connections.values()].filter(connection => connection.online).length,
      },
      execution: artifactRuntime.diagnostics(),
      sources: nervousSystem.organism.mind.sources.originals.size,
      episodes: nervousSystem.organism.episodes.snapshot().episodes?.length ?? 0,
      organs: Object.freeze([
        'first-mind', 'nervous-system', 'ato-mesh', 'source-memory', 'episodic-memory',
        'pressure-mesh', 'learned-tool-catalog', 'book-learning', 'gap-factory',
        'morph-evolution', 'business-orientation', 'personal-synth-registry',
        'universal-execution-spine', 'full-artifact-runtime', 'state-tool-field', 'mcp-tool-mesh',
        'browser-action-loop',
      ]),
    });
  }

  return Object.freeze({
    nervousSystem,
    artifactRuntime,
    factory,
    factoryBridge,
    toolField,
    mcpToolMesh,
    learner,
    books,
    capsule,
    settings,
    governor,
    installer,
    process,
    executeArtifact,
    ingestArtifact,
    registerRuntimeAdapter: adapter => artifactRuntime.registerRuntime(adapter),
    teachRelational,
    growTool,
    growFromConnection,
    connectGates,
    activeTools,
    registerMCPTool,
    registerProgram,
    runProgram,
    startBrowserTask,
    provideBrowserInput,
    reviewBrowserSession,
    confirmBrowserSubmission,
    closeBrowserSession: sessionId => browserActionLoop.close(sessionId),
    browserActionLoop,
    persist,
    diagnostics,
  });
}
