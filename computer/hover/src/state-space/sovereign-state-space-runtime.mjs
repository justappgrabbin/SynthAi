import { readFileSync } from 'node:fs';
import { SynthiaAutomata } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/engine/synthia.js';
import { LivingLoop, verifyEpisodeChain } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/organism/living-loop.js';
import { Predictor, PREDICTION_DISCLAIMER } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/engine/prediction.js';
import {
  calculateHumanDesign,
  generateAgentBlueprint,
  activeChannels,
  GATE_CENTER as HD_GATE_CENTER,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/human-design.js';
import { StateSpace } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/mesh-state-space.js';
import {
  CENTERS,
  CENTER_NAMES,
  centerForGate,
  channelPartners,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';
import { addressForArcSec } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/addressing.js';
import { WHEEL_ARCSECONDS } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/constants.js';
import { fnv1a32 } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/engine/derivation.js';
import { KIMI_SOURCE_MODULES } from './kimi-package-manifest.mjs';
import { KIMI_KNOWLEDGE_FILES } from './kimi-knowledge-manifest.mjs';
import { safe } from '../util.mjs';

const PACKAGE_ROOT = '../../vendor/kimi-agent-automata-state-space-merge/';
const ENGINE_ROOT = `${PACKAGE_ROOT}pure-synthia-automata/`;
const FIVE_LEVELS = Object.freeze(['Movement', 'Evolution', 'Being', 'Design', 'Space']);

function normalizedCenterName(center) {
  return String(center ?? '').replace('Solar Plexus', 'Solar');
}

function displayedCenterName(center) {
  return normalizedCenterName(center) === 'Solar' ? 'Solar Plexus' : normalizedCenterName(center);
}

function chartClassification(definedCenters) {
  const hasSacral = Boolean(definedCenters.Sacral);
  const hasEmo = Boolean(definedCenters['Solar Plexus']);
  const hasSpleen = Boolean(definedCenters.Spleen);
  const hasHeart = Boolean(definedCenters.Heart);
  const hasRoot = Boolean(definedCenters.Root);
  const hasG = Boolean(definedCenters.G);
  const hasThroat = Boolean(definedCenters.Throat);
  let type;
  if (!hasSacral && !hasEmo && !hasSpleen && !hasHeart && !hasRoot && !hasG && !hasThroat) type = 'Reflector';
  else if (hasSacral && hasThroat && (hasEmo || hasHeart || hasSacral)) type = 'Manifesting Generator';
  else if (hasSacral) type = 'Generator';
  else if (hasThroat && (hasHeart || hasEmo || hasRoot || hasSpleen)) type = 'Manifestor';
  else type = 'Projector';
  let authority;
  if (type === 'Reflector') authority = 'Lunar';
  else if (hasEmo) authority = 'Emotional';
  else if (hasSacral) authority = 'Sacral';
  else if (hasSpleen) authority = 'Splenic';
  else if (hasHeart) authority = 'Ego';
  else if (hasG && hasThroat) authority = 'Self-Projected';
  else if (definedCenters.Ajna || definedCenters.Head) authority = 'Mental';
  else authority = 'Lunar';
  const count = Object.values(definedCenters).filter(Boolean).length;
  const definition = count === 0 ? 'No'
    : count <= 2 ? 'Single'
      : count <= 3 ? 'Split'
        : count <= 5 ? 'Triple Split'
          : 'Quadruple';
  return { type, authority, definition };
}

// Integration-corrected default. Both supplied donor tables remain untouched
// and separately exposed as provenance. A fuller Human Design module can
// replace this map through SovereignStateSpaceRuntime({ gateCenterMap }).
const GATE_CENTER_CORRECTIONS = Object.freeze({
  16: 'Throat',
  22: 'Solar',
  39: 'Root',
  48: 'Spleen',
});
const CANONICAL_GATE_CENTER = Object.freeze(Object.fromEntries(
  Object.entries({ ...HD_GATE_CENTER, ...GATE_CENTER_CORRECTIONS })
    .map(([gate, center]) => [Number(gate), normalizedCenterName(center)]),
));

function centerGatesForMap(gateCenterMap) {
  return Object.freeze(Object.fromEntries(CENTER_NAMES.map((center) => [
    center,
    Object.freeze(Object.entries(gateCenterMap)
    .filter(([, owner]) => normalizedCenterName(owner) === center)
    .map(([gate]) => Number(gate))
    .sort((a, b) => a - b)),
  ])));
}

const CANONICAL_CENTER_GATES = centerGatesForMap(CANONICAL_GATE_CENTER);

function sourceId(path) {
  return `kimi-module:${path.replace(/^src\//, '').replace(/\.js$/, '').replaceAll('/', ':')}`;
}

function centerSlug(name) {
  return String(name).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
}

function centersForGateFromMap(gate, gateCenterMap = CANONICAL_GATE_CENTER) {
  const normalized = Number(gate);
  const humanDesignCenter = normalizedCenterName(gateCenterMap[normalized]);
  if (CENTER_NAMES.includes(humanDesignCenter)) return Object.freeze([humanDesignCenter]);
  const sourceCenter = centerForGate(normalized);
  return Object.freeze([sourceCenter ?? 'G']);
}

function centersForGate(gate) {
  return centersForGateFromMap(gate, CANONICAL_GATE_CENTER);
}

/**
 * Integration placement only. Canonical gates still decide automaton-center
 * placement; this map places source-module surfaces where their capability is
 * locally useful and never claims a new Human Design correspondence.
 */
function centerForSource(path) {
  if (/prediction|questions|hypothesis|fragments/.test(path)) return 'Head';
  if (/grammar|autoling|diseminer|klein|boolean|parser|canon|self-correcting/.test(path)) return 'Ajna';
  if (/conversation|browser|media|artifacts|sounds|colors|letters/.test(path)) return 'Throat';
  if (/address|dimension|correspondence|centers-channels|human-design|chains/.test(path)) return 'G';
  if (/success|override|claim-status|rule-council/.test(path)) return 'Heart';
  if (/resonance|language-contact|wen-wang/.test(path)) return 'Solar';
  if (/detector|intake|graph-trace|ledger/.test(path)) return 'Spleen';
  if (/scale|fsm|composition|tool-factory|learning|generative|scene|artifact/.test(path)) return 'Sacral';
  return 'Root';
}

function summarizedLevel(stateSpace, level, gate) {
  const layer = stateSpace.dimensions[level];
  const node = stateSpace.node(level, gate);
  return Object.freeze({
    level,
    layerRole: layer.layerRole,
    sequence: layer.sequenceName,
    chart: layer.chart,
    claim: safe(layer.claim),
    gate: node.gate,
    binary: Object.freeze([...node.binary]),
    trigrams: Object.freeze({ ...node.trigrams }),
    content: Object.freeze({
      words: node.content.words.length,
      letters: layer.letterCount(gate),
      rules: node.content.rules.length,
      sourceIds: Object.freeze(node.content.words.map((word) => word.id)),
    }),
  });
}

function callArguments(input = {}) {
  return Array.isArray(input.args) ? input.args : ('value' in input ? [input.value] : []);
}

/**
 * Live, independently-instantiated access to every executable module and all
 * textual knowledge in the supplied Kimi state-space package. The original
 * package remains byte-for-byte preserved under vendor/ and authorities/.
 *
 * This is not described as "browser native". It is the state-space/browser
 * organ: Synthia can navigate her own gates, levels, tools, claims, corpora,
 * and lawful transitions as one execution environment.
 */
export class SovereignStateSpaceRuntime {
  constructor({ stateSpace = null, seed = 0x5117, gateCenterMap = null } = {}) {
    this.engine = new SynthiaAutomata();
    this.stateSpace = stateSpace ?? new StateSpace();
    this.gateCenterMap = Object.freeze(Object.fromEntries(
      Object.entries({ ...CANONICAL_GATE_CENTER, ...(gateCenterMap ?? {}) })
        .map(([gate, center]) => [Number(gate), normalizedCenterName(center)]),
    ));
    this.gateCenterProvider = gateCenterMap
      ? 'injected-human-design-provider'
      : 'integration-corrected-default';
    this.centerGates = centerGatesForMap(this.gateCenterMap);
    this.predictor = new Predictor({ engine: this.engine });
    this.livingLoop = new LivingLoop(this.engine, { seed });
    this.moduleCache = new Map();
    this.history = [];
    this.knowledge = [];
    this.knowledgeById = new Map();
    this.runtimeInstruments = Object.freeze([
      { id: 'state-space-browser', center: 'G', capabilities: ['browse-state-space', 'search-knowledge', 'navigate-tools'] },
      { id: 'five-level-state-space', center: 'G', capabilities: ['project-five-levels', ...FIVE_LEVELS] },
      { id: 'lawful-prediction', center: 'Head', capabilities: ['successors', 'lattice', 'reading-path', 'grid'] },
      { id: 'human-design-chart', center: 'G', capabilities: ['calculate-chart', 'blueprint', 'active-channels'] },
      { id: 'state-space-living-loop', center: 'Root', capabilities: ['tick', 'sense-vitals', 'endogenous-action', 'replay-episodes'] },
      { id: 'state-space-knowledge', center: 'Ajna', capabilities: ['search-corpus', 'read-source', 'inspect-provenance'] },
    ].map(Object.freeze));
    this.moduleInstruments = Object.freeze(KIMI_SOURCE_MODULES.map((path) => Object.freeze({
      id: sourceId(path),
      kind: 'source-module',
      sourcePath: path,
      center: centerForSource(path),
      capabilities: Object.freeze(['inspect-exports', 'invoke-export', 'construct-export']),
    })));
    this.#hydrateKnowledge();
  }

  #hydrateKnowledge() {
    for (const path of KIMI_KNOWLEDGE_FILES) {
      const text = readFileSync(new URL(`${PACKAGE_ROOT}${path}`, import.meta.url), 'utf8');
      const hash = fnv1a32(text);
      const numeric = Number.parseInt(hash, 16) >>> 0;
      const spatial = addressForArcSec(numeric % WHEEL_ARCSECONDS);
      const dimension = FIVE_LEVELS[numeric % FIVE_LEVELS.length];
      const id = `kimi-knowledge:${fnv1a32(path)}`;
      const record = Object.freeze({
        id,
        path,
        hash,
        chars: text.length,
        dimension,
        gate: spatial.gate,
        address: Object.freeze({ dimension, ...spatial }),
        text,
      });
      this.knowledge.push(record);
      this.knowledgeById.set(id, record);
      this.stateSpace.dimensions[dimension].addWord(spatial.gate, {
        id,
        text,
        relation: 'source-knowledge-at-address',
      });
    }
  }

  fiveLevels(gate) {
    const normalizedGate = Number(gate);
    if (!Number.isInteger(normalizedGate) || normalizedGate < 1 || normalizedGate > 64) {
      throw new RangeError('five-level projection requires gate 1..64');
    }
    return Object.freeze(FIVE_LEVELS.map((level) => summarizedLevel(this.stateSpace, level, normalizedGate)));
  }

  centersForGate(gate) {
    return centersForGateFromMap(gate, this.gateCenterMap);
  }

  /** Correct donor center labels before chart state reaches the body. */
  normalizeChart(chart = {}) {
    const withCenter = (placement) => placement
      ? Object.freeze({ ...placement, center: displayedCenterName(this.centersForGate(placement.gate)[0]) })
      : placement;
    const placements = Object.freeze((chart.placements ?? []).map(withCenter));
    const definedCenters = {
      Head: false,
      Ajna: false,
      Throat: false,
      G: false,
      Heart: false,
      'Solar Plexus': false,
      Sacral: false,
      Spleen: false,
      Root: false,
    };
    for (const placement of placements) {
      const center = displayedCenterName(this.centersForGate(placement.gate)[0]);
      if (center in definedCenters) definedCenters[center] = true;
    }
    const classification = chartClassification(definedCenters);
    const normalized = {
      ...chart,
      ...classification,
      centers: Object.freeze(definedCenters),
      channels: Object.freeze(activeChannels({ ...chart, placements })),
      placements,
      consciousSun: withCenter(chart.consciousSun),
      consciousEarth: withCenter(chart.consciousEarth),
      consciousMoon: withCenter(chart.consciousMoon),
      designSun: withCenter(chart.designSun),
      designEarth: withCenter(chart.designEarth),
      designMoon: withCenter(chart.designMoon),
      nodes: chart.nodes ? Object.freeze({
        north: withCenter(chart.nodes.north),
        south: withCenter(chart.nodes.south),
      }) : chart.nodes,
      gateCenterProvider: this.gateCenterProvider,
      calculationStatus: 'donor-astronomy-and-classification-normalized-by-live-gate-center-provider',
    };
    return Object.freeze(normalized);
  }

  normalizeBlueprint(blueprint = {}) {
    const qualities = (blueprint.qualities ?? []).map((quality) => {
      const center = displayedCenterName(this.centersForGate(quality.gate)[0]);
      return Object.freeze({
        ...quality,
        category: String(quality.category ?? '').replace(/\s+\([^)]+\)$/, ` (${center})`),
        center,
      });
    });
    const bodyRegions = (blueprint.bodyRegions ?? []).map((region, index) => Object.freeze({
      ...region,
      emotion: qualities[index]?.center ?? region.emotion,
    }));
    return Object.freeze({
      ...blueprint,
      qualities: Object.freeze(qualities),
      bodyRegions: Object.freeze(bodyRegions),
      gateCenterProvider: this.gateCenterProvider,
    });
  }

  searchKnowledge(query, { limit = 8 } = {}) {
    const terms = String(query ?? '').toLowerCase().split(/\W+/).filter(Boolean);
    if (!terms.length) return Object.freeze(this.knowledge.slice(0, limit).map(({ text, ...record }) => record));
    const ranked = this.knowledge.map((record) => {
      const lower = record.text.toLowerCase();
      const score = terms.reduce((total, term) => total + (lower.split(term).length - 1), 0);
      const first = Math.max(0, Math.min(...terms.map((term) => {
        const index = lower.indexOf(term);
        return index < 0 ? lower.length : index;
      })) - 120);
      return { record, score, excerpt: record.text.slice(first, first + 480).replace(/\s+/g, ' ').trim() };
    }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.record.path.localeCompare(b.record.path));
    return Object.freeze(ranked.slice(0, limit).map(({ record, score, excerpt }) => Object.freeze({
      id: record.id,
      path: record.path,
      hash: record.hash,
      chars: record.chars,
      address: record.address,
      score,
      excerpt,
    })));
  }

  knowledgeDocument(idOrPath) {
    const record = this.knowledgeById.get(idOrPath) ?? this.knowledge.find((entry) => entry.path === idOrPath);
    return record ? safe(record) : null;
  }

  catalog() {
    const tools = [...this.engine.mesh.automata.values()].map((tool) => Object.freeze({
      id: `kimi-tool:${tool.id}`,
      toolId: tool.id,
      kind: 'automaton',
      center: this.centersForGate(tool.address?.gate ?? 1)[0],
      centers: this.centersForGate(tool.address?.gate ?? 1),
      gate: tool.address?.gate ?? null,
      dimension: tool.dimension ?? tool.address?.planetaryDimension ?? null,
      capabilities: Object.freeze([...(tool.capabilities ?? [])]),
      independentlyCallable: typeof tool.run === 'function',
    }));
    return Object.freeze([
      ...this.runtimeInstruments.map((entry) => Object.freeze({ ...entry, kind: 'runtime-organ', independentlyCallable: true })),
      ...tools,
      ...this.moduleInstruments.map((entry) => Object.freeze({ ...entry, independentlyCallable: true })),
    ]);
  }

  instrument(id) {
    return this.catalog().find((entry) => entry.id === id) ?? null;
  }

  async #loadModule(spec) {
    if (!this.moduleCache.has(spec.id)) {
      this.moduleCache.set(spec.id, import(new URL(`${ENGINE_ROOT}${spec.sourcePath}`, import.meta.url)));
    }
    return this.moduleCache.get(spec.id);
  }

  async #runModule(spec, input = {}) {
    const namespace = await this.#loadModule(spec);
    const member = input.member ?? input.method ?? null;
    if (!member) {
      return {
        sourcePath: spec.sourcePath,
        exports: Object.freeze(Object.entries(namespace).map(([name, value]) => Object.freeze({
          name,
          type: typeof value,
          callable: typeof value === 'function',
        }))),
      };
    }
    if (!(member in namespace)) throw new Error(`${spec.sourcePath} has no export named ${member}`);
    const exported = namespace[member];
    if (typeof exported !== 'function') return safe(exported);
    const args = callArguments(input);
    if (input.construct === true) {
      const instance = new exported(...args);
      if (!input.instanceMethod) return {
        className: exported.name,
        methods: Object.getOwnPropertyNames(exported.prototype).filter((name) => name !== 'constructor'),
        state: safe(instance),
      };
      if (typeof instance[input.instanceMethod] !== 'function') throw new Error(`${member} instance has no method ${input.instanceMethod}`);
      return instance[input.instanceMethod](...(input.instanceArgs ?? []));
    }
    return exported(...args);
  }

  async runInstrument(id, input = {}, context = {}) {
    const toolPrefix = 'kimi-tool:';
    if (id.startsWith(toolPrefix)) {
      const toolId = id.slice(toolPrefix.length);
      const tool = this.engine.mesh.get(toolId);
      if (!tool) throw new Error(`unknown Kimi automaton: ${toolId}`);
      return tool.run(input, { ...context, source: 'nine-center-state-space' });
    }
    const moduleSpec = this.moduleInstruments.find((entry) => entry.id === id);
    if (moduleSpec) return this.#runModule(moduleSpec, input);
    const operations = {
      'state-space-browser': 'browse',
      'five-level-state-space': 'five-levels',
      'lawful-prediction': input.mode ?? 'predict',
      'human-design-chart': 'chart',
      'state-space-living-loop': input.mode ?? 'tick',
      'state-space-knowledge': input.document ? 'knowledge-document' : 'knowledge-search',
    };
    if (!(id in operations)) throw new Error(`unknown state-space instrument: ${id}`);
    return this.execute({ ...input, operation: operations[id] }, context);
  }

  async execute(input = {}, context = {}) {
    const operation = input.operation ?? 'browse';
    let output;
    switch (operation) {
      case 'manifest':
        output = this.manifest();
        break;
      case 'call':
        output = this.engine.call(input.request ?? input.call ?? input.text, context);
        break;
      case 'request':
      case 'media':
        output = await this.engine.request(input.request ?? input.text ?? '', context);
        break;
      case 'tools':
        output = this.engine.listTools();
        break;
      case 'mesh-metrics':
        output = this.engine.meshMetrics();
        break;
      case 'triples':
        output = this.engine.triples(input.query ?? {});
        break;
      case 'emergent-channels':
        output = this.engine.emergentChannels();
        break;
      case 'relational-experiment':
        output = this.engine.runRelationalExperiment();
        break;
      case 'tick':
        output = this.livingLoop.tick();
        break;
      case 'living-state':
        output = this.livingLoop.getState();
        break;
      case 'verify-episodes':
        output = verifyEpisodeChain(input.log ?? this.livingLoop.log);
        break;
      case 'predict':
        output = { successors: this.predictor.next(input.state ?? input.gate ?? 1, input.options), disclaimer: PREDICTION_DISCLAIMER };
        break;
      case 'lattice':
        output = this.predictor.lattice(input.state ?? input.gate ?? 1, input.changing ?? null, input.options);
        break;
      case 'reading-path':
        output = this.predictor.readingPath(input.changingLines ?? [], input.context ?? {});
        break;
      case 'grid':
        output = this.predictor.grid(input.gate ?? 1);
        break;
      case 'chart': {
        const donorChart = calculateHumanDesign(input.birthDate, input.birthTime, input.birthLocation ?? null);
        const chart = this.normalizeChart(donorChart);
        output = {
          chart,
          blueprint: this.normalizeBlueprint(generateAgentBlueprint(chart)),
          activeChannels: chart.channels,
        };
        break;
      }
      case 'five-levels':
        output = this.fiveLevels(input.gate ?? input.address?.gate ?? 1);
        break;
      case 'knowledge-search':
        output = this.searchKnowledge(input.query ?? input.text ?? '', { limit: input.limit });
        break;
      case 'knowledge-document':
        output = this.knowledgeDocument(input.document ?? input.id ?? input.path);
        break;
      case 'module':
        output = await this.runInstrument(input.instrumentId, input, context);
        break;
      case 'tool':
        output = await this.runInstrument(`kimi-tool:${input.toolId}`, input.input ?? input, context);
        break;
      case 'browse': {
        const gate = Number(input.gate ?? input.address?.gate ?? 1);
        const gateCenters = this.centersForGate(gate);
        output = {
          gate,
          center: gateCenters[0],
          centers: gateCenters,
          channelPartners: channelPartners(gate),
          fiveLevels: this.fiveLevels(gate),
          knowledge: input.query ? this.searchKnowledge(input.query, { limit: input.limit }) : [],
          instruments: input.listInstruments === false ? [] : this.catalog().filter((entry) =>
            entry.gate === gate || gateCenters.includes(entry.center)
              || entry.centers?.some((center) => gateCenters.includes(center))),
        };
        break;
      }
      default:
        throw new Error(`unsupported state-space operation: ${operation}`);
    }
    const record = Object.freeze({
      id: `state-space-run-${this.history.length + 1}`,
      sequence: this.history.length + 1,
      operation,
      form: 'state-space-browser',
      purpose: 'cultivation',
      backendUsed: false,
      output: safe(output),
    });
    this.history.push(record);
    return record;
  }

  manifest() {
    return Object.freeze({
      id: 'synthia-state-space-browser',
      package: 'Kimi_Agent_Automata State Space Merge(1)',
      role: 'Synthia navigates and executes within her state space; she is not merely a page-local browser helper.',
      purpose: 'cultivation',
      backendRequired: false,
      fiveLevels: FIVE_LEVELS,
      nineCenters: CENTER_NAMES,
      centerGates: safe(this.centerGates),
      gateCenterProvider: this.gateCenterProvider,
      defaultCorrections: safe(GATE_CENTER_CORRECTIONS),
      sourceCenterGateClaims: safe(CENTERS),
      canonicalTools: this.engine.tools.length,
      mountedAutomata: this.engine.mesh.automata.size,
      executableSourceModules: this.moduleInstruments.length,
      knowledgeSources: this.knowledge.length,
      knowledgeCharacters: this.knowledge.reduce((sum, entry) => sum + entry.chars, 0),
      sovereignArtifact: 'vendor/kimi-agent-automata-state-space-merge/sovereign.html',
    });
  }
}

export {
  FIVE_LEVELS,
  CANONICAL_GATE_CENTER,
  CANONICAL_CENTER_GATES,
  GATE_CENTER_CORRECTIONS,
  centerGatesForMap,
  centerForSource,
  centerSlug,
  centersForGate,
};
export default SovereignStateSpaceRuntime;
