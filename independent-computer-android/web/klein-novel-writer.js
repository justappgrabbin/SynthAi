/*
 * klein-novel-writer.js
 * Pure-JavaScript implementation of the system described in
 *   Klein, Aeschlimann, Balsiger, Converse, Court, Foster, Lao, Oakley, Smith,
 *   "Automatic Novel Writing: A Status Report" (U. Wisconsin CS TR 183, 1973;
 *   repr. in Burghardt & Hölker (eds.), Text Processing, de Gruyter 1979, 338-412).
 *
 * Components (section numbers refer to the paper):
 *   SemanticNetwork  - §3.0  triples in a hash table, time of creation, secondary
 *                      triples, complex-predicate nodes, numeric relations,
 *                      mutually exclusive relations, change stack.
 *   Compiler         - §4.0  the compiler-driven simulation language
 *                      ($GROUP/$RULE/$SWITCH/$LOOP, subrules "t,f: expr : actions",
 *                      subrule variables, PICK/LENGTH/NUM/CLOCK/DUR, actions I-VI).
 *   Simulator        - §4.0  clock, group frequencies, ENABLE/DISABLE, directed
 *                      sequence, stochastic rules with ±10 abort.
 *   Generator        - §3.0, §5.1, §7.1-7.2  surface//semantic production rules,
 *                      fractioning of triples, lexical expression lists, dictionary
 *                      bit vectors, high-level and low-level transformations,
 *                      article device, MX QQ combining, ULST/LST blocking.
 *
 * No dependencies. Works in browsers and Node (CommonJS or global).
 */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------------ RNG -- */
  // Controllable randomness (§4.0): seeded so a run is reproducible.
  function makeRng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      // mulberry32
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ----------------------------------------------------------------- TIME -- */
  const UNIT = { W: 10080, D: 1440, H: 60, M: 1 };
  function parseDuration(str) {
    let total = 0;
    const re = /(\d+)([WDHM])/g;
    let m;
    while ((m = re.exec(str))) total += parseInt(m[1], 10) * UNIT[m[2]];
    return total;
  }
  function fmtTime(t) {
    const w = Math.floor(t / 10080),
      d = Math.floor((t % 10080) / 1440),
      h = Math.floor((t % 1440) / 60),
      m = t % 60;
    return `${w}W${d}D${h}H${m ? m + "M" : ""}`;
  }

  /* ------------------------------------------------------------ TOKENIZER -- */
  function tokenize(src) {
    const toks = [];
    let i = 0,
      line = 1;
    const push = (type, value) => toks.push({ type, value, line });
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") {
        line++;
        i++;
        continue;
      }
      if (/\s/.test(c)) {
        i++;
        continue;
      }
      if (c === "%") {
        while (i < src.length && src[i] !== "\n") i++;
        continue;
      }
      if (c === "'") {
        let j = i + 1;
        while (j < src.length && src[j] !== "'") j++;
        push("str", src.slice(i + 1, j));
        i = j + 1;
        continue;
      }
      if (c === "$") {
        let j = i + 1;
        while (j < src.length && /[A-Za-z0-9]/.test(src[j])) j++;
        push("kw", src.slice(i, j).toUpperCase());
        i = j;
        continue;
      }
      let m = /^(\d+[WDHM])+/.exec(src.slice(i));
      if (m && !/^[A-Za-z0-9]/.test(src.slice(i + m[0].length))) {
        push("num", parseDuration(m[0]));
        i += m[0].length;
        continue;
      }
      m = /^(\d*\.\d+|\d+)/.exec(src.slice(i));
      if (m) {
        push("num", parseFloat(m[0]));
        i += m[0].length;
        continue;
      }
      m = /^[A-Za-z][A-Za-z0-9_]*/.exec(src.slice(i));
      if (m) {
        push("name", m[0].toUpperCase());
        i += m[0].length;
        continue;
      }
      m = /^(<=|>=|\*\*)/.exec(src.slice(i));
      if (m) {
        push("sym", m[0]);
        i += 2;
        continue;
      }
      if ("(),;:=+-*/.<>#^!".includes(c)) {
        push("sym", c);
        i++;
        continue;
      }
      throw new Error(`Tokenizer: unexpected character '${c}' on line ${line}`);
    }
    push("eof", null);
    return toks;
  }

  /* -------------------------------------------------------- SEMANTIC NET -- */
  // Relation types (§4.0 note (d)): A attribute, I intransitive, T transitive,
  // NA numeric attribute, NI numeric intransitive (with synonym lists),
  // QA/QI quantitative (no synonym list). Added for the generator (§7.1 subtypes):
  // P preposition (RP), ADV adverb (RADV), S possessive (RS), C copula.
  const NUMERIC_TYPES = new Set(["NA", "NI", "QA", "QI"]);

  class SemanticNetwork {
    constructor() {
      this.nodes = new Map(); // name -> {id, lex:[{kind,text}], flags:Set, disc:[tripleKeys]}
      this.relations = new Map(); // name -> {id, type, flags:Set, lex:[...], scale:[{v,text}]}
      this.triples = new Map(); // hash table: key -> triple
      this.nextId = 1;
      this.nextTriple = 1;
      this.exclusiveSingle = new Set(); // relations allowing one object per subject
      this.exclusiveSets = []; // arrays of mutually exclusive relations
      this.changeStack = []; // entries for current time frame
      this.now = 0;
      this.cycle = 0;
    }
    node(name) {
      if (!this.nodes.has(name))
        this.nodes.set(name, { id: this.nextId++, name, lex: [], flags: new Set(), disc: [] });
      return this.nodes.get(name);
    }
    rel(name) {
      return this.relations.get(name);
    }
    isRel(name) {
      return this.relations.has(name);
    }
    key(s, r, o) {
      return o == null ? `${s}|${r}` : `${s}|${r}|${o}`;
    }
    get(s, r, o) {
      return this.triples.get(this.key(s, r, o));
    }
    set(s, r, o, opts = {}) {
      const R = this.rel(r);
      if (!R) throw new Error(`Unknown relation ${r}`);
      if (!this.nodes.has(s) && !this.relations.has(s)) this.node(s);
      if (o != null && !this.nodes.has(o) && !this.relations.has(o)) this.node(o);
      // automatic maintenance of logical consistency: mutually exclusive relations
      if (this.exclusiveSingle.has(r)) {
        for (const t of [...this.triples.values()])
          if (t.s === s && t.r === r && t.o !== o) this.del(t.s, t.r, t.o, true);
      }
      for (const grp of this.exclusiveSets)
        if (grp.includes(r)) {
          for (const other of grp)
            if (other !== r) {
              for (const t of [...this.triples.values()])
                if (t.s === s && t.r === other) this.del(t.s, t.r, t.o, true);
            }
        }
      const k = this.key(s, r, o);
      let t = this.triples.get(k);
      if (!t) {
        t = {
          id: this.nextTriple++,
          s,
          r,
          o: o == null ? null : o,
          time: this.now,
          cycle: this.cycle,
          value: null,
          secondary: [],
        };
        this.triples.set(k, t);
      } else if (!NUMERIC_TYPES.has(R.type)) {
        t.time = this.now;
        t.cycle = this.cycle;
      }
      if (opts.value != null) t.value = opts.value;
      const entry = {
        kind: NUMERIC_TYPES.has(R.type) ? "num" : "set",
        s,
        r,
        o: t.o,
        value: t.value,
        time: this.now,
        secondary: [],
      };
      if (opts.secondary) {
        for (const sec of opts.secondary) t.secondary.push(sec);
        entry.secondary = opts.secondary.slice();
      }
      this.changeStack.push(entry);
      return t;
    }
    del(s, r, o, auto) {
      const k = this.key(s, r, o);
      const t = this.triples.get(k);
      if (!t) return false;
      this.triples.delete(k);
      this.changeStack.push({
        kind: "del",
        s,
        r,
        o: t.o,
        value: t.value,
        time: t.time,
        auto: !!auto,
        secondary: [],
      });
      return true;
    }
    addNumeric(s, r, o, delta) {
      const t = this.get(s, r, o);
      const old = t && t.value != null ? t.value : 0;
      const res = this.set(s, r, o, { value: old + delta });
      this.changeStack[this.changeStack.length - 1].old = old;
      return res;
    }
    numeric(s, r, o) {
      const t = this.get(s, r, o);
      return t && t.value != null ? t.value : 0;
    }
    visible(t, optC) {
      return optC || t.cycle < this.cycle;
    }
    exists(s, r, o, optC) {
      if (o === undefined || o === null) {
        for (const t of this.triples.values())
          if (t.s === s && t.r === r && this.visible(t, optC)) return t;
        return null;
      }
      const t = this.get(s, r, o);
      return t && this.visible(t, optC) ? t : null;
    }
    dump(name) {
      return [...this.triples.values()].filter((t) => t.s === name);
    }
  }

  /* ------------------------------------------------------------- PARSER --- */
  class Parser {
    constructor(src, net) {
      this.toks = tokenize(src);
      this.p = 0;
      this.net = net;
    }
    peek(o = 0) {
      return this.toks[this.p + o];
    }
    next() {
      return this.toks[this.p++];
    }
    is(type, value, o = 0) {
      const t = this.peek(o);
      return t.type === type && (value === undefined || t.value === value);
    }
    accept(type, value) {
      if (this.is(type, value)) return this.next();
      return null;
    }
    expect(type, value) {
      const t = this.next();
      if (t.type !== type || (value !== undefined && t.value !== value))
        throw new Error(`Parse error line ${t.line}: expected ${value || type}, got ${t.value}`);
      return t;
    }
    isSym(v, o = 0) {
      return this.is("sym", v, o);
    }

    /* ---- fields (§4.0 grammar: general node field, PICK, subscripted classes) */
    parseField() {
      if (this.is("name", "PICK") && this.isSym("(", 1)) {
        this.next();
        this.expect("sym", "(");
        const f = this.parseField();
        this.expect("sym", ")");
        return { t: "pick", f };
      }
      const n = this.expect("name").value;
      if (this.isSym(".") && this.is("name", undefined, 1)) {
        // subrule-variable definition V.field
        this.next();
        const f = this.parseField();
        return { t: "def", v: n, f };
      }
      if (this.isSym("(") && !this.net.isRel(n)) {
        this.next();
        const f = this.parseField();
        this.expect("sym", ")");
        return { t: "sub", cls: n, f };
      }
      return { t: "name", n };
    }
    startsField() {
      const t = this.peek();
      return (
        t.type === "name" &&
        !this.net.isRel(t.value) &&
        (t.value === "PICK" || !OPWORDS.has(t.value))
      );
    }

    /* ---- expressions */
    parseExpr(ctx) {
      return this.parseOr(ctx);
    }
    parseOr(ctx) {
      let a = this.parseAnd(ctx);
      while (this.accept("name", "OR")) a = { t: "bin", op: "OR", a, b: this.parseAnd(ctx) };
      return a;
    }
    parseAnd(ctx) {
      let a = this.parseNot(ctx);
      while (this.accept("name", "AND")) a = { t: "bin", op: "AND", a, b: this.parseNot(ctx) };
      return a;
    }
    parseNot(ctx) {
      if (this.accept("name", "NOT")) return { t: "un", op: "NOT", a: this.parseNot(ctx) };
      return this.parseCmp(ctx);
    }
    parseCmp(ctx) {
      let a = this.parseAdd(ctx);
      const map = {
        EQ: "EQ",
        NE: "NE",
        LT: "LT",
        LE: "LE",
        GT: "GT",
        GE: "GE",
        "=": "EQ",
        "#": "NE",
        "<": "LT",
        "<=": "LE",
        ">": "GT",
        ">=": "GE",
      };
      const t = this.peek();
      if (
        (t.type === "name" || t.type === "sym") &&
        map[t.value] &&
        !(ctx === "rel" && t.value === "=")
      ) {
        this.next();
        a = { t: "bin", op: map[t.value], a, b: this.parseAdd(ctx) };
      }
      return a;
    }
    parseAdd(ctx) {
      let a = this.parseMul(ctx);
      for (;;) {
        if (this.isSym("+") || this.isSym("-")) {
          // inside an action "R + n" is handled by caller; here only arithmetic
          const op = this.next().value;
          a = { t: "bin", op, a, b: this.parseMul(ctx) };
        } else return a;
      }
    }
    parseMul(ctx) {
      let a = this.parseUnary(ctx);
      for (;;) {
        if (this.isSym("*") || this.isSym("/") || this.is("name", "MOD") || this.isSym("**")) {
          const op = this.next().value;
          a = { t: "bin", op, a, b: this.parseUnary(ctx) };
        } else return a;
      }
    }
    parseUnary(ctx) {
      if (this.isSym("-")) {
        this.next();
        return { t: "un", op: "-", a: this.parseUnary(ctx) };
      }
      if (this.isSym("+")) {
        this.next();
        return this.parseUnary(ctx);
      }
      for (const op of ["FLOAT", "ABS", "ENTIER"])
        if (this.is("name", op)) {
          this.next();
          return { t: "un", op, a: this.parseUnary(ctx) };
        }
      return this.parsePrimary(ctx);
    }
    parsePrimary(ctx) {
      const t = this.peek();
      if (t.type === "num") {
        this.next();
        return { t: "num", v: t.value };
      }
      if (t.type === "name" && (t.value === "LENGTH" || t.value === "NUM")) {
        this.next();
        this.expect("sym", "(");
        const f = this.parseField();
        this.expect("sym", ")");
        return { t: "len", f };
      }
      if (t.type === "name" && t.value === "CLOCK") {
        this.next();
        return { t: "clock" };
      }
      if (t.type === "name" && t.value === "DUR") {
        this.next();
        this.expect("sym", "(");
        if (ctx === "rel") {
          const r = this.expect("name").value;
          this.expect("sym", ")");
          return { t: "reldur", r };
        }
        const s = this.parseField();
        const r = this.expect("name").value;
        let o = null;
        if (!this.isSym(")")) o = this.parseField();
        this.expect("sym", ")");
        return { t: "dur", s, r, o };
      }
      if (ctx === "rel" && t.type === "name" && (this.net.isRel(t.value) || t.value === "EQL")) {
        this.next();
        return { t: "rel", r: t.value };
      }
      if (t.type === "sym" && t.value === "(") {
        if (ctx === "rel") {
          this.next();
          const e = this.parseExpr("rel");
          this.expect("sym", ")");
          return e;
        }
        // sentence or parenthesised expression
        const save = this.p;
        try {
          return this.parseSentence();
        } catch (e) {
          this.p = save;
        }
        this.next();
        const e = this.parseExpr(ctx);
        this.expect("sym", ")");
        return e;
      }
      throw new Error(`Parse error line ${t.line}: unexpected ${t.value}`);
    }
    // (sentence) ::= ((sentence node field) (relation field expression) (sentence node field))
    parseSentence() {
      this.expect("sym", "(");
      const s = this.parseField();
      const rel = this.parseExpr("rel");
      let o = null;
      if (!this.isSym(")")) o = this.parseField();
      this.expect("sym", ")");
      return { t: "sent", s, rel, o };
    }

    /* ---- actions (§4.0 "Description of actions") */
    parseActions() {
      const list = [];
      if (this.isSym(";")) return list;
      do {
        list.push(this.parseAction());
      } while (this.accept("sym", ","));
      return list;
    }
    parseItem() {
      // item in an INSERT/LEXTRP triple: node field, relation name, or "= expr"
      if (this.isSym("=") || this.isSym("+")) {
        const op = this.next().value;
        return { t: "val", op, e: this.parseUnaryValue() };
      }
      if (this.is("name") && this.net.isRel(this.peek().value))
        return { t: "relname", n: this.next().value };
      return this.parseField();
    }
    parseUnaryValue() {
      let neg = false;
      if (this.accept("sym", "-")) neg = true;
      const n = this.expect("num").value;
      return neg ? -n : n;
    }
    parseParenTriple() {
      this.expect("sym", "(");
      const items = [];
      while (!this.isSym(")")) items.push(this.parseItem());
      this.expect("sym", ")");
      return items;
    }
    parseAction() {
      if (this.accept("sym", "*")) {
        const kw = this.expect("name").value;
        switch (kw) {
          case "ADD": {
            const f = this.parseField();
            this.expect("name", "TO");
            return { a: "ADD", f, c: this.parseClassRef() };
          }
          case "MOVE": {
            const f = this.parseField();
            this.expect("name", "TO");
            return { a: "MOVE", f, c: this.parseClassRef() };
          }
          case "REMOVE": {
            const f = this.parseField();
            this.expect("name", "FROM");
            return { a: "REMOVE", f, c: this.parseClassRef() };
          }
          case "ERASE":
            return { a: "ERASE", c: this.parseClassRef() };
          case "ENABLE": {
            const g = this.expect("name").value;
            let d = { t: "num", v: 0 };
            if (this.accept("name", "IN")) d = this.parseExpr();
            return { a: "ENABLE", g, d };
          }
          case "DISABLE":
            return { a: "DISABLE", g: this.expect("name").value };
          case "INSERT":
          case "DELETE": {
            const prim = this.parseParenTriple();
            const secs = [];
            while (this.isSym("(")) secs.push(this.parseParenTriple());
            return { a: kw, prim, secs };
          }
          case "LEXTRP": {
            const items = [];
            this.expect("sym", "(");
            while (!this.isSym(")")) items.push(this.next().value);
            this.expect("sym", ")");
            this.expect("name", "TO");
            return { a: "LEXTRP", words: items, target: this.expect("name").value };
          }
          case "LEXADD": {
            const from = this.expect("name").value;
            this.expect("name", "TO");
            return { a: "LEXADD", from, target: this.expect("name").value };
          }
          case "DISCADD": {
            const ts = [];
            while (this.isSym("(")) ts.push(this.parseParenTriple());
            this.expect("name", "TO");
            return { a: "DISCADD", ts, f: this.parseField() };
          }
          case "DISCLEAR":
            return { a: "DISCLEAR", f: this.parseField() };
          case "DUMP":
            return { a: "DUMP", f: this.parseField() };
          case "PRINT": {
            const args = [];
            while (!this.isSym(",") && !this.isSym(";")) {
              const t = this.next();
              args.push(
                t.type === "str" ? { t: "str", v: t.value } : (this.p--, this.parseField()),
              );
            }
            return { a: "PRINT", args };
          }
          case "END":
            return { a: "END" };
          case "TEST":
          case "TSTOP":
          case "TSTART":
            while (!this.isSym(",") && !this.isSym(";")) this.next();
            return { a: "NOP" };
          default:
            throw new Error(`Unknown action *${kw}`);
        }
      }
      // network triple action: field [NOT] R [= expr | + expr] [field]
      const s = this.parseField();
      let neg = false;
      if (this.accept("name", "NOT")) neg = true;
      const r = this.expect("name").value;
      if (!this.net.isRel(r)) throw new Error(`Unknown relation ${r} (line ${this.peek().line})`);
      let op = null,
        e = null;
      if (this.isSym("=") || this.isSym("+")) {
        op = this.next().value;
        e = this.parseExpr("val");
      }
      let o = null;
      if (this.startsField()) o = this.parseField();
      return { a: "TRIPLE", s, neg, r, op, e, o };
    }
    parseClassRef() {
      const n = this.expect("name").value;
      if (this.accept("sym", "(")) {
        const f = this.parseField();
        this.expect("sym", ")");
        return { cls: n, f };
      }
      return { cls: n, f: null };
    }

    /* ---- statements */
    parseOptions() {
      // option field ",S" ",OC" etc.
      let opts = "";
      if (this.accept("sym", ",")) while (this.is("name")) opts += this.next().value;
      return opts;
    }
    parseBranch() {
      // T(L) F(L) (L) where L is label, $NEXT X or $ENDGROUP
      const br = {};
      for (;;) {
        let which = null;
        if ((this.is("name", "T") || this.is("name", "F")) && this.isSym("(", 1))
          which = this.next().value;
        else if (
          this.isSym("(") &&
          (this.is("kw", undefined, 1) || (this.is("name", undefined, 1) && this.isSym(")", 2)))
        )
          which = "B";
        else return br;
        this.expect("sym", "(");
        let target;
        if (this.accept("kw", "$NEXT")) target = { next: this.expect("name").value };
        else if (this.accept("kw", "$ENDGROUP")) target = { end: true };
        else target = { label: this.expect("name").value };
        this.expect("sym", ")");
        if (which === "B") {
          br.T = target;
          br.F = target;
        } else br[which] = target;
      }
    }
    parseSubrules() {
      const subs = [];
      while (!this.is("kw") && !this.is("eof")) {
        let tf = null;
        // t,f prefix: [-]num , [-]num [, opts] :
        const save = this.p;
        try {
          const a = this.parseUnaryValue();
          this.expect("sym", ",");
          const b = this.parseUnaryValue();
          let opts = "";
          if (this.accept("sym", ",")) while (this.is("name")) opts += this.next().value;
          this.expect("sym", ":");
          tf = [a, b, opts];
        } catch (e) {
          this.p = save;
          tf = null;
        }
        let opts = "";
        if (!tf && this.isSym(",")) {
          opts = this.parseOptions();
          this.expect("sym", ":");
        }
        const expr = this.parseExpr();
        let actions = [];
        if (this.accept("sym", ":")) actions = this.parseActions();
        this.expect("sym", ";");
        subs.push({ tf: tf ? [tf[0], tf[1]] : null, opts: tf ? tf[2] : opts, expr, actions });
      }
      return subs;
    }
    parseRuleLike(kind) {
      let label = null;
      if (this.is("name") && !this.isSym("(", 1)) label = this.next().value;
      const opts = this.parseOptions();
      this.expect("sym", ":");
      const branch = this.parseBranch();
      let actions = [];
      if (kind === "RULE" && !this.isSym(";")) actions = this.parseActions();
      this.expect("sym", ";");
      const subs = this.parseSubrules();
      return { k: kind, label, opts, branch, actions, subs };
    }
  }
  const OPWORDS = new Set([
    "AND",
    "OR",
    "NOT",
    "EQ",
    "NE",
    "LT",
    "LE",
    "GT",
    "GE",
    "MOD",
    "TO",
    "FROM",
    "IN",
    "PICK",
    "LENGTH",
    "NUM",
    "CLOCK",
    "DUR",
    "FLOAT",
    "ABS",
    "ENTIER",
    "T",
    "F",
  ]);

  /* ------------------------------------------------------------ COMPILER -- */
  function compile(src, sys) {
    const net = sys.net;
    const P = new Parser(src, net);
    let curGroup = null;
    const loopStack = [];
    while (!P.is("eof")) {
      const kw = P.expect("kw").value;
      switch (kw) {
        case "$DICTIONARY": // WORD CAT [past] [participle] ;  e.g.  GO V WENT GONE;
          while (!P.is("kw")) {
            const w = P.expect("name").value;
            const cats = [];
            const forms = [];
            while (!P.isSym(";")) {
              const t = P.next();
              if (t.type === "str") forms.push(t.value);
              else cats.push(t.value);
            }
            P.expect("sym", ";");
            sys.dict.define(w, cats, forms);
          }
          break;
        case "$RELATIONS": // NAME TYPE [FLAGS] [= lex / lex ...] ;  numeric: = v:'lex' ...
          while (!P.is("kw")) {
            const name = P.expect("name").value;
            const type = P.expect("name").value;
            const flags = new Set();
            while (P.is("name")) flags.add(P.next().value);
            const R = { id: net.nextId++, name, type, flags, lex: [], scale: [] };
            if (P.accept("sym", "=")) {
              while (!P.isSym(";")) {
                if (P.isSym("/")) {
                  P.next();
                  continue;
                }
                if (P.is("num") || P.isSym("-")) {
                  const v = P.parseUnaryValue();
                  P.expect("sym", ":");
                  R.scale.push({ v, text: P.expect("str").value });
                } else R.lex.push(P.expect("str").value);
              }
            }
            P.expect("sym", ";");
            net.relations.set(name, R);
            sys.dict.learnRelation(R);
          }
          break;
        case "$NODES": // NAME [FLAGS] = N'..' / P'..' / D'..' / M'..' ;
          while (!P.is("kw")) {
            const name = P.expect("name").value;
            const nd = net.node(name);
            while (P.is("name") && !P.isSym("=", 0)) nd.flags.add(P.next().value);
            if (P.accept("sym", "=")) {
              while (!P.isSym(";")) {
                if (P.accept("sym", "/")) continue;
                const k = P.expect("name").value;
                const text = P.expect("str").value;
                nd.lex.push({ kind: k, text });
              }
            }
            P.expect("sym", ";");
            sys.dict.learnNode(nd);
          }
          break;
        case "$EXCLUSIVE": // R ;  (one object per subject)   or  R1 R2 ... ; (mutually exclusive set)
          while (!P.is("kw")) {
            const names = [];
            while (!P.isSym(";")) names.push(P.expect("name").value);
            P.expect("sym", ";");
            if (names.length === 1) net.exclusiveSingle.add(names[0]);
            else net.exclusiveSets.push(names);
          }
          break;
        case "$CLASSES":
          while (!P.is("kw")) {
            const name = P.expect("name").value;
            let sub = null;
            if (P.accept("sym", "(")) {
              sub = P.isSym(")") ? "" : P.expect("name").value;
              P.expect("sym", ")");
            }
            const mem = [];
            if (P.accept("sym", "=")) while (!P.isSym(";")) mem.push(P.expect("name").value);
            P.expect("sym", ";");
            if (sub === null) sys.classes.set(name, mem.slice());
            else {
              if (!sys.sclasses.has(name)) sys.sclasses.set(name, new Map());
              if (sub !== "") sys.sclasses.get(name).set(sub, mem.slice());
            }
            for (const m of mem) net.node(m);
          }
          break;
        case "$START":
          sys.startTime = P.expect("num").value;
          P.expect("sym", ";");
          break;
        case "$NETWORK": {
          // initial conditions: part of the first time frame
          P.accept("sym", ":");
          const acts = P.parseActions();
          P.expect("sym", ";");
          sys.initActions.push(...acts);
          break;
        }
        case "$GROUP": {
          const name = P.expect("name").value;
          let opts = P.parseOptions();
          P.expect("sym", ":");
          const incr = P.expect("num").value;
          P.expect("sym", "/");
          const on = P.expect("name").value; // ON / OFF
          opts += P.parseOptions();
          P.expect("sym", ";");
          curGroup = {
            name,
            incr,
            enabled: on === "ON",
            sync: opts.includes("S"),
            opts,
            code: [],
            labels: {},
            next: null,
          };
          sys.groups.push(curGroup);
          sys.groupMap.set(name, curGroup);
          break;
        }
        case "$ENDGROUP":
          P.expect("sym", ";");
          curGroup = null;
          break;
        case "$RULE":
        case "$SWITCH": {
          const st = P.parseRuleLike(kw === "$RULE" ? "RULE" : "SWITCH");
          if (st.label) curGroup.labels[st.label] = curGroup.code.length;
          curGroup.code.push(st);
          break;
        }
        case "$LOOP": {
          let label = null;
          if (P.is("name") && !P.isSym(".", 1)) label = P.next().value;
          const opts = P.parseOptions();
          P.expect("sym", ":");
          const v = P.expect("name").value;
          P.expect("sym", ".");
          const f = P.parseField();
          P.expect("sym", ";");
          const st = { k: "LOOP", v, f, opts, end: -1 };
          if (label) curGroup.labels[label] = curGroup.code.length;
          loopStack.push(curGroup.code.length);
          curGroup.code.push(st);
          break;
        }
        case "$ENDLOOP": {
          P.expect("sym", ";");
          const start = loopStack.pop();
          curGroup.code[start].end = curGroup.code.length;
          curGroup.code.push({ k: "ENDLOOP", start });
          break;
        }
        case "$END":
          P.accept("sym", ";");
          return;
        default:
          throw new Error(`Unknown statement ${kw}`);
      }
    }
  }

  /* ----------------------------------------------------------- SIMULATOR -- */
  class NovelWriter {
    constructor(opts = {}) {
      this.seed = opts.seed == null ? 1973 : opts.seed;
      this.rng = makeRng(this.seed);
      this.net = new SemanticNetwork();
      this.dict = new Dictionary();
      this.classes = new Map();
      this.sclasses = new Map();
      this.groups = [];
      this.groupMap = new Map();
      this.initActions = [];
      this.startTime = 0;
      this.frames = [];
      this.prints = [];
      this.ended = false;
      this.maxTime = opts.maxTime || 4 * 10080;
      this.gen = new Generator(this);
    }
    load(src) {
      compile(src, this);
      return this;
    }

    /* ---- class access */
    getClass(name, key) {
      if (key === undefined) {
        if (!this.classes.has(name)) this.classes.set(name, []);
        return this.classes.get(name);
      }
      if (!this.sclasses.has(name)) this.sclasses.set(name, new Map());
      const m = this.sclasses.get(name);
      if (!m.has(key)) m.set(key, []);
      return m.get(key);
    }
    isClass(name) {
      return this.classes.has(name);
    }

    /* ---- field evaluation */
    evalField(f, env) {
      switch (f.t) {
        case "name": {
          if (env.vars && env.vars.has(f.n)) return env.vars.get(f.n).slice();
          if (this.classes.has(f.n)) return this.classes.get(f.n).slice();
          if (this.sclasses.has(f.n)) {
            const out = [];
            for (const v of this.sclasses.get(f.n).values())
              for (const x of v) if (!out.includes(x)) out.push(x);
            return out;
          }
          return [f.n];
        }
        case "pick": {
          const v = this.evalField(f.f, env);
          return v.length ? [v[Math.floor(this.rng() * v.length)]] : [];
        }
        case "sub": {
          const keys = this.evalField(f.f, env);
          const out = [];
          for (const k of keys)
            for (const x of this.getClass(f.cls, k)) if (!out.includes(x)) out.push(x);
          return out;
        }
        case "def": {
          const vals = this.evalField(f.f, env);
          env.vars.set(f.v, vals.slice());
          env.subvars.add(f.v);
          return vals;
        }
        case "relname":
          return [f.n];
      }
      throw new Error("bad field");
    }
    varName(f) {
      return f.t === "def" ? f.v : f.t === "name" ? f.n : null;
    }

    /* ---- expression evaluation */
    evalExpr(e, env) {
      switch (e.t) {
        case "num":
          return e.v;
        case "clock":
          return this.net.now % 1440;
        case "len":
          return this.evalField(e.f, env).length;
        case "dur": {
          const s = this.evalField(e.s, env),
            o = e.o ? this.evalField(e.o, env) : [null];
          if (s.length !== 1 || o.length !== 1) throw new Error("DUR requires single values");
          const t = this.net.exists(s[0], e.r, o[0], env.optC);
          return t ? this.net.now - t.time : 0;
        }
        case "sent":
          return this.evalSentence(e, env);
        case "un": {
          const a = this.evalExpr(e.a, env);
          switch (e.op) {
            case "NOT":
              return !truthy(a);
            case "-":
              return -num(a);
            case "FLOAT":
              return truthy(a) ? 1 : 0;
            case "ABS":
              return Math.abs(num(a));
            case "ENTIER":
              return Math.trunc(num(a));
          }
          break;
        }
        case "bin":
          return binop(
            e.op,
            () => this.evalExpr(e.a, env),
            () => this.evalExpr(e.b, env),
          );
      }
      throw new Error("bad expression " + e.t);
    }
    // relation-field expression evaluated for one (s,o) pair
    evalRel(e, s, o, env) {
      switch (e.t) {
        case "num":
          return e.v;
        case "clock":
          return this.net.now % 1440;
        case "len":
          return this.evalField(e.f, env).length;
        case "rel": {
          if (e.r === "EQL") return s === o;
          const R = this.net.rel(e.r);
          if (NUMERIC_TYPES.has(R.type)) {
            const t = this.net.exists(s, e.r, o, env.optC);
            return t ? t.value : 0;
          }
          return !!this.net.exists(s, e.r, o, env.optC);
        }
        case "reldur": {
          const t = this.net.exists(s, e.r, o, env.optC);
          return t ? this.net.now - t.time : 0;
        }
        case "un": {
          const a = this.evalRel(e.a, s, o, env);
          switch (e.op) {
            case "NOT":
              return !truthy(a);
            case "-":
              return -num(a);
            case "FLOAT":
              return truthy(a) ? 1 : 0;
            case "ABS":
              return Math.abs(num(a));
            case "ENTIER":
              return Math.trunc(num(a));
          }
          break;
        }
        case "bin":
          return binop(
            e.op,
            () => this.evalRel(e.a, s, o, env),
            () => this.evalRel(e.b, s, o, env),
          );
      }
      throw new Error("bad relation expression");
    }
    isNumericRel(e) {
      if (e.t === "rel") {
        if (e.r === "EQL") return false;
        return NUMERIC_TYPES.has(this.net.rel(e.r).type);
      }
      if (e.t === "num" || e.t === "reldur" || e.t === "len" || e.t === "clock") return true;
      if (e.t === "un")
        return e.op === "NOT" ? false : e.op === "FLOAT" ? true : this.isNumericRel(e.a);
      if (e.t === "bin") return ["+", "-", "*", "/", "MOD", "**"].includes(e.op);
      return false;
    }
    // subrule variables keep only values that make the sentence TRUE (§4.0 "Subrule-variables")
    evalSentence(e, env) {
      const S = this.evalField(e.s, env);
      const O = e.o ? this.evalField(e.o, env) : [null];
      if (this.isNumericRel(e.rel)) {
        if (S.length !== 1 || O.length !== 1)
          throw new Error("numeric sentence needs single-valued fields");
        return num(this.evalRel(e.rel, S[0], O[0], env));
      }
      const sv = this.varName(e.s),
        ov = e.o ? this.varName(e.o) : null;
      const sIsSub = sv && env.subvars.has(sv),
        oIsSub = ov && env.subvars.has(ov);
      const keepS = new Set(),
        keepO = new Set();
      for (const s of S)
        for (const o of O) {
          if (truthy(this.evalRel(e.rel, s, o, env))) {
            keepS.add(s);
            keepO.add(o);
          }
        }
      if (sIsSub)
        env.vars.set(
          sv,
          S.filter((x) => keepS.has(x)),
        );
      if (oIsSub)
        env.vars.set(
          ov,
          O.filter((x) => keepO.has(x)),
        );
      return keepS.size > 0;
    }

    /* ---- actions */
    execActions(list, env) {
      for (const a of list) {
        this.execAction(a, env);
        if (this.ended) return;
      }
    }
    itemValues(item, env) {
      if (item.t === "relname") return [item.n];
      if (item.t === "val") return [{ op: item.op, v: item.e }];
      return this.evalField(item, env);
    }
    expandTriple(items, env) {
      // cartesian product of item values
      let combos = [[]];
      for (const it of items) {
        const vals = this.itemValues(it, env);
        const nxt = [];
        for (const c of combos) for (const v of vals) nxt.push(c.concat([v]));
        combos = nxt;
      }
      return combos;
    }
    setFromItems(arr, secondary) {
      // arr: [s, r, (val)?, o?]
      const s = arr[0],
        r = arr[1];
      let value = null,
        op = "=",
        o = null;
      for (let i = 2; i < arr.length; i++) {
        if (typeof arr[i] === "object") {
          value = arr[i].v;
          op = arr[i].op;
        } else o = arr[i];
      }
      if (value != null) {
        return op === "+"
          ? this.net.addNumeric(s, r, o, value)
          : this.net.set(s, r, o, { value, secondary });
      }
      return this.net.set(s, r, o, { secondary });
    }
    execAction(a, env) {
      const net = this.net;
      switch (a.a) {
        case "TRIPLE": {
          const S = this.evalField(a.s, env),
            O = a.o ? this.evalField(a.o, env) : [null];
          for (const s of S)
            for (const o of O) {
              if (a.neg) net.del(s, a.r, o);
              else if (a.op === "=") net.set(s, a.r, o, { value: num(this.evalExpr(a.e, env)) });
              else if (a.op === "+") net.addNumeric(s, a.r, o, num(this.evalExpr(a.e, env)));
              else net.set(s, a.r, o);
            }
          break;
        }
        case "INSERT": {
          const prims = this.expandTriple(a.prim, env);
          const secs = a.secs.map((sx) => this.expandTriple(sx, env)).flat();
          for (const p of prims) this.setFromItems(p, secs);
          break;
        }
        case "DELETE": {
          for (const p of this.expandTriple(a.prim, env)) {
            const t = net.get(p[0], p[1], p[2] == null ? null : p[2]);
            if (!t) continue;
            const secs = a.secs
              .map((sx) => this.expandTriple(sx, env))
              .flat()
              .map((x) => x.join(" "));
            t.secondary = t.secondary.filter((x) => !secs.includes(x.join(" ")));
          }
          break;
        }
        case "ADD": {
          const vals = this.evalField(a.f, env);
          for (const c of this.classTargets(a.c, env))
            for (const v of vals) if (!c.includes(v)) c.push(v);
          break;
        }
        case "MOVE": {
          const vals = this.evalField(a.f, env);
          for (const c of this.classTargets(a.c, env)) {
            c.length = 0;
            for (const v of vals) if (!c.includes(v)) c.push(v);
          }
          break;
        }
        case "REMOVE": {
          const vals = this.evalField(a.f, env);
          for (const c of this.classTargets(a.c, env))
            for (const v of vals) {
              const i = c.indexOf(v);
              if (i >= 0) c.splice(i, 1);
            }
          break;
        }
        case "ERASE":
          for (const c of this.classTargets(a.c, env)) c.length = 0;
          break;
        case "ENABLE": {
          const g = this.groupMap.get(a.g);
          if (!g) throw new Error("No group " + a.g);
          g.enabled = true;
          g.next = net.now + Math.max(1, num(this.evalExpr(a.d, env)));
          g.rescheduled = true;
          break;
        }
        case "DISABLE": {
          const g = this.groupMap.get(a.g);
          g.enabled = false;
          g.rescheduled = true;
          break;
        }
        case "LEXTRP": {
          const R = net.rel(a.target);
          R.lex = [a.words.join(" ")];
          this.dict.learnRelation(R);
          break;
        }
        case "LEXADD": {
          const F = net.rel(a.from) || net.node(a.from);
          const T = net.rel(a.target) || net.node(a.target);
          T.lex.push(...F.lex);
          break;
        }
        case "DISCADD": {
          for (const n of this.evalField(a.f, env)) {
            const nd = net.node(n);
            for (const tr of a.ts)
              for (const c of this.expandTriple(tr, env)) {
                let t = net.get(c[0], c[1], c[2] == null ? null : c[2]);
                if (!t) t = this.setFromItems(c, []);
                nd.disc.push(net.key(t.s, t.r, t.o));
              }
          }
          break;
        }
        case "DISCLEAR":
          for (const n of this.evalField(a.f, env)) net.node(n).disc = [];
          break;
        case "DUMP":
          for (const n of this.evalField(a.f, env))
            this.prints.push(
              `DUMP ${n}: ` +
                net
                  .dump(n)
                  .map(
                    (t) =>
                      `(${t.s} ${t.r}${t.o ? " " + t.o : ""}${t.value != null ? " = " + t.value : ""})`,
                  )
                  .join(" "),
            );
          break;
        case "PRINT":
          this.prints.push(
            a.args.map((x) => (x.t === "str" ? x.v : this.evalField(x, env).join(" "))).join(" "),
          );
          break;
        case "END":
          this.ended = true;
          break;
        case "NOP":
          break;
      }
    }
    classTargets(c, env) {
      if (!c.f) return [this.getClass(c.cls)];
      return this.evalField(c.f, env).map((k) => this.getClass(c.cls, k));
    }

    /* ---- rule evaluation (§4.0 (13),(16),(17)) */
    evalRule(st, env) {
      env.vars = new Map(env.loopVars);
      env.subvars = new Set();
      let cum = 0,
        decided = null;
      for (const sr of st.subs) {
        env.optC = (sr.opts || st.opts || env.groupOpts || "").includes("C");
        let val;
        if (sr.tf) {
          const res = truthy(this.evalExpr(sr.expr, env));
          val = res ? sr.tf[0] : sr.tf[1];
          if (res && sr.actions.length) this.execActions(sr.actions, env);
        } else {
          const r = this.evalExpr(sr.expr, env);
          val = typeof r === "boolean" ? (r ? 1 : 0) : r;
          if (sr.actions.length) this.execActions(sr.actions, env);
        }
        if (val >= 10) {
          decided = true;
          break;
        }
        if (val <= -10) {
          decided = false;
          break;
        }
        cum += val;
      }
      let result;
      if (decided !== null) result = decided;
      else if (!st.subs.length) result = true;
      else result = this.rng() <= cum;
      if (result && st.k === "RULE") {
        env.optC = (st.opts || "").includes("C");
        this.execActions(st.actions, env);
      }
      return result;
    }

    runGroup(g) {
      const code = g.code;
      let pc = 0;
      const loops = [];
      const loopVars = new Map();
      const jump = (target) => {
        if (target.end) return code.length;
        if (target.next) {
          // $NEXT X : go to ENDLOOP of loop X
          while (loops.length && loops[loops.length - 1].v !== target.next) {
            loopVars.delete(loops.pop().v);
          }
          return loops.length ? code[loops[loops.length - 1].start].end : code.length;
        }
        const idx = g.labels[target.label];
        if (idx === undefined) throw new Error(`No label ${target.label} in group ${g.name}`);
        while (
          loops.length &&
          !(idx > loops[loops.length - 1].start && idx < code[loops[loops.length - 1].start].end)
        )
          loopVars.delete(loops.pop().v);
        return idx;
      };
      let guard = 0;
      while (pc < code.length && !this.ended) {
        if (++guard > 200000) throw new Error("runaway group " + g.name);
        const st = code[pc];
        if (st.k === "LOOP") {
          const env = { vars: new Map(loopVars), subvars: new Set(), loopVars };
          const vals = this.evalField(st.f, env);
          if (!vals.length) {
            pc = st.end + 1;
            continue;
          }
          loops.push({ v: st.v, vals, i: 0, start: pc });
          loopVars.set(st.v, [vals[0]]);
          pc++;
          continue;
        }
        if (st.k === "ENDLOOP") {
          const L = loops[loops.length - 1];
          if (!L || L.start !== st.start) {
            pc++;
            continue;
          }
          L.i++;
          if (L.i < L.vals.length) {
            loopVars.set(L.v, [L.vals[L.i]]);
            pc = L.start + 1;
          } else {
            loops.pop();
            loopVars.delete(L.v);
            pc++;
          }
          continue;
        }
        const env = { loopVars, groupOpts: g.opts };
        const res = this.evalRule(st, env);
        const br = res ? st.branch.T : st.branch.F;
        pc = br ? jump(br) : pc + 1;
      }
    }

    /* ---- main loop: clock, group frequencies, directed sequence */
    run() {
      const net = this.net;
      net.now = this.startTime;
      net.cycle = 0;
      const env0 = { vars: new Map(), subvars: new Set(), loopVars: new Map() };
      this.execActions(this.initActions, env0);
      this.flushFrame();
      for (const g of this.groups) {
        g.next =
          this.startTime + (g.sync ? (g.incr - (this.startTime % g.incr)) % g.incr || g.incr : 0);
        if (!g.sync) g.next = this.startTime + 1;
      }
      while (!this.ended) {
        const due = this.groups.filter((g) => g.enabled);
        if (!due.length) break;
        const t = Math.min(...due.map((g) => g.next));
        if (t > this.startTime + this.maxTime) break;
        net.now = t;
        net.cycle++;
        for (const g of this.groups) {
          if (!g.enabled || g.next !== t) continue;
          g.rescheduled = false;
          this.runGroup(g);
          if (!g.rescheduled && g.enabled) g.next = t + g.incr;
          if (this.ended) break;
        }
        for (const g of this.groups) if (g.enabled && g.next <= t) g.next = t + g.incr;
        this.flushFrame();
      }
      return this;
    }
    flushFrame() {
      const stack = this.net.changeStack;
      this.net.changeStack = [];
      const frame = { time: this.net.now, stack, text: [] };
      if (stack.length) frame.text = this.gen.narrate(stack, this.net.now);
      if (this.prints.length) {
        frame.prints = this.prints;
        this.prints = [];
      }
      this.frames.push(frame);
    }

    /* ---- output */
    story() {
      return this.frames
        .flatMap((f) => f.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }
    paragraphs() {
      return this.frames.filter((f) => f.text.length).map((f) => f.text.join(" "));
    }
    changeStackListing() {
      const out = [];
      for (const f of this.frames) {
        out.push(`CHANGE STACK FOR TIME ${fmtTime(f.time)}`);
        f.stack.forEach((e, i) =>
          out.push(
            `${String(i + 1).padStart(3)}: ${fmtEntry(e)}` +
              (e.secondary.length
                ? "\n" +
                  e.secondary
                    .map((sx) => `       (${sx.map(fmtItem).join(" ")}) SET AT ${fmtTime(e.time)}`)
                    .join("\n")
                : ""),
          ),
        );
        for (const p of f.prints || []) out.push("     PRINT: " + p);
        if (f.text.length) out.push(...f.text.map((x) => "   " + x));
      }
      return out.join("\n");
    }
  }
  function fmtItem(x) {
    return typeof x === "object" && x ? `= ${x.v}` : x;
  }
  function fmtEntry(e) {
    const t = `(${e.s} ${e.r}${e.o ? " " + e.o : ""})`;
    if (e.kind === "num") return `${t} = ${Number(e.value).toFixed(4)}`;
    if (e.kind === "del") return `NOT ${t} SET AT ${fmtTime(e.time)}`;
    return `${t} SET AT ${fmtTime(e.time)}`;
  }
  function truthy(v) {
    return typeof v === "boolean" ? v : v !== 0;
  }
  function num(v) {
    return typeof v === "boolean" ? (v ? 1 : 0) : v;
  }
  function binop(op, A, B) {
    if (op === "AND") return truthy(A()) && truthy(B());
    if (op === "OR") return truthy(A()) || truthy(B());
    const a = num(A()),
      b = num(B());
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        return b === 0 ? 0 : a / b;
      case "MOD":
        return a % b;
      case "**":
        return Math.pow(a, b);
      case "EQ":
        return a === b;
      case "NE":
        return a !== b;
      case "LT":
        return a < b;
      case "LE":
        return a <= b;
      case "GT":
        return a > b;
      case "GE":
        return a >= b;
    }
    throw new Error("bad op " + op);
  }

  /* ---------------------------------------------------------- DICTIONARY -- */
  // Bit vector per stem (§3.0 "Lexical Dictionary"): which grammar nodes a stem may fill.
  const BIT = { N: 1, V: 2, ADJ: 4, ADV: 8, PREP: 16, PRON: 32, PROPER: 64, NOART: 128, PART: 256 };
  class Dictionary {
    constructor() {
      this.words = new Map();
    }
    entry(w) {
      if (!this.words.has(w)) this.words.set(w, { bits: 0, past: null, part: null, plural: null });
      return this.words.get(w);
    }
    define(w, cats, forms) {
      const e = this.entry(w);
      for (const c of cats) if (BIT[c]) e.bits |= BIT[c];
      if (e.bits & BIT.V) {
        if (forms[0]) e.past = forms[0].toLowerCase();
        if (forms[1]) e.part = forms[1].toLowerCase();
      } else if (e.bits & BIT.N) {
        if (forms[0]) e.plural = forms[0].toLowerCase();
      }
    }
    // the dictionary is derived from the lexical expression lists, not hand-listed
    learnRelation(R) {
      const head = (txt) => txt.split(/\s+/);
      const all = R.lex.concat(R.scale.map((s) => s.text)).filter(Boolean);
      for (const lx of all) {
        const ws = head(lx.toUpperCase());
        let k = 0;
        if (ws[0] === "BE") k = 1;
        const h = ws[k];
        if (!h) continue;
        const e = this.entry(h);
        if (R.type === "P") e.bits |= BIT.PREP;
        else if (R.type === "ADV") e.bits |= BIT.ADV;
        else if (k === 1 || R.type === "A" || R.type === "NA" || R.type === "QA") {
          if (ws.length === k + 1) e.bits |= BIT.ADJ; // single-word complements may be prenominal
        } else e.bits |= BIT.V;
      }
    }
    learnNode(nd) {
      for (const l of nd.lex)
        for (const w of l.text.toUpperCase().split(/\s+/)) {
          const e = this.entry(w.replace(/[^A-Z]/g, ""));
          if (!e) continue;
          if (l.kind === "P") e.bits |= BIT.PROPER | BIT.NOART;
          else e.bits |= BIT.N;
        }
    }
    has(w, bit) {
      const e = this.words.get(w.toUpperCase());
      return !!e && (e.bits & bit) !== 0;
    }
    get(w) {
      return this.words.get(w.toUpperCase());
    }
  }

  /* ---------------------------------------------- LOW-LEVEL TRANSFORMATIONS -- */
  // §7.2 low-level codes, chosen by spelling rules rather than hand-assigned.
  const isV = (c) => "aeiou".includes(c);
  function cvc(w) {
    // single-syllable consonant-vowel-consonant → double final consonant
    const n = w.length;
    if (n < 3) return false;
    const a = w[n - 3],
      b = w[n - 2],
      c = w[n - 1];
    const vowels = (w.match(/[aeiou]+/g) || []).length;
    return vowels === 1 && !isV(a) && isV(b) && !isV(c) && !"wxy".includes(c);
  }
  const LOW = {
    1: (w) => w, // NULL
    2: (w) => "will " + w, // add "will"
    4: (w) => w + "ing", // add "ing"
    5: (w) => w + "d", // add "d"
    6: (w) => w + "ly", // add "ly"
    8: (w) => w.slice(0, -1) + "ies", // delete 1, add "ies"
    9: (w) => w + "ed", // add "ed"
    10: (w) => w.slice(0, -1) + "ing", // delete 1, add "ing"
    12: (w) => w + "es", // add "es"
    16: (w) => w.slice(0, -1) + "ied", // delete 1, add "ied"
    17: (w) => w + w[w.length - 1] + "ed", // double, add "ed"
    18: (w) => w + w[w.length - 1] + "ing", // double, add "ing"
    19: (w) => w.slice(0, -2) + "ying", // delete 2, add "ying" (die → dying)
    20: (w) => w + "s", // add "s"
  };
  function pastCode(w) {
    if (/e$/.test(w)) return 5;
    if (/[^aeiou]y$/.test(w)) return 16;
    if (cvc(w)) return 17;
    return 9;
  }
  function ingCode(w) {
    if (/ie$/.test(w)) return 19;
    if (/[^aeiou]e$/.test(w) && w !== "be") return 10;
    if (cvc(w)) return 18;
    return 4;
  }
  function pluralCode(w) {
    if (/[^aeiou]y$/.test(w)) return 8;
    if (/(s|sh|ch|x|z)$/.test(w)) return 12;
    return 20;
  }

  /* ----------------------------------------------------------- GENERATOR -- */
  // Surface structure // semantic network production rules (§3.0, §7.1).
  // form: canonical form of the triple fraction; map: which RHS node each element links to;
  // ptrans: high-level transformation marking (§7.1 PTRANS: 1 carry down, 3 infinitive,
  // 4 participle, 5 objective case).
  const RULES = [
    { id: 1, lhs: "S", rhs: ["NP", "VP"], form: ["O", "R"], map: [0, 1], ptrans: 1 },
    { id: 2, lhs: "VP", rhs: ["VPP", "PP"], form: ["R", "RP"], map: [0, 1], ptrans: 1 },
    { id: 3, lhs: "VP", rhs: ["VPP", "ADV"], form: ["R", "RADV"], map: [0, 1], ptrans: 1 },
    { id: 4, lhs: "VP", rhs: ["VPP", "INF"], form: ["RV", "RV"], map: [0, 1], ptrans: 3 },
    { id: 5, lhs: "VPP", rhs: ["V", "NP"], form: ["RV", "O"], map: [0, 1], ptrans: 5 },
    { id: 6, lhs: "VPP", rhs: ["V"], form: ["RV"], map: [0], ptrans: 1 },
    { id: 7, lhs: "VPP", rhs: ["BE", "AP"], form: ["RA"], map: [1], ptrans: 1 },
    { id: 8, lhs: "VPP", rhs: ["BE", "AP", "NP"], form: ["RA", "O"], map: [1, 2], ptrans: 5 },
    { id: 9, lhs: "VPP", rhs: ["BE", "NP"], form: ["RC", "O"], map: [0, 1], ptrans: 1 },
    { id: 10, lhs: "VPP", rhs: ["V", "THAT", "S"], form: ["RV", "OT"], map: [0, 2], ptrans: 1 },
    { id: 11, lhs: "NP", rhs: ["Det", "NPP"], form: ["O"], map: [1], ptrans: 1 },
    { id: 12, lhs: "NPP", rhs: ["ADJ", "NPP"], form: ["O", "RA"], map: [1, 0], ptrans: 1 },
    {
      id: 13,
      lhs: "NP",
      rhs: ["NP", "POSS", "NPP"],
      form: ["O", "RS", "O"],
      map: [2, 1, 0],
      ptrans: 1,
    },
    { id: 14, lhs: "PP", rhs: ["PREP", "NP"], form: ["RP", "O"], map: [0, 1], ptrans: 5 },
    { id: 15, lhs: "NPP", rhs: ["NPP", "PART"], form: ["O", "RV"], map: [0, 1], ptrans: 4 },
    {
      id: 16,
      lhs: "VPP",
      rhs: ["V", "NP", "INF"],
      form: ["RV", "O", "RV"],
      map: [0, 1, 2],
      ptrans: 3,
    },
  ];
  // relation subcategory with retreat to a more general category on failure (§3.0 end)
  function subcat(R) {
    if (!R) return "O";
    switch (R.type) {
      case "P":
        return "RP";
      case "ADV":
        return "RADV";
      case "S":
        return "RS";
      case "C":
        return "RC";
      case "A":
      case "NA":
      case "QA":
        return "RA";
      default:
        return "RV";
    }
  }

  class Generator {
    constructor(sys) {
      this.sys = sys;
      this.mentioned = new Set();
      this.trace = [];
    }
    get net() {
      return this.sys.net;
    }
    rand(arr) {
      return arr[Math.floor(this.sys.rng() * arr.length)];
    }

    /* lexical selection from expression lists with dictionary bit-vector check */
    relLex(r, value) {
      const R = this.net.rel(r);
      if (!R) return null;
      if (R.scale.length) {
        if (value == null || value === 0) return null;
        let best = null;
        for (const s of R.scale)
          if (Math.sign(s.v) === Math.sign(value) || (s.v === 0 && value === 0))
            if (!best || Math.abs(s.v - value) < Math.abs(best.v - value)) best = s;
        if (!best)
          for (const s of R.scale)
            if (!best || Math.abs(s.v - value) < Math.abs(best.v - value)) best = s;
        return best && best.text ? best.text : null;
      }
      if (!R.lex.length) return null;
      return this.rand(R.lex);
    }
    isAdjSlot(text) {
      // can this lexical item fill an ADJ node? (bit vector)
      const ws = text.toUpperCase().split(/\s+/);
      const k = ws[0] === "BE" ? 1 : 0;
      return ws.length === k + 1 && this.sys.dict.has(ws[k], BIT.ADJ);
    }

    /* NP generation (rules 11-13, 15) */
    np(name, opts = {}) {
      const net = this.net;
      const nd = net.nodes.get(name);
      const obj = !!opts.obj;
      if (name === "THEY") return obj ? "them" : "they";
      if (opts.coref && nd && (nd.flags.has("M") || nd.flags.has("F"))) {
        const m = nd.flags.has("M");
        return obj ? (m ? "him" : "her") : m ? "he" : "she";
      }
      if (nd && nd.flags.has("PRON")) return obj && nd.lex[1] ? nd.lex[1].text : nd.lex[0].text;
      if (nd && nd.disc.length && !nd.lex.length)
        return (
          "that " +
          nd.disc
            .map((k) => this.clause(net.triples.get(k), []))
            .filter(Boolean)
            .join(" and that ")
        );
      if (!nd || !nd.lex.length) return name.toLowerCase();
      const item = this.rand(nd.lex);
      const adjs = (opts.adjs || []).map((a) => a.toLowerCase());
      let head = item.text;
      let det = "";
      if (opts.poss) {
        det = opts.poss + "'s";
      } else if (item.kind === "N") {
        det = this.mentioned.has(name) ? "the" : "a";
        if (nd.flags.has("PL") && det === "a") det = "some";
        if (det === "a") {
          const first = (adjs[0] || head).toLowerCase();
          if (/^[aeiou]/.test(first)) det = "an";
        }
      } else if (item.kind === "D") det = "the";
      // P (proper) and M (mass) take no article (Det node marked for deletion)
      this.mentioned.add(name);
      let out = [det, ...adjs, head].filter(Boolean).join(" ");
      if (opts.parts && opts.parts.length) out += " " + opts.parts.join(" ");
      return out;
    }
    plural(name) {
      if (name === "THEY") return true;
      const nd = this.net.nodes.get(name);
      return !!(nd && nd.flags.has("PL"));
    }

    /* verb inflection: high-level marks + low-level transformations */
    inflect(word, form, pl) {
      const w = word.toLowerCase();
      const e = this.sys.dict.get(w);
      if (w === "be")
        return form === "past" ? (pl ? "were" : "was") : form === "ing" ? "being" : "be";
      if (form === "base") return w;
      if (form === "past") return e && e.past ? e.past : LOW[pastCode(w)](w);
      if (form === "ing") return LOW[ingCode(w)](w);
      if (form === "en") return e && e.part ? e.part : e && e.past ? e.past : LOW[pastCode(w)](w);
      return w;
    }
    // realise a lexical item for a relation as a verb phrase head: returns {pre, verb, rest, cop}
    vparts(text) {
      const ws = text.split(/\s+/);
      if (ws[0].toUpperCase() === "BE")
        return { cop: true, verb: "be", rest: ws.slice(1).join(" ").toLowerCase() };
      return { cop: false, verb: ws[0], rest: ws.slice(1).join(" ").toLowerCase() };
    }

    /* triple → clause, following the rule table */
    clause(t, folded, form = "past", outer = null) {
      if (!t) return null;
      const net = this.net;
      const R = net.rel(t.r);
      if (!R) return null;
      const lex = this.relLex(t.r, t.value);
      if (!lex) return null;
      const sec = t.secondary || [];
      const subjAdjs = [],
        subjParts = [],
        objParts = [],
        objAdjs = [];
      for (const f of folded || []) {
        const fl = this.relLex(f.r, f.value);
        if (!fl) continue;
        const FR = net.rel(f.r);
        if (f.s === t.s && subcat(FR) === "RA" && !f.o && this.isAdjSlot(fl))
          subjAdjs.push(this.vparts(fl).cop ? this.vparts(fl).rest : fl);
        else if (f.s === t.s && subcat(FR) === "RV")
          subjParts.push(
            this.inflect(this.vparts(fl).verb, "ing") +
              (this.vparts(fl).rest ? " " + this.vparts(fl).rest : "") +
              (f.o ? " " + this.np(f.o, { obj: true }) : ""),
          );
        else if (f.s === t.o && subcat(FR) === "RV")
          objParts.push(this.inflect(this.vparts(fl).verb, "ing"));
        else if (f.s === t.o && subcat(FR) === "RA" && this.isAdjSlot(fl))
          objAdjs.push(this.vparts(fl).rest || fl);
      }
      // secondary triples: classify by canonical form of their fractions
      const pps = [],
        advs = [],
        infs = [],
        thats = [];
      let poss = null;
      for (const s of sec) {
        const head = s[0];
        const second = s[1];
        if (head === t.r && net.isRel(second)) {
          const sc = subcat(net.rel(second));
          if (sc === "RP") {
            this.trace.push("R-RP rule 2/14");
            pps.push(this.relLex(second).toLowerCase() + " " + this.np(s[2], { obj: true }));
          } else if (sc === "RADV") {
            this.trace.push("R-RADV rule 3");
            advs.push(this.relLex(second).toLowerCase());
          } else {
            this.trace.push("RV-RV rule 4/16");
            infs.push(this.infinitive(second, s[2]));
          }
        } else if (head === t.o && net.isRel(second)) {
          const sc = subcat(net.rel(second));
          if (sc === "RS") {
            this.trace.push("O-RS-O rule 13");
            poss = this.np(s[2]);
          } else if (sc === "RA") {
            const l = this.relLex(second);
            if (l) objAdjs.push(this.vparts(l).rest || l.toLowerCase());
          }
        } else if (net.isRel(second) || (typeof s[1] === "string" && net.isRel(s[1]))) {
          // a full triple: complement of a that-relation (rule 10)
          const tv = s.find((x) => typeof x === "object" && x);
          const objs = s.slice(2).filter((x) => typeof x === "string");
          thats.push(
            this.clause(
              { s: s[0], r: s[1], o: objs[0] || null, value: tv ? tv.v : null, secondary: [] },
              [],
              "past",
              t.s,
            ),
          );
        }
      }
      const pl = this.plural(t.s);
      const subj = this.np(t.s, { adjs: subjAdjs, coref: outer === t.s });
      const vp = this.vparts(lex);
      const sc = subcat(R);
      let words = [];
      const advBefore = vp.cop || sc === "RA";
      if (sc === "RC") {
        // rule 9: copula + NP
        words.push(this.inflect("be", form, pl), t.o ? this.np(t.o, { poss, adjs: objAdjs }) : "");
      } else if (vp.cop || sc === "RA") {
        // rules 7/8: copula + AP (+ NP)
        words.push(this.inflect("be", form, pl), ...advs, vp.rest);
        if (t.o) words.push(this.np(t.o, { obj: true, adjs: objAdjs, poss }));
      } else if (sc === "RP") {
        // copula + PP
        words.push(this.inflect("be", form, pl), lex.toLowerCase(), this.np(t.o, { obj: true }));
      } else {
        words.push(this.inflect(vp.verb, form, pl));
        if (vp.rest) words.push(vp.rest);
        if (t.o && net.nodes.get(t.o) && t.o === "THAT" && thats.length) {
          /* rule 10 */
        } else if (t.o)
          words.push(
            this.np(t.o, { obj: true, adjs: objAdjs, poss, parts: objParts, coref: outer === t.o }),
          );
      }
      if (thats.length) words.push("that " + thats.filter(Boolean).join(" and that "));
      if (!advBefore) words.push(...advs);
      words.push(...infs, ...pps);
      // subject participles (MX QQ folding, PTRANS 4) are attached at the end of the clause
      const tail = subjParts.length ? ", " + subjParts.join(" and ") : "";
      return [subj, ...words].filter(Boolean).join(" ") + tail;
    }
    infinitive(r, o) {
      const l = this.relLex(r);
      if (!l) return "";
      const vp = this.vparts(l);
      const parts = ["to", vp.cop ? "be" : vp.verb.toLowerCase()];
      if (vp.rest) parts.push(vp.rest);
      if (o) parts.push(this.np(o, { obj: true }));
      return parts.join(" ");
    }

    /* narrate one time frame's change stack (§5.1 style control) */
    narrate(stack, now) {
      const sentences = [];
      let blocked = false;
      let fold = 0;
      const heads = [];
      for (const e of stack) {
        if (e.r === "ULST") {
          blocked = true;
          continue;
        }
        if (e.r === "LST") {
          blocked = false;
          continue;
        }
        if (e.s === "MX" && e.r === "QQ") {
          fold = e.value;
          continue;
        }
        if (e.kind === "del") continue;
        if (blocked) continue;
        const t = { s: e.s, r: e.r, o: e.o, value: e.value, secondary: e.secondary };
        if (!this.relLex(t.r, t.value)) continue; // no lexical expression → inexpressible
        // a numeric change is reported only when it changes the lexical expression
        if (e.old !== undefined && this.relLex(e.r, e.old) === this.relLex(e.r, e.value)) continue;
        if (fold > 0 && heads.length) {
          heads[heads.length - 1].folded.push(t);
          fold--;
          continue;
        }
        fold = 0;
        heads.push({ t, folded: [] });
      }
      // conjoin identical actions by several subjects (the "They" device, §5.1)
      const merged = [];
      for (const h of heads) {
        const prev = merged[merged.length - 1];
        if (
          prev &&
          !h.folded.length &&
          !prev.folded.length &&
          prev.t.r === h.t.r &&
          prev.t.o === h.t.o &&
          prev.t.value === h.t.value &&
          JSON.stringify(prev.t.secondary) === JSON.stringify(h.t.secondary) &&
          prev.subjects.length < 4 &&
          !prev.subjects.includes(h.t.s) &&
          h.t.s !== "THEY" &&
          !this.net.nodes.get(h.t.s)?.flags.has("PRON")
        ) {
          prev.subjects.push(h.t.s);
          continue;
        }
        merged.push({ ...h, subjects: [h.t.s] });
      }
      for (const h of merged) {
        let txt;
        if (h.subjects.length > 1) {
          const names = h.subjects.map((s) => this.np(s));
          const subj = names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
          const one = this.clause({ ...h.t, s: "THEY" }, []);
          if (!one) continue;
          txt = subj + one.replace(/^they/, "");
        } else txt = this.clause(h.t, h.folded);
        if (!txt) continue;
        sentences.push(txt.charAt(0).toUpperCase() + txt.slice(1) + ".");
      }
      return sentences;
    }
  }

  const api = {
    NovelWriter,
    SemanticNetwork,
    Dictionary,
    Generator,
    RULES,
    LOW,
    tokenize,
    compile,
    parseDuration,
    fmtTime,
    makeRng,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KleinNovelWriter = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
