/*
 * klein_ato.js -- the semantic-computer engine, pure JavaScript, zero deps,
 * no backend / GPU / workers. Runs in Node (ESM) and in any browser.
 *
 * Built from Sheldon Klein, "The Analogical Foundations of Creativity in
 * Language, Culture & the Arts: the Upper Paleolithic to 2100CE" (2002).
 * Port of the Python klein_ato package; same rules, same tests.
 *
 *   ATO (Klein's "*")      strong equivalence (XNOR) or XOR
 *   analogy                D = *C*AB
 *   16 Boolean operators   the closed relation set
 *   FeatureSpace           named features -> hypercube coordinates
 *   BooleanCategorialGrammar   Table 8, Figs 8-12, Table 9 resolution
 *   plan / hierarchy       planning by analogy, Table 10
 *   ClassificationScheme   analogy by table lookup
 *   ATONet, BinaryEncoder  hidden-layer net learns the ATO; learned
 *                          Boolean codes for any raw input
 *   renderIconSVG / renderSequenceSVG / animateOnCanvas   pictures + video
 *   SemanticComputer       kernel: memory, instruction set, tool bus
 *
 * Vectors are bit strings or BV objects, MSB first as Klein prints them.
 * Arbitrary width (BigInt inside).
 */

// ---------------------------------------------------------------------------
// 1. Boolean vectors + the 16 operators
// ---------------------------------------------------------------------------
export const OPERATORS = {
  FALSE: [0, 0, 0, 0],
  AND: [0, 0, 0, 1],
  A_AND_NOT_B: [0, 0, 1, 0],
  A: [0, 0, 1, 1],
  NOT_A_AND_B: [0, 1, 0, 0],
  B: [0, 1, 0, 1],
  XOR: [0, 1, 1, 0],
  OR: [0, 1, 1, 1],
  NOR: [1, 0, 0, 0],
  XNOR: [1, 0, 0, 1],
  NOT_B: [1, 0, 1, 0],
  A_OR_NOT_B: [1, 0, 1, 1],
  NOT_A: [1, 1, 0, 0],
  NOT_A_OR_B: [1, 1, 0, 1],
  NAND: [1, 1, 1, 0],
  TRUE: [1, 1, 1, 1],
};

export class BV {
  constructor(bits, n) {
    this.bits = BigInt(bits);
    this.n = n;
    Object.freeze(this);
  }
  static of(s) {
    if (s instanceof BV) return s;
    s = String(s).replace(/\s/g, "");
    if (!/^[01]+$/.test(s)) throw new Error(`not a Boolean vector: ${s}`);
    return new BV(BigInt("0b" + s), s.length);
  }
  static fromList(xs) {
    return BV.of(xs.map((x) => (x ? "1" : "0")).join(""));
  }
  get mask() {
    return (1n << BigInt(this.n)) - 1n;
  }
  toString() {
    return this.bits.toString(2).padStart(this.n, "0");
  }
  toList() {
    return [...this.toString()].map(Number);
  }
  equals(o) {
    o = BV.of(o);
    return o.n === this.n && o.bits === this.bits;
  }
  _chk(o) {
    if (o.n !== this.n) throw new Error(`width mismatch ${this.n} vs ${o.n}`);
  }
  xor(o) {
    o = BV.of(o);
    this._chk(o);
    return new BV(this.bits ^ o.bits, this.n);
  }
  xnor(o) {
    o = BV.of(o);
    this._chk(o);
    return new BV(~(this.bits ^ o.bits) & this.mask, this.n);
  }
  op(o, name) {
    o = BV.of(o);
    this._chk(o);
    const t = OPERATORS[name];
    if (!t) throw new Error(`unknown operator ${name}`);
    const b = o.toList();
    return BV.fromList(this.toList().map((x, i) => t[x * 2 + b[i]]));
  }
  hamming(o) {
    o = BV.of(o);
    this._chk(o);
    let x = this.bits ^ o.bits,
      c = 0;
    while (x) {
      c += Number(x & 1n);
      x >>= 1n;
    }
    return c;
  }
  flip(i) {
    return new BV(this.bits ^ (1n << BigInt(i)), this.n);
  }
  concat(o) {
    o = BV.of(o);
    return new BV((this.bits << BigInt(o.n)) | o.bits, this.n + o.n);
  }
  split(...w) {
    if (w.reduce((a, b) => a + b, 0) !== this.n) throw new Error("widths must sum to width");
    const s = this.toString();
    let i = 0;
    return w.map((k) => BV.of(s.slice(i, (i += k))));
  }
}
export const bv = (x) => BV.of(x);

