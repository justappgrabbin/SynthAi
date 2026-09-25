/**
 * AstroQualities — zodiac house and sign qualities for tool generation.
 *
 * Houses define what a tool IS FOR (functional domain).
 * Element defines HOW it operates (execution style/energy).
 * Modality defines its ROLE in the system (cardinal=initiates, fixed=sustains, mutable=adapts).
 *
 * These three axes together determine generated code structure, not just metadata.
 * A Fire-Cardinal-House1 tool is an event trigger.
 * An Earth-Fixed-House10 tool is a persistent state manager.
 * An Air-Mutable-House3 tool is a message transformer.
 */

// ── House qualities (1-12) ────────────────────────────────────────────────────
export const HOUSES = {
  1:  {
    n: 1, name: 'Identity',       domain: 'self/initiation',
    role: 'Initiator',            verb: 'initiates',
    codeRole: 'factory',          interface: 'create',
    desc: 'Begins processes, creates identity markers, sets entry points',
    jsdoc: '@role Initiator — spawns new instances and establishes identity',
  },
  2:  {
    n: 2, name: 'Resources',      domain: 'values/accumulation',
    role: 'Accumulator',          verb: 'collects',
    codeRole: 'store',            interface: 'store',
    desc: 'Accumulates values, manages state, tracks resources over time',
    jsdoc: '@role Accumulator — stores, indexes, and retrieves valued items',
  },
  3:  {
    n: 3, name: 'Communication',  domain: 'exchange/signaling',
    role: 'Messenger',            verb: 'transmits',
    codeRole: 'emitter',          interface: 'emit',
    desc: 'Transmits signals, broadcasts messages, encodes and decodes',
    jsdoc: '@role Messenger — transmits signals between system components',
  },
  4:  {
    n: 4, name: 'Foundation',     domain: 'pattern/containment',
    role: 'Container',            verb: 'grounds',
    codeRole: 'structure',        interface: 'build',
    desc: 'Establishes base structures, holds patterns, provides containment',
    jsdoc: '@role Container — grounds data in stable structural patterns',
  },
  5:  {
    n: 5, name: 'Expression',     domain: 'creativity/generation',
    role: 'Generator',            verb: 'creates',
    codeRole: 'generator',        interface: 'generate',
    desc: 'Generates novel outputs, creative recombination, expression',
    jsdoc: '@role Generator — produces novel combinations from learned patterns',
  },
  6:  {
    n: 6, name: 'Analysis',       domain: 'refinement/service',
    role: 'Analyzer',             verb: 'refines',
    codeRole: 'analyzer',         interface: 'analyze',
    desc: 'Analyzes inputs, identifies patterns, refines and filters',
    jsdoc: '@role Analyzer — examines inputs and surfaces structural patterns',
  },
  7:  {
    n: 7, name: 'Relation',       domain: 'connection/pairing',
    role: 'Connector',            verb: 'connects',
    codeRole: 'connector',        interface: 'link',
    desc: 'Establishes relations between entities, manages pairings',
    jsdoc: '@role Connector — links entities and maintains relational state',
  },
  8:  {
    n: 8, name: 'Transformation', domain: 'depth/mutation',
    role: 'Transformer',          verb: 'transforms',
    codeRole: 'transformer',      interface: 'transform',
    desc: 'Deep structural transformation, mutation, regeneration',
    jsdoc: '@role Transformer — applies deep structural mutations to input',
  },
  9:  {
    n: 9, name: 'Synthesis',      domain: 'meaning/expansion',
    role: 'Synthesizer',          verb: 'synthesizes',
    codeRole: 'synthesizer',      interface: 'synthesize',
    desc: 'Combines disparate patterns into unified meaning structures',
    jsdoc: '@role Synthesizer — integrates distributed patterns into coherent wholes',
  },
  10: {
    n: 10, name: 'Structure',     domain: 'authority/order',
    role: 'Orchestrator',         verb: 'orders',
    codeRole: 'orchestrator',     interface: 'orchestrate',
    desc: 'Orchestrates other tools, sets order, manages authority',
    jsdoc: '@role Orchestrator — coordinates subordinate tools in structured sequence',
  },
  11: {
    n: 11, name: 'Innovation',    domain: 'network/future',
    role: 'Innovator',            verb: 'innovates',
    codeRole: 'mesh',             interface: 'broadcast',
    desc: 'Broadcasts innovations across the mesh, networks future states',
    jsdoc: '@role Innovator — broadcasts emerging patterns across the peer mesh',
  },
  12: {
    n: 12, name: 'Dissolution',   domain: 'transcendence/release',
    role: 'Releaser',             verb: 'releases',
    codeRole: 'gc',               interface: 'release',
    desc: 'Releases held patterns, garbage collects stale state, dissolves',
    jsdoc: '@role Releaser — identifies and dissolves stale or blocking patterns',
  },
};

