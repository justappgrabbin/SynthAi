/* Checkpointable, bounded candidate discovery; every step tests at most one expression. */
(function (g) {
  "use strict";
  const OPS = ["+", "-", "*", "&", "|", "^"];
  function state(spec, { budget = 4000 } = {}) {
    if (
      !spec ||
      !Array.isArray(spec.names) ||
      spec.names.length < 1 ||
      spec.names.length > 4 ||
      new Set(spec.names).size !== spec.names.length ||
      spec.names.some((x) => !/^[$A-Za-z_][$\w]*$/.test(x)) ||
      !Array.isArray(spec.cases) ||
      spec.cases.length < 4 ||
      spec.cases.some(
        (c) =>
          !Array.isArray(c.args) ||
          c.args.length !== spec.names.length ||
          !c.args.every(Number.isSafeInteger) ||
          !Number.isSafeInteger(c.expected),
      ) ||
      !Number.isInteger(budget) ||
      budget < 1 ||
      budget > 20000
    )
      throw Error("Invalid scientist experiment");
    const atoms = [...spec.names, "0", "1", "2", "3"];
    return {
      spec: JSON.parse(JSON.stringify(spec)),
      budget,
      atoms,
      phase: 0,
      index: 0,
      tested: 0,
      holdoutFailures: 0,
      result: null,
    };
  }
  function expression(s) {
    const a = s.atoms,
      n = a.length,
      k = s.index;
    if (s.phase === 0) return a[k];
    if (s.phase === 1) {
      const p = Math.floor(k / OPS.length),
        o = OPS[k % OPS.length],
        i = Math.floor(p / n),
        j = p % n;
      return "(" + a[i] + o + a[j] + ")";
    }
    const p = Math.floor(k / OPS.length),
      o = OPS[k % OPS.length],
      i = Math.floor(p / n),
      j = p % n;
    const first = Math.floor(i / (n * OPS.length)),
      second = Math.floor(i / OPS.length) % n,
      inner = OPS[i % OPS.length];
    return "((" + a[first] + inner + a[second] + ")" + o + a[j] + ")";
  }
  function count(s) {
    const n = s.atoms.length;
    return s.phase === 0
      ? n
      : s.phase === 1
        ? n * n * OPS.length
        : n * n * n * OPS.length * OPS.length;
  }
  function step(s) {
    if (s.result) return { done: true, result: s.result };
    if (s.tested >= s.budget) {
      s.result = {
        status: "budget-exhausted",
        tested: s.tested,
        holdoutFailures: s.holdoutFailures,
        addressStatus: "unresolved",
      };
      return { done: true, result: s.result };
    }
    if (s.index >= count(s)) {
      s.phase++;
      s.index = 0;
      if (s.phase > 2) {
        s.result = {
          status: "no-match",
          tested: s.tested,
          holdoutFailures: s.holdoutFailures,
          addressStatus: "unresolved",
        };
        return { done: true, result: s.result };
      }
    }
    const expr = expression(s);
    s.index++;
    s.tested++;
    const source = "function main(" + s.spec.names.join(",") + "){return " + expr + ";}";
    const cases = s.spec.cases;
    try {
      const train = g.LocalExecution.verify(source, "main", cases.slice(0, -2));
      if (train.every((c) => c.pass)) {
        const holdout = g.LocalExecution.verify(source, "main", cases.slice(-2));
        if (holdout.every((c) => c.pass)) {
          s.result = {
            status: "example-verified",
            source,
            expression: expr,
            tested: s.tested,
            training: train,
            holdout,
            holdoutFailures: s.holdoutFailures,
            addressStatus: "unresolved",
          };
          return { done: true, result: s.result };
        }
        s.holdoutFailures++;
      }
    } catch (e) {
      /* rejected candidate */
    }
    return { done: false, progress: s.tested + "/" + s.budget };
  }
  const api = { state, step };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else g.MeshScientist = api;
})(globalThis);
