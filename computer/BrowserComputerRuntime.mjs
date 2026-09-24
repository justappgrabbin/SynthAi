import { EventBus, MemoryPersistence, StateStore, Registry } from './core/kernel.mjs';
import { VirtualFileSystem, ArtifactIntake } from './runtime/storage.mjs';
import { AutomataEngine, ProcessFabric, BackendBroker } from './runtime/execution.mjs';
import { CapabilityGraph, MorphEngine, CultivationEngine, PolicyEngine } from './runtime/experience.mjs';
import { ShellManager, MutationDispatcher } from './runtime/shells.mjs';
import { ProjectWorkspace } from './runtime/projects.mjs';
import { GitHubWorkspaceAdapter } from './adapters/GitHubWorkspaceAdapter.mjs';
import { registerCanonicalMicros } from './micros/MicroRegistry.mjs';
import { registerSystemAdapters } from './adapters/SystemAdapters.mjs';

/**
 * BrowserComputerRuntime
 *
 * Browser host for the existing SynthAI Computer architecture.
 * It deliberately does NOT fake Node-only providers. The full ComputerRuntime
 * remains the canonical Node host. This host mounts the repo's browser-safe
 * core/runtime/adapters/micros path and advertises Node-only providers as
 * PRESENT with an explicit blocker.
 */
export class BrowserComputerRuntime {
  constructor({ persistence = new MemoryPersistence(), namespace = 'synthai-computer-browser', github = null } = {}) {
    this.environment = 'browser';
    this.bus = new EventBus();
    this.state = new StateStore({ bus: this.bus, persistence, namespace });
    const registry = kind => new Registry({ kind, bus: this.bus });

    this.tools = registry('tool');
    this.apps = registry('app');
    this.shells = registry('shell');
    this.agents = registry('agent');
    this.worlds = registry('world');
    this.automataRegistry = registry('automaton');
    this.processRegistry = registry('process');
    this.capabilityRegistry = registry('capability');
    this.backendsRegistry = registry('backend');
    this.artifacts = registry('artifact');
    this.micros = registry('micro');
    this.systems = registry('system');
    this.services = registry('service');

    this.vfs = new VirtualFileSystem({ bus: this.bus, state: this.state });
    this.shellManager = new ShellManager({ bus: this.bus, shells: this.shells, apps: this.apps, state: this.state });
    this.automata = new AutomataEngine({ bus: this.bus, automata: this.automataRegistry, tools: this.tools, state: this.state });
    this.processes = new ProcessFabric({ bus: this.bus, processes: this.processRegistry, state: this.state });
    this.backends = new BackendBroker({ bus: this.bus, backends: this.backendsRegistry });
    this.capabilities = new CapabilityGraph({ capabilities: this.capabilityRegistry });
    this.morph = new MorphEngine({ bus: this.bus, state: this.state, micros: this.micros });
    this.cultivation = new CultivationEngine({ bus: this.bus, state: this.state });
    this.policy = new PolicyEngine({ bus: this.bus });
    this.mutations = new MutationDispatcher({
      bus: this.bus,
      state: this.state,
      shellManager: this.shellManager,
      automata: this.automata,
      tools: this.tools,
      agents: this.agents,
      morph: this.morph
    });
    this.intake = new ArtifactIntake({ bus: this.bus, vfs: this.vfs, artifacts: this.artifacts, mutations: this.mutations });
    this.projects = new ProjectWorkspace({ bus: this.bus, state: this.state, vfs: this.vfs, backends: this.backends });

    if (github) this.configureGitHub(github);
  }

  configureGitHub(config = {}) {
    const adapter = config instanceof GitHubWorkspaceAdapter ? config : new GitHubWorkspaceAdapter(config);
    this.backends.register('github', adapter, { replace: true });
    if (!this.capabilityRegistry.has('github-project-publish')) {
      this.capabilityRegistry.register('github-project-publish', {
        providers: ['github'],
        requires: ['synthia-server'],
        description: 'Publish project files through the authenticated Synthia Server GitHub bridge.',
        status: 'PARTIALLY_WIRED',
        blocker: 'Requires reachable Synthia Server and a valid Computer access token.'
      });
    }
    this.bus.emit('github:configured', { baseUrl: adapter.baseUrl, tokenConfigured: Boolean(adapter.token) });
    return adapter;
  }

