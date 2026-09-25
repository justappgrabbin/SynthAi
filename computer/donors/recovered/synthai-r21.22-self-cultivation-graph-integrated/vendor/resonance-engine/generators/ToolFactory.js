/**
 * ToolFactory — generates tools at EVERY level of the generative hierarchy.
 *
 * The hierarchy (from the user's description):
 *   Level 0 — Base (B): quantum fragment, 5-state — monogram seeds
 *   Level 1 — Tone (T): monogram yin/yang — 1-line tools
 *   Level 2 — Color (C): I Ching line — filter/predicate tools
 *   Level 3 — Bigram (ARC×ZOD): 2-line pattern — pattern-matcher tools
 *   Level 4 — Trigram (C+T+B): 3-line pattern — analyzer tools
 *                               (MorphoAnalyzer, SemNet, Disseminer)
 *   Level 5 — Hexagram (Gate): 6-line = two trigrams — grammar-rule tools
 *   Level 6 — Channel: two gates via changing line — connector tools
 *   Level 7 — Circuit/Triple: three channels — AutoLing-scale tools
 *
 * Any combination at any level CAN generate a tool.
 * The tool's complexity scales with the level.
 * AutoLing is a Level-7 tool composed of three Level-4 tools:
 *   MorphoAnalyzer + SemNet + Disseminer → AutoLing
 */

import { v4 as uuidv4 } from 'uuid';
import { BY_FUXI } from '../data/hexagrams.js';
import { resolveQuality, wrapWithQuality, HOUSES, SIGN_QUALITIES, ELEMENT_PROFILES, MODALITY_ROLES } from './AstroQualities.js';

// ── Level descriptors ─────────────────────────────────────────────────────────
export const LEVELS = [
  { n: 0, name: 'Base',      symbol: 'B', description: 'Quantum fragment — 5-state seed value',    complexity: 'monogram' },
  { n: 1, name: 'Tone',      symbol: 'T', description: 'Yin/yang classifier — 1-line tool',        complexity: 'monogram' },
  { n: 2, name: 'Color',     symbol: 'C', description: 'I Ching line — filter / predicate',        complexity: 'monogram' },
  { n: 3, name: 'Bigram',    symbol: '⚌', description: 'ARC×ZOD pattern — 2-line matcher',        complexity: 'bigram'   },
  { n: 4, name: 'Trigram',   symbol: '☰', description: 'C+T+B analyzer — 3-line structural tool',  complexity: 'trigram'  },
  { n: 5, name: 'Hexagram',  symbol: '䷀', description: 'Gate — two trigrams, grammar rule',       complexity: 'hexagram' },
  { n: 6, name: 'Channel',   symbol: '⚡', description: 'Two gates via changing line — connector', complexity: 'channel'  },
  { n: 7, name: 'Circuit',   symbol: '⊕', description: 'Three channels — AutoLing-scale system',  complexity: 'circuit'  },
];

