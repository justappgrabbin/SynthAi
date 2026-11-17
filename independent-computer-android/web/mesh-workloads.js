/* Cooperative execution workloads: explicit state, bounded turns, no workers. */
(function (g) {
  "use strict";
  function rvState(code, { memory = 65536, fuel = 100000 } = {}) {
    const src = code instanceof Uint8Array ? code : new Uint8Array(code);
    if (
      src.length % 4 ||
      src.length > memory ||
      memory > 16777216 ||
      !Number.isInteger(fuel) ||
      fuel < 1 ||
      fuel > 1000000
    )
      throw Error("Invalid RV32 workload");
    return {
      code: Array.from(src),
      memory,
      fuel,
      pc: 0,
      registers: Array(32).fill(0),
      steps: 0,
      halted: false,
    };
  }
  function rvStep(s, batch = 64) {
    if (!Number.isInteger(batch) || batch < 1 || batch > 512)
      throw Error("Invalid instruction quantum");
    const m = new Uint8Array(s.code),
      d = new DataView(m.buffer),
      r = s.registers;
    let n = 0;
    while (n++ < batch && !s.halted) {
      if (s.steps >= s.fuel) throw Error("RV32 instruction fuel exhausted");
      const pc = s.pc;
      if (pc % 4 || pc < 0 || pc + 4 > m.length) throw Error("Instruction address outside program");
      const w = d.getUint32(pc, true),
        op = w & 127,
        rd = (w >>> 7) & 31,
        f = (w >>> 12) & 7,
        rs1 = (w >>> 15) & 31,
        rs2 = (w >>> 20) & 31,
        a = r[rs1] | 0,
        b = r[rs2] | 0,
        imm = w >> 20;
      let next = pc + 4,
        v;
      if (op === 0x13) {
        if (f === 0) v = a + imm;
        else if (f === 4) v = a ^ imm;
        else if (f === 6) v = a | imm;
        else if (f === 7) v = a & imm;
        else throw Error("Unsupported immediate instruction");
      } else if (op === 0x33) {
        if (w >>> 25 !== 0) throw Error("Unsupported extension");
        if (f === 0) v = a + b;
        else if (f === 4) v = a ^ b;
        else if (f === 6) v = a | b;
        else if (f === 7) v = a & b;
        else throw Error("Unsupported register instruction");
      } else if (op === 0x37) v = w & 0xfffff000;
      else if (op === 0x63) {
        const sign = (x) => (x << 19) >> 19;
        const delta = sign(
          ((w >>> 31) << 12) |
            (((w >>> 7) & 1) << 11) |
            (((w >>> 25) & 63) << 5) |
            (((w >>> 8) & 15) << 1),
        );
        if (f === 0 ? a === b : f === 1 ? a !== b : false) next = pc + delta;
        else if (f !== 0 && f !== 1) throw Error("Unsupported branch");
      } else if (op === 0x6f) {
        v = next;
        let x =
          ((w >>> 31) << 20) |
          (((w >>> 12) & 255) << 12) |
          (((w >>> 20) & 1) << 11) |
          (((w >>> 21) & 1023) << 1);
        next = pc + ((x << 11) >> 11);
      } else if (op === 0x73 && w === 0x00100073) {
        s.halted = true;
      } else throw Error("Unsupported instruction 0x" + w.toString(16));
      if (v !== undefined && rd) r[rd] = v | 0;
      r[0] = 0;
      s.pc = next;
      s.steps++;
    }
    return {
      done: s.halted,
      result: s.halted ? { result: r[10], steps: s.steps, registers: r.slice() } : null,
      progress: s.steps + "/" + s.fuel,
    };
  }
  function selectionState(spec) {
    if (
      !spec ||
      !Array.isArray(spec.left) ||
      !Array.isArray(spec.right) ||
      !Array.isArray(spec.connections) ||
      !Array.isArray(spec.cases) ||
      spec.cases.length < 4 ||
      spec.left.length * spec.right.length > 100 ||
      !spec.left.length ||
      !spec.right.length
    )
      throw Error("Invalid candidate set");
    return { spec: JSON.parse(JSON.stringify(spec)), index: 0, trials: [], winners: [] };
  }
  function selectionStep(s) {
    const { left, right, cases, connections } = s.spec,
      total = left.length * right.length;
    if (s.index >= total) return { done: true, result: selectionResult(s) };
    const a = left[Math.floor(s.index / right.length)],
      b = right[s.index % right.length];
    s.index++;
    const connection = connections.find((c) => c.from === a.id && c.to === b.id),
      candidate = { parts: [a, b], connection, cases: cases.slice(0, -2) };
    const training = g.Construction.construct(candidate),
      trial = { pair: [a.id, b.id], training };
    if (training.status === "verified-on-cases") {
      trial.holdout = g.Construction.construct({ ...candidate, cases: cases.slice(-2) });
      if (trial.holdout.status === "verified-on-cases")
        s.winners.push({ pair: trial.pair, artifact: { ...trial.holdout.artifact, cases } });
    }
    s.trials.push(trial);
    return {
      done: s.index === total,
      result: s.index === total ? selectionResult(s) : null,
      progress: s.index + "/" + total,
    };
  }
  function selectionResult(s) {
    return {
      status:
        s.winners.length === 1
          ? "selected"
          : s.winners.length
            ? "ambiguous"
            : "no-verified-assembly",
      trials: s.trials,
      selected: s.winners.length === 1 ? s.winners[0].artifact : null,
      passingPairs: s.winners.map((w) => w.pair),
      addressStatus: "unresolved",
    };
  }
  const api = { rvState, rvStep, selectionState, selectionStep };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else g.MeshWorkloads = api;
})(globalThis);