  registerBrowserCapabilities() {
    const wired = [
      ['artifact-intake', 'Ingest user artifacts into the Computer VFS.'],
      ['app-mounting', 'Mount ingested artifacts into the workspace shell.'],
      ['morph-expression', 'Persist morph expressions through Computer state.'],
      ['automata', 'Run browser-registered automata through the execution fabric.'],
      ['cultivation', 'Run local cultivation cycles through persisted Computer state.'],
      ['project-workspace', 'Create, edit, preview and persist projects locally.']
    ];
    for (const [id, description] of wired) {
      if (!this.capabilityRegistry.has(id)) {
        this.capabilityRegistry.register(id, {
          providers: ['browser-computer'],
          requires: [],
          description,
          status: 'WIRED'
        });
      }
    }

    const nodeOnly = [
      ['resolve_address', 'computer/services/address-service.mjs', 'Uses node:url file paths and donor modules.'],
      ['resolve_state', 'computer/services/state-resolver.mjs', 'Depends on Node-hosted event history and donor providers.'],
      ['emit_event', 'computer/events/event-emitter.mjs', 'Uses node:fs and node:crypto for append-only persistence.'],
      ['automata_activation', 'computer/services/automata-engine.mjs', 'Uses Node file-path donor loading.'],
      ['world_engine', 'computer/services/world-engine.mjs', 'Uses Node file-path donor loading.'],
      ['penta_ephemeris', 'computer/services/penta-ephemeris.mjs', 'Requires node:child_process, python3 and pyephem.'],
      ['experiment_loop', 'computer/services/experiment-loop.mjs', 'Loads recovered Node-hosted donor implementation.']
    ];
    for (const [id, source, blocker] of nodeOnly) {
      if (!this.capabilityRegistry.has(id)) {
        this.capabilityRegistry.register(id, {
          providers: ['full-computer-runtime'],
          requires: ['node-host'],
          description: source,
          status: 'PRESENT',
          blocker
        });
      }
      if (!this.services.has(id)) {
        this.services.register(id, {
          source,
          status: 'PRESENT',
          environment: 'node-only',
          blocker
        });
      }
    }
  }

  async boot() {
    await this.state.restore();

    if (!this.shells.has('workspace')) this.shells.register('workspace', { name: 'Workspace Shell', kind: 'generic' });
    if (!this.shells.has('hover-field')) this.shells.register('hover-field', { name: 'Hover Field Shell', kind: 'morph-field' });

    registerCanonicalMicros(this.micros);
    registerSystemAdapters(this);
    this.registerBrowserCapabilities();

    this.policy.register('xynthai:age-boundary', ({ ageConfirmed = false } = {}) =>
      ageConfirmed ? { allow: true } : { allow: false, reason: 'XynthAI requires an explicit 18+ age confirmation.' }
    );

    // Rehydrate persisted mounts so restart state remains observable.
    for (const mount of Object.values(this.state.get('mounts', {}))) {
      if (mount?.mountId) this.shellManager.mounted.set(mount.mountId, mount);
    }

    await this.state.set('computer.boot', {
      status: 'ready',
      environment: 'browser',
      at: Date.now(),
      version: '0.3.0-browser-host'
    }, { source: 'boot' });

    this.bus.emit('computer:ready', this.snapshot());
    return this;
  }

  async mountApplication(appId, { artifactId = null, shell = 'workspace' } = {}) {
    if (!this.artifacts.get(artifactId)) throw new Error(`mountApplication: unknown artifact ${artifactId} (ingest first)`);
    const proposal = this.intake.proposeMount(artifactId, { appId, shell });
    const applied = await this.mutations.apply(proposal.id);
    const mount = applied.results[0].result;
    const ns = `apps.${appId}`;
    const runtime = this;

    const contract = {
      mountId: mount.mountId,
      appId,
      artifactId,
      services: Object.freeze({
        getState: (path, fallback) => runtime.state.get(`${ns}.${path}`, fallback),
        setState: (path, value) => runtime.state.set(`${ns}.${path}`, value, { source: `app:${appId}` }),
        readArtifact: () => runtime.vfs.read(runtime.artifacts.get(artifactId).path)
      })
    };

    this.bus.emit('app:contract-issued', {
      appId,
      mountId: mount.mountId,
      services: Object.keys(contract.services),
      environment: 'browser'
    });

    return contract;
  }

  snapshot() {
    return {
      version: '0.3.0-browser-host',
      environment: this.environment,
      state: this.state.snapshot(),
      systems: this.systems.list(),
      micros: this.micros.list(),
      shells: this.shells.list(),
      apps: this.apps.list(),
      tools: this.tools.list(),
      agents: this.agents.list(),
      worlds: this.worlds.list(),
      artifacts: this.artifacts.list(),
      projects: this.projects.list(),
      backends: this.backendsRegistry.list().map(({ id, status }) => ({ id, status })),
      capabilities: this.capabilityRegistry.list(),
      services: this.services.list(),
      mounted: this.shellManager.listMounted()
    };
  }
}

export default BrowserComputerRuntime;
