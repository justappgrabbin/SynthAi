/*
 * messy.js — Meta-Symbolic Simulation System (MESSY) in pure JavaScript.
 *
 * Implements the simulation language described in:
 *   M. A. Appelbaum, "Meta-symbolic Simulation System (MESSY) User Manual",
 *   with foreword by S. Klein. UW-Madison Computer Sciences TR #272, 1976.
 *
 * Zero dependencies. Runs in Node (require / CLI) and in the browser (window.MESSY).
 *
 * Section numbers in comments (e.g. "§26.1.1") refer to that manual.
 *
 * NOTE ON THE GENERATOR: the manual explicitly omits the natural-language
 * generative component (grammar + dictionary). realize() at the bottom of this
 * file is this implementation's own small English realizer that reads the change
 * stack and the lexical expression lists; it is NOT the 1976 grammar.
 */
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- constants
  const RESERVED = new Set(
    (
      "ABS AND CLOCK DEL DELSEC DUR DURSEC ENTIER EQ EQL EQLP EVER " +
      "EVERSEC FLOAT FROM GE GT LE LT MOD NE NEQ NEQP NOT NUM NUMP OR PICK RANDOM RV RVAL " +
      "RVALSEC SEC TIMER TO VAL VALSEC"
    ).split(" "),
  );
  const REL_OPS = {
    EQ: "EQ",
    "=": "EQ",
    NE: "NE",
    LT: "LT",
    "<": "LT",
    LE: "LE",
    "<=": "LE",
    GT: "GT",
    ">": "GT",
    GE: "GE",
    ">=": "GE",
  };
  const SENT_FNS = new Set(["VAL", "DUR", "DEL", "RVAL", "EVER"]);
  const SEC_FNS = new Set(["SEC", "VALSEC", "DURSEC", "DELSEC", "RVALSEC", "EVERSEC"]);

  class MessyError extends Error {
    constructor(msg, tok) {
      super(tok ? `line ${tok.line} col ${tok.col}: ${msg}` : msg);
      this.tok = tok;
    }
  }

  // ---------------------------------------------------------------- RNG
  // Deterministic seeded generator (§3.1.2: same seed => same run).
  function makeRng(seed) {
    let s = seed >>> 0 || 1;
    const f = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.seed = (n) => {
      s = n >>> 0 || 1;
    };
    f.state = () => s;
    return f;
  }

  // ---------------------------------------------------------------- lexer (§2.3)
  function lex(src, opts) {
    const toks = [];
    const lines = String(src).replace(/\r/g, "").replace(/[‘’`]/g, "'").split("\n");
    for (let li = 0; li < lines.length; li++) {
      let line = lines[li];
      if (line[0] === "%") continue; // comment card
      if (opts.cardColumns) line = line.slice(0, opts.cardColumns);
      let i = 0;
      const L = line.length,
        ln = li + 1;
      const push = (type, v, col) => toks.push({ type, v, line: ln, col });
      while (i < L) {
        const c = line[i];
        if (c === " " || c === "\t") {
          i++;
          continue;
        }
        const col = i + 1;
        if (/[A-Za-z]/.test(c)) {
          let j = i;
          while (j < L && /[A-Za-z0-9]/.test(line[j])) j++;
          push("NAME", line.slice(i, j).toUpperCase(), col);
          i = j;
          continue;
        }
        if (c === "$") {
          let j = i + 1;
          while (j < L && /[A-Za-z]/.test(line[j])) j++;
          push("CMD", line.slice(i + 1, j).toUpperCase(), col);
          i = j;
          continue;
        }
        if (c === "'") {
          let j = i + 1;
          while (j < L && line[j] !== "'") j++;
          if (j >= L) throw new MessyError("unterminated quoted string", { line: ln, col });
          push("STR", line.slice(i + 1, j), col);
          i = j + 1;
          continue;
        }
        if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(line[i + 1] || ""))) {
          const rest = line.slice(i);
          const tm = /^(\d+[A-Za-z])+(?![A-Za-z0-9])/.exec(rest);
          if (tm) {
            push("TIME", tm[0].toUpperCase(), col);
            i += tm[0].length;
            continue;
          }
          const nm = /^(\d+\.?\d*|\.\d+)/.exec(rest);
          push("NUM", parseFloat(nm[0]), col);
          i += nm[0].length;
          continue;
        }
        const two = line.slice(i, i + 2);
        if (["**", "<=", ">=", "=+", "=-", "=*", "=/"].includes(two)) {
          push("SYM", two, col);
          i += 2;
          continue;
        }
        if ("(),;:=/.*+-<>".includes(c)) {
          push("SYM", c, col);
          i++;
          continue;
        }
        throw new MessyError(`illegal character '${c}'`, { line: ln, col });
      }
    }
    toks.push({ type: "EOF", v: null, line: lines.length + 1, col: 1 });
    return toks;
  }

  // ---------------------------------------------------------------- program / machine
  function defaultUnits() {
    return {
      units: [
        { name: "MIN", letter: "M", n: 1 },
        { name: "HOUR", letter: "H", n: 60 },
        { name: "DAY", letter: "D", n: 1440 },
        { name: "WEEK", letter: "W", n: 10080 },
      ],
      day: 1440,
    };
  }

  class Machine {
    constructor(opts) {
      this.opts = Object.assign(
        { truncateNames: true, cardColumns: null, maxStepsPerTick: 100000 },
        opts || {},
      );
      this.atoms = new Map(); // name -> {name,type:'N'|'R',idx,g1,g2,transitive,numLex,isGroup}
      this.classDefs = new Map(); // name -> {type,subscripted}
      this.groups = new Map(); // name -> group
      this.groupOrder = [];
      this.exclusions = [];
      this.time = defaultUnits();
      this.limits = { start: 0, end: 99999999, nolist: false, seed: null, clock: false };
      this.rngP = makeRng(12345);
      this.rngS = makeRng(67891);
      this.rngG = makeRng(424242); // generator (realizer) choices
      this.out = []; // change stack blocks [{time, entries}]
      this.log = []; // traces / prints / warnings
      this.warnings = 0;
      this.state = {
        now: 0,
        rv: 0,
        seq: 0,
        net: new Map(),
        pred: new Map(),
        classes: new Map(),
        lex: new Map(),
        queue: [],
        qord: 0,
        enabled: new Set(),
        ended: false,
        endTime: 99999999,
        trace: {
          A: { n: 0, on: false },
          B: { n: 0, on: false },
          C: { n: 0, on: false },
          D: { n: 0, on: false },
          E: { n: 0, on: false },
        },
        prints: new Map(),
      };
      this.suppress = 0; // >0 while initializing or looking ahead
      this.curBlock = null;
      this.stopReason = null;
    }

    norm(n) {
      return this.opts.truncateNames ? n.slice(0, 8) : n;
    }
    warn(msg) {
      this.warnings++;
      this.log.push("WARNING: " + msg);
      if (this.warnings > 50) throw new MessyError("more than 50 warnings; execution terminated");
    }

    // ---- atoms
    defineAtom(name, type, extra) {
      if (RESERVED.has(name)) throw new MessyError(`'${name}' is a reserved word`);
      if (this.atoms.has(name)) {
        const a = this.atoms.get(name);
        if (a.type !== type)
          throw new MessyError(
            `'${name}' already defined as ${a.type === "N" ? "node" : "relation"}`,
          );
        Object.assign(a, extra || {});
        return a;
      }
      const a = Object.assign(
        {
          name,
          type,
          idx: this.atoms.size,
          g1: 0,
          g2: 0,
          transitive: false,
          numLex: null,
          isGroup: false,
        },
        extra || {},
      );
      this.atoms.set(name, a);
      if (!this.state.lex.has(name)) this.state.lex.set(name, []);
      return a;
    }
    atomIdx(n) {
      const a = this.atoms.get(n);
      return a ? a.idx : 1e9;
    }
    sortAtoms(arr) {
      const seen = new Set(),
        outA = [];
      for (const x of arr)
        if (!seen.has(x)) {
          seen.add(x);
          outA.push(x);
        }
      return outA.sort((a, b) => this.atomIdx(a) - this.atomIdx(b));
    }

    // ---- time
    parseTime(tok) {
      if (tok.type === "NUM") return tok.v; // plain integer of basic units
      let total = 0;
      const re = /(\d+)([A-Z])/g;
      let m;
      while ((m = re.exec(tok.v))) {
        const u = this.time.units.find((u) => u.letter === m[2]);
        if (!u) throw new MessyError(`unknown time unit '${m[2]}'`, tok);
        total += parseInt(m[1], 10) * u.n;
      }
      return total;
    }
    fmtTime(t) {
      const us = this.time.units.slice().sort((a, b) => b.n - a.n);
      let r = "",
        x = t;
      if (x < 0) {
        r = "-";
        x = -x;
      }
      for (const u of us) {
        const k = Math.floor(x / u.n);
        if (k) {
          r += k + u.letter;
          x -= k * u.n;
        }
      }
      return r || "0" + us[us.length - 1].letter;
    }

    // ---- classes
    members(key) {
      return this.state.classes.get(key) || [];
    }
    setMembers(key, arr) {
      this.state.classes.set(key, this.sortAtoms(arr));
    }
  }

  // ---------------------------------------------------------------- parser / compiler
  class Parser {
    constructor(m, toks) {
      this.m = m;
      this.t = toks;
      this.p = 0;
      this.scope = []; // loop variables in scope: {name, kind:'atom'|'triple'}
      this.svars = null; // Set of subrule variable names in current subrule list
      this.inLook = false;
    }
    peek(k = 0) {
      return this.t[this.p + k];
    }
    next() {
      return this.t[this.p++];
    }
    isSym(v, k = 0) {
      const t = this.peek(k);
      return t.type === "SYM" && t.v === v;
    }
    isName(v, k = 0) {
      const t = this.peek(k);
      return t.type === "NAME" && (v === undefined || t.v === v);
    }
    isCmd(v, k = 0) {
      const t = this.peek(k);
      return t.type === "CMD" && (v === undefined || t.v === v);
    }
    err(msg, tok) {
      throw new MessyError(msg, tok || this.peek());
    }
    expectSym(v) {
      const t = this.peek();
      if (t.type === "SYM" && t.v === v) return this.next();
      // split combined tokens: '=+' etc. when only '=' was wanted
      if (v === "=" && t.type === "SYM" && t.v.length === 2 && t.v[0] === "=") {
        t.v = t.v[1];
        return { type: "SYM", v: "=", line: t.line, col: t.col };
      }
      this.err(`expected '${v}' but found ${t.type === "EOF" ? "end of program" : `'${t.v}'`}`);
    }
    acceptSym(v) {
      if (this.isSym(v)) {
        this.next();
        return true;
      }
      return false;
    }
    name() {
      const t = this.peek();
      if (t.type !== "NAME") this.err(`expected a name, found '${t.v}'`);
      this.next();
      return this.m.norm(t.v);
    }
    signedNum() {
      let sign = 1;
      if (this.isSym("+")) this.next();
      else if (this.isSym("-")) {
        this.next();
        sign = -1;
      }
      const t = this.peek();
      if (t.type === "NUM") {
        this.next();
        return sign * t.v;
      }
      if (t.type === "TIME") {
        this.next();
        return sign * this.m.parseTime(t);
      }
      this.err(`expected a number, found '${t.v}'`);
    }
    timeVal() {
      const t = this.next();
      if (t.type !== "TIME" && t.type !== "NUM") this.err("expected a time", t);
      return this.m.parseTime(t);
    }
    optionField() {
      // ,OPTS
      if (!this.isSym(",")) return null;
      this.next();
      const t = this.next();
      if (t.type !== "NAME" || !/^[SCOID]+$/.test(t.v)) this.err("bad option field", t);
      return t.v;
    }

    // ========================= top level
    parseProgram() {
      const m = this.m;
      let sawEnd = false;
      while (this.peek().type !== "EOF") {
        const t = this.peek();
        if (t.type !== "CMD") this.err(`expected a $ command, found '${t.v}'`);
        this.next();
        switch (t.v) {
          case "LIMITS":
            this.pLimits();
            break;
          case "TIME":
            this.pTime();
            break;
          case "NODES":
            this.acceptSym(";");
            this.pAtoms("N");
            break;
          case "RELATIONS":
            this.acceptSym(";");
            this.pAtoms("R");
            break;
          case "CLASSES":
            this.acceptSym(";");
            this.pClasses();
            break;
          case "EXCLUSIONS":
            this.acceptSym(";");
            this.pExclusions();
            break;
          case "NETWORK":
            this.acceptSym(";");
            this.pNetwork();
            break;
          case "GROUP":
            this.pGroup();
            break;
          case "END":
            this.acceptSym(";");
            sawEnd = true;
            break;
          default:
            this.err(`unexpected command $${t.v}`, t);
        }
        if (sawEnd) break;
      }
      if (!sawEnd) m.warn("program has no $END");
      // compile-time checks (§16.1): names enabled/called must eventually be groups
      for (const ref of this.groupRefs || []) {
        if (ref.k === "atom" && !m.groups.has(ref.name))
          m.warn(`'${ref.name}' is referenced as a group but never defined as one`);
      }
    }

    pLimits() {
      // §3.1
      const m = this.m;
      while (!this.isSym(";")) {
        const t = this.next();
        if (t.type !== "NAME") this.err("bad $LIMITS item", t);
        if (t.v === "SAVE" || t.v === "RESTORE")
          m.warn(`$LIMITS ${t.v} has no effect in this implementation (use JSON export instead)`);
        else if (t.v === "NOLIST") m.limits.nolist = true;
        else if (t.v === "CLOCK") {
          const s = (Date.now() % 2147483647) | 0;
          m.limits.seed = s;
          m.log.push(`RANDOM SEED (CLOCK) = ${s}`);
        } else if (t.v === "JUMBLE") {
          this.expectSym("=");
          m.limits.seed = this.signedNum();
        } else if (t.v === "START") {
          this.expectSym("=");
          m.limits.start = this.timeVal();
        } else if (t.v === "END") {
          this.expectSym("=");
          m.limits.end = this.timeVal();
        } else this.err(`unknown $LIMITS option ${t.v}`, t);
        this.acceptSym(",");
      }
      this.next();
      if (m.limits.seed != null) {
        m.rngP.seed(m.limits.seed * 2 + 1);
        m.rngS.seed(m.limits.seed * 3 + 7);
      }
      m.state.now = m.limits.start;
      m.state.endTime = m.limits.end;
    }

    pTime() {
      // §3.2
      const units = [];
      let day = null;
      while (!this.isSym(";")) {
        const nm = this.next();
        if (nm.type !== "NAME") this.err("expected unit name", nm);
        this.expectSym("=");
        const n = this.next();
        if (n.type !== "NUM") this.err("expected unit size", n);
        const u = { name: nm.v, letter: nm.v[0], n: n.v };
        if (this.acceptSym("*")) day = n.v;
        if (units.find((x) => x.letter === u.letter))
          this.err(`two time units start with '${u.letter}'`, nm);
        units.push(u);
        this.acceptSym(",");
      }
      this.next();
      if (!units.length || units[0].n !== 1)
        this.err("first $TIME unit must be 1 (the basic unit)");
      this.m.time = { units, day: day || 1440 };
    }

    // §4, §5
    pAtoms(type) {
      const m = this.m;
      while (this.peek().type === "NAME") {
        const nt = this.peek();
        const name = this.name();
        let transitive = false;
        if (type === "R" && this.isName("T") && this.peek(1).type === "NUM") {
          this.next();
          transitive = true;
        }
        const g1t = this.next();
        if (g1t.type !== "NUM") this.err("grammar number required", g1t);
        let g2 = 0;
        if (type === "R") {
          const g2t = this.next();
          if (g2t.type !== "NUM") this.err("relations need two grammar numbers", g2t);
          g2 = g2t.v;
        }
        const a = m.defineAtom(name, type, { g1: g1t.v, g2, transitive });
        if (this.acceptSym("=") || this.isSym("=/") || this.isSym("=-") || this.isSym("=+")) {
          if (this.peek().type === "SYM" && this.peek().v.length === 2) this.expectSym("=");
          if (type === "R" && this.looksNumericLex()) a.numLex = this.pNumericLex();
          else m.state.lex.set(name, m.state.lex.get(name).concat(this.pLexList()));
        }
        this.expectSym(";");
      }
    }
    looksNumericLex() {
      if (this.isSym("/")) return true;
      let k = 0;
      if (this.isSym("-") || this.isSym("+")) k = 1;
      return this.peek(k).type === "NUM" && this.isSym("/", k + 1);
    }
    pLexList() {
      // §4.2
      const items = [];
      while (!this.isSym(";")) {
        if (this.peek().type === "STR") items.push({ str: this.next().v });
        else if (this.isSym("(")) items.push({ trp: this.pLexTriple() });
        else this.err("bad lexical expression list item");
      }
      return items;
    }
    pLexTriple() {
      // §4.2.1  (A R [B]) with '-' for empty
      this.expectSym("(");
      const items = [];
      while (!this.isSym(")")) {
        if (this.acceptSym("-")) items.push(null);
        else items.push(this.name());
      }
      this.next();
      if (items.length < 2 || items.length > 3) this.err("lexical triple needs 2 or 3 items");
      return items;
    }
    pNumericLex() {
      // §5.2   [lb] { /list/ [ub] }*
      const parts = [];
      let lb = null;
      if (!this.isSym("/")) lb = this.signedNum();
      while (this.isSym("/")) {
        this.next();
        const items = [];
        while (!this.isSym("/")) {
          const t = this.next();
          if (t.type !== "STR") this.err("numeric lexical lists may hold only quoted entries", t);
          items.push({ str: t.v });
        }
        this.next();
        let ub = null;
        if (!this.isSym("/") && !this.isSym(";")) ub = this.signedNum();
        parts.push({ lo: lb, hi: ub, items });
        lb = ub;
      }
      return parts;
    }

    // §6
    pClasses() {
      const m = this.m;
      while (this.peek().type === "NAME") {
        const name = this.name();
        if (!m.atoms.has(name)) m.defineAtom(name, "N");
        const type = m.atoms.get(name).type;
        let key = name,
          subscripted = false;
        if (this.isSym("(")) {
          this.next();
          subscripted = true;
          if (!this.isSym(")")) {
            const sub = this.evalFieldNow(this.pField({}));
            if (sub.length !== 1) this.err("a class definition subscript must be a single atom");
            key = name + "(" + sub[0] + ")";
          }
          this.expectSym(")");
        }
        const prev = m.classDefs.get(name);
        if (prev && prev.subscripted !== subscripted)
          this.err(`class ${name} defined both with and without subscripts`);
        m.classDefs.set(name, { type, subscripted });
        this.expectSym("=");
        const mem = [];
        while (!this.isSym(";")) for (const x of this.evalFieldNow(this.pField({}))) mem.push(x);
        this.next();
        for (const x of mem)
          if (m.atoms.get(x).type !== type)
            this.err(
              `class ${name} holds ${type === "N" ? "nodes" : "relations"}; '${x}' is not one`,
            );
        if (key !== name || !subscripted) m.setMembers(key, m.members(key).concat(mem));
      }
    }

    // §7
    pExclusions() {
      const m = this.m;
      while (this.peek().type === "NAME" && /^[RSO]$/.test(this.peek().v) && this.isSym(":", 1)) {
        const kind = this.next().v;
        this.next();
        if (kind === "R") {
          const fields = [];
          while (!this.isSym(";")) fields.push(this.pField({}));
          this.next();
          m.exclusions.push({ kind, fields });
        } else {
          const rel = this.name();
          if (!m.atoms.has(rel) || m.atoms.get(rel).type !== "R")
            this.err(`${rel} is not a relation`);
          if (m.atoms.get(rel).transitive)
            this.err(`${kind} exclusions cannot use the transitive relation ${rel}`);
          this.expectSym("=");
          const fields = [];
          while (!this.isSym(";")) fields.push(this.pField({}));
          this.next();
          m.exclusions.push({ kind, rel, fields });
        }
      }
    }

    // §8
    pNetwork() {
      const m = this.m;
      while (this.peek().type !== "CMD" && this.peek().type !== "EOF") {
        let t = 0;
        if (this.isName("FOR") && (this.peek(1).type === "TIME" || this.peek(1).type === "NUM")) {
          this.next();
          const d = this.timeVal();
          this.expectSym(":");
          t = m.limits.start - d;
        }
        const acts = this.pActions({ network: true });
        this.expectSym(";");
        m.suppress++;
        const save = m.state.now;
        m.state.now = t;
        try {
          for (const a of acts) m.rt.execAction(a, m.rt.newEnv(), "");
        } finally {
          m.state.now = save;
          m.suppress--;
        }
      }
    }

    // §9
    pGroup() {
      const m = this.m;
      const gopts = this.optionField() || "";
      const name = this.name();
      if (!m.atoms.has(name)) m.defineAtom(name, "N");
      m.atoms.get(name).isGroup = true;
      this.expectSym(":");
      const interval = this.timeVal();
      this.expectSym("/");
      const st = this.name();
      if (st !== "ON" && st !== "OFF") this.err("group initial state must be ON or OFF");
      this.expectSym(";");
      if (m.groups.has(name)) this.err(`group ${name} defined twice`);
      const g = {
        name,
        interval,
        on: st === "ON",
        sync: gopts.includes("S"),
        opts: gopts.replace(/S/g, ""),
        stmts: [],
        labels: new Map(),
        hasLook: false,
      };
      m.groups.set(name, g);
      m.groupOrder.push(name);
      const loopStack = [];
      const pending = [];
      this.scope = [];
      for (;;) {
        const t = this.peek();
        if (t.type !== "CMD")
          this.err(`expected $RULE, $SWITCH, $LOOP, $ENDLOOP or $ENDGROUP, found '${t.v}'`);
        this.next();
        const idx = g.stmts.length;
        const optsHere = () =>
          loopStack.length ? g.stmts[loopStack[loopStack.length - 1]].opts : g.opts;
        if (t.v === "ENDGROUP") {
          this.acceptSym(";");
          if (loopStack.length) this.err("$ENDGROUP inside an unterminated $LOOP", t);
          break;
        }
        if (t.v === "ENDLOOP") {
          this.acceptSym(";");
          if (!loopStack.length) this.err("$ENDLOOP without $LOOP", t);
          const li = loopStack.pop();
          g.stmts[li].end = idx;
          g.stmts.push({ type: "ENDLOOP", loop: li, line: t.line, loops: loopStack.slice() });
          this.scope.pop();
          continue;
        }
        if (t.v === "LOOP") {
          const o = this.optionField();
          let label = null;
          if (this.isName() && this.isSym(":", 1)) label = this.name();
          this.expectSym(":");
          const v = this.name();
          let kind;
          if (this.acceptSym(".")) kind = "atom";
          else if (this.acceptSym("*")) kind = "triple";
          else this.err("expected '.' or '*' after loop variable");
          const src = this.pField({});
          this.expectSym(";");
          const s = {
            type: "LOOP",
            label,
            var: v,
            kind,
            src,
            opts: o != null ? o : optsHere(),
            line: t.line,
            loops: loopStack.slice(),
            end: -1,
          };
          if (label) {
            if (g.labels.has(label)) this.err(`label ${label} used twice`);
            g.labels.set(label, idx);
          }
          g.stmts.push(s);
          loopStack.push(idx);
          this.scope.push({ name: v, kind });
          continue;
        }
        if (t.v === "RULE" || t.v === "SWITCH") {
          const s = this.pRuleStmt(t, optsHere());
          s.loops = loopStack.slice();
          if (s.label) {
            if (g.labels.has(s.label)) this.err(`label ${s.label} used twice`);
            g.labels.set(s.label, idx);
          }
          for (const b of ["u", "t", "f"]) if (s.branch[b]) pending.push({ s, b, tok: t });
          if (s.look) g.hasLook = true;
          g.stmts.push(s);
          continue;
        }
        this.err(`unexpected $${t.v} inside group ${name}`, t);
      }
      // resolve branches (§10.2) and check loop-entry legality (§23.2)
      for (const { s, b, tok } of pending) {
        const br = s.branch[b];
        if (br.k === "label") {
          if (!g.labels.has(br.name)) this.err(`branch to undefined label ${br.name}`, tok);
          br.idx = g.labels.get(br.name);
          const target = g.stmts[br.idx];
          const tl = target.type === "LOOP" ? target.loops : target.loops;
          for (const l of tl)
            if (!s.loops.includes(l))
              this.err(`illegal branch into the range of a loop (to ${br.name})`, tok);
        } else if (br.k === "next") {
          const li = s.loops
            .slice()
            .reverse()
            .find((l) => g.stmts[l].var === br.var);
          if (li == null) this.err(`$NEXT ${br.var}: not inside a loop on ${br.var}`, tok);
          br.idx = g.stmts[li].end;
        }
      }
      if (!g.stmts.length) m.warn(`group ${name} is empty`);
    }

    pRuleStmt(t, inherited) {
      const isSwitch = t.v === "SWITCH";
      const o = this.optionField();
      const opts = o != null ? o : inherited;
      let label = null;
      if (this.isName() && this.isSym(":", 1)) label = this.name();
      this.expectSym(":");
      const branch = this.pBranch();
      let actions = [],
        look = null,
        post = [];
      if (!this.isSym(";")) {
        if (isSwitch) this.err("a $SWITCH may not have an action list");
        actions = this.pActions({});
      }
      this.expectSym(";");
      const lookAct = actions.find((a) => a.op === "LOOK");
      if (lookAct) {
        // §29
        look = { time: lookAct.time, save: [] };
        for (const a of actions) if (a.op === "SAVE") look.save.push(...a.classes);
        if (!this.isSubruleStart() && this.peek().type !== "CMD" && this.peek().type !== "EOF") {
          post = this.pActions({});
          this.expectSym(";");
        }
      } else if (actions.some((a) => a.op === "SAVE")) this.err("*SAVE is only allowed with *LOOK");
      this.inLook = !!look;
      const subrules = this.pSubruleList(opts);
      this.inLook = false;
      return {
        type: isSwitch ? "SWITCH" : "RULE",
        label,
        opts,
        branch,
        actions,
        subrules,
        look,
        post,
        line: t.line,
      };
    }

    pBranch() {
      // §10.2
      const br = { u: null, t: null, f: null };
      const field = () => {
        this.expectSym("(");
        let r;
        if (this.isCmd("ENDGROUP")) {
          this.next();
          r = { k: "endgroup" };
        } else if (this.isCmd("NEXT")) {
          this.next();
          r = { k: "next", var: this.name() };
        } else r = { k: "label", name: this.name() };
        this.expectSym(")");
        return r;
      };
      const isBranchParen = () =>
        this.isSym("(") &&
        ((this.peek(1).type === "CMD" &&
          (this.peek(1).v === "ENDGROUP" || this.peek(1).v === "NEXT")) ||
          (this.peek(1).type === "NAME" &&
            this.isSym(")", 2) &&
            !this.scope.some(
              (s) => s.kind === "triple" && s.name === this.m.norm(this.peek(1).v),
            )));
      if (isBranchParen()) {
        br.u = field();
        return br;
      }
      for (let k = 0; k < 2; k++) {
        if (this.isName("T") && this.isSym("(", 1) && !br.t) {
          this.next();
          br.t = field();
        } else if (this.isName("F") && this.isSym("(", 1) && !br.f) {
          this.next();
          br.f = field();
        }
      }
      return br;
    }

    // ========================= fields (§11.2)
    // ctx: {def:true} allows subrule-variable definitions; {lex:true} allows undefined names
    pField(ctx) {
      const m = this.m;
      if (this.acceptSym("/")) {
        const n = this.name();
        if (!m.atoms.has(n)) this.err(`undefined atom /${n}`);
        return { k: "atom", name: n };
      }
      const tok = this.peek();
      if (tok.type !== "NAME") this.err(`expected an atom, class or variable, found '${tok.v}'`);
      if (tok.v === "PICK") {
        this.next();
        this.expectSym("(");
        const arg = this.pField(Object.assign({}, ctx, { def: false }));
        this.expectSym(")");
        return { k: "pick", arg };
      }
      if (RESERVED.has(tok.v)) this.err(`reserved word ${tok.v} used as an atom`);
      const n = this.name();
      if (ctx.def && this.isSym(".") && this.svars) {
        if (this.svars.has(n))
          this.err(`subrule variable ${n} defined twice in one subrule list`, tok);
        this.svars.add(n);
        this.next();
        const arg = this.pField({ def: false });
        return { k: "svardef", name: n, arg };
      }
      if (this.svars && this.svars.has(n)) return { k: "svar", name: n };
      const lv = this.scope
        .slice()
        .reverse()
        .find((s) => s.name === n);
      if (lv) return { k: lv.kind === "triple" ? "tvar" : "lvar", name: n };
      const cd = m.classDefs.get(n);
      if (cd) {
        if (cd.subscripted) {
          if (!this.isSym("("))
            this.err(`subscripted class ${n} used without a subscript (use /${n} for the atom)`);
          this.next();
          const sub = this.pField(Object.assign({}, ctx, { def: false }));
          this.expectSym(")");
          return { k: "class", name: n, sub };
        }
        return { k: "class", name: n, sub: null };
      }
      if (m.atoms.has(n)) return { k: "atom", name: n };
      if (ctx.lex) return { k: "atom", name: n, fwd: true };
      this.err(`undefined name ${n}`, tok);
    }

    evalFieldNow(f) {
      return this.m.rt.evalField(f, this.m.rt.newEnv());
    }

    // ========================= triples & actions (§11-§21, §32.3)
    pTriple(ctx) {
      this.expectSym("(");
      let h = 0;
      if (this.peek().type === "NUM" && this.peek().v === 1 && !this.isSym(")", 1)) {
        this.next();
        h = 1;
      }
      if (this.isName() && this.isSym(")", 1)) {
        const n = this.m.norm(this.peek().v);
        if (this.scope.some((s) => s.kind === "triple" && s.name === n)) {
          this.next();
          this.next();
          return { h, tvar: n };
        }
      }
      const items = [];
      while (!this.isSym(")")) {
        if (items.length === 3) this.err("a triple has at most three items");
        items.push(this.pField(ctx || {}));
      }
      this.next();
      if (items.length < 2) this.err("a triple needs a subject and a relation");
      return { h, s: items[0], r: items[1], o: items[2] || null };
    }

    pActions(ctx) {
      const acts = [this.pAction(ctx)];
      while (this.acceptSym(",")) acts.push(this.pAction(ctx));
      return acts;
    }

    pPredSource() {
      // §13.3
      if (this.isSym("(")) return { trp: this.pTriple() };
      return { nodes: this.pField({}) };
    }
    expectName(v) {
      if (!this.isName(v)) this.err(`expected ${v}`);
      this.next();
    }
    pAssign() {
      const t = this.next();
      if (t.type !== "SYM" || !["=", "=+", "=-", "=*", "=/"].includes(t.v))
        this.err("expected an assignment operator (= =+ =- =* =/)", t);
      let value;
      if (this.isSym("(")) value = { trp: this.pTriple() };
      else value = { num: this.signedNum() };
      return { assign: t.v, value };
    }
    pCount() {
      if (this.isSym("(") && this.peek(1).type === "NUM" && this.isSym(")", 2)) {
        this.next();
        const n = this.next().v;
        this.next();
        return n;
      }
      return 32767;
    }

    pAction(ctx) {
      const m = this.m;
      if (this.isSym("(")) return { op: "ASSERT", trp: this.pTriple() };
      const star = this.peek();
      if (!this.isSym("*")) this.err(`expected an action ('(' or '*'), found '${star.v}'`);
      this.next();
      const kw = this.next();
      if (kw.type !== "NAME") this.err("expected an action name after *", kw);
      const a = { op: kw.v, line: kw.line };
      switch (kw.v) {
        case "NEG":
          a.trp = this.pTriple();
          break;
        case "SET":
          if (this.isName("RV")) {
            this.next();
            a.op = "SETRV";
            Object.assign(a, this.pAssign());
          } else {
            a.trp = this.pTriple();
            Object.assign(a, this.pAssign());
          }
          break;
        case "SEC":
        case "NEGSEC":
          a.trp = this.pTriple();
          a.secs = [];
          while (this.isSym("(")) a.secs.push(this.pTriple());
          if (!a.secs.length) this.err(`*${kw.v} needs at least one secondary triple`);
          break;
        case "SETSEC":
          a.trp = this.pTriple();
          a.sec = this.pTriple();
          Object.assign(a, this.pAssign());
          break;
        case "ADDP":
        case "MOVEP":
        case "PUSHP":
          a.src = this.pPredSource();
          this.expectName("TO");
          a.dst = this.pField({});
          break;
        case "REMOVEP":
          a.src = this.pPredSource();
          this.expectName("FROM");
          a.dst = this.pField({});
          break;
        case "ERASEP":
          a.dst = this.pField({});
          break;
        case "POPP":
        case "LOCATE":
          a.src = this.pField({});
          this.expectName("TO");
          a.dst = this.pField({});
          break;
        case "MOVEPAR":
          a.src = this.pPredSource();
          this.expectName("TO");
          a.dst = this.pField({});
          break;
        case "EXPAND":
          a.src = this.pPredSource();
          this.expectName("TO");
          a.dsts = [this.pField({}), this.pField({})];
          if (this.peek().type === "NAME" && !this.isSym(",", 0)) a.dsts.push(this.pField({}));
          break;
        case "ADD":
        case "MOVE":
          a.src = this.pField({});
          this.expectName("TO");
          a.dst = this.pField({});
          break;
        case "REMOVE":
          a.src = this.pField({});
          this.expectName("FROM");
          a.dst = this.pField({});
          break;
        case "ERASE":
          a.dst = this.pField({});
          break;
        case "LEXTRP": {
          this.expectSym("(");
          a.items = [];
          while (!this.isSym(")"))
            a.items.push(this.acceptSym("-") ? null : this.pField({ lex: true }));
          this.next();
          if (a.items.length < 1 || a.items.length > 3)
            this.err("*LEXTRP takes a triple of one to three items");
          this.expectName("TO");
          a.dst = this.pField({});
          break;
        }
        case "LEXADD":
          a.src = this.pField({});
          this.expectName("TO");
          a.dst = this.pField({});
          break;
        case "ENABLE":
          a.src = this.pField({ lex: true });
          (this.groupRefs = this.groupRefs || []).push(a.src);
          if (this.isName("IN")) {
            this.next();
            a.dt = this.timeVal();
          } else a.dt = 0;
          break;
        case "DISABLE":
        case "CALL":
          a.src = this.pField({ lex: true });
          (this.groupRefs = this.groupRefs || []).push(a.src);
          if (kw.v === "CALL" && this.svarsActive)
            this.err("*CALL is not allowed in a subrule action list");
          break;
        case "RETURN":
        case "END":
          break;
        case "JUMBLE": {
          let which = "PS";
          if (this.isName() && /^[PS]+$/.test(this.peek().v)) which = this.next().v;
          this.expectSym("=");
          a.which = which;
          a.n = this.signedNum();
          break;
        }
        case "LOOK":
          a.time = this.timeVal();
          break;
        case "SAVE":
          a.classes = [];
          while (this.isName() && !this.isSym("(", 1)) a.classes.push(this.name());
          break;
        case "TSET": {
          const l = this.next();
          if (l.type !== "NAME" || !/^[A-E]+$/.test(l.v)) this.err("bad trace letters", l);
          this.expectSym("=");
          a.letters = l.v;
          a.n = this.signedNum();
          break;
        }
        case "TSTOP":
        case "TSTART": {
          const l = this.next();
          if (l.type !== "NAME" || !/^[A-E]+$/.test(l.v)) this.err("bad trace letters", l);
          a.letters = l.v;
          break;
        }
        case "PRINT":
          a.max = this.pCount();
          if (this.peek().type === "STR") a.str = this.next().v;
          else a.src = this.pField({});
          break;
        case "DUMP":
          a.max = this.pCount();
          if (this.isName() || this.isSym("/")) a.src = this.pField({});
          break;
        case "SAVESYS":
        case "RESTORSYS":
          m.warn(`*${kw.v} is listed in the manual as "not yet implemented"; ignored`);
          a.op = "NOOP";
          break;
        default:
          this.err(`unknown action *${kw.v}`, kw);
      }
      if (ctx && ctx.network && ["CALL", "END", "LOOK", "SAVE", "RETURN"].includes(a.op))
        this.err(`*${a.op} is not allowed in $NETWORK`, kw);
      return a;
    }

    // ========================= subrules (§24-§28)
    isSubruleStart() {
      const t = this.peek();
      if (t.type === "NUM" || t.type === "TIME") return true;
      if (t.type === "SYM" && ["+", "-", ":"].includes(t.v)) return true;
      if (t.type === "NAME" && /^[COID]+$/.test(t.v) && this.isSym(":", 1)) return true;
      return false;
    }
    pSubruleList(opts) {
      const list = [];
      this.svars = new Set();
      while (this.peek().type !== "CMD" && this.peek().type !== "EOF") {
        if (!this.isSubruleStart())
          this.err(`expected a subrule or a $ command, found '${this.peek().v}'`);
        list.push(this.pSubrule(opts));
      }
      this.svars = null;
      return list;
    }
    pSubrule(inherited) {
      const sr = { opts: inherited, tp: null, fp: null, actions: [], line: this.peek().line };
      if (this.isSym(":") || (this.isName() && this.isSym(":", 1))) {
        if (this.isName()) sr.opts = this.next().v;
        this.next();
        sr.numeric = true;
      } else {
        sr.tp = this.signedNum();
        this.expectSym(",");
        sr.fp = this.signedNum();
        if (this.acceptSym(",")) {
          const o = this.next();
          if (o.type !== "NAME" || !/^[COID]+$/.test(o.v)) this.err("bad subrule option field", o);
          sr.opts = o.v;
        }
        this.expectSym(":");
      }
      sr.expr = this.pExpr();
      if (this.acceptSym(":")) {
        const lists = [];
        this.svarsActive = true;
        do {
          let lo = null;
          if (
            this.inLook &&
            this.isName() &&
            /^(I|D|ID|DI)$/.test(this.peek().v) &&
            this.isSym(",", 1)
          ) {
            lo = this.next().v;
            this.next();
          }
          lists.push({ lo, actions: this.pActions({}) });
          this.expectSym(";");
        } while (
          this.inLook &&
          this.isName() &&
          /^(I|D|ID|DI)$/.test(this.peek().v) &&
          this.isSym(",", 1)
        );
        this.svarsActive = false;
        sr.actionLists = lists;
      } else {
        this.expectSym(";");
        sr.actionLists = [];
      }
      return sr;
    }

    // expression grammar (§25)
    pExpr() {
      return this.pOr();
    }
    pOr() {
      let a = this.pAnd();
      while (this.isName("OR")) {
        this.next();
        a = { k: "bin", op: "OR", a, b: this.pAnd() };
      }
      return a;
    }
    pAnd() {
      let a = this.pRel();
      while (this.isName("AND")) {
        this.next();
        a = { k: "bin", op: "AND", a, b: this.pRel() };
      }
      return a;
    }
    relOpHere() {
      const t = this.peek();
      if (t.type === "NAME" && REL_OPS[t.v] && t.v !== "EQL") return REL_OPS[t.v];
      if (t.type === "SYM" && REL_OPS[t.v]) return REL_OPS[t.v];
      if (t.type === "SYM" && t.v.length === 2 && t.v[0] === "=" && "+-".includes(t.v[1]))
        return "EQ";
      return null;
    }
    pRel() {
      let a = this.pAdd();
      let op;
      while ((op = this.relOpHere())) {
        const t = this.peek();
        if (t.type === "SYM" && t.v.length === 2 && t.v[0] === "=" && "+-".includes(t.v[1]))
          t.v = t.v[1];
        else this.next();
        a = { k: "bin", op, a, b: this.pAdd() };
      }
      return a;
    }
    pAdd() {
      let a = this.pMul();
      while (this.isSym("+") || this.isSym("-")) {
        const op = this.next().v;
        a = { k: "bin", op, a, b: this.pMul() };
      }
      return a;
    }
    pMul() {
      let a = this.pPow();
      for (;;) {
        if (this.isSym("*")) {
          this.next();
          a = { k: "bin", op: "*", a, b: this.pPow() };
        } else if (this.isSym("/") && !this.slashIsObject()) {
          this.next();
          a = { k: "bin", op: "/", a, b: this.pPow() };
        } else if (this.isName("MOD")) {
          this.next();
          a = { k: "bin", op: "MOD", a, b: this.pPow() };
        } else return a;
      }
    }
    slashIsObject() {
      // inside a relation expression, "/NAME" followed by ')' is the object field (§6.1)
      return (
        this.relCtx &&
        this.peek(1).type === "NAME" &&
        this.m.atoms.has(this.m.norm(this.peek(1).v)) &&
        this.m.classDefs.has(this.m.norm(this.peek(1).v))
      );
    }
    pPow() {
      let a = this.pUnary();
      while (this.isSym("**")) {
        this.next();
        a = { k: "bin", op: "**", a, b: this.pUnary() };
      }
      return a;
    }
    pUnary() {
      if (this.isSym("+")) {
        this.next();
        return this.pUnary();
      }
      if (this.isSym("-")) {
        this.next();
        return { k: "un", op: "NEG", a: this.pUnary() };
      }
      for (const op of ["ABS", "ENTIER", "FLOAT", "NOT"])
        if (this.isName(op)) {
          this.next();
          return { k: "un", op, a: this.pUnary() };
        }
      return this.relCtx ? this.pRelPrimary() : this.pPrimary();
    }
    looksLikeSentence() {
      // after '('
      let k = 1;
      if (
        this.peek(k).type === "NUM" &&
        this.peek(k).v === 1 &&
        (this.peek(k + 1).type === "NAME" || this.isSym("/", k + 1))
      )
        k++;
      const t = this.peek(k);
      if (t.type === "SYM" && t.v === "/") return true;
      return t.type === "NAME" && (!RESERVED.has(t.v) || t.v === "PICK");
    }
    pPrimary() {
      const t = this.peek();
      if (t.type === "NUM") {
        this.next();
        return { k: "num", v: t.v };
      }
      if (t.type === "TIME") {
        this.next();
        return { k: "num", v: this.m.parseTime(t) };
      }
      if (this.isSym("(")) {
        if (this.looksLikeSentence()) return { k: "sent", s: this.pSentence() };
        this.next();
        const e = this.pExpr();
        this.expectSym(")");
        return e;
      }
      if (t.type === "NAME") {
        const n = t.v;
        if (n === "CLOCK" || n === "TIMER" || n === "RANDOM") {
          this.next();
          return { k: "fn", name: n };
        }
        if (n === "NUM") {
          this.next();
          this.expectSym("(");
          const f = this.pField({});
          this.expectSym(")");
          return { k: "fn", name: n, f };
        }
        if (n === "NUMP") {
          this.next();
          this.expectSym("(");
          const f = this.pField({});
          this.expectSym(")");
          return { k: "fn", name: n, f };
        }
        if (SENT_FNS.has(n)) {
          this.next();
          return { k: "fn", name: n, s: this.pSentence(true) };
        }
        if (SEC_FNS.has(n)) {
          this.next();
          const s1 = this.pSentence(n === "SEC");
          const s2 = this.pSentence(true);
          return { k: "fn", name: n, s: s1, s2 };
        }
      }
      this.err(`expected a sentence, function or constant, found '${t.v}'`);
    }

    // sentence (§26):  ( [1] subj  relation-field-expression  [obj] )
    pSentence(simpleOnly) {
      this.expectSym("(");
      let h = 0;
      if (this.peek().type === "NUM" && this.peek().v === 1 && !this.isSym(")", 1)) {
        this.next();
        h = 1;
      }
      if (this.isName() && this.isSym(")", 1)) {
        const n = this.m.norm(this.peek().v);
        if (this.scope.some((s) => s.kind === "triple" && s.name === n)) {
          this.next();
          this.next();
          return { k: "tvar", h, name: n };
        }
      }
      const s = this.pField({ def: true });
      const save = this.relCtx;
      this.relCtx = true;
      const rx = this.pExpr();
      this.relCtx = save;
      let o = null;
      if (!this.isSym(")")) o = this.pField({ def: true });
      this.expectSym(")");
      if (rx.k === "rel") return { k: "simple", h, s, r: rx.f, o };
      if (rx.k === "cfn") {
        if (h) this.err("a class sentence takes no hypotheticality flag");
        return {
          k: rx.name === "EQL" || rx.name === "NEQ" ? "aclass" : "pclass",
          fn: rx.name,
          s,
          o,
        };
      }
      if (simpleOnly) this.err("this function takes only a simple sentence");
      return { k: "complex", h, s, rx, o };
    }
    pRelPrimary() {
      const t = this.peek();
      if (t.type === "NUM") {
        this.next();
        return { k: "num", v: t.v };
      }
      if (t.type === "TIME") {
        this.next();
        return { k: "num", v: this.m.parseTime(t) };
      }
      if (this.isSym("(")) {
        this.next();
        const e = this.pExpr();
        this.expectSym(")");
        return e;
      }
      if (t.type === "NAME") {
        const n = t.v;
        if (["EQL", "NEQ", "EQLP", "NEQP"].includes(n)) {
          this.next();
          return { k: "cfn", name: n };
        }
        if (n === "CLOCK" || n === "TIMER" || n === "RANDOM") {
          this.next();
          return { k: "fn", name: n };
        }
        if (n === "NUM" || n === "NUMP") {
          this.next();
          this.expectSym("(");
          const sv = this.relCtx;
          this.relCtx = false;
          const f = this.pField({});
          this.relCtx = sv;
          this.expectSym(")");
          return { k: "fn", name: n, f };
        }
        if (SENT_FNS.has(n)) {
          this.next();
          this.expectSym("(");
          const sv = this.relCtx;
          this.relCtx = false;
          const f = this.pField({});
          this.relCtx = sv;
          this.expectSym(")");
          return { k: "rfn", name: n, f };
        }
      }
      const sv = this.relCtx;
      this.relCtx = false;
      const f = this.pField({ def: true });
      this.relCtx = sv;
      return { k: "rel", f };
    }
  }

  // ---------------------------------------------------------------- runtime
  class Runtime {
    constructor(m) {
      this.m = m;
    }
    get S() {
      return this.m.state;
    }
    newEnv() {
      return { vars: new Map(), svars: null };
    }

    // ---- traces (§32.3.1)
    tr(letter, msg) {
      const t = this.S.trace[letter];
      if (this.m.suppress && !this.lookTrace) return;
      if (t && t.on && t.n > 0) {
        t.n--;
        this.m.log.push(`TRACE ${letter} @${this.m.fmtTime(this.S.now)}: ${msg}`);
      }
    }

    // ---- fields (§11.2)
    evalField(f, env) {
      const m = this.m;
      switch (f.k) {
        case "atom":
          if (f.fwd && !m.atoms.has(f.name)) return [];
          return [f.name];
        case "pick": {
          const arr = this.evalField(f.arg, env);
          if (!arr.length) return [];
          return [arr[Math.floor(m.rngP() * arr.length)]];
        }
        case "class": {
          if (!f.sub) return m.members(f.name).slice();
          const subs = this.evalField(f.sub, env);
          const outA = [];
          for (const s of subs) for (const x of m.members(f.name + "(" + s + ")")) outA.push(x);
          return m.sortAtoms(outA);
        }
        case "lvar": {
          if (!env.vars.has(f.name))
            throw new MessyError(`loop variable ${f.name} is not defined here`);
          return [env.vars.get(f.name)];
        }
        case "tvar":
          throw new MessyError(`triple variable ${f.name} used where an atom is required`);
        case "svar":
        case "svardef": {
          if (!env.svars || !env.svars.has(f.name))
            throw new MessyError(`subrule variable ${f.name} is not defined`);
          return env.svars.get(f.name).slice();
        }
      }
      throw new MessyError("bad field " + f.k);
    }
    destKeys(f, env) {
      // destination <general class reference>
      if (f.k !== "class") throw new MessyError("destination of a class action must be a class");
      if (!f.sub) return [f.name];
      return this.evalField(f.sub, env).map((s) => f.name + "(" + s + ")");
    }
    nodeList(f, env) {
      return this.evalField(f, env);
    }

    // ---- network (§12)
    key(s, r, o) {
      return s + " " + r + (o ? " " + o : "");
    }
    combos(trp, env) {
      if (trp.tvar) {
        const k = env.vars.get(trp.tvar);
        if (k == null) throw new MessyError(`triple variable ${trp.tvar} is not defined`);
        const rec = this.S.net.get(k);
        return [[rec.s, rec.r, rec.o]];
      }
      const S = this.evalField(trp.s, env),
        R = this.evalField(trp.r, env);
      const O = trp.o ? this.evalField(trp.o, env) : [null];
      const outA = [];
      for (const s of S) for (const r of R) for (const o of O) outA.push([s, r, o]);
      return outA;
    }
    checkTypes(s, r, o, secondary) {
      const m = this.m,
        A = m.atoms;
      const at = (n) => (A.get(n) || {}).type;
      if (!secondary && at(s) !== "N")
        throw new MessyError(`subject ${s} of a primary triple must be a node`);
      if (at(r) !== "R") throw new MessyError(`${r} is not a relation`);
      if (o && at(o) !== "N") throw new MessyError(`object ${o} must be a node`);
    }
    newRec(s, r, o) {
      return {
        s,
        r,
        o,
        key: this.key(s, r, o),
        asserted: false,
        ever: false,
        tA: null,
        tD: null,
        val: 0,
        rv: 0,
        h: 0,
        secs: new Map(),
      };
    }

    // assert primary; returns rec. print=true puts it on the change stack.
    assertPrimary(s, r, o, h, print) {
      this.checkTypes(s, r, o, false);
      const S = this.S;
      const k = this.key(s, r, o);
      let rec = S.net.get(k);
      if (!rec) {
        rec = this.newRec(s, r, o);
        S.net.set(k, rec);
      }
      if (!rec.asserted) rec.val = 0;
      rec.asserted = true;
      rec.ever = true;
      rec.tA = S.now;
      rec.rv = S.rv;
      rec.h = h;
      this.tr("B", `assert ${this.fmtRec(rec)}`);
      this.applyExclusions(rec);
      if (print) this.printTop(rec);
      return rec;
    }
    assertSecondary(prim, s, r, o, h) {
      this.checkTypes(s, r, o, true);
      const k = this.key(s, r, o);
      let sec = prim.secs.get(k);
      const isNew = !sec || !sec.asserted;
      if (!sec) {
        sec = this.newRec(s, r, o);
        prim.secs.set(k, sec);
      }
      if (!sec.asserted) sec.val = 0;
      sec.asserted = true;
      sec.ever = true;
      sec.tA = this.S.now;
      sec.rv = this.S.rv;
      sec.h = h;
      if (isNew) prim.tA = this.S.now; // §13.2: primary time updated when a secondary is added
      this.tr("B", `assert secondary ${this.fmtRec(sec)} of ${this.fmtRec(prim)}`);
      return sec;
    }
    negateRec(rec, print, prim) {
      if (!rec || !rec.asserted) return false;
      rec.asserted = false;
      rec.tD = this.S.now;
      if (!prim)
        for (const sec of rec.secs.values())
          if (sec.asserted) {
            sec.asserted = false;
            sec.tD = this.S.now;
          }
      this.tr("B", `negate ${this.fmtRec(rec)}`);
      if (print) this.emit(rec, true, prim ? 4 : 0, 0, 0);
      return true;
    }
    applyExclusions(rec) {
      // §7, §5.1 (transitive => object exclusion over all objects)
      const m = this.m,
        S = this.S,
        env = this.newEnv();
      const neg = (s, r, o) => {
        const x = S.net.get(this.key(s, r, o));
        if (x && x !== rec && x.asserted) this.negateRec(x, true);
      };
      const atom = m.atoms.get(rec.r);
      if (atom && atom.transitive && rec.o) {
        for (const x of S.net.values())
          if (x !== rec && x.asserted && x.s === rec.s && x.r === rec.r && x.o && x.o !== rec.o)
            this.negateRec(x, true);
      }
      for (const ex of m.exclusions) {
        if (ex.kind === "R") {
          const rels = new Set(ex.fields.flatMap((f) => this.evalField(f, env)));
          if (!rels.has(rec.r)) continue;
          for (const r2 of rels) if (r2 !== rec.r) neg(rec.s, r2, rec.o);
        } else if (ex.rel === rec.r) {
          const set = new Set(ex.fields.flatMap((f) => this.evalField(f, env)));
          if (ex.kind === "S" && set.has(rec.s)) {
            for (const s2 of set) if (s2 !== rec.s) neg(s2, rec.r, rec.o);
          }
          if (ex.kind === "O" && rec.o && set.has(rec.o)) {
            for (const o2 of set) if (o2 !== rec.o) neg(rec.s, rec.r, o2);
          }
        }
      }
    }

    // §26.1.1 rules for finding a triple
    visible(rec, h, copt) {
      return !!rec && rec.asserted && (copt || rec.tA !== this.S.now) && (h || rec.h === 0);
    }
    found(s, r, o, h, copt) {
      const S = this.S;
      const rec = S.net.get(this.key(s, r, o));
      if (this.visible(rec, h, copt)) return { ok: true, rec };
      const a = this.m.atoms.get(r);
      if (a && a.transitive && o) {
        // §5.1
        const seen = new Set([s]);
        const q = [s];
        while (q.length) {
          const x = q.shift();
          for (const t of S.net.values()) {
            if (t.s === x && t.r === r && t.o && this.visible(t, h, copt) && !seen.has(t.o)) {
              if (t.o === o) return { ok: true, rec: null };
              seen.add(t.o);
              q.push(t.o);
            }
          }
        }
      }
      return { ok: false, rec: rec || null };
    }

    // ---- change stack (§12.2, §13.2, §31)
    fmtRec(r) {
      return "(" + [r.s, r.r, r.o].filter(Boolean).join(" ") + ")";
    }
    emit(rec, neg, src, lex, par) {
      if (this.m.suppress) return 0;
      const S = this.S;
      if (!this.m.curBlock || this.m.curBlock.time !== S.now) {
        this.m.curBlock = { time: S.now, entries: [] };
        this.m.out.push(this.m.curBlock);
      }
      const seq = ++S.seq;
      this.m.curBlock.entries.push({
        seq,
        src,
        lex,
        par,
        neg,
        s: rec.s,
        r: rec.r,
        o: rec.o,
        val: rec.val,
        rv: rec.rv,
        h: rec.h,
        tA: rec.tA,
      });
      return seq;
    }
    printTop(rec, secs) {
      const seq = this.emit(rec, false, 0, 0, 0);
      if (!seq) return;
      this.expandNodes(rec, seq, 1, new Set());
      for (const sec of secs || []) {
        const sq = this.emit(sec, false, 4, 0, seq);
        this.expandNodes(sec, sq, 1, new Set());
      }
    }
    expandNodes(rec, parSeq, lexLvl, visiting) {
      const S = this.S;
      for (const [src, node] of [
        [1, rec.s],
        [3, rec.o],
      ]) {
        if (!node) continue;
        const list = S.pred.get(node);
        if (!list || !list.length) continue;
        if (visiting.has(node)) {
          this.m.warn(`predicate node ${node} already being expanded; skipped`);
          continue;
        }
        visiting.add(node);
        for (const k of list) {
          const t = S.net.get(k);
          const sq = this.emit(t, !t.asserted, src, lexLvl, parSeq);
          const secs = [...t.secs.values()].filter((x) => x.asserted && x.tA === t.tA).reverse();
          for (const sec of secs) this.emit(sec, false, 5, lexLvl, sq);
          this.expandNodes(t, sq, lexLvl + 1, visiting);
        }
        visiting.delete(node);
      }
    }

    // ---- values (§12.4)
    valueOf(v, env, copt) {
      if (v.num != null) return v.num;
      let sum = 0;
      for (const [s, r, o] of this.combos(v.trp, env)) {
        const f = this.found(s, r, o, v.trp.h, copt);
        if (f.ok && f.rec) sum += f.rec.val;
      }
      return sum;
    }
    applyOp(op, x, y) {
      switch (op) {
        case "=":
          return y;
        case "=+":
          return x + y;
        case "=-":
          return x - y;
        case "=*":
          return x * y;
        case "=/":
          if (y === 0) {
            this.m.warn("division by zero in *SET; result 0");
            return 0;
          }
          return x / y;
      }
    }

    // ---- predicate lists (§13)
    predSource(src, env) {
      const S = this.S;
      if (src.trp) {
        const keys = [];
        for (const [s, r, o] of this.combos(src.trp, env)) {
          const k = this.key(s, r, o);
          if (!S.net.has(k) || !S.net.get(k).ever) {
            this.m.suppress++;
            try {
              this.assertPrimary(s, r, o, 1, false);
            } finally {
              this.m.suppress--;
            }
          }
          keys.push(k);
        }
        return keys;
      }
      const keys = [];
      for (const n of this.evalField(src.nodes, env))
        for (const k of S.pred.get(n) || []) keys.push(k);
      return keys;
    }
  }

  // Real *SET and the rest (kept in a second method for readability)
  Runtime.prototype.execAction = function (a, env, opts) {
    const m = this.m,
      S = this.S;
    const copt = (opts || "").includes("C");
    const groupsOf = (f) => this.evalField(f, env).filter((n) => m.groups.has(n));
    switch (a.op) {
      case "ASSERT":
        for (const [s, r, o] of this.combos(a.trp, env)) this.assertPrimary(s, r, o, a.trp.h, true);
        return null;
      case "NEG":
        for (const [s, r, o] of this.combos(a.trp, env))
          this.negateRec(S.net.get(this.key(s, r, o)), true);
        return null;
      case "SET": {
        // §12.4
        const y = this.valueOf(a.value, env, copt);
        for (const [s, r, o] of this.combos(a.trp, env)) {
          let rec = S.net.get(this.key(s, r, o));
          if (!rec || !rec.asserted) {
            m.suppress++;
            try {
              rec = this.assertPrimary(s, r, o, a.trp.h, false);
            } finally {
              m.suppress--;
            }
          }
          rec.val = this.applyOp(a.assign, rec.val, y);
          this.tr("B", `set ${this.fmtRec(rec)} = ${rec.val}`);
          this.printTop(rec);
        }
        return null;
      }
      case "SETRV": {
        // §19.1
        const y = this.valueOf(a.value, env, copt);
        let v = Math.trunc(this.applyOp(a.assign, S.rv, y));
        S.rv = Math.max(0, Math.min(4095, v));
        return null;
      }
      case "SEC": {
        // §12.5.1
        const prims = this.combos(a.trp, env);
        for (const [s, r, o] of prims) {
          const prim = this.assertPrimary(s, r, o, a.trp.h, false);
          const secs = [];
          for (const st of a.secs)
            for (const [s2, r2, o2] of this.combos(st, env))
              secs.push(this.assertSecondary(prim, s2, r2, o2, st.h));
          this.printTop(prim, secs);
        }
        return null;
      }
      case "NEGSEC": {
        // §12.5.2
        for (const [s, r, o] of this.combos(a.trp, env)) {
          const prim = S.net.get(this.key(s, r, o));
          if (!prim || !prim.asserted) continue;
          const hit = [];
          for (const st of a.secs)
            for (const [s2, r2, o2] of this.combos(st, env)) {
              const sec = prim.secs.get(this.key(s2, r2, o2));
              if (sec && sec.asserted) {
                sec.asserted = false;
                sec.tD = S.now;
                hit.push(sec);
              }
            }
          if (hit.length) {
            const sq = this.emit(prim, true, 0, 0, 0);
            for (const sec of hit) this.emit(sec, true, 4, 0, sq);
          }
        }
        return null;
      }
      case "SETSEC": {
        // §12.5.3
        const y = this.valueOf(a.value, env, copt);
        for (const [s, r, o] of this.combos(a.trp, env)) {
          let prim = S.net.get(this.key(s, r, o));
          if (!prim || !prim.asserted) {
            m.suppress++;
            try {
              prim = this.assertPrimary(s, r, o, a.trp.h, false);
            } finally {
              m.suppress--;
            }
          }
          const changed = [];
          for (const [s2, r2, o2] of this.combos(a.sec, env)) {
            let sec = prim.secs.get(this.key(s2, r2, o2));
            if (!sec || !sec.asserted) sec = this.assertSecondary(prim, s2, r2, o2, a.sec.h);
            sec.val = this.applyOp(a.assign, sec.val, y);
            changed.push(sec);
          }
          this.printTop(prim, changed);
        }
        return null;
      }
      case "ADDP":
      case "MOVEP":
      case "PUSHP": {
        // §13.3
        const keys = this.predSource(a.src, env);
        for (const n of this.evalField(a.dst, env)) {
          let list = a.op === "MOVEP" ? [] : (S.pred.get(n) || []).slice();
          if (a.op === "PUSHP") for (const k of keys) list.unshift(k);
          else list = list.concat(keys);
          S.pred.set(n, list);
        }
        return null;
      }
      case "REMOVEP": {
        const keys = new Set(this.predSource(a.src, env));
        for (const n of this.evalField(a.dst, env))
          if (S.pred.has(n))
            S.pred.set(
              n,
              S.pred.get(n).filter((k) => !keys.has(k)),
            );
        return null;
      }
      case "ERASEP":
        for (const n of this.evalField(a.dst, env)) S.pred.set(n, []);
        return null;
      case "POPP": {
        const popped = [];
        for (const n of this.evalField(a.src, env)) {
          const l = S.pred.get(n);
          if (l && l.length) {
            popped.push(l[0]);
            S.pred.set(n, l.slice(1));
          }
        }
        for (const n of this.evalField(a.dst, env)) S.pred.set(n, popped.slice());
        return null;
      }
      case "LOCATE": {
        // §13.5
        const nodes = new Set(this.evalField(a.src, env));
        const keys = [];
        for (const t of S.net.values())
          if (nodes.has(t.s) || (t.o && nodes.has(t.o))) keys.push(t.key);
        for (const n of this.evalField(a.dst, env))
          S.pred.set(n, (S.pred.get(n) || []).concat(keys));
        return null;
      }
      case "MOVEPAR": {
        // §13.6
        const keys = new Set(this.predSource(a.src, env));
        const hits = [];
        for (const [n, l] of S.pred) if (l.some((k) => keys.has(k))) hits.push(n);
        for (const dk of this.destKeys(a.dst, env)) m.setMembers(dk, m.members(dk).concat(hits));
        return null;
      }
      case "EXPAND": {
        // §13.7
        const keys = this.predSource(a.src, env);
        const parts = [[], [], []];
        for (const k of keys) {
          const t = S.net.get(k);
          parts[0].push(t.s);
          parts[1].push(t.r);
          if (t.o) parts[2].push(t.o);
        }
        a.dsts.forEach((d, i) => {
          for (const dk of this.destKeys(d, env)) m.setMembers(dk, m.members(dk).concat(parts[i]));
        });
        return null;
      }
      case "ADD":
      case "MOVE": {
        // §14.1
        const src = this.evalField(a.src, env);
        for (const dk of this.destKeys(a.dst, env)) {
          const ct = m.classDefs.get(a.dst.name).type;
          for (const x of src)
            if (m.atoms.get(x).type !== ct)
              throw new MessyError(`cannot put ${x} into class ${a.dst.name} (wrong atom type)`);
          m.setMembers(dk, (a.op === "MOVE" ? [] : m.members(dk)).concat(src));
          this.tr("B", `${a.op} ${src.join(" ")} -> ${dk} = ${m.members(dk).join(" ")}`);
        }
        return null;
      }
      case "REMOVE": {
        const src = new Set(this.evalField(a.src, env));
        for (const dk of this.destKeys(a.dst, env))
          m.setMembers(
            dk,
            m.members(dk).filter((x) => !src.has(x)),
          );
        return null;
      }
      case "ERASE":
        for (const dk of this.destKeys(a.dst, env)) m.setMembers(dk, []);
        return null;
      case "LEXTRP": {
        // §15.1.1
        const lists = a.items.map((f) => (f ? this.evalField(f, env) : [null]));
        const trps = [[]];
        for (const l of lists) {
          const next = [];
          for (const t of trps) for (const x of l) next.push(t.concat([x]));
          trps.splice(0, trps.length, ...next);
        }
        for (const d of this.evalField(a.dst, env)) {
          const at = m.atoms.get(d);
          if (at && at.numLex) throw new MessyError(`*LEXTRP: ${d} has a numeric lexical list`);
          S.lex.set(d, (S.lex.get(d) || []).concat(trps.map((t) => ({ trp: t }))));
        }
        return null;
      }
      case "LEXADD": {
        // §15.1.2
        const src = this.evalField(a.src, env);
        for (const d of this.evalField(a.dst, env))
          for (const s of src) {
            if (s === d) continue;
            const add = (S.lex.get(s) || []).filter((x) => x.trp);
            S.lex.set(d, (S.lex.get(d) || []).concat(add));
          }
        return null;
      }
      case "ENABLE":
        if (m.compiling) {
          // $NETWORK may enable a group compiled later (§8.2d, §16.1)
          for (const g of a.src.k === "atom" ? [a.src.name] : this.evalField(a.src, env))
            (m.pendingEnables = m.pendingEnables || []).push({ g, t: S.now + (a.dt || 0) });
          return null;
        }
        for (const g of groupsOf(a.src)) this.enable(g, a.dt);
        return null;
      case "DISABLE":
        for (const g of groupsOf(a.src)) this.disable(g);
        return null;
      case "CALL": {
        for (const g of groupsOf(a.src)) {
          this.tr("A", `call ${g}`);
          this.execGroup(g, true);
        }
        return null;
      }
      case "RETURN":
        return "RETURN";
      case "END":
        S.ended = true;
        S.endTime = Math.min(S.endTime, S.now);
        return null;
      case "JUMBLE":
        if (a.which.includes("P")) m.rngP.seed(a.n * 2 + 1);
        if (a.which.includes("S")) m.rngS.seed(a.n * 3 + 7);
        return null;
      case "LOOK":
      case "SAVE":
      case "NOOP":
        return null;
      case "TSET":
        for (const L of a.letters) S.trace[L] = { n: Math.abs(a.n), on: a.n > 0 };
        return null;
      case "TSTOP":
        for (const L of a.letters) S.trace[L].on = false;
        return null;
      case "TSTART":
        for (const L of a.letters) if (S.trace[L].n > 0) S.trace[L].on = true;
        return null;
      case "PRINT": {
        if (m.suppress) return null;
        const used = S.prints.get(a) || 0;
        if (used >= a.max) return null;
        S.prints.set(a, used + 1);
        m.log.push(
          `PRINT @${m.fmtTime(S.now)}: ` +
            (a.str != null ? a.str : this.evalField(a.src, env).join(" ")),
        );
        return null;
      }
      case "DUMP": {
        if (m.suppress) return null;
        const used = S.prints.get(a) || 0;
        if (used >= a.max) return null;
        S.prints.set(a, used + 1);
        const nodes = a.src ? new Set(this.evalField(a.src, env)) : null;
        const lines = [];
        for (const t of S.net.values())
          if (!nodes || nodes.has(t.s))
            lines.push(
              `  ${t.asserted ? "" : "NOT "}${this.fmtRec(t)} VAL=${t.val} RV=${t.rv} H=${t.h} T=${m.fmtTime(t.tA)}`,
            );
        m.log.push(`DUMP @${m.fmtTime(S.now)}:\n` + lines.join("\n"));
        return null;
      }
    }
    throw new MessyError("unknown action " + a.op);
  };

  // ---- subrule expressions (§25-§28)
  Object.assign(Runtime.prototype, {
    hasVars(e) {
      if (!e) return false;
      if (e.k === "sent") return this.sentHasVars(e.s);
      if (e.k === "bin") return this.hasVars(e.a) || this.hasVars(e.b);
      if (e.k === "un") return this.hasVars(e.a);
      if (e.k === "fn" && (e.name === "SEC" || e.name === "EVER" || e.name === "EVERSEC"))
        return this.sentHasVars(e.s);
      return false;
    },
    sentHasVars(s) {
      const fv = (f) => f && (f.k === "svar" || f.k === "svardef");
      return fv(s.s) || fv(s.r) || fv(s.o);
    },
    evalExpr(e, env, ctx) {
      const m = this.m;
      switch (e.k) {
        case "num":
          return e.v;
        case "sent":
          return this.evalSentence(e.s, env, ctx, true);
        case "un": {
          const v = this.evalExpr(e.a, env, ctx);
          switch (e.op) {
            case "NEG":
              return -this.num(v);
            case "ABS":
              return Math.abs(this.num(v));
            case "ENTIER":
              return Math.trunc(this.num(v));
            case "FLOAT":
              return this.bool(v) ? 1 : 0;
            case "NOT":
              return !this.bool(v);
          }
          break;
        }
        case "bin": {
          if (e.op === "AND" || e.op === "OR") {
            const exhaustive = !ctx.oopt && this.hasVars(e.b);
            const a = this.bool(this.evalExpr(e.a, env, ctx));
            if (!exhaustive) {
              if (e.op === "AND" && !a) return false;
              if (e.op === "OR" && a) return true;
            }
            const b = this.bool(this.evalExpr(e.b, env, ctx));
            return e.op === "AND" ? a && b : a || b;
          }
          const a = this.num(this.evalExpr(e.a, env, ctx)),
            b = this.num(this.evalExpr(e.b, env, ctx));
          switch (e.op) {
            case "+":
              return a + b;
            case "-":
              return a - b;
            case "*":
              return a * b;
            case "/":
              if (b === 0) {
                m.warn("division by zero; result 0");
                return 0;
              }
              return a / b;
            case "**":
              if ((a < 0 && !Number.isInteger(b)) || (a === 0 && b === 0)) {
                m.warn("illegal exponentiation; result 0");
                return 0;
              }
              return Math.pow(a, b);
            case "MOD":
              if (b === 0) {
                m.warn("MOD by zero; result 0");
                return 0;
              }
              return a % b;
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
          break;
        }
        case "fn":
          return this.evalFn(e, env, ctx);
      }
      throw new MessyError("bad expression");
    },
    num(v) {
      if (typeof v !== "number")
        throw new MessyError("a numeric operand was required but a logical value was found");
      return v;
    },
    bool(v) {
      if (typeof v !== "boolean")
        throw new MessyError("a logical operand was required but a numeric value was found");
      return v;
    },

    // define subrule variables appearing in a sentence; return expanded field lists
    sentFields(sent, env, ctx) {
      const out = {};
      for (const pos of ["s", "r", "o"]) {
        const f = sent[pos];
        if (!f) {
          out[pos] = [null];
          continue;
        }
        if (f.k === "svardef") {
          if (!env.svars) throw new MessyError("subrule variables can be defined only in subrules");
          env.svars.set(f.name, this.evalField(f.arg, env));
        }
        out[pos] = this.evalField(f, env);
      }
      return out;
    },
    updateVars(sent, env, hits, result) {
      for (const pos of ["s", "r", "o"]) {
        const f = sent[pos];
        if (!f || (f.k !== "svar" && f.k !== "svardef")) continue;
        if (!result) {
          env.svars.set(f.name, []);
          continue;
        }
        const keep = hits[pos];
        env.svars.set(
          f.name,
          env.svars.get(f.name).filter((x) => keep.has(x)),
        );
      }
    },

    evalSentence(sent, env, ctx, update) {
      const copt = ctx.copt;
      if (sent.k === "tvar") {
        const rec = this.S.net.get(env.vars.get(sent.name));
        return this.visible(rec, sent.h, copt);
      }
      const F = this.sentFields(sent, env, ctx);
      const vars = update && this.sentHasVars(sent);
      const hits = { s: new Set(), r: new Set(), o: new Set() };
      const mark = (s, r, o) => {
        hits.s.add(s);
        hits.r.add(r);
        hits.o.add(o);
      };
      let res;
      if (sent.k === "simple") {
        res = false;
        outer: for (const s of F.s)
          for (const r of F.r)
            for (const o of F.o) {
              const f = this.found(s, r, o, sent.h, copt);
              this.tr(
                "E",
                `look up (${[s, r, o].filter(Boolean).join(" ")}) -> ${f.ok ? "found" : "not found"}`,
              );
              if (f.ok) {
                res = true;
                mark(s, r, o);
                if (!vars) break outer;
              }
            }
      } else if (sent.k === "complex") {
        let numeric = null,
          sum = 0;
        res = false;
        outer2: for (const s of F.s)
          for (const o of F.o) {
            const v = this.evalRel(sent.rx, s, o, sent.h, env, ctx);
            if (typeof v === "number") {
              numeric = true;
              sum += v;
              continue;
            }
            if (v) {
              res = true;
              hits.s.add(s);
              hits.o.add(o);
              if (!vars) break outer2;
            }
          }
        if (numeric) return sum;
      } else if (sent.k === "aclass") {
        const A = F.s,
          B = F.o;
        if (sent.fn === "EQL") {
          const bs = new Set(B);
          const inter = A.filter((x) => bs.has(x));
          res = inter.length > 0;
          inter.forEach((x) => {
            hits.s.add(x);
            hits.o.add(x);
          });
        } else {
          res = !(A.length === 1 && B.length === 1 && A[0] === B[0]);
          for (const x of A) if (B.some((y) => y !== x)) hits.s.add(x);
          for (const y of B) if (A.some((x) => x !== y)) hits.o.add(y);
          if (A.length > 1 || B.length > 1) res = true;
        }
      } else if (sent.k === "pclass") {
        const lists = (f) => (f.k === "tvar" ? [[env.vars.get(f.name)]] : null);
        const P = (n) => this.S.pred.get(n) || [];
        const Ls =
          sent.s.k === "tvar"
            ? [{ n: null, l: [env.vars.get(sent.s.name)] }]
            : F.s.map((n) => ({ n, l: P(n) }));
        const Lo =
          sent.o.k === "tvar"
            ? [{ n: null, l: [env.vars.get(sent.o.name)] }]
            : F.o.map((n) => ({ n, l: P(n) }));
        res = false;
        for (const a of Ls)
          for (const b of Lo) {
            const bs = new Set(b.l);
            const inter = a.l.some((k) => bs.has(k));
            const ok = sent.fn === "EQLP" ? inter : !inter;
            if (ok) {
              res = true;
              if (a.n) hits.s.add(a.n);
              if (b.n) hits.o.add(b.n);
            }
          }
        void lists;
      }
      if (vars) this.updateVars(sent, env, hits, res);
      return res;
    },

    // relation-field expression for one subject/object pair (§26.2)
    evalRel(e, s, o, h, env, ctx) {
      const copt = ctx.copt;
      switch (e.k) {
        case "num":
          return e.v;
        case "rel": {
          const rs = this.evalField(e.f, env);
          if (rs.length !== 1)
            throw new MessyError(
              "the relation field of a complex sentence must be a single relation",
            );
          return this.found(s, rs[0], o, h, copt).ok;
        }
        case "cfn": {
          if (e.name === "EQL") return s === o;
          if (e.name === "NEQ") return s !== o;
          const a = new Set(this.S.pred.get(s) || []);
          const inter = (this.S.pred.get(o) || []).some((k) => a.has(k));
          return e.name === "EQLP" ? inter : !inter;
        }
        case "rfn": {
          const r = this.evalField(e.f, env)[0];
          const f = this.found(s, r, o, h, copt);
          const rec = this.S.net.get(this.key(s, r, o));
          switch (e.name) {
            case "VAL":
              return f.ok && f.rec ? f.rec.val : 0;
            case "DUR":
              return f.ok && f.rec ? this.S.now - f.rec.tA : 0;
            case "RVAL":
              return f.ok && f.rec ? f.rec.rv : 0;
            case "DEL":
              return rec && !rec.asserted && rec.tD != null ? this.S.now - rec.tD : 0;
            case "EVER":
              return !!(rec && rec.ever && (h || rec.h === 0));
          }
          break;
        }
        case "fn":
          return this.evalFn(e, env, ctx);
        case "un": {
          const v = this.evalRel(e.a, s, o, h, env, ctx);
          switch (e.op) {
            case "NEG":
              return -this.num(v);
            case "ABS":
              return Math.abs(this.num(v));
            case "ENTIER":
              return Math.trunc(this.num(v));
            case "FLOAT":
              return this.bool(v) ? 1 : 0;
            case "NOT":
              return !this.bool(v);
          }
          break;
        }
        case "bin": {
          if (e.op === "AND" || e.op === "OR") {
            const a = this.bool(this.evalRel(e.a, s, o, h, env, ctx));
            if (e.op === "AND" && !a) return false;
            if (e.op === "OR" && a) return true;
            return this.bool(this.evalRel(e.b, s, o, h, env, ctx));
          }
          const sub = {
            k: "bin",
            op: e.op,
            a: { k: "num", v: this.num(this.evalRel(e.a, s, o, h, env, ctx)) },
            b: { k: "num", v: this.num(this.evalRel(e.b, s, o, h, env, ctx)) },
          };
          return this.evalExpr(sub, env, ctx);
        }
      }
      throw new MessyError("bad relation expression");
    },

    evalFn(e, env, ctx) {
      const S = this.S,
        m = this.m,
        copt = ctx.copt;
      switch (e.name) {
        case "TIMER":
          return S.now;
        case "CLOCK":
          return ((S.now % m.time.day) + m.time.day) % m.time.day;
        case "RANDOM":
          return m.rngS();
        case "NUM":
          return this.evalField(e.f, env).length;
        case "NUMP":
          return this.evalField(e.f, env).reduce((n, x) => n + (S.pred.get(x) || []).length, 0);
      }
      // sentence functions: iterate specified primaries
      const prims = (sent, update) => {
        if (sent.k === "tvar") {
          const rec = S.net.get(env.vars.get(sent.name));
          return [{ s: rec.s, r: rec.r, o: rec.o, h: sent.h }];
        }
        const F = this.sentFields(sent, env, ctx);
        const outA = [];
        for (const s of F.s)
          for (const r of F.r) for (const o of F.o) outA.push({ s, r, o, h: sent.h });
        void update;
        return outA;
      };
      if (SENT_FNS.has(e.name)) {
        const isEver = e.name === "EVER";
        const vars = isEver && this.sentHasVars(e.s);
        const hits = { s: new Set(), r: new Set(), o: new Set() };
        let sum = 0,
          any = false;
        for (const p of prims(e.s)) {
          const rec = S.net.get(this.key(p.s, p.r, p.o));
          const f = this.found(p.s, p.r, p.o, p.h, copt);
          switch (e.name) {
            case "VAL":
              if (f.ok && f.rec) sum += f.rec.val;
              break;
            case "DUR":
              if (f.ok && f.rec) sum += S.now - f.rec.tA;
              break;
            case "RVAL":
              if (f.ok && f.rec) sum += f.rec.rv;
              break;
            case "DEL":
              if (rec && !rec.asserted && rec.tD != null) sum += S.now - rec.tD;
              break;
            case "EVER":
              if (rec && rec.ever && (p.h || rec.h === 0)) {
                any = true;
                hits.s.add(p.s);
                hits.r.add(p.r);
                hits.o.add(p.o);
              }
              break;
          }
        }
        if (isEver) {
          if (vars) this.updateVars(e.s, env, hits, any);
          return any;
        }
        return sum;
      }
      if (SEC_FNS.has(e.name)) {
        // §27.4-27.9 secondaries
        const isLogical = e.name === "SEC" || e.name === "EVERSEC";
        const vars = isLogical && this.sentHasVars(e.s);
        const hits = { s: new Set(), r: new Set(), o: new Set() };
        const secSpecs = prims(e.s2);
        let sum = 0,
          any = false;
        const lookSecs = (prim, relFilter) => {
          let ok = false;
          for (const q of secSpecs) {
            if (relFilter && q.s !== undefined) {
              /* secondary subject may be a relation */
            }
            const sec = prim.secs.get(this.key(q.s, q.r, q.o));
            if (!sec) continue;
            const vis = sec.asserted && (copt || sec.tA !== S.now) && (q.h || sec.h === 0);
            switch (e.name) {
              case "SEC":
                if (vis) ok = true;
                break;
              case "EVERSEC":
                if (sec.ever && (q.h || sec.h === 0)) ok = true;
                break;
              case "VALSEC":
                if (vis) sum += sec.val;
                break;
              case "DURSEC":
                if (vis) sum += S.now - sec.tA;
                break;
              case "RVALSEC":
                if (vis) sum += sec.rv;
                break;
              case "DELSEC":
                if (!sec.asserted && sec.tD != null) sum += S.now - sec.tD;
                break;
            }
          }
          return ok;
        };
        if (e.s.k === "complex") {
          // SEC with complex primary sentence (§27.4)
          const F = this.sentFields(e.s, env, ctx);
          for (const s of F.s)
            for (const o of F.o) {
              const v = this.evalRelSec(e.s.rx, s, o, e.s.h, env, ctx, lookSecs);
              if (v) {
                any = true;
                hits.s.add(s);
                hits.o.add(o);
              }
            }
        } else {
          for (const p of prims(e.s)) {
            const f = this.found(p.s, p.r, p.o, p.h, copt);
            const prim = S.net.get(this.key(p.s, p.r, p.o));
            if (e.name === "EVERSEC" ? !(prim && prim.ever) : !(f.ok && f.rec)) continue;
            if (lookSecs(prim)) {
              any = true;
              hits.s.add(p.s);
              hits.r.add(p.r);
              hits.o.add(p.o);
            }
          }
        }
        if (isLogical) {
          if (vars) this.updateVars(e.s, env, hits, any);
          return any;
        }
        return sum;
      }
      throw new MessyError("unknown function " + e.name);
    },
    evalRelSec(e, s, o, h, env, ctx, lookSecs) {
      if (e.k === "rel") {
        const r = this.evalField(e.f, env)[0];
        const f = this.found(s, r, o, h, ctx.copt);
        return !!(f.ok && f.rec && lookSecs(f.rec));
      }
      if (e.k === "bin" && (e.op === "AND" || e.op === "OR")) {
        const a = this.evalRelSec(e.a, s, o, h, env, ctx, lookSecs);
        if (e.op === "AND" && !a) return false;
        if (e.op === "OR" && a) return true;
        return this.evalRelSec(e.b, s, o, h, env, ctx, lookSecs);
      }
      if (e.k === "un" && e.op === "NOT") return !this.evalRelSec(e.a, s, o, h, env, ctx, lookSecs);
      return this.evalRel(e, s, o, h, env, ctx);
    },

    // §24.1 subrule list -> truth; runs subrule actions
    evalSubrules(stmt, env, look) {
      const m = this.m;
      if (!stmt.subrules.length) return true;
      env.svars = new Map();
      let cum = 0;
      const delayed = [];
      for (const sr of stmt.subrules) {
        const ctx = { copt: sr.opts.includes("C"), oopt: sr.opts.includes("O") };
        const v = this.evalExpr(sr.expr, env, ctx);
        let add;
        if (sr.numeric) {
          add = this.num(v);
        } else {
          if (typeof v !== "boolean")
            throw new MessyError(`line ${sr.line}: a logical subrule returned a number`);
          add = v ? sr.tp : sr.fp;
        }
        this.tr("D", `subrule line ${sr.line} value ${v} -> ${add}`);
        cum += add;
        for (const L of sr.actionLists) {
          const lo = L.lo || (/[ID]/.test(sr.opts) ? sr.opts.replace(/[^ID]/g, "") : "D");
          if (look && lo.includes("D"))
            delayed.push({ actions: L.actions, env: this.snapEnv(env), opts: sr.opts });
          if (!look || lo.includes("I"))
            for (const a of L.actions) this.execAction(a, env, sr.opts);
        }
        if (cum >= 10 || cum <= -10) break;
      }
      let truth;
      if (cum >= 10) truth = true;
      else if (cum <= -10) truth = false;
      else {
        const r = m.rngS();
        truth = r <= cum;
        this.tr("C", `cumulative ${cum.toFixed(4)} random ${r.toFixed(4)} -> ${truth}`);
      }
      env.svars = null;
      if (look) return { truth, delayed };
      return truth;
    },
    snapEnv(env) {
      return {
        vars: new Map(env.vars),
        svars: env.svars ? new Map([...env.svars].map(([k, v]) => [k, v.slice()])) : null,
      };
    },
  });

  // ---- scheduling & execution (§9, §16, §17, §23, §29)
  Object.assign(Runtime.prototype, {
    schedule(g, t) {
      const S = this.S,
        G = this.m.groups.get(g);
      if (G.sync && G.interval > 0) t = Math.ceil(t / G.interval) * G.interval;
      const ex = S.queue.find((q) => q.g === g);
      if (ex) {
        if (t < ex.t) {
          ex.t = t;
          ex.ord = ++S.qord;
        }
        return;
      }
      S.queue.push({ g, t, ord: ++S.qord });
      this.tr("A", `group ${g} scheduled for ${this.m.fmtTime(t)}`);
    },
    enable(g, dt) {
      this.S.enabled.add(g);
      this.schedule(g, this.S.now + (dt || 0));
    },
    disable(g) {
      const S = this.S;
      S.enabled.delete(g);
      S.queue = S.queue.filter((q) => q.g !== g);
      this.tr("A", `group ${g} disabled`);
    },
    popNext() {
      const q = this.S.queue;
      if (!q.length) return null;
      let best = 0;
      for (let i = 1; i < q.length; i++)
        if (q[i].t < q[best].t || (q[i].t === q[best].t && q[i].ord < q[best].ord)) best = i;
      return q[best];
    },
    runScheduler(look) {
      const m = this.m;
      let stepsAtTime = 0,
        lastT = null;
      for (;;) {
        const S = this.S; // re-read: a look-ahead may have swapped the state object
        const nx = this.popNext();
        if (!nx) return "no more active groups";
        const limit = look ? look.until : S.endTime;
        if (nx.t > limit)
          return look
            ? "look-ahead time reached"
            : S.ended
              ? "*END executed"
              : "time limit reached";
        if (S.ended && nx.t > S.now) return "*END executed";
        S.queue.splice(S.queue.indexOf(nx), 1);
        if (nx.t !== S.now) {
          S.now = nx.t;
          this.tr("A", "new time cycle");
        }
        if (nx.t !== lastT) {
          lastT = nx.t;
          stepsAtTime = 0;
        }
        if (++stepsAtTime > m.opts.maxStepsPerTick)
          throw new MessyError(
            `more than ${m.opts.maxStepsPerTick} group executions at time ${m.fmtTime(S.now)} (a group with interval 0 that never disables itself?)`,
          );
        const G = m.groups.get(nx.g);
        if (!(look && G.hasLook)) this.execGroup(nx.g, false);
        if (this.S.enabled.has(nx.g)) this.schedule(nx.g, this.S.now + G.interval);
      }
    },
    execGroup(gname, asSub) {
      const m = this.m,
        G = m.groups.get(gname);
      this.tr("A", `enter group ${gname}${asSub ? " (subroutine)" : ""}`);
      const env = this.newEnv();
      const frames = []; // {li, items, i}
      let pc = 0;
      const st = G.stmts;
      const jump = (idx) => {
        // leave loops whose range does not contain idx; jumping to a $LOOP restarts it
        while (frames.length) {
          const f = frames[frames.length - 1],
            L = st[f.li];
          const inside = idx > f.li && idx <= L.end;
          if (inside) break;
          env.vars.delete(L.var);
          frames.pop();
        }
        pc = idx;
      };
      while (pc < st.length) {
        const s = st[pc];
        if (s.type === "LOOP") {
          const items =
            s.kind === "atom"
              ? this.evalField(s.src, env)
              : this.evalField(s.src, env).flatMap((n) => this.S.pred.get(n) || []);
          this.tr(
            "A",
            `loop ${s.var} over [${s.kind === "atom" ? items.join(" ") : items.length + " triples"}]`,
          );
          if (!items.length) {
            pc = s.end + 1;
            continue;
          }
          frames.push({ li: pc, items, i: 0 });
          env.vars.set(s.var, items[0]);
          pc++;
          continue;
        }
        if (s.type === "ENDLOOP") {
          const f = frames[frames.length - 1];
          if (!f || f.li !== s.loop)
            throw new MessyError(`line ${s.line}: $ENDLOOP reached outside its loop`);
          f.i++;
          if (f.i < f.items.length) {
            env.vars.set(st[f.li].var, f.items[f.i]);
            pc = f.li + 1;
          } else {
            env.vars.delete(st[f.li].var);
            frames.pop();
            pc++;
          }
          continue;
        }
        // RULE / SWITCH
        this.tr("A", `${s.type.toLowerCase()} ${s.label || ""} line ${s.line}`);
        let truth;
        if (s.look) {
          const r = this.execLook(s, env, G);
          if (r === "RETURN") return asSub ? "RETURN" : "END";
          truth = r;
        } else {
          truth = this.evalSubrules(s, env, false);
          if (truth) {
            for (const a of s.actions) {
              const sig = this.execAction(a, env, s.opts);
              if (sig === "RETURN" && asSub) {
                this.tr("A", `return from ${gname}`);
                return "RETURN";
              }
            }
          }
        }
        const br = s.branch.u || (truth ? s.branch.t : s.branch.f);
        if (!br) {
          pc++;
          continue;
        }
        if (br.k === "endgroup") break;
        jump(br.idx);
      }
      return "END";
    },

    // §29 look-ahead rule
    execLook(s, env, G) {
      const m = this.m,
        S = this.S;
      const snapshot = structuredClone(S);
      m.suppress++;
      let res;
      try {
        for (const a of s.actions) this.execAction(a, env, s.opts);
        const until = S.now + s.look.time;
        const saveEnded = S.ended;
        S.ended = false;
        this.runScheduler({ until });
        S.ended = saveEnded;
        res = this.evalSubrules(s, env, true);
      } finally {
        m.suppress--;
      }
      const saved = new Map();
      for (const c of s.look.save)
        for (const [k, v] of S.classes)
          if (k === c || k.startsWith(c + "(")) saved.set(k, v.slice());
      m.state = snapshot; // restore universe (random generators deliberately NOT restored, §29.2)
      for (const [k, v] of saved) m.state.classes.set(k, v);
      for (const d of res.delayed) for (const a of d.actions) this.execAction(a, d.env, d.opts);
      if (res.truth)
        for (const a of s.post) {
          const sig = this.execAction(a, env, s.opts);
          if (sig === "RETURN") return "RETURN";
        }
      void G;
      return res.truth;
    },
  });

  // ---------------------------------------------------------------- public API
  function compile(src, opts) {
    const m = new Machine(opts);
    m.rt = new Runtime(m);
    const p = new Parser(m, lex(src, m.opts));
    m.suppress++;
    m.compiling = true;
    try {
      p.parseProgram();
    } finally {
      m.suppress--;
      m.compiling = false;
    }
    return m;
  }

  Machine.prototype.run = function () {
    const m = this,
      S = m.state,
      rt = m.rt;
    // initially ON groups, in program order (§9.2)
    S.now = m.limits.start;
    for (const pe of m.pendingEnables || []) {
      if (!m.groups.has(pe.g)) {
        m.warn(`*ENABLE ${pe.g}: not a group; skipped`);
        continue;
      }
      S.enabled.add(pe.g);
      rt.schedule(pe.g, Math.max(pe.t, S.now));
    }
    for (const g of m.groupOrder) if (m.groups.get(g).on) rt.enable(g, 0);
    m.stopReason = rt.runScheduler(null);
    return m.result();
  };

  Machine.prototype.result = function () {
    return {
      stopReason: this.stopReason,
      blocks: this.out,
      log: this.log,
      changeStack: this.formatStack(),
      warnings: this.warnings,
      endTime: this.state.now,
    };
  };

  Machine.prototype.formatStack = function () {
    const lines = [];
    for (const b of this.out) {
      lines.push(`*** TIME ${this.fmtTime(b.time)} (${b.time}) ***`);
      lines.push("  SEQ SRC LEX PAR  TRIPLE");
      for (const e of b.entries) {
        const tri = "(" + [e.s, e.r, e.o].filter(Boolean).join(" ") + ")";
        lines.push(
          `  ${String(e.seq).padStart(3)} ${String(e.src).padStart(3)} ${String(e.lex).padStart(3)} ${String(e.par).padStart(3)}  ${e.neg ? "NOT " : ""}${tri}  VAL=${+e.val.toFixed(4)} RV=${e.rv} H=${e.h}`,
        );
      }
    }
    lines.push(`END OF SIMULATION: ${this.stopReason}`);
    return lines.join("\n");
  };

  // ---------------------------------------------------------------- realizer
  // This implementation's own small English realizer (the 1976 manual omits the grammar).
  // Conventions it reads:
  //   node grammar number 0 = proper name (Title Case, no article); otherwise common noun ("the ...")
  //   relation first grammar number 2 = adjective, 4 = preposition, anything else = verb
  const IRREG = {
    BE: "was",
    SEE: "saw",
    RUN: "ran",
    LEAVE: "left",
    GO: "went",
    HAVE: "had",
    KNOW: "knew",
    FIGHT: "fought",
    MEET: "met",
    TELL: "told",
    SAY: "said",
    THINK: "thought",
    FIND: "found",
    GIVE: "gave",
    TAKE: "took",
    MAKE: "made",
    COME: "came",
    GET: "got",
    FEEL: "felt",
    HOLD: "held",
    BUY: "bought",
    BRING: "brought",
    SIT: "sat",
    STAND: "stood",
    LOSE: "lost",
    HIT: "hit",
    READ: "read",
    WRITE: "wrote",
    SPEAK: "spoke",
    BREAK: "broke",
    STEAL: "stole",
    KILL: "killed",
    SHOOT: "shot",
  };
  function past(w) {
    const u = w.toUpperCase();
    if (IRREG[u]) return IRREG[u];
    const l = w.toLowerCase();
    if (/e$/.test(l)) return l + "d";
    if (/[^aeiou]y$/.test(l)) return l.slice(0, -1) + "ied";
    if (/^[^aeiou]*[aeiou][bdgmnpt]$/.test(l)) return l + l.slice(-1) + "ed";
    return l + "ed";
  }
  const title = (s) =>
    s.toLowerCase().replace(/(^|[\s.-])([a-z])/g, (x, a, b) => a + b.toUpperCase());

  Machine.prototype.word = function (atom, val, depth) {
    const S = this.state,
      a = this.atoms.get(atom);
    if (!a) return atom.toLowerCase();
    if (depth > 6) return atom.toLowerCase();
    let items;
    if (a.numLex) {
      const parts = a.numLex.filter((p, i) => {
        const loOk = p.lo == null ? true : val > p.lo;
        const hiOk = p.hi == null ? true : val <= p.hi;
        return (i === 0 && p.lo == null ? val <= (p.hi == null ? Infinity : p.hi) : loOk) && hiOk;
      });
      items = parts.flatMap((p) => p.items);
      if (!items.length) return null;
    } else items = S.lex.get(atom) || [];
    if (!items.length)
      return {
        text: a.type === "N" && a.g1 === 0 ? title(atom) : atom.toLowerCase(),
        kind: a.type,
        raw: true,
      };
    const it = items[Math.floor(this.rngG() * items.length)];
    if (it.str != null)
      return {
        text: a.type === "N" && a.g1 === 0 ? title(it.str) : it.str.toLowerCase(),
        kind: a.type,
      };
    // lexical triple
    const ws = it.trp.filter(Boolean).map((x) => {
      const w = this.word(x, 0, depth + 1);
      return w ? w.text : "";
    });
    const t = it.trp;
    if (
      t.length === 2 &&
      t[0] &&
      this.atoms.get(t[0]) &&
      this.atoms.get(t[0]).type === "N" &&
      this.atoms.get(t[1]) &&
      this.atoms.get(t[1]).type === "R"
    )
      return { text: ws[1] + " " + ws[0], kind: a.type }; // (LADY OLD) -> "old lady"
    return { text: ws.join(" ").replace(/\s+/g, " ").trim(), kind: a.type, phrasal: true };
  };
  Machine.prototype.np = function (atom) {
    const a = this.atoms.get(atom);
    const w = this.word(atom, 0, 0);
    if (!w) return atom.toLowerCase();
    if (a && a.type === "N" && a.g1 === 1) return "the " + w.text.toLowerCase();
    if (a && a.type === "N" && a.g1 >= 2) return w.text.toLowerCase();
    return w.text;
  };
  Machine.prototype.clause = function (e, secs, kids) {
    const ra = this.atoms.get(e.r) || { g1: 3 };
    const rw = this.word(e.r, e.val, 0);
    if (!rw) return null; // numeric lexical gap: no output (§5.2)
    const adjOf = (node) =>
      secs
        .filter((x) => x.s === node && !x.o && (this.atoms.get(x.r) || {}).g1 === 2)
        .map((x) => (this.word(x.r, x.val, 0) || {}).text)
        .filter(Boolean);
    const used = new Set();
    const subjAdj = adjOf(e.s);
    secs.forEach((x) => {
      if (x.s === e.s && !x.o && (this.atoms.get(x.r) || {}).g1 === 2) used.add(x);
    });
    const objAdj = e.o ? adjOf(e.o) : [];
    secs.forEach((x) => {
      if (e.o && x.s === e.o && !x.o && (this.atoms.get(x.r) || {}).g1 === 2) used.add(x);
    });
    const isPrep = (x) => {
      const g = (this.atoms.get(x.r) || {}).g1;
      return g === 4 || g === 5;
    };
    const post = (node) =>
      secs
        .filter((x) => !used.has(x) && x.s === node && x.o && isPrep(x))
        .map((x) => {
          used.add(x);
          const w = this.word(x.r, x.val, 0);
          return w ? w.text + " " + this.np(x.o) : "";
        })
        .filter(Boolean);
    const subj = [...subjAdj, this.np(e.s)].join(" ");
    let obj = e.o ? [...objAdj, this.np(e.o), ...post(e.o)].join(" ") : "";
    if (e.o && kids.length) obj = kids.map((k) => "that " + k).join(", ");
    const adv = secs
      .filter((x) => !used.has(x) && x.s === e.r)
      .map((x) => {
        const w = this.word(x.r, x.val, 0);
        if (!w) return "";
        return x.o ? w.text + " " + this.np(x.o) : w.text;
      })
      .filter(Boolean);
    let vp;
    if (ra.g1 === 2) vp = (e.neg ? "was no longer " : "was ") + rw.text + (obj ? " " + obj : "");
    else if (ra.g1 === 4 || ra.g1 === 5)
      vp = (e.neg ? "was no longer " : "was ") + rw.text + (obj ? " " + obj : "");
    else {
      const parts = rw.text.split(" ");
      const verb = (e.neg ? "no longer " : "") + (rw.raw ? parts[0] : past(parts[0]));
      vp = [verb, ...parts.slice(1)].join(" ");
      if (kids.length && adv.length) {
        vp += " " + adv.join(" ");
        adv.length = 0;
      }
      vp += obj ? " " + obj : "";
    }
    let c = subj + " " + vp + (adv.length ? " " + adv.join(" ") : "");
    const others = secs.filter((x) => !used.has(x) && x.s !== e.r);
    for (const x of others) {
      const sub = this.clause(Object.assign({}, x, { neg: false }), [], []);
      if (sub) c += ", and " + sub;
    }
    return c;
  };
  Machine.prototype.realize = function () {
    const paras = [];
    for (const b of this.out) {
      const bySeq = new Map(b.entries.map((e) => [e.seq, e]));
      const sents = [];
      const kidsOf = (seq) =>
        b.entries.filter((x) => x.par === seq && (x.src === 1 || x.src === 3));
      const secsOf = (seq) =>
        b.entries.filter((x) => x.par === seq && (x.src === 4 || x.src === 5));
      const render = (e) =>
        this.clause(e, secsOf(e.seq), kidsOf(e.seq).map(render).filter(Boolean));
      for (const e of b.entries) {
        if (e.src !== 0) continue;
        const c = render(e);
        if (c) sents.push(c.charAt(0).toUpperCase() + c.slice(1) + ".");
      }
      void bySeq;
      if (sents.length)
        paras.push({ time: b.time, label: this.fmtTime(b.time), text: sents.join(" ") });
    }
    return paras;
  };

  function run(src, opts) {
    const m = compile(src, opts);
    const r = m.run();
    r.text = m.realize();
    r.machine = m;
    return r;
  }

  const MESSY = {
    compile,
    run,
    lex,
    MessyError,
    version: "1.0.0",
    _internal: { Parser, Runtime, Machine },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = MESSY;
  else root.MESSY = MESSY;

  // CLI: node messy.js program.msy [--text] [--log]
  if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
    const fs = require("fs");
    const args = process.argv.slice(2);
    const file = args.find((a) => !a.startsWith("--"));
    if (!file) {
      console.error("usage: node messy.js program.msy [--text] [--log] [--no-stack]");
      process.exit(1);
    }
    try {
      const r = run(fs.readFileSync(file, "utf8"));
      if (!args.includes("--no-stack")) console.log(r.changeStack);
      if (args.includes("--log") && r.log.length) console.log("\n" + r.log.join("\n"));
      if (args.includes("--text")) {
        console.log("\n--- realized text ---");
        for (const p of r.text) console.log(`[${p.label}] ${p.text}`);
      }
    } catch (e) {
      console.error(e.message);
      process.exit(2);
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