// ── Sign qualities ─────────────────────────────────────────────────────────────
export const SIGN_QUALITIES = {
  ARI: { element: 'fire',  modality: 'cardinal', quality: 'impulse',    executionStyle: 'eager'       },
  TAU: { element: 'earth', modality: 'fixed',    quality: 'stability',  executionStyle: 'memoized'    },
  GEM: { element: 'air',   modality: 'mutable',  quality: 'versatility',executionStyle: 'adaptive'    },
  CAN: { element: 'water', modality: 'cardinal', quality: 'receptivity',executionStyle: 'reactive'    },
  LEO: { element: 'fire',  modality: 'fixed',    quality: 'presence',   executionStyle: 'persistent'  },
  VIR: { element: 'earth', modality: 'mutable',  quality: 'precision',  executionStyle: 'iterative'   },
  LIB: { element: 'air',   modality: 'cardinal', quality: 'balance',    executionStyle: 'comparative' },
  SCO: { element: 'water', modality: 'fixed',    quality: 'depth',      executionStyle: 'recursive'   },
  SAG: { element: 'fire',  modality: 'mutable',  quality: 'expansion',  executionStyle: 'exploratory' },
  CAP: { element: 'earth', modality: 'cardinal', quality: 'authority',  executionStyle: 'sequential'  },
  AQU: { element: 'air',   modality: 'fixed',    quality: 'innovation', executionStyle: 'parallel'    },
  PIS: { element: 'water', modality: 'mutable',  quality: 'dissolution',executionStyle: 'streaming'   },
};

// ── Element behavioral profiles ───────────────────────────────────────────────
export const ELEMENT_PROFILES = {
  fire: {
    name: 'Fire',       symbol: '🜂',
    energy: 'active',   direction: 'outward',
    codePattern: 'event-driven',
    learning: 'by doing — fires and forgets, learns from emission counts',
    jsdoc: '@element Fire — active, outward, event-driven execution',
    meshBehavior: 'broadcasts eagerly, high emission frequency',
  },
  earth: {
    name: 'Earth',      symbol: '🜃',
    energy: 'stable',   direction: 'inward',
    codePattern: 'state-managed',
    learning: 'by accumulation — grows a persistent weighted table',
    jsdoc: '@element Earth — stable, accumulative, state-managed execution',
    meshBehavior: 'stores and indexes, slow broadcast, high retention',
  },
  air: {
    name: 'Air',        symbol: '🜁',
    energy: 'relational', direction: 'lateral',
    codePattern: 'pipe-and-filter',
    learning: 'by relation — maps connections, builds relational structures',
    jsdoc: '@element Air — relational, lateral, pipe-and-filter execution',
    meshBehavior: 'relays messages, bidirectional, high connectivity',
  },
  water: {
    name: 'Water',      symbol: '🜄',
    energy: 'receptive', direction: 'inward',
    codePattern: 'stream-based',
    learning: 'by absorption — pools inputs, learns from accumulation',
    jsdoc: '@element Water — receptive, absorptive, stream-based execution',
    meshBehavior: 'absorbs incoming data, slow broadcast, deep retention',
  },
};

// ── Modality roles ─────────────────────────────────────────────────────────────
export const MODALITY_ROLES = {
  cardinal: {
    name: 'Cardinal', role: 'initiator',
    systemRole: 'Starts new processes, opens new phases in the lifecycle',
    codeVerb: 'create / spawn / init / trigger',
    constructorNote: 'Immediately begins work on construction — no lazy init',
  },
  fixed: {
    name: 'Fixed',    role: 'sustainer',
    systemRole: 'Maintains state, holds patterns in stable form, resists change',
    codeVerb: 'hold / maintain / cache / persist',
    constructorNote: 'Caches aggressively — prefer memoization patterns',
  },
  mutable: {
    name: 'Mutable',  role: 'adapter',
    systemRole: 'Adapts inputs to context, transforms between states/forms',
    codeVerb: 'transform / adapt / convert / route',
    constructorNote: 'Stateless where possible — prefer pure transformation functions',
  },
};