// ---------------------------------------------------------------------------
// 2. The ATO
// ---------------------------------------------------------------------------
export class ATO {
  constructor(mode = "xnor") {
    if (!["xnor", "xor"].includes(mode)) throw new Error("mode must be 'xnor' or 'xor'");
    this.mode = mode;
  }
  star(...vs) {
    if (vs.length < 2) throw new Error("star needs at least two vectors");
    let acc = bv(vs[0]);
    for (const v of vs.slice(1)) acc = this.mode === "xnor" ? acc.xnor(v) : acc.xor(v);
    return acc;
  }
  identity(n) {
    return this.mode === "xnor" ? new BV((1n << BigInt(n)) - 1n, n) : new BV(0n, n);
  }
  /** A : B :: C : ?  ->  *C*AB */
  solve(a, b, c) {
    return this.star(c, this.star(a, b));
  }
  groupTable(n = 2) {
    const e = [...Array(2 ** n)].map((_, i) => new BV(i, n));
    return e.map((r) => e.map((c) => this.star(r, c)));
  }
  /** Table 10: level k, position i = *S_i,S_i+k (pattern governing that span). */
  hierarchy(seq) {
    const s = seq.map(bv),
      out = [s];
    for (let k = 1; k < s.length; k++)
      out.push(s.slice(0, s.length - k).map((x, i) => this.star(x, s[i + k])));
    return out;
  }
  /** Planning by analogy: keep *AB,*BC,*CD; new start *A*DE ends at E. */
  plan(seq, goal) {
    const s = seq.map(bv),
      shift = this.star(s[s.length - 1], goal);
    return [...s.slice(0, -1).map((x) => this.star(x, shift)), bv(goal)];
  }
  runTransitions(start, ops) {
    const out = [bv(start)];
    for (const o of ops) out.push(this.star(out[out.length - 1], o));
    return out;
  }
}

// ---------------------------------------------------------------------------
// 3. Feature spaces
// ---------------------------------------------------------------------------
export class FeatureSpace {
  constructor(features) {
    this.features = [...features];
    this.n = features.length;
    this.index = Object.fromEntries(features.map((f, i) => [f, i]));
    this.concepts = {};
  }
  encode(...on) {
    const b = Array(this.n).fill(0);
    for (const f of on) {
      if (!(f in this.index)) throw new Error(`unknown feature ${f}`);
      b[this.index[f]] = 1;
    }
    return BV.fromList(b);
  }
  decode(v) {
    const l = bv(v).toList();
    return this.features.filter((_, i) => l[i]);
  }
  define(name, v) {
    return (this.concepts[name] = bv(v));
  }
  nearest(v, k = 1) {
    v = bv(v);
    return Object.entries(this.concepts)
      .map(([n, c]) => [n, v.hamming(c)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, k);
  }
  neighbors(v) {
    v = bv(v);
    return [...Array(v.n)].map((_, i) => v.flip(i));
  }
}

// ---------------------------------------------------------------------------
// 4. Boolean categorial grammar (dual notation)
// ---------------------------------------------------------------------------
export class Node {
  constructor({ cat, sem, word = null, kids = [], label = null, expr = null, source = null }) {
    Object.assign(this, { cat, sem, word, kids, label, expr, source });
  }
  leaves() {
    return this.kids.length ? this.kids.flatMap((k) => k.leaves()) : [this];
  }
  text() {
    return this.leaves()
      .map((l) => l.word ?? `?[${l.expr ?? l.sem}]`)
      .join(" ");
  }
  show(d = 0) {
    let h = `${"  ".repeat(d)}${this.label ?? ""} ${this.cat}/${this.sem}`;
    if (this.word) h += `  ${this.word}`;
    else if (this.expr && !this.kids.length) h += `  ?${this.expr}`;
    return [h, ...this.kids.map((k) => k.show(d + 1))].join("\n");
  }
}

export class BooleanCategorialGrammar {
  constructor(ato = new ATO("xnor")) {
    this.ato = ato;
    this.categories = {};
    this.rules = [];
    this.lexicon = {};
    this.analogies = [];
  }
  category(name, v) {
    this.categories[name] = bv(v);
  }
  rule(x, y, z, check = true) {
    if (check) {
      const got = this.ato.star(this.categories[y], this.categories[z]);
      if (!got.equals(this.categories[x]))
        throw new Error(`${x} != *${y},${z}: ${got} vs ${this.categories[x]}`);
    }
    this.rules.push([x, y, z]);
  }
  word(w, cat, sem) {
    this.lexicon[w.toLowerCase()] = [cat, bv(sem)];
  }
  addAnalogy(a, b) {
    this.analogies.push([a.toLowerCase(), b.toLowerCase()]);
  }
  /** cat(Y) for X -> Y Z when X, Z known: *X,Z */
  missingCategory(x, z) {
    return this.ato.star(this.categories[x], this.categories[z]);
  }