// ── Code templates per level ──────────────────────────────────────────────────
const TEMPLATES = {
  // Level 0: Base — a constant / seed value
  0: (ctx) => `// Base fragment — ${ctx.address}
export const BASE_${ctx.toolName.toUpperCase()} = Object.freeze({
  address: '${ctx.address}',
  value: ${ctx.base},
  tone: ${ctx.tone},
  color: ${ctx.color},
  yang: ${ctx.classical === 1},
  seed: ${ctx.fuxi ?? 0},
});`,

  // Level 1: Tone — a yin/yang classifier function
  1: (ctx) => `// Tone classifier — ${ctx.address}
export function ${ctx.toolName}(value) {
  // Tone ${ctx.tone}, Color ${ctx.color}, Base ${ctx.base}
  // Yang attractor: ${ctx.classical === 1 ? '0.75' : '0.25'}
  const attractor = ${ctx.classical === 1 ? 0.75 : 0.25};
  const isYang = value > 0.5;
  const tension = Math.abs(value - attractor);
  return { isYang, isYin: !isYang, value, tension, changing: tension > 0.35 };
}`,

  // Level 2: Color — a filter / predicate
  2: (ctx) => `// Color filter — ${ctx.address}
export function ${ctx.toolName}(items, featureKey = null) {
  // Color ${ctx.color} filter: pass items matching this line's feature profile
  // Gate ${ctx.gate}, Line ${ctx.line}
  const FEATURE_WEIGHTS = { isYang: ${ctx.classical}, color: ${ctx.color}, tone: ${ctx.tone} };
  return items.filter(item => {
    if (featureKey) return Boolean(item[featureKey]);
    const score = Object.entries(FEATURE_WEIGHTS).reduce((s, [k, v]) =>
      s + (item[k] !== undefined ? Math.abs(item[k] - v) : 0), 0);
    return score < ${ctx.color};
  });
}`,

  // Level 3: Bigram — a pattern matcher
  3: (ctx) => `// Bigram pattern matcher — ${ctx.address}
// ARC ${ctx.arc} × ZOD_${ctx.zod} — 2-line pattern: ${ctx.bigramPattern || '01·10'}
export function ${ctx.toolName}(sequenceA, sequenceB) {
  const PATTERN = [${ctx.bigram1 ?? 0}, ${ctx.bigram2 ?? 0}]; // [ARC-bigram, ZOD-bigram]
  function encode(seq) {
    return seq.map(v => v > 0.5 ? 1 : 0);
  }
  const a = encode(Array.isArray(sequenceA) ? sequenceA : [sequenceA]);
  const b = encode(Array.isArray(sequenceB) ? sequenceB : [sequenceB]);
  const matchA = a.reduce((s, v, i) => s + (v === PATTERN[0] ? 1 : 0), 0) / a.length;
  const matchB = b.reduce((s, v, i) => s + (v === PATTERN[1] ? 1 : 0), 0) / b.length;
  return { match: (matchA + matchB) / 2, patternA: PATTERN[0], patternB: PATTERN[1],
           address: '${ctx.address}' };
}`,

  // Level 4: Trigram — an analyzer (MorphoAnalyzer / SemNet / Disseminer pattern)
  4: (ctx) => `// Trigram analyzer — ${ctx.address}
// C${ctx.color}·T${ctx.tone}·B${ctx.base} — ${ctx.lower || '?'}/${ctx.upper || '?'} trigram family
export class ${ctx.toolName} {
  constructor() {
    this.address = '${ctx.address}';
    this.features = { color: ${ctx.color}, tone: ${ctx.tone}, base: ${ctx.base} };
    this.table = new Map();
    this.learnCount = 0;
  }

  analyze(input) {
    const key = String(input).toLowerCase().slice(0, 32);
    if (this.table.has(key)) return this.table.get(key);
    const result = {
      input,
      features: this.features,
      pattern: [${ctx.bigram1 ?? 0}, ${ctx.bigram2 ?? 0}, ${ctx.base ?? 1}],
      address: this.address,
    };
    this.table.set(key, result);
    return result;
  }

  learn(data) {
    this.learnCount++;
    (Array.isArray(data) ? data : [data]).forEach(item => this.analyze(item));
    return { learned: this.learnCount, tableSize: this.table.size };
  }

  generate(seed = null) {
    const entries = [...this.table.keys()];
    const base = seed || entries[Math.floor(Math.random() * entries.length)] || 'generate';
    return { generated: base + '_' + this.features.tone, address: this.address };
  }
}`,

  // Level 5: Hexagram — a grammar rule / production rule as data
  5: (ctx) => `// Hexagram grammar rule — ${ctx.address}
// Gate ${ctx.gate} (${ctx.name}): ${ctx.keyword}
export const RULE_${ctx.toolName.toUpperCase()} = {
  id: '${ctx.toolName}',
  address: '${ctx.address}',
  gate: ${ctx.gate},
  lhs: '${ctx.lower || 'LOWER'}', // lower trigram → LHS symbol
  rhs: ['${ctx.upper || 'UPPER'}', '${ctx.name?.replace(/\s/g,'_') || 'RESULT'}'],
  features: { isFunction: ${ctx.classical ?? 0}, hasState: ${ctx.classical === 0 ? 1 : 0} },
  weight: 1,

  apply(context = {}) {
    this.weight += 0.01;
    return { rule: this.id, lhs: this.lhs, rhs: this.rhs, context, address: this.address };
  },

  learn(example) {
    if (example?.lhs === this.lhs) this.weight += 0.1;
    return this;
  },
};`,

  // Level 6: Channel — a connector between two hexagrams
  6: (ctx) => `// Channel connector — ${ctx.address}
// ${ctx.fromName} (${ctx.fromChar}) ⚡ ${ctx.toName} (${ctx.toChar})
import { EventEmitter } from 'events';

export class ${ctx.toolName} extends EventEmitter {
  constructor() {
    super();
    this.address  = '${ctx.address}';
    this.from = { gate: ${ctx.fromFuxi ?? 0}, name: '${ctx.fromName || ''}', char: '${ctx.fromChar || ''}' };
    this.to   = { gate: ${ctx.toFuxi ?? 0},   name: '${ctx.toName || ''}',   char: '${ctx.toChar || ''}' };
    this.changingLines = ${JSON.stringify(ctx.changingLines || [])};
    this.history = [];
    this.grammar = { rules: [], lexicon: new Map() };
  }

  transmit(signal) {
    const packet = { signal, from: this.from, to: this.to, ts: Date.now(), address: this.address };
    this.history.push(packet);
    this.emit('signal', packet);
    return packet;
  }

  learn(text, language = 'english') {
    const tokens = text.toLowerCase().split(/\\s+/).filter(t => t.length > 1);
    tokens.forEach((tok, i) => {
      if (!this.grammar.lexicon.has(tok)) this.grammar.lexicon.set(tok, { weight: 1 });
      else this.grammar.lexicon.get(tok).weight += 0.05;
      if (i < tokens.length - 1)
        this.grammar.rules.push({ lhs: tok, rhs: tokens[i+1], weight: 1 });
    });
    this.emit('learned', { tokens: tokens.length, address: this.address });
    return { tokens: tokens.length };
  }

  toJSON() { return { address: this.address, from: this.from, to: this.to, historyLength: this.history.length }; }
}`,

  // Level 7: Circuit — AutoLing-scale tool (three channels composed)
  7: (ctx) => `// Circuit — AutoLing-scale tool — ${ctx.address}
// Three sub-tools: MorphoAnalyzer + SemNet + Generator
// ${ctx.fromName} → ${ctx.toName} (${ctx.layer || 'State Space'})

export class ${ctx.toolName} {
  constructor() {
    this.address = '${ctx.address}';
    this.signature = { from: ${ctx.fromFuxi ?? 0}, to: ${ctx.toFuxi ?? 0} };

    // Sub-tool 1: Morphological Analyzer
    this.morpho = {
      table: new Map(),
      learn: (tokens) => tokens.forEach(t => this.morpho.table.set(t, (this.morpho.table.get(t) || 0) + 1)),
      analyze: (token) => ({ token, weight: this.morpho.table.get(token) || 0 }),
      generate: () => [...this.morpho.table.keys()][Math.floor(Math.random() * this.morpho.table.size)] || 'generate',
    };

    // Sub-tool 2: Semantic Network
    this.semnet = {
      nodes: new Map(),
      edges: [],
      addNode: (id, label) => this.semnet.nodes.set(id, { id, label, weight: 1 }),
      addEdge: (a, b, type) => this.semnet.edges.push({ a, b, type }),
      learn: (tokens) => tokens.forEach((t, i) => {
        if (!this.semnet.nodes.has(t)) this.semnet.addNode(t, t);
        if (i < tokens.length - 1) this.semnet.addEdge(t, tokens[i+1], 'FOLLOWS');
      }),
    };

    // Sub-tool 3: Generator (AutoDev)
    this.generator = {
      rules: [],
      learn: (tokens) => tokens.forEach((t, i) => {
        if (i < tokens.length - 1) this.generator.rules.push({ lhs: t, rhs: tokens[i+1], w: 1 });
      }),
      generate: (seed) => {
        if (!this.generator.rules.length) return seed || '...';
        let cur = seed || this.generator.rules[0].lhs;
        const out = [cur];
        for (let i = 0; i < 15; i++) {
          const nexts = this.generator.rules.filter(r => r.lhs === cur);
          if (!nexts.length) break;
          cur = nexts[Math.floor(Math.random() * nexts.length)].rhs;
          out.push(cur);
        }
        return out.join(' ');
      },
    };

    this.learnCount = 0;
  }

  learn(text, language = 'english') {
    this.learnCount++;
    const tokens = text.toLowerCase().split(/\\s+/).filter(t => t.length > 1);
    this.morpho.learn(tokens);
    this.semnet.learn(tokens);
    this.generator.learn(tokens);
    return { learned: tokens.length, learnCount: this.learnCount };
  }

  generate(seed = null) {
    const word = this.morpho.generate();
    return this.generator.generate(seed || word);
  }

  toJSON() {
    return {
      address: this.address,
      morphoSize: this.morpho.table.size,
      semnetNodes: this.semnet.nodes.size,
      generatorRules: this.generator.rules.length,
      learnCount: this.learnCount,
    };
  }
}`,
};

