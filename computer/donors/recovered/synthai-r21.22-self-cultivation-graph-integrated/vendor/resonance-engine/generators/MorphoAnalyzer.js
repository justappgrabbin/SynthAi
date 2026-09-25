/**
 * MorphoAnalyzer — morphological analysis engine.
 * Sub-tool 1 of AutoLing (Trigram-level tool).
 *
 * Inspired by Klein's morphological analysis component in the 1973 auto-novel system.
 * Analyzes the internal structure of tokens — words OR code tokens — into morphemes.
 * Learns new morpheme patterns from every input it sees.
 *
 * In the generative hierarchy this operates at Level 4 (Trigram).
 * Three MorphoAnalyzers can compose into a full AutoLing instance.
 */

import { v4 as uuidv4 } from 'uuid';

// ── Morpheme types ────────────────────────────────────────────────────────────
const MORPHEME_TYPES = {
  ROOT:    { id: 'root',    desc: 'Core meaning carrier', features: { isConcrete: 1 } },
  PREFIX:  { id: 'prefix',  desc: 'Precedes root',        features: { isRelation: 1 } },
  SUFFIX:  { id: 'suffix',  desc: 'Follows root',         features: { isState: 1 } },
  INFIX:   { id: 'infix',   desc: 'Within root',          features: { isAction: 1 } },
  // Code-specific morpheme types
  KEYWORD: { id: 'keyword', desc: 'Reserved word',        features: { isDeclaration: 1 } },
  OPERATOR:{ id: 'operator',desc: 'Operation symbol',     features: { isExpression: 1 } },
  SIGIL:   { id: 'sigil',   desc: 'Symbol prefix ($ @ #)',features: { hasState: 1 } },
};

// Natural language affix patterns
const NL_PATTERNS = {
  prefixes: ['un','re','pre','post','anti','sub','super','inter','over','under',
             'dis','mis','non','ex','co','pro','de','en','em'],
  suffixes: ['ing','ed','er','est','ly','ness','ment','tion','sion','ity','ive',
             'ous','ful','less','able','ible','al','ic','ize','ise','fy','ify'],
};

// Code-specific morpheme patterns
const CODE_PATTERNS = {
  prefixes: ['get','set','is','has','can','should','will','on','handle',
             'create','build','make','update','delete','remove','add','init',
             'load','save','fetch','parse','format','render','compute'],
  suffixes: ['Handler','Manager','Service','Controller','Factory','Builder',
             'Adapter','Wrapper','Provider','Resolver','Observer','Emitter',
             'Stream','Queue','Map','List','Set','Graph','Node','Edge'],
  sigils:   ['$','@','#','_','__'],
};

export class MorphoAnalyzer {
  constructor(id = null, language = 'universal') {
    this.id = id || uuidv4();
    this.language = language;
    this.morphemeTable = new Map(); // morpheme string → { type, weight, features }
    this.analysisCache = new Map(); // token → analysis
    this.learnCount = 0;
    this.level = 4; // Trigram level in generative hierarchy
    this.originAddress = null; // set when generated from a node

    this._seedPatterns();
    console.log(`[MorphoAnalyzer:${this.id.slice(0,8)}] initialized (${language})`);
  }

  _seedPatterns() {
    // Seed with known affixes
    NL_PATTERNS.prefixes.forEach(p => this._addMorpheme(p, 'PREFIX', { isConcrete: 0, isRelation: 1 }));
    NL_PATTERNS.suffixes.forEach(s => this._addMorpheme(s, 'SUFFIX', { isState: 1 }));
    CODE_PATTERNS.prefixes.forEach(p => this._addMorpheme(p, 'PREFIX', { isFunction: 1 }));
    CODE_PATTERNS.suffixes.forEach(s => this._addMorpheme(s, 'SUFFIX', { isClass: 1 }));
    CODE_PATTERNS.sigils.forEach(s => this._addMorpheme(s, 'SIGIL', { hasState: 1 }));
  }

  _addMorpheme(form, type, features = {}, weight = 1) {
    const morphType = MORPHEME_TYPES[type] || MORPHEME_TYPES.ROOT;
    this.morphemeTable.set(form, {
      form,
      type,
      weight,
      features: { ...morphType.features, ...features },
    });
  }

