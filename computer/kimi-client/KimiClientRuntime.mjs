import { MorphChatRuntime } from './vendor/pure-synthia-v0.4.0/src/synthia/morph-chat/runtime.mjs';
import { LocalMorphProvider, OpenAICompatibleProvider } from './vendor/pure-synthia-v0.4.0/src/synthia/morph-chat/providers.mjs';
import { IntegratedToolFactory } from './vendor/pure-synthia-v0.4.0/src/synthia/integrated-tool-factory/integrated-tool-factory.mjs';
import { StateSpace as EmergentStateSpace, EmergentStateMesh } from './vendor/pure-synthia-v0.4.0/src/synthia/emergent-state-space/runtime.mjs';
import { MicroStateSpace } from './vendor/pure-synthia-v0.4.0/src/synthia/orchestrator/microStateSpace.mjs';
import { createAllTools, TOOL_REGISTRY, resolveTool } from './vendor/execution-spine-v0.4.0/src/pure-synthia/automata/registry.js';
import { CapabilityMesh } from './vendor/execution-spine-v0.4.0/src/pure-synthia/integration/mesh-rule-synthesizer.js';
import { ExecutionLoopOrchestrator } from './vendor/execution-spine-v0.4.0/src/pure-synthia/integration/execution-loop-orchestrator.js';
import { FocalStateSpace } from './vendor/execution-spine-v0.4.0/src/pure-synthia/integration/focal-state-space.js';
import * as Addressing from './vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/addressing.js';
import * as HumanDesign from './vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/human-design.js';
import KimiMeshStateSpace from './vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/mesh-state-space.js';
import {
  KleinEngine,
  MessySubstrate,
  DiseMinerModule,
  AutolingModule,
  AutoNovelModule,
  ProppLeviStraussModule,
  AnalogyMysticismModule,
  HistoricalChangeModule,
  CreativityModule,
} from './vendor/klein-mesh-game-engine-v5.1/klein-full-toolkit.browser.mjs';

const CLIENT_VERSION = 'kimi-client-runtime.v1';

function normalizeToolInput(id, input) {
  if (typeof input !== 'string') return input;
  if (id === 'autoling') return { operation: 'recognize', text: input };
  if (id === 'diseminer') return { operation: 'ingest', text: input };
  return input;
}

function safeSummary(value) {
  if (value == null) return null;
  try {
    const text = JSON.stringify(value);
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  } catch {
    return String(value).slice(0, 1200);
  }
}

export class KimiClientRuntime extends EventTarget {
  constructor({ computer = null, modelProvider = null } = {}) {
    super();
    this.version = CLIENT_VERSION;
    this.computer = computer;
    this.started = false;
    this.chat = new MorphChatRuntime({ provider: modelProvider ?? new LocalMorphProvider() });
    this.capabilityMesh = new CapabilityMesh();
    this.focal = new FocalStateSpace();
    this.execution = new ExecutionLoopOrchestrator({ mesh: this.capabilityMesh });
    this.execution.synthesizer.ingestRuntimeInventory(this.focal.inventory());
    this.emergent = new EmergentStateSpace();
    this.emergentMesh = new EmergentStateMesh();
    this.micro = new MicroStateSpace();
    this.kimiState = new KimiMeshStateSpace();
    this.toolFactory = new IntegratedToolFactory();
    this.klein51 = new KleinEngine();
    this.klein51Modules = Object.freeze({
      MessySubstrate,
      DiseMinerModule,
      AutolingModule,
      AutoNovelModule,
      ProppLeviStraussModule,
      AnalogyMysticismModule,
      HistoricalChangeModule,
      CreativityModule,
    });
    this.spineTools = new Map(createAllTools().map((tool) => [tool.id, tool]));
    this.atoKlein = this.chat.klein;
    this.lastToolResult = null;
    this.chat.setToolInvoker((id, input, context = {}) => this.runTool(id, input, context));
  }

  setModelProvider({ endpoint, model, apiKey = '', allowNetwork = () => true } = {}) {
    const provider = new OpenAICompatibleProvider({ endpoint, model, apiKey, allowNetwork });
    this.chat.setProvider(provider);
    return provider;
  }

  useLocalProvider() {
    const provider = new LocalMorphProvider();
    this.chat.setProvider(provider);
    return provider;
  }

