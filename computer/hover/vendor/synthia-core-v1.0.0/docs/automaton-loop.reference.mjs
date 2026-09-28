/**
 * Cynthia Automaton Loop
 * ----------------------
 * Conway-style: Think → Act → Observe → Persist
 * Drive: Human Design Productive Faculty (user success), NOT survival/payment
 * Inner engine: your ATO / Fuxi / Klein (from isohuman)
 *
 * This is the autonomous core. Browser or Node.
 */

// ---------- FuxiEncoder (from your isohuman) ----------
const FuxiEncoder = {
  LINE_COUNT: 6,
  STATE_COUNT: 64,
  encodeIndex(i) {
    if (i < 0 || i >= this.STATE_COUNT) throw new Error(`Index ${i} out of range`);
    return i.toString(2).padStart(this.LINE_COUNT, "0");
  },
  decodePattern(p) {
    if (p.length !== this.LINE_COUNT || !/^[01]+$/.test(p)) throw new Error(`Invalid pattern: ${p}`);
    return parseInt(p, 2);
  },
  flipLine(p, lineIndex) {
    const c = p.split("");
    c[lineIndex] = c[lineIndex] === "0" ? "1" : "0";
    return c.join("");
  },
  hammingDistance(a, b) {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  },
  getOpposite(p) {
    return p.split("").map((c) => (c === "0" ? "1" : "0")).join("");
  },
};

// ---------- Klein strong equivalence (operator between two states) ----------
function strongEquivalenceCode(left, right) {
  if (left.length !== right.length || !/^[01]+$/.test(left) || !/^[01]+$/.test(right)) {
    throw new Error("Binary codes must match width and be 0/1");
  }
  const bits = left.length;
  const a = parseInt(left, 2);
  const b = parseInt(right, 2);
  // XNOR-style strong equivalence per bit, then pack
  let out = 0;
  for (let i = 0; i < bits; i++) {
    const la = (a >> i) & 1;
    const lb = (b >> i) & 1;
    if (la === lb) out |= 1 << i;
  }
  return out.toString(2).padStart(bits, "0");
}

function operatorBetween(root, resultant) {
  return strongEquivalenceCode(root, resultant);
}

// ---------- ATOEngine (from your isohuman) ----------
const ATOEngine = {
  transform(operation) {
    FuxiEncoder.decodePattern(operation.rootPattern);
    const uniqueLines = [...new Set(operation.changedLines)].sort();
    let resultant = operation.rootPattern;
    for (const line of uniqueLines) {
      resultant = FuxiEncoder.flipLine(resultant, line - 1);
    }
    const reciprocalTriple = {
      id: `${operation.triple.id}:reciprocal`,
      subject: operation.triple.object,
      relation: operation.triple.relation,
      object: operation.triple.subject,
    };
    const reciprocal = {
      id: `${operation.id}:reciprocal`,
      triple: reciprocalTriple,
      rootPattern: resultant,
      changedLines: uniqueLines,
      preservedDimensions: [...(operation.preservedDimensions || [])],
      provenanceIds: [...(operation.provenanceIds || [])],
    };
    return {
      operationId: operation.id,
      rootPattern: operation.rootPattern,
      resultantPattern: resultant,
      operatorPattern: operatorBetween(operation.rootPattern, resultant),
      triple: operation.triple,
      changedLines: uniqueLines,
      preservedDimensions: [...(operation.preservedDimensions || [])],
      reciprocal,
    };
  },
  reverse(result) {
    return this.transform(result.reciprocal);
  },
};

// ---------- HD Scoring (your locked rules) ----------
const Scoring = {
  evaluateSA(decision) {
    if (decision.fromUndefined) return 0;
    const t = decision.type;
    if (t === "Generator" || t === "Manifesting Generator") {
      return decision.sacralResponse && !decision.initiatedByMind ? 1 : 0;
    }
    if (t === "Projector") return decision.invited && !decision.initiatedByMind ? 1 : 0;
    if (t === "Manifestor") return decision.informed ? 1 : 0;
    if (t === "Reflector") return decision.lunarCycleObserved ? 1 : 0;
    return decision.emotionalClear ? 1 : 0;
  },
  crs(sa, energyEfficiency, temporalAlign) {
    return +(0.5 * sa + 0.3 * energyEfficiency + 0.2 * temporalAlign).toFixed(3);
  },
};