  leaf(w) {
    const e = this.lexicon[w.toLowerCase()];
    if (!e) throw new Error(`unknown word ${w}`);
    return new Node({ cat: this.categories[e[0]], sem: e[1], word: w, label: e[0] });
  }
  /** CKY by Boolean cancellation; returns all S parses. */
  parse(sentence) {
    const words = sentence.replace(/\./g, "").trim().split(/\s+/),
      n = words.length,
      ch = {};
    words.forEach((w, i) => {
      ch[`${i},${i + 1}`] = [this.leaf(w)];
    });
    for (let span = 2; span <= n; span++)
      for (let i = 0; i + span <= n; i++) {
        const j = i + span,
          cell = [];
        for (let k = i + 1; k < j; k++)
          for (const L of ch[`${i},${k}`] || [])
            for (const R of ch[`${k},${j}`] || []) {
              const cat = this.ato.star(L.cat, R.cat);
              for (const [x, y, z] of this.rules)
                if (
                  this.categories[y].equals(L.cat) &&
                  this.categories[z].equals(R.cat) &&
                  this.categories[x].equals(cat)
                )
                  cell.push(
                    new Node({ cat, sem: this.ato.star(L.sem, R.sem), kids: [L, R], label: x }),
                  );
            }
        ch[`${i},${j}`] = cell;
      }
    const top = this.categories.S;
    return (ch[`0,${n}`] || []).filter((t) => !top || t.cat.equals(top));
  }
  /** Fig 11: *AB on corresponding nodes. */
  treeATO(a, b) {
    if (a.kids.length !== b.kids.length) throw new Error("trees are not isomorphic");
    let expr = null;
    if (a.word && b.word)
      expr = a.word.toLowerCase() === b.word.toLowerCase() ? "1" : `*${a.word},${b.word}`;
    return new Node({
      cat: this.ato.star(a.cat, b.cat),
      sem: this.ato.star(a.sem, b.sem),
      kids: a.kids.map((k, i) => this.treeATO(k, b.kids[i])),
      expr,
    });
  }
  /** Fig 12: ? = *C(*AB) node by node, then lexical lookup. */
  applyTree(op, c) {
    if (op.kids.length !== c.kids.length) throw new Error("trees are not isomorphic");
    const cat = this.ato.star(c.cat, op.cat),
      sem = this.ato.star(c.sem, op.sem);
    const node = new Node({
      cat,
      sem,
      kids: op.kids.map((o, i) => this.applyTree(o, c.kids[i])),
      label: c.label,
    });
    if (!c.kids.length) {
      let w = this.lookup(cat, sem);
      if (w && c.word && /^[A-Z]/.test(c.word)) w = w[0].toUpperCase() + w.slice(1);
      node.word = w;
      if (!w) {
        node.expr = op.expr && op.expr !== "1" ? `*${c.word},${op.expr}` : String(sem);
        node.source = [c.word, op.expr];
      }
    }
    return node;
  }
  lookup(cat, sem) {
    for (const [w, [cn, s]] of Object.entries(this.lexicon))
      if (this.categories[cn].equals(cat) && s.equals(sem)) return w;
    return null;
  }
  /** Table 9: leaf *c,*a,b decoded via known (a::b)::(c::d): d = *leaf,*(*a,b),(*c,d). */
  resolve(tree) {
    const fixed = [];
    const pairs = [...this.analogies, ...this.analogies.map(([p, q]) => [q, p])];
    const has = (a, b) => pairs.some(([p, q]) => p === a && q === b);
    for (const leaf of tree.leaves()) {
      if (leaf.word || !leaf.source) continue;
      const [cw, opx] = leaf.source;
      if (!opx || !opx.startsWith("*")) continue;
      const [aw, bw] = opx
        .slice(1)
        .split(",")
        .map((s) => s.toLowerCase());
      if (!has(aw, bw)) continue;
      for (const [p, q] of pairs) {
        if (p !== cw.toLowerCase()) continue;
        const k1 = this.ato.star(this.lexicon[aw][1], this.lexicon[bw][1]);
        const k2 = this.ato.star(this.lexicon[p][1], this.lexicon[q][1]);
        const d = this.ato.star(leaf.sem, this.ato.star(k1, k2));
        const w = this.lookup(leaf.cat, d);
        if (w) {
          Object.assign(leaf, { word: w, sem: d, expr: null });
          fixed.push([cw, w]);
          break;
        }
      }
    }
    this._recompose(tree);
    return fixed;
  }
  _recompose(n) {
    if (!n.kids.length) return;
    n.kids.forEach((k) => this._recompose(k));
    n.sem = this.ato.star(n.kids[0].sem, n.kids[1].sem);
  }
  sentenceAnalogy(a, b, c) {
    const [ta] = this.parse(a),
      [tb] = this.parse(b),
      [tc] = this.parse(c);
    const q = this.applyTree(this.treeATO(ta, tb), tc);
    this.resolve(q);
    return q;
  }
}

/** Klein's Table 8 grammar; a = 011010 (Figs 8-9), an = 111010 (Figs 10, 12). */
export function kleinTable8Grammar() {
  const g = new BooleanCategorialGrammar();
  for (const [n, v] of [
    ["Det", "10011"],
    ["Adj", "11111"],
    ["N", "01111"],
    ["V", "11001"],
    ["NPP", "01111"],
    ["NP", "00011"],
    ["VP", "00101"],
    ["S", "11001"],
  ])
    g.category(n, v);
  g.rule("N", "Adj", "N");
  g.rule("NP", "Det", "N");
  g.rule("VP", "V", "NP");
  g.rule("S", "NP", "VP");
  for (const [w, c, s] of [
    ["the", "Det", "011011"],
    ["a", "Det", "011010"],
    ["an", "Det", "111010"],
    ["small", "Adj", "001111"],
    ["large", "Adj", "001100"],
    ["new", "Adj", "011001"],
    ["old", "Adj", "000110"],
    ["mouse", "N", "000011"],
    ["lion", "N", "111000"],
    ["student", "N", "011000"],
    ["exam", "N", "011110"],
    ["fears", "V", "110110"],
    ["likes", "V", "110000"],
  ])
    g.word(w, c, s);
  return g;
}

// ---------------------------------------------------------------------------
// 5. Global classification scheme (analogy by lookup)
// ---------------------------------------------------------------------------
export class ClassificationScheme {
  constructor(ato = new ATO("xnor")) {
    this.ato = ato;
    this.rows = {};
    this.where = {};
  }
  add(key, domains) {
    const k = String(bv(key));
    this.rows[k] = { ...(this.rows[k] || {}), ...domains };
    for (const [d, item] of Object.entries(domains)) this.where[`${d}\u0000${item}`] = k;
  }
  keyOf(domain, item) {
    const k = this.where[`${domain}\u0000${item}`];
    if (!k) throw new Error(`${domain}:${item} not in scheme`);
    return BV.of(k);
  }
  analogy(a, b, c, outDomain) {
    const d = this.ato.solve(this.keyOf(...a), this.keyOf(...b), this.keyOf(...c));
    return this.rows[String(d)]?.[outDomain] ?? null;
  }
  translate(domain, item, to) {
    return this.rows[String(this.keyOf(domain, item))]?.[to] ?? null;
  }
}

/** Eight trigrams, lines bottom->top, yang = 1. Add further sourced domains with .add(). */
export function trigramScheme() {
  const s = new ClassificationScheme();
  for (const [b, n] of [
    ["111", "Heaven"],
    ["000", "Earth"],
    ["100", "Thunder"],
    ["010", "Water"],
    ["001", "Mountain"],
    ["011", "Wind"],
    ["101", "Fire"],
    ["110", "Lake"],
  ])
    s.add(b, { trigram: n });
  return s;
}

// ---------------------------------------------------------------------------
// 6. DNA as a Boolean group
// ---------------------------------------------------------------------------
const DNA = { a: "00", c: "01", g: "10", t: "11" };
const DNA_R = Object.fromEntries(Object.entries(DNA).map(([k, v]) => [v, k]));
export const dnaEncode = (s) => BV.of([...s.toLowerCase()].map((c) => DNA[c]).join(""));
export const dnaDecode = (v) =>
  String(v)
    .match(/../g)
    .map((p) => DNA_R[p])
    .join("");
export function dnaComplement(seq) {
  const v = dnaEncode(seq);
  return dnaDecode(new ATO("xnor").star(v, new BV(0n, v.n)));
}

// ---------------------------------------------------------------------------
// 7. Neural side (plain arrays, seeded RNG -- no GPU, no workers)
// ---------------------------------------------------------------------------
export function rng(seed = 0) {
  // mulberry32 + Box-Muller
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    uniform: u,
    normal: (m = 0, s = 1) =>
      m + s * Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u()),
  };
}
const mat = (r, c, f) => Array.from({ length: r }, () => Array.from({ length: c }, f));
const sig = (x) => 1 / (1 + Math.exp(-x));