  _registerComputer() {
    const c = this.computer;
    if (!c) return;
    for (const [id] of this.atoKlein) {
      c.tools?.register(`kimi:${id}`, {
        name: id,
        family: 'ato-klein',
        status: 'WIRED',
        execute: (input, context = {}) => this.runTool(id, input, context),
      }, { replace: true });
    }
    for (const [id, tool] of this.spineTools) {
      c.tools?.register(`spine:${id}`, {
        name: id,
        family: 'execution-spine',
        status: 'WIRED',
        manifest: typeof tool.manifest === 'function' ? tool.manifest() : null,
        execute: (input, context = {}) => this.runTool(`spine:${id}`, input, context),
      }, { replace: true });
    }

    const bridgeTools = {
      'kimi:chat': (input, context = {}) => this.send(typeof input === 'string' ? input : input?.text, context),
      'kimi:klein-v5.1': (input) => this.processKlein(input),
      'kimi:resolve-address': (input) => this.resolveAddress(input),
      'kimi:resolve-state': (input) => this.resolveState(input),
      'kimi:execution-loop': (input) => this.executeGap(input),
      'kimi:generate-tool': (input) => this.generateTool(input),
    };
    for (const [id, execute] of Object.entries(bridgeTools)) {
      c.tools?.register(id, { name: id, family: 'kimi-client-bridge', status: 'WIRED', execute }, { replace: true });
    }

    const capabilities = [
      ['kimi_client_chat', 'Morph Chat wired to shared Klein/tool execution bridge.'],
      ['klein_tools', 'ATO Klein automatons and Klein Mesh Game Engine v5.1.'],
      ['client_tool_execution', 'Execution-spine 16-tool registry available in the client.'],
      ['client_state_space', 'Kimi addressing, HD codec, emergent and micro state spaces.'],
      ['client_execution_loop', 'CapabilityMesh + ExecutionLoopOrchestrator + FocalStateSpace.'],
      ['integrated_tool_factory', 'Integrated Tool Factory available to generate addressed tools.'],
    ];
    for (const [id, description] of capabilities) {
      c.capabilityRegistry?.register(id, {
        providers: ['kimi-client'],
        requires: [],
        description,
        status: 'WIRED',
        blocker: null,
      }, { replace: true });
    }
    c.services?.register('kimi-client', {
      source: 'computer/kimi-client/KimiClientRuntime.mjs',
      version: this.version,
      status: 'WIRED',
      environment: 'browser-capacitor',
      toolCount: this.listTools().length,
    }, { replace: true });
    c.bus?.emit('kimi-client:wired', this.snapshot());
  }

  async boot() {
    if (this.started) return this;
    this._registerComputer();
    this.started = true;
    this.dispatchEvent(new CustomEvent('ready', { detail: this.snapshot() }));
    return this;
  }

  listTools() {
    const tools = [];
    for (const [id] of this.atoKlein) tools.push({ id, route: 'ato-klein' });
    for (const entry of TOOL_REGISTRY) tools.push({ id: `spine:${entry.id}`, route: 'execution-spine', ...entry });
    tools.push(
      { id: 'klein-v5.1', route: 'klein-mesh-game-engine' },
      { id: 'resolve-address', route: 'kimi-state-space' },
      { id: 'resolve-state', route: 'kimi-state-space' },
      { id: 'execution-loop', route: 'execution-spine' },
      { id: 'generate-tool', route: 'integrated-tool-factory' },
    );
    return tools;
  }

  async runTool(id, input, context = {}) {
    const raw = String(id || '');
    const spineId = raw.startsWith('spine:') ? raw.slice(6) : null;

    if (spineId) {
      const tool = this.spineTools.get(spineId);
      if (!tool) throw new Error(`Unknown execution-spine tool: ${spineId}`);
      const result = await tool.run(input, context);
      this.lastToolResult = { id: raw, result };
      return result?.output instanceof Promise ? await result.output : result;
    }

    const ato = this.atoKlein.get(raw);
    if (ato) {
      const result = await ato.call(normalizeToolInput(raw, input), context);
      this.lastToolResult = { id: raw, result };
      return result;
    }

    const resolved = resolveTool(raw);
    if (resolved) return this.runTool(`spine:${resolved.id}`, input, context);

    if (raw === 'klein-v5.1' || raw === 'kimi:klein-v5.1') return this.processKlein(input);
    if (raw === 'resolve-address' || raw === 'kimi:resolve-address') return this.resolveAddress(input);
    if (raw === 'resolve-state' || raw === 'kimi:resolve-state') return this.resolveState(input);
    if (raw === 'execution-loop' || raw === 'kimi:execution-loop') return this.executeGap(input);
    if (raw === 'generate-tool' || raw === 'kimi:generate-tool') return this.generateTool(input);

    throw new Error(`Unknown Kimi client tool: ${raw}`);
  }

  async send(text, context = {}) {
    const sharedContext = {
      summary: context.summary ?? 'Kimi client runtime attached to SynthAI Computer',
      computer: this.computer?.snapshot?.() ?? null,
      client: this.snapshot({ compact: true }),
      ...(context.sharedContext || {}),
    };
    return this.chat.send(text, { sharedContext });
  }

  async processKlein(input) {
    const text = typeof input === 'string' ? input : (input?.text ?? JSON.stringify(input ?? ''));
    const result = await this.klein51.process(text);
    this.lastToolResult = { id: 'klein-v5.1', result };
    return result;
  }