  /**
   * Analyze a token into morphemes.
   * Returns: { root, prefix?, suffix?, sigil?, features, language }
   */
  analyze(token) {
    if (this.analysisCache.has(token)) return this.analysisCache.get(token);

    let remaining = token;
    const result = {
      original: token,
      root: token,
      prefix: null,
      suffix: null,
      sigil: null,
      infixes: [],
      features: {},
      language: this._detectLanguage(token),
    };

    // Strip sigil
    for (const sig of CODE_PATTERNS.sigils) {
      if (remaining.startsWith(sig)) {
        result.sigil = sig;
        remaining = remaining.slice(sig.length);
        result.features = { ...result.features, hasState: 1 };
        break;
      }
    }

    // Try to strip known prefix
    const allPrefixes = [...NL_PATTERNS.prefixes, ...CODE_PATTERNS.prefixes]
      .sort((a, b) => b.length - a.length); // longest first
    for (const pfx of allPrefixes) {
      if (remaining.toLowerCase().startsWith(pfx) && remaining.length > pfx.length + 2) {
        result.prefix = pfx;
        remaining = remaining.slice(pfx.length);
        const morphFeatures = this.morphemeTable.get(pfx)?.features || {};
        result.features = { ...result.features, ...morphFeatures };
        break;
      }
    }

    // Try to strip known suffix
    const allSuffixes = [...NL_PATTERNS.suffixes, ...CODE_PATTERNS.suffixes]
      .sort((a, b) => b.length - a.length);
    for (const sfx of allSuffixes) {
      if (remaining.toLowerCase().endsWith(sfx) && remaining.length > sfx.length + 1) {
        result.suffix = sfx;
        remaining = remaining.slice(0, -sfx.length);
        const morphFeatures = this.morphemeTable.get(sfx)?.features || {};
        result.features = { ...result.features, ...morphFeatures };
        break;
      }
    }

    // camelCase split — find infixes
    const camelParts = remaining.replace(/([A-Z])/g, '_$1').split('_').filter(Boolean);
    if (camelParts.length > 1) {
      result.root = camelParts[0].toLowerCase();
      result.infixes = camelParts.slice(1).map(p => p.toLowerCase());
    } else {
      result.root = remaining.toLowerCase();
    }

    this.analysisCache.set(token, result);
    return result;
  }

  /**
   * Learn from a batch of tokens — builds up morpheme frequency table.
   */
  learn(tokens) {
    this.learnCount++;
    let newMorphemes = 0;

    tokens.forEach(token => {
      if (!token || token.length < 2) return;
      const analysis = this.analyze(token);

      // Reinforce known morphemes
      if (analysis.prefix && this.morphemeTable.has(analysis.prefix)) {
        this.morphemeTable.get(analysis.prefix).weight += 0.1;
      }
      if (analysis.suffix && this.morphemeTable.has(analysis.suffix)) {
        this.morphemeTable.get(analysis.suffix).weight += 0.1;
      }

      // Discover new roots
      if (!this.morphemeTable.has(analysis.root) && analysis.root.length >= 3) {
        this._addMorpheme(analysis.root, 'ROOT', analysis.features);
        newMorphemes++;
      }
    });

    return { learnCount: this.learnCount, morphemeCount: this.morphemeTable.size, newMorphemes };
  }

  /**
   * Generate a new token by combining known morphemes analogically.
   * Klein-style: pick a root, optionally attach prefix/suffix by feature matching.
   */
  generate(featureQuery = {}) {
    const roots = [...this.morphemeTable.values()]
      .filter(m => m.type === 'ROOT')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20);

    if (roots.length === 0) return 'generate';

    const root = roots[Math.floor(Math.random() * Math.min(5, roots.length))];
    const prefixes = [...this.morphemeTable.values()].filter(m => m.type === 'PREFIX');
    const suffixes = [...this.morphemeTable.values()].filter(m => m.type === 'SUFFIX');

    const usePrefix = Math.random() > 0.5 && prefixes.length > 0;
    const useSuffix = Math.random() > 0.4 && suffixes.length > 0;

    const pfx = usePrefix ? prefixes[Math.floor(Math.random() * prefixes.length)].form : '';
    const sfx = useSuffix ? suffixes[Math.floor(Math.random() * suffixes.length)].form : '';

    const result = pfx + root.form.charAt(0).toUpperCase() + root.form.slice(1) + sfx;
    return result;
  }

  _detectLanguage(token) {
    if (/^(function|const|let|var|class|import|export|return|async|await)$/.test(token)) return 'javascript';
    if (/^(def|import|class|return|yield|lambda|pass|None|True|False)$/.test(token)) return 'python';
    return 'english';
  }

  // Receive learning from mesh
  receiveFromMesh(data) {
    if (data.morphemes) {
      data.morphemes.forEach(([form, type, weight]) => {
        const existing = this.morphemeTable.get(form);
        if (existing) {
          existing.weight = Math.max(existing.weight, weight);
        } else {
          this._addMorpheme(form, type, {}, weight);
        }
      });
    }
  }

  // Prepare mesh payload
  toMeshPayload() {
    const top = [...this.morphemeTable.entries()]
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, 50);
    return {
      type: 'morpho_update',
      id: this.id,
      language: this.language,
      morphemes: top.map(([form, m]) => [form, m.type, m.weight]),
    };
  }

  toJSON() {
    return {
      id: this.id,
      language: this.language,
      morphemeCount: this.morphemeTable.size,
      learnCount: this.learnCount,
      level: this.level,
      originAddress: this.originAddress,
      topMorphemes: [...this.morphemeTable.values()]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10)
        .map(m => ({ form: m.form, type: m.type, weight: m.weight })),
    };
  }
}