/** 2-H-1 MLP; the hidden layer is what lets it learn XNOR/XOR (paper, factor 1). */
export class ATONet {
  constructor(hidden = 4, seed = 0) {
    const R = rng(seed);
    this.H = hidden;
    this.W1 = mat(2, hidden, () => R.normal());
    this.b1 = Array(hidden).fill(0);
    this.W2 = Array.from({ length: hidden }, () => R.normal());
    this.b2 = 0;
  }
  forward(x) {
    const h = this.W1[0].map((_, j) =>
      Math.tanh(x[0] * this.W1[0][j] + x[1] * this.W1[1][j] + this.b1[j]),
    );
    return [h, sig(h.reduce((s, v, j) => s + v * this.W2[j], this.b2))];
  }
  train(truth = [1, 0, 0, 1], epochs = 4000, lr = 0.5) {
    const X = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    for (let e = 0; e < epochs; e++) {
      const gW1 = mat(2, this.H, () => 0),
        gb1 = Array(this.H).fill(0),
        gW2 = Array(this.H).fill(0);
      let gb2 = 0;
      X.forEach((x, i) => {
        const [h, p] = this.forward(x),
          d2 = (p - truth[i]) / 4;
        for (let j = 0; j < this.H; j++) {
          gW2[j] += d2 * h[j];
          const d1 = d2 * this.W2[j] * (1 - h[j] ** 2);
          gW1[0][j] += x[0] * d1;
          gW1[1][j] += x[1] * d1;
          gb1[j] += d1;
        }
        gb2 += d2;
      });
      for (let j = 0; j < this.H; j++) {
        this.W2[j] -= lr * gW2[j];
        this.b1[j] -= lr * gb1[j];
        this.W1[0][j] -= lr * gW1[0][j];
        this.W1[1][j] -= lr * gW1[1][j];
      }
      this.b2 -= lr * gb2;
    }
    return X.filter((x, i) => this.forward(x)[1] > 0.5 === truth[i] > 0.5).length / 4;
  }
  star(a, b) {
    const A = bv(a).toList(),
      B = bv(b).toList();
    return BV.fromList(A.map((x, i) => (this.forward([x, B[i]])[1] > 0.5 ? 1 : 0)));
  }
}