  resolveAddress(input = {}) {
    if (Number.isFinite(input.arcSecond ?? input.arc)) {
      return { provider: 'kimi-addressing', status: 'resolved', address: Addressing.addressForArcSec(input.arcSecond ?? input.arc) };
    }
    if (input.birthDate) {
      const chart = HumanDesign.calculateHumanDesign(input.birthDate, input.birthTime || '00:00', input.birthLocation ?? null);
      const planet = input.planet || 'Sun';
      const placement = chart.placements?.find((p) => p.planet === planet) ?? chart.placements?.[0] ?? null;
      return { provider: 'kimi-human-design', status: placement ? 'resolved' : 'unknown', planet, placement, chart };
    }
    if (input.address && Number.isInteger(input.address.gate)) {
      return { provider: 'explicit-address', status: 'resolved', address: { ...input.address } };
    }
    return { provider: 'kimi-addressing', status: 'unknown', reason: 'provide arcSecond, birthDate/birthTime, or address' };
  }

  resolveState(input = {}) {
    const addressResult = this.resolveAddress(input);
    const gate = addressResult.address?.gate ?? addressResult.placement?.gate ?? input.gate;
    if (!Number.isInteger(gate) || gate < 1 || gate > 64) {
      return { status: 'unknown', address: addressResult, reason: 'gate 1..64 is required to read the five-dimensional state space' };
    }
    return {
      status: 'resolved',
      gate,
      address: addressResult,
      dimensions: this.kimiState.address(gate),
      content: this.kimiState.contentSummary(),
      emergent: this.emergent.snapshot(),
      emergentMesh: this.emergentMesh.snapshot(),
    };
  }

  async ingestFocalArtifact(artifact, context = {}) {
    return this.focal.ingest(artifact, context);
  }

  async executeTransition(identity, transitionId, args = {}) {
    return this.focal.execute(identity, transitionId, args);
  }

  async executeGap({ artifact = {}, missingCapability, canonicalAddress = null } = {}) {
    const requirement = String(missingCapability || artifact.missingCapability || 'conversation');
    const address = canonicalAddress || artifact.canonicalAddress || {
      planetary: 'Sun', dimension: 'Design', gate: 1, line: 1, color: 1, tone: 1, base: 1,
      degree: 0, minute: 0, second: 0, arcAxis: 0, zodiac: 'Aries', house: 1,
    };
    return this.execution.execute({
      artifact: { ...artifact, canonicalAddress: address },
      probe: async () => ({ ok: false, missingCapabilities: [requirement], canonicalAddress: address }),
      analyze: async () => ({ missingCapabilities: [requirement], canonicalAddress: address }),
      address: async () => address,
      retry: async ({ execute, probeOnly }) => {
        try {
          const output = await execute(artifact.input ?? artifact, { requirement, probeOnly });
          return { ok: true, progress: 1, missingCapabilities: [], output: safeSummary(output) };
        } catch (error) {
          return { ok: false, progress: 0, missingCapabilities: [requirement], error: String(error?.message ?? error) };
        }
      },
      verify: async (observation) => observation?.ok === true,
    });
  }

  generateTool(request = {}) {
    const result = this.toolFactory.generate(request);
    if (result?.tool) {
      this.capabilityMesh.register({
        id: `generated:${result.tool.id}`,
        gate: result.tool.address?.gate ?? null,
        kind: 'generated-tool',
        labels: [result.tool.name, request.purpose, request.input],
        description: request.purpose || request.input || result.tool.name,
        execute: (input, context = {}) => result.tool.call(input, context),
        provenance: { source: 'integrated-tool-factory' },
      });
    }
    return result;
  }

  snapshot({ compact = false } = {}) {
    const snapshot = {
      version: this.version,
      started: this.started,
      tools: this.listTools(),
      morphChat: this.chat.snapshot(),
      executionMeshNodes: this.capabilityMesh.allNodes().length,
      focalInventory: this.focal.inventory(),
      emergent: this.emergent.snapshot(),
      emergentMesh: this.emergentMesh.snapshot(),
      kimiDimensions: this.kimiState.contentSummary(),
      klein51: this.klein51.getStats?.() ?? null,
      generatedTools: this.toolFactory.snapshot(),
      lastToolResult: this.lastToolResult,
    };
    if (!compact) return snapshot;
    return {
      version: snapshot.version,
      started: snapshot.started,
      toolCount: snapshot.tools.length,
      executionMeshNodes: snapshot.executionMeshNodes,
      chatPhase: snapshot.morphChat.phase,
      klein51: snapshot.klein51,
    };
  }
}

export async function createKimiClientRuntime(options = {}) {
  return new KimiClientRuntime(options).boot();
}

export default KimiClientRuntime;