// ── ToolFactory ───────────────────────────────────────────────────────────────
export class ToolFactory {
  constructor() {
    this.generatedByLevel = new Array(8).fill(0);
  }

  /**
   * Determine which level a changing-line event operates at.
   */
  detectLevel(event) {
    const { changingLines = [], fromFuxi, toFuxi } = event;
    if (!changingLines.length) return 5; // default: hexagram level

    const n = changingLines.length;
    if (n >= 3) return 6; // 3+ changing lines → channel / circuit
    if (n === 2) return 5; // 2 changing lines → hexagram rule
    // 1 changing line: sub-levels determined by address components
    const line = changingLines[0];
    const colorTone = (line.lineNumber - 1) % 3;
    return colorTone; // 0,1,2 → Color, Tone, Base levels
  }

  /**
   * Generate a tool at the appropriate level for a changing-line event.
   */
  generate(event, address = null) {
    const level = this.detectLevel(event);
    const template = TEMPLATES[level] || TEMPLATES[5];

    const fromHex = BY_FUXI[event.fromFuxi];
    const toHex   = BY_FUXI[event.toFuxi];

    const ctx = {
      ...event,
      toolName: this._makeName(event, level),
      address: address?.toString() || `G${fromHex?.kw || 0}.L${event.changingLines?.[0]?.lineNumber || 1}`,
      level,
      levelName: LEVELS[level]?.name || 'Unknown',
      gate:      fromHex?.kw,
      name:      fromHex?.name,
      keyword:   fromHex?.keyword,
      lower:     fromHex?.lower,
      upper:     fromHex?.upper,
      classical: fromHex?.lines?.[event.changingLines?.[0]?.lineNumber - 1] ?? 1,
      line:      event.changingLines?.[0]?.lineNumber || 1,
      color:     ((event.changingLines?.[0]?.lineNumber || 1) % 6) + 1,
      tone:      ((event.changingLines?.[0]?.lineNumber || 1) % 5) + 1,
      base:      ((event.changingLines?.[0]?.lineNumber || 1) % 4) + 1,
      bigram1:   event.fromFuxi & 0b11,
      bigram2:   (event.fromFuxi >> 2) & 0b11,
      bigramPattern: `${(event.fromFuxi & 0b11).toString(2).padStart(2,'0')}·${((event.fromFuxi >> 2) & 0b11).toString(2).padStart(2,'0')}`,
      arc:       0,
      zod:       'ARI',
    };

    // Override with address data if provided
    if (address) {
      ctx.arc   = address.ARC;
      ctx.zod   = address.ZOD;
      ctx.color = address.color;
      ctx.tone  = address.tone;
      ctx.base  = address.base;
      ctx.bigram1 = address.hierarchy?.bigram1 ?? ctx.bigram1;
      ctx.bigram2 = address.hierarchy?.bigram2 ?? ctx.bigram2;
      ctx.bigramPattern = address.hierarchy?.bigramPattern ?? ctx.bigramPattern;
    }

    // Resolve quality from address (house + sign → element + modality)
    const quality = resolveQuality(address);

    // Build code: template output wrapped with quality lifecycle
    const rawCode = template(ctx);
    const qualityCode = wrapWithQuality(rawCode, quality, ctx.toolName, ctx.address);

    this.generatedByLevel[level]++;

    return {
      id: uuidv4(),
      name: ctx.toolName,
      level,
      levelName: LEVELS[level]?.name || 'Unknown',
      address: ctx.address,
      origin: { fromFuxi: event.fromFuxi, toFuxi: event.toFuxi, layerId: event.layerId },
      changingLines: event.changingLines,
      code: qualityCode,
      language: 'javascript',
      // Quality profile — house/sign/element/modality shape what this tool IS
      quality: {
        house:    quality.house,
        sign:     quality.sign,
        element:  { name: quality.element.name, symbol: quality.element.symbol, codePattern: quality.element.codePattern },
        modality: { name: quality.modality.name, role: quality.modality.role },
        summary:  quality.summary,
        codeRole: quality.codeRole,
        interface: quality.interface,
        verb:     quality.verb,
        executionStyle: quality.executionStyle,
        flags: {
          useCache:   quality.useCache,
          useStream:  quality.useStream,
          useEvents:  quality.useEvents,
          useParallel:quality.useParallel,
          usePure:    quality.usePure,
        },
      },
      createdAt: Date.now(),
      learned: false,
      meshShared: false,
    };
  }

  _makeName(event, level) {
    const fromHex = BY_FUXI[event.fromFuxi];
    const toHex   = BY_FUXI[event.toFuxi];
    const levelName = LEVELS[level]?.name || 'Tool';
    const lines = (event.changingLines || []).map(l => l.lineNumber).join('');
    const from = fromHex?.name?.replace(/\s+/g, '') || `H${event.fromFuxi}`;
    const to   = toHex?.name?.replace(/\s+/g, '') || `H${event.toFuxi}`;
    return `${levelName}${from}To${to}${lines ? `L${lines}` : ''}`;
  }

  getStats() {
    return {
      generatedByLevel: this.generatedByLevel.map((count, i) => ({
        level: i,
        name: LEVELS[i].name,
        count,
      })),
      total: this.generatedByLevel.reduce((a, b) => a + b, 0),
    };
  }
}