/** Autoencoder with an n-bit Boolean bottleneck (straight-through estimator).
 *  encode(x) -> BV, decode(BV) -> reconstruction, for any modality. */
export class BinaryEncoder {
  constructor(dIn, nBits, hidden = 64, seed = 0) {
    const R = rng(seed),
      s = (a, b) => mat(a, b, () => R.normal(0, 1 / Math.sqrt(a)));
    Object.assign(this, {
      dIn,
      n: nBits,
      hd: hidden,
      E1: s(dIn, hidden),
      e1: Array(hidden).fill(0),
      E2: s(hidden, nBits),
      e2: Array(nBits).fill(0),
      D1: s(nBits, hidden),
      d1: Array(hidden).fill(0),
      D2: s(hidden, dIn),
      d2: Array(dIn).fill(0),
    });
  }
  static _lin(x, W, b, f) {
    const out = b.slice();
    for (let i = 0; i < x.length; i++) {
      const xi = x[i];
      if (!xi) continue;
      const r = W[i];
      for (let j = 0; j < out.length; j++) out[j] += xi * r[j];
    }
    return f ? out.map(f) : out;
  }
  _enc(x) {
    const h = BinaryEncoder._lin(x, this.E1, this.e1, Math.tanh);
    const z = BinaryEncoder._lin(h, this.E2, this.e2, Math.tanh);
    return [h, z, z.map((v) => (v > 0 ? 1 : 0))];
  }
  _dec(b) {
    const g = BinaryEncoder._lin(b, this.D1, this.d1, Math.tanh);
    return [g, BinaryEncoder._lin(g, this.D2, this.d2, sig)];
  }
  fit(X, epochs = 2000, lr = 0.05, batch = 64, seed = 0) {
    const R = rng(seed),
      B = Math.min(batch, X.length);
    for (let ep = 0; ep < epochs; ep++) {
      const g = {
        E1: mat(this.dIn, this.hd, () => 0),
        e1: Array(this.hd).fill(0),
        E2: mat(this.hd, this.n, () => 0),
        e2: Array(this.n).fill(0),
        D1: mat(this.n, this.hd, () => 0),
        d1: Array(this.hd).fill(0),
        D2: mat(this.hd, this.dIn, () => 0),
        d2: Array(this.dIn).fill(0),
      };
      for (let s = 0; s < B; s++) {
        const x = X[Math.floor(R.uniform() * X.length)];
        const [h, z, b] = this._enc(x),
          [gg, y] = this._dec(b);
        const dy = y.map((v, i) => (v - x[i]) / B);
        const dg = gg.map((v, j) => this.D2[j].reduce((a, w, i) => a + w * dy[i], 0) * (1 - v * v));
        const dz = z.map((v, k) => this.D1[k].reduce((a, w, j) => a + w * dg[j], 0) * (1 - v * v));
        const dh = h.map((v, j) => this.E2[j].reduce((a, w, k) => a + w * dz[k], 0) * (1 - v * v));
        for (let j = 0; j < this.hd; j++)
          for (let i = 0; i < this.dIn; i++) g.D2[j][i] += gg[j] * dy[i];
        dy.forEach((v, i) => (g.d2[i] += v));
        for (let k = 0; k < this.n; k++)
          if (b[k]) for (let j = 0; j < this.hd; j++) g.D1[k][j] += dg[j];
        dg.forEach((v, j) => (g.d1[j] += v));
        for (let j = 0; j < this.hd; j++)
          for (let k = 0; k < this.n; k++) g.E2[j][k] += h[j] * dz[k];
        dz.forEach((v, k) => (g.e2[k] += v));
        for (let i = 0; i < this.dIn; i++)
          if (x[i]) for (let j = 0; j < this.hd; j++) g.E1[i][j] += x[i] * dh[j];
        dh.forEach((v, j) => (g.e1[j] += v));
      }
      for (const k of ["E1", "E2", "D1", "D2"])
        this[k].forEach((r, i) => r.forEach((_, j) => (r[j] -= lr * g[k][i][j])));
      for (const k of ["e1", "e2", "d1", "d2"])
        this[k].forEach((_, i) => (this[k][i] -= lr * g[k][i]));
    }
    return this.error(X);
  }
  error(X) {
    let s = 0;
    for (const x of X) {
      const y = this._dec(this._enc(x)[2])[1];
      x.forEach((v, i) => (s += Math.abs(y[i] - v)));
    }
    return s / (X.length * this.dIn);
  }
  encode(x) {
    return BV.fromList(this._enc(x)[2]);
  }
  decode(v) {
    return this._dec(bv(v).toList())[1];
  }
}

