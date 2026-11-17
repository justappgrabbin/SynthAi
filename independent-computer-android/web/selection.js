(function (g) {
  "use strict";
  // Preserve variants and choose only by observed contract behavior, not recency.
  function select(spec) {
    const s = JSON.parse(JSON.stringify(spec));
    const trials = [];
    try {
      if (
        !Array.isArray(s.left) ||
        !Array.isArray(s.right) ||
        !s.left.length ||
        !s.right.length ||
        s.left.length * s.right.length > 100
      )
        throw Error("Require 1–100 candidate pairs");
      if (
        !Array.isArray(s.connections) ||
        !Array.isArray(s.cases) ||
        s.cases.length < 4 ||
        new Set(s.cases.map((c) => c.input)).size !== s.cases.length
      )
        throw Error("Distinct verification inputs and explicit connections required");
      if (new Set([...s.left, ...s.right].map((p) => p.id)).size !== s.left.length + s.right.length)
        throw Error("Unique variant IDs required");
      const training = s.cases.slice(0, -2),
        holdout = s.cases.slice(-2);
      for (const a of s.left)
        for (const b of s.right) {
          const connection = s.connections.find((c) => c.from === a.id && c.to === b.id);
          const candidate = { parts: [a, b], connection, cases: training };
          const result = g.Construction.construct(candidate);
          const trial = { pair: [a.id, b.id], training: result };
          if (result.status === "verified-on-cases")
            trial.holdout = g.Construction.construct({ ...candidate, cases: holdout });
          trials.push(trial);
        }
      const winners = trials.filter((t) => t.holdout?.status === "verified-on-cases");
      return {
        status:
          winners.length === 1 ? "selected" : winners.length ? "ambiguous" : "no-verified-assembly",
        trials,
        selected: winners.length === 1 ? { ...winners[0].holdout.artifact, cases: s.cases } : null,
        passingPairs: winners.map((t) => t.pair),
        preserved: s,
        addressStatus: "unresolved",
      };
    } catch (e) {
      return { status: "blocked", error: e.message, trials, preserved: s };
    }
  }
  const base = g.Construction.sample;
  const left = [
    { ...base.parts[0], id: "broken", source: "def invert(x):\n    return x" },
    { ...base.parts[0], id: "working" },
  ];
  const right = [base.parts[1]];
  const sample = {
    left,
    right,
    connections: left.map((p) => ({
      from: p.id,
      to: right[0].id,
      evidence: "Declared compatible six-bit ports; behavior subject to testing",
    })),
    cases: [0, 63, 5, 17, 42, 12].map((input) => ({ input, expected: (input ^ 63) & 15 })),
  };
  g.VariantSelection = { select, sample };
})(globalThis);
