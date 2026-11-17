(function (g) {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function record(value, context) {
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 63 ||
      !context ||
      typeof context !== "object" ||
      Array.isArray(context)
    )
      throw Error("Six-bit value and context required");
    return {
      schema: "klein-boolean/v1",
      bits: Array.from({ length: 6 }, (_, i) => (value >> (5 - i)) & 1),
      context: clone(context),
    };
  }
  function value(r) {
    if (
      r.schema !== "klein-boolean/v1" ||
      !Array.isArray(r.bits) ||
      r.bits.length !== 6 ||
      r.bits.some((b) => b !== 0 && b !== 1)
    )
      throw Error("Invalid Boolean record");
    return r.bits.reduce((a, b) => a * 2 + b, 0);
  }
  function combine(a, b, op, relation) {
    if (
      !relation ||
      typeof relation !== "object" ||
      Array.isArray(relation) ||
      !Object.keys(relation).length
    )
      throw Error("Connection required");
    const x = value(a),
      y = value(b),
      ops = {
        AND: x & y,
        OR: x | y,
        XOR: x ^ y,
        NAND: 63 ^ (x & y),
        NOR: 63 ^ (x | y),
        XNOR: 63 ^ (x ^ y),
      };
    if (!Object.hasOwn(ops, op)) throw Error("Unsupported operator");
    return record(ops[op], {
      operation: op,
      relation,
      left: a,
      right: b,
      interpretation_status: "unresolved",
    });
  }
  function construct(spec) {
    try {
      const s = clone(spec);
      const { parts, cases, connection } = s;
      if (!Array.isArray(parts) || parts.length !== 2 || parts[0].id === parts[1].id)
        throw Error("Two distinct components required");
      const [a, b] = parts;
      if (
        !connection ||
        connection.from !== a.id ||
        connection.to !== b.id ||
        typeof connection.evidence !== "string" ||
        !connection.evidence.trim()
      )
        throw Error("Explicit connection evidence required");
      if (
        !a.output ||
        !b.input ||
        a.output.type !== b.input.type ||
        a.output.version !== b.input.version ||
        !a.output.type ||
        !a.output.version
      )
        throw Error("Incompatible ports");
      if (a.output.type !== "six-bit") throw Error("Only six-bit contract implemented");
      if (
        !Array.isArray(cases) ||
        cases.length < 2 ||
        cases.some(
          (c) =>
            !Number.isInteger(c.input) ||
            c.input < 0 ||
            c.input > 63 ||
            !Number.isInteger(c.expected) ||
            c.expected < 0 ||
            c.expected > 63,
        )
      )
        throw Error("At least two valid verification cases required");
      const graph = [
        { id: "first", part: a.id, args: [{ ref: "input" }] },
        { id: "final", part: b.id, args: [{ ref: "first" }] },
      ];
      const results = cases.map((c) => {
        const r = g.Assembly.run(parts, graph, { input: c.input });
        return {
          ...r,
          expected: c.expected,
          pass:
            r.status === "executed" &&
            r.results.final === c.expected &&
            Number.isInteger(r.results.first) &&
            r.results.first >= 0 &&
            r.results.first < 64,
        };
      });
      if (!results.every((r) => r.pass)) return { status: "rejected", results };
      return {
        status: "verified-on-cases",
        artifact: {
          schema: "independent-assembly/v1",
          parts,
          graph,
          connection,
          cases,
          addressStatus: "unresolved",
          execution: "bounded-local-adapter",
        },
        results,
      };
    } catch (e) {
      return { status: "blocked", error: e.message };
    }
  }
  const sample = {
    parts: [
      {
        id: "invert",
        language: "python",
        entry: "invert",
        source: "def invert(x):\n    return x ^ 63",
        output: { type: "six-bit", version: "1" },
      },
      {
        id: "mask",
        language: "javascript",
        entry: "mask",
        source: "function mask(x){return x & 15;}",
        input: { type: "six-bit", version: "1" },
      },
    ],
    connection: {
      from: "invert",
      to: "mask",
      evidence: "Declared six-bit output and input contract; example verification required.",
    },
    cases: [
      { input: 0, expected: 15 },
      { input: 63, expected: 0 },
      { input: 5, expected: 10 },
    ],
  };
  g.Construction = { record, value, combine, construct, sample };
})(globalThis);