// ---------------------------------------------------------------------------
// 8. Iconographic rendering (Fig 2): pictures and video
// ---------------------------------------------------------------------------
const PAL = [
  "#d64541",
  "#f1a93b",
  "#f0dc50",
  "#50aa5a",
  "#3c82c8",
  "#6e50b4",
  "#c85aa0",
  "#5a5a5a",
];

export function hexagramText(v) {
  return [...String(bv(v))]
    .reverse()
    .map((c) => (c === "1" ? "━━━━━━━" : "━━━ ━━━"))
    .join("\n");
}

/** One vector as an SVG: bit i = element i (solid = 1, broken = 0), bottom line first. */
export function renderIconSVG(v, size = 256, palette = PAL) {
  const bits = bv(v).toList().reverse(),
    n = bits.length,
    pad = size / 10,
    h = (size - 2 * pad) / n;
  let body = "";
  bits.forEach((b, i) => {
    const y = size - pad - (i + 1) * h + h * 0.2,
      hh = h * 0.6,
      col = palette[i % palette.length],
      mid = size / 2;
    body += b
      ? `<rect x="${pad}" y="${y}" width="${size - 2 * pad}" height="${hh}" fill="${col}"/>`
      : `<rect x="${pad}" y="${y}" width="${mid - h * 0.3 - pad}" height="${hh}" fill="${col}"/>` +
        `<rect x="${mid + h * 0.3}" y="${y}" width="${size - pad - mid - h * 0.3}" height="${hh}" fill="${col}"/>`;
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="100%" height="100%" fill="#faf8f0"/>${body}</svg>`
  );
}

/** Frames between states: bits flip one at a time along a shortest hypercube path. */
export function sequenceFrames(states, stepsBetween = 6) {
  const s = states.map(bv),
    frames = [];
  s.forEach((a, k) => {
    const b = s[k + 1] ?? a;
    let cur = a;
    for (let i = 0; i < stepsBetween; i++) frames.push(cur);
    for (let i = 0; i < a.n; i++)
      if (((a.bits ^ b.bits) >> BigInt(i)) & 1n) frames.push((cur = cur.flip(i)));
  });
  return frames;
}

/** Self-playing animated SVG (SMIL) -- a video file with no deps. */
export function renderSequenceSVG(states, size = 256, msPerFrame = 80) {
  const frames = sequenceFrames(states),
    total = frames.length * msPerFrame;
  const g = frames
    .map((f, i) => {
      const inner = renderIconSVG(f, size).replace(/^<svg[^>]*>|<\/svg>$/g, "");
      const kt = [0, i / frames.length, (i + 1) / frames.length, 1]
        .map((x) => +x.toFixed(5))
        .join(";");
      return (
        `<g opacity="0">${inner}<animate attributeName="opacity" values="0;1;0;0" keyTimes="${kt}" ` +
        `calcMode="discrete" dur="${total}ms" repeatCount="indefinite"/></g>`
      );
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${g}</svg>`;
}

/** Browser: play a state sequence on a <canvas>. Returns a stop() function. */
export function animateOnCanvas(canvas, states, msPerFrame = 80, palette = PAL) {
  const ctx = canvas.getContext("2d"),
    frames = sequenceFrames(states),
    size = canvas.width;
  let i = 0;
  const draw = () => {
    const bits = frames[i++ % frames.length].toList().reverse(),
      n = bits.length,
      pad = size / 10,
      h = (size - 2 * pad) / n;
    ctx.fillStyle = "#faf8f0";
    ctx.fillRect(0, 0, size, size);
    bits.forEach((b, k) => {
      const y = size - pad - (k + 1) * h + h * 0.2,
        hh = h * 0.6,
        mid = size / 2;
      ctx.fillStyle = palette[k % palette.length];
      if (b) ctx.fillRect(pad, y, size - 2 * pad, hh);
      else {
        ctx.fillRect(pad, y, mid - h * 0.3 - pad, hh);
        ctx.fillRect(mid + h * 0.3, y, size - pad - mid - h * 0.3, hh);
      }
    });
  };
  const id = setInterval(draw, msPerFrame);
  draw();
  return () => clearInterval(id);
}

// ---------------------------------------------------------------------------
// 9. SemanticComputer -- the kernel MESSY and the tools sit on
// ---------------------------------------------------------------------------
export class SemanticComputer {
  static INSTRUCTIONS = [
    "SET",
    "STAR",
    "OP",
    "SOLVE",
    "DIST",
    "PLAN",
    "HIER",
    "PARSE",
    "SENT_ANALOGY",
    "LOOKUP",
    "NEAREST",
    "CALL",
  ];

  constructor({
    ato = new ATO("xnor"),
    grammar = kleinTable8Grammar(),
    space = null,
    scheme = null,
  } = {}) {
    Object.assign(this, {
      ato,
      grammar,
      space,
      scheme,
      mem: {},
      tools: {},
      trace: [],
      listeners: [],
    });
  }
  /** Tool bus: tool(computer, ...args) may read/write mem and call step(). */
  register(name, tool) {
    this.tools[name] = tool;
  }
  onStep(fn) {
    this.listeners.push(fn);
  }

  _v(x) {
    if (typeof x === "string" && x in this.mem) return this.mem[x];
    if (typeof x === "string" && this.space && x in this.space.concepts)
      return this.space.concepts[x];
    if (Array.isArray(x)) return x.map((i) => this._v(i));
    try {
      return bv(x);
    } catch {
      return x;
    }
  }
  step(instr, ...args) {
    let out = null;
    const last = args[args.length - 1];
    if (typeof last === "string" && last.startsWith("->")) {
      out = last.slice(2);
      args = args.slice(0, -1);
    }
    const a = args.map((x) => this._v(x)),
      I = instr.toUpperCase();
    let r;
    switch (I) {
      case "SET":
        r = a[0];
        break;
      case "STAR":
        r = this.ato.star(...a);
        break;
      case "OP":
        r = a[0].op(a[1], args[2]);
        break;
      case "SOLVE":
        r = this.ato.solve(...a);
        break;
      case "DIST":
        r = a[0].hamming(a[1]);
        break;
      case "PLAN":
        r = this.ato.plan(a[0], a[1]);
        break;
      case "HIER":
        r = this.ato.hierarchy(a[0]);
        break;
      case "PARSE":
        r = this.grammar.parse(args[0]);
        break;
      case "SENT_ANALOGY":
        r = this.grammar.sentenceAnalogy(...args.slice(0, 3));
        break;
      case "LOOKUP":
        r = this.scheme.analogy(...args);
        break;
      case "NEAREST":
        r = this.space.nearest(a[0], a[1] ?? 1);
        break;
      case "CALL": {
        const t = this.tools[args[0]];
        if (!t) throw new Error(`no tool ${args[0]}`);
        r = t(this, ...args.slice(1));
        break;
      }
      default:
        throw new Error(`unknown instruction ${instr}`);
    }
    if (out) this.mem[out] = r;
    const rec = [I, args, out, r];
    this.trace.push(rec);
    this.listeners.forEach((f) => f(rec));
    return r;
  }
  run(program) {
    let r = null;
    for (const ins of program) r = this.step(...ins);
    return r;
  }
}
