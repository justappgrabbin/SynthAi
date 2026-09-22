import { EventBus, MemoryPersistence, StateStore, Registry } from './core/kernel.mjs';
import { VirtualFileSystem, ArtifactIntake } from './runtime/storage.mjs';
import { AutomataEngine, ProcessFabric, BackendBroker } from './runtime/execution.mjs';
import { CapabilityGraph, MorphEngine, CultivationEngine, PolicyEngine } from './runtime/experience.mjs';
import { ShellManager, MutationDispatcher } from './runtime/shells.mjs';
import { ProjectWorkspace } from './runtime/projects.mjs';
import { GitHubWorkspaceAdapter } from './adapters/GitHubWorkspaceAdapter.mjs';
import { registerCanonicalMicros } from './micros/MicroRegistry.mjs';
import { registerSystemAdapters } from './adapters/SystemAdapters.mjs';

export class ComputerRuntime {
  constructor({ persistence = new MemoryPersistence(), namespace = 'synthai-computer', github = null } = {}) {
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

    this.vfs = new VirtualFileSystem({ bus: this.bus, state: this.state });
    this.shellManager = new ShellManager({ bus: this.bus, shells: this.shells, apps: this.apps, state: this.state });
    this.automata = new AutomataEngine({ bus: this.bus, automata: this.automataRegistry, tools: this.tools, state: this.state });
    this.processes = new ProcessFabric({ bus: this.bus, processes: this.processRegistry, state: this.state });
    this.backends = new BackendBroker({ bus: this.bus, backends: this.backendsRegistry });
    this.capabilities = new CapabilityGraph({ capabilities: this.capabilityRegistry });
    this.morph = new MorphEngine({ bus: this.bus, state: this.state, micros: this.micros });
    this.cultivation = new CultivationEngine({ bus: this.bus, state: this.state });
    this.policy = new PolicyEngine({ bus: this.bus });
    this.mutations = new MutationDispatcher({ bus: this.bus, state: this.state, shellManager: this.shellManager, automata: this.automata, tools: this.tools, agents: this.agents, morph: this.morph });
    this.intake = new ArtifactIntake({ bus: this.bus, vfs: this.vfs, artifacts: this.artifacts, mutations: this.mutations });
    this.projects = new ProjectWorkspace({ bus: this.bus, state: this.state, vfs: this.vfs, backends: this.backends });

    if (github) this.configureGitHub(github);
  }

  configureGitHub(config = {}) {
    const adapter = config instanceof GitHubWorkspaceAdapter ? config : new GitHubWorkspaceAdapter(config);
    this.backends.register('github', adapter, { replace: true });
    this.capabilityRegistry.register('github-project-publish', {
      providers: ['github'],
      requires: ['synthia-server'],
      description: 'Publish Computer project files through the authenticated Synthia Server GitHub bridge.'
    }, { replace: true });
    this.bus.emit('github:configured', { baseUrl: adapter.baseUrl, tokenConfigured: Boolean(adapter.token) });
    return adapter;
  }

  async boot() {
    await this.state.restore();
    if (!this.shells.has('workspace')) this.shells.register('workspace', { name: 'Workspace Shell', kind: 'generic' });
    if (!this.shells.has('hover-field')) this.shells.register('hover-field', { name: 'Hover Field Shell', kind: 'morph-field' });
    registerCanonicalMicros(this.micros);
    registerSystemAdapters(this);

    this.policy.register('xynthai:age-boundary', ({ ageConfirmed = false } = {}) =>
      ageConfirmed ? { allow: true } : { allow: false, reason: 'XynthAI requires an explicit 18+ age confirmation.' }
    );

    for (const id of ['artifact-intake', 'app-mounting', 'morph-expression', 'automata', 'cultivation', 'project-workspace']) {
      if (!this.capabilityRegistry.has(id)) this.capabilities.register(id, { providers: ['computer'] });
    }

    await this.state.set('computer.boot', { status: 'ready', at: Date.now(), version: '0.2.0-project-workspace' }, { source: 'boot' });
    this.bus.emit('computer:ready', this.snapshot());
    return this;
  }

  snapshot() {
    return {
      version: '0.2.0-project-workspace',
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
      mounted: this.shellManager.listMounted()
    };
  }
}