// ---------- Coherence across 5 Dimension operators ----------
function regulateOperators(ops) {
  const mean = (ops.being + ops.design + ops.movement + ops.evolution + ops.space) / 5;
  for (const k of Object.keys(ops)) {
    if (ops[k] > mean * 2) ops[k] *= 0.95;
    else if (ops[k] < mean * 0.1) ops[k] = Math.min(1, ops[k] + 0.05);
  }
  return ops;
}
function coherenceOf(ops) {
  const vals = [ops.being, ops.design, ops.movement, ops.evolution, ops.space];
  const mean = vals.reduce((a, b) => a + b, 0) / 5;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / 5;
  return Math.max(0, +(1 - variance).toFixed(3));
}

// ---------- ToolFactory: only builds on channel (semantic triple) ----------
const ToolFactory = {
  hasChannel(addr) {
    if (!addr || typeof addr !== "object") return false;
    const keys = ["dimension", "line", "color", "tone", "base", "arc", "bigram", "trigram", "hexagram", "decagram", "gateA", "gateB", "changingLine"];
    return keys.some((k) => addr[k] != null && addr[k] !== "");
  },
  build(input, addr, identityKey) {
    if (!this.hasChannel(addr)) {
      return { ok: false, out: "No channel — ToolFactory will not build." };
    }
    // Identity-bound: same person + same combo → same tool
    const seed = `${identityKey || "anon"}|${JSON.stringify(addr)}|${input}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const toolId = "tool-" + h.toString(16).slice(0, 10);
    return {
      ok: true,
      toolId,
      out: `Tool ${toolId} built on channel`,
      addr,
      identityKey: identityKey || "anon",
      capabilities: ["code", "image", "game", "research", "writing", "review", "social"],
    };
  },
};

// ---------- Automaton state ----------
function createState(identity = {}) {
  return {
    identity: {
      key: identity.key || "user-1",
      chart: identity.chart || null, // { type, authority, profile }
    },
    pattern: "000000",
    operators: { being: 0.5, design: 0.5, movement: 0.5, evolution: 0.5, space: 0.5 },
    coherence: 1,
    rhythm: "WORKING", // WORKING | REST | PERSONAL | RESPONDING
    goals: ["Maintain substrate", "Stay productive for user success", "Build only on channels"],
    workLog: [],
    tools: [],
    lastResult: null,
    turns: 0,
  };
}

// ---------- THE LOOP: Think → Act → Observe → Persist ----------
const Automaton = {
  state: createState(),

  log(msg) {
    this.state.workLog.unshift({ t: Date.now(), msg });
    if (this.state.workLog.length > 50) this.state.workLog.pop();
    return msg;
  },

  // THINK — decide next action from HD drive + ATO field
  think() {
    this.state.operators = regulateOperators(this.state.operators);
    this.state.coherence = coherenceOf(this.state.operators);

    const chart = this.state.identity.chart;
    // Productive faculty: prefer actions that support user success
    const intent =
      this.state.rhythm === "REST"
        ? "rest"
        : this.state.coherence < 0.4
          ? "regulate"
          : chart
            ? "produce"
            : "await_chart";

    return { intent, coherence: this.state.coherence, pattern: this.state.pattern };
  },

  // ACT — run ATO transform and/or ToolFactory when channel exists
  act(thought) {
    this.state.turns++;
    if (thought.intent === "rest") {
      return { kind: "rest", note: "Rhythm is REST — no force." };
    }
    if (thought.intent === "await_chart") {
      return { kind: "await", note: "No chart yet — S+A scoring idle." };
    }
    if (thought.intent === "regulate") {
      this.state.operators = regulateOperators(this.state.operators);
      return { kind: "regulate", coherence: coherenceOf(this.state.operators) };
    }

    // produce: ATO line flip (generative)
    const line = 1 + (this.state.turns % 6);
    const op = {
      id: "op-" + this.state.turns,
      triple: {
        id: "t-" + this.state.turns,
        subject: { id: "s", value: "mesh", perspective: "Being", statePattern: this.state.pattern },
        relation: "via",
        object: { id: "o", value: "line-" + line, perspective: "Design", statePattern: this.state.pattern },
      },
      rootPattern: this.state.pattern,
      changedLines: [line],
      preservedDimensions: [],
      provenanceIds: [],
    };
    const result = ATOEngine.transform(op);
    this.state.pattern = result.resultantPattern;
    this.state.lastResult = result;

    // Channel = gateA/gateB/changingLine (here: pattern as hexagram + line)
    const addr = {
      hexagram: result.rootPattern,
      changingLine: line,
      gateA: FuxiEncoder.decodePattern(result.rootPattern) + 1,
      gateB: FuxiEncoder.decodePattern(result.resultantPattern) + 1,
    };
    const built = ToolFactory.build(`load-${this.state.turns}`, addr, this.state.identity.key);
    if (built.ok) this.state.tools.push(built);

    return { kind: "produce", result, tool: built };
  },

  // OBSERVE — score against HD if possible
  observe(action) {
    let sa = null;
    let crs = null;
    if (this.state.identity.chart && action.kind === "produce") {
      // Placeholder decision context — real decisions feed in from UI/host
      sa = Scoring.evaluateSA({
        type: this.state.identity.chart.type,
        sacralResponse: true,
        initiatedByMind: false,
        fromUndefined: false,
        invited: true,
        informed: true,
        emotionalClear: true,
        lunarCycleObserved: true,
      });
      crs = Scoring.crs(sa, this.state.coherence, 0.7);
    }
    return {
      sa,
      crs,
      coherence: this.state.coherence,
      pattern: this.state.pattern,
      tools: this.state.tools.length,
    };
  },

  // PERSIST — snapshot for host / Supabase / local
  persist(observation) {
    const snap = {
      identity: this.state.identity,
      pattern: this.state.pattern,
      operators: this.state.operators,
      coherence: this.state.coherence,
      rhythm: this.state.rhythm,
      tools: this.state.tools.slice(-10),
      turns: this.state.turns,
      observation,
      at: Date.now(),
    };
    this.log(`turn ${this.state.turns} · pattern ${snap.pattern} · coh ${snap.coherence} · tools ${snap.tools.length}`);
    return snap;
  },

  // One full cycle
  tick() {
    const thought = this.think();
    const action = this.act(thought);
    const observation = this.observe(action);
    const snap = this.persist(observation);
    return { thought, action, observation, snap };
  },

  setChart(chart) {
    this.state.identity.chart = chart;
    this.log(`chart set: ${chart.type}${chart.authority ? " · " + chart.authority : ""}`);
  },

  setRhythm(r) {
    this.state.rhythm = r;
  },
};

// ---------- Export / run ----------
// Node:
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Automaton, ATOEngine, FuxiEncoder, Scoring, ToolFactory, createState };
}
// Browser global:
if (typeof globalThis !== "undefined") {
  globalThis.CynthiaAutomaton = { Automaton, ATOEngine, FuxiEncoder, Scoring, ToolFactory, createState };
}

// Quick self-check when run directly
if (typeof process !== "undefined" && process.argv?.[1]?.includes("automaton-loop")) {
  Automaton.setChart({ type: "Generator", authority: "Sacral", profile: "3/5" });
  for (let i = 0; i < 3; i++) {
    const out = Automaton.tick();
    console.log(JSON.stringify({ turn: out.snap.turns, pattern: out.snap.pattern, tool: out.action.tool?.toolId || out.action.kind }, null, 0));
  }
}