// ── Quality resolver — the main export for ToolFactory ───────────────────────
/**
 * Resolve the full quality profile for a tool from its ontological address.
 * Returns a QualityProfile used to shape code generation.
 */
export function resolveQuality(address) {
  if (!address) return defaultQuality();

  const houseN = typeof address.H === 'number'
    ? address.H
    : (typeof address === 'object' ? address.H : 1);
  const zodAbbr = address.ZOD || 'ARI';

  const house   = HOUSES[houseN]   || HOUSES[1];
  const sign    = SIGN_QUALITIES[zodAbbr] || SIGN_QUALITIES.ARI;
  const element = ELEMENT_PROFILES[sign.element] || ELEMENT_PROFILES.fire;
  const modality = MODALITY_ROLES[sign.modality] || MODALITY_ROLES.cardinal;

  return {
    house,
    sign: { abbr: zodAbbr, ...sign },
    element,
    modality,
    // Combined descriptor for tool naming and docstring
    summary: `${modality.name} ${element.name} ${house.name}`,
    codeRole: house.codeRole,
    executionStyle: sign.executionStyle,
    interface: house.interface,
    verb: house.verb,
    jsdoc: [house.jsdoc, element.jsdoc].join('\n * '),
    // Affect code structure
    useCache: sign.modality === 'fixed'    || sign.element === 'earth',
    useStream: sign.element === 'water'    || sign.executionStyle === 'streaming',
    useEvents: sign.element === 'fire'     || house.codeRole === 'emitter',
    useParallel: sign.executionStyle === 'parallel' || sign.modality === 'cardinal',
    usePure: sign.modality === 'mutable',
  };
}

function defaultQuality() {
  return resolveQuality({ H: 1, ZOD: 'ARI' });
}

/**
 * Generate a quality-shaped code scaffold — wraps any template output
 * with the correct structure for this house/element/modality.
 */
export function wrapWithQuality(code, quality, toolName, address) {
  const { house, element, modality, sign } = quality;
  const header = `/**
 * ${toolName}
 * Ontological address: ${address}
 *
 * House ${house.n} — ${house.name} (${house.domain})
 * ${house.jsdoc}
 *
 * Sign: ${sign.abbr} | Element: ${element.name} ${element.symbol} | Modality: ${modality.name}
 * ${element.jsdoc}
 *
 * Execution style: ${sign.executionStyle}
 * System role: ${modality.systemRole}
 * Primary interface: ${house.interface}(...)
 *
 * Learning pattern: ${element.learning}
 * Mesh behavior: ${element.meshBehavior}
 */
`;

  // Wrap with quality-appropriate lifecycle
  const lifecycle = buildLifecycle(quality, toolName);

  return header + code + '\n\n' + lifecycle;
}

function buildLifecycle(quality, toolName) {
  const { house, sign, modality } = quality;

  if (quality.useStream) {
    return `// ${toolName} — stream lifecycle (${sign.abbr} water pattern)
export async function* stream${toolName}(source) {
  for await (const item of source) {
    yield await ${house.interface}${toolName}(item);
  }
}`;
  }

  if (quality.useEvents) {
    return `// ${toolName} — event lifecycle (fire pattern)
// Integrate with ChangingLineEngine: engine.on('changingLine', e => ${house.interface}${toolName}(e))`;
  }

  if (quality.useCache) {
    return `// ${toolName} — cached lifecycle (earth/fixed pattern)
const _cache_${toolName} = new Map();
export function cached${toolName}(key, ...args) {
  if (_cache_${toolName}.has(key)) return _cache_${toolName}.get(key);
  const result = ${house.interface}${toolName}?.(...args);
  _cache_${toolName}.set(key, result);
  return result;
}`;
  }

  if (quality.usePure) {
    return `// ${toolName} — pure transformation lifecycle (mutable/air pattern)
// Pure: no side effects, same input always produces same output
// Compose freely: pipe(input, ${toolName}A, ${toolName}B, ${toolName}C)`;
  }

  return `// ${toolName} — standard lifecycle
// House ${house.n}: ${house.desc}`;
}
